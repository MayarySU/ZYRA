"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";
import { publicEnv } from "@/lib/env";

/**
 * Cliente Supabase para el navegador. Usa la publishable key y opera bajo RLS.
 * La sesión se gestiona mediante cookies (SSR).
 */
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey
  );
}

let browserClient: ReturnType<typeof createClient> | undefined;

/** Singleton para uso en componentes cliente. */
export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createClient();
  }
  return browserClient;
}
