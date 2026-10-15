import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";
import { publicEnv } from "@/lib/env";

/**
 * Cliente Supabase para Server Components, Route Handlers y Server Actions.
 * Lee/escribe la sesión desde las cookies de Next.js.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Llamado desde un Server Component: se puede ignorar si hay
            // middleware refrescando la sesión.
          }
        },
      },
    }
  );
}
