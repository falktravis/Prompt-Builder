import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Disable the 'no-explicit-any' rule
      "@typescript-eslint/no-explicit-any": "off",
      // Disable the 'no-unused-vars' rule
      "@typescript-eslint/no-unused-vars": "off",
      // Disable the 'exhaustive-deps' rule
      "react-hooks/exhaustive-deps": "off",
      // Disable the 'no-unsafe-assignment' rule
      "@typescript-eslint/no-empty-object-types": "off",
    },
  },
];

export default eslintConfig;
