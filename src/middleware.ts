import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Todas las rutas excepto: API, archivos estáticos de Next, imágenes,
     * favicon, manifest, la página offline y los workers de la PWA.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|offline.html|sw.js|swe-worker-.*\\.js|workbox-.*\\.js|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
