import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Estado compartido entre el globalSetup/globalTeardown y los workers.
 *
 * Playwright ejecuta el globalSetup en el proceso del runner y cada test en un
 * worker distinto, por lo que las variables de entorno no se propagan. Se
 * persiste un pequeño JSON con el prefijo único de la ejecución y los IDs del
 * usuario técnico de prueba.
 */

const STATE_DIR = resolve(process.cwd(), "test-results");
const STATE_FILE = resolve(STATE_DIR, "e2e-state.json");

export interface StockRow {
  id_material: number;
  stock_disponible: number;
}

export interface E2EState {
  runId: string;
  prefix: string;
  techEmail: string;
  techPassword: string;
  techUserId: string;
  techEmpleadoId: number;
  /** Snapshot del stock de materiales antes de la ejecución (para restaurarlo). */
  stock: StockRow[];
}

export function saveState(state: E2EState): void {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

export function stateExists(): boolean {
  return existsSync(STATE_FILE);
}

export function loadState(): E2EState {
  if (!existsSync(STATE_FILE)) {
    throw new Error(
      "No existe el estado E2E (test-results/e2e-state.json). ¿Se ejecutó globalSetup?"
    );
  }
  return JSON.parse(readFileSync(STATE_FILE, "utf8")) as E2EState;
}
