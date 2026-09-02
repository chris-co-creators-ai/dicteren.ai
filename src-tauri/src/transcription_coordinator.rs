use crate::actions::ACTION_MAP;
use crate::managers::audio::AudioRecordingManager;
use crate::managers::license::LicenseGate;
use log::{debug, error, warn};
use std::sync::mpsc::{self, Sender};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

const DEBOUNCE: Duration = Duration::from_millis(30);

/// Commands processed sequentially by the coordinator thread.
enum Command {
    Input {
        binding_id: String,
        hotkey_string: String,
        is_pressed: bool,
        push_to_talk: bool,
    },
    Cancel {
        recording_was_active: bool,
    },
    ProcessingFinished,
}

/// Pipeline lifecycle, owned exclusively by the coordinator thread.
enum Stage {
    Idle,
    Recording(String), // binding_id
    Processing,
}

/// Serialises all transcription lifecycle events through a single thread
/// to eliminate race conditions between keyboard shortcuts, signals, and
/// the async transcribe-paste pipeline.
pub struct TranscriptionCoordinator {
    tx: Sender<Command>,
}

pub fn is_transcribe_binding(id: &str) -> bool {
    id == "transcribe" || id == "transcribe_with_post_process"
}

impl TranscriptionCoordinator {
    pub fn new(app: AppHandle) -> Self {
        let (tx, rx) = mpsc::channel();

        thread::spawn(move || {
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                let mut stage = Stage::Idle;
                let mut last_press: Option<Instant> = None;

                while let Ok(cmd) = rx.recv() {
                    match cmd {
                        Command::Input {
                            binding_id,
                            hotkey_string,
                            is_pressed,
                            push_to_talk,
                        } => {
                            // Debounce rapid-fire press events (key repeat / double-tap).
                            // Releases always pass through for push-to-talk.
                            if is_pressed {
                                let now = Instant::now();
                                if last_press.map_or(false, |t| now.duration_since(t) < DEBOUNCE) {
                                    debug!("Debounced press for '{binding_id}'");
                                    continue;
                                }
                                last_press = Some(now);
                            }

                            if push_to_talk {
                                if is_pressed && matches!(stage, Stage::Idle) {
                                    start(&app, &mut stage, &binding_id, &hotkey_string);
                                } else if !is_pressed
                                    && matches!(&stage, Stage::Recording(id) if id == &binding_id)
                                {
                                    stop(&app, &mut stage, &binding_id, &hotkey_string);
                                }
                            } else if is_pressed {
                                match &stage {
                                    Stage::Idle => {
                                        start(&app, &mut stage, &binding_id, &hotkey_string);
                                    }
                                    Stage::Recording(id) if id == &binding_id => {
                                        stop(&app, &mut stage, &binding_id, &hotkey_string);
                                    }
                                    _ => {
                                        debug!("Ignoring press for '{binding_id}': pipeline busy")
                                    }
                                }
                            }
                        }
                        Command::Cancel {
                            recording_was_active,
                        } => {
                            // Don't reset during processing — wait for the pipeline to finish.
                            if !matches!(stage, Stage::Processing)
                                && (recording_was_active || matches!(stage, Stage::Recording(_)))
                            {
                                stage = Stage::Idle;
                            }
                        }
                        Command::ProcessingFinished => {
                            stage = Stage::Idle;
                        }
                    }
                }
                debug!("Transcription coordinator exited");
            }));
            if let Err(e) = result {
                error!("Transcription coordinator panicked: {e:?}");
            }
        });

        Self { tx }
    }

    /// Send a keyboard/signal input event for a transcribe binding.
    /// For signal-based toggles, use `is_pressed: true` and `push_to_talk: false`.
    pub fn send_input(
        &self,
        binding_id: &str,
        hotkey_string: &str,
        is_pressed: bool,
        push_to_talk: bool,
    ) {
        if self
            .tx
            .send(Command::Input {
                binding_id: binding_id.to_string(),
                hotkey_string: hotkey_string.to_string(),
                is_pressed,
                push_to_talk,
            })
            .is_err()
        {
            warn!("Transcription coordinator channel closed");
        }
    }

    pub fn notify_cancel(&self, recording_was_active: bool) {
        if self
            .tx
            .send(Command::Cancel {
                recording_was_active,
            })
            .is_err()
        {
            warn!("Transcription coordinator channel closed");
        }
    }

    pub fn notify_processing_finished(&self) {
        if self.tx.send(Command::ProcessingFinished).is_err() {
            warn!("Transcription coordinator channel closed");
        }
    }
}

/// Every *live* transcription trigger — hotkey, CLI flag, Unix signal — passes
/// through `start`, so this is where the license has to hold. The UI lock
/// screen only covers the settings window, which is hidden most of the time;
/// without this check an expired trial keeps dictating forever.
///
/// Not the only door to the model: `commands::history::
/// retry_history_entry_transcription` re-runs stored audio and checks the gate
/// itself. Any new path to `TranscriptionManager::transcribe` must do the same.
///
/// Fails closed: no gate in managed state means no transcription.
fn license_allows(app: &AppHandle) -> bool {
    match app.try_state::<LicenseGate>() {
        Some(gate) => gate.allows_transcription(),
        None => {
            error!("LicenseGate missing from managed state — blocking transcription");
            false
        }
    }
}

/// Surface the block instead of failing silently: a dead hotkey reads as a
/// broken app. Raise the window so the lock screen explains what to do next.
///
/// Also re-checks with the server (throttled). A renewal that landed after the
/// last heartbeat would otherwise keep a paying customer out for hours; this
/// way the gate reopens within seconds of the refused press.
fn deny_locked(app: &AppHandle, binding_id: &str) {
    let Some(gate) = app.try_state::<LicenseGate>() else {
        return;
    };
    let info = gate.snapshot();
    warn!(
        "Transcription blocked for '{binding_id}': license locked (status={:?})",
        info.status
    );

    // Throttled as one unit. Raising the window on every press would steal
    // focus out of whatever the user is typing in, over and over.
    if !gate.claim_refresh_slot() {
        return;
    }

    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = app.emit("license-locked", info) {
            warn!("Failed to emit license-locked: {e}");
        }
        crate::show_main_window(&app);

        // A renewal may have landed since the last heartbeat; re-check so a
        // paying customer is not stuck until the next one.
        let fresh = crate::managers::license::current_state().await;
        if let Some(gate) = app.try_state::<LicenseGate>() {
            gate.set(fresh.clone());
        }
        if let Err(e) = app.emit("license-updated", fresh) {
            warn!("Failed to emit license-updated: {e}");
        }
    });
}

fn start(app: &AppHandle, stage: &mut Stage, binding_id: &str, hotkey_string: &str) {
    let Some(action) = ACTION_MAP.get(binding_id) else {
        warn!("No action in ACTION_MAP for '{binding_id}'");
        return;
    };
    if is_transcribe_binding(binding_id) && !license_allows(app) {
        deny_locked(app, binding_id);
        return;
    }
    action.start(app, binding_id, hotkey_string);
    if app
        .try_state::<Arc<AudioRecordingManager>>()
        .map_or(false, |a| a.is_recording())
    {
        *stage = Stage::Recording(binding_id.to_string());
    } else {
        debug!("Start for '{binding_id}' did not begin recording; staying idle");
    }
}

fn stop(app: &AppHandle, stage: &mut Stage, binding_id: &str, hotkey_string: &str) {
    let Some(action) = ACTION_MAP.get(binding_id) else {
        warn!("No action in ACTION_MAP for '{binding_id}'");
        return;
    };
    action.stop(app, binding_id, hotkey_string);
    *stage = Stage::Processing;
}
