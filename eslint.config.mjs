import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "public/sw.js",
      "public/swe-worker-*.js",
      "public/workbox-*.js",
      "tsconfig.tsbuildinfo",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // El código heredado conserva `any` en puntos puntuales (filas de Supabase
      // y componentes shadcn/ui). Se degrada a advertencia para no forzar un
      // refactor masivo ajeno al alcance de la migración.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // Regla pensada para el Pages Router: en el App Router el <link> de fuentes
    // del layout raíz se aplica globalmente, por lo que aquí es un falso positivo.
    files: ["src/app/layout.tsx"],
    rules: {
      "@next/next/no-page-custom-font": "off",
    },
  },
  {
    // Los tests E2E de Playwright usan fixtures cuyo parámetro se llama `use`
    // (la API de Playwright), lo que `react-hooks` interpreta como un hook.
    files: ["e2e/**/*.ts"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
];

export default eslintConfig;
