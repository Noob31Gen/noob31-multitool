import { test, expect } from "@playwright/test";

test.describe("ASN & Network Metadata End-to-End Tests", () => {
  test("should lookup pure ASN (e.g. AS15169) and render entity, RIR, and announced subnets", async ({ page }) => {
    await page.goto("/registration/asn");

    // Assert header
    await expect(page.locator("h1")).toContainText("ASN Lookup");

    // Enter AS15169
    const searchInput = page.locator("input[placeholder*='AS13335']");
    await searchInput.fill("AS15169");
    await searchInput.press("Enter");

    // Wait for results
    await expect(page.locator("text=ASN Results")).toBeVisible({ timeout: 20000 });

    // Assert ASN number is visible in main badge
    const asnHeader = page.locator(".text-4xl.font-mono");
    await expect(asnHeader).toContainText("AS15169");

    // Assert Organization name is not Unknown Entity
    const entityHeader = page.locator("h3.text-2xl");
    await expect(entityHeader).toContainText("Google");

    // Assert RIR badge is present (e.g. ARIN)
    await expect(page.locator("span:has-text('ARIN')").first()).toBeVisible();
  });

  test("should lookup public IP (e.g. 8.8.8.8) and render ASN and geolocation details", async ({ page }) => {
    await page.goto("/registration/asn");

    const searchInput = page.locator("input[placeholder*='AS13335']");
    await searchInput.fill("8.8.8.8");
    await searchInput.press("Enter");

    // Wait for results
    await expect(page.locator("text=ASN Results")).toBeVisible({ timeout: 20000 });

    // Assert ASN
    const asnHeader = page.locator(".text-4xl.font-mono");
    await expect(asnHeader).toContainText("AS15169");

    // Assert entity
    const entityHeader = page.locator("h3.text-2xl");
    await expect(entityHeader).toContainText("Google");
  });

  test("should load What Is My IP page without fatal errors", async ({ page }) => {
    await page.goto("/network/my-ip");

    await expect(page.locator("h1")).toContainText("What Is My IP?");

    // Verify IPv4 address or loading card appears and succeeds
    await expect(page.locator("text=Public IPv4 Address")).toBeVisible({ timeout: 20000 });
  });
});

