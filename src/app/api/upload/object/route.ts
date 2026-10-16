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
// El multipart añade algo de framing sobre el fichero; damos 1 MB de margen
// para poder rechazar por Content-Length antes de bufferizar el cuerpo entero.
const MAX_FORM_BYTES = MAX_BYTES + 1024 * 1024;
const MAX_NOMBRE = 120;
const MAX_DESCRIPCION = 2000;

function tipoDesdeMime(mime: string): "foto" | "documento" | "video" {
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "documento";
  return "foto";
}

/** Borra un objeto de R2 sin propagar errores (best-effort de rollback). */
async function borrarObjeto(key: string): Promise<void> {
  await r2Client
    .send(new DeleteObjectCommand({ Bucket: serverEnv.r2.bucketName, Key: key }))
    .catch(() => {});
}

export async function POST(req: Request) {
  let objectKey: string | null = null;
  try {
    // 1) Autenticación.
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 2) Tamaño máximo explícito ANTES de bufferizar el cuerpo.
    const contentLength = Number(req.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_FORM_BYTES) {
      return NextResponse.json({ error: "El archivo excede el tamaño máximo" }, { status: 413 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const pid = Number(form.get("proyectoId"));
    const descripcion = (form.get("descripcion") as string | null)?.slice(0, MAX_DESCRIPCION) || undefined;
    const avanceRaw = form.get("avanceId");
    const avanceId = avanceRaw ? Number(avanceRaw) : undefined;
    const operationId = (form.get("operationId") as string | null) || undefined;

    // Enlace opcional a un destino de viabilidad (revisión + padre concreto).
    const numOpt = (v: FormDataEntryValue | null): number | undefined => {
      if (v == null || String(v) === "") return undefined;
      const n = Number(v);
      return Number.isInteger(n) ? n : undefined;
    };
    const revisionId = numOpt(form.get("revisionId"));
    const preguntaId = numOpt(form.get("preguntaId"));
    const accionId = numOpt(form.get("accionId"));
    const validacionId = numOpt(form.get("validacionId"));

    if (!(file instanceof Blob) || !Number.isInteger(pid) || pid <= 0) {
      return NextResponse.json({ error: "file y proyectoId son requeridos" }, { status: 400 });
    }
    if (!file.type || !MIME_PERMITIDOS.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 415 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "El archivo excede el tamaño máximo" }, { status: 413 });
    }

    // 3) Autorización.
    //    - viabilidad (`revisionId`): se exige ser participante de ESA revisión
    //      (RLS de `viabilidad_revisiones`). No se otorga membresía general del
    //      proyecto; la revisión además debe ser del mismo `proyectoId`.
    //    - resto: pertenencia al proyecto (RLS admin/miembro del equipo).
    if (revisionId != null) {
      const { data: revision } = await supabase
        .from("viabilidad_revisiones")
        .select("id_revision_viabilidad, proyecto_id")
        .eq("id_revision_viabilidad", revisionId)
        .maybeSingle();
      if (!revision || revision.proyecto_id !== pid) {
        return NextResponse.json({ error: "Sin acceso a la revisión de viabilidad" }, { status: 403 });
      }
    } else {
      const { data: proyecto } = await supabase
        .from("proyectos")
        .select("id_proyecto")
        .eq("id_proyecto", pid)
        .maybeSingle();
      if (!proyecto) {
        return NextResponse.json({ error: "Sin acceso al proyecto" }, { status: 403 });
      }

      // El avance, si se indica, debe pertenecer al mismo proyecto.
      if (avanceId != null && (!Number.isInteger(avanceId) || avanceId <= 0)) {
        return NextResponse.json({ error: "avanceId inválido" }, { status: 400 });
      }
      if (avanceId != null) {
        const { data: avance } = await supabase
          .from("avances")
          .select("id_avance")
          .eq("id_avance", avanceId)
          .eq("proyecto_id", pid)
          .maybeSingle();
        if (!avance) {
          return NextResponse.json({ error: "El avance no pertenece al proyecto" }, { status: 400 });
        }
      }
    }

    // 4) Clave de objeto segura y única (uuid evita colisiones/sobrescritura).
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

    // 5) Registrar metadata (idempotente por operation_id). Para viabilidad la
    //    RPC además enlaza la evidencia al padre concreto de la revisión.
    let data: unknown = null;
    const registro =
      revisionId != null
        ? await supabase.rpc("registrar_evidencia_viabilidad", {
            p_revision_id: revisionId,
            p_object_key: objectKey,
            p_pregunta_id: preguntaId,
            p_accion_id: accionId,
            p_validacion_id: validacionId,
            p_descripcion: descripcion,
            p_tipo: tipoDesdeMime(file.type),
            p_content_type: file.type,
            p_size_bytes: file.size,
            p_operation_id: operationId ?? crypto.randomUUID(),
          })
        : await supabase.rpc("registrar_evidencia", {
            p_proyecto_id: pid,
            p_object_key: objectKey,
            p_descripcion: descripcion,
            p_tipo: tipoDesdeMime(file.type),
            p_content_type: file.type,
            p_size_bytes: file.size,
            p_avance_id: avanceId,
            p_operation_id: operationId ?? crypto.randomUUID(),
          });

    if (registro.error) {
      // Rollback del objeto si no se pudo registrar la metadata.
      await borrarObjeto(objectKey);
      return NextResponse.json({ error: registro.error.message }, { status: 500 });
    }
    data = registro.data;

    // 6) Reintento idempotente: si la evidencia ya existía, la RPC devuelve su
    // object_key original y el objeto recién subido queda huérfano → se borra
    // y se devuelve la clave canónica.
    const registeredKey = (data as { object_key?: string } | null)?.object_key;
    if (registeredKey && registeredKey !== objectKey) {
      await borrarObjeto(objectKey);
      objectKey = registeredKey;
    }

    const idEvidencia = (data as { id_evidencia?: string } | null)?.id_evidencia ?? null;
    return NextResponse.json({ key: objectKey, evidencia: data, idEvidencia }, { status: 201 });
  } catch (e) {
    if (objectKey) await borrarObjeto(objectKey);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
