import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import {
  getLanguageDirection,
  updateDocumentDirection,
  updateDocumentLanguage,
} from "@/lib/utils/rtl";

// Auto-discover translation files using Vite's glob import
const localeModules = import.meta.glob<{ default: Record<string, unknown> }>(
  "./locales/*/translation.json",
  { eager: true },
);

// Build resources from discovered locale files
const resources: Record<string, { translation: Record<string, unknown> }> = {};
for (const [path, module] of Object.entries(localeModules)) {
  const langCode = path.match(/\.\/locales\/(.+)\/translation\.json/)?.[1];
  if (langCode) {
    resources[langCode] = { translation: module.default };
  }
}

const FIXED_APP_LANGUAGE = "nl";

// Initialize i18n with Dutch as the fixed product language.
i18n.use(initReactI18next).init({
  resources,
  lng: FIXED_APP_LANGUAGE,
  fallbackLng: FIXED_APP_LANGUAGE,
  interpolation: {
    escapeValue: false, // React already escapes values
  },
  react: {
    useSuspense: false, // Disable suspense for SSR compatibility
  },
});

// Dicteren.ai is a Dutch consumer product; the app language is intentionally fixed.
export const syncLanguageFromSettings = async () => {
  if (i18n.language !== FIXED_APP_LANGUAGE) {
    await i18n.changeLanguage(FIXED_APP_LANGUAGE);
  }
};

// Run language sync on init
syncLanguageFromSettings();

// Listen for language changes to update HTML dir and lang attributes
i18n.on("languageChanged", (lng) => {
  const dir = getLanguageDirection(lng);
  updateDocumentDirection(dir);
  updateDocumentLanguage(lng);
});

// Re-export RTL utilities for convenience
export { getLanguageDirection, isRTLLanguage } from "@/lib/utils/rtl";

export default i18n;
