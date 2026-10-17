import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addEquipoMember,
  createCliente,
  createEquipo,
  createProyecto,
  getEmpresaId,
  getServicioId,
  op,
  type ProyectoFixture,
} from "./factory";

export type Etapa = "previabilidad" | "ingenieria";

export const ESPECIALISTA_PASSWORD = "E2eEspecialista2026!";

/** Correo del especialista auxiliar; usa el prefijo para que el teardown lo borre. */
export function especialistaEmail(prefix: string): string {
  return `${prefix}.especialista@zyra.test`;
}

// ─────────────────────────────────────────────────────────────────────
// Proyecto de viabilidad
// ─────────────────────────────────────────────────────────────────────
export interface ProyectoViabilidad {
  proyecto: ProyectoFixture;
  empresaId: number;
  servicioId: number;
}

export async function crearProyectoViabilidad(
  service: SupabaseClient,
  prefix: string,
  sufijo: string,
  techEmpleadoId: number,
  servicio = "Instalación Residencial"
): Promise<ProyectoViabilidad> {
  const empresaId = await getEmpresaId(service);
  const servicioId = await getServicioId(service, servicio);
  const clienteId = await createCliente(service, empresaId, `${prefix} Cliente ${sufijo}`);
  const equipoId = await createEquipo(service, empresaId, `${prefix} Equipo ${sufijo}`);
  await addEquipoMember(service, equipoId, techEmpleadoId, true);
  const proyecto = await createProyecto(service, {
    empresaId,
    clienteId,
    servicioId,
    equipoId,
    nombre: `${prefix} ${sufijo}`,
  });
  return { proyecto, empresaId, servicioId };
}

// ─────────────────────────────────────────────────────────────────────
// RPC de viabilidad
// ─────────────────────────────────────────────────────────────────────
export async function setAplicabilidad(
  admin: SupabaseClient,
  proyectoId: number,
  prev: boolean,
  ing = false
) {
  const { data, error } = await admin.rpc("establecer_aplicabilidad_viabilidad", {
    p_proyecto_id: proyectoId,
    p_requiere_previabilidad: prev,
    p_requiere_ingenieria: ing,
    p_operation_id: op(),
  });
  if (error) throw new Error(`establecer_aplicabilidad_viabilidad: ${error.message}`);
  return data as { requiere_previabilidad: boolean; requiere_ingenieria: boolean };
}

export interface RevisionCreada {
  id: number;
  numero: number;
  estado: string;
}

export async function crearRevision(
  admin: SupabaseClient,
  proyectoId: number,
  etapa: Etapa,
  asignadoEmpleadoId: number | null = null
): Promise<RevisionCreada> {
  const { data, error } = await admin.rpc("crear_revision_viabilidad", {
    p_proyecto_id: proyectoId,
    p_tipo_etapa: etapa,
    p_asignado_empleado_id: asignadoEmpleadoId,
    p_operation_id: op(),
  });
  if (error) throw new Error(`crear_revision_viabilidad: ${error.message}`);
  const d = data as {
    id_revision_viabilidad: number;
    numero_revision: number;
    estado: string;
  };
  return { id: d.id_revision_viabilidad, numero: d.numero_revision, estado: d.estado };
}

export async function entregar(
  admin: SupabaseClient,
  revisionId: number
): Promise<{ estado: string; resultado_evaluacion: string }> {
  const { data, error } = await admin.rpc("entregar_revision_viabilidad", {
    p_revision_id: revisionId,
    p_operation_id: op(),
  });
  if (error) throw new Error(`entregar_revision_viabilidad: ${error.message}`);
  return data as { estado: string; resultado_evaluacion: string };
}

/** Ejecuta una RPC y devuelve el mensaje de error (o null si tuvo éxito). */
export async function rpcError(
  admin: SupabaseClient,
  fn: string,
  args: Record<string, unknown>
): Promise<string | null> {
  const { error } = await admin.rpc(fn, args);
  return error?.message ?? null;
}

// ─────────────────────────────────────────────────────────────────────
// Plantilla y respuestas
// ─────────────────────────────────────────────────────────────────────
export async function plantillaActiva(
  admin: SupabaseClient,
  empresaId: number,
  servicioId: number | null,
  etapa: Etapa
): Promise<number> {
  const { data, error } = await admin
    .from("viabilidad_plantillas")
    .select("id_plantilla_viabilidad, servicio_id, version")
    .eq("empresa_id", empresaId)
    .eq("tipo_etapa", etapa)
    .eq("estado", "activa");
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const especifica = rows.find((r) => (r.servicio_id ?? null) === servicioId);
  const global = rows.find((r) => (r.servicio_id ?? null) === null);
  const elegida = especifica ?? global;
  if (!elegida) {
    throw new Error(
      `No hay plantilla activa de ${etapa} para el servicio ${servicioId} ni global`
    );
  }
  return elegida.id_plantilla_viabilidad as number;
}

export interface PreguntaFixture {
  id: number;
  codigo: string;
  tipo: string;
  obligatoria: boolean;
  evidenciaTipo: string | null;
}

export async function preguntasDePlantilla(
  admin: SupabaseClient,
  plantillaId: number
): Promise<PreguntaFixture[]> {
  const { data: secciones, error: e1 } = await admin
    .from("viabilidad_secciones")
    .select("id_seccion_viabilidad")
    .eq("plantilla_id", plantillaId);
  if (e1) throw new Error(e1.message);
  const ids = (secciones ?? []).map((s) => s.id_seccion_viabilidad as number);
  if (ids.length === 0) return [];
  const { data, error } = await admin
    .from("viabilidad_preguntas")
    .select("id_pregunta_viabilidad, codigo, tipo_respuesta, obligatoria, activa, evidencia_tipo")
    .in("seccion_id", ids);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter((p) => p.activa !== false)
    .map((p) => ({
      id: p.id_pregunta_viabilidad as number,
      codigo: p.codigo as string,
      tipo: p.tipo_respuesta as string,
      obligatoria: p.obligatoria as boolean,
      evidenciaTipo: (p.evidencia_tipo as string | null) ?? null,
    }));
}

export async function preguntaPorCodigo(
  admin: SupabaseClient,
  plantillaId: number,
  codigo: string
): Promise<PreguntaFixture> {
  const p = (await preguntasDePlantilla(admin, plantillaId)).find((x) => x.codigo === codigo);
  if (!p) throw new Error(`No existe la pregunta "${codigo}" en la plantilla ${plantillaId}`);
  return p;
}

export async function revisionPlantilla(
  admin: SupabaseClient,
  revisionId: number
): Promise<number> {
  const { data, error } = await admin
    .from("viabilidad_revisiones")
    .select("plantilla_id")
    .eq("id_revision_viabilidad", revisionId)
    .single();
  if (error || !data) throw new Error(`Revisión ${revisionId}: ${error?.message ?? "vacía"}`);
  return data.plantilla_id as number;
}

export async function responder(
  admin: SupabaseClient,
  revisionId: number,
  preguntaId: number,
  valor: unknown,
  version: number | null = null
): Promise<void> {
  const { error } = await admin.rpc("guardar_respuesta_viabilidad", {
    p_revision_id: revisionId,
    p_pregunta_id: preguntaId,
    p_valor: valor,
    p_version: version,
    p_operation_id: op(),
  });
  if (error) throw new Error(`guardar_respuesta_viabilidad: ${error.message}`);
}

/**
 * Respuestas por defecto (resultado "apto") para el cuestionario definitivo.
 * Es un superconjunto de códigos de Previabilidad e Ingeniería; `responderTodo`
 * solo aplica los que existen en la plantilla de la revisión.
 */
export const RESPUESTAS_BASE: Record<string, unknown> = {
  // ── Previabilidad ──
  acceso_vehiculo: "pavimentado",
  espacio_descarga: true,
  suelo_descarga: "firme",
  metodo_elevacion: "elevador",
  riesgos_entorno: ["perros"],
  perros_cliente_asegura: true,
  material_techo: "losa_concreto",
  losa_impermeabilizacion: true,
  losa_anclaje_sin_romper: true,
  losa_espesor: 15,
  goteras: false,
  material_oxidado: false,
  pendiente_techo: "plano",
  orientacion_techo: "sur",
  sombras: false,
  area_util: 100,
  area_util_suficiente: true,
  requiere_dictamen_estructural: false,
  espacio_breaker: true,
  capacidad_servicio: "220v_trifasico",
  capacidad_contratada_suficiente: true,
  cableado_buen_estado: true,
  varilla_tierra: true,
  varilla_conectada: true,
  varilla_medicion_posible: true,
  ruta_canalizacion: "canaleta_existente",
  ruta_interfiere_estructura: false,
  cliente_propietario: true,
  cfe_al_corriente: true,
  recibo_a_nombre_solicitante: true,
  recibo_menor_3_meses: true,
  tarifa_cfe: "domestica",
  es_tarifa_dac: false,
  restricciones_municipales: false,
  ampliacion_futura: false,
  potencia_kw: 100,
  transformador_capacidad: "si",
  croquis_ubicacion: true,
  identificacion_solicitante: true,
  recibo_cfe_documento: true,
  // ── Ingeniería ──
  transformador_capacidad_confirmada: "si",
  inversor_certificado_ul: true,
  inversor_certificado_vigente: true,
  inversor_modelo: "INV-1000",
  inversor_eficiencia: 97,
  modulos_certificado_nmx: true,
  cableado_certificado_600v: true,
  cableado_especifico_fv: true,
  proteccion_arco: true,
  proteccion_arco_certificada: true,
  tension_cc_sistema: 48,
  resistencia_tierra: 10,
  mejora_tierra_posible: true,
  memoria_calculo: true,
  diagrama_unifilar: true,
  fichas_tecnicas: true,
  certificado_inversor_documento: true,
  certificado_modulos_documento: true,
};

/**
 * Responde el cuestionario completo con el baseline "apto" (+ overrides) y, por
 * defecto, adjunta una evidencia a cada pregunta respondida que la requiera
 * (`evidencia_tipo` no nulo). Pasa `{ evidencias: false }` para omitirlas.
 */
export async function responderTodo(
  admin: SupabaseClient,
  revisionId: number,
  overrides: Record<string, unknown> = {},
  opts: { evidencias?: boolean } = {}
): Promise<void> {
  const adjuntar = opts.evidencias !== false;
  const plantillaId = await revisionPlantilla(admin, revisionId);
  const preguntas = await preguntasDePlantilla(admin, plantillaId);
  const vals: Record<string, unknown> = { ...RESPUESTAS_BASE, ...overrides };
  const respondidas: PreguntaFixture[] = [];
  for (const p of preguntas) {
    if (p.tipo === "evidencia" && !(p.codigo in overrides)) continue;
    if (!(p.codigo in vals)) continue;
    await responder(admin, revisionId, p.id, vals[p.codigo]);
    respondidas.push(p);
  }
  if (adjuntar) {
    for (const p of respondidas) {
      if (!p.evidenciaTipo) continue;
      await adjuntarEvidencia(admin, revisionId, { preguntaId: p.id });
    }
  }
}

/** Adjunta una evidencia (con object_key ficticia) a una respuesta/pregunta. */
export async function adjuntarEvidencia(
  admin: SupabaseClient,
  revisionId: number,
  opts: { preguntaId?: number; accionId?: number; validacionId?: number },
  objectKey = `e2e/viabilidad/${crypto.randomUUID()}.png`
): Promise<{ id_evidencia: string; object_key: string }> {
  const { data, error } = await admin.rpc("registrar_evidencia_viabilidad", {
    p_revision_id: revisionId,
    p_object_key: objectKey,
    p_pregunta_id: opts.preguntaId ?? null,
    p_accion_id: opts.accionId ?? null,
    p_validacion_id: opts.validacionId ?? null,
    p_descripcion: "Evidencia E2E",
    p_tipo: "foto",
    p_content_type: "image/png",
    p_size_bytes: 128,
    p_operation_id: op(),
  });
  if (error) throw new Error(`registrar_evidencia_viabilidad: ${error.message}`);
  return data as { id_evidencia: string; object_key: string };
}

/**
 * Adjunta una evidencia a cada pregunta de la plantilla que la declare
 * (`evidencia_tipo` no nulo). Se usa para completar el baseline tras
 * responder con `{ evidencias: false }`.
 */
export async function adjuntarEvidenciasRequeridas(
  admin: SupabaseClient,
  revisionId: number,
  omitir: string[] = []
): Promise<void> {
  const plantillaId = await revisionPlantilla(admin, revisionId);
  const preguntas = await preguntasDePlantilla(admin, plantillaId);
  for (const p of preguntas) {
    if (!p.evidenciaTipo || omitir.includes(p.codigo)) continue;
    await adjuntarEvidencia(admin, revisionId, { preguntaId: p.id });
  }
}

// ─────────────────────────────────────────────────────────────────────
// Resolución de obligaciones y asignaciones
// ─────────────────────────────────────────────────────────────────────
export async function resolverAccion(
  admin: SupabaseClient,
  accionId: number,
  estado: string,
  observaciones: string | null = null
): Promise<void> {
  const { error } = await admin.rpc("resolver_accion_viabilidad", {
    p_accion_id: accionId,
    p_estado: estado,
    p_observaciones: observaciones,
    p_operation_id: op(),
  });
  if (error) throw new Error(`resolver_accion_viabilidad: ${error.message}`);
}

export async function resolverValidacion(
  admin: SupabaseClient,
  validacionId: number,
  estado: "aprobada" | "rechazada",
  observaciones: string | null = null
): Promise<void> {
  const { error } = await admin.rpc("resolver_validacion_viabilidad", {
    p_validacion_id: validacionId,
    p_estado: estado,
    p_observaciones: observaciones,
    p_operation_id: op(),
  });
  if (error) throw new Error(`resolver_validacion_viabilidad: ${error.message}`);
}

export async function asignarResponsable(
  admin: SupabaseClient,
  accionId: number,
  empleadoId: number
): Promise<void> {
  const { error } = await admin
    .from("viabilidad_acciones")
    .update({ responsable_empleado_id: empleadoId })
    .eq("id_accion_viabilidad", accionId);
  if (error) throw new Error(error.message);
}

export async function asignarEspecialista(
  admin: SupabaseClient,
  validacionId: number,
  empleadoId: number
): Promise<void> {
  const { error } = await admin
    .from("viabilidad_validaciones")
    .update({ especialista_empleado_id: empleadoId })
    .eq("id_validacion_viabilidad", validacionId);
  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────────────────────────────
// Lectura de estado
// ─────────────────────────────────────────────────────────────────────
export interface AccionRow {
  id: number;
  descripcion: string;
  estado: string;
  obligatoria: boolean;
  responsable_empleado_id: number | null;
}

export interface ValidacionRow {
  id: number;
  tipo: string;
  estado: string;
  especialista_empleado_id: number | null;
}

export interface RevisionRow {
  id: number;
  estado: string;
  resultado_evaluacion: string | null;
  resultado_final: string | null;
  tipo_etapa: string;
  numero_revision: number;
  asignado_empleado_id: number | null;
  reemplaza_revision_id: number | null;
  proyecto_id: number;
  acciones: AccionRow[];
  validaciones: ValidacionRow[];
}

export async function getRevision(
  client: SupabaseClient,
  revisionId: number
): Promise<RevisionRow> {
  const { data, error } = await client
    .from("viabilidad_revisiones")
    .select(
      "id_revision_viabilidad, estado, resultado_evaluacion, resultado_final, tipo_etapa, numero_revision, asignado_empleado_id, reemplaza_revision_id, proyecto_id, viabilidad_acciones(id_accion_viabilidad, descripcion, estado, obligatoria, responsable_empleado_id), viabilidad_validaciones(id_validacion_viabilidad, tipo, estado, especialista_empleado_id)"
    )
    .eq("id_revision_viabilidad", revisionId)
    .single();
  if (error || !data) throw new Error(`Revisión ${revisionId}: ${error?.message ?? "vacía"}`);
  const d = data as unknown as {
    id_revision_viabilidad: number;
    estado: string;
    resultado_evaluacion: string | null;
    resultado_final: string | null;
    tipo_etapa: string;
    numero_revision: number;
    asignado_empleado_id: number | null;
    reemplaza_revision_id: number | null;
    proyecto_id: number;
    viabilidad_acciones: Array<{
      id_accion_viabilidad: number;
      descripcion: string;
      estado: string;
      obligatoria: boolean;
      responsable_empleado_id: number | null;
    }>;
    viabilidad_validaciones: Array<{
      id_validacion_viabilidad: number;
      tipo: string;
      estado: string;
      especialista_empleado_id: number | null;
    }>;
  };
  return {
    id: d.id_revision_viabilidad,
    estado: d.estado,
    resultado_evaluacion: d.resultado_evaluacion,
    resultado_final: d.resultado_final,
    tipo_etapa: d.tipo_etapa,
    numero_revision: d.numero_revision,
    asignado_empleado_id: d.asignado_empleado_id,
    reemplaza_revision_id: d.reemplaza_revision_id,
    proyecto_id: d.proyecto_id,
    acciones: (d.viabilidad_acciones ?? []).map((a) => ({
      id: a.id_accion_viabilidad,
      descripcion: a.descripcion,
      estado: a.estado,
      obligatoria: a.obligatoria,
      responsable_empleado_id: a.responsable_empleado_id,
    })),
    validaciones: (d.viabilidad_validaciones ?? []).map((v) => ({
      id: v.id_validacion_viabilidad,
      tipo: v.tipo,
      estado: v.estado,
      especialista_empleado_id: v.especialista_empleado_id,
    })),
  };
}

export async function estadoProyecto(service: SupabaseClient, proyectoId: number): Promise<string> {
  const { data, error } = await service
    .from("proyectos")
    .select("estado")
    .eq("id_proyecto", proyectoId)
    .single();
  if (error || !data) throw new Error(`Proyecto ${proyectoId}: ${error?.message ?? "vacío"}`);
  return data.estado as string;
}

export { op };
