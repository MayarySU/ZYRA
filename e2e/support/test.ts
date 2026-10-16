import { test as base, expect, type Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient, signInAdmin } from "./supabase";
import { loadState, type E2EState } from "./state";
import { ADMIN_EMAIL, ADMIN_PASSWORD, TECH_EMAIL, TECH_PASSWORD } from "./env";

export interface ZyraFixtures {
  /** Estado compartido de la ejecución (prefijo único, técnico de prueba...). */
  state: E2EState;
  /** Cliente service-role (bypass RLS): setup/limpieza/verificaciones. */
  service: SupabaseClient;
  /** Cliente admin autenticado con la publishable key (respeta RLS real). */
  admin: SupabaseClient;
  /** Inicia sesión por la UI de /login y espera a /dashboard. */
  loginAs: (page: Page, email: string, password: string) => Promise<void>;
  loginAsAdmin: (page: Page) => Promise<void>;
  loginAsTech: (page: Page) => Promise<void>;
}

async function uiLogin(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Iniciar Sesión" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

export const test = base.extend<ZyraFixtures>({
  state: async ({}, use) => {
    await use(loadState());
  },
  service: async ({}, use) => {
    await use(adminClient());
  },
  admin: async ({}, use) => {
    await use(await signInAdmin());
  },
  loginAs: async ({}, use) => {
    await use(uiLogin);
  },
  loginAsAdmin: async ({}, use) => {
    await use((page: Page) => uiLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD));
  },
  loginAsTech: async ({}, use) => {
    await use((page: Page) => uiLogin(page, TECH_EMAIL, TECH_PASSWORD));
  },
});

export { expect };
export { TECH_EMAIL, TECH_PASSWORD };
