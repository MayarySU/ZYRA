import { test, expect } from "./support/test";
import { ADMIN_EMAIL } from "./support/env";

test.describe("Autenticación y protección de rutas", () => {
  test("sin sesión, /dashboard redirige a /login con ?redirect", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
    expect(new URL(page.url()).searchParams.get("redirect")).toBe("/dashboard");
    await expect(page.getByRole("button", { name: "Iniciar Sesión" })).toBeVisible();
  });

  test("sin sesión, otras rutas protegidas redirigen a /login", async ({ page }) => {
    for (const ruta of ["/projects", "/employees", "/clients", "/reports"]) {
      await page.goto(ruta);
      await page.waitForURL(/\/login/);
      expect(new URL(page.url()).pathname).toBe("/login");
    }
  });

  test("la raíz redirige a /login sin sesión", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/login/);
  });

  test("credenciales inválidas muestran error y no inician sesión", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill("contraseña-incorrecta");
    await page.getByRole("button", { name: "Iniciar Sesión" }).click();
    await expect(page.getByText("Error de autenticación", { exact: true })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/login");
  });

  test("login de admin entra al panel administrativo", async ({ page, loginAsAdmin }) => {
    await loginAsAdmin(page);
    await expect(page.getByText("Panel Administrativo")).toBeVisible();
  });

  test("con sesión, /login redirige al dashboard", async ({ page, loginAsAdmin }) => {
    await loginAsAdmin(page);
    await page.goto("/login");
    await page.waitForURL(/\/dashboard/);
  });

  test("cerrar sesión vuelve a /login y reprotege las rutas", async ({ page, loginAsAdmin }) => {
    await loginAsAdmin(page);
    await page.locator('header button[aria-haspopup="menu"]').click();
    await page.getByRole("menuitem", { name: "Cerrar Sesión" }).click();
    await page.waitForURL(/\/login/);
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
  });
});
