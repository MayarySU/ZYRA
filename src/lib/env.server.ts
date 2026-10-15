/**
 * Configuración de entorno SOLO para el servidor.
 *
 * Este módulo importa secretos (service key de Supabase y credenciales de
 * Cloudflare R2). NUNCA debe importarse desde componentes cliente ni desde
 * archivos con "use client".
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Falta la variable de entorno de servidor ${name}`);
  }
  return value;
}

export const serverEnv = {
  supabaseUrl: required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  ),
  supabaseSecretKey: required(
    "SUPABASE_SECRET_KEY",
    process.env.SUPABASE_SECRET_KEY
  ),
  databaseUrl: process.env.DATABASE_URL,
  r2: {
    accountId: required("R2_ACCOUNT_ID", process.env.R2_ACCOUNT_ID),
    accessKeyId: required("R2_ACCESS_KEY_ID", process.env.R2_ACCESS_KEY_ID),
    secretAccessKey: required(
      "R2_SECRET_ACCESS_KEY",
      process.env.R2_SECRET_ACCESS_KEY
    ),
    bucketName: required("R2_BUCKET_NAME", process.env.R2_BUCKET_NAME),
  },
} as const;
