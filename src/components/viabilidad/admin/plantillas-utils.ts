import type { EfectoSenalViabilidad, TipoValidacionViabilidad } from "@/lib/data/rpc";
import type { TipoRespuestaViabilidad } from "@/lib/data/viabilidad";

// ─────────────────────────────────────────────────────────────────────
// Catálogos alineados con el motor REAL (0007) y la migración 0012.
// NO inventar tipos: son exactamente los que soporta la BD.
// ─────────────────────────────────────────────────────────────────────
export const TIPOS_RESPUESTA: TipoRespuestaViabilidad[] = [
  "booleano",
  "opcion_unica",
  "opcion_multiple",
  "numero",
  "texto",
  "fecha",
  "evidencia",
];

export const OPERADORES_CONDICION = [
  "=",
  "!=",
  "in",
  "not_in",
  ">=",
  "<=",
  ">",
  "<",
  "contiene",
] as const;

export const ACCIONES_CONDICION = ["mostrar", "ocultar", "requerir"] as const;

export const EFECTOS: EfectoSenalViabilidad[] = [
  "no_apto",
  "validacion_especializada",
  "accion_requerida",
];

export const VALIDACION_TIPOS: TipoValidacionViabilidad[] = [
  "estructural",
  "electrico",
  "legal",
  "cfe",
  "otro",
];

export type OperadorCondicion = (typeof OPERADORES_CONDICION)[number];
export type AccionCondicion = (typeof ACCIONES_CONDICION)[number];

export interface ReglaEfecto {
  efecto: EfectoSenalViabilidad;
  motivo?: string;
  mensaje?: string;
  descripcion_accion?: string;
  validacion_tipo?: TipoValidacionViabilidad;
  obligatoria?: boolean;
}

export interface ReglaEvaluacion extends ReglaEfecto {
  cuando?: { operador: OperadorCondicion; valor: string };
}

// Claves que el editor guiado sabe representar. Cualquier otra clave implica
// que la regla requiere "edición técnica" (se muestra read-only, sin simplificar).
const CLAVES_EFECTO = [
  "efecto",
  "motivo",
  "mensaje",
  "descripcion_accion",
  "validacion_tipo",
  "obligatoria",
  "pregunta",
] as const;
const CLAVES_EVAL = [...CLAVES_EFECTO, "cuando"] as const;

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function tieneClavesDesconocidas(
  obj: Record<string, unknown>,
  permitidas: readonly string[]
): string | null {
  for (const k of Object.keys(obj)) {
    if (!permitidas.includes(k)) return k;
  }
  return null;
}

function validarEfecto(
  regla: Record<string, unknown>,
  permitidas: readonly string[]
): string | null {
  const desconocida = tieneClavesDesconocidas(regla, permitidas);
  if (desconocida) {
    return `Campo no soportado por el editor ("${desconocida}")`;
  }
  const efecto = regla.efecto;
  if (typeof efecto !== "string" || !EFECTOS.includes(efecto as EfectoSenalViabilidad)) {
    return "Efecto no soportado por el motor";
  }
  if (efecto === "validacion_especializada") {
    const tipo = regla.validacion_tipo;
    if (typeof tipo !== "string" || !VALIDACION_TIPOS.includes(tipo as TipoValidacionViabilidad)) {
      return 'El efecto "validacion_especializada" requiere un tipo de validación válido';
    }
  }
  return null;
}

/**
 * Error (o `null` si es simple) de una `regla_evaluacion`.
 * Espejo de `public._viabilidad_regla_error` de la migración 0012.
 */
export function reglaEvaluacionError(regla: unknown): string | null {
  if (regla === null || regla === undefined) return null;
  if (!esObjeto(regla)) return "La regla debe ser un objeto";
  const base = validarEfecto(regla, CLAVES_EVAL);
  if (base) return base;
  if ("cuando" in regla) {
    const cuando = regla.cuando;
    if (
      !esObjeto(cuando) ||
      typeof cuando.operador !== "string" ||
      !OPERADORES_CONDICION.includes(cuando.operador as OperadorCondicion) ||
      typeof cuando.valor !== "string"
    ) {
      return 'La condición "cuando" requiere operador y valor válidos';
    }
  }
  return null;
}

/** Error (o `null` si es simple) de una `regla` de opción. */
export function reglaOpcionError(regla: unknown): string | null {
  if (regla === null || regla === undefined) return null;
  if (!esObjeto(regla)) return "La regla debe ser un objeto";
  if ("cuando" in regla) return "La regla de una opción no admite condición";
  return validarEfecto(regla, CLAVES_EFECTO);
}

export function reglaEvaluacionEsSimple(regla: unknown): boolean {
  return reglaEvaluacionError(regla) === null;
}

export function reglaOpcionEsSimple(regla: unknown): boolean {
  return reglaOpcionError(regla) === null;
}

/** Normaliza una regla a la forma guiada (sin claves desconocidas). */
export function aReglaEvaluacion(regla: unknown): ReglaEvaluacion {
  const r = esObjeto(regla) ? regla : {};
  const cuando = esObjeto(r.cuando)
    ? {
        operador: (r.cuando.operador as OperadorCondicion) ?? "=",
        valor: String(r.cuando.valor ?? ""),
      }
    : undefined;
  return {
    efecto: (r.efecto as EfectoSenalViabilidad) ?? "no_apto",
    motivo: typeof r.motivo === "string" ? r.motivo : undefined,
    mensaje: typeof r.mensaje === "string" ? r.mensaje : undefined,
    descripcion_accion:
      typeof r.descripcion_accion === "string" ? r.descripcion_accion : undefined,
    validacion_tipo: (r.validacion_tipo as TipoValidacionViabilidad) ?? undefined,
    obligatoria: typeof r.obligatoria === "boolean" ? r.obligatoria : undefined,
    cuando,
  };
}

export function aReglaOpcion(regla: unknown): ReglaEfecto {
  const r = esObjeto(regla) ? regla : {};
  return {
    efecto: (r.efecto as EfectoSenalViabilidad) ?? "accion_requerida",
    motivo: typeof r.motivo === "string" ? r.motivo : undefined,
    mensaje: typeof r.mensaje === "string" ? r.mensaje : undefined,
    descripcion_accion:
      typeof r.descripcion_accion === "string" ? r.descripcion_accion : undefined,
    validacion_tipo: (r.validacion_tipo as TipoValidacionViabilidad) ?? undefined,
    obligatoria: typeof r.obligatoria === "boolean" ? r.obligatoria : undefined,
  };
}

/** Limpia claves vacías antes de persistir. */
export function limpiarRegla(regla: {
  [k: string]: unknown;
}): Record<string, unknown> {
  const salida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(regla)) {
    if (v === undefined || v === "" || v === null) continue;
    if (k === "cuando") {
      const c = v as { operador?: string; valor?: string };
      if (c && typeof c.operador === "string" && String(c.valor ?? "") !== "") {
        salida[k] = { operador: c.operador, valor: c.valor };
      }
      continue;
    }
    salida[k] = v;
  }
  return salida;
}

export function estadoPlantillaKey(estado: string): "borrador" | "activa" | "archivada" {
  if (estado === "activa" || estado === "archivada") return estado;
  return "borrador";
}

export function esEditable(estado: string): boolean {
  return estado === "borrador";
}
