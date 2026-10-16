import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { adminClient, signInAdmin } from "./support/supabase";
import {
  ensureTechnician,
  getServicioId,
  snapshotStock,
} from "./support/factory";
import { saveState, type E2EState } from "./support/state";
import { ADMIN_EMAIL, TECH_EMAIL, TECH_PASSWORD } from "./support/env";

/**
 * Preparación global de la suite E2E:
 * 1. Verifica que el admin puede iniciar sesión (RLS real).
 * 2. Comprueba que el catálogo base está sembrado.
 * 3. Crea/reutiliza el usuario técnico de prueba.
 * 4. Guarda un snapshot del stock de materiales y el prefijo único de ejecución.
 */
export default async function globalSetup(): Promise<void> {
  // Limpia estado previo para evitar prefijos obsoletos.
  rmSync(resolve(process.cwd(), "test-results", "e2e-state.json"), { force: true });

  const runId = `${new Date().toISOString().replace(/[-:.TZ]/g, "")}`;
  const prefix = `E2E-${runId}`;

  // 1) Login admin (falla temprano si las credenciales son incorrectas).
  const admin = await signInAdmin();
  const { data: whoami } = await admin.auth.getUser();
  if (!whoami?.user) throw new Error("No se pudo verificar la sesión del admin");
  console.log(`[E2E] Admin autenticado: ${ADMIN_EMAIL}`);

  // 2) Catálogo base (si falta el seed, avisa).
  await getServicioId(admin, "Instalación Residencial");
  await getServicioId(admin, "Mantenimiento");

  // 3) Snapshot de stock para restaurarlo al final.
  const stock = await snapshotStock(admin);

  // 4) Usuario técnico de prueba (service-role).
  const service = adminClient();
  const tech = await ensureTechnician(service, TECH_EMAIL, TECH_PASSWORD, `${prefix} Técnico`);
  console.log(`[E2E] Técnico listo: ${TECH_EMAIL} (empleado ${tech.empleadoId})`);

  const state: E2EState = {
    runId,
    prefix,
    techEmail: TECH_EMAIL,
    techPassword: TECH_PASSWORD,
    techUserId: tech.userId,
    techEmpleadoId: tech.empleadoId,
    stock,
  };
  saveState(state);
  console.log(`[E2E] Prefijo de ejecución: ${prefix}`);
}
