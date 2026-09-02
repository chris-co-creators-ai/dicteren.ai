//! License manager — talks to the Dicteren.ai web API for activation and
//! status checks. The signed HMAC token returned by the server is stored
//! in the OS keychain via the `keyring` crate.
//!
//! Server source of truth lives in `web/src/app/api/license/activate/route.ts`
//! and `web/src/app/api/license/status/route.ts`. Response shapes here must
//! mirror those.

use anyhow::{anyhow, Context, Result};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use keyring::Entry;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::{Mutex, RwLock};
use std::time::{Duration, Instant};

/// Production API base. Debug builds may point this elsewhere with
/// `DICTEREN_API_BASE` to test against a dev server; release builds ignore the
/// variable, since honouring it would let anyone answer their own status calls
/// and unlock the app.
const DEFAULT_API_BASE: &str = "https://www.dicteren.ai";
const KEYCHAIN_SERVICE: &str = "ai.dicteren";
const KEYCHAIN_TOKEN_USER: &str = "license_token";
const APP_VERSION: &str = env!("CARGO_PKG_VERSION");
/// Trials are consumer licenses; the code prefix is the only discriminator the
/// server keeps (see `web/src/lib/services/trial.ts`).
const TRIAL_CODE_PREFIX: &str = "DIC-TRIAL-";

#[cfg(debug_assertions)]
fn api_base() -> String {
    std::env::var("DICTEREN_API_BASE").unwrap_or_else(|_| DEFAULT_API_BASE.to_string())
}

#[cfg(not(debug_assertions))]
fn api_base() -> String {
    DEFAULT_API_BASE.to_string()
}

#[derive(Clone, Debug, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum LicenseStatus {
    /// No token in keychain — user must activate.
    Unknown,
    Trial,
    Active,
    PastDue,
    Canceled,
    Expired,
    Refunded,
    Revoked,
}

#[derive(Clone, Debug, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum LicenseType {
    Beta,
    Consumer,
    Team,
}

#[derive(Clone, Debug, Serialize, Deserialize, specta::Type)]
pub struct LicenseInfo {
    pub status: LicenseStatus,
    pub license_type: Option<LicenseType>,
    pub expires_at: Option<String>,
    /// True when token verifies & status is one of: Active, Trial, PastDue
    /// (PastDue is grace-period — app stays unlocked).
    pub is_unlocked: bool,
    /// Set when we last successfully reached the server.
    pub last_verified_at: Option<String>,
    /// Plan-naam ("Persoonlijk maand", "Zakelijk jaar", ...). Null = trial of
    /// onbekend. Komt uit `plans.label` op de server.
    pub plan_label: Option<String>,
    /// "monthly" | "quarterly" | "yearly" | "lifetime" | null.
    pub period: Option<String>,
    /// Hoe de license is uitgegeven (`self-signup`, `admin-grant`, `partner:ORG-X`).
    pub source: Option<String>,
    /// Discount-snapshot bij issue (`free_months`, `lifetime`, `percentage`, `fixed`).
    pub discount_type: Option<String>,
    pub discount_value: Option<i64>,
    /// Status van de Mollie subscription (`active`, `canceled`, ...). Null = geen sub.
    pub subscription_status: Option<String>,
    /// Volgende incasso (ISO). Null = lifetime / geen sub.
    pub next_billing_at: Option<String>,
    /// True als de licentiecode een proefperiode is (`DIC-TRIAL-`). Bepaalt of
    /// het lock-scherm proefperiode-copy of verleng-copy toont.
    pub is_trial: bool,
}

impl LicenseInfo {
    pub fn unknown() -> Self {
        Self {
            status: LicenseStatus::Unknown,
            license_type: None,
            expires_at: None,
            is_unlocked: false,
            last_verified_at: None,
            plan_label: None,
            period: None,
            source: None,
            discount_type: None,
            discount_value: None,
            subscription_status: None,
            next_billing_at: None,
            is_trial: false,
        }
    }
}

fn parse_status(raw: &str) -> LicenseStatus {
    match raw {
        "trial" => LicenseStatus::Trial,
        "active" => LicenseStatus::Active,
        "past_due" => LicenseStatus::PastDue,
        "canceled" => LicenseStatus::Canceled,
        "expired" => LicenseStatus::Expired,
        "refunded" => LicenseStatus::Refunded,
        "revoked" => LicenseStatus::Revoked,
        _ => LicenseStatus::Unknown,
    }
}

fn parse_type(raw: &str) -> Option<LicenseType> {
    match raw {
        "beta" => Some(LicenseType::Beta),
        "consumer" => Some(LicenseType::Consumer),
        "team" => Some(LicenseType::Team),
        _ => None,
    }
}

fn status_unlocks(status: &LicenseStatus) -> bool {
    matches!(
        status,
        LicenseStatus::Active | LicenseStatus::Trial | LicenseStatus::PastDue
    )
}

/// A license only unlocks when the status allows it *and* the expiry has not
/// passed. Status alone is not enough: a trial row keeps `status = "trial"`
/// until something re-reads it, so an elapsed `expiresAt` must lock on its own.
fn unlocks_now(status: &LicenseStatus, expires_at: Option<&str>) -> bool {
    status_unlocks(status) && !expires_at.map(is_iso_in_past).unwrap_or(false)
}

/// Re-test cached info against the current clock. A trial that lapses while
/// the app is running must lock immediately, not at the next heartbeat, and
/// the status has to follow so the lock screen picks the right copy.
///
/// Statuses that already explain a lock (revoked, refunded, canceled) are left
/// alone; only a still-valid-looking status gets rewritten to Expired.
fn settle(mut info: LicenseInfo) -> LicenseInfo {
    let unlocked = unlocks_now(&info.status, info.expires_at.as_deref());
    if !unlocked && status_unlocks(&info.status) {
        info.status = LicenseStatus::Expired;
    }
    info.is_unlocked = unlocked;
    info
}

// ───── Keychain helpers ─────────────────────────────────────────────────

fn entry() -> Result<Entry> {
    Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_TOKEN_USER).context("Failed to access OS keychain")
}

pub fn save_token(token: &str) -> Result<()> {
    entry()?.set_password(token).context("Failed to save token")
}

pub fn load_token() -> Result<Option<String>> {
    match entry()?.get_password() {
        Ok(t) => Ok(Some(t)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(anyhow!("Keychain read failed: {e}")),
    }
}

pub fn delete_token() -> Result<()> {
    match entry()?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(anyhow!("Keychain delete failed: {e}")),
    }
}

// ───── Device fingerprint ───────────────────────────────────────────────

/// Stable per-device id. Hash the OS-level machine UID with the bundle id so
/// reinstalls of the same app on the same machine get the same fingerprint,
/// but a totally different app on that machine wouldn't.
pub fn device_fingerprint() -> Result<String> {
    let raw = machine_uid::get().map_err(|e| anyhow!("Failed to read machine UID: {e}"))?;
    let mut hasher = Sha256::new();
    hasher.update(b"ai.dicteren:v1:");
    hasher.update(raw.as_bytes());
    let digest = hasher.finalize();
    let mut hex = String::with_capacity(32);
    for b in &digest[..16] {
        hex.push_str(&format!("{:02x}", b));
    }
    Ok(format!("fp_{}", hex))
}

fn platform_label() -> &'static str {
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    {
        "darwin-arm64"
    }
    #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
    {
        "darwin-x86_64"
    }
    #[cfg(all(target_os = "windows", target_arch = "x86_64"))]
    {
        "windows-x86_64"
    }
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    {
        "linux-x86_64"
    }
    #[cfg(all(target_os = "linux", target_arch = "aarch64"))]
    {
        "linux-arm64"
    }
    #[cfg(not(any(
        all(target_os = "macos", target_arch = "aarch64"),
        all(target_os = "macos", target_arch = "x86_64"),
        all(target_os = "windows", target_arch = "x86_64"),
        all(target_os = "linux", target_arch = "x86_64"),
        all(target_os = "linux", target_arch = "aarch64"),
    )))]
    {
        "unknown"
    }
}

// ───── HTTP calls ───────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
struct ActivatePayload<'a> {
    #[serde(rename = "licenseCode")]
    license_code: &'a str,
    #[serde(rename = "deviceFingerprint")]
    device_fingerprint: String,
    platform: &'static str,
    #[serde(rename = "appVersion")]
    app_version: &'static str,
}

#[derive(Debug, Deserialize)]
struct ActivateLicenseSection {
    status: String,
    #[serde(rename = "type")]
    type_: String,
    #[serde(rename = "expiresAt")]
    expires_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ActivateResponse {
    success: bool,
    error: Option<String>,
    token: Option<String>,
    license: Option<ActivateLicenseSection>,
}

#[derive(Debug, Deserialize)]
struct StatusLicenseSection {
    status: String,
    #[serde(rename = "type")]
    type_: String,
    #[serde(rename = "expiresAt")]
    expires_at: Option<String>,
    // Nieuwe velden — Tauri abonnement-pagina toont plan-label + discount +
    // subscription-state. Allemaal optioneel zodat oudere servers werken.
    #[serde(rename = "planLabel", default)]
    plan_label: Option<String>,
    #[serde(default)]
    period: Option<String>,
    #[serde(default)]
    source: Option<String>,
    #[serde(rename = "discountType", default)]
    discount_type: Option<String>,
    #[serde(rename = "discountValue", default)]
    discount_value: Option<i64>,
    #[serde(rename = "subscriptionStatus", default)]
    subscription_status: Option<String>,
    #[serde(rename = "nextBillingAt", default)]
    next_billing_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct StatusResponse {
    success: bool,
    token: Option<String>,
    license: Option<StatusLicenseSection>,
    error: Option<String>,
    code: Option<String>,
}

/// POST /api/license/activate — exchange code for token.
pub async fn activate(license_code: &str) -> Result<LicenseInfo> {
    let fp = device_fingerprint()?;
    let payload = ActivatePayload {
        license_code,
        device_fingerprint: fp,
        platform: platform_label(),
        app_version: APP_VERSION,
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()?;

    let url = format!("{}/api/license/activate", api_base());
    let res = client.post(&url).json(&payload).send().await?;
    let status_code = res.status();
    let body: ActivateResponse = res
        .json()
        .await
        .context("Failed to parse activate response")?;

    if !body.success || !status_code.is_success() {
        let msg = body
            .error
            .unwrap_or_else(|| format!("Activatie mislukt ({status_code})"));
        return Err(anyhow!(msg));
    }

    let token = body
        .token
        .ok_or_else(|| anyhow!("Server gaf geen token terug"))?;
    let license = body
        .license
        .ok_or_else(|| anyhow!("Server gaf geen licentiestatus terug"))?;

    save_token(&token)?;

    let status = parse_status(&license.status);
    Ok(LicenseInfo {
        is_unlocked: unlocks_now(&status, license.expires_at.as_deref()),
        status,
        license_type: parse_type(&license.type_),
        expires_at: license.expires_at,
        last_verified_at: Some(chrono::Utc::now().to_rfc3339()),
        plan_label: None,
        period: None,
        source: None,
        discount_type: None,
        discount_value: None,
        subscription_status: None,
        next_billing_at: None,
        is_trial: token_is_trial(),
    })
}

/// GET /api/license/status with Bearer token — server returns fresh status
/// and reissues the token. Counter is NOT bumped on the server side.
pub async fn fetch_status() -> Result<LicenseInfo> {
    let Some(token) = load_token()? else {
        return Ok(LicenseInfo::unknown());
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let url = format!("{}/api/license/status", api_base());
    let res = client.get(&url).bearer_auth(&token).send().await?;
    let status_code = res.status();

    // 401 = our token is gone (activation revoked, device unknown). Wipe.
    if status_code == reqwest::StatusCode::UNAUTHORIZED {
        let body: StatusResponse = res.json().await.unwrap_or(StatusResponse {
            success: false,
            token: None,
            license: None,
            error: None,
            code: None,
        });
        log::warn!("License status 401 — wiping token. code={:?}", body.code);
        delete_token().ok();
        return Ok(LicenseInfo::unknown());
    }

    let body: StatusResponse = res
        .json()
        .await
        .context("Failed to parse status response")?;

    if !body.success {
        return Err(anyhow!(body
            .error
            .unwrap_or_else(|| "Status check mislukt".into())));
    }

    let license = body
        .license
        .ok_or_else(|| anyhow!("Server gaf geen licentiestatus terug"))?;

    if let Some(new_token) = body.token {
        save_token(&new_token).ok();
    }

    let status = parse_status(&license.status);
    Ok(LicenseInfo {
        is_unlocked: unlocks_now(&status, license.expires_at.as_deref()),
        status,
        license_type: parse_type(&license.type_),
        expires_at: license.expires_at,
        last_verified_at: Some(chrono::Utc::now().to_rfc3339()),
        plan_label: license.plan_label,
        period: license.period,
        source: license.source,
        discount_type: license.discount_type,
        discount_value: license.discount_value,
        subscription_status: license.subscription_status,
        next_billing_at: license.next_billing_at,
        is_trial: token_is_trial(),
    })
}

/// Server-signed token payload. We deserialize it offline to enforce expiry
/// when the network is unreachable. HMAC signature is NOT verified here —
/// the server validates it on every reconnect (mismatch → 401 → wipe token).
/// Field names mirror `web/src/lib/services/token.ts`.
#[derive(Debug, Deserialize)]
struct TokenPayload {
    #[serde(rename = "expiresAt")]
    expires_at: Option<String>,
    status: String,
    #[serde(rename = "type")]
    type_: Option<String>,
    #[serde(rename = "licenseCode", default)]
    license_code: Option<String>,
}

/// Read the trial flag off the stored token. The status endpoint does not
/// return the code, so the signed token is the only local source.
fn token_is_trial() -> bool {
    load_token()
        .ok()
        .flatten()
        .and_then(|token| decode_token_payload(&token))
        .and_then(|payload| payload.license_code)
        .map(|code| code.starts_with(TRIAL_CODE_PREFIX))
        .unwrap_or(false)
}

/// Decode a server-issued license token (base64url of `{json}.{hmac_hex}`)
/// and return the payload. Returns None on any decode/parse failure — caller
/// should then treat the token as untrustworthy and force re-activation.
fn decode_token_payload(token: &str) -> Option<TokenPayload> {
    let decoded = URL_SAFE_NO_PAD.decode(token.as_bytes()).ok()?;
    let utf8 = std::str::from_utf8(&decoded).ok()?;
    let last_dot = utf8.rfind('.')?;
    let json = &utf8[..last_dot];
    serde_json::from_str::<TokenPayload>(json).ok()
}

/// Returns true if the ISO-8601 string lies in the past.
fn is_iso_in_past(iso: &str) -> bool {
    chrono::DateTime::parse_from_rfc3339(iso)
        .map(|dt| chrono::Utc::now() >= dt.with_timezone(&chrono::Utc))
        .unwrap_or(false)
}

/// Network-free view of the license, built from the keychain token and its
/// embedded payload. Used to seed the gate at startup (so the very first
/// hotkey press is already gated) and as the offline fallback when the server
/// is unreachable. An elapsed `expiresAt` locks here too — the user cannot
/// dodge expiry by switching off WiFi.
pub fn offline_state() -> LicenseInfo {
    let Ok(Some(token)) = load_token() else {
        return LicenseInfo::unknown();
    };

    // Token unreadable / corrupted → don't silently unlock.
    let Some(payload) = decode_token_payload(&token) else {
        log::warn!("License token payload undecodable, locking");
        return LicenseInfo::unknown();
    };

    let is_trial = payload
        .license_code
        .as_deref()
        .map(|code| code.starts_with(TRIAL_CODE_PREFIX))
        .unwrap_or(false);

    settle(LicenseInfo {
        // settle() recomputes both of these against the clock.
        is_unlocked: false,
        status: parse_status(&payload.status),
        license_type: payload.type_.as_deref().and_then(parse_type),
        expires_at: payload.expires_at,
        last_verified_at: None,
        // Offline: server-zijdige velden zijn niet bekend. Tauri UI toont een
        // placeholder (zie SubscriptionSettings.tsx) als discount/
        // subscription_status null is.
        plan_label: None,
        period: None,
        source: None,
        discount_type: None,
        discount_value: None,
        subscription_status: None,
        next_billing_at: None,
        is_trial,
    })
}

/// Try a status check. On network failure fall back to the locally decoded
/// token.
pub async fn current_state() -> LicenseInfo {
    match fetch_status().await {
        Ok(info) => info,
        Err(e) => {
            log::warn!("License status fetch failed: {e}");
            offline_state()
        }
    }
}

// ───── Gate ─────────────────────────────────────────────────────────────

/// Cached license state, shared between the async heartbeat and the
/// transcription gate. Held as Tauri managed state.
///
/// The coordinator thread reads this on every hotkey press, so reads must
/// never touch the network. Freshness comes from two sides: the embedded
/// `expiresAt` covers trial/subscription expiry offline, and the heartbeat in
/// `lib.rs` picks up server-side events (refund, revoke, renewal).
pub struct LicenseGate {
    info: RwLock<LicenseInfo>,
    last_refresh: Mutex<Option<Instant>>,
}

/// Shortest gap between two on-demand refreshes, so someone leaning on the
/// hotkey cannot hammer the status endpoint.
const REFRESH_THROTTLE: Duration = Duration::from_secs(60);

impl LicenseGate {
    /// Seed from the keychain so the gate is authoritative from the first
    /// keypress, before the first server round-trip completes.
    pub fn new() -> Self {
        Self {
            info: RwLock::new(offline_state()),
            last_refresh: Mutex::new(None),
        }
    }

    /// Claim the right to run an on-demand refresh, at most once per throttle
    /// window. Called when a keypress is refused: a renewal may have landed
    /// since the last heartbeat, and someone who just paid should not wait
    /// hours to get back in.
    pub fn claim_refresh_slot(&self) -> bool {
        let mut last = match self.last_refresh.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        let now = Instant::now();
        if last.is_some_and(|prev| now.duration_since(prev) < REFRESH_THROTTLE) {
            return false;
        }
        *last = Some(now);
        true
    }

    /// Always settled against the current clock, so the UI and the
    /// transcription gate can never disagree about whether the app is open.
    pub fn snapshot(&self) -> LicenseInfo {
        let cached = match self.info.read() {
            Ok(guard) => guard.clone(),
            Err(poisoned) => poisoned.into_inner().clone(),
        };
        settle(cached)
    }

    pub fn set(&self, info: LicenseInfo) {
        match self.info.write() {
            Ok(mut guard) => *guard = info,
            Err(poisoned) => *poisoned.into_inner() = info,
        }
    }

    /// Network-free check run on every transcription trigger.
    pub fn allows_transcription(&self) -> bool {
        self.snapshot().is_unlocked
    }

    /// Hit the server, store the result, and hand it back.
    pub async fn refresh(&self) -> LicenseInfo {
        let info = current_state().await;
        self.set(info.clone());
        info
    }
}

impl Default for LicenseGate {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn info(status: LicenseStatus, expires_at: Option<&str>) -> LicenseInfo {
        LicenseInfo {
            status,
            expires_at: expires_at.map(str::to_string),
            ..LicenseInfo::unknown()
        }
    }

    fn hours_from_now(hours: i64) -> String {
        (chrono::Utc::now() + chrono::Duration::hours(hours)).to_rfc3339()
    }

    fn gate_holding(info: LicenseInfo) -> LicenseGate {
        LicenseGate {
            info: RwLock::new(info),
            last_refresh: Mutex::new(None),
        }
    }

    #[test]
    fn trial_with_future_expiry_unlocks() {
        let settled = settle(info(LicenseStatus::Trial, Some(&hours_from_now(24))));
        assert!(settled.is_unlocked);
        assert!(matches!(settled.status, LicenseStatus::Trial));
    }

    /// The regression this module exists for: the server keeps `status =
    /// "trial"` on the row until something re-reads it, so status alone would
    /// leave a lapsed trial unlocked forever.
    #[test]
    fn trial_past_expiry_locks_and_reports_expired() {
        let settled = settle(info(LicenseStatus::Trial, Some(&hours_from_now(-1))));
        assert!(!settled.is_unlocked);
        assert!(matches!(settled.status, LicenseStatus::Expired));
    }

    #[test]
    fn active_past_expiry_locks() {
        let settled = settle(info(LicenseStatus::Active, Some(&hours_from_now(-1))));
        assert!(!settled.is_unlocked);
    }

    #[test]
    fn active_without_expiry_stays_unlocked() {
        let settled = settle(info(LicenseStatus::Active, None));
        assert!(settled.is_unlocked);
    }

    /// Grace period: a failed payment keeps the app usable while Mollie retries.
    #[test]
    fn past_due_within_expiry_unlocks() {
        let settled = settle(info(LicenseStatus::PastDue, Some(&hours_from_now(48))));
        assert!(settled.is_unlocked);
    }

    /// Statuses that already explain the lock keep their own copy on the lock
    /// screen instead of being flattened to "expired".
    #[test]
    fn revoked_keeps_its_status() {
        let settled = settle(info(LicenseStatus::Revoked, Some(&hours_from_now(48))));
        assert!(!settled.is_unlocked);
        assert!(matches!(settled.status, LicenseStatus::Revoked));
    }

    #[test]
    fn refunded_keeps_its_status() {
        let settled = settle(info(LicenseStatus::Refunded, None));
        assert!(!settled.is_unlocked);
        assert!(matches!(settled.status, LicenseStatus::Refunded));
    }

    #[test]
    fn unknown_stays_locked() {
        let settled = settle(LicenseInfo::unknown());
        assert!(!settled.is_unlocked);
        assert!(matches!(settled.status, LicenseStatus::Unknown));
    }

    /// An unparseable timestamp must not be read as "not expired" by accident;
    /// it should behave like the absent case and lean on status only.
    #[test]
    fn malformed_expiry_does_not_unlock_a_locked_status() {
        let settled = settle(info(LicenseStatus::Expired, Some("not-a-date")));
        assert!(!settled.is_unlocked);
    }

    #[test]
    fn gate_blocks_transcription_for_expired_trial() {
        let gate = gate_holding(info(LicenseStatus::Trial, Some(&hours_from_now(-1))));
        assert!(!gate.allows_transcription());
    }

    #[test]
    fn gate_allows_transcription_for_running_trial() {
        let gate = gate_holding(info(LicenseStatus::Trial, Some(&hours_from_now(1))));
        assert!(gate.allows_transcription());
    }

    /// The gate is read on every keypress and re-settles each time, so a trial
    /// that lapses mid-session locks without waiting for the heartbeat.
    #[test]
    fn gate_relocks_when_cached_info_lapses() {
        let gate = gate_holding(LicenseInfo {
            is_unlocked: true,
            ..info(LicenseStatus::Trial, Some(&hours_from_now(-1)))
        });
        assert!(!gate.allows_transcription());
    }

    #[test]
    fn trial_code_prefix_is_detected() {
        assert!("DIC-TRIAL-ABCD-1234".starts_with(TRIAL_CODE_PREFIX));
        assert!(!"DIC-CONS-ABCD-1234".starts_with(TRIAL_CODE_PREFIX));
    }

    /// Holding down a refused hotkey must not turn into a burst of status
    /// calls: the first press claims the slot, the rest are refused.
    #[test]
    fn refresh_slot_is_claimed_once_per_window() {
        // Built directly instead of via new(), which would read the keychain.
        let gate = gate_holding(LicenseInfo::unknown());
        assert!(gate.claim_refresh_slot());
        assert!(!gate.claim_refresh_slot());
        assert!(!gate.claim_refresh_slot());
    }
}
