import { type Page, expect } from "@playwright/test";

/** Log in as a given user and wait for the app shell to appear. */
export async function login(
  page: Page,
  username = "demo",
  password = "demo",
) {
  await page.goto("/");
  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  // Wait for the app shell header to appear
  await expect(page.locator("header")).toContainText("BTP", { timeout: 10_000 });
}

/** Navigate to a sidebar view by clicking the label. */
export async function navigateTo(page: Page, label: string) {
  await page.locator("nav button", { hasText: label }).click();
}
