# MultiTools Cloudflare Worker API Documentation

A high-performance (<10ms CPU time), server-to-server API suite built on **Cloudflare Workers** and **Hono** for network diagnostics, domain health, email authentication, and security threat intelligence.

---

## ⚡ Key Highlights
- **Zero CORS Proxy Needed**: Outbound queries execute server-to-server from Cloudflare Edge to target registries/APIs, avoiding all browser CORS restrictions.
- **Universal CORS Enabled**: Returns standard `Access-Control-Allow-Origin: *` to your web frontend.
- **Ultra-Low Latency & CPU Time**: Sub-millisecond routing overhead powered by Hono and non-blocking asynchronous Fetch API.
- **Cascading Fallbacks**: Multi-layer fallbacks for DNS (Google, Cloudflare, AliDNS, AdGuard), RDAP (rdap.org, ARIN, RIPE, APNIC, LACNIC, AFRINIC, who-dat), and MAC lookups.

---

## 🚀 Quickstart & Deployment

### Local Development
```bash
cd api-worker
npm install
npm run dev
```

### Deploy to Cloudflare Workers
```bash
cd api-worker
npm run deploy
```

---

## 📖 API Endpoints Reference

### 1. System & Health

#### `GET /`
Returns API metadata, status, version, and the full endpoint directory.

#### `GET /health`
Returns health check status and timestamp.

---

### 2. DNS & Domain Resolution

#### `GET /api/dns/lookup`
Resolves standard DNS records with multi-provider DoH fallback.
- **Parameters**:
  - `name` (required): Domain name (e.g. `google.com`)
  - `type` (optional, default `A`): Record type (`A`, `AAAA`, `MX`, `TXT`, `CNAME`, `NS`, `SOA`, `PTR`, `SRV`, `CAA`, `ANY`)
  - `provider` (optional, default `auto`): Resolver (`auto`, `google`, `cloudflare`, `alidns`, `adguard`)

**Example Response**:
```json
{
  "success": true,
  "data": {
    "domain": "google.com",
    "type": "A",
    "status": 0,
    "records": [
      {
        "name": "google.com.",
        "type": 1,
        "typeName": "A",
        "TTL": 300,
        "data": "142.250.190.46"
      }
    ],
    "provider": "google",
    "queryTimeMs": 42
  }
}
```

#### `GET /api/dns/dnssec`
Inspects DNSSEC keys and signatures (`DNSKEY`, `DS`, `RRSIG`).
- **Parameters**:
  - `name` (required): Domain name (e.g. `cloudflare.com`)
  - `type` (optional, default `DNSKEY`): DNSSEC record type

#### `GET /api/dns/reverse`
Performs Reverse DNS (PTR) lookup for IPv4 or IPv6.
- **Parameters**:
  - `ip` (required): IP address (e.g. `8.8.8.8`)

---

### 3. RDAP & WHOIS

#### `GET /api/rdap/lookup`
Fetches structured RFC-compliant RDAP registration data for domains or IP addresses with direct RIR fallback.
- **Parameters**:
  - `query` (required): Domain name (e.g. `github.com`) or IP address (e.g. `1.1.1.1`)

#### `GET /api/rdap/company`
Searches company profile, domain, and stock ticker.
- **Parameters**:
  - `query` (required): Company name or symbol (e.g. `Microsoft` or `MSFT`)

---

### 4. Security & Threat Intelligence

#### `GET /api/security/threat-intel`
Aggregates AlienVault OTX pulses, URLScan.io historical scans & screenshots, and Shodan InternetDB open ports and CVEs.
- **Parameters**:
  - `query` (required): IP, Domain, Hash (MD5/SHA1/SHA256), or URL

#### `GET /api/security/cert`
Fetches historical SSL/TLS Certificate Transparency (CT) logs via crt.sh and CertSpotter.
- **Parameters**:
  - `domain` (required): Target domain (e.g. `google.com`)

#### `GET /api/security/blacklist`
Scans an IP address against major DNSBL anti-spam and malicious host databases.
- **Parameters**:
  - `target` (required): IPv4 address (e.g. `148.228.16.3`)

#### `GET /api/security/reputation`
Calculates comprehensive domain/IP reputation, security flags, and risk rating.
- **Parameters**:
  - `target` (required): Domain or IP (e.g. `example.com`)

#### `GET /api/security/cve`
Fetches vulnerability records and CVSS scores from CIRCL CVE-Search and OSV.
- **Parameters**:
  - `cve` (required): CVE ID (e.g. `CVE-2024-1234`)

---

### 5. Network & Hardware Diagnostics

#### `GET /api/network/subdomains`
Enumerates active and historical subdomains from Certificate Transparency logs and Passive DNS.
- **Parameters**:
  - `domain` (required): Target domain (e.g. `github.com`)

#### `GET /api/network/my-ip`
Extracts client public IP, Cloudflare edge datacenter code (`colo`), ASN, and Geolocation context.

#### `GET /api/network/geoip`
Queries geolocation for a specific IP address.
- **Parameters**:
  - `ip` (required): Target IP (e.g. `8.8.8.8`)

#### `GET /api/network/asn`
Fetches Autonomous System Number (ASN) details, IP prefix ownership, and PeeringDB data.
- **Parameters**:
  - `asn` (optional): ASN number (e.g. `15169`)
  - `ip` (optional): IP address to look up ASN for

#### `GET /api/network/mac`
Identifies the hardware manufacturer (OUI) from a MAC address using a 4-tier vendor API cascade.
- **Parameters**:
  - `mac` (required): Full MAC address or first 6 characters (e.g. `00:11:22:33:44:55` or `001122`)

---

### 6. Web & HTTP Inspection

#### `GET /api/http/scan` / `GET /api/url/scan`
Traces full HTTP redirect chains (up to 5 hops), response headers, latency, content-type, and security headers (HSTS, CSP, X-Frame-Options, etc.).
- **Parameters**:
  - `url` (required): Target URL (e.g. `https://example.com`)

#### `GET /api/http/headers`
Audits response headers and security headers for a target URL.
- **Parameters**:
  - `url` (required): Target URL (e.g. `https://example.com`)

---

### 7. Email Diagnostics

#### `GET /api/email/auth`
Inspects SPF, DMARC, and DKIM public DNS authentication policies.
- **Parameters**:
  - `domain` (required): Email domain (e.g. `google.com`)
  - `selector` (optional): DKIM selector (e.g. `google` or `default`)

#### `GET /api/email/deliverability`
Calculates an email deliverability score and grade (`A+` to `F`) based on MX records, SPF syntax, and DMARC enforcement.
- **Parameters**:
  - `domain` (required): Email domain (e.g. `google.com`)
