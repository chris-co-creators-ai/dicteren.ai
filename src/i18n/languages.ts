/**
 * Dicteren.ai is intentionally Dutch-only.
 */
export const LANGUAGE_METADATA: Record<
  string,
  {
    name: string;
    nativeName: string;
    priority?: number;
    direction?: "ltr" | "rtl";
  }
> = {
  nl: { name: "Dutch", nativeName: "Nederlands", priority: 1 },
};
