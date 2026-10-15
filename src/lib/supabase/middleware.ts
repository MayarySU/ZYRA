import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/types";
import { publicEnv } from "@/lib/env";

/** Rutas accesibles solo sin sesión (si hay sesión, se redirige al panel). */
const RUTAS_SOLO_ANONIMAS = ["/login", "/forgot-password"];

/** Rutas accesibles con o sin sesión (flujo de recuperación de contraseña). */
const RUTAS_ACCESO_LIBRE = ["/auth", "/reset-password"];

/**
 * Refresca la sesión de Supabase en cada petición y aplica protección de rutas.
 * Patrón oficial de @supabase/ssr para Next.js Middleware.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: no ejecutar código entre createServerClient y getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const coincide = (rutas: string[]) =>
    rutas.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const esSoloAnonima = coincide(RUTAS_SOLO_ANONIMAS);
  const esAccesoLibre = coincide(RUTAS_ACCESO_LIBRE);

  // Raíz → redirigir según sesión
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/dashboard" : "/login";
    return NextResponse.redirect(url);
  }

  // Con sesión en rutas de acceso anónimo → dashboard
  if (user && esSoloAnonima) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Sin sesión y ruta protegida (ni anónima ni de acceso libre) → login
  if (!user && !esSoloAnonima && !esAccesoLibre) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
