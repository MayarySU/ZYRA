import { test, expect } from "./support/test";
import { proyectoEnProceso, abrirSheetReportar } from "./support/projects";
import type { Page } from "@playwright/test";

const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

/** Nº de evidencias encoladas en Dexie (`zyra-offline.evidencias_pendientes`). */
async function queuedEvidenceCount(page: Page): Promise<number> {
  try {
    return await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const req = indexedDB.open("zyra-offline");
          req.onerror = () => resolve(0);
          req.onsuccess = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains("evidencias_pendientes")) {
              db.close();
              resolve(0);
              return;
            }
            const tx = db.transaction("evidencias_pendientes", "readonly");
            const count = tx.objectStore("evidencias_pendientes").count();
            count.onsuccess = () => {
              db.close();
              resolve(count.result);
            };
            count.onerror = () => {
              db.close();
              resolve(0);
            };
          };
        })
    );
  } catch {
    // La página puede estar navegando (p.ej. al reconectar): reintentar.
    return -1;
  }
}

test.describe("Offline-First (Dexie + reconexión)", () => {  test("evidencia capturada sin conexión persiste tras recargar y se sube al reconectar", async ({
    page,
    service,
    admin,
    state,
    loginAsTech,
  }) => {
    const prefix = state.prefix;
    const proyecto = await proyectoEnProceso(
      service,
      admin,
      state.techEmpleadoId,
      prefix,
      "Offline Reload"
    );

    await loginAsTech(page);
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: "Mis Proyectos", exact: true })).toBeVisible();
    await expect(page.getByText(proyecto.nombre, { exact: true })).toBeVisible();

    // Espera a que el service worker controle la página (necesario para
    // recargar sin conexión más adelante).
    await page.waitForFunction(
      async () => {
        const reg = await navigator.serviceWorker.ready;
        return !!reg.active && !!navigator.serviceWorker.controller;
      },
      undefined,
      { timeout: 30_000 }
    );

    await abrirSheetReportar(page, proyecto.nombre);
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText("Evidencia Fotográfica")).toBeVisible();

    // ── Sin conexión ────────────────────────────────────────────────────
    await page.context().setOffline(true);

    await sheet.locator('input[type="file"]').setInputFiles({
      name: "offline.png",
      mimeType: "image/png",
      buffer: PNG_1x1,
    });
    await expect(sheet.locator("img")).toHaveCount(1);
    await sheet.getByPlaceholder("Notas de hoy...").fill(`${prefix} capturado offline`);
    await sheet.getByRole("button", { name: /ENVIAR REPORTE Y TERMINAR/ }).click();

    // 1) La evidencia queda encolada en Dexie (IndexedDB).
    await expect.poll(() => queuedEvidenceCount(page), { timeout: 15_000 }).toBeGreaterThanOrEqual(1);

    // 2) Recargar sin conexión: la cola persiste (IndexedDB, no memoria).
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect
      .poll(async () => queuedEvidenceCount(page), { timeout: 30_000 })
      .toBeGreaterThanOrEqual(1);

    // 3) Sin conexión no hay evidencia en la base de datos.
    const { count: antes } = await service
      .from("evidencias")
      .select("id_evidencia", { count: "exact", head: true })
      .eq("proyecto_id", proyecto.id);
    expect(antes ?? 0).toBe(0);

    // ── Reconexión: se vacía la cola de evidencias ──────────────────────
    await page.context().setOffline(false);
    await page.waitForLoadState("domcontentloaded").catch(() => {});

    await expect.poll(() => queuedEvidenceCount(page), { timeout: 30_000 }).toBe(0);

    await expect
      .poll(async () => {
        const { count } = await service
          .from("evidencias")
          .select("id_evidencia", { count: "exact", head: true })
          .eq("proyecto_id", proyecto.id)
          .eq("eliminado", false);
        return count ?? 0;
      }, { timeout: 30_000 })
      .toBeGreaterThanOrEqual(1);

    const { data: evidencia } = await service
      .from("evidencias")
      .select("object_key")
      .eq("proyecto_id", proyecto.id)
      .eq("eliminado", false)
      .limit(1)
      .maybeSingle();
    expect(evidencia?.object_key ?? "").toMatch(/^proyectos\//);
  });

  test("mutación de reporte en pausa se reanuda al reconectar (misma sesión)", async ({
    page,
    service,
    admin,
    state,
    loginAsTech,
  }) => {
    const prefix = state.prefix;
    const proyecto = await proyectoEnProceso(
      service,
      admin,
      state.techEmpleadoId,
      prefix,
      "Offline Resume"
    );

    await loginAsTech(page);
    await page.goto("/projects");
    await expect(page.getByText(proyecto.nombre, { exact: true })).toBeVisible();

    await abrirSheetReportar(page, proyecto.nombre);
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText("Evidencia Fotográfica")).toBeVisible();

    // Sin conexión: el reporte queda en pausa (no se envía).
    await page.context().setOffline(true);
    await sheet.getByPlaceholder("Notas de hoy...").fill(`${prefix} reporte offline`);
    await sheet.getByRole("button", { name: /ENVIAR REPORTE Y TERMINAR/ }).click();

    // La mutación queda en pausa: el proyecto sigue en proceso.
    await page.waitForTimeout(1500);
    const { data: enPausa } = await service
      .from("proyectos")
      .select("estado")
      .eq("id_proyecto", proyecto.id)
      .single();
    expect(enPausa?.estado).toBe("en_proceso");

    // Al reconectar (sin recargar) se reanuda la mutación pausada.
    await page.context().setOffline(false);

    await expect
      .poll(async () => {
        const { data } = await service
          .from("proyectos")
          .select("estado")
          .eq("id_proyecto", proyecto.id)
          .single();
        return data?.estado;
      }, { timeout: 30_000 })
      .toBe("pendiente_de_cierre");

    const { count: reportes } = await service
      .from("reportes")
      .select("id_reporte", { count: "exact", head: true })
      .eq("proyecto_id", proyecto.id);
    expect(reportes ?? 0).toBeGreaterThanOrEqual(1);
  });
});
