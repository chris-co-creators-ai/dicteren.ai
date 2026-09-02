//! Tauri commands for the license/onboarding flow. Thin wrappers around
//! `managers::license` so the frontend gets typed bindings via specta.

use crate::managers::license::{activate, delete_token, load_token, LicenseGate, LicenseInfo};
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

const ACCOUNT_BILLING_URL: &str = "https://dicteren.ai/account/billing";
const PRICING_URL: &str = "https://dicteren.ai/prijzen";
const TRIAL_START_URL: &str = "https://dicteren.ai/auth/sign-up?next=/trial/start";

/// Read the current license state from the gate. The gate is seeded from the
/// keychain at startup and refreshed by the heartbeat, so this returns without
/// touching the network.
#[tauri::command]
#[specta::specta]
pub fn get_license_state(gate: State<'_, LicenseGate>) -> LicenseInfo {
    gate.snapshot()
}

/// POST the code to the web API. Stores the returned token in the keychain and
/// opens the gate on success.
#[tauri::command]
#[specta::specta]
pub async fn activate_license(
    gate: State<'_, LicenseGate>,
    license_code: String,
) -> Result<LicenseInfo, String> {
    let info = activate(license_code.trim())
        .await
        .map_err(|e| e.to_string())?;
    gate.set(info.clone());
    Ok(info)
}

/// Force a server-side status fetch and store the result in the gate.
#[tauri::command]
#[specta::specta]
pub async fn refresh_license_state(gate: State<'_, LicenseGate>) -> Result<LicenseInfo, String> {
    Ok(gate.refresh().await)
}

/// True when a token exists in the keychain. Used to decide whether onboarding
/// should show the license step.
#[tauri::command]
#[specta::specta]
pub fn has_license_token() -> bool {
    matches!(load_token(), Ok(Some(_)))
}

/// Wipe the local token and close the gate. Used by the lock-screen
/// "Activeer andere code" action.
#[tauri::command]
#[specta::specta]
pub fn clear_license_token(gate: State<'_, LicenseGate>) -> Result<(), String> {
    delete_token().map_err(|e| e.to_string())?;
    gate.set(LicenseInfo::unknown());
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn open_billing_page(app: AppHandle) -> Result<(), String> {
    app.opener()
        .open_url(ACCOUNT_BILLING_URL, None::<String>)
        .map_err(|e| format!("Failed to open billing page: {}", e))
}

#[tauri::command]
#[specta::specta]
pub fn open_pricing_page(app: AppHandle) -> Result<(), String> {
    app.opener()
        .open_url(PRICING_URL, None::<String>)
        .map_err(|e| format!("Failed to open pricing page: {}", e))
}

#[tauri::command]
#[specta::specta]
pub fn open_trial_start_page(app: AppHandle) -> Result<(), String> {
    app.opener()
        .open_url(TRIAL_START_URL, None::<String>)
        .map_err(|e| format!("Failed to open trial-start page: {}", e))
}
