/**
 * Acceso a variables de entorno públicas (seguras para el navegador).
 *
 * IMPORTANTE: aquí SOLO deben exponerse valores con prefijo NEXT_PUBLIC_*.
 * Los secretos (service key de Supabase, credenciales R2) viven en
 * `env.server.ts` y nunca se importan desde componentes cliente.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

export const publicEnv = {
  supabaseUrl: required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  ),
  supabasePublishableKey: required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ),
} as const;
