import { db, unwrap, unwrapMaybe, type Tablas } from "@/lib/data/util";

// ─────────────────────────────────────────────────────────────────────
// Tipos base (filas crudas)
// ─────────────────────────────────────────────────────────────────────
export type ViabilidadConfigServicio = Tablas["viabilidad_config_servicio"]["Row"];
export type ViabilidadPlantilla = Tablas["viabilidad_plantillas"]["Row"];
export type ViabilidadSeccion = Tablas["viabilidad_secciones"]["Row"];
export type ViabilidadPregunta = Tablas["viabilidad_preguntas"]["Row"];
export type ViabilidadOpcion = Tablas["viabilidad_opciones"]["Row"];
export type ViabilidadCondicion = Tablas["viabilidad_condiciones"]["Row"];
export type ViabilidadRevision = Tablas["viabilidad_revisiones"]["Row"];
export type ViabilidadRespuesta = Tablas["viabilidad_respuestas"]["Row"];
export type ViabilidadAccion = Tablas["viabilidad_acciones"]["Row"];
export type ViabilidadValidacion = Tablas["viabilidad_validaciones"]["Row"];
export type ViabilidadEvidencia = Tablas["viabilidad_evidencias"]["Row"];
export type Evidencia = Tablas["evidencias"]["Row"];

export type TipoRespuestaViabilidad =
  | "booleano"
  | "opcion_unica"
  | "opcion_multiple"
  | "numero"
  | "texto"
  | "fecha"
  | "evidencia";

// ─────────────────────────────────────────────────────────────────────
// Tipos compuestos (vistas anidadas)
// ─────────────────────────────────────────────────────────────────────
export interface PreguntaViabilidadDetalle extends ViabilidadPregunta {
  viabilidad_opciones: ViabilidadOpcion[];
  condiciones: ViabilidadCondicion[];
}

export interface SeccionViabilidadDetalle extends ViabilidadSeccion {
  viabilidad_preguntas: PreguntaViabilidadDetalle[];
}

export interface PlantillaViabilidadDetalle extends ViabilidadPlantilla {
  viabilidad_secciones: SeccionViabilidadDetalle[];
}

export interface ConfigViabilidadVista extends ViabilidadConfigServicio {
  servicios: { tipo: string } | null;
}

export interface PlantillaViabilidadVista extends ViabilidadPlantilla {
  servicios: { tipo: string } | null;
}

export interface RevisionViabilidadResumen extends ViabilidadRevision {
  viabilidad_plantillas: { nombre: string; version: number } | null;
}

export interface EvidenciaRevisionVista extends ViabilidadEvidencia {
  evidencias: Evidencia | null;
}

export interface RevisionViabilidadDetalle extends ViabilidadRevision {
  proyectos: { nombre_proyecto: string } | null;
  viabilidad_plantillas: { nombre: string; version: number } | null;
  viabilidad_respuestas: ViabilidadRespuesta[];
  viabilidad_acciones: ViabilidadAccion[];
  viabilidad_validaciones: ViabilidadValidacion[];
  viabilidad_evidencias: EvidenciaRevisionVista[];
}

// ─────────────────────────────────────────────────────────────────────
// Configuración de aplicabilidad por servicio
// ─────────────────────────────────────────────────────────────────────
export async function listarConfigViabilidad(): Promise<ConfigViabilidadVista[]> {
  return unwrap(
    await db()
      .from("viabilidad_config_servicio")
      .select("*, servicios(tipo)")
      .order("servicio_id")
  ) as unknown as ConfigViabilidadVista[];
}

export async function guardarConfigViabilidad(
  servicioId: number,
  patch: Partial<
    Pick<
      Tablas["viabilidad_config_servicio"]["Insert"],
      "requiere_previabilidad" | "requiere_ingenieria" | "activo_desde"
    >
  >
): Promise<ViabilidadConfigServicio> {
  return unwrap(
    await db()
      .from("viabilidad_config_servicio")
      .upsert({ servicio_id: servicioId, ...patch }, { onConflict: "servicio_id" })
      .select()
      .single()
  ) as unknown as ViabilidadConfigServicio;
}

// ─────────────────────────────────────────────────────────────────────
// Plantillas
// ─────────────────────────────────────────────────────────────────────
export async function listarPlantillasViabilidad(): Promise<PlantillaViabilidadVista[]> {
  return unwrap(
    await db()
      .from("viabilidad_plantillas")
      .select("*, servicios(tipo)")
      .order("tipo_etapa")
      .order("version", { ascending: false })
  ) as unknown as PlantillaViabilidadVista[];
}

export async function obtenerPlantillaViabilidadDetalle(
  id: number
): Promise<PlantillaViabilidadDetalle> {
  const data = unwrap(
    await db()
      .from("viabilidad_plantillas")
      .select(
        `*,
         viabilidad_secciones (
           *,
           viabilidad_preguntas (
             *,
             viabilidad_opciones (*),
             condiciones:viabilidad_condiciones!viabilidad_condiciones_pregunta_id_fkey (*)
           )
         )`
      )
      .eq("id_plantilla_viabilidad", id)
      .single()
  ) as unknown as PlantillaViabilidadDetalle;

  data.viabilidad_secciones = (data.viabilidad_secciones ?? [])
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((s) => ({
      ...s,
      viabilidad_preguntas: (s.viabilidad_preguntas ?? [])
        .slice()
        .sort((a, b) => a.orden - b.orden)
        .map((p) => ({
          ...p,
          viabilidad_opciones: (p.viabilidad_opciones ?? [])
            .slice()
            .sort((a, b) => a.orden - b.orden),
          condiciones: p.condiciones ?? [],
        })),
    }));
  return data;
}

export async function actualizarPlantillaViabilidad(
  id: number,
  patch: Tablas["viabilidad_plantillas"]["Update"]
): Promise<ViabilidadPlantilla> {
  return unwrap(
    await db()
      .from("viabilidad_plantillas")
      .update(patch)
      .eq("id_plantilla_viabilidad", id)
      .select()
      .single()
  ) as unknown as ViabilidadPlantilla;
}

// ── Secciones ────────────────────────────────────────────────────────
export async function crearSeccionViabilidad(
  input: Tablas["viabilidad_secciones"]["Insert"]
): Promise<ViabilidadSeccion> {
  return unwrap(
    await db().from("viabilidad_secciones").insert(input).select().single()
  ) as unknown as ViabilidadSeccion;
}

export async function actualizarSeccionViabilidad(
  id: number,
  patch: Tablas["viabilidad_secciones"]["Update"]
): Promise<ViabilidadSeccion> {
  return unwrap(
    await db()
      .from("viabilidad_secciones")
      .update(patch)
      .eq("id_seccion_viabilidad", id)
      .select()
      .single()
  ) as unknown as ViabilidadSeccion;
}

export async function eliminarSeccionViabilidad(id: number): Promise<void> {
  const res = await db().from("viabilidad_secciones").delete().eq("id_seccion_viabilidad", id);
  if (res.error) throw new Error(res.error.message);
}

// ── Preguntas ────────────────────────────────────────────────────────
export async function crearPreguntaViabilidad(
  input: Tablas["viabilidad_preguntas"]["Insert"]
): Promise<ViabilidadPregunta> {
  return unwrap(
    await db().from("viabilidad_preguntas").insert(input).select().single()
  ) as unknown as ViabilidadPregunta;
}

export async function actualizarPreguntaViabilidad(
  id: number,
  patch: Tablas["viabilidad_preguntas"]["Update"]
): Promise<ViabilidadPregunta> {
  return unwrap(
    await db()
      .from("viabilidad_preguntas")
      .update(patch)
      .eq("id_pregunta_viabilidad", id)
      .select()
      .single()
  ) as unknown as ViabilidadPregunta;
}

export async function eliminarPreguntaViabilidad(id: number): Promise<void> {
  const res = await db().from("viabilidad_preguntas").delete().eq("id_pregunta_viabilidad", id);
  if (res.error) throw new Error(res.error.message);
}

// ── Opciones ─────────────────────────────────────────────────────────
export async function crearOpcionViabilidad(
  input: Tablas["viabilidad_opciones"]["Insert"]
): Promise<ViabilidadOpcion> {
  return unwrap(
    await db().from("viabilidad_opciones").insert(input).select().single()
  ) as unknown as ViabilidadOpcion;
}

export async function actualizarOpcionViabilidad(
  id: number,
  patch: Tablas["viabilidad_opciones"]["Update"]
): Promise<ViabilidadOpcion> {
  return unwrap(
    await db()
      .from("viabilidad_opciones")
      .update(patch)
      .eq("id_opcion_viabilidad", id)
      .select()
      .single()
  ) as unknown as ViabilidadOpcion;
}

export async function eliminarOpcionViabilidad(id: number): Promise<void> {
  const res = await db().from("viabilidad_opciones").delete().eq("id_opcion_viabilidad", id);
  if (res.error) throw new Error(res.error.message);
}

// ── Condiciones ──────────────────────────────────────────────────────
export async function crearCondicionViabilidad(
  input: Tablas["viabilidad_condiciones"]["Insert"]
): Promise<ViabilidadCondicion> {
  return unwrap(
    await db().from("viabilidad_condiciones").insert(input).select().single()
  ) as unknown as ViabilidadCondicion;
}

export async function eliminarCondicionViabilidad(id: number): Promise<void> {
  const res = await db().from("viabilidad_condiciones").delete().eq("id_condicion_viabilidad", id);
  if (res.error) throw new Error(res.error.message);
}

// ─────────────────────────────────────────────────────────────────────
// Revisiones
// ─────────────────────────────────────────────────────────────────────
export async function listarRevisionesViabilidad(
  proyectoId: number
): Promise<RevisionViabilidadResumen[]> {
  return unwrap(
    await db()
      .from("viabilidad_revisiones")
      .select("*, viabilidad_plantillas(nombre, version)")
      .eq("proyecto_id", proyectoId)
      .order("tipo_etapa")
      .order("numero_revision", { ascending: false })
  ) as unknown as RevisionViabilidadResumen[];
}

export async function obtenerRevisionViabilidadDetalle(
  id: number
): Promise<RevisionViabilidadDetalle> {
  const data = unwrap(
    await db()
      .from("viabilidad_revisiones")
      .select(
        `*,
         proyectos(nombre_proyecto),
         viabilidad_plantillas(nombre, version),
         viabilidad_respuestas (*),
         viabilidad_acciones (*),
         viabilidad_validaciones (*),
         viabilidad_evidencias (*, evidencias (*))`
      )
      .eq("id_revision_viabilidad", id)
      .single()
  ) as unknown as RevisionViabilidadDetalle;

  data.viabilidad_respuestas = data.viabilidad_respuestas ?? [];
  data.viabilidad_acciones = data.viabilidad_acciones ?? [];
  data.viabilidad_validaciones = data.viabilidad_validaciones ?? [];
  data.viabilidad_evidencias = data.viabilidad_evidencias ?? [];
  return data;
}

/** Revisión abierta (borrador/en_progreso/evaluada) de una etapa, si existe. */
export async function obtenerRevisionAbierta(
  proyectoId: number,
  tipoEtapa: "previabilidad" | "ingenieria"
): Promise<ViabilidadRevision | null> {
  return unwrapMaybe(
    await db()
      .from("viabilidad_revisiones")
      .select("*")
      .eq("proyecto_id", proyectoId)
      .eq("tipo_etapa", tipoEtapa)
      .in("estado", ["borrador", "en_progreso", "evaluada"])
      .maybeSingle()
  ) as ViabilidadRevision | null;
}

// ─────────────────────────────────────────────────────────────────────
// Evidencias de viabilidad (puente)
// ─────────────────────────────────────────────────────────────────────
export async function vincularEvidenciaViabilidad(
  input: Tablas["viabilidad_evidencias"]["Insert"]
): Promise<ViabilidadEvidencia> {
  return unwrap(
    await db().from("viabilidad_evidencias").insert(input).select().single()
  ) as unknown as ViabilidadEvidencia;
}

export async function desvincularEvidenciaViabilidad(id: number): Promise<void> {
  const res = await db().from("viabilidad_evidencias").delete().eq("id_viabilidad_evidencia", id);
  if (res.error) throw new Error(res.error.message);
}

// ─────────────────────────────────────────────────────────────────────
// Hub: revisiones y validaciones asignadas al usuario
// ─────────────────────────────────────────────────────────────────────
export interface RevisionViabilidadHub extends ViabilidadRevision {
  proyectos: { nombre_proyecto: string } | null;
  viabilidad_plantillas: { nombre: string; version: number } | null;
}

export interface ValidacionViabilidadHub extends ViabilidadValidacion {
  viabilidad_revisiones:
    | (ViabilidadRevision & {
        proyectos: { nombre_proyecto: string } | null;
        viabilidad_plantillas: { nombre: string; version: number } | null;
      })
    | null;
}

/** Revisiones en las que el empleado figura como inspector asignado. */
export async function listarRevisionesAsignadas(
  empleadoId: number
): Promise<RevisionViabilidadHub[]> {
  return unwrap(
    await db()
      .from("viabilidad_revisiones")
      .select("*, proyectos(nombre_proyecto), viabilidad_plantillas(nombre, version)")
      .eq("asignado_empleado_id", empleadoId)
      .order("actualizado_en", { ascending: false })
  ) as unknown as RevisionViabilidadHub[];
}

/** Validaciones de especialista asignadas al empleado. */
export async function listarValidacionesAsignadas(
  empleadoId: number
): Promise<ValidacionViabilidadHub[]> {
  return unwrap(
    await db()
      .from("viabilidad_validaciones")
      .select(
        "*, viabilidad_revisiones(*, proyectos(nombre_proyecto), viabilidad_plantillas(nombre, version))"
      )
      .eq("especialista_empleado_id", empleadoId)
      .order("creado_en", { ascending: false })
  ) as unknown as ValidacionViabilidadHub[];
}

/** Revisiones cerradas (finalizada/anulada) visibles por el usuario (RLS). */
export async function listarHistorialRevisiones(): Promise<RevisionViabilidadHub[]> {
  return unwrap(
    await db()
      .from("viabilidad_revisiones")
      .select("*, proyectos(nombre_proyecto), viabilidad_plantillas(nombre, version)")
      .in("estado", ["finalizada", "anulada"])
      .order("actualizado_en", { ascending: false })
      .limit(200)
  ) as unknown as RevisionViabilidadHub[];
}

/** Todas las revisiones no anuladas (vista de administrador). */
export async function listarRevisionesTodas(): Promise<RevisionViabilidadHub[]> {
  return unwrap(
    await db()
      .from("viabilidad_revisiones")
      .select("*, proyectos(nombre_proyecto), viabilidad_plantillas(nombre, version)")
      .neq("estado", "anulada")
      .order("actualizado_en", { ascending: false })
      .limit(200)
  ) as unknown as RevisionViabilidadHub[];
}

/** Todas las validaciones (vista de administrador, para asignar especialistas). */
export async function listarValidacionesTodas(): Promise<ValidacionViabilidadHub[]> {
  return unwrap(
    await db()
      .from("viabilidad_validaciones")
      .select(
        "*, viabilidad_revisiones(*, proyectos(nombre_proyecto), viabilidad_plantillas(nombre, version))"
      )
      .order("creado_en", { ascending: false })
      .limit(200)
  ) as unknown as ValidacionViabilidadHub[];
}

// ─────────────────────────────────────────────────────────────────────
// Asignaciones (solo admin, vía RLS `*_admin for all`). Se hacen durante la
// fase de resolución (estado `evaluada`), lo que exige el trigger de guarda.
// ─────────────────────────────────────────────────────────────────────
/** Asigna el especialista que puede resolver una validación. */
export async function asignarEspecialistaViabilidad(
  validacionId: number,
  empleadoId: number
): Promise<void> {
  const res = await db()
    .from("viabilidad_validaciones")
    .update({ especialista_empleado_id: empleadoId })
    .eq("id_validacion_viabilidad", validacionId);
  if (res.error) throw new Error(res.error.message);
}

/** Asigna el responsable de una acción correctiva. */
export async function asignarResponsableAccionViabilidad(
  accionId: number,
  empleadoId: number
): Promise<void> {
  const res = await db()
    .from("viabilidad_acciones")
    .update({ responsable_empleado_id: empleadoId })
    .eq("id_accion_viabilidad", accionId);
  if (res.error) throw new Error(res.error.message);
}

// ─────────────────────────────────────────────────────────────────────
// Motor de visibilidad/obligatoriedad (espejo cliente de §6 de 0007)
// ─────────────────────────────────────────────────────────────────────
/**
 * Espejo en TypeScript de `_viabilidad_condicion_cumple`. Se usa SOLO para
 * la visibilidad/obligatoriedad en la UI; el servidor sigue siendo la
 * autoridad (valida obligatorias al entregar).
 */
export function condicionCumple(valor: unknown, operador: string, texto: string): boolean {
  const vacio = valor === null || valor === undefined || valor === "";
  if (operador === "is_null") return vacio;
  if (operador === "is_not_null") return !vacio;
  if (vacio) return false;
  const esArray = Array.isArray(valor);
  const txt = esArray ? JSON.stringify(valor) : String(valor);

  if (operador === ">" || operador === ">=" || operador === "<" || operador === "<=") {
    const a = Number(valor);
    const b = Number(texto);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    if (operador === ">") return a > b;
    if (operador === ">=") return a >= b;
    if (operador === "<") return a < b;
    return a <= b;
  }

  const coincideElemento = esArray
    ? (valor as unknown[]).some((v) => String(v) === texto)
    : txt === texto;

  switch (operador) {
    case "=":
      return coincideElemento;
    case "!=":
      return !coincideElemento;
    case "contiene":
      return (
        txt.toLowerCase().includes(texto.toLowerCase()) ||
        (esArray && (valor as unknown[]).some((v) => String(v).includes(texto)))
      );
    case "in":
      return texto.split(",").includes(txt);
    case "not_in":
      return !texto.split(",").includes(txt);
    default:
      return false;
  }
}

/** Espejo de `_viabilidad_pregunta_visible`. */
export function preguntaVisible(
  pregunta: PreguntaViabilidadDetalle,
  valorOrigen: (preguntaOrigenId: number) => unknown
): boolean {
  const condiciones = pregunta.condiciones ?? [];
  const tieneMostrar = condiciones.some((c) => c.accion === "mostrar");
  let mostrarOk = true;
  let oculto = false;
  for (const c of condiciones) {
    const cumple = condicionCumple(valorOrigen(c.pregunta_origen_id), c.operador, c.valor ?? "");
    if (c.accion === "ocultar") {
      if (cumple) oculto = true;
    } else if (c.accion === "mostrar") {
      if (!cumple) mostrarOk = false;
    }
  }
  if (oculto) return false;
  if (tieneMostrar) return mostrarOk;
  return true;
}

/** Espejo de `_viabilidad_pregunta_requerida`. */
export function preguntaRequerida(
  pregunta: PreguntaViabilidadDetalle,
  obligatoriaBase: boolean,
  valorOrigen: (preguntaOrigenId: number) => unknown
): boolean {
  if (obligatoriaBase) return true;
  return (pregunta.condiciones ?? []).some(
    (c) =>
      c.accion === "requerir" &&
      condicionCumple(valorOrigen(c.pregunta_origen_id), c.operador, c.valor ?? "")
  );
}

/** Espejo de `_viabilidad_respuesta_activa` (valor no vacío según el tipo). */
export function respuestaActiva(valor: unknown, tipo: TipoRespuestaViabilidad): boolean {
  if (valor === null || valor === undefined) return false;
  switch (tipo) {
    case "booleano":
      return valor === true;
    case "opcion_multiple":
      return Array.isArray(valor) && valor.length > 0;
    case "opcion_unica":
    case "texto":
      return typeof valor === "string" && valor !== "";
    case "numero":
    case "fecha":
      return (typeof valor === "number" || typeof valor === "string") && String(valor) !== "";
    default:
      return true;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Espejo del evaluador de expresiones (`_viabilidad_expr_cumple`) para la
// condición de evidencia obligatoria. Nodos: hoja {pregunta,operador,valor?};
// compuesto {and:[..]}|{or:[..]}|{not:{..}}.
// ─────────────────────────────────────────────────────────────────────
export type ExprCondicion =
  | { pregunta: string; operador: string; valor?: string }
  | { and: ExprCondicion[] }
  | { or: ExprCondicion[] }
  | { not: ExprCondicion };

export function exprCumple(
  expr: ExprCondicion | null | undefined,
  valorPorCodigo: (codigo: string) => unknown
): boolean {
  if (!expr) return true;
  if ("and" in expr && Array.isArray(expr.and)) {
    return expr.and.every((e) => exprCumple(e, valorPorCodigo));
  }
  if ("or" in expr && Array.isArray(expr.or)) {
    return expr.or.some((e) => exprCumple(e, valorPorCodigo));
  }
  if ("not" in expr) {
    return !exprCumple(expr.not, valorPorCodigo);
  }
  const hoja = expr as { pregunta: string; operador: string; valor?: string };
  return condicionCumple(valorPorCodigo(hoja.pregunta), hoja.operador, hoja.valor ?? "");
}

/** Espejo de `_viabilidad_evidencia_obligatoria`: ¿requiere evidencia esta pregunta? */
export function evidenciaRequerida(
  pregunta: PreguntaViabilidadDetalle,
  valorPorCodigo: (codigo: string) => unknown
): boolean {
  if (!pregunta.evidencia_tipo) return false;
  const cond = pregunta.evidencia_obligatoria_condicion as ExprCondicion | null;
  if (cond) return exprCumple(cond, valorPorCodigo);
  return pregunta.evidencia_obligatoria === true;
}
