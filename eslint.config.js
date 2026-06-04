import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

/**
 * Lint policy. Beyond correctness, this enforces the project's structural
 * principles (see docs/PLAN.md §7 "Code structure rules"):
 *
 *  - Size limits keep any single unit comprehensible.
 *  - Limits are intentionally generous enough to favour DEEP modules — a few
 *    substantial files with narrow interfaces — over many shallow ones. We cap
 *    sprawl, we do not reward splitting logic into trivial fragments.
 */
export default tseslint.config(
  { ignores: ["dist", "coverage", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // --- LOC / complexity limits ---------------------------------------
      // Per-file ceiling. Files larger than this should be split along a real
      // seam, not padded out. Blank lines and comments don't count so we don't
      // penalise documentation.
      "max-lines": [
        "error",
        { max: 250, skipBlankLines: true, skipComments: true },
      ],
      // Functions/components: keep a single unit graspable in one screen-ful.
      "max-lines-per-function": [
        "error",
        { max: 120, skipBlankLines: true, skipComments: true },
      ],
      complexity: ["error", 15],
      "max-depth": ["error", 4],
      "max-params": ["error", 4],
      "max-nested-callbacks": ["error", 3],

      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Tests may be longer and use globals; relax size limits there.
    files: ["**/*.test.{ts,tsx}"],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
    },
  },
);
