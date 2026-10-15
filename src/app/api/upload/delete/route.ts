import { NextResponse } from "next/server";
import { deleteObject } from "@/lib/r2";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Eliminación segura de evidencias: solo admin. Marca la fila como eliminada
// (borrado lógico, preservando la auditoría) y borra el objeto de R2.
export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: esAdmin } = await supabase.rpc("es_admin");
    if (!esAdmin) {
      return NextResponse.json({ error: "Solo un administrador puede eliminar evidencias" }, { status: 403 });
    }

    const body = await req.json();
    const { evidenciaId } = body as { evidenciaId?: string };
    if (!evidenciaId) {
      return NextResponse.json({ error: "evidenciaId es requerido" }, { status: 400 });
    }

    const { data: evidencia, error: errLectura } = await supabase
      .from("evidencias")
      .select("id_evidencia, object_key")
      .eq("id_evidencia", evidenciaId)
      .maybeSingle();
    if (errLectura || !evidencia) {
      return NextResponse.json({ error: "Evidencia no encontrada" }, { status: 404 });
    }

    const { error: errUpdate } = await supabase
      .from("evidencias")
      .update({ eliminado: true })
      .eq("id_evidencia", evidenciaId);
    if (errUpdate) {
      return NextResponse.json({ error: errUpdate.message }, { status: 500 });
    }

    // El borrado del objeto en R2 es best-effort: si falla, la fila ya quedó
    // marcada como eliminada y no se volverá a servir (download lo rechaza).
    let r2Ok = true;
    try {
      await deleteObject(evidencia.object_key);
    } catch (e) {
      r2Ok = false;
      console.error("No se pudo borrar el objeto en R2:", (e as Error).message);
    }

    return NextResponse.json({ ok: true, r2: r2Ok }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
