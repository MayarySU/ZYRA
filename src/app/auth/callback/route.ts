import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Callback del flujo PKCE de Supabase Auth.
 *
 * Supabase redirige aquí (con `?code=`) tras verificar el enlace de
 * recuperación de contraseña. Intercambiamos el código por una sesión (que se
 * guarda en cookies vía @supabase/ssr) y redirigimos al destino indicado.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const errorDescription = searchParams.get("error_description");

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription)}`
    );
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const destino = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      return NextResponse.redirect(`${origin}${destino}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("No se pudo validar el enlace")}`
  );
}
