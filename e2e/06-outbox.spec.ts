import { test, expect } from "./support/test";
import {
  proyectoEnProceso,
  proyectoListoParaIniciar,
  abrirSheetReportar,
  abrirSheetDia,
} from "./support/projects";
import type { Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

interface OutboxRow {
  id: string;
  kind: string;
  estado: string;
  seq: number;
  version?: string;
  ultimoError?: string;
}

/** Operaciones del outbox Dexie (`zyra-offline.outbox`). */
async function outboxEntries(page: Page): Promise<OutboxRow[]> {
  return await page.evaluate(
    () =>
      new Promise<OutboxRow[]>((resolve) => {
        const req = indexedDB.open("zyra-offline");
        req.onerror = () => resolve([]);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains("outbox")) {
            db.close();
            resolve([]);
            return;
          }
          const tx = db.transaction("outbox", "readonly");
          const all = tx.objectStore("outbox").getAll();
          all.onsuccess = () => {
            db.close();
            resolve(
              (all.result as OutboxRow[]).map((r) => ({
                id: r.id,
                kind: r.kind,
                estado: r.estado,
                seq: r.seq,
                version: r.version,
                ultimoError: r.ultimoError,
              }))
            );
          };
          all.onerror = () => {
            db.close();
            resolve([]);
          };
        };
      })
  );
}

async function outboxPendientes(page: Page): Promise<number> {
  try {
    return (await outboxEntries(page)).filter((e) => e.estado === "pendiente").length;
  } catch {
    // Contexto destruido (navegación al reconectar): -1 no satisface ninguna
    // aserción (`>= 1` ni `== 0`), así que el poll simplemente reintenta.
    return -1;
  }
}

/** Nº total de entradas del outbox (incluye las marcadas como conflicto). */
async function outboxTotal(page: Page): Promise<number> {
  try {
    return (await outboxEntries(page)).length;
  } catch {
    return -1;
  }
}

/** Espera a que el service worker controle la página (recarga offline). */
async function esperarServiceWorker(page: Page) {
  await page.waitForFunction(
    async () => {
      const reg = await navigator.serviceWorker.ready;
      return !!reg.active && !!navigator.serviceWorker.controller;
    },
    undefined,
    { timeout: 30_000 }
  );
}

/** Nº de filas de detalle con `marcado = esperado` para el proyecto. */
async function contarMarcado(
  service: SupabaseClient,
  proyectoId: number,
  esperado: boolean
): Promise<number | null> {
  try {
    const { count, error } = await service
      .from("v_checklist_detalle")
      .select("id_checklist_detalle", { count: "exact", head: true })
      .eq("proyecto_id", proyectoId)
      .eq("marcado", esperado);
    if (error) throw new Error(error.message);
    return count ?? 0;
  } catch {
    return null;
  }
}

test.describe("Outbox persistente (Dexie) + sincronización tras recarga", () => {
  test("reporte guardado sin conexión sobrevive a la recarga y se sincroniza solo al reconectar", async ({
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
      "Outbox Reporte"
    );

    await loginAsTech(page);
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: "Mis Proyectos", exact: true })).toBeVisible();
    await expect(page.getByText(proyecto.nombre, { exact: true })).toBeVisible();
    await esperarServiceWorker(page);

    const sheet = await abrirSheetReportar(page, proyecto.nombre);
    await expect(sheet.getByText("Evidencia Fotográfica")).toBeVisible();

    // ── Sin conexión: el reporte se guarda en el outbox Dexie ──────────
    await page.context().setOffline(true);
    await sheet.getByPlaceholder("Notas de hoy...").fill(`${prefix} reporte outbox`);
    await sheet.getByRole("button", { name: /ENVIAR REPORTE Y TERMINAR/ }).click();

    await expect.poll(() => outboxPendientes(page), { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
    expect((await outboxEntries(page)).some((e) => e.kind === "enviar-reporte")).toBe(true);

    // El servidor sigue sin el reporte (el proyecto no ha avanzado).
    const { data: antes } = await service
      .from("proyectos")
      .select("estado")
      .eq("id_proyecto", proyecto.id)
      .single();
    expect(antes?.estado).toBe("en_proceso");

    // ── Recargar SIN conexión: el outbox persiste en IndexedDB ─────────
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect.poll(() => outboxPendientes(page), { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
    await expect(page.getByText(proyecto.nombre, { exact: true })).toBeVisible();
    const { data: aunOffline } = await service
      .from("proyectos")
      .select("estado")
      .eq("id_proyecto", proyecto.id)
      .single();
    expect(aunOffline?.estado).toBe("en_proceso");

    // ── Reconectar: el outbox se drena solo (sin intervención manual) ──
    await page.context().setOffline(false);

    await expect.poll(() => outboxPendientes(page), { timeout: 45_000 }).toBe(0);
    await expect
      .poll(async () => {
        const { data } = await service
          .from("proyectos")
          .select("estado")
          .eq("id_proyecto", proyecto.id)
          .single();
        return data?.estado;
      }, { timeout: 45_000 })
      .toBe("pendiente_de_cierre");

    const { count: reportes } = await service
      .from("reportes")
      .select("id_reporte", { count: "exact", head: true })
      .eq("proyecto_id", proyecto.id);
    expect(reportes ?? 0).toBeGreaterThanOrEqual(1);
    // Tras el éxito confirmado, la operación desaparece del outbox.
    await expect.poll(() => outboxTotal(page), { timeout: 45_000 }).toBe(0);
  });

  test("edición de checklist sin conexión persiste tras la recarga y sincroniza al reconectar", async ({
    page,
    service,
    admin,
    state,
    loginAsTech,
  }) => {
    const prefix = state.prefix;
    const proyecto = await proyectoListoParaIniciar(
      service,
      admin,
      state.techEmpleadoId,
      prefix,
      "Outbox Checklist"
    );

    await loginAsTech(page);
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: "Mis Proyectos", exact: true })).toBeVisible();
    await expect(page.getByText(proyecto.nombre, { exact: true })).toBeVisible();
    await esperarServiceWorker(page);

    const sheet = await abrirSheetDia(page, proyecto.nombre);
    await expect(sheet.getByText("1. Lista de Materiales")).toBeVisible();

    // El checklist está completo: todos los materiales vienen marcados.
    const cajas = sheet.getByRole("checkbox");
    await expect(cajas.first()).toBeVisible();
    expect(await cajas.count()).toBeGreaterThan(0);
    await expect(cajas.first()).toBeChecked();

    // ── Sin conexión: desmarcar un material ────────────────────────────
    await page.context().setOffline(true);
    await cajas.first().click();
    await expect(cajas.first()).not.toBeChecked();

    await expect.poll(() => outboxPendientes(page), { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
    expect((await outboxEntries(page)).some((e) => e.kind === "checklist-detalle")).toBe(true);

    // El servidor aún no ha cambiado (no hay ningún detalle desmarcado).
    expect(await contarMarcado(service, proyecto.id, false)).toBe(0);

    // Deja que el persister de TanStack vuelque la caché optimista a Dexie
    // antes de recargar (así el cambio local sobrevive a la recarga).
    await page.waitForTimeout(2000);

    // ── Recargar SIN conexión: outbox y edición local persisten ────────
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText(proyecto.nombre, { exact: true })).toBeVisible();
    const sheet2 = await abrirSheetDia(page, proyecto.nombre);
    await expect(sheet2.getByRole("checkbox").first()).not.toBeChecked();
    await expect.poll(() => outboxPendientes(page), { timeout: 30_000 }).toBeGreaterThanOrEqual(1);

    // ── Reconectar: se aplica la edición y se vacía el outbox ──────────
    await page.context().setOffline(false);

    await expect
      .poll(async () => contarMarcado(service, proyecto.id, false), { timeout: 45_000 })
      .toBeGreaterThanOrEqual(1);
    await expect.poll(() => outboxTotal(page), { timeout: 45_000 }).toBe(0);
  });
});
