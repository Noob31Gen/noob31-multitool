# MultiTools Cloudflare Worker API Reference

A high-performance (<10ms CPU time), server-to-server REST API built on **Cloudflare Workers** and **Hono** for network diagnostics, domain health, email authentication, security intelligence, and network mathematics.

---

## ⚡ Architecture Highlights
- **Direct Server-to-Server Requests**: Outbound queries execute from Cloudflare Edge to target registries and APIs, eliminating browser CORS restrictions.
- **Universal CORS Enabled**: Returns `Access-Control-Allow-Origin: *` to your web frontend.
- **Uniform JSON API Envelope**: Every request returns a standard, predictable JSON envelope with execution time and timestamp.
- **OpenAPI 3.1.0 & Interactive Docs**: Built-in `/openapi.json` and interactive Scalar/Swagger UI at `/docs`.
- **Human-Readable Formatting**: Supports `?pretty=true` on all endpoints.

---

## 📦 Standard API Response Envelope

### Success Response (`200 OK`)
```json
{
  "success": true,
  "status": 200,
  "timestamp": "2026-08-17T10:55:00.000Z",
  "endpoint": "/api/dns/lookup",
  "executionTimeMs": 42,
  "data": { ... }
}
```

### Error Response (`4xx / 5xx`)
```json
{
  "success": false,
  "status": 400,
  "timestamp": "2026-08-17T10:55:00.000Z",
  "endpoint": "/api/dns/lookup",
  "executionTimeMs": 2,
  "error": "Query parameter 'name' is required.",
  "hint": "Example: /api/dns/lookup?name=google.com&type=A"
}
```

---

## 🚀 Quickstart & Deployment

### Local Development
```bash
cd api-worker
npm install
npm run dev
```

### Run Full Test Suite
```bash
npx tsx test/worker.test.ts
```

### Deploy to Cloudflare Workers
```bash
cd api-worker
npm run deploy
```

---

## 📖 API Endpoints Reference

### 1. System & Documentation

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/` | `GET` | API status, version, and endpoints directory |
| `/health` | `GET` | Health check & uptime |
| `/docs` | `GET` | Interactive Scalar / Swagger API Reference UI |
| `/openapi.json` | `GET` | Complete OpenAPI 3.1.0 Specification |

---

### 2. DNS & DNSSEC

| Endpoint | Method | Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/api/dns/lookup` | `GET` | `name` (required), `type` (default `A`), `provider` (default `auto`) | Multi-resolver DoH lookup (Google, Cloudflare, DNS.SB, AliDNS, AdGuard) |
| `/api/dns/dnssec` | `GET` | `name` (required), `type` (default `DNSKEY`) | DNSSEC keys, DS records, and RRSIG validation |
| `/api/dns/reverse` | `GET` | `ip` (required) | Reverse DNS (PTR) lookup for IPv4/IPv6 |
| `/api/dns/propagation` | `GET` | `domain` (required), `type` (default `A`) | Global DNS propagation across 5 worldwide resolvers with consensus scoring |

---

### 3. RDAP, WHOIS & Corporate Intelligence

| Endpoint | Method | Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/api/rdap/lookup` | `GET` | `query` (required: domain or IP) | RFC-compliant RDAP registration with direct RIR failover (ARIN REST, RIPE, APNIC, LACNIC, AFRINIC) and who-dat |
| `/api/rdap/company` | `GET` | `query` (required) | Search US SEC EDGAR CIK numbers, tickers, Clearbit logos, and Yahoo Finance |

---

### 4. Security & Threat Intelligence

| Endpoint | Method | Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/api/security/threat-intel` | `GET` | `query` (required: IP, domain, hash, URL) | Aggregates AlienVault OTX, URLScan.io, Shodan InternetDB, and Blocklist.de |
| `/api/security/cve` | `GET` | `cve` (required: e.g. `CVE-2021-44228`) | CIRCL CVE-Search, OSV, First.org EPSS exploit prediction score, and CISA KEV catalog check |
| `/api/security/blacklist` | `GET` | `target` (required: IPv4) | Scans IP across 7 major DNSBL anti-spam and malware databases |
| `/api/security/reputation` | `GET` | `target` (required) | Multi-vector reputation rating, StopForumSpam check, and RIPE abuse contacts |
| `/api/security/cert` | `GET` | `domain` (required) | Historical SSL/TLS Certificate Transparency logs via crt.sh & CertSpotter |
| `/api/security/typosquat` | `GET` | `domain` (required) | Permutation generator & active DNS check for typosquatting & bit-squatting domains |

---

### 5. Network & Hardware Diagnostics

| Endpoint | Method | Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/api/network/subdomains` | `GET` | `domain` (required) | 6-way passive subdomain discovery (HackerTarget, RapidDNS, crt.sh, CertSpotter, Mnemonic, URLScan) |
| `/api/network/my-ip` | `GET` | - | Client public IP, Cloudflare edge datacenter context (`colo`), ASN, and Geolocation |
| `/api/network/geoip` | `GET` | `ip` (required) | Datacenter, VPN, Tor, Proxy detection (IPAPI.is), ISO2/ISO3 country mapping, and abuse contacts |
| `/api/network/asn` | `GET` | `asn` or `ip` (required) | ASN details, BGP routing origins (RIPE Stat), and PeeringDB peering exchanges |
| `/api/network/mac` | `GET` | `mac` (required) | Hardware OUI manufacturer lookup with 4-tier cascade (Troubleshooting.tools, maclookup.app, macvendorlookup, macvendors.com) |

---

### 6. Web & HTTP Inspection

| Endpoint | Method | Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/api/http/scan` / `/api/url/scan` | `GET` | `url` (required) | Trace redirect hops (up to 5), response headers, latency, technology detection, and security headers grading (`A+` to `F`) |
| `/api/http/headers` | `GET` | `url` (required) | Security headers audit (HSTS, CSP, X-Frame-Options, CORS, Permissions-Policy) |

---

### 7. Email Diagnostics

| Endpoint | Method | Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/api/email/auth` | `GET` | `domain` (required), `selector` (optional) | SPF syntax & mechanism validation, DMARC policy reporting tags, and DKIM selector check |
| `/api/email/deliverability` | `GET` | `domain` (required) | Deliverability scoring & grade (`A+` to `F`) based on MX records and email authentication |
| `/api/email/parse-headers` | `POST` / `GET` | JSON `{ "headers": "..." }` or `?raw=...` | RFC 5322 email header parser, hop-by-hop relay latency, and Authentication-Results parsing |

---

### 8. Utility Tools & Network Math

| Endpoint | Method | Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/api/tools/subnet` | `GET` | `cidr` (required: e.g. `192.168.1.0/24`) | IPv4 / IPv6 CIDR subnet calculator (network, broadcast, usable host range, wildcard mask, binary netmask, IP class) |
| `/api/tools/hash` | `GET` | `input` (required) | Cryptographic hash format identifier & multi-algorithm generator (SHA-1, SHA-256, SHA-384, SHA-512) |
