import js from "@eslint/js";
import eslintReact from "@eslint-react/eslint-plugin";
import pluginReactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked, // Add type checking rules
    ],
    files: ["src/**/*.{ts,tsx}", "*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname, // or __dirname in CJS
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
  },
  {
    files: ["src/**/*.{tsx,jsx}"],
    ...eslintReact.configs["recommended-typescript"],
    plugins: {
      ...eslintReact.configs["recommended-typescript"].plugins,
      "react-hooks": pluginReactHooks,
    },
    rules: {
      ...eslintReact.configs["recommended-typescript"].rules,
      "@eslint-react/dom-no-unknown-property": ["error", { ignore: ["css"] }],
      "@eslint-react/naming-convention-ref-name": "off",
      "@eslint-react/no-missing-component-display-name": "error",
      "@eslint-react/no-missing-context-display-name": "error",
      "@eslint-react/no-array-index-key": "off",
      "@eslint-react/no-clone-element": "off",
      "@eslint-react/purity": "off",
      "@eslint-react/set-state-in-effect": "off",
      "@eslint-react/unsupported-syntax": "off",
      "@eslint-react/web-api-no-leaked-fetch": "off",
      "@eslint-react/web-api-no-leaked-timeout": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["scripts/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
      parser: tseslint.parser,
      parserOptions: {
        projectService: false,
      },
    },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      // relax strict rules that aren’t useful for one-off scripts
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },
);
