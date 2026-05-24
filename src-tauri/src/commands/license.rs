//! Tauri commands for the license/onboarding flow. Thin wrappers around
//! `managers::license` so the frontend gets typed bindings via specta.

use crate::managers::license::{
    activate, current_state, delete_token, fetch_status, load_token, start_trial,
    LicenseInfo,
};
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

const ACCOUNT_BILLING_URL: &str = "https://dicteren.ai/account/billing";
const PRICING_URL: &str = "https://dicteren.ai/prijzen";
const TRIAL_START_URL: &str = "https://dicteren.ai/auth/sign-up?next=/trial/start";

/// Read the current license state. Tries the server first; falls back to
/// "has token in keychain → still unlocked" when offline.
#[tauri::command]
#[specta::specta]
pub async fn get_license_state() -> LicenseInfo {
    current_state().await
}

/// POST the code to the web API. Stores the returned token in the keychain.
/// Returns the fresh license info.
#[tauri::command]
#[specta::specta]
pub async fn activate_license(license_code: String) -> Result<LicenseInfo, String> {
    activate(license_code.trim()).await.map_err(|e| e.to_string())
}

/// Start an anonymous 14-day trial. Per device-fingerprint, permanent.
#[tauri::command]
#[specta::specta]
pub async fn start_trial_command() -> Result<LicenseInfo, String> {
    start_trial().await.map_err(|e| e.to_string())
}

/// Force a server-side status fetch. Updates the cached token (no counter bump).
#[tauri::command]
#[specta::specta]
pub async fn refresh_license_state() -> Result<LicenseInfo, String> {
    fetch_status().await.map_err(|e| e.to_string())
}

/// True when a token exists in the keychain. Used to decide whether onboarding
/// should show the license step.
#[tauri::command]
#[specta::specta]
pub fn has_license_token() -> bool {
    matches!(load_token(), Ok(Some(_)))
}

/// Wipe the local token. Used by the lock-screen "Activeer andere code" action.
#[tauri::command]
#[specta::specta]
pub fn clear_license_token() -> Result<(), String> {
    delete_token().map_err(|e| e.to_string())
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
