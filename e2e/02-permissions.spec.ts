import { test, expect } from "./support/test";

const ADMIN_NAV = ["Dashboard", "Proyectos", "Clientes", "Equipos", "Empleados", "Reportes", "Materiales"];
const TECH_NAV = ["Dashboard", "Proyectos", "Equipos", "Reportes"];
const ADMIN_ONLY = ["Clientes", "Empleados", "Materiales"];

test.describe("Permisos por rol (admin vs técnico)", () => {
  test("el admin ve la navegación administrativa completa", async ({ page, loginAsAdmin }) => {
    await loginAsAdmin(page);
    for (const item of ADMIN_NAV) {
      await expect(page.getByRole("link", { name: item, exact: true })).toBeVisible();
    }
    await expect(page.getByText("Panel de Administración")).toBeVisible();
  });

  test("el técnico no ve las secciones exclusivas de administrador", async ({ page, loginAsTech }) => {
    await loginAsTech(page);
    for (const item of TECH_NAV) {
      await expect(page.getByRole("link", { name: item, exact: true })).toBeVisible();
    }
    for (const item of ADMIN_ONLY) {
      await expect(page.getByRole("link", { name: item, exact: true })).toHaveCount(0);
    }
    await expect(page.getByText("General", { exact: true })).toBeVisible();
  });

  test("el título del panel y de proyectos difiere por rol", async ({ page, loginAsAdmin }) => {
    await loginAsAdmin(page);
    await page.getByRole("link", { name: "Proyectos", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Proyectos", exact: true })).toBeVisible();
  });

  test("el técnico ve 'Mis Proyectos'", async ({ page, loginAsTech }) => {
    await loginAsTech(page);
    await page.getByRole("link", { name: "Proyectos", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Mis Proyectos", exact: true })).toBeVisible();
  });
});
