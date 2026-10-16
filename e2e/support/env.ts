import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

// Carga las credenciales reales (Supabase + R2) desde .env.local.
loadEnv({ path: resolve(process.cwd(), ".env.local") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name} en .env.local`);
  return value;
}

export const SUPABASE_URL = required("NEXT_PUBLIC_SUPABASE_URL");
export const PUBLISHABLE_KEY = required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
export const SECRET_KEY = required("SUPABASE_SECRET_KEY");
export const DATABASE_URL = required("DATABASE_URL");

export const R2 = {
  accountId: required("R2_ACCOUNT_ID"),
  accessKeyId: required("R2_ACCESS_KEY_ID"),
  secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
  bucketName: required("R2_BUCKET_NAME"),
} as const;

// Credenciales de las cuentas usadas por las pruebas. El admin ya existe
// (scripts/seed-admin.mjs); el técnico lo crea el globalSetup.
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@essesolar.com";
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "ZyraAdmin2026!";
export const TECH_EMAIL = process.env.E2E_TECH_EMAIL ?? "e2e.tecnico@zyra.test";
export const TECH_PASSWORD = process.env.E2E_TECH_PASSWORD ?? "E2eTecnico2026!";
