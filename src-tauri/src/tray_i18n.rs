//! Tray menu internationalization
//!
//! Everything is auto-generated at compile time by build.rs from the
//! frontend locale files (src/i18n/locales/*/translation.json).
//!
//! The Dutch translation.json is the single source of truth:
//! - TrayStrings struct fields are derived from the Dutch "tray" keys
//! - Dicteren.ai intentionally ships with Dutch as the only app locale
//!
//! To add a new tray menu item:
//! 1. Add the key to nl/translation.json under "tray"
//! 3. Update tray.rs to use the new field (e.g., strings.new_field)

use once_cell::sync::Lazy;
use std::collections::HashMap;

// Include the auto-generated TrayStrings struct and TRANSLATIONS static
include!(concat!(env!("OUT_DIR"), "/tray_translations.rs"));

/// Get localized tray menu strings based on the system locale.
///
/// Lookup order: full locale -> language code -> Dutch.
pub fn get_tray_translations(locale: Option<String>) -> TrayStrings {
    let locale_str = locale.as_deref().unwrap_or("nl");
    let lang_code = locale_str.split(['-', '_']).next().unwrap_or("nl");

    TRANSLATIONS
        .get(locale_str)
        .or_else(|| TRANSLATIONS.get(lang_code))
        .or_else(|| TRANSLATIONS.get("nl"))
        .cloned()
        .expect("Dutch translations must exist")
}
