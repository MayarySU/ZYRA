"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/hooks/queries/keys";
import * as rp from "@/lib/data/reportes";
import * as cs from "@/lib/data/checklists-servicio";
import * as rc from "@/lib/data/recordatorios";

// ── Reportes ─────────────────────────────────────────────────────────
export function useReportes() {
  return useQuery({ queryKey: qk.reportes, queryFn: rp.listarReportes });
}
export function useReportesDeEquipo(equipoId: number | null) {
  return useQuery({
    queryKey: qk.reportesEquipo(equipoId ?? 0),
    queryFn: () => rp.listarReportesDeEquipo(equipoId as number),
    enabled: equipoId != null,
  });
}
export function useReportesDeProyecto(proyectoId: number | null) {
  return useQuery({
    queryKey: qk.reportesProyecto(proyectoId ?? 0),
    queryFn: () => rp.listarReportesDeProyecto(proyectoId as number),
    enabled: proyectoId != null,
  });
}

// ── Plantillas de checklist (settings) ───────────────────────────────
export function usePlantillas() {
  return useQuery({ queryKey: qk.plantillas, queryFn: cs.listarPlantillas });
}
export function useActualizarPlantilla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: number;
      items: { material_id: number; cantidad_requerida: number }[];
    }) => cs.actualizarPlantillaMateriales(input.id, input.items),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.plantillas }),
  });
}

// ── Recordatorios ────────────────────────────────────────────────────
export function useRecordatorios() {
  return useQuery({ queryKey: qk.recordatorios, queryFn: rc.listarRecordatorios });
}
export function useCrearRecordatorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof rc.crearRecordatorio>[0]) => rc.crearRecordatorio(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.recordatorios }),
  });
}
export function useEliminarRecordatorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => rc.eliminarRecordatorio(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.recordatorios }),
  });
}
export function useMarcarRecordatorioLeido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recordatorioId, empleadoId }: { recordatorioId: number; empleadoId: number }) =>
      rc.marcarRecordatorioLeido(recordatorioId, empleadoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.recordatorios }),
  });
}
