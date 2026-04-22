# URL Scanner — Project Guide

> **For:** Future AI agents or human developers continuing this project.
> **Last updated:** 2026-04-22
> **Status:** Pre-development (planning complete, implementation not yet started)

---

## 1. What Is This Project?

This is a **browser-based clone of [MXToolbox](https://mxtoolbox.com)** — a popular suite of DNS, email, and network diagnostic tools. The key difference: **this runs entirely in the browser with zero backend**, using public DNS-over-HTTPS (DoH) APIs and optional user-provided API keys.

### The Problem It Solves

MXToolbox is a cloud service — your queries go through their servers. This project gives users the same diagnostic tools running locally, with:
- No data sent to third-party diagnostic servers
- No account required for most tools
- Offline-capable for client-side tools (subnet calc, header parser, generators)
- Optional API keys stored only in the user's browser (`localStorage`)

### What It Clones

35 tools total (31 from MXToolbox + 4 bonus), organized into these categories:

| Category | Tools | Method |
|---|---|---|
| DNS Record Lookups | A, AAAA, CNAME, MX, TXT, SOA, NS, SRV, LOC, PTR | DNS-over-HTTPS |
| DNSSEC Lookups | DNSKEY, DS, NSEC, NSEC3PARAM, RRSIG | DNS-over-HTTPS |
| Email Auth | SPF, DKIM, DMARC, BIMI, MTA-STS, TLSRPT | DNS-over-HTTPS (TXT on subdomains) |
| Network | What Is My IP, HTTP Lookup, HTTPS Lookup, IPSECKEY | fetch / public APIs |
| Composites | DNS Check, Domain Health, Email Auth Check | Aggregates multiple lookups |
| Registration | WHOIS, ARIN, ASN | RDAP / external APIs |
| Certificates & Blacklists | CERT Lookup, Blacklist Check | crt.sh / DNSBL via DoH |
| Bonus (client-side) | Email Header Analyzer, Subnet Calculator, SPF Generator, DMARC Generator | Pure JS, no network |

### What Is NOT Included (and why)

5 tools are **impossible in a browser** due to requiring raw socket access:
- **Ping** — needs ICMP packets
- **TCP Lookup** — needs raw TCP sockets to arbitrary ports
- **Traceroute** — needs ICMP/UDP with TTL manipulation
- **Test Email Server** — needs SMTP on port 25/587
- **Email Deliverability** (full) — the SMTP portion is impossible; the DNS portion IS implemented as "Email Auth Check"

---

## 2. Tech Stack

```
Vite  ─────────────  Build tool & dev server
React + TypeScript ─  UI framework
Tailwind CSS v4  ───  Styling (via @tailwindcss/vite plugin)
shadcn/ui  ─────────  Component library (Card, Table, Input, Button, etc.)
```

### Why These Choices

- **Vite** — Fast dev server, instant HMR, zero-config for React+TS
- **shadcn/ui** — Not a dependency; copies component source into `src/components/ui/`. Gives full control, consistent design, dark mode built-in
- **Tailwind v4** — Peer requirement for shadcn/ui; v4 is simpler (no `tailwind.config.js`, just `@import "tailwindcss"` in CSS)
- **No backend** — The entire point is browser-only. External APIs are called directly from the client

### Project Structure

```
url-scanner/
├── src/
│   ├── components/
│   │   ├── ui/              ← shadcn components (button, card, table, etc.)
│   │   ├── layout/          ← Sidebar, Header, SettingsDialog
│   │   ├── shared/          ← DNSResultTable, ResultCard, CopyButton, etc.
│   │   └── tools/           ← One component per tool or tool group
│   ├── lib/
│   │   ├── doh.ts           ← Core DNS-over-HTTPS query engine
│   │   ├── settings.ts      ← localStorage config management
│   │   ├── parsers/         ← Record-specific parsers (SPF, DMARC, etc.)
│   │   └── apis/            ← External API wrappers (RDAP, ipify, ipapi, crt.sh)
│   ├── pages/               ← Route-level page components
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css            ← Tailwind entry + custom tokens
├── index.html
├── vite.config.ts
├── tsconfig.json
├── components.json           ← shadcn config
└── package.json
```

---

## 3. Core Technical Concepts

### 3.1 DNS-over-HTTPS (DoH) — The Heart of the App

Traditional DNS queries use UDP port 53 — browsers can't do this. But **Google** and **Cloudflare** expose DNS as HTTPS JSON APIs that support CORS, meaning browsers can query DNS directly.

**Google DoH:**
```typescript
// Query MX records for google.com
const response = await fetch('https://dns.google/resolve?name=google.com&type=MX');
const data = await response.json();
// data.Answer = [{ name: "google.com", type: 15, TTL: 300, data: "10 smtp.google.com." }]
```

**Cloudflare DoH:**
```typescript
const response = await fetch('https://cloudflare-dns.com/dns-query?name=google.com&type=MX', {
  headers: { 'accept': 'application/dns-json' }  // Required header!
});
```

**Key implementation detail:** Both APIs return record type as a numeric code (e.g., `15` = MX, `1` = A, `28` = AAAA). The DoH engine must map these to human-readable names. Reference: [IANA DNS Parameters](https://www.iana.org/assignments/dns-parameters/dns-parameters.xhtml#dns-parameters-4).

**The DoH engine (`src/lib/doh.ts`) should expose:**
```typescript
interface DNSRecord {
  name: string;
  type: number;
  typeName: string;  // Human readable: "A", "MX", etc.
  TTL: number;
  data: string;
  parsed?: Record<string, unknown>;  // Structured parse for complex types
}

interface DNSResponse {
  status: number;      // 0 = NOERROR, 2 = SERVFAIL, 3 = NXDOMAIN
  records: DNSRecord[];
  authority?: DNSRecord[];
  queryTime: number;   // ms
  provider: 'google' | 'cloudflare';
}

async function queryDNS(
  domain: string,
  type: string,          // "A", "MX", "TXT", etc.
  provider?: 'google' | 'cloudflare'
): Promise<DNSResponse>
```

### 3.2 How Each Tool Category Works

#### Simple DNS Lookups (Parts 1 & 2)
Directly call `queryDNS(domain, type)`. Display raw results in a table. Some types need parsing:
- **MX**: `data` = `"10 smtp.google.com."` → parse into `{ priority: 10, exchange: "smtp.google.com" }`
- **SOA**: `data` = `"ns1.google.com. dns-admin.google.com. 2024010100 900 900 1800 60"` → parse 7 fields
- **SRV**: `data` = `"10 5 5060 sip.example.com."` → parse priority, weight, port, target
- **Reverse Lookup**: Convert IP `1.2.3.4` → query `4.3.2.1.in-addr.arpa` for PTR record

#### Email Auth Tools (Part 3)
These are TXT lookups on **specific subdomains**, with structured parsing:

```typescript
// SPF: query the domain itself for TXT, filter for "v=spf1"
const spf = await queryDNS('example.com', 'TXT');
const spfRecord = spf.records.find(r => r.data.startsWith('"v=spf1'));

// DMARC: always lives at _dmarc.{domain}
const dmarc = await queryDNS('_dmarc.example.com', 'TXT');

// DKIM: lives at {selector}._domainkey.{domain} — user must provide selector
const dkim = await queryDNS('google._domainkey.example.com', 'TXT');

// BIMI: lives at default._bimi.{domain}
const bimi = await queryDNS('default._bimi.example.com', 'TXT');

// MTA-STS: TXT at _mta-sts.{domain} + HTTP fetch of policy file
const mtaSts = await queryDNS('_mta-sts.example.com', 'TXT');
const policy = await fetch('https://mta-sts.example.com/.well-known/mta-sts.txt');

// TLSRPT: TXT at _smtp._tls.{domain}
const tlsrpt = await queryDNS('_smtp._tls.example.com', 'TXT');
```

Each record has a well-defined format that should be parsed into structured fields (e.g., DMARC `v=DMARC1; p=reject; rua=mailto:...` → `{ version, policy, rua, ruf, pct, ... }`).

#### External API Tools (Parts 6 & 7)
These don't use DoH — they call REST APIs directly:

```typescript
// WHOIS via RDAP (free, no key)
const whois = await fetch('https://rdap.org/domain/example.com');

// ARIN IP registration (free, no key)
const arin = await fetch('https://rdap.arin.net/registry/ip/8.8.8.8');

// ASN lookup (free, 1000/day)
const asn = await fetch('https://api.ipapi.is?q=8.8.8.8');

// Certificate Transparency (needs CORS proxy)
const certs = await fetch(`${corsProxy}https://crt.sh/?q=example.com&output=json`);
```

**CORS challenges:** RDAP servers and crt.sh may not send CORS headers. The app should:
1. Try the direct request
2. If CORS blocked, try via user-configured CORS proxy (e.g., `https://corsproxy.io/?`)
3. If no proxy, show a fallback link to open in a new tab

#### Blacklist Check (Part 7)
DNSBL works by querying a reversed IP against a blacklist zone. If an A record is returned, the IP is listed:

```typescript
// Check if 1.2.3.4 is on bl.spamcop.net
const reversed = '4.3.2.1';
const result = await queryDNS(`${reversed}.bl.spamcop.net`, 'A');
// If result.status === 0 and records exist → IP is LISTED
// If result.status === 3 (NXDOMAIN) → IP is CLEAN
```

**Caveat:** Spamhaus blocks queries from public DoH resolvers (Google/Cloudflare). For Spamhaus zones, users need a DQS API key. Other DNSBLs (SpamCop, Barracuda, SORBS) generally work via DoH.

#### Composite Tools (Parts 5 & 9)
These just run multiple individual lookups in parallel and aggregate results:

```typescript
// DNS Check = run all these in parallel
const results = await Promise.allSettled([
  queryDNS(domain, 'A'),
  queryDNS(domain, 'AAAA'),
  queryDNS(domain, 'MX'),
  queryDNS(domain, 'NS'),
  queryDNS(domain, 'SOA'),
  queryDNS(domain, 'TXT'),
]);
// Then score/grade based on what's present and valid
```

#### Client-Side Tools (Part 8)
No network calls — pure JavaScript:
- **Email Header Analyzer**: Parse multi-line raw headers, extract `Received:` chain hops, compute time deltas between hops
- **Subnet Calculator**: Binary math on IP addresses + CIDR prefix
- **SPF/DMARC Generators**: Form-driven wizards that construct a valid DNS TXT record string

### 3.3 Settings & Configuration

Stored in `localStorage` under a single key (e.g., `url-scanner-settings`):

```typescript
interface AppSettings {
  dohProvider: 'google' | 'cloudflare';
  corsProxyUrl?: string;       // e.g., "https://corsproxy.io/?"
  apiKeys: {
    ipinfo?: string;           // For enriched IP geolocation
    spamhausDqs?: string;      // For Spamhaus blacklist checks
  };
  theme: 'light' | 'dark' | 'system';
  queryHistory: QueryHistoryEntry[];
}
```

API keys are **never sent anywhere except the specific API they belong to**. They stay in the user's browser.

### 3.4 UI Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Header: Logo + SuperTool search bar + Settings gear    │
├────────────┬────────────────────────────────────────────┤
│            │                                            │
│  Sidebar   │  Main Content Area                        │
│            │                                            │
│  DNS ▾     │  ┌─ Tool Title ──────────────────────┐    │
│   A        │  │                                    │    │
│   AAAA     │  │  Input: [domain/IP input] [Run]   │    │
│   CNAME    │  │                                    │    │
│   MX       │  │  Results:                          │    │
│   ...      │  │  ┌──────────────────────────────┐  │    │
│            │  │  │  DNSResultTable / ResultCard  │  │    │
│  Email ▾   │  │  │  (type-specific rendering)   │  │    │
│   SPF      │  │  └──────────────────────────────┘  │    │
│   DKIM     │  │                                    │    │
│   DMARC    │  │  [Copy] [Export JSON] [Export CSV] │    │
│   ...      │  └────────────────────────────────────┘    │
│            │                                            │
│  Network ▾ │                                            │
│  WHOIS ▾   │                                            │
│  Bonus ▾   │                                            │
└────────────┴────────────────────────────────────────────┘
```

**SuperTool** (the main search bar) auto-detects input type:
- Looks like a domain (`example.com`) → DNS Check
- Looks like an IP (`8.8.8.8`) → Reverse Lookup + ASN
- Looks like a URL (`https://...`) → HTTP/HTTPS Lookup
- Multi-line paste → Email Header Analyzer

**Component reuse pattern:** Most DNS tools share one generic `<DNSLookupPage>` component that accepts a record type prop. Specialized tools (email auth, composites) get their own components but reuse `<DNSResultTable>` and `<ResultCard>` for display.

---

## 4. Known Limitations & Gotchas

### Browser Sandbox Restrictions
- **No raw sockets** — ICMP (ping), TCP (port scan), SMTP (email test) are impossible
- **No SSL cert inspection** — `fetch()` doesn't expose TLS handshake details
- **CORS** — Many APIs don't send `Access-Control-Allow-Origin`. DoH providers (Google, Cloudflare) DO. RDAP and crt.sh may NOT

### DoH Specifics
- **No authoritative NS queries** — DoH always resolves through the provider's recursive resolver. You can't query a specific nameserver directly
- **`ANY` queries are unreliable** — Most resolvers return incomplete results for `type=ANY`. Always query specific types individually
- **Rate limits** — Google and Cloudflare may rate-limit aggressive querying. The app should avoid hammering (e.g., the blacklist check queries ~30 zones — add small delays or batch)

### Spamhaus Specifically
- Public DoH resolvers return `127.255.255.254` (error code) for Spamhaus zones
- Users need a free [Spamhaus DQS key](https://www.spamhaus.org/dqs/) to query Spamhaus blocklists
- Non-Spamhaus DNSBLs generally work fine through DoH

---

## 5. End Goal

The finished product is a **single-page web application** that:

1. **Runs locally** via `npm run dev` (Vite dev server) — no deployment needed
2. **Provides 35 diagnostic tools** matching MXToolbox functionality where browser-possible
3. **Requires zero accounts** — works out of the box for 26+ tools, with optional API keys unlocking 5 more
4. **Looks premium** — dark mode, shadcn/ui components, smooth animations, responsive layout
5. **Stores nothing remotely** — all settings, history, and API keys stay in `localStorage`
6. **Is easy to extend** — adding a new DNS lookup tool means adding one route + one config entry (the generic `<DNSLookupPage>` handles the rest)

### Definition of Done

- [ ] All 35 tools listed in the task list are implemented and functional
- [ ] Results match MXToolbox output for the same queries (validated manually)
- [ ] Settings panel stores/retrieves API keys and preferences correctly
- [ ] Dark/light mode works
- [ ] Mobile-responsive layout
- [ ] SuperTool auto-detection works for domains, IPs, URLs, and email headers
- [ ] Export (JSON/CSV) and copy-to-clipboard work on all result types

---

## 6. Reference Documents

| Document | Location | Purpose |
|---|---|---|
| Implementation Plan | `implementation-plan-copy.md` (project root) | Feasibility analysis of all 36 tools |
| Task List | Gemini brain artifacts | Part-by-part build checklist |
| This Guide | `PROJECT_GUIDE.md` (project root) | You're reading it |

### Key External APIs

| API | URL | Auth | CORS |
|---|---|---|---|
| Google DoH | `https://dns.google/resolve` | None | ✅ Yes |
| Cloudflare DoH | `https://cloudflare-dns.com/dns-query` | None | ✅ Yes |
| RDAP (WHOIS) | `https://rdap.org/domain/{domain}` | None | ⚠️ Varies |
| ARIN RDAP | `https://rdap.arin.net/registry/ip/{ip}` | None | ⚠️ Varies |
| ipapi.is | `https://api.ipapi.is?q={ip}` | None | ✅ Yes |
| IPinfo | `https://ipinfo.io/{ip}?token={token}` | Token | ✅ Yes |
| ipify | `https://api.ipify.org?format=json` | None | ✅ Yes |
| crt.sh | `https://crt.sh/?q={domain}&output=json` | None | ❌ No |
| Spamhaus DQS | DoH query with DQS key in zone | DQS Key | N/A (DoH) |
