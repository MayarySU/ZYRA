import { test, expect } from "./support/test";
import {
  getEmpresaId,
  createCliente,
  createEquipo,
} from "./support/factory";

test.describe("Creación de proyecto (admin por UI)", () => {
  test("el admin crea un proyecto con cliente/servicio/equipo y se genera el checklist", async ({
    page,
    service,
    state,
    loginAsAdmin,
  }) => {
    const empresaId = await getEmpresaId(service);
    const clienteNombre = `${state.prefix} Cliente UI`;
    const equipoNombre = `${state.prefix} Equipo UI`;
    await createCliente(service, empresaId, clienteNombre);
    await createEquipo(service, empresaId, equipoNombre);
    const proyectoNombre = `${state.prefix} Proyecto UI`;

    await loginAsAdmin(page);
    await page.goto("/projects");

    await page.getByRole("button", { name: "Nuevo Proyecto" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.locator("input").first().fill(proyectoNombre);

    const combos = dialog.getByRole("combobox");
    await combos.nth(0).click();
    await page.getByRole("option", { name: clienteNombre, exact: true }).click();

    await combos.nth(1).click();
    await page.getByRole("option", { name: "Instalación Residencial", exact: true }).click();

    await combos.nth(2).click();
    await page.getByRole("option", { name: equipoNombre, exact: true }).click();

    await dialog.getByRole("button", { name: "Crear" }).click();

    // La tarjeta aparece en el listado.
    await expect(page.getByText(proyectoNombre, { exact: true })).toBeVisible();

    // El checklist se generó y el proyecto pasó a "checklist_pendiente".
    let proyectoId = 0;
    await expect
      .poll(
        async () => {
          const { data } = await service
            .from("proyectos")
            .select("id_proyecto, estado")
            .eq("nombre_proyecto", proyectoNombre)
            .maybeSingle();
          if (!data) return "no-existe";
          proyectoId = data.id_proyecto as number;
          return data.estado as string;
        },
        { timeout: 20_000 }
      )
      .toBe("checklist_pendiente");

    const { data: checklist } = await service
      .from("checklists")
      .select("id_checklist, estado")
      .eq("proyecto_id", proyectoId)
      .maybeSingle();
    expect(checklist).not.toBeNull();
    expect(checklist?.estado).toBe("pendiente");

    const { count } = await service
      .from("checklist_detalle")
      .select("id_checklist_detalle", { count: "exact", head: true })
      .eq("checklist_id", checklist!.id_checklist as number);
    expect(count ?? 0).toBeGreaterThan(0);
  });
});
