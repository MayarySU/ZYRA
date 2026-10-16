import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  PUBLISHABLE_KEY,
  SECRET_KEY,
  SUPABASE_URL,
} from "./env";

const AUTH_OPTS = { autoRefreshToken: false, persistSession: false } as const;

/** Cliente anónimo (publishable key): respeta RLS, como el navegador. */
export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { ...AUTH_OPTS } });
}

/** Cliente service-role: omite RLS (solo para setup/limpieza de pruebas). */
export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SECRET_KEY, { auth: { ...AUTH_OPTS } });
}

/** Inicia sesión como administrador con la publishable key (respeta RLS). */
export async function signInAdmin(): Promise<SupabaseClient> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (error) throw new Error(`No se pudo iniciar sesión como admin: ${error.message}`);
  return client;
}

/** Inicia sesión con credenciales arbitrarias. */
export async function signIn(email: string, password: string): Promise<SupabaseClient> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`No se pudo iniciar sesión como ${email}: ${error.message}`);
  return client;
}
