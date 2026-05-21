import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Default Next ignores
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendor-code (shadcn/ui originals + test-scripts) — not user-authored
    "src/components/ui/**",
    "src/hooks/use-mobile.ts",
    "scripts/**",
    "drizzle/**",
  ]),
  // Server-components evaluate once per request, so reading Date.now()/new Date()
  // inline is fine — disable the React purity rule globally.
  {
    rules: {
      "react-hooks/purity": "off",
    },
  },
]);

export default eslintConfig;
