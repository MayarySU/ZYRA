"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/hooks/queries/keys";
import * as ac from "@/lib/data/catalogos";
import type { Tablas } from "@/lib/data/util";

// ── Clientes ─────────────────────────────────────────────────────────
export function useClientes() {
  return useQuery({ queryKey: qk.clientes, queryFn: ac.listarClientes });
}
export function useCrearCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Tablas["clientes"]["Insert"]) => ac.crearCliente(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.clientes }),
  });
}
export function useActualizarCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Tablas["clientes"]["Update"] }) =>
      ac.actualizarCliente(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.clientes }),
  });
}
export function useEliminarCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ac.eliminarCliente(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.clientes }),
  });
}

// ── Servicios ────────────────────────────────────────────────────────
export function useServicios() {
  return useQuery({ queryKey: qk.servicios, queryFn: ac.listarServicios });
}
export function useCrearServicio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { tipo: string; descripcion?: string | null; empresa_id?: number }) =>
      ac.crearServicio(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.servicios }),
  });
}
export function useActualizarServicio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Tablas["servicios"]["Update"] }) =>
      ac.actualizarServicio(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.servicios }),
  });
}
export function useEliminarServicio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ac.eliminarServicio(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.servicios }),
  });
}

// ── Materiales ───────────────────────────────────────────────────────
export function useMateriales() {
  return useQuery({ queryKey: qk.materiales, queryFn: ac.listarMateriales });
}
export function useCrearMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      nombre_material: string;
      unidad?: string | null;
      stock_disponible?: number;
      empresa_id?: number;
    }) => ac.crearMaterial(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.materiales }),
  });
}
export function useActualizarMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Tablas["materiales"]["Update"] }) =>
      ac.actualizarMaterial(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.materiales }),
  });
}
export function useEliminarMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ac.eliminarMaterial(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.materiales }),
  });
}

// ── Equipos ──────────────────────────────────────────────────────────
export function useEquipos() {
  return useQuery({ queryKey: qk.equipos, queryFn: ac.listarEquipos });
}
export function useCrearEquipo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { nombre_equipo: string; empresa_id?: number }) => ac.crearEquipo(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.equipos }),
  });
}
export function useEliminarEquipo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ac.eliminarEquipo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.equipos }),
  });
}
export function useAgregarMiembroEquipo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      empleado_id: number;
      equipo_id: number;
      cargo?: string | null;
      es_lider?: boolean;
    }) => ac.agregarMiembroEquipo(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.equipos }),
  });
}
export function useQuitarMiembroEquipo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ empleado_id, equipo_id }: { empleado_id: number; equipo_id: number }) =>
      ac.quitarMiembroEquipo(empleado_id, equipo_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.equipos }),
  });
}

// ── Empleados ────────────────────────────────────────────────────────
export function useEmpleados() {
  return useQuery({ queryKey: qk.empleados, queryFn: ac.listarEmpleados });
}
export function useCrearEmpleado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      nombre: string;
      correo?: string | null;
      telefono?: string | null;
      empresa_id?: number;
    }) => ac.crearEmpleado(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.empleados }),
  });
}
export function useActualizarEmpleado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Tablas["empleados"]["Update"] }) =>
      ac.actualizarEmpleado(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.empleados }),
  });
}
export function useEliminarEmpleado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ac.eliminarEmpleado(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.empleados }),
  });
}

// ── Referencia ───────────────────────────────────────────────────────
export function useRoles() {
  return useQuery({ queryKey: qk.roles, queryFn: ac.listarRoles });
}
export function useEmpresa() {
  return useQuery({ queryKey: qk.empresa, queryFn: ac.obtenerEmpresa });
}
