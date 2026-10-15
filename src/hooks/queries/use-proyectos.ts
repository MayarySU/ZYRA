"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/hooks/queries/keys";
import * as py from "@/lib/data/proyectos";
import * as rpc from "@/lib/data/rpc";
import type { Tablas } from "@/lib/data/util";

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
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Tablas["checklist_detalle"]["Update"] }) =>
      py.actualizarDetalleChecklist(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist-detalle"] });
    },
  });
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
  return useMutation({
    mutationFn: (opId?: string) => rpc.rpcGenerarChecklist(proyectoId, opId),
    onSuccess: invalidar,
  });
}

export function useValidarChecklist(proyectoId: number) {
  const invalidar = useInvalidarProyecto(proyectoId);
  return useMutation({
    mutationFn: (checklistId: number) => rpc.rpcValidarChecklist(checklistId),
    onSuccess: invalidar,
  });
}

export function useIniciarProyecto(proyectoId: number) {
  const invalidar = useInvalidarProyecto(proyectoId);
  return useMutation({
    mutationFn: (opId?: string) => rpc.rpcIniciarProyecto(proyectoId, opId),
    onSuccess: invalidar,
  });
}

export function useReportarAvance(proyectoId: number) {
  const invalidar = useInvalidarProyecto(proyectoId);
  return useMutation({
    mutationFn: (input: { descripcion: string; porcentaje?: number }) =>
      rpc.rpcReportarAvance(proyectoId, input.descripcion, input.porcentaje),
    onSuccess: invalidar,
  });
}

export function useRegistrarEvidencia(proyectoId: number) {
  const invalidar = useInvalidarProyecto(proyectoId);
  return useMutation({
    mutationFn: (input: Omit<Parameters<typeof rpc.rpcRegistrarEvidencia>[0], "proyectoId">) =>
      rpc.rpcRegistrarEvidencia({ ...input, proyectoId }),
    onSuccess: invalidar,
  });
}

export function useEnviarReporte(proyectoId: number) {
  const invalidar = useInvalidarProyecto(proyectoId);
  return useMutation({
    mutationFn: (comentarios?: string) => rpc.rpcEnviarReporte(proyectoId, comentarios),
    onSuccess: invalidar,
  });
}

export function useFinalizarProyecto(proyectoId: number) {
  const invalidar = useInvalidarProyecto(proyectoId);
  return useMutation({
    mutationFn: (comentarios?: string) => rpc.rpcFinalizarProyecto(proyectoId, comentarios),
    onSuccess: invalidar,
  });
}

export function useAvanzarEstado(proyectoId: number) {
  const invalidar = useInvalidarProyecto(proyectoId);
  return useMutation({
    mutationFn: (nuevoEstado: string) => rpc.rpcAvanzarEstado(proyectoId, nuevoEstado),
    onSuccess: invalidar,
  });
}

// ── Reportes (aprobación/rechazo) ────────────────────────────────────
export function useAprobarReporte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reporteId: number) => rpc.rpcAprobarReporte(reporteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.reportes });
      qc.invalidateQueries({ queryKey: qk.proyectos });
    },
  });
}

export function useRechazarReporte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reporteId, motivo }: { reporteId: number; motivo?: string }) =>
      rpc.rpcRechazarReporte(reporteId, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.reportes });
      qc.invalidateQueries({ queryKey: qk.proyectos });
    },
  });
}
