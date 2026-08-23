import { test, expect } from "@playwright/test";

test.describe("Browser Extension Mechanism & Settings", () => {
  test("should display Browser Extension CORS option and handle status in Settings Sheet", async ({ page }) => {
    await page.goto("/");

    // 1. Open Settings Sheet
    const settingsBtn = page.getByRole("button", { name: /Settings/i });
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // 2. Verify CORS Provider dropdown contains 'Browser Extension'
    const corsSelect = page.locator("text=CORS Provider").locator("..").locator("button");
    await expect(corsSelect).toBeVisible();
    await corsSelect.click();

    const extOption = page.getByRole("option", { name: /Browser Extension/i });
    await expect(extOption).toBeVisible();
    await extOption.click();

    // 3. Verify Download button and Password input appear
    await expect(page.getByRole("button", { name: /Download Extension/i })).toBeVisible();
    await expect(page.locator("input[placeholder*='Optional SHA-256 Auth Password']")).toBeVisible();

    // 4. Fill in security password
    const passInput = page.locator("input[placeholder*='Optional SHA-256 Auth Password']");
    await passInput.fill("test-secure-password-456");

    // 5. Apply settings
    const applyBtn = page.getByRole("button", { name: "Apply" });
    await applyBtn.click();

    // 6. Re-open settings to verify password is saved and hidden
    await settingsBtn.click();
    await expect(page.locator("input[placeholder*='Password configured']")).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear password" })).toBeVisible();
  });

  test("should verify Credits & Data Sources includes Extension Helper and verified sources", async ({ page }) => {
    await page.goto("/about/credits");

    // Verify Credits page displays
    await expect(page.getByRole("heading", { name: "Credits & Data Sources", exact: true })).toBeVisible();
    await expect(page.getByText("Noob31's MultiTools Helper (Browser Extension)")).toBeVisible();
    await expect(page.getByText("CIRCL CVE-Search")).toBeVisible();
    await expect(page.getByText("Clearbit Company Autocomplete")).toBeVisible();
    await expect(page.getByText("Troubleshooting.tools")).toBeVisible();
  });
});
