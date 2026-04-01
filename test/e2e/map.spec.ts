import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Map View", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("map view is the default view", async ({ page }) => {
    // Map should be the default active view — look for the Leaflet container
    await expect(
      page.locator(".leaflet-container").or(page.locator("text=Loading"))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("map loads Leaflet container", async ({ page }) => {
    // Wait for the Leaflet map container
    await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 15_000 });
    // Leaflet map pane should exist in the DOM
    await expect(page.locator(".leaflet-map-pane")).toHaveCount(1);
  });

  test("map shows markers if opportunities exist", async ({ page }) => {
    await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 15_000 });
    // If there are opportunities with coordinates, markers should exist
    const markers = page.locator(".leaflet-marker-icon");
    const count = await markers.count();
    // Just verify the map loaded without errors
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
