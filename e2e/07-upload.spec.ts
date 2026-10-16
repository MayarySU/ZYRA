import { test, expect } from "./support/test";
import {
  getEmpresaId,
  getServicioId,
  createProyecto,
  deleteR2Objects,
} from "./support/factory";
import { proyectoEnProceso } from "./support/projects";
import { fotoPngBytes } from "./support/image";

// Auditoría de /api/upload/object: autenticación, autorización por proyecto,
// MIME permitido, tamaño máximo, claves seguras, registro en DB y cleanup.

test.describe("Subida de evidencias (/api/upload/object)", () => {
  test("sube una foto representativa, confirma la fila y la limpia", async ({
    page,
    service,
    admin,
    state,
    loginAsTech,
  }) => {
    const prefix = state.prefix;
    const proyecto = await proyectoEnProceso(
      service,
      admin,
      state.techEmpleadoId,
      prefix,
      "Upload Evidencia"
    );

    // Foto de tamaño representativo real (PNG RGB aleatorio ≈ 5 MB).
    const foto = fotoPngBytes();
    expect(foto.length).toBeGreaterThan(1_000_000);

    await loginAsTech(page);
    const res = await page.request.post("/api/upload/object", {
      multipart: {
        file: { name: "foto-representativa.png", mimeType: "image/png", buffer: foto },
        proyectoId: String(proyecto.id),
        descripcion: `${prefix} foto representativa`,
      },
    });
    expect(res.status()).toBe(201);

    const { key, evidencia } = (await res.json()) as {
      key: string;
      evidencia: { id_evidencia: string };
    };
    // Clave de objeto segura: contiene el proyecto y un uuid (sin sobrescritura).
    expect(key).toMatch(/^proyectos\/\d+\/[0-9a-f-]{36}-foto-representativa\.png$/);

    // La fila existe con los metadatos correctos.
    const { data: fila } = await service
      .from("evidencias")
      .select("id_evidencia, object_key, size_bytes, content_type, tipo, eliminado")
      .eq("id_evidencia", evidencia.id_evidencia)
      .single();
    expect(fila?.object_key).toBe(key);
    expect(Number(fila?.size_bytes)).toBe(foto.length);
    expect(fila?.content_type).toBe("image/png");
    expect(fila?.tipo).toBe("foto");
    expect(fila?.eliminado).toBe(false);

    // Round-trip: el objeto está realmente en R2 y pesa lo mismo.
    const dl = await page.request.post("/api/upload/download", { data: { key } });
    expect(dl.status()).toBe(200);
    const { url } = (await dl.json()) as { url: string };
    const obj = await page.request.get(url);
    expect(obj.status()).toBe(200);
    expect((await obj.body()).length).toBe(foto.length);

    // Cleanup explícito: fila + objeto.
    await service.from("evidencias").delete().eq("id_evidencia", evidencia.id_evidencia);
    const borrados = await deleteR2Objects([key]);
    expect(borrados).toBe(1);

    const { data: tras } = await service
      .from("evidencias")
      .select("id_evidencia")
      .eq("id_evidencia", evidencia.id_evidencia)
      .maybeSingle();
    expect(tras).toBeNull();
  });

  test("valida sesión, MIME, tamaño máximo y acceso al proyecto", async ({
    page,
    request,
    service,
    admin,
    state,
    loginAsTech,
  }) => {
    const prefix = state.prefix;

    // 1) Sin sesión → 401.
    const sinSesion = await request.post("/api/upload/object", {
      multipart: {
        file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
        proyectoId: "1",
      },
    });
    expect(sinSesion.status()).toBe(401);

    await loginAsTech(page);

    // 2) MIME no permitido → 415.
    const malaMime = await page.request.post("/api/upload/object", {
      multipart: {
        file: { name: "notas.txt", mimeType: "text/plain", buffer: Buffer.from("hola") },
        proyectoId: "1",
      },
    });
    expect(malaMime.status()).toBe(415);

    // 3) Tamaño máximo (27 MB > 25 MB) → 413.
    const gigante = await page.request.post("/api/upload/object", {
      multipart: {
        file: { name: "enorme.png", mimeType: "image/png", buffer: Buffer.alloc(27 * 1024 * 1024) },
        proyectoId: "1",
      },
    });
    expect(gigante.status()).toBe(413);

    // 4) Proyecto al que no se tiene acceso (sin equipo asignado) → 403.
    const proyectoAjen = await createProyecto(admin, {
      empresaId: await getEmpresaId(service),
      clienteId: null,
      servicioId: await getServicioId(service, "Mantenimiento"),
      equipoId: null,
      nombre: `${prefix} Ajeno`,
    });
    const sinAcceso = await page.request.post("/api/upload/object", {
      multipart: {
        file: { name: "x.png", mimeType: "image/png", buffer: fotoPngBytes(32, 32) },
        proyectoId: String(proyectoAjen.id),
      },
    });
    expect(sinAcceso.status()).toBe(403);
  });

  test("reintento idempotente devuelve la misma clave y no duplica filas", async ({
    page,
    service,
    admin,
    state,
    loginAsTech,
  }) => {
    const prefix = state.prefix;
    const proyecto = await proyectoEnProceso(
      service,
      admin,
      state.techEmpleadoId,
      prefix,
      "Upload Idempotencia"
    );

    await loginAsTech(page);
    const operationId = crypto.randomUUID();
    const subir = () =>
      page.request.post("/api/upload/object", {
        multipart: {
          file: { name: "evidencia.png", mimeType: "image/png", buffer: fotoPngBytes(64, 64) },
          proyectoId: String(proyecto.id),
          operationId,
        },
      });

    const primera = await subir();
    expect(primera.status()).toBe(201);
    const { key: key1, evidencia: ev1 } = (await primera.json()) as {
      key: string;
      evidencia: { id_evidencia: string };
    };

    // Reintento con el MISMO operationId: no crea filas nuevas y devuelve la
    // clave canónica (el objeto redundante subido se elimina en el servidor).
    const segunda = await subir();
    expect(segunda.status()).toBe(201);
    const { key: key2, evidencia: ev2 } = (await segunda.json()) as {
      key: string;
      evidencia: { id_evidencia: string };
    };
    expect(key2).toBe(key1);
    expect(ev2.id_evidencia).toBe(ev1.id_evidencia);

    const { count } = await service
      .from("evidencias")
      .select("id_evidencia", { count: "exact", head: true })
      .eq("proyecto_id", proyecto.id);
    expect(count).toBe(1);

    // La clave canónica sigue siendo accesible.
    const dl = await page.request.post("/api/upload/download", { data: { key: key1 } });
    expect(dl.status()).toBe(200);

    await service.from("evidencias").delete().eq("id_evidencia", ev1.id_evidencia);
    expect(await deleteR2Objects([key1])).toBe(1);
  });
});
