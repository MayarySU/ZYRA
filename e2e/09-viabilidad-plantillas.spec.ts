import type { Locator, Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { test, expect, TECH_EMAIL, TECH_PASSWORD } from "./support/test";
import { signIn } from "./support/supabase";
import { getEmpresaId } from "./support/factory";
import {
  crearProyectoViabilidad,
  setAplicabilidad,
  crearRevision,
  revisionPlantilla,
} from "./support/viabilidad";

// ─────────────────────────────────────────────────────────────────────
// Utilidades locales
// ─────────────────────────────────────────────────────────────────────
const NOMBRE_PLANTILLA = (prefix: string) => `${prefix} Plantilla Previabilidad`;

/** Crea (idempotente) un servicio dedicado para no tocar las plantillas seed. */
async function ensureServicioPlantillas(
  service: SupabaseClient,
  prefix: string
): Promise<{ id: number; tipo: string }> {
  const tipo = `${prefix} Servicio Plantillas`;
  const { data } = await service
    .from("servicios")
    .select("id_servicio")
    .eq("tipo", tipo)
    .maybeSingle();
  if (data) return { id: data.id_servicio as number, tipo };
  const empresaId = await getEmpresaId(service);
  const { data: ins, error } = await service
    .from("servicios")
    .insert({ tipo, descripcion: "Servicio E2E plantillas", empresa_id: empresaId })
    .select("id_servicio")
    .single();
  if (error || !ins) throw new Error(`No se pudo crear el servicio: ${error?.message}`);
  return { id: ins.id_servicio as number, tipo };
}

async function plantillaPorNombre(
  service: SupabaseClient,
  nombre: string
): Promise<{ id: number; estado: string; version: number } | null> {
  const { data, error } = await service
    .from("viabilidad_plantillas")
    .select("id_plantilla_viabilidad, estado, version")
    .eq("nombre", nombre)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id_plantilla_viabilidad as number,
    estado: data.estado as string,
    version: data.version as number,
  };
}

async function pickCombobox(
  page: Page,
  dialog: Locator,
  index: number,
  optionName: string | RegExp
): Promise<void> {
  await dialog.getByRole("combobox").nth(index).click();
  await page.getByRole("option", { name: optionName }).click();
}

test.describe.serial("Viabilidad · Editor de plantillas (admin)", () => {
  test("crea estructura, valida y publica una plantilla (UI)", async ({
    page,
    service,
    admin,
    state,
    loginAsAdmin,
  }) => {
    const { tipo } = await ensureServicioPlantillas(service, state.prefix);
    const nombre = NOMBRE_PLANTILLA(state.prefix);

    await loginAsAdmin(page);
    await page.goto("/settings/viabilidad/plantillas");

    // Crear plantilla (borrador) para el servicio dedicado.
    await page.getByRole("button", { name: "Nueva plantilla" }).click();
    let dialog = page.getByRole("dialog");
    await pickCombobox(page, dialog, 0, tipo);
    await dialog.getByRole("textbox").fill(nombre);
    await dialog.getByRole("button", { name: "Guardar" }).click();

    await page.waitForURL(/\/settings\/viabilidad\/plantillas\/\d+$/);
    await expect(page.getByText("Borrador", { exact: true })).toBeVisible();

    // Sección.
    await page.getByRole("button", { name: "Añadir sección" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").nth(0).fill("Sección E2E");
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Sección E2E")).toBeVisible();

    // Pregunta booleana P1.
    await page.getByRole("button", { name: "Añadir pregunta" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").nth(0).fill("P1");
    await dialog.getByRole("textbox").nth(1).fill("¿Pregunta 1?");
    await dialog.getByRole("button", { name: "Guardar" }).click();

    // Pregunta booleana P2.
    await page.getByRole("button", { name: "Añadir pregunta" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").nth(0).fill("P2");
    await dialog.getByRole("textbox").nth(1).fill("¿Pregunta 2?");
    await dialog.getByRole("button", { name: "Guardar" }).click();

    // Pregunta de opción única P3 + una opción.
    await page.getByRole("button", { name: "Añadir pregunta" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").nth(0).fill("P3");
    await dialog.getByRole("textbox").nth(1).fill("¿Opción?");
    await pickCombobox(page, dialog, 0, "Opción única");
    await dialog.getByRole("button", { name: "Guardar" }).click();

    await page.getByRole("button", { name: "Añadir opción" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").nth(0).fill("a");
    await dialog.getByRole("textbox").nth(1).fill("Opción A");
    await dialog.getByRole("button", { name: "Guardar" }).click();

    // Condición sobre la primera pregunta, dependiente de P2.
    await page.getByRole("button", { name: "Añadir condición" }).first().click();
    dialog = page.getByRole("dialog");
    await pickCombobox(page, dialog, 0, "P2");
    await dialog.getByRole("textbox").fill("true");
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText(/P2 = true/)).toBeVisible();

    // Validar y publicar.
    await page.getByRole("button", { name: "Validar" }).click();
    await expect(
      page
        .getByRole("main")
        .getByText("La plantilla es válida y puede publicarse.")
    ).toBeVisible();

    await page.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByText("Activa", { exact: true })).toBeVisible();

    // Verificación en BD.
    const p = await plantillaPorNombre(service, nombre);
    expect(p?.estado).toBe("activa");
    expect(p?.version).toBe(1);

    // La estructura quedó persistida.
    const { count } = await service
      .from("viabilidad_secciones")
      .select("id_seccion_viabilidad", { count: "exact", head: true })
      .eq("plantilla_id", plantillaPorNombre && (await plantillaPorNombre(service, nombre))!.id);
    expect(count).toBe(1);

    void admin;
  });

  test("versiona N+1 y conserva la revisión histórica sobre la plantilla original", async ({
    page,
    service,
    admin,
    state,
    loginAsAdmin,
  }) => {
    const { tipo } = await ensureServicioPlantillas(service, state.prefix);
    const nombre = NOMBRE_PLANTILLA(state.prefix);
    const v1 = await plantillaPorNombre(service, nombre);
    if (!v1) throw new Error("Falta la plantilla publicada en la prueba anterior");

    // Proyecto dedicado + revisión que fija la plantilla activa (v1).
    const { proyecto } = await crearProyectoViabilidad(
      service,
      state.prefix,
      "Proyecto Historico",
      state.techEmpleadoId,
      tipo
    );
    await setAplicabilidad(admin, proyecto.id, true, false);
    const rev = await crearRevision(admin, proyecto.id, "previabilidad");
    expect(await revisionPlantilla(admin, rev.id)).toBe(v1.id);

    // Clonar (crear versión N+1) por la UI.
    await loginAsAdmin(page);
    await page.goto(`/settings/viabilidad/plantillas/${v1.id}`);
    await page.getByRole("button", { name: "Crear versión" }).click();
    await page.waitForURL(
      new RegExp(`/settings/viabilidad/plantillas/(?!${v1.id}$)\\d+$`)
    );
    await expect(page.getByRole("main").getByText("Borrador")).toBeVisible();

    const v2 = await plantillaPorNombre(service, NOMBRE_PLANTILLA(state.prefix));
    expect(v2?.version).toBe(v1.version + 1);
    expect(v2?.estado).toBe("borrador");

    // Publicar v2 → archiva v1.
    await page.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByText("Activa").first()).toBeVisible();

    // La revisión histórica sigue apuntando a la plantilla original (v1).
    expect(await revisionPlantilla(admin, rev.id)).toBe(v1.id);

    const { data: v1db } = await service
      .from("viabilidad_plantillas")
      .select("estado")
      .eq("id_plantilla_viabilidad", v1.id)
      .single();
    expect(v1db?.estado).toBe("archivada");

    // v1 queda en solo lectura (histórica).
    await page.goto(`/settings/viabilidad/plantillas/${v1.id}`);
    await expect(
      page.getByText("Versión archivada: solo lectura (histórica).")
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Publicar" })).toHaveCount(0);
  });

  test("rechaza publicar inválida, permite editar/eliminar en borrador y bloquea la estructura publicada", async ({
    page,
    service,
    admin,
    state,
    loginAsAdmin,
  }) => {
    const { tipo } = await ensureServicioPlantillas(service, state.prefix);
    const nombre = `${state.prefix} Plantilla Inválida`;

    await loginAsAdmin(page);
    await page.goto("/settings/viabilidad/plantillas");

    await page.getByRole("button", { name: "Nueva plantilla" }).click();
    let dialog = page.getByRole("dialog");
    await pickCombobox(page, dialog, 0, tipo);
    await dialog.getByRole("textbox").fill(nombre);
    await dialog.getByRole("button", { name: "Guardar" }).click();

    await page.waitForURL(/\/settings\/viabilidad\/plantillas\/\d+$/);
    const id = Number(page.url().match(/plantillas\/(\d+)$/)?.[1]);

    // Publicar sin estructura → rechazo real del servidor (no sólo UI),
    // reflejado en el panel de errores de validación dentro de <main>.
    await page.getByRole("button", { name: "Publicar" }).click();
    await expect(
      page.getByRole("main").getByText("La plantilla no tiene secciones")
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByText("Borrador", { exact: true })
    ).toBeVisible();

    const pInv = await plantillaPorNombre(service, nombre);
    expect(pInv?.estado).toBe("borrador");

    // Estructura válida mínima: una sección con dos preguntas booleanas.
    await page.getByRole("button", { name: "Añadir sección" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").nth(0).fill("Sección 1");
    await dialog.getByRole("button", { name: "Guardar" }).click();

    for (const [codigo, texto] of [
      ["P1", "¿Pregunta 1?"],
      ["P2", "¿Pregunta 2?"],
    ] as const) {
      await page.getByRole("button", { name: "Añadir pregunta" }).click();
      dialog = page.getByRole("dialog");
      await dialog.getByRole("textbox").nth(0).fill(codigo);
      await dialog.getByRole("textbox").nth(1).fill(texto);
      await dialog.getByRole("button", { name: "Guardar" }).click();
    }

    // Editar un elemento existente en borrador y comprobar persistencia.
    const cardP1 = page.locator("div.rounded-md.border").filter({ hasText: "P1" });
    await cardP1.getByRole("button", { name: "Editar" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").nth(1).fill("¿Pregunta editada?");
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(
      page.getByRole("main").getByText("¿Pregunta editada?")
    ).toBeVisible();

    // Eliminar un elemento permitido (borrador) y comprobar persistencia en BD.
    const cardP2 = page.locator("div.rounded-md.border").filter({ hasText: "P2" });
    page.once("dialog", (d) => void d.accept());
    await cardP2.getByRole("button", { name: "Eliminar" }).click();
    await expect(cardP2).toHaveCount(0);

    const { data: secs } = await service
      .from("viabilidad_secciones")
      .select("id_seccion_viabilidad")
      .eq("plantilla_id", id);
    const seccionIds = (secs ?? []).map(
      (s) => s.id_seccion_viabilidad as number
    );
    const { data: preguntas } = await service
      .from("viabilidad_preguntas")
      .select("codigo, texto")
      .in("seccion_id", seccionIds);
    expect(preguntas).toHaveLength(1);
    expect(preguntas?.[0]?.codigo).toBe("P1");
    expect(preguntas?.[0]?.texto).toBe("¿Pregunta editada?");

    // Publicar válida.
    await page.getByRole("button", { name: "Validar" }).click();
    await expect(
      page
        .getByRole("main")
        .getByText("La plantilla es válida y puede publicarse.")
    ).toBeVisible();
    await page.getByRole("button", { name: "Publicar" }).click();
    await expect(
      page.getByRole("main").getByText("Activa", { exact: true })
    ).toBeVisible();
    expect((await plantillaPorNombre(service, nombre))?.estado).toBe("activa");

    // UI: con la plantilla publicada desaparecen las acciones de edición.
    await expect(
      page.getByRole("button", { name: "Añadir sección" })
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Editar" })).toHaveCount(0);

    // Servidor: la estructura publicada es inmutable aunque se intente insertar
    // directamente (autorizado por RLS, bloqueado por trigger de la BD).
    const { error: insErr } = await admin.from("viabilidad_secciones").insert({
      plantilla_id: id,
      titulo: "Sección intrusa",
      orden: 99,
    });
    expect(insErr?.message ?? "").toMatch(/inmutable/i);

    const { error: delErr } = await admin
      .from("viabilidad_preguntas")
      .delete()
      .in("seccion_id", seccionIds);
    expect(delErr?.message ?? "").toMatch(/inmutable/i);
  });

  test("un técnico no administrador no puede gestionar plantillas (UI + servidor)", async ({
    page,
    state,
    loginAsTech,
  }) => {
    // UI: la ruta muestra acceso restringido y no ofrece acciones de gestión.
    await loginAsTech(page);
    await page.goto("/settings/viabilidad/plantillas");
    await expect(page.getByText("Acceso restringido")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Nueva plantilla" })
    ).toHaveCount(0);

    // Servidor: el RPC de gestión rechaza al no-admin (barrera distinta de la UI).
    const tech = await signIn(TECH_EMAIL, TECH_PASSWORD);
    const { error } = await tech.rpc("crear_plantilla_viabilidad", {
      p_empresa_id: 1,
      p_servicio_id: null,
      p_tipo_etapa: "previabilidad",
      p_nombre: `${state.prefix} Tech Denegada`,
    });
    expect(error?.message ?? "").toMatch(/administrador/i);

    const { error: insErr } = await tech
      .from("viabilidad_plantillas")
      .insert({
        empresa_id: 1,
        servicio_id: null,
        tipo_etapa: "previabilidad",
        version: 1,
        nombre: `${state.prefix} Tech Directa`,
        estado: "borrador",
      });
    expect(insErr).not.toBeNull();
  });
});
