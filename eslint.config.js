import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "captures", "test-results", "playwright-report", "reference"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    ...reactHooks.configs.flat.recommended,
    languageOptions: { globals: globals.browser },
  },
  {
    // Scripts et parcours Playwright : du code Node, avec des fonctions exécutées dans la page.
    files: ["scripts/**/*.mjs", "*.config.{js,ts}", "tests/**/*.ts"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
