"use client";

import { useQuery, useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import { qk } from "@/hooks/queries/keys";
import * as py from "@/lib/data/proyectos";
import * as rpc from "@/lib/data/rpc";
import { nuevoOperationId, type Tablas } from "@/lib/data/util";
import { encolarOperacion, type OutboxKind } from "@/lib/offline/outbox";

/** Descriptor para desviar la mutación al outbox Dexie cuando no hay conexión. */
interface DescriptorOutbox<TVars> {
  kind: OutboxKind;
  describir: (vars: TVars) => { datos: unknown; version?: string; clave: string };
}

/**
 * Envuelve `useMutation` generando un `operation_id` (idempotency key) ÚNICO
 * por invocación del usuario. Las variables (y su operation_id) se conservan
 * a través de los reintentos, de modo que un reenvío tras reconectar NO
 * duplica la operación en el servidor.
 *
 * Si se pasa un `descriptor` y no hay conexión, la mutación NO se ejecuta ni
 * se pausa en TanStack: se encola en el outbox Dexie (`lib/offline/outbox.ts`)
 * con el mismo `operation_id`, de modo que sobrevive a una recarga y la
 * sincroniza el ejecutor al reconectar (idempotente en el servidor).
 */
function useIdempotente<TData, TVars = void>(
  fn: (vars: TVars, opId: string) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, Error, { vars: TVars; opId: string }>, "mutationFn">,
  descriptor?: DescriptorOutbox<TVars>
) {
  const m = useMutation<TData, Error, { vars: TVars; opId: string }>({
    mutationFn: ({ vars, opId }) => fn(vars, opId),
    ...options,
  });

  const desviarSiOffline = (vars: TVars, opId: string): boolean => {
    if (!descriptor) return false;
    if (typeof navigator === "undefined" || navigator.onLine) return false;
    const d = descriptor.describir(vars);
    void encolarOperacion({
      id: opId,
      kind: descriptor.kind,
      datos: d.datos,
      version: d.version,
      clave: d.clave,
    });
    return true;
  };

  return {
    ...m,
    mutate: (vars?: TVars, opts?: Parameters<typeof m.mutate>[1]) => {
      const opId = nuevoOperationId();
      if (desviarSiOffline(vars as TVars, opId)) return;
      m.mutate({ vars: vars as TVars, opId }, opts);
    },
    mutateAsync: (vars?: TVars, opts?: Parameters<typeof m.mutateAsync>[1]) => {
      const opId = nuevoOperationId();
      if (desviarSiOffline(vars as TVars, opId)) {
        return Promise.resolve(undefined as unknown as TData);
      }
      return m.mutateAsync({ vars: vars as TVars, opId }, opts);
    },
  };
}

export function useProyectos() {
  return useQuery({ queryKey: qk.proyectos, queryFn: py.listarProyectos });
}

export function useProyecto(id: number | null) {
  return useQuery({
    queryKey: qk.proyecto(id ?? 0),
    queryFn: () => py.obtenerProyecto(id as number),
    enabled: id != null,
  });
}

export function useCrearProyecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: py.NuevoProyecto) => py.crearProyecto(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.proyectos });
      qc.invalidateQueries({ queryKey: qk.materiales });
    },
  });
}

export function useActualizarProyecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Tablas["proyectos"]["Update"] }) =>
      py.actualizarProyecto(id, patch),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: qk.proyectos });
      qc.invalidateQueries({ queryKey: qk.proyecto(v.id) });
    },
  });
}

export function useEliminarProyecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => py.eliminarProyecto(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.proyectos }),
  });
}

// ── Checklist ────────────────────────────────────────────────────────
export function useChecklist(proyectoId: number | null) {
  return useQuery({
    queryKey: qk.checklist(proyectoId ?? 0),
    queryFn: () => py.obtenerChecklist(proyectoId as number),
    enabled: proyectoId != null,
  });
}

export function useDetalleChecklist(checklistId: number | null) {
  return useQuery({
    queryKey: qk.detalleChecklist(checklistId ?? 0),
    queryFn: () => py.listarDetalleChecklist(checklistId as number),
    enabled: checklistId != null,
  });
}

export function useActualizarDetalleChecklist() {
  const qc = useQueryClient();
  return useIdempotente<
    Awaited<ReturnType<typeof py.actualizarDetalleChecklist>>,
    { id: number; patch: Tablas["checklist_detalle"]["Update"]; version?: string }
  >(
    ({ id, patch }) => py.actualizarDetalleChecklist(id, patch),
    {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["checklist-detalle"] });
      },
    },
    {
      kind: "checklist-detalle",
      describir: ({ id, patch, version }) => ({
        datos: { id, patch },
        version,
        clave: `checklist-detalle:${id}`,
      }),
    }
  );
}

export function useAvances(proyectoId: number | null) {
  return useQuery({
    queryKey: qk.avances(proyectoId ?? 0),
    queryFn: () => py.listarAvances(proyectoId as number),
    enabled: proyectoId != null,
  });
}

export function useEvidencias(proyectoId: number | null) {
  return useQuery({
    queryKey: qk.evidencias(proyectoId ?? 0),
    queryFn: () => py.listarEvidencias(proyectoId as number),
    enabled: proyectoId != null,
  });
}

// ── Ciclo de vida (RPC) ──────────────────────────────────────────────
function useInvalidarProyecto(proyectoId: number) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.proyectos });
    qc.invalidateQueries({ queryKey: qk.proyecto(proyectoId) });
    qc.invalidateQueries({ queryKey: qk.checklist(proyectoId) });
    qc.invalidateQueries({ queryKey: ["checklist-detalle"] });
    qc.invalidateQueries({ queryKey: qk.avances(proyectoId) });
    qc.invalidateQueries({ queryKey: qk.evidencias(proyectoId) });
    qc.invalidateQueries({ queryKey: qk.reportes });
    qc.invalidateQueries({ queryKey: qk.materiales });
  };
}

export function useGenerarChecklist(proyectoId: number) {
  const invalidar = useInvalidarProyecto(proyectoId);
  return useIdempotente<rpc.ResultadoGenerarChecklist>(
    (_vars, opId) => rpc.rpcGenerarChecklist(proyectoId, opId),
    { onSuccess: invalidar }
  );
}

export function useValidarChecklist(proyectoId: number) {
  const invalidar = useInvalidarProyecto(proyectoId);
  return useIdempotente<rpc.ResultadoValidarChecklist, number>(
    (checklistId, opId) => rpc.rpcValidarChecklist(checklistId, opId),
    { onSuccess: invalidar },
    {
      kind: "validar-checklist",
      describir: (checklistId) => ({
        datos: { checklistId },
        clave: `validar-checklist:${checklistId}`,
      }),
    }
  );
}

export function useIniciarProyecto(proyectoId: number) {
  const invalidar = useInvalidarProyecto(proyectoId);
  return useIdempotente<rpc.ResultadoProyecto>(
    (_vars, opId) => rpc.rpcIniciarProyecto(proyectoId, opId),
    { onSuccess: invalidar },
    {
      kind: "iniciar-proyecto",
      describir: () => ({ datos: { proyectoId }, clave: `iniciar-proyecto:${proyectoId}` }),
    }
  );
}

export function useReportarAvance(proyectoId: number) {
  const invalidar = useInvalidarProyecto(proyectoId);
  return useIdempotente<rpc.ResultadoAvance, { descripcion: string; porcentaje?: number }>(
    (input, opId) => rpc.rpcReportarAvance(proyectoId, input.descripcion, input.porcentaje, opId),
    { onSuccess: invalidar }
  );
}

export function useRegistrarEvidencia(proyectoId: number) {
  const invalidar = useInvalidarProyecto(proyectoId);
  return useIdempotente<
    rpc.ResultadoEvidencia,
    Omit<Parameters<typeof rpc.rpcRegistrarEvidencia>[0], "proyectoId" | "operationId">
  >(
    (input, opId) => rpc.rpcRegistrarEvidencia({ ...input, proyectoId, operationId: opId }),
    { onSuccess: invalidar }
  );
}

export function useEnviarReporte(proyectoId: number) {
  const invalidar = useInvalidarProyecto(proyectoId);
  return useIdempotente<rpc.ResultadoReporte, string | undefined>(
    (comentarios, opId) => rpc.rpcEnviarReporte(proyectoId, comentarios, opId),
    { onSuccess: invalidar },
    {
      kind: "enviar-reporte",
      describir: (comentarios) => ({
        datos: { proyectoId, comentarios },
        clave: `enviar-reporte:${proyectoId}`,
      }),
    }
  );
}

export function useFinalizarProyecto(proyectoId: number) {
  const invalidar = useInvalidarProyecto(proyectoId);
  return useIdempotente<rpc.ResultadoProyecto, string | undefined>(
    (comentarios, opId) => rpc.rpcFinalizarProyecto(proyectoId, comentarios, opId),
    { onSuccess: invalidar }
  );
}

export function useAvanzarEstado(proyectoId: number) {
  const invalidar = useInvalidarProyecto(proyectoId);
  return useIdempotente<rpc.ResultadoProyecto, string>(
    (nuevoEstado, opId) => rpc.rpcAvanzarEstado(proyectoId, nuevoEstado, opId),
    { onSuccess: invalidar }
  );
}

// ── Reportes (aprobación/rechazo) ────────────────────────────────────
function useInvalidarReportes() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.reportes });
    qc.invalidateQueries({ queryKey: qk.proyectos });
  };
}

export function useAprobarReporte() {
  const invalidar = useInvalidarReportes();
  return useIdempotente<rpc.ResultadoReporte, number>(
    (reporteId, opId) => rpc.rpcAprobarReporte(reporteId, opId),
    { onSuccess: invalidar }
  );
}

export function useRechazarReporte() {
  const invalidar = useInvalidarReportes();
  return useIdempotente<rpc.ResultadoReporte, { reporteId: number; motivo?: string }>(
    ({ reporteId, motivo }, opId) => rpc.rpcRechazarReporte(reporteId, motivo, opId),
    { onSuccess: invalidar }
  );
}
