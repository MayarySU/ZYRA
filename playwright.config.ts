import { defineConfig, devices } from "@playwright/test";

/**
 * Configuración de Playwright para las pruebas E2E de ZYRA.
 *
 * Se ejecuta contra un servidor de producción (`next build` + `next start` en el
 * puerto 9002) para que el Service Worker de Serwist esté activo y las pruebas
 * de offline sean reales. El webServer compila y arranca una sola vez.
 *
 * Las pruebas se ejecutan en serie (`workers: 1`) porque comparten la base de
 * datos real de Supabase y un usuario técnico de prueba.
 */

const PORT = 9002;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 360_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
