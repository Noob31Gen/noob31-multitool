# URL Scanner — Project Structure Guide

> A local-first, backend-less MXToolbox clone built with **Vite + React + TypeScript + shadcn/ui**.
> All DNS lookups run client-side via DNS-over-HTTPS (DoH). No server required.

---

## Directory Tree

```
url-scanner/
├── public/                          # Static assets served as-is
│   ├── favicon.svg
│   └── icons.svg
│
├── src/
│   ├── main.tsx                     # React entry point + ThemeProvider wrapper
│   ├── App.tsx                      # BrowserRouter + all route definitions
│   ├── index.css                    # Tailwind + shadcn theme tokens (light/dark)
│   ├── App.css                      # (unused — can be deleted)
│   │
│   ├── assets/                      # Bundled static assets
│   │   ├── hero.png
│   │   ├── react.svg
│   │   └── vite.svg
│   │
│   ├── lib/                         # ★ Core logic layer (zero UI code)
│   │   ├── doh.ts                   # DNS-over-HTTPS query engine
│   │   ├── emailAuthParsers.ts      # SPF/DKIM/DMARC/BIMI parser + query formatter
│   │   ├── health.ts                # DNS Check + Domain Health scoring
│   │   ├── deliverability.ts        # Email deliverability scoring + recommendations
│   │   ├── rdap.ts                  # RDAP/WHOIS lookup with CORS proxy fallback
│   │   ├── rdapParser.ts            # jCard/vcard structure parser for RDAP responses
│   │   ├── asn.ts                   # IPinfo ASN/IP geolocation lookup
│   │   ├── http.ts                  # HTTP header fetcher via CORS proxy
│   │   ├── cert.ts                  # crt.sh Certificate Transparency lookup
│   │   ├── blacklist.ts             # DNSBL blacklist checker (15 zones)
│   │   ├── headerParser.ts          # Raw email header parser (Received chain)
│   │   ├── subnet.ts                # IPv4 subnet calculator (bitwise)
│   │   ├── settings.ts              # localStorage-backed settings hook
│   │   └── utils.ts                 # Tailwind cn() merge utility
│   │
│   ├── components/
│   │   ├── ThemeProvider.tsx         # next-themes wrapper for dark/light mode
│   │   │
│   │   ├── layout/                  # ★ App shell (always visible)
│   │   │   ├── AppLayout.tsx        # Sidebar + Header + main content wrapper
│   │   │   ├── Header.tsx           # SuperTool search bar + theme toggle + settings
│   │   │   ├── Sidebar.tsx          # Desktop nav + mobile hamburger Sheet
│   │   │   └── SettingsSheet.tsx    # Settings slide-over (DoH, CORS proxy, API keys)
│   │   │
│   │   ├── shared/                  # ★ Reusable display components
│   │   │   ├── ResultCard.tsx       # Card wrapper with status badge + timing + actions
│   │   │   ├── DNSResultTable.tsx   # Table rendering DNSRecord[] (Type, Name, TTL, Data)
│   │   │   ├── HealthReportCard.tsx # Collapsible pass/fail/warn item (HealthItem)
│   │   │   ├── ActionButtons.tsx    # CopyButton (clipboard) + ExportButton (JSON download)
│   │   │   ├── LoadingSkeleton.tsx  # Skeleton placeholder for loading states
│   │   │   └── ThemeToggle.tsx      # Sun/Moon icon toggle button
│   │   │
│   │   ├── tools/                   # ★ One page per tool (each is a route)
│   │   │   ├── DNSLookupPage.tsx          # Generic DNS (A, AAAA, CNAME, MX, TXT, SOA, NS, SRV, LOC, PTR, IPSECKEY)
│   │   │   ├── DNSSECLookupPage.tsx       # DNSSEC (DNSKEY, DS, NSEC, NSEC3PARAM, RRSIG) + signing status
│   │   │   ├── EmailAuthPage.tsx          # Email Auth (SPF, DKIM, DMARC, BIMI, MTA-STS, TLSRPT) + parsed fields
│   │   │   ├── DnsCheckPage.tsx           # Composite: 7 DNS queries in parallel
│   │   │   ├── DomainHealthPage.tsx       # Composite: DNS + Email Auth → grade (A-F)
│   │   │   ├── EmailDeliverabilityPage.tsx # Composite: MX + email auth → deliverability score + recommendations
│   │   │   ├── RegistrationLookupPage.tsx # WHOIS / ARIN / ASN (RDAP + IPinfo)
│   │   │   ├── MyIpPage.tsx               # Auto-detect public IP + geolocation
│   │   │   ├── HttpLookupPage.tsx         # HTTP/HTTPS header inspection via CORS proxy
│   │   │   ├── CertLookupPage.tsx         # crt.sh Certificate Transparency logs
│   │   │   ├── BlacklistPage.tsx          # DNSBL check (15 zones, parallel)
│   │   │   ├── EmailHeaderAnalyzerPage.tsx # Paste raw headers → parsed hop trace
│   │   │   ├── SubnetCalculatorPage.tsx   # IPv4 CIDR calculator (pure math)
│   │   │   ├── SpfGeneratorPage.tsx       # SPF TXT record wizard
│   │   │   └── DmarcGeneratorPage.tsx     # DMARC TXT record wizard
│   │   │
│   │   └── ui/                      # shadcn/ui primitives (auto-generated, do not edit)
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── checkbox.tsx
│   │       ├── collapsible.tsx
│   │       ├── command.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── input-group.tsx
│   │       ├── label.tsx
│   │       ├── scroll-area.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── sheet.tsx
│   │       ├── skeleton.tsx
│   │       ├── sonner.tsx
│   │       ├── table.tsx
│   │       ├── tabs.tsx
│   │       ├── textarea.tsx
│   │       └── tooltip.tsx
│   │
│   └── (end of src/)
│
├── index.html                       # Vite HTML entry point
├── package.json                     # Dependencies + scripts
├── vite.config.ts                   # Vite config with React plugin + path alias
├── tsconfig.json                    # Root TS config (references app + node)
├── tsconfig.app.json                # App TS config (strict, verbatimModuleSyntax)
├── tsconfig.node.json               # Node TS config (for vite.config.ts)
├── eslint.config.js                 # ESLint flat config
├── components.json                  # shadcn/ui configuration
├── PROJECT_GUIDE.md                 # Original feasibility analysis & API reference
├── PROJECT_STRUCTURE.md             # ← This file
├── README.md                        # Basic readme
├── task.md                          # Implementation task checklist
└── implementation-plan-copy.md      # Original implementation plan
```

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                         │
│                                                                  │
│  ┌─── Layout Shell ───────────────────────────────────────────┐  │
│  │  Sidebar (nav)  │  Header (SuperTool + Theme + Settings)   │  │
│  │─────────────────│──────────────────────────────────────────│  │
│  │  • DNS Lookups  │  ┌─ Tool Page ────────────────────────┐  │  │
│  │  • DNSSEC       │  │  Input form                        │  │  │
│  │  • Email Auth   │  │  ↓                                 │  │  │
│  │  • Health       │  │  lib/* engine (fetch / compute)     │  │  │
│  │  • Registration │  │  ↓                                 │  │  │
│  │  • Security     │  │  shared/* display components        │  │  │
│  │  • Network      │  │  (ResultCard, DNSResultTable, etc.) │  │  │
│  │  • Bonus        │  └────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                          │                                       │
│                          ▼                                       │
│  ┌─── External APIs (fetched client-side) ────────────────────┐  │
│  │  Google DoH    │  Cloudflare DoH  │  IPinfo   │  RDAP.org  │  │
│  │  crt.sh (proxy)│  CORS Proxy      │  ipify    │            │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Layer Descriptions

### 1. `src/lib/` — Logic Layer

Every file in `lib/` is a **pure TypeScript module** with zero React imports. They export async functions that call external APIs and return typed data. This makes them testable and reusable outside of React.

| Module | Purpose | External API |
|--------|---------|-------------|
| `doh.ts` | Core DNS query engine | Google DoH / Cloudflare DoH |
| `emailAuthParsers.ts` | SPF/DKIM/DMARC query formatting + record filtering | (uses `doh.ts`) |
| `health.ts` | Parallel DNS + email auth checks → grade | (uses `doh.ts`) |
| `deliverability.ts` | Email deliverability scoring + recommendations | (uses `doh.ts`) |
| `rdap.ts` | WHOIS/IP registration lookup | rdap.org → regional RDAP servers |
| `rdapParser.ts` | Parses RDAP jCard/vcard nested structures | (pure parser) |
| `asn.ts` | IP/ASN geolocation | ipinfo.io |
| `http.ts` | HTTP header inspection | CORS proxy → target server |
| `cert.ts` | Certificate Transparency logs | crt.sh (via CORS proxy) |
| `blacklist.ts` | DNS-based blacklist check (15 zones) | (uses `doh.ts`) |
| `headerParser.ts` | Email header parser (Received chain) | (pure parser) |
| `subnet.ts` | IPv4 subnet calculator | (pure math) |
| `settings.ts` | `useSettings()` hook — localStorage persistence | (browser localStorage) |
| `utils.ts` | Tailwind `cn()` class merge utility | — |

### 2. `src/components/shared/` — Reusable UI

These components are **tool-agnostic**. They accept data via props and render it. No business logic.

| Component | Used By | Purpose |
|-----------|---------|---------|
| `ResultCard` | Every tool page | Card wrapper with title, status badge, timing, action slot |
| `DNSResultTable` | DNS, DNSSEC, Health, Deliverability | Table for `DNSRecord[]` arrays |
| `HealthReportCard` (exports `HealthItem`) | Health, Deliverability, DNS Check | Collapsible pass/fail/warn row |
| `ActionButtons` (exports `CopyButton`, `ExportButton`) | Every tool page | Copy to clipboard + JSON file download |
| `LoadingSkeleton` | Every tool page | Animated skeleton placeholder |
| `ThemeToggle` | Header | Dark/light mode switcher |

### 3. `src/components/tools/` — Tool Pages

Each file is a **standalone route component**. They follow a consistent pattern:

```
1. Import lib engine + shared components
2. useState for: query, status ('idle'|'loading'|'success'|'error'), result, errorMsg
3. useSearchParams() to read ?q= from SuperTool navigation
4. handleSearch() → calls lib engine → sets result
5. Render: title → input form → loading/error/success states
```

**Component reuse map:**

| Generic Component | Tools It Powers |
|-------------------|-----------------|
| `DNSLookupPage` | A, AAAA, CNAME, MX, TXT, SOA, NS, SRV, LOC, PTR, IPSECKEY (11 tools, 1 component) |
| `DNSSECLookupPage` | DNSKEY, DS, NSEC, NSEC3PARAM, RRSIG (5 tools, 1 component) |
| `EmailAuthPage` | SPF, DKIM, DMARC, BIMI, MTA-STS, TLSRPT (6 tools, 1 component) |
| `RegistrationLookupPage` | WHOIS, ARIN, ASN (3 tools, 1 component) |
| `HttpLookupPage` | HTTP, HTTPS (2 tools, 1 component) |

> **27 tools are powered by just 5 generic components** via props.
> The remaining 8 tools each have their own dedicated page.

### 4. `src/components/layout/` — App Shell

| Component | Role |
|-----------|------|
| `AppLayout` | Flex container: Sidebar (left) + Header (top) + `{children}` (main) |
| `Sidebar` | Desktop: fixed 256px sidebar. Mobile: hamburger → Sheet slide-over |
| `Header` | SuperTool search bar (auto-detect input type) + ThemeToggle + Settings |
| `SettingsSheet` | Slide-over panel: DoH provider, CORS proxy URL, API keys |

### 5. `src/components/ui/` — shadcn/ui Primitives

Auto-generated by `npx shadcn`. **Do not manually edit these files.** To add a new component:

```bash
npx shadcn@latest add <component-name>
```

---

## Routing Map

All routes are defined in `src/App.tsx`. The SuperTool in `Header.tsx` navigates to these with `?q=` params.

| Route | Component | Category |
|-------|-----------|----------|
| `/` | Welcome page | — |
| `/dns/a` | `DNSLookupPage` (type=A) | DNS |
| `/dns/aaaa` | `DNSLookupPage` (type=AAAA) | DNS |
| `/dns/cname` | `DNSLookupPage` (type=CNAME) | DNS |
| `/dns/mx` | `DNSLookupPage` (type=MX) | DNS |
| `/dns/txt` | `DNSLookupPage` (type=TXT) | DNS |
| `/dns/soa` | `DNSLookupPage` (type=SOA) | DNS |
| `/dns/ns` | `DNSLookupPage` (type=NS) | DNS |
| `/dns/srv` | `DNSLookupPage` (type=SRV) | DNS |
| `/dns/loc` | `DNSLookupPage` (type=LOC) | DNS |
| `/dns/ptr` | `DNSLookupPage` (type=PTR) | DNS |
| `/dnssec/dnskey` | `DNSSECLookupPage` (type=DNSKEY) | DNSSEC |
| `/dnssec/ds` | `DNSSECLookupPage` (type=DS) | DNSSEC |
| `/dnssec/nsec` | `DNSSECLookupPage` (type=NSEC) | DNSSEC |
| `/dnssec/nsec3param` | `DNSSECLookupPage` (type=NSEC3PARAM) | DNSSEC |
| `/dnssec/rrsig` | `DNSSECLookupPage` (type=RRSIG) | DNSSEC |
| `/email/spf` | `EmailAuthPage` (type=SPF) | Email Auth |
| `/email/dkim` | `EmailAuthPage` (type=DKIM) | Email Auth |
| `/email/dmarc` | `EmailAuthPage` (type=DMARC) | Email Auth |
| `/email/bimi` | `EmailAuthPage` (type=BIMI) | Email Auth |
| `/email/mta-sts` | `EmailAuthPage` (type=MTA-STS) | Email Auth |
| `/email/tlsrpt` | `EmailAuthPage` (type=TLSRPT) | Email Auth |
| `/health/dns` | `DnsCheckPage` | Health |
| `/health/domain` | `DomainHealthPage` | Health |
| `/health/deliverability` | `EmailDeliverabilityPage` | Health |
| `/registration/whois` | `RegistrationLookupPage` (tool=WHOIS) | Registration |
| `/registration/arin` | `RegistrationLookupPage` (tool=ARIN) | Registration |
| `/registration/asn` | `RegistrationLookupPage` (tool=ASN) | Registration |
| `/network/my-ip` | `MyIpPage` | Network |
| `/network/http` | `HttpLookupPage` (scheme=http) | Network |
| `/network/https` | `HttpLookupPage` (scheme=https) | Network |
| `/network/ipseckey` | `DNSLookupPage` (type=IPSECKEY) | Network |
| `/security/cert` | `CertLookupPage` | Security |
| `/security/blacklist` | `BlacklistPage` | Security |
| `/bonus/headers` | `EmailHeaderAnalyzerPage` | Bonus |
| `/bonus/subnet` | `SubnetCalculatorPage` | Bonus |
| `/bonus/spf-generator` | `SpfGeneratorPage` | Bonus |
| `/bonus/dmarc-generator` | `DmarcGeneratorPage` | Bonus |

**Total: 37 routes → 15 component files → 14 lib modules**

---

## Data Flow

```
User Input (domain/IP/URL)
    │
    ▼
Tool Page (handleSearch)
    │
    ├─ DNS tools ──────→ doh.ts ──────→ Google/Cloudflare DoH API
    ├─ Email Auth ─────→ emailAuthParsers.ts + doh.ts
    ├─ Health/Deliv. ──→ health.ts / deliverability.ts ──→ doh.ts (parallel)
    ├─ WHOIS/ARIN ─────→ rdap.ts ──────→ rdap.org (+ CORS proxy fallback)
    ├─ ASN/My IP ──────→ asn.ts ───────→ ipinfo.io
    ├─ HTTP Headers ───→ http.ts ──────→ CORS proxy → target server
    ├─ CERT ───────────→ cert.ts ──────→ CORS proxy → crt.sh
    ├─ Blacklist ──────→ blacklist.ts ─→ doh.ts (15 parallel queries)
    ├─ Email Headers ──→ headerParser.ts (pure parsing, no network)
    ├─ Subnet Calc ────→ subnet.ts (pure math, no network)
    └─ SPF/DMARC Gen ──→ (pure string building, no network)
    │
    ▼
Shared Components (ResultCard, DNSResultTable, HealthItem, etc.)
    │
    ▼
Rendered UI
```

---

## Settings & Persistence

All settings live in `localStorage` under the key `url-scanner-settings`.

| Setting | Default | Used By |
|---------|---------|---------|
| `dohProvider` | `'google'` | All DNS lookups |
| `corsProxyUrl` | `'https://corsproxy.io/?'` | HTTP headers, crt.sh, RDAP fallback |
| `apiKeys.ipinfo` | `''` (empty) | ASN lookup, My IP page |
| `apiKeys.spamhausDqs` | `''` (empty) | Blacklist checker (Spamhaus zones) |

Theme preference is stored separately under `url-scanner-theme` by `next-themes`.

---

## Key Design Decisions

1. **No backend.** Every query runs in the browser. DNS queries use Google/Cloudflare DoH (which both support CORS natively). Non-DNS queries that don't support CORS (RDAP, crt.sh, HTTP headers) route through a user-configured CORS proxy.

2. **Generic components over copy-paste.** 27 of 37 tools are powered by just 5 parameterized components. Adding a new DNS record type means adding one `<Route>` line and one sidebar entry — zero new component files needed.

3. **Lib/UI separation.** Every `lib/*.ts` file is a pure async function with zero React dependencies. This means the logic layer could be extracted into a CLI tool, a Node script, or a different UI framework without changes.

4. **Parallel queries.** Composite tools (`DnsCheckPage`, `DomainHealthPage`, `EmailDeliverabilityPage`, `BlacklistPage`) use `Promise.all` to fire 7–15 DNS queries simultaneously, keeping total response times under 1–2 seconds.

5. **Graceful degradation.** Every external-API tool has explicit CORS error handling. When the CORS proxy is not configured, tools show a warning banner and/or a fallback "open in new tab" link rather than crashing.

---

## Scripts

```bash
npm run dev       # Start Vite dev server (http://localhost:5173)
npm run build     # TypeScript check + Vite production build → dist/
npm run preview   # Serve the production build locally
npm run lint      # Run ESLint
```

---

## Adding a New Tool

### If it's a standard DNS record type:

1. Add a `<Route>` in `App.tsx`:
   ```tsx
   <Route path="/dns/newtype" element={<DNSLookupPage defaultType="NEWTYPE" title="..." description="..." />} />
   ```
2. Add entry in `Sidebar.tsx` `TOOL_CATEGORIES` array.
3. If needed, add the numeric type code to `TYPE_MAP` in `doh.ts`.

### If it's a new specialized tool:

1. Create the lib engine in `src/lib/newengine.ts`.
2. Create the page in `src/components/tools/NewToolPage.tsx` following the existing pattern.
3. Add a `<Route>` in `App.tsx` and import the page.
4. Add entry in `Sidebar.tsx`.

### If you need a new shadcn/ui component:

```bash
npx shadcn@latest add <component-name>
```
