/**
 * Tipos de la base de datos Supabase.
 *
 * `types.generated.ts` es autogenerado con:
 *   npx supabase gen types typescript --db-url $DATABASE_URL --schema public
 * No editar a mano. Este archivo solo reexpone alias cómodos.
 */
import type { Database } from "./types.generated";

export type { Database };

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"];

/** Filas de las vistas derivadas. */
export type ProyectoVista = Views<"v_proyectos">;
export type ChecklistDetalleVista = Views<"v_checklist_detalle">;
