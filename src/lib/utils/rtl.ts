/**
 * Text direction utilities.
 *
 * Dicteren.ai ships as a Dutch-only consumer product, so the interface is
 * always left-to-right.
 */

/**
 * Check if a language code is RTL (Right-to-Left).
 */
export const isRTLLanguage = (_langCode: string): boolean => false;

/**
 * Get the text direction ('ltr' or 'rtl') for the app language.
 */
export const getLanguageDirection = (_langCode: string): "ltr" | "rtl" =>
  "ltr";

/**
 * Update the HTML document's dir attribute
 * @param dir - The direction ('ltr' or 'rtl')
 */
export const updateDocumentDirection = (dir: "ltr" | "rtl"): void => {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("dir", dir);
  }
};

/**
 * Update the HTML document's lang attribute
 * @param lang - The language code
 */
export const updateDocumentLanguage = (lang: string): void => {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("lang", lang);
  }
};

/**
 * Initialize document language metadata.
 * @param langCode - The current language code
 */
export const initializeRTL = (langCode: string): void => {
  const dir = getLanguageDirection(langCode);
  updateDocumentDirection(dir);
  updateDocumentLanguage(langCode);
};
