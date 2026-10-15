import { NextResponse } from "next/server";
import { getPresignedUploadUrl } from "@/lib/r2";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Tipos MIME permitidos para evidencias (imágenes, PDF y video).
const MIME_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
  "video/mp4",
];

const MAX_NOMBRE = 120;

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { proyectoId, fileName, contentType } = body as {
      proyectoId?: number | string;
      fileName?: string;
      contentType?: string;
    };

    const pid = Number(proyectoId);
    if (!pid || !fileName) {
      return NextResponse.json({ error: "proyectoId y fileName son requeridos" }, { status: 400 });
    }

    // Acceso por proyecto: RLS (proyectos_select = admin o miembro) actúa aquí.
    const { data: proyecto } = await supabase
      .from("proyectos")
      .select("id_proyecto")
      .eq("id_proyecto", pid)
      .maybeSingle();
    if (!proyecto) {
      return NextResponse.json({ error: "Sin acceso al proyecto" }, { status: 403 });
    }

    if (!contentType || !MIME_PERMITIDOS.includes(contentType)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 415 });
    }

    const safeName = fileName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-MAX_NOMBRE);
    // Nombre único (evita colisiones y cualquier intento de path traversal).
    const key = `proyectos/${pid}/${crypto.randomUUID()}-${safeName}`;

    const { url } = await getPresignedUploadUrl(key, contentType);

    return NextResponse.json({ url, key }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
