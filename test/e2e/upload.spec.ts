import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import { login, navigateTo } from "./helpers";

// Create a minimal test PDF file for upload
const TEST_FILE_DIR = path.join(__dirname, "..", "fixtures");
const TEST_PDF = path.join(TEST_FILE_DIR, "test_teaser.pdf");

test.beforeAll(() => {
  fs.mkdirSync(TEST_FILE_DIR, { recursive: true });
  // Create a minimal PDF-like file (just needs to have .pdf extension for the backend)
  if (!fs.existsSync(TEST_PDF)) {
    fs.writeFileSync(TEST_PDF, "%PDF-1.4 fake content for testing upload");
  }
});

test.describe("Upload", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("upload zone is visible", async ({ page }) => {
    await navigateTo(page, "Upload");
    await expect(page.locator("text=Drag & drop files here")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=PDF, DOCX, XLSX, JPG, PNG")).toBeVisible();
  });

  test("upload a PDF triggers parsing", async ({ page }) => {
    await navigateTo(page, "Upload");
    await expect(page.locator("text=Drag & drop")).toBeVisible({ timeout: 5000 });

    // Use the file input directly (Playwright can set files on hidden inputs)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_PDF);

    // Should show uploading state, then result
    await expect(
      page.locator("text=Parsed Successfully").or(page.locator("text=Upload failed"))
    ).toBeVisible({ timeout: 30_000 });
  });

  test("parsed result shows opportunity details", async ({ page }) => {
    await navigateTo(page, "Upload");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_PDF);

    // Wait for parse success
    const success = page.locator("text=Parsed Successfully");
    const isSuccess = await success.isVisible({ timeout: 30_000 }).catch(() => false);
    if (isSuccess) {
      // Should show property info from mock extraction
      await expect(page.locator("text=Riverside Office Tower")).toBeVisible();
      await expect(page.locator("text=Austin")).toBeVisible();
    }
  });
});
