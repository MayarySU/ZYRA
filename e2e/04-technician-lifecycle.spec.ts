import { test, expect } from "./support/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "./support/env";
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
  reportarAvance,
  finalizarProyecto,
  op,
} from "./support/factory";

const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

test.describe("Ciclo de vida del proyecto (técnico → admin)", () => {
  test("checklist, inicio, evidencia, reporte, aprobación y cierre con puntos", async ({
    page,
    browser,
    service,
    admin,
    state,
    loginAsTech,
    loginAs,
  }) => {
    const prefix = state.prefix;
    const empresaId = await getEmpresaId(service);
    const servicioId = await getServicioId(service, "Mantenimiento");
    const clienteId = await createCliente(service, empresaId, `${prefix} Cliente LC`);
    const equipoId = await createEquipo(service, empresaId, `${prefix} Equipo LC`);
    await addEquipoMember(service, equipoId, state.techEmpleadoId, true);

    const asignado = await createProyecto(service, {
      empresaId,
      clienteId,
      servicioId,
      equipoId,
      nombre: `${prefix} Asignado`,
    });
    const ajeno = await createProyecto(service, {
      empresaId,
      clienteId,
      servicioId,
      equipoId: null,
      nombre: `${prefix} Ajeno`,
    });
    await generarChecklist(admin, asignado.id);

    // ── Técnico: sólo ve el proyecto asignado ──────────────────────────
    await loginAsTech(page);
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: "Mis Proyectos", exact: true })).toBeVisible();
    await expect(page.getByText(asignado.nombre, { exact: true })).toBeVisible();
    await expect(page.getByText(ajeno.nombre, { exact: true })).toHaveCount(0);

    // ── Completa el checklist e inicia la jornada ──────────────────────
    await page.getByRole("button", { name: "Iniciar Día" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText(`Reportar - ${asignado.nombre}`)).toBeVisible();

    const checkboxes = sheet.getByRole("checkbox");
    await expect(checkboxes.first()).toBeVisible();
    await expect(checkboxes.first()).toBeEnabled();
    const total = await checkboxes.count();
    expect(total).toBeGreaterThan(0);
    for (let i = 0; i < total; i++) {
      await checkboxes.nth(i).click();
    }

    // Espera a que los cambios del checklist se confirmen en la base de datos.
    const { data: chk } = await service
      .from("checklists")
      .select("id_checklist")
      .eq("proyecto_id", asignado.id)
      .single();
    await expect
      .poll(async () => {
        const { count } = await service
          .from("checklist_detalle")
          .select("id_checklist_detalle", { count: "exact", head: true })
          .eq("checklist_id", chk!.id_checklist as number)
          .eq("marcado", true);
        return count ?? 0;
      }, { timeout: 20_000 })
      .toBe(total);

    const iniciarBtn = sheet.getByRole("button", { name: /CONFIRMAR E INICIAR JORNADA/ });
    await expect(iniciarBtn).toBeEnabled();
    await iniciarBtn.click();

    await expect
      .poll(async () => {
        const { data } = await service
          .from("proyectos")
          .select("estado")
          .eq("id_proyecto", asignado.id)
          .single();
        return data?.estado;
      }, { timeout: 20_000 })
      .toBe("en_proceso");

    // ── Evidencia + reporte ────────────────────────────────────────────
    await page.getByRole("button", { name: "Reportar Avance" }).click();
    const sheet2 = page.getByRole("dialog");
    await expect(sheet2.getByText("Evidencia Fotográfica")).toBeVisible();

    await sheet2.locator('input[type="file"]').setInputFiles({
      name: "e2e.png",
      mimeType: "image/png",
      buffer: PNG_1x1,
    });
    await expect(sheet2.locator("img")).toHaveCount(1);

    await sheet2.getByPlaceholder("Notas de hoy...").fill(`${prefix} avance diario`);
    await sheet2.getByRole("button", { name: /ENVIAR REPORTE Y TERMINAR/ }).click();

    await expect
      .poll(async () => {
        const { data } = await service
          .from("proyectos")
          .select("estado")
          .eq("id_proyecto", asignado.id)
          .single();
        return data?.estado;
      }, { timeout: 30_000 })
      .toBe("pendiente_de_cierre");

    const { count: evidencias } = await service
      .from("evidencias")
      .select("id_evidencia", { count: "exact", head: true })
      .eq("proyecto_id", asignado.id)
      .eq("eliminado", false);
    expect(evidencias ?? 0).toBeGreaterThanOrEqual(1);

    const { data: reporte } = await service
      .from("reportes")
      .select("id_reporte, estado")
      .eq("proyecto_id", asignado.id)
      .order("fecha_reporte", { ascending: false })
      .limit(1)
      .maybeSingle();
    expect(reporte).not.toBeNull();
    expect(reporte?.estado).toBe("pendiente");

    // ── Admin aprueba el reporte desde la UI ───────────────────────────
    const adminCtx = await browser.newContext();
    try {
      const adminPage = await adminCtx.newPage();
      await loginAs(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD);
      await adminPage.goto("/reports");
      const card = adminPage.getByText(asignado.nombre, { exact: true }).first();
      await expect(card).toBeVisible();
      await card.click();
      const dialog = adminPage.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "APROBAR" }).click();
    } finally {
      await adminCtx.close();
    }

    await expect
      .poll(async () => {
        const { data } = await service
          .from("reportes")
          .select("estado")
          .eq("id_reporte", reporte!.id_reporte)
          .single();
        return data?.estado;
      }, { timeout: 20_000 })
      .toBe("aprobado");

    // ── Admin finaliza (RPC, idempotente) ──────────────────────────────
    const finalizado = await finalizarProyecto(admin, asignado.id);
    expect(finalizado).toBeTruthy();

    await expect
      .poll(async () => {
        const { data } = await service
          .from("proyectos")
          .select("estado")
          .eq("id_proyecto", asignado.id)
          .single();
        return data?.estado;
      })
      .toBe("finalizado");

    // Reporte final generado + puntos otorgados al equipo.
    const { count: finales } = await service
      .from("reportes")
      .select("id_reporte", { count: "exact", head: true })
      .eq("proyecto_id", asignado.id)
      .eq("es_final", true);
    expect(finales ?? 0).toBe(1);

    const { count: puntos } = await service
      .from("puntos_historial")
      .select("id_punto", { count: "exact", head: true })
      .eq("proyecto_id", asignado.id);
    expect(puntos ?? 0).toBeGreaterThanOrEqual(1);

    // Reintento idempotente: no duplica el reporte final.
    const reintento = await finalizarProyecto(admin, asignado.id);
    expect((reintento as { ya_finalizado?: boolean })?.ya_finalizado).toBe(true);
    const { count: finales2 } = await service
      .from("reportes")
      .select("id_reporte", { count: "exact", head: true })
      .eq("proyecto_id", asignado.id)
      .eq("es_final", true);
    expect(finales2 ?? 0).toBe(1);
  });

  test("avances por API: idempotencia y transiciones inválidas", async ({ service, admin, state }) => {
    const empresaId = await getEmpresaId(service);
    const servicioId = await getServicioId(service, "Mantenimiento");
    const clienteId = await createCliente(service, empresaId, `${state.prefix} Cliente API`);
    const equipoId = await createEquipo(service, empresaId, `${state.prefix} Equipo API`);
    await addEquipoMember(service, equipoId, state.techEmpleadoId, true);
    const p = await createProyecto(service, {
      empresaId,
      clienteId,
      servicioId,
      equipoId,
      nombre: `${state.prefix} API`,
    });

    const { id_checklist } = await generarChecklist(admin, p.id);
    await marcarChecklistCompleto(admin, id_checklist, state.techEmpleadoId);
    await validarChecklist(admin, id_checklist);
    await iniciarProyecto(admin, p.id);

    // Idempotencia: mismo operation_id ⇒ un solo avance.
    const opId = op();
    await reportarAvance(admin, p.id, "primer avance", 40, opId);
    await reportarAvance(admin, p.id, "primer avance", 40, opId);
    const { count } = await service
      .from("avances")
      .select("id_avance", { count: "exact", head: true })
      .eq("proyecto_id", p.id);
    expect(count ?? 0).toBe(1);

    // Transición inválida: en_proceso → finalizado (no permitida).
    const { error } = await admin.rpc("avanzar_estado", {
      p_proyecto_id: p.id,
      p_nuevo_estado: "finalizado",
      p_operation_id: op(),
    });
    expect(error).not.toBeNull();
  });
});
