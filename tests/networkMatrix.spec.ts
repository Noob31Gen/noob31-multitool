import { test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// List of all functional pages and their test inputs
const COMPONENTS = [
  { name: "DNS Lookup", path: "/dns/a", input: "google.com" },
  { name: "DNSSEC Lookup", path: "/dnssec/dnskey", input: "google.com" },
  { name: "Email Auth Lookup", path: "/email/spf", input: "google.com" },
  { name: "WHOIS / Registration Lookup", path: "/registration/whois", input: "google.com" },
  { name: "URL Scanner", path: "/network/url-scanner", input: "https://google.com" },
  { name: "Subdomain Scanner", path: "/network/subdomains", input: "google.com" },
  { name: "Reverse DNS", path: "/network/reverse-dns", input: "8.8.8.8" },
  { name: "DNS Check", path: "/health/dns", input: "google.com" },
  { name: "Domain Health", path: "/health/domain", input: "google.com" },
  { name: "Email Deliverability", path: "/health/deliverability", input: "google.com" },
  { name: "Cert Lookup", path: "/security/cert", input: "google.com" },
  { name: "Blacklist Check", path: "/security/blacklist", input: "148.228.16.3" },
  { name: "Domain Reputation", path: "/security/domain-reputation", input: "google.com" },
  { name: "Threat Intel Explorer", path: "/security/threat-intel", input: "google.com" },
];

const PROXIES = ["auto", "none", "corsproxy", "allorigins", "codetabs"];
const DNS_SERVERS = ["google", "cloudflare", "alidns", "adguard"];

interface LogMessage {
  type: string;
  text: string;
  url: string;
}

test.describe("Diagnostics & Network Matrix Scanner", () => {
  const report: {
    components: { [key: string]: LogMessage[] };
    proxies: { [key: string]: LogMessage[] };
    dns: { [key: string]: LogMessage[] };
  } = {
    components: {},
    proxies: {},
    dns: {},
  };

  test.afterAll(async () => {
    // Generate JSON report folder and file
    const dir = "./test-results";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const reportPath = path.join(dir, "lookup-matrix-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Print summary to console
    console.log("\n==================================================");
    console.log("       NETWORK MATRIX & COMPONENT DIAGNOSTICS      ");
    console.log("==================================================\n");

    console.log("--- Component Pages Log Audit ---");
    for (const [comp, logs] of Object.entries(report.components)) {
      const errs = logs.filter(l => l.type === "error" || l.type === "pageerror" || l.type === "requestfailed");
      const warns = logs.filter(l => l.type === "warn" || l.type === "warning");
      console.log(`- ${comp.padEnd(30)}: [${errs.length} Errors] [${warns.length} Warnings]`);
      if (errs.length > 0) {
        errs.slice(0, 3).forEach(e => console.log(`    ⚠️  [${e.type}] ${e.text.substring(0, 100)}`));
      }
    }

    console.log("\n--- CORS Proxies Log Audit ---");
    for (const [proxy, logs] of Object.entries(report.proxies)) {
      const errs = logs.filter(l => l.type === "error" || l.type === "pageerror" || l.type === "requestfailed");
      console.log(`- Proxy "${proxy}": [${errs.length} Errors]`);
      if (errs.length > 0) {
        errs.slice(0, 3).forEach(e => console.log(`    ⚠️  ${e.text.substring(0, 100)}`));
      }
    }

    console.log("\n--- DoH DNS Resolvers Log Audit ---");
    for (const [dns, logs] of Object.entries(report.dns)) {
      const errs = logs.filter(l => l.type === "error" || l.type === "pageerror" || l.type === "requestfailed");
      console.log(`- DNS Resolver "${dns}": [${errs.length} Errors]`);
      if (errs.length > 0) {
        errs.slice(0, 3).forEach(e => console.log(`    ⚠️  ${e.text.substring(0, 100)}`));
      }
    }

    console.log(`\nDetailed report written to: ${reportPath}`);
  });

  // 1. Scan all component pages using standard default settings
  for (const comp of COMPONENTS) {
    test(`Diagnostic scan: ${comp.name}`, async ({ page }) => {
      const logs: LogMessage[] = [];

      // Intercept console errors & warnings
      page.on("console", msg => {
        const type = msg.type();
        if (type === "error" || type === "warning") {
          logs.push({ type, text: msg.text(), url: page.url() });
        }
      });
      page.on("pageerror", err => {
        logs.push({ type: "pageerror", text: err.message, url: page.url() });
      });
      page.on("requestfailed", req => {
        logs.push({
          type: "requestfailed",
          text: `Request failed: ${req.method()} ${req.url()} (${req.failure()?.errorText})`,
          url: page.url()
        });
      });

      // Apply default standard settings
      await page.goto("/");
      await page.evaluate(() => {
        localStorage.setItem(
          "url-scanner-settings",
          JSON.stringify({
            dohProvider: "auto",
            customDnsUrl: "",
            corsProvider: "none",
            customCorsUrl: "",
            theme: "dark",
            persistenceEnabled: true,
          })
        );
      });

      // Go to target page
      await page.goto(comp.path);
      await page.waitForLoadState("networkidle");

      // Input query
      const input = page.locator("input").first();
      if (await input.isVisible()) {
        await input.fill(comp.input);

        // Click lookup button or press Enter
        const lookupBtn = page.locator(
          "button[type='submit'], button:has-text('Check'), button:has-text('Scan'), button:has-text('Lookup'), button:has-text('Search')"
        ).first();

        if (await lookupBtn.isVisible()) {
          await lookupBtn.click();
        } else {
          await input.press("Enter");
        }

        // Wait a few seconds for queries to run
        await page.waitForTimeout(6000);
      }

      report.components[comp.name] = logs;
    });
  }

  // 2. Scan CORS Proxies on Threat Intel Explorer
  for (const proxy of PROXIES) {
    test(`Diagnostic scan proxy: ${proxy}`, async ({ page }) => {
      const logs: LogMessage[] = [];

      page.on("console", msg => {
        const type = msg.type();
        if (type === "error" || type === "warning") {
          logs.push({ type, text: msg.text(), url: page.url() });
        }
      });
      page.on("pageerror", err => {
        logs.push({ type: "pageerror", text: err.message, url: page.url() });
      });
      page.on("requestfailed", req => {
        logs.push({
          type: "requestfailed",
          text: `Request failed: ${req.url()}`,
          url: page.url()
        });
      });

      // Configure setting
      await page.goto("/");
      await page.evaluate((proxyVal: string) => {
        localStorage.setItem(
          "url-scanner-settings",
          JSON.stringify({
            dohProvider: "auto",
            customDnsUrl: "",
            corsProvider: proxyVal,
            customCorsUrl: "",
            theme: "dark",
            persistenceEnabled: true,
          })
        );
      }, proxy);

      // Perform lookup on Threat Intel Explorer
      await page.goto("/security/threat-intel");
      const input = page.locator("input").first();
      await input.fill("google.com");
      await input.press("Enter");

      await page.waitForTimeout(5000);
      report.proxies[proxy] = logs;
    });
  }

  // 3. Scan DoH DNS Resolvers on DNS Lookup
  for (const dns of DNS_SERVERS) {
    test(`Diagnostic scan DNS resolver: ${dns}`, async ({ page }) => {
      const logs: LogMessage[] = [];

      page.on("console", msg => {
        const type = msg.type();
        if (type === "error" || type === "warning") {
          logs.push({ type, text: msg.text(), url: page.url() });
        }
      });
      page.on("pageerror", err => {
        logs.push({ type: "pageerror", text: err.message, url: page.url() });
      });
      page.on("requestfailed", req => {
        logs.push({
          type: "requestfailed",
          text: `Request failed: ${req.url()}`,
          url: page.url()
        });
      });

      // Configure setting
      await page.goto("/");
      await page.evaluate((dnsVal: string) => {
        localStorage.setItem(
          "url-scanner-settings",
          JSON.stringify({
            dohProvider: dnsVal,
            customDnsUrl: "",
            corsProvider: "none",
            customCorsUrl: "",
            theme: "dark",
            persistenceEnabled: true,
          })
        );
      }, dns);

      // Perform lookup on DNS Page
      await page.goto("/dns/a");
      const input = page.locator("input").first();
      await input.fill("google.com");
      await input.press("Enter");

      await page.waitForTimeout(5000);
      report.dns[dns] = logs;
    });
  }
});
