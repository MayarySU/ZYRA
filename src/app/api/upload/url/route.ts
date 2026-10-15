import { NextResponse } from "next/server";
import { getPresignedUploadUrl } from "@/lib/r2";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
    const { proyectoId, fileName, contentType } = body;

    if (!proyectoId || !fileName) {
      return NextResponse.json({ error: "proyectoId y fileName son requeridos" }, { status: 400 });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `proyectos/${proyectoId}/${Date.now()}-${safeName}`;

    const { url } = await getPresignedUploadUrl(key, contentType);

    return NextResponse.json({ url, key }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
