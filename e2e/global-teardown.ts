import { cleanupByPrefix, restoreStock } from "./support/factory";
import { loadState, stateExists } from "./support/state";

/**
 * Limpieza global: elimina todos los datos creados por la ejecución (proyectos,
 * clientes, equipos, usuario técnico y objetos de R2 con el prefijo único) y
 * restaura el stock de materiales previo a las pruebas.
 */
export default async function globalTeardown(): Promise<void> {
  if (!stateExists()) {
    console.warn("[E2E] No hay estado de ejecución; se omite la limpieza.");
    return;
  }
  const state = loadState();

  console.log(`[E2E] Limpiando datos con prefijo ${state.prefix}...`);
  const res = await cleanupByPrefix(state.prefix, state.techEmail, state.techUserId);
  console.log(
    `[E2E] Eliminados: ${res.proyectos} proyectos, ${res.clientes} clientes, ` +
      `${res.equipos} equipos, ${res.empleados} empleados, ${res.reportes} reportes, ` +
      `${res.objetosR2} objetos R2.`
  );

  await restoreStock(state.stock);
  console.log("[E2E] Stock de materiales restaurado.");
}
