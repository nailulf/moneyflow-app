import next from "eslint-config-next";
import storybook from "eslint-plugin-storybook";
import tseslint from "typescript-eslint";

const eslintConfig = [
  ...next,
  ...storybook.configs["flat/recommended"],
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tseslint.plugin
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off"
    }
  },
  {
    rules: {
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off",
      "storybook/no-renderer-packages": "off"
    }
  }
];

export default eslintConfig;
