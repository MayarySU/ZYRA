import { expect, type Locator, type Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getEmpresaId,
  getServicioId,
  createCliente,
  createEquipo,
  addEquipoMember,
  createProyecto,
  generarChecklist,
  marcarChecklistCompleto,
  validarChecklist,
  iniciarProyecto,
} from "./factory";

async function baseProyecto(
  service: SupabaseClient,
  prefix: string,
  sufijo: string,
  techEmpleadoId: number
) {
  const empresaId = await getEmpresaId(service);
  const servicioId = await getServicioId(service, "Mantenimiento");
  const clienteId = await createCliente(service, empresaId, `${prefix} Cliente ${sufijo}`);
  const equipoId = await createEquipo(service, empresaId, `${prefix} Equipo ${sufijo}`);
  await addEquipoMember(service, equipoId, techEmpleadoId, true);
  return createProyecto(service, {
    empresaId,
    clienteId,
    servicioId,
    equipoId,
    nombre: `${prefix} ${sufijo}`,
  });
}

/** Genera el checklist, lo deja completo y lo valida (`listo_para_iniciar`). */
async function checklistListo(
  admin: SupabaseClient,
  proyectoId: number,
  techEmpleadoId: number
) {
  const checklist = await generarChecklist(admin, proyectoId);
  await marcarChecklistCompleto(admin, checklist.id_checklist, techEmpleadoId);
  await validarChecklist(admin, checklist.id_checklist);
  return checklist;
}

/** Crea un proyecto con checklist completo, validado e iniciado (`en_proceso`). */
export async function proyectoEnProceso(
  service: SupabaseClient,
  admin: SupabaseClient,
  techEmpleadoId: number,
  prefix: string,
  sufijo: string
) {
  const proyecto = await baseProyecto(service, prefix, sufijo, techEmpleadoId);
  await checklistListo(admin, proyecto.id, techEmpleadoId);
  await iniciarProyecto(admin, proyecto.id);
  return proyecto;
}

/** Crea un proyecto con checklist completo y validado, SIN iniciar (`listo_para_iniciar`). */
export async function proyectoListoParaIniciar(
  service: SupabaseClient,
  admin: SupabaseClient,
  techEmpleadoId: number,
  prefix: string,
  sufijo: string
) {
  const proyecto = await baseProyecto(service, prefix, sufijo, techEmpleadoId);
  await checklistListo(admin, proyecto.id, techEmpleadoId);
  return proyecto;
}

/** Abre la hoja del técnico limitada a la tarjeta que tiene el botón dado. */
export async function abrirSheet(
  page: Page,
  nombreProyecto: string,
  etiquetaBoton: string
): Promise<Locator> {
  const name = page.getByText(nombreProyecto, { exact: true }).first();
  await expect(name).toBeVisible();
  // Sube al contenedor (la Card) que además contiene el botón de acción.
  const card = name.locator(
    `xpath=ancestor::div[.//button[contains(normalize-space(.), "${etiquetaBoton}")]][1]`
  );
  const btn = card.getByRole("button", { name: etiquetaBoton });
  await expect(btn).toHaveCount(1);
  await btn.click();
  return page.getByRole("dialog");
}

/** Abre la hoja de reporte (`en_proceso`). */
export function abrirSheetReportar(page: Page, nombreProyecto: string): Promise<Locator> {
  return abrirSheet(page, nombreProyecto, "Reportar Avance");
}

/** Abre la hoja de pre-inicio (`listo_para_iniciar`): materiales + iniciar jornada. */
export function abrirSheetDia(page: Page, nombreProyecto: string): Promise<Locator> {
  return abrirSheet(page, nombreProyecto, "Iniciar Día");
}

export { iniciarProyecto };
