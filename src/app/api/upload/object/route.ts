import { NextResponse } from "next/server";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "@/lib/r2";
import { serverEnv } from "@/lib/env.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Subida de evidencias vía servidor (same-origin → sin CORS del navegador).
// El objeto se escribe en R2 con el cliente S3 y luego se registra la
// metadata con la RPC `registrar_evidencia` (idempotente por operation_id).

const MIME_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
  "video/mp4",
];

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_NOMBRE = 120;

function tipoDesdeMime(mime: string): "foto" | "documento" | "video" {
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "documento";
  return "foto";
}

export async function POST(req: Request) {
  let objectKey: string | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const pid = Number(form.get("proyectoId"));
    const descripcion = (form.get("descripcion") as string | null) || undefined;
    const avanceRaw = form.get("avanceId");
    const avanceId = avanceRaw ? Number(avanceRaw) : undefined;
    const operationId = (form.get("operationId") as string | null) || undefined;

    if (!(file instanceof Blob) || !pid) {
      return NextResponse.json({ error: "file y proyectoId son requeridos" }, { status: 400 });
    }
    if (!file.type || !MIME_PERMITIDOS.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 415 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "El archivo excede el tamaño máximo" }, { status: 413 });
    }

    // Acceso por proyecto: RLS (admin o miembro del equipo) actúa aquí.
    const { data: proyecto } = await supabase
      .from("proyectos")
      .select("id_proyecto")
      .eq("id_proyecto", pid)
      .maybeSingle();
    if (!proyecto) {
      return NextResponse.json({ error: "Sin acceso al proyecto" }, { status: 403 });
    }

    const safeName = (file instanceof File ? file.name : "evidencia")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-MAX_NOMBRE);
    objectKey = `proyectos/${pid}/${crypto.randomUUID()}-${safeName}`;

    await r2Client.send(
      new PutObjectCommand({
        Bucket: serverEnv.r2.bucketName,
        Key: objectKey,
        ContentType: file.type,
        Body: Buffer.from(await file.arrayBuffer()),
      })
    );

    const { data, error } = await supabase.rpc("registrar_evidencia", {
      p_proyecto_id: pid,
      p_object_key: objectKey,
      p_descripcion: descripcion,
      p_tipo: tipoDesdeMime(file.type),
      p_content_type: file.type,
      p_size_bytes: file.size,
      p_avance_id: avanceId,
      p_operation_id: operationId ?? crypto.randomUUID(),
    });

    if (error) {
      // Rollback del objeto si no se pudo registrar la metadata.
      await r2Client
        .send(new DeleteObjectCommand({ Bucket: serverEnv.r2.bucketName, Key: objectKey }))
        .catch(() => {});
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ key: objectKey, evidencia: data }, { status: 201 });
  } catch (e) {
    if (objectKey) {
      await r2Client
        .send(new DeleteObjectCommand({ Bucket: serverEnv.r2.bucketName, Key: objectKey }))
        .catch(() => {});
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
