import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { serverEnv } from "@/lib/env.server";

/**
 * Cliente administrador de Supabase (service key). Omite RLS.
 *
 * SOLO debe usarse en el servidor (Route Handlers / Server Actions) para
 * operaciones privilegiadas: crear usuarios de Auth, etc. NUNCA importar desde
 * el navegador.
 */
export function createAdminClient() {
  return createClient<Database>(
    serverEnv.supabaseUrl,
    serverEnv.supabaseSecretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
