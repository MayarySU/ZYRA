"use client";

import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { qk } from "@/hooks/queries/keys";
import { useIdempotente } from "@/hooks/queries/idempotente";
import * as vv from "@/lib/data/viabilidad";
import * as rpc from "@/lib/data/rpc";
import { nuevoOperationId, type Tablas } from "@/lib/data/util";
import {
  encolarOperacion,
  encolarRespuestaViabilidad,
  listarOperacionesAtascadas,
} from "@/lib/offline/outbox";
import type { OutboxEntry } from "@/lib/offline/db";
import {
  subirEvidencia,
  listarEvidenciasPendientesRevision,
} from "@/lib/evidencias-client";

function sinConexion(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

// ─────────────────────────────────────────────────────────────────────
// Invalidación
// ─────────────────────────────────────────────────────────────────────
function useInvalidarViabilidad() {
  const qc = useQueryClient();
  return (proyectoId?: number) => {
    qc.invalidateQueries({ queryKey: ["viabilidad"] });
    if (proyectoId != null) {
      qc.invalidateQueries({ queryKey: qk.proyectos });
      qc.invalidateQueries({ queryKey: qk.proyecto(proyectoId) });
      qc.invalidateQueries({ queryKey: qk.checklist(proyectoId) });
    }
  };
}

// ─────────────────────────────────────────────────────────────────────
// Configuración por servicio
// ─────────────────────────────────────────────────────────────────────
export function useViabilidadConfig() {
  return useQuery({ queryKey: qk.viabilidadConfig, queryFn: vv.listarConfigViabilidad });
}

export function useGuardarConfigViabilidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      servicioId,
      patch,
    }: {
      servicioId: number;
      patch: Parameters<typeof vv.guardarConfigViabilidad>[1];
    }) => vv.guardarConfigViabilidad(servicioId, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.viabilidadConfig }),
  });
}

// ─────────────────────────────────────────────────────────────────────
// Plantillas
// ─────────────────────────────────────────────────────────────────────
export function usePlantillasViabilidad() {
  return useQuery({ queryKey: qk.viabilidadPlantillas, queryFn: vv.listarPlantillasViabilidad });
}

export function usePlantillaViabilidad(id: number | null) {
  return useQuery({
    queryKey: qk.viabilidadPlantilla(id ?? 0),
    queryFn: () => vv.obtenerPlantillaViabilidadDetalle(id as number),
    enabled: id != null,
  });
}

function useInvalidarPlantillas(plantillaId?: number) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.viabilidadPlantillas });
    if (plantillaId != null) {
      qc.invalidateQueries({ queryKey: qk.viabilidadPlantilla(plantillaId) });
    }
  };
}

export function useCrearPlantillaViabilidad() {
  const invalidar = useInvalidarPlantillas();
  return useMutation({
    mutationFn: (input: Tablas["viabilidad_plantillas"]["Insert"]) =>
      vv.crearPlantillaViabilidad(input),
    onSuccess: invalidar,
  });
}

export function useActualizarPlantillaViabilidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Tablas["viabilidad_plantillas"]["Update"] }) =>
      vv.actualizarPlantillaViabilidad(id, patch),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: qk.viabilidadPlantillas });
      qc.invalidateQueries({ queryKey: qk.viabilidadPlantilla(v.id) });
    },
  });
}

export function useEliminarPlantillaViabilidad() {
  const invalidar = useInvalidarPlantillas();
  return useMutation({
    mutationFn: (id: number) => vv.eliminarPlantillaViabilidad(id),
    onSuccess: invalidar,
  });
}

// ── Secciones ────────────────────────────────────────────────────────
export function useCrearSeccionViabilidad(plantillaId: number) {
  const invalidar = useInvalidarPlantillas(plantillaId);
  return useMutation({
    mutationFn: (input: Tablas["viabilidad_secciones"]["Insert"]) =>
      vv.crearSeccionViabilidad(input),
    onSuccess: invalidar,
  });
}

export function useActualizarSeccionViabilidad(plantillaId: number) {
  const invalidar = useInvalidarPlantillas(plantillaId);
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Tablas["viabilidad_secciones"]["Update"] }) =>
      vv.actualizarSeccionViabilidad(id, patch),
    onSuccess: invalidar,
  });
}

export function useEliminarSeccionViabilidad(plantillaId: number) {
  const invalidar = useInvalidarPlantillas(plantillaId);
  return useMutation({
    mutationFn: (id: number) => vv.eliminarSeccionViabilidad(id),
    onSuccess: invalidar,
  });
}

// ── Preguntas ────────────────────────────────────────────────────────
export function useCrearPreguntaViabilidad(plantillaId: number) {
  const invalidar = useInvalidarPlantillas(plantillaId);
  return useMutation({
    mutationFn: (input: Tablas["viabilidad_preguntas"]["Insert"]) =>
      vv.crearPreguntaViabilidad(input),
    onSuccess: invalidar,
  });
}

export function useActualizarPreguntaViabilidad(plantillaId: number) {
  const invalidar = useInvalidarPlantillas(plantillaId);
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Tablas["viabilidad_preguntas"]["Update"] }) =>
      vv.actualizarPreguntaViabilidad(id, patch),
    onSuccess: invalidar,
  });
}

export function useEliminarPreguntaViabilidad(plantillaId: number) {
  const invalidar = useInvalidarPlantillas(plantillaId);
  return useMutation({
    mutationFn: (id: number) => vv.eliminarPreguntaViabilidad(id),
    onSuccess: invalidar,
  });
}

// ── Opciones ─────────────────────────────────────────────────────────
export function useCrearOpcionViabilidad(plantillaId: number) {
  const invalidar = useInvalidarPlantillas(plantillaId);
  return useMutation({
    mutationFn: (input: Tablas["viabilidad_opciones"]["Insert"]) =>
      vv.crearOpcionViabilidad(input),
    onSuccess: invalidar,
  });
}

export function useActualizarOpcionViabilidad(plantillaId: number) {
  const invalidar = useInvalidarPlantillas(plantillaId);
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Tablas["viabilidad_opciones"]["Update"] }) =>
      vv.actualizarOpcionViabilidad(id, patch),
    onSuccess: invalidar,
  });
}

export function useEliminarOpcionViabilidad(plantillaId: number) {
  const invalidar = useInvalidarPlantillas(plantillaId);
  return useMutation({
    mutationFn: (id: number) => vv.eliminarOpcionViabilidad(id),
    onSuccess: invalidar,
  });
}

// ── Condiciones ──────────────────────────────────────────────────────
export function useCrearCondicionViabilidad(plantillaId: number) {
  const invalidar = useInvalidarPlantillas(plantillaId);
  return useMutation({
    mutationFn: (input: Tablas["viabilidad_condiciones"]["Insert"]) =>
      vv.crearCondicionViabilidad(input),
    onSuccess: invalidar,
  });
}

export function useEliminarCondicionViabilidad(plantillaId: number) {
  const invalidar = useInvalidarPlantillas(plantillaId);
  return useMutation({
    mutationFn: (id: number) => vv.eliminarCondicionViabilidad(id),
    onSuccess: invalidar,
  });
}

// ─────────────────────────────────────────────────────────────────────
// Revisiones
// ─────────────────────────────────────────────────────────────────────
export function useRevisionesViabilidad(proyectoId: number | null) {
  return useQuery({
    queryKey: qk.viabilidadRevisiones(proyectoId ?? 0),
    queryFn: () => vv.listarRevisionesViabilidad(proyectoId as number),
    enabled: proyectoId != null,
  });
}

export function useRevisionViabilidad(id: number | null) {
  return useQuery({
    queryKey: qk.viabilidadRevision(id ?? 0),
    queryFn: () => vv.obtenerRevisionViabilidadDetalle(id as number),
    enabled: id != null,
  });
}

// ── Ciclo de vida (RPC) ──────────────────────────────────────────────
export function useEstablecerAplicabilidadViabilidad(proyectoId: number) {
  const invalidar = useInvalidarViabilidad();
  return useIdempotente<
    rpc.ResultadoAplicabilidadViabilidad,
    { requierePreviabilidad: boolean; requiereIngenieria: boolean }
  >(
    ({ requierePreviabilidad, requiereIngenieria }, opId) =>
      rpc.rpcEstablecerAplicabilidadViabilidad(
        proyectoId,
        requierePreviabilidad,
        requiereIngenieria,
        opId
      ),
    { onSuccess: () => invalidar(proyectoId) }
  );
}

export function useCrearRevisionViabilidad(proyectoId: number) {
  const invalidar = useInvalidarViabilidad();
  return useIdempotente<
    rpc.ResultadoCrearRevisionViabilidad,
    { tipoEtapa: rpc.TipoEtapaViabilidad; asignadoEmpleadoId?: number | null }
  >(
    ({ tipoEtapa, asignadoEmpleadoId }, opId) =>
      rpc.rpcCrearRevisionViabilidad(proyectoId, tipoEtapa, asignadoEmpleadoId, opId),
    { onSuccess: () => invalidar(proyectoId) }
  );
}

// ── Respuestas y entrega (con soporte offline vía outbox) ────────────
/** Aplica la respuesta de forma optimista a la revisión en caché. */
function aplicarRespuestaOptimista(
  qc: QueryClient,
  revisionId: number,
  preguntaId: number,
  valor: unknown
): void {
  qc.setQueryData<vv.RevisionViabilidadDetalle | undefined>(
    qk.viabilidadRevision(revisionId),
    (prev) => {
      if (!prev) return prev;
      const respuestas = prev.viabilidad_respuestas ?? [];
      const idx = respuestas.findIndex((r) => r.pregunta_id === preguntaId);
      let nuevas: vv.ViabilidadRespuesta[];
      if (idx >= 0) {
        nuevas = respuestas.slice();
        nuevas[idx] = {
          ...nuevas[idx],
          valor: valor as vv.ViabilidadRespuesta["valor"],
          version: nuevas[idx].version + 1,
        };
      } else {
        nuevas = [
          ...respuestas,
          {
            id_respuesta_viabilidad: -Date.now(),
            revision_id: revisionId,
            pregunta_id: preguntaId,
            valor: valor as vv.ViabilidadRespuesta["valor"],
            empleado_id: null,
            operation_id: null,
            version: 1,
            creado_en: new Date().toISOString(),
            actualizado_en: new Date().toISOString(),
          } as vv.ViabilidadRespuesta,
        ];
      }
      return {
        ...prev,
        estado: prev.estado === "borrador" ? "en_progreso" : prev.estado,
        viabilidad_respuestas: nuevas,
      };
    }
  );
}

export interface ResultadoGuardarRespuesta {
  /** true si la respuesta quedó en la cola offline (se sincronizará sola). */
  encolada: boolean;
}

export function useGuardarRespuestaViabilidad(revisionId: number) {
  const qc = useQueryClient();
  return useMutation<
    ResultadoGuardarRespuesta,
    Error,
    { preguntaId: number; valor: unknown; version?: number | null }
  >({
    mutationFn: async ({ preguntaId, valor, version }) => {
      if (sinConexion()) {
        await encolarRespuestaViabilidad({
          revisionId,
          preguntaId,
          valor,
          version: version ?? null,
        });
        return { encolada: true };
      }
      await rpc.rpcGuardarRespuestaViabilidad(
        revisionId,
        preguntaId,
        valor,
        version ?? null,
        nuevoOperationId()
      );
      return { encolada: false };
    },
    // offlineFirst: la mutación se ejecuta aunque no haya red, de modo que el
    // `sinConexion()` interno encola en la outbox de Dexie (blob/op persistidos)
    // en lugar de quedar en pausa como mutación serializada en JSON.
    networkMode: "offlineFirst",
    onMutate: ({ preguntaId, valor }) =>
      aplicarRespuestaOptimista(qc, revisionId, preguntaId, valor),
    onError: () => {
      qc.invalidateQueries({ queryKey: qk.viabilidadRevision(revisionId) });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["viabilidad"] });
    },
  });
}

export interface ResultadoEntregarRevision {
  /** true si la entrega quedó en la cola offline. */
  encolada: boolean;
  resultado?: rpc.ResultadoEntregarRevisionViabilidad;
}

export function useEntregarRevisionViabilidad(revisionId: number) {
  const qc = useQueryClient();
  return useMutation<ResultadoEntregarRevision, Error, void>({
    mutationFn: async () => {
      if (sinConexion()) {
        await encolarOperacion({
          id: crypto.randomUUID(),
          kind: "viabilidad-entregar",
          datos: { revisionId },
          clave: `viabilidad-entregar:${revisionId}`,
        });
        return { encolada: true };
      }
      const resultado = await rpc.rpcEntregarRevisionViabilidad(
        revisionId,
        nuevoOperationId()
      );
      return { encolada: false, resultado };
    },
    networkMode: "offlineFirst",
    onSettled: () => qc.invalidateQueries({ queryKey: ["viabilidad"] }),
  });
}

// ── Hub: revisiones/validaciones asignadas e historial ───────────────
export function useRevisionesAsignadas(empleadoId: number | null | undefined) {
  return useQuery({
    queryKey: qk.viabilidadRevisionesAsignadas,
    queryFn: () => vv.listarRevisionesAsignadas(empleadoId as number),
    enabled: empleadoId != null,
  });
}

export function useValidacionesAsignadas(empleadoId: number | null | undefined) {
  return useQuery({
    queryKey: qk.viabilidadValidacionesAsignadas,
    queryFn: () => vv.listarValidacionesAsignadas(empleadoId as number),
    enabled: empleadoId != null,
  });
}

export function useHistorialRevisiones() {
  return useQuery({
    queryKey: qk.viabilidadHistorial,
    queryFn: vv.listarHistorialRevisiones,
  });
}

export function useRevisionesTodas() {
  return useQuery({
    queryKey: [...qk.viabilidadRevisionesAsignadas, "todas"] as const,
    queryFn: vv.listarRevisionesTodas,
  });
}

export function useValidacionesTodas() {
  return useQuery({
    queryKey: [...qk.viabilidadValidacionesAsignadas, "todas"] as const,
    queryFn: vv.listarValidacionesTodas,
  });
}

// ── Evidencias (R2 offline) ──────────────────────────────────────────
export function useAdjuntarEvidenciaViabilidad(revisionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      proyectoId: number;
      file: File;
      descripcion?: string;
      preguntaId?: number;
      accionId?: number;
      validacionId?: number;
    }) => subirEvidencia({ ...input, revisionId }),
    networkMode: "offlineFirst",
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.viabilidadRevision(revisionId) });
      qc.invalidateQueries({ queryKey: qk.evidenciasPendientesRevision(revisionId) });
    },
  });
}

export function useEvidenciasPendientesRevision(revisionId: number | null) {
  return useQuery({
    queryKey: qk.evidenciasPendientesRevision(revisionId ?? 0),
    queryFn: () => listarEvidenciasPendientesRevision(revisionId as number),
    enabled: revisionId != null,
  });
}

// ── Cola de sincronización atascada (conflictos/errores) ─────────────
function revisionDeOperacion(entry: OutboxEntry): number | null {
  const datos = entry.datos as { revisionId?: number } | null;
  return datos?.revisionId ?? null;
}

export function useOperacionesViabilidadAtascadas(revisionId: number | null) {
  return useQuery({
    queryKey: ["viabilidad", "atascadas", revisionId ?? 0],
    queryFn: async () => {
      const todas = await listarOperacionesAtascadas();
      return todas.filter(
        (e) => e.kind.startsWith("viabilidad-") && revisionDeOperacion(e) === revisionId
      );
    },
    enabled: revisionId != null,
    refetchOnMount: "always",
  });
}

export function useResolverAccionViabilidad() {
  const invalidar = useInvalidarViabilidad();
  return useIdempotente<
    rpc.ResultadoResolverViabilidad,
    { accionId: number; estado: string; observaciones?: string | null }
  >(
    ({ accionId, estado, observaciones }, opId) =>
      rpc.rpcResolverAccionViabilidad(accionId, estado, observaciones, opId),
    { onSuccess: () => invalidar() }
  );
}

export function useResolverValidacionViabilidad() {
  const invalidar = useInvalidarViabilidad();
  return useIdempotente<
    rpc.ResultadoResolverViabilidad,
    { validacionId: number; estado: "aprobada" | "rechazada"; observaciones?: string | null }
  >(
    ({ validacionId, estado, observaciones }, opId) =>
      rpc.rpcResolverValidacionViabilidad(validacionId, estado, observaciones, opId),
    { onSuccess: () => invalidar() }
  );
}

export function useAnularRevisionViabilidad(proyectoId: number) {
  const invalidar = useInvalidarViabilidad();
  return useIdempotente<
    rpc.ResultadoAnularRevisionViabilidad,
    { revisionId: number; motivo?: string | null }
  >(
    ({ revisionId, motivo }, opId) =>
      rpc.rpcAnularRevisionViabilidad(revisionId, motivo, opId),
    { onSuccess: () => invalidar(proyectoId) }
  );
}

// ── Asignaciones (solo admin) ────────────────────────────────────────
export function useAsignarEspecialistaViabilidad(revisionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ validacionId, empleadoId }: { validacionId: number; empleadoId: number }) =>
      vv.asignarEspecialistaViabilidad(validacionId, empleadoId),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.viabilidadRevision(revisionId) }),
  });
}

export function useAsignarResponsableAccionViabilidad(revisionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accionId, empleadoId }: { accionId: number; empleadoId: number }) =>
      vv.asignarResponsableAccionViabilidad(accionId, empleadoId),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.viabilidadRevision(revisionId) }),
  });
}

export function useEvaluarViabilidad() {
  return useMutation({
    mutationFn: (revisionId: number) => rpc.rpcEvaluarViabilidad(revisionId),
  });
}

// ─────────────────────────────────────────────────────────────────────
// Evidencias de viabilidad
// ─────────────────────────────────────────────────────────────────────
export function useVincularEvidenciaViabilidad() {
  const invalidar = useInvalidarViabilidad();
  return useMutation({
    mutationFn: (input: Tablas["viabilidad_evidencias"]["Insert"]) =>
      vv.vincularEvidenciaViabilidad(input),
    onSuccess: () => invalidar(),
  });
}

export function useDesvincularEvidenciaViabilidad() {
  const invalidar = useInvalidarViabilidad();
  return useMutation({
    mutationFn: (id: number) => vv.desvincularEvidenciaViabilidad(id),
    onSuccess: () => invalidar(),
  });
}
