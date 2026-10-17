import type { Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { test, expect } from "./support/test";
import { signIn } from "./support/supabase";
import {
  ensureTechnician,
  generarChecklist,
  marcarChecklistCompleto,
  validarChecklist,
  iniciarProyecto,
  getEmpresaId,
  getServicioId,
  createCliente,
  createProyecto,
} from "./support/factory";
import {
  adjuntarEvidencia,
  adjuntarEvidenciasRequeridas,
  crearProyectoViabilidad,
  crearRevision,
  entregar,
  ESPECIALISTA_PASSWORD,
  especialistaEmail,
  estadoProyecto,
  getRevision,
  preguntaPorCodigo,
  responder,
  responderTodo,
  resolverValidacion,
  revisionPlantilla,
  rpcError,
  setAplicabilidad,
  asignarEspecialista,
  type ProyectoViabilidad,
} from "./support/viabilidad";
import type { E2EState } from "./support/state";

const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

// ─────────────────────────────────────────────────────────────────────
// Utilidades locales
// ─────────────────────────────────────────────────────────────────────

/** Cuenta filas de un almacén de IndexedDB (`zyra-offline`). */
async function idbCount(page: Page, store: string): Promise<number> {
  try {
    return await page.evaluate(
      (s) =>
        new Promise<number>((resolve) => {
          const req = indexedDB.open("zyra-offline");
          req.onerror = () => resolve(0);
          req.onsuccess = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(s)) {
              db.close();
              resolve(0);
              return;
            }
            const tx = db.transaction(s, "readonly");
            const c = tx.objectStore(s).count();
            c.onsuccess = () => {
              db.close();
              resolve(c.result);
            };
            c.onerror = () => {
              db.close();
              resolve(0);
            };
          };
        }),
      store
    );
  } catch {
    return -1;
  }
}

/** Proyecto de viabilidad + aplicabilidad + una revisión. */
async function proyectoConRevision(
  service: SupabaseClient,
  admin: SupabaseClient,
  state: E2EState,
  sufijo: string,
  opts: { prev?: boolean; ing?: boolean; etapa?: "previabilidad" | "ingenieria"; asignado?: number | null; servicio?: string } = {}
): Promise<ProyectoViabilidad & { revisionId: number }> {
  const { proyecto, empresaId, servicioId } = await crearProyectoViabilidad(
    service,
    state.prefix,
    sufijo,
    state.techEmpleadoId,
    opts.servicio
  );
  await setAplicabilidad(admin, proyecto.id, opts.prev ?? true, opts.ing ?? false);
  const rev = await crearRevision(admin, proyecto.id, opts.etapa ?? "previabilidad", opts.asignado ?? null);
  return { proyecto, empresaId, servicioId, revisionId: rev.id };
}

/** Entrega la revisión por la UI (botón de cabecera → modal de confirmación). */
async function entregarPorUI(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Entregar revisión" }).first().click();
  const modal = page.locator("div.fixed").filter({ hasText: "¿Entregar la revisión?" });
  await expect(modal).toBeVisible();
  await modal.getByRole("button", { name: "Entregar revisión" }).click();
}

// ─────────────────────────────────────────────────────────────────────
// 1) Aplicabilidad y compuerta (opt-in / fail-closed)
// ─────────────────────────────────────────────────────────────────────
test.describe("Viabilidad · Aplicabilidad y compuerta", () => {
  test("servicios sin viabilidad no se bloquean (opt-in)", async ({ service, admin, state }) => {
    const { proyecto } = await crearProyectoViabilidad(
      service,
      state.prefix,
      "OptIn",
      state.techEmpleadoId
    );

    const { id_checklist } = await generarChecklist(admin, proyecto.id);
    await marcarChecklistCompleto(admin, id_checklist, state.techEmpleadoId);
    await validarChecklist(admin, id_checklist);
    expect(await estadoProyecto(service, proyecto.id)).toBe("listo_para_iniciar");

    await iniciarProyecto(admin, proyecto.id);
    expect(await estadoProyecto(service, proyecto.id)).toBe("en_proceso");

    // Ingeniería sin Previabilidad se rechaza (regla de negocio).
    const err = await rpcError(admin, "establecer_aplicabilidad_viabilidad", {
      p_proyecto_id: proyecto.id,
      p_requiere_previabilidad: false,
      p_requiere_ingenieria: true,
      p_operation_id: undefined,
    });
    expect(err).toContain("Ingeniería requiere Previabilidad");
  });

  test("Previabilidad pendiente bloquea la apertura hasta quedar apta", async ({ service, admin, state }) => {
    const { proyecto } = await crearProyectoViabilidad(
      service,
      state.prefix,
      "Gate",
      state.techEmpleadoId
    );
    await setAplicabilidad(admin, proyecto.id, true, false);

    const { id_checklist } = await generarChecklist(admin, proyecto.id);
    await marcarChecklistCompleto(admin, id_checklist, state.techEmpleadoId);

    const pendiente = await rpcError(admin, "validar_checklist", {
      p_checklist_id: id_checklist,
      p_operation_id: undefined,
    });
    expect(pendiente).toContain("Previabilidad pendiente");
    expect(await estadoProyecto(service, proyecto.id)).not.toBe("listo_para_iniciar");

    const rev = await crearRevision(admin, proyecto.id, "previabilidad");
    await responderTodo(admin, rev.id);
    const entrega = await entregar(admin, rev.id);
    expect(entrega.resultado_evaluacion).toBe("apto");

    await validarChecklist(admin, id_checklist);
    expect(await estadoProyecto(service, proyecto.id)).toBe("listo_para_iniciar");
    await iniciarProyecto(admin, proyecto.id);
    expect(await estadoProyecto(service, proyecto.id)).toBe("en_proceso");
  });

  test("fail-closed: empresa sin plantilla global no puede abrir viabilidad", async ({ service, admin, state }) => {
    // Otra empresa sin plantillas (las globales pertenecen a ESSE Solar), pero
    // usando un servicio real compartido: no debe resolver ninguna plantilla.
    const { data: empresa, error } = await service
      .from("empresas")
      .insert({ nombre: `${state.prefix} SinPlantilla` })
      .select("id_empresa")
      .single();
    expect(error).toBeNull();
    const empresaId = empresa!.id_empresa as number;
    const clienteId = await createCliente(service, empresaId, `${state.prefix} Cliente SinPlantilla`);
    const servicioId = await getServicioId(service, "Instalación Residencial");
    const proyecto = await createProyecto(service, {
      empresaId,
      clienteId,
      servicioId,
      equipoId: null,
      nombre: `${state.prefix} SinPlantilla`,
    });

    try {
      await setAplicabilidad(admin, proyecto.id, true, false);

      const { id_checklist } = await generarChecklist(admin, proyecto.id);
      await marcarChecklistCompleto(admin, id_checklist, state.techEmpleadoId);
      const errValidar = await rpcError(admin, "validar_checklist", {
        p_checklist_id: id_checklist,
        p_operation_id: undefined,
      });
      expect(errValidar).toContain("falta plantilla activa de Previabilidad");

      const errCrear = await rpcError(admin, "crear_revision_viabilidad", {
        p_proyecto_id: proyecto.id,
        p_tipo_etapa: "previabilidad",
        p_asignado_empleado_id: state.techEmpleadoId,
        p_operation_id: undefined,
      });
      expect(errCrear).toContain("Falta plantilla activa");
    } finally {
      await service.from("proyectos").delete().eq("id_proyecto", proyecto.id);
      await service.from("clientes").delete().eq("id_cliente", clienteId);
      await service.from("empresas").delete().eq("id_empresa", empresaId);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2) Previabilidad: inspector completa y entrega (UI)
// ─────────────────────────────────────────────────────────────────────
test.describe("Viabilidad · Previabilidad del inspector", () => {
  test("el inspector asignado ve la revisión y la entrega (apto)", async ({ service, admin, state, page, loginAsTech }) => {
    const { proyecto, revisionId } = await proyectoConRevision(service, admin, state, "PrevUI", {
      asignado: state.techEmpleadoId,
    });
    // Cuestionario completo (para que la entrega esté habilitada).
    await responderTodo(admin, revisionId);

    await loginAsTech(page);
    await page.goto("/viabilidad");
    await expect(page.getByRole("heading", { name: "Viabilidad", exact: true })).toBeVisible();

    const link = page.locator(`a[href="/viabilidad/${revisionId}"]`);
    await expect(link).toBeVisible();
    await expect(link).toContainText(proyecto.nombre);
    await link.click();
    await page.waitForURL(new RegExp(`/viabilidad/${revisionId}$`));

    await entregarPorUI(page);
    await expect(page.getByText("Revisión entregada").first()).toBeVisible({ timeout: 15_000 });

    await expect
      .poll(async () => (await getRevision(service, revisionId)).estado, { timeout: 15_000 })
      .toBe("finalizada");
    const rev = await getRevision(service, revisionId);
    expect(rev.resultado_evaluacion).toBe("apto");
    expect(rev.resultado_final).toBe("apto");
  });

  test("una revisión entregada es inmutable", async ({ service, admin, state }) => {
    const { revisionId } = await proyectoConRevision(service, admin, state, "Inmutable", {
      asignado: state.techEmpleadoId,
    });
    await responderTodo(admin, revisionId);
    const entrega = await entregar(admin, revisionId);
    expect(entrega.estado).toBe("finalizada");

    const plantillaId = await revisionPlantilla(admin, revisionId);
    const obs = await preguntaPorCodigo(admin, plantillaId, "observaciones_generales");

    const errRespuesta = await rpcError(admin, "guardar_respuesta_viabilidad", {
      p_revision_id: revisionId,
      p_pregunta_id: obs.id,
      p_valor: "cambio",
      p_version: null,
      p_operation_id: undefined,
    });
    expect(errRespuesta).toContain("ya fue entregado");

    const errEntrega = await rpcError(admin, "entregar_revision_viabilidad", {
      p_revision_id: revisionId,
      p_operation_id: undefined,
    });
    expect(errEntrega).toContain("no admite entrega");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3) Resultado apto finaliza automáticamente
// ─────────────────────────────────────────────────────────────────────
test.describe("Viabilidad · Resultado apto", () => {
  test("apto finaliza sin obligaciones pendientes", async ({ service, admin, state }) => {
    const { revisionId } = await proyectoConRevision(service, admin, state, "Apto");
    await responderTodo(admin, revisionId);
    const entrega = await entregar(admin, revisionId);
    expect(entrega.resultado_evaluacion).toBe("apto");

    const rev = await getRevision(service, revisionId);
    expect(rev.estado).toBe("finalizada");
    expect(rev.resultado_final).toBe("apto");
    expect(rev.acciones).toHaveLength(0);
    expect(rev.validaciones).toHaveLength(0);
  });

  test("observaciones e informativas no bloquean ni crean obligaciones", async ({ service, admin, state }) => {
    // acceso=callejón estrecho + ancho insuficiente ⇒ observación (no bloquea).
    // es_tarifa_dac / orientacion_techo ⇒ informativas (no bloquean).
    const { revisionId } = await proyectoConRevision(service, admin, state, "Obs");
    await responderTodo(admin, revisionId, {
      acceso_vehiculo: "callejon_estrecho",
      ancho_callejon_ok: false,
      obstaculos_aereos: false,
      es_tarifa_dac: true,
    });
    const entrega = await entregar(admin, revisionId);
    expect(entrega.resultado_evaluacion).toBe("apto");

    const rev = await getRevision(service, revisionId);
    expect(rev.estado).toBe("finalizada");
    expect(rev.resultado_final).toBe("apto");
    expect(rev.acciones).toHaveLength(0);
    expect(rev.validaciones).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4) Requiere validación de especialista
// ─────────────────────────────────────────────────────────────────────
test.describe("Viabilidad · Validación de especialista", () => {
  test("potencia ≥ 0.7 MW genera validación legal que aprueba el especialista", async ({ service, admin, state }) => {
    const { revisionId } = await proyectoConRevision(service, admin, state, "ValidAproba");
    await responderTodo(admin, revisionId, { potencia_kw: 900 });
    const entrega = await entregar(admin, revisionId);
    expect(entrega.resultado_evaluacion).toBe("requiere_validacion");

    // La RPC de evaluación reporta el resultado sin persistir.
    const { data: evaluacion, error: errEval } = await admin.rpc("evaluar_viabilidad", {
      p_revision_id: revisionId,
    });
    expect(errEval).toBeNull();
    expect((evaluacion as { resultado: string }).resultado).toBe("requiere_validacion");

    let rev = await getRevision(service, revisionId);
    expect(rev.estado).toBe("evaluada");
    expect(rev.validaciones).toHaveLength(1);
    expect(rev.validaciones[0].tipo).toBe("legal");

    const esp = await ensureTechnician(
      service,
      especialistaEmail(state.prefix),
      ESPECIALISTA_PASSWORD,
      `${state.prefix} Especialista`
    );
    await asignarEspecialista(admin, rev.validaciones[0].id, esp.empleadoId);
    const espClient = await signIn(especialistaEmail(state.prefix), ESPECIALISTA_PASSWORD);
    await resolverValidacion(espClient, rev.validaciones[0].id, "aprobada", "ok");

    rev = await getRevision(service, revisionId);
    expect(rev.estado).toBe("finalizada");
    expect(rev.resultado_final).toBe("apto");
  });

  test("rechazo de la validación finaliza como no apto", async ({ service, admin, state }) => {
    const { revisionId } = await proyectoConRevision(service, admin, state, "ValidRechaza");
    // Transformador sin capacidad ⇒ validación especializada CFE.
    await responderTodo(admin, revisionId, { transformador_capacidad: "no" });
    const entrega = await entregar(admin, revisionId);
    expect(entrega.resultado_evaluacion).toBe("requiere_validacion");

    let rev = await getRevision(service, revisionId);
    expect(rev.validaciones[0].tipo).toBe("cfe");
    const val = rev.validaciones[0];

    const esp = await ensureTechnician(
      service,
      especialistaEmail(state.prefix),
      ESPECIALISTA_PASSWORD,
      `${state.prefix} Especialista`
    );
    await asignarEspecialista(admin, val.id, esp.empleadoId);
    const espClient = await signIn(especialistaEmail(state.prefix), ESPECIALISTA_PASSWORD);
    await resolverValidacion(espClient, val.id, "rechazada", "no cumple");

    rev = await getRevision(service, revisionId);
    expect(rev.estado).toBe("finalizada");
    expect(rev.resultado_final).toBe("no_apto");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5) Múltiples validaciones combinadas
// ─────────────────────────────────────────────────────────────────────
test.describe("Viabilidad · Múltiples validaciones", () => {
  test("combina validaciones legal, cfe y eléctrica; todas aprobadas ⇒ apto", async ({ service, admin, state }) => {
    const { revisionId } = await proyectoConRevision(service, admin, state, "Multi");
    await responderTodo(admin, revisionId, {
      potencia_kw: 900, // legal
      transformador_capacidad: "no", // cfe
      cableado_buen_estado: false, // eléctrica (con material aluminio)
      cableado_material: "aluminio",
      cableado_empalmes: false,
      cableado_antiguedad: true,
    });
    const entrega = await entregar(admin, revisionId);
    expect(entrega.resultado_evaluacion).toBe("requiere_validacion");

    let rev = await getRevision(service, revisionId);
    expect(rev.validaciones.map((v) => v.tipo).sort()).toEqual(["cfe", "electrico", "legal"]);

    const esp = await ensureTechnician(
      service,
      especialistaEmail(state.prefix),
      ESPECIALISTA_PASSWORD,
      `${state.prefix} Especialista`
    );
    const espClient = await signIn(especialistaEmail(state.prefix), ESPECIALISTA_PASSWORD);
    for (const v of rev.validaciones) {
      await asignarEspecialista(admin, v.id, esp.empleadoId);
      await resolverValidacion(espClient, v.id, "aprobada", "ok");
    }

    rev = await getRevision(service, revisionId);
    expect(rev.estado).toBe("finalizada");
    expect(rev.resultado_final).toBe("apto");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 6) No apto
// ─────────────────────────────────────────────────────────────────────
test.describe("Viabilidad · No apto", () => {
  test("cubierta de asbesto finaliza como no apto", async ({ service, admin, state }) => {
    const { revisionId } = await proyectoConRevision(service, admin, state, "NoApto");
    await responderTodo(admin, revisionId, {
      material_techo: "asbesto",
      asbesto_confirmado: true,
    });
    const entrega = await entregar(admin, revisionId);
    expect(entrega.resultado_evaluacion).toBe("no_apto");

    const rev = await getRevision(service, revisionId);
    expect(rev.estado).toBe("finalizada");
    expect(rev.resultado_final).toBe("no_apto");
    expect(rev.acciones).toHaveLength(0);
    expect(rev.validaciones).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 7) Reevaluación e historial
// ─────────────────────────────────────────────────────────────────────
test.describe("Viabilidad · Reevaluación e historial", () => {
  test("una nueva revisión reemplaza a la anterior", async ({ service, admin, state }) => {
    const { proyecto, revisionId: rev1 } = await proyectoConRevision(service, admin, state, "Reeval");
    await responderTodo(admin, rev1);
    await entregar(admin, rev1);

    const rev2 = await crearRevision(admin, proyecto.id, "previabilidad", state.techEmpleadoId);
    expect(rev2.numero).toBe(2);
    const r2 = await getRevision(service, rev2.id);
    expect(r2.numero_revision).toBe(2);
    expect(r2.reemplaza_revision_id).toBe(rev1);

    await responderTodo(admin, rev2.id, { material_techo: "asbesto", asbesto_confirmado: true });
    await entregar(admin, rev2.id);
    const r2Fin = await getRevision(service, rev2.id);
    expect(r2Fin.estado).toBe("finalizada");
    expect(r2Fin.resultado_final).toBe("no_apto");

    // Sólo una revisión abierta por etapa (índice parcial único).
    const abierta = await crearRevision(admin, proyecto.id, "previabilidad");
    const errDup = await rpcError(admin, "crear_revision_viabilidad", {
      p_proyecto_id: proyecto.id,
      p_tipo_etapa: "previabilidad",
      p_asignado_empleado_id: null,
      p_operation_id: undefined,
    });
    expect(errDup).not.toBeNull();
    expect(abierta.estado).toBe("borrador");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 8) Compuerta de Ingeniería
// ─────────────────────────────────────────────────────────────────────
test.describe("Viabilidad · Compuerta de Ingeniería", () => {
  test("Ingeniería exige Previabilidad apta y evidencia obligatoria", async ({ service, admin, state }) => {
    const { proyecto } = await crearProyectoViabilidad(
      service,
      state.prefix,
      "Ing",
      state.techEmpleadoId
    );
    await setAplicabilidad(admin, proyecto.id, true, true);

    // Sin Previabilidad apta no se puede crear la revisión de Ingeniería.
    const errCrear = await rpcError(admin, "crear_revision_viabilidad", {
      p_proyecto_id: proyecto.id,
      p_tipo_etapa: "ingenieria",
      p_asignado_empleado_id: state.techEmpleadoId,
      p_operation_id: undefined,
    });
    expect(errCrear).toContain("Previabilidad");

    // Previabilidad apta.
    const prev = await crearRevision(admin, proyecto.id, "previabilidad");
    await responderTodo(admin, prev.id);
    await entregar(admin, prev.id);

    // Ahora sí se crea la de Ingeniería.
    const ing = await crearRevision(admin, proyecto.id, "ingenieria", state.techEmpleadoId);
    const plantillaId = await revisionPlantilla(admin, ing.id);
    const transformador = await preguntaPorCodigo(admin, plantillaId, "transformador_capacidad_confirmada");

    // Sin evidencias obligatorias la entrega falla nombrando la pregunta.
    await responderTodo(admin, ing.id, {}, { evidencias: false });
    const errFaltaEv = await rpcError(admin, "entregar_revision_viabilidad", {
      p_revision_id: ing.id,
      p_operation_id: undefined,
    });
    expect(errFaltaEv).toContain("transformador_capacidad_confirmada");

    // Al adjuntar las evidencias (incluida la de esa pregunta) la entrega es apta.
    await adjuntarEvidenciasRequeridas(admin, ing.id);
    await adjuntarEvidencia(admin, ing.id, { preguntaId: transformador.id });
    const entrega = await entregar(admin, ing.id);
    expect(entrega.resultado_evaluacion).toBe("apto");
    expect(entrega.estado).toBe("finalizada");

    // Con ambas etapas aptas, la compuerta del proyecto se abre.
    const { id_checklist } = await generarChecklist(admin, proyecto.id);
    await marcarChecklistCompleto(admin, id_checklist, state.techEmpleadoId);
    await validarChecklist(admin, id_checklist);
    await iniciarProyecto(admin, proyecto.id);
    expect(await estadoProyecto(service, proyecto.id)).toBe("en_proceso");
  });

  test("Ingeniería no apta (memoria de cálculo no aprobada)", async ({ service, admin, state }) => {
    const { proyecto } = await crearProyectoViabilidad(
      service,
      state.prefix,
      "IngNoApto",
      state.techEmpleadoId
    );
    await setAplicabilidad(admin, proyecto.id, true, true);
    const prev = await crearRevision(admin, proyecto.id, "previabilidad");
    await responderTodo(admin, prev.id);
    await entregar(admin, prev.id);

    const ing = await crearRevision(admin, proyecto.id, "ingenieria", state.techEmpleadoId);
    await responderTodo(admin, ing.id, { memoria_calculo: false });
    const entrega = await entregar(admin, ing.id);
    expect(entrega.resultado_evaluacion).toBe("no_apto");
    expect(entrega.estado).toBe("finalizada");

    const rev = await getRevision(service, ing.id);
    expect(rev.resultado_final).toBe("no_apto");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 9) Offline: respuesta + evidencia y sincronización
// ─────────────────────────────────────────────────────────────────────
test.describe("Viabilidad · Offline y sincronización", () => {
  test("respuesta y evidencia capturadas sin conexión se sincronizan al reconectar", async ({
    service,
    admin,
    state,
    page,
    loginAsTech,
  }) => {
    const { proyecto, revisionId } = await proyectoConRevision(service, admin, state, "Offline", {
      asignado: state.techEmpleadoId,
    });
    const plantillaId = await revisionPlantilla(admin, revisionId);
    const objetivo = await preguntaPorCodigo(admin, plantillaId, "area_util_suficiente");

    await loginAsTech(page);
    await page.goto(`/viabilidad/${revisionId}`);
    await expect(page.getByRole("heading", { name: proyecto.nombre })).toBeVisible();

    await page.waitForFunction(
      async () => {
        const reg = await navigator.serviceWorker.ready;
        return !!reg.active && !!navigator.serviceWorker.controller;
      },
      undefined,
      { timeout: 30_000 }
    );

    // ── Sin conexión ────────────────────────────────────────────────────
    await page.context().setOffline(true);
    // Sincroniza: `sinConexion()` lee `navigator.onLine`; evita la carrera en
    // la que la primera mutación vería la red aún "online".
    await page.waitForFunction(() => navigator.onLine === false);

    await page.locator('input[type="file"]').first().setInputFiles({
      name: "evidencia-offline.png",
      mimeType: "image/png",
      buffer: PNG_1x1,
    });

    const qObjetivo = page
      .locator("div.space-y-2", { hasText: "suficiente para la potencia" })
      .first();
    await qObjetivo.getByRole("radio", { name: "Sí", exact: true }).click();

    // 1) Encolado en IndexedDB (evidencia + respuesta).
    await expect.poll(() => idbCount(page, "evidencias_pendientes"), { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
    await expect.poll(() => idbCount(page, "outbox"), { timeout: 15_000 }).toBeGreaterThanOrEqual(1);

    // 2) Recargar sin conexión: las colas persisten.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect.poll(() => idbCount(page, "evidencias_pendientes"), { timeout: 30_000 }).toBeGreaterThanOrEqual(1);

    // 3) Nada llegó todavía a la base de datos.
    const { count: evAntes } = await service
      .from("viabilidad_evidencias")
      .select("id_viabilidad_evidencia", { count: "exact", head: true })
      .eq("revision_id", revisionId);
    expect(evAntes ?? 0).toBe(0);
    const { data: respAntes } = await service
      .from("viabilidad_respuestas")
      .select("id_respuesta_viabilidad")
      .eq("revision_id", revisionId)
      .eq("pregunta_id", objetivo.id)
      .maybeSingle();
    expect(respAntes).toBeNull();

    // ── Reconexión: se vacían las colas ─────────────────────────────────
    await page.context().setOffline(false);
    await page.waitForFunction(() => navigator.onLine === true);
    await page.waitForLoadState("domcontentloaded").catch(() => {});

    await expect.poll(() => idbCount(page, "evidencias_pendientes"), { timeout: 30_000 }).toBe(0);

    await expect
      .poll(async () => {
        const { count } = await service
          .from("viabilidad_evidencias")
          .select("id_viabilidad_evidencia", { count: "exact", head: true })
          .eq("revision_id", revisionId);
        return count ?? 0;
      }, { timeout: 30_000 })
      .toBeGreaterThanOrEqual(1);

    // La respuesta capturada offline también se sincronizó.
    await expect
      .poll(async () => {
        const { data } = await service
          .from("viabilidad_respuestas")
          .select("valor")
          .eq("revision_id", revisionId)
          .eq("pregunta_id", objetivo.id)
          .maybeSingle();
        return data?.valor ?? null;
      }, { timeout: 30_000 })
      .toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 10) Conflicto de versión (sin Last-Write-Wins)
// ─────────────────────────────────────────────────────────────────────
test.describe("Viabilidad · Conflicto de versiones", () => {
  test("una escritura con versión obsoleta se rechaza y no sobrescribe", async ({ service, admin, state }) => {
    const { revisionId } = await proyectoConRevision(service, admin, state, "Conflicto");
    const plantillaId = await revisionPlantilla(admin, revisionId);
    const obs = await preguntaPorCodigo(admin, plantillaId, "observaciones_generales");

    await responder(admin, revisionId, obs.id, "v1");

    // Dispositivo A: conoce la versión 1 → escribe.
    await responder(admin, revisionId, obs.id, "v2", 1);

    // Dispositivo B: reintenta con la versión obsoleta 1 → conflicto.
    const err = await rpcError(admin, "guardar_respuesta_viabilidad", {
      p_revision_id: revisionId,
      p_pregunta_id: obs.id,
      p_valor: "v3",
      p_version: 1,
      p_operation_id: undefined,
    });
    expect(err).toContain("CONFLICTO");

    // El valor vigente sigue siendo el de A (no hay sobrescritura silenciosa).
    const { data } = await service
      .from("viabilidad_respuestas")
      .select("valor")
      .eq("revision_id", revisionId)
      .eq("pregunta_id", obs.id)
      .single();
    expect(data?.valor).toBe("v2");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 11) RLS y acotación de permisos
// ─────────────────────────────────────────────────────────────────────
test.describe("Viabilidad · RLS y permisos", () => {
  test("especialista off-team sólo accede a su validación y su evidencia", async ({ service, admin, state }) => {
    const { revisionId } = await proyectoConRevision(service, admin, state, "RLS");
    await responderTodo(admin, revisionId, {
      potencia_kw: 900, // legal
      cableado_buen_estado: false, // eléctrica
      cableado_material: "aluminio",
      cableado_empalmes: false,
      cableado_antiguedad: true,
    });
    const entrega = await entregar(admin, revisionId);
    expect(entrega.resultado_evaluacion).toBe("requiere_validacion");

    const esp = await ensureTechnician(
      service,
      especialistaEmail(state.prefix),
      ESPECIALISTA_PASSWORD,
      `${state.prefix} Especialista`
    );
    const espClient = await signIn(especialistaEmail(state.prefix), ESPECIALISTA_PASSWORD);

    // Sin asignación no es participante: no puede leer la revisión.
    await expect(getRevision(espClient, revisionId)).rejects.toThrow();

    const rev = await getRevision(service, revisionId);
    expect(rev.validaciones.map((v) => v.tipo).sort()).toEqual(["electrico", "legal"]);
    const [v1, v2] = rev.validaciones;

    // Asigna sólo la primera al especialista.
    await asignarEspecialista(admin, v1.id, esp.empleadoId);

    // Ahora sí es participante y puede leerla.
    const comoEsp = await getRevision(espClient, revisionId);
    expect(comoEsp.id).toBe(revisionId);

    // No puede resolver la validación que no le pertenece.
    const errAjena = await rpcError(espClient, "resolver_validacion_viabilidad", {
      p_validacion_id: v2.id,
      p_estado: "aprobada",
      p_observaciones: null,
      p_operation_id: undefined,
    });
    expect(errAjena).toContain("Sin permiso");

    // Puede adjuntar evidencia a su validación (off-team) y verla.
    await adjuntarEvidencia(espClient, revisionId, { validacionId: v1.id });
    const { count: evLinks } = await espClient
      .from("viabilidad_evidencias")
      .select("id_viabilidad_evidencia", { count: "exact", head: true })
      .eq("revision_id", revisionId);
    expect(evLinks ?? 0).toBeGreaterThanOrEqual(1);

    // Puede resolver su propia validación.
    await resolverValidacion(espClient, v1.id, "aprobada", "ok");
    const v1Final = (await getRevision(service, revisionId)).validaciones.find((v) => v.id === v1.id);
    expect(v1Final?.estado).toBe("aprobada");
  });

  test("una revisión finalizada es inmutable incluso para el admin (trigger)", async ({ service, admin, state }) => {
    const { revisionId } = await proyectoConRevision(service, admin, state, "InmutableAdmin");
    await responderTodo(admin, revisionId);
    await entregar(admin, revisionId);
    expect((await getRevision(service, revisionId)).estado).toBe("finalizada");

    const { error } = await admin
      .from("viabilidad_revisiones")
      .update({ estado: "en_progreso" })
      .eq("id_revision_viabilidad", revisionId);
    expect(error).not.toBeNull();
    expect(error?.message ?? "").toContain("inmutable");
  });

  test("un técnico no participante no ve la revisión de otro", async ({ service, admin, state }) => {
    // Proyecto sin el técnico en el equipo y sin asignación en la revisión.
    const empresaId = await getEmpresaId(service);
    const servicioId = await getServicioId(service, "Instalación Residencial");
    const clienteId = await createCliente(service, empresaId, `${state.prefix} Cliente Ajeno`);
    const proyecto = await createProyecto(service, {
      empresaId,
      clienteId,
      servicioId,
      equipoId: null,
      nombre: `${state.prefix} Ajeno`,
    });
    await setAplicabilidad(admin, proyecto.id, true, false);
    const rev = await crearRevision(admin, proyecto.id, "previabilidad");

    const techClient = await signIn(state.techEmail, state.techPassword);
    await expect(getRevision(techClient, rev.id)).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────
// 12) Autorización sin propietario (anti fail-open / regresión)
//     Un usuario autenticado NO admin y NO asignado no debe poder operar
//     sobre recursos cuyo propietario/responsable/especialista sea NULL.
//     Cubre las 4 RPC endurecidas en 0011_viabilidad_permisos.sql.
// ─────────────────────────────────────────────────────────────────────
test.describe("Viabilidad · Autorización sin propietario (anti fail-open)", () => {
  test("un no-admin no asignado no puede operar sobre recursos con propietario NULL", async ({
    service,
    admin,
    state,
  }) => {
    // Usuario autenticado no-admin (técnico). No es propietario de ninguna
    // de las revisiones/acciones/validaciones siguientes (todas con NULL).
    const tech = await signIn(state.techEmail, state.techPassword);

    const assertDenegado = (err: string | null, caso: string) => {
      expect(err, `${caso}: debe devolver error de autorización`).not.toBeNull();
      expect((err ?? "").toLowerCase()).toContain("sin permiso");
    };

    // (a) guardar_respuesta_viabilidad — revisión con `asignado_empleado_id` NULL.
    const a = await proyectoConRevision(service, admin, state, "NoOwnerResp");
    expect((await getRevision(service, a.revisionId)).asignado_empleado_id).toBeNull();
    const plantillaA = await revisionPlantilla(admin, a.revisionId);
    const obsA = await preguntaPorCodigo(admin, plantillaA, "observaciones_generales");

    const errResp = await rpcError(tech, "guardar_respuesta_viabilidad", {
      p_revision_id: a.revisionId,
      p_pregunta_id: obsA.id,
      p_valor: "intrusion",
      p_version: null,
      p_operation_id: undefined,
    });
    assertDenegado(errResp, "guardar_respuesta_viabilidad");
    const { data: respA } = await service
      .from("viabilidad_respuestas")
      .select("id_respuesta_viabilidad")
      .eq("revision_id", a.revisionId)
      .eq("pregunta_id", obsA.id)
      .maybeSingle();
    expect(respA, "no debe crearse respuesta").toBeNull();
    expect((await getRevision(service, a.revisionId)).estado).toBe("borrador");

    // (b) entregar_revision_viabilidad — revisión con `asignado_empleado_id` NULL.
    const b = await proyectoConRevision(service, admin, state, "NoOwnerEntrega");
    await responderTodo(admin, b.revisionId);
    expect((await getRevision(service, b.revisionId)).asignado_empleado_id).toBeNull();

    const errEnt = await rpcError(tech, "entregar_revision_viabilidad", {
      p_revision_id: b.revisionId,
      p_operation_id: undefined,
    });
    assertDenegado(errEnt, "entregar_revision_viabilidad");
    const revB = await getRevision(service, b.revisionId);
    expect(revB.estado).not.toBe("evaluada");
    expect(revB.resultado_evaluacion).toBeNull();

    // Revisión con una validación de especialista (propietario NULL).
    const c = await proyectoConRevision(service, admin, state, "NoOwnerOblig");
    await responderTodo(admin, c.revisionId, { potencia_kw: 900 });
    const entrega = await entregar(admin, c.revisionId);
    expect(entrega.resultado_evaluacion).toBe("requiere_validacion");

    const revC = await getRevision(service, c.revisionId);
    const validacion = revC.validaciones.find((x) => x.especialista_empleado_id === null);
    expect(validacion, "debe existir una validación sin especialista").toBeDefined();

    // Acción de propietario NULL insertada directamente (el cuestionario
    // definitivo no genera acciones, pero la RPC endurecida debe seguir segura).
    const { data: accionInsertada, error: errInsercion } = await service
      .from("viabilidad_acciones")
      .insert({ revision_id: c.revisionId, descripcion: "Acción E2E fail-open", obligatoria: true })
      .select("id_accion_viabilidad")
      .single();
    expect(errInsercion).toBeNull();
    const accionId = accionInsertada!.id_accion_viabilidad as number;

    // (c) resolver_accion_viabilidad — `responsable_empleado_id` NULL.
    const errAcc = await rpcError(tech, "resolver_accion_viabilidad", {
      p_accion_id: accionId,
      p_estado: "validada",
      p_observaciones: "intrusion",
      p_operation_id: undefined,
    });
    assertDenegado(errAcc, "resolver_accion_viabilidad");
    const { data: accionDespues } = await service
      .from("viabilidad_acciones")
      .select("estado")
      .eq("id_accion_viabilidad", accionId)
      .single();
    expect(accionDespues?.estado).toBe("pendiente");

    // (d) resolver_validacion_viabilidad — `especialista_empleado_id` NULL.
    const errVal = await rpcError(tech, "resolver_validacion_viabilidad", {
      p_validacion_id: validacion!.id,
      p_estado: "aprobada",
      p_observaciones: "intrusion",
      p_operation_id: undefined,
    });
    assertDenegado(errVal, "resolver_validacion_viabilidad");
    const valDespues = (await getRevision(service, c.revisionId)).validaciones.find(
      (x) => x.id === validacion!.id
    );
    expect(valDespues?.estado).toBe("pendiente");
  });
});
