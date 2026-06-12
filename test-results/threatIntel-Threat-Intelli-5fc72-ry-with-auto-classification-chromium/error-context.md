# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: threatIntel.spec.ts >> Threat Intelligence Explorer End-to-End Tests >> should load the explorer page and perform search query with auto-classification
- Location: tests\threatIntel.spec.ts:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button[role=\'tab\'][value=\'otx\']')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('button[role=\'tab\'][value=\'otx\']')

```

```yaml
- banner:
  - button "All Tools"
  - link "Noob31":
    - /url: /
    - img "Noob31"
  - searchbox
  - text: "MultiTool: Enter a domain, IP, URL, or Email..."
  - button "Lookup"
  - switch [checked]
  - button "Toggle theme"
  - button "Settings"
- main:
  - heading "Threat Intelligence Explorer" [level=1]
  - paragraph: Aggregated real-time unauthenticated feeds lookup for IOCs (Indicators of Compromise).
  - textbox "Domain, IP, URL, File Hash (MD5/SHA), or keyword...": 148.228.16.3
  - button "Search Threat Intel"
  - text: "Input Detection: IP Address Target Indicator IP Address"
  - heading "148.228.16.3" [level=2]
  - text: Aggregated Risk Assessment CLEAN / NO IMMEDIATE MATCHES Query Time 1655 ms
  - button "Copy Results"
  - button "Export JSON"
  - heading "External Threat Portals" [level=3]
  - paragraph: "Deep link search redirects to professional assessment suites:"
  - button "VirusTotal IP"
  - button "AlienVault OTX"
  - button "AbuseIPDB"
  - button "Spamhaus"
  - button "IPVoid Blacklist"
  - tablist:
    - tab "AlienVault OTX (0)" [selected]
    - tab "ThreatMiner (0)"
    - tab "PhishStats (0)"
    - tab "URLScan.io (0)"
  - tabpanel "AlienVault OTX (0)": OTX Security Pulses Active threat advisory reports associated with this indicator in AlienVault OTX. No active threat pulses listed for this indicator on AlienVault OTX.
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("Threat Intelligence Explorer End-to-End Tests", () => {
  4  |   test("should load the explorer page and perform search query with auto-classification", async ({ page }) => {
  5  |     // 1. Visit Threat Intel page
  6  |     await page.goto("/security/threat-intel");
  7  | 
  8  |     // 2. Assert page header is present
  9  |     await expect(page.locator("h1")).toContainText("Threat Intelligence Explorer");
  10 | 
  11 |     // 3. Confirm default detection indicator shows keyword
  12 |     const detector = page.locator("span:has-text('Input Detection:') + div, span:has-text('Input Detection:') + span");
  13 |     await expect(detector).toContainText("General Keyword");
  14 | 
  15 |     // 4. Fill in an IP Address target to trigger auto-detection
  16 |     const searchInput = page.locator("input[placeholder*='Domain, IP, URL']");
  17 |     await searchInput.fill("148.228.16.3");
  18 | 
  19 |     // 5. Assert detection indicator updates immediately in the browser
  20 |     await expect(detector).toContainText("IP Address");
  21 | 
  22 |     // 6. Submit the form
  23 |     await searchInput.press("Enter");
  24 | 
  25 |     // 7. Verify loading state is shown and resolves to success
  26 |     const resultsContainer = page.locator("text=Target Indicator");
  27 |     await expect(resultsContainer).toBeVisible({ timeout: 15000 });
  28 | 
  29 |     // 8. Assert details card matches query
  30 |     await expect(page.locator("h2.font-mono")).toContainText("148.228.16.3");
  31 | 
  32 |     // 9. Assert tabs exist and can be toggled
  33 |     const otxTab = page.locator("button[role='tab'][value='otx']");
> 34 |     await expect(otxTab).toBeVisible();
     |                          ^ Error: expect(locator).toBeVisible() failed
  35 | 
  36 |     const phishstatsTab = page.locator("button[role='tab'][value='phishstats']");
  37 |     await expect(phishstatsTab).toBeVisible();
  38 | 
  39 |     // 10. Click PhishStats tab and verify results table or empty notice is present
  40 |     await phishstatsTab.click();
  41 |     const phishstatsContent = page.locator("[data-slot='tabs-content'][value='phishstats']");
  42 |     await expect(phishstatsContent).toBeVisible();
  43 |   });
  44 | 
  45 |   test("should handle file hash query detection and render details tabs", async ({ page }) => {
  46 |     await page.goto("/security/threat-intel");
  47 | 
  48 |     const searchInput = page.locator("input[placeholder*='Domain, IP, URL']");
  49 |     const detector = page.locator("span:has-text('Input Detection:') + div, span:has-text('Input Detection:') + span");
  50 | 
  51 |     // Input MD5 file hash
  52 |     await searchInput.fill("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  53 |     await expect(detector).toContainText("File Hash");
  54 | 
  55 |     // Submit
  56 |     await searchInput.press("Enter");
  57 | 
  58 |     // Wait for the results to load
  59 |     const resultsContainer = page.locator("text=Target Indicator");
  60 |     await expect(resultsContainer).toBeVisible({ timeout: 15000 });
  61 | 
  62 |     // Verify MalwareBazaar tab is present
  63 |     const mbTab = page.locator("button[role='tab'][value='malwarebazaar']");
  64 |     await expect(mbTab).toBeVisible();
  65 |   });
  66 | 
  67 |   test("should check that redirect links on external portal panel exist", async ({ page }) => {
  68 |     await page.goto("/security/threat-intel");
  69 | 
  70 |     const searchInput = page.locator("input[placeholder*='Domain, IP, URL']");
  71 |     await searchInput.fill("google.com");
  72 | 
  73 |     const detector = page.locator("span:has-text('Input Detection:') + div, span:has-text('Input Detection:') + span");
  74 |     await expect(detector).toContainText("Domain Name");
  75 | 
  76 |     await searchInput.press("Enter");
  77 | 
  78 |     // Wait for results
  79 |     await expect(page.locator("text=Target Indicator")).toBeVisible({ timeout: 15000 });
  80 | 
  81 |     // Verify redirect panel shows appropriate actions (e.g. VirusTotal Domain, AlienVault OTX)
  82 |     const portalButton = page.locator("button:has-text('VirusTotal Domain')");
  83 |     await expect(portalButton).toBeVisible();
  84 |   });
  85 | });
  86 | 
```