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

/// Production API base. Override at runtime via `DICTEREN_API_BASE` for testing
/// against a dev server.
const DEFAULT_API_BASE: &str = "https://www.dicteren.ai";
const KEYCHAIN_SERVICE: &str = "ai.dicteren";
const KEYCHAIN_TOKEN_USER: &str = "license_token";
const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

fn api_base() -> String {
    std::env::var("DICTEREN_API_BASE").unwrap_or_else(|_| DEFAULT_API_BASE.to_string())
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

// ───── Keychain helpers ─────────────────────────────────────────────────

fn entry() -> Result<Entry> {
    Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_TOKEN_USER)
        .context("Failed to access OS keychain")
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
    let raw = machine_uid::get()
        .map_err(|e| anyhow!("Failed to read machine UID: {e}"))?;
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

#[derive(Debug, Serialize)]
struct TrialPayload {
    #[serde(rename = "deviceFingerprint")]
    device_fingerprint: String,
    platform: &'static str,
    #[serde(rename = "appVersion")]
    app_version: &'static str,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct TrialResponse {
    success: bool,
    error: Option<String>,
    code: Option<String>,
    token: Option<String>,
    license: Option<ActivateLicenseSection>,
    #[serde(rename = "isExisting")]
    is_existing: Option<bool>,
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
        is_unlocked: status_unlocks(&status),
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
    })
}

/// POST /api/license/trial — anonymous 14-day trial.
/// Returns Ok(info) on success (new or reactivated) or Err with the
/// server-provided NL message when the trial is already used.
pub async fn start_trial() -> Result<LicenseInfo> {
    let fp = device_fingerprint()?;
    let payload = TrialPayload {
        device_fingerprint: fp.clone(),
        platform: platform_label(),
        app_version: APP_VERSION,
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()?;

    let url = format!("{}/api/license/trial", api_base());
    let res = client.post(&url).json(&payload).send().await?;
    let status_code = res.status();
    let body: TrialResponse = res
        .json()
        .await
        .context("Failed to parse trial response")?;

    if !body.success || !status_code.is_success() {
        let msg = body
            .error
            .unwrap_or_else(|| format!("Trial-start mislukt ({status_code})"));
        // Bubble the server's code so the UI can show the right message.
        let _code = body.code.unwrap_or_default();
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
        is_unlocked: status_unlocks(&status),
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
        log::warn!(
            "License status 401 — wiping token. code={:?}",
            body.code
        );
        delete_token().ok();
        return Ok(LicenseInfo::unknown());
    }

    let body: StatusResponse = res
        .json()
        .await
        .context("Failed to parse status response")?;

    if !body.success {
        return Err(anyhow!(body.error.unwrap_or_else(|| "Status check mislukt".into())));
    }

    let license = body
        .license
        .ok_or_else(|| anyhow!("Server gaf geen licentiestatus terug"))?;

    if let Some(new_token) = body.token {
        save_token(&new_token).ok();
    }

    let status = parse_status(&license.status);
    Ok(LicenseInfo {
        is_unlocked: status_unlocks(&status),
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

/// Try a status check. On network failure fall back to the cached token:
/// decode its payload locally and honor the embedded `expiresAt`. If expired,
/// lock the app even offline — the user cannot dodge expiry by switching
/// off WiFi. If a token cannot be decoded at all, force re-activation.
pub async fn current_state() -> LicenseInfo {
    match fetch_status().await {
        Ok(info) => info,
        Err(e) => {
            log::warn!("License status fetch failed: {e}");
            let Ok(Some(token)) = load_token() else {
                return LicenseInfo::unknown();
            };

            // Token unreadable / corrupted → don't silently unlock.
            let Some(payload) = decode_token_payload(&token) else {
                log::warn!("Offline fallback: token payload undecodable, locking");
                return LicenseInfo::unknown();
            };

            // Expired per token? Lock.
            if payload
                .expires_at
                .as_deref()
                .map(is_iso_in_past)
                .unwrap_or(false)
            {
                log::warn!("Offline fallback: token expiresAt is past, locking");
                return LicenseInfo {
                    status: LicenseStatus::Expired,
                    license_type: payload.type_.as_deref().and_then(parse_type),
                    expires_at: payload.expires_at,
                    is_unlocked: false,
                    last_verified_at: None,
                    plan_label: None,
                    period: None,
                    source: None,
                    discount_type: None,
                    discount_value: None,
                    subscription_status: None,
                    next_billing_at: None,
                };
            }

            // Server-reported status at last sign was unlocked? Trust it
            // until the next online round-trip.
            let token_status = parse_status(&payload.status);
            let unlocked = status_unlocks(&token_status);
            let final_status = if unlocked {
                token_status
            } else {
                // Last known server status was already locked — keep locked.
                LicenseStatus::Expired
            };
            LicenseInfo {
                is_unlocked: unlocked,
                status: final_status,
                license_type: payload.type_.as_deref().and_then(parse_type),
                expires_at: payload.expires_at,
                last_verified_at: None,
                // Offline: server-zijdige velden zijn niet bekend. Tauri UI
                // toont een placeholder (zie SubscriptionSettings.tsx) als
                // discount/subscription_status null is.
                plan_label: None,
                period: None,
                source: None,
                discount_type: None,
                discount_value: None,
                subscription_status: None,
                next_billing_at: None,
            }
        }
    }
}
