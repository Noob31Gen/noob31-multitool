# MXToolbox Clone — Feasibility Analysis

A local, browser-based clone of MXToolbox using DNS-over-HTTPS APIs, free public APIs, and optional user-provided API keys.

## Summary

| Category | Count |
|---|---|
| ✅ Fully doable (browser-only, no API key) | **26** |
| ⚠️ Doable with free API / user API key | **5** |
| ❌ Not possible in-browser | **5** |
| **Total from screenshot** | **36** |

**31 out of 36 tools are fully implementable. 5 more are possible with API keys. Only 5 are truly impossible in a browser.**

---

## Tier 1: ✅ Fully Doable — Browser-Only (DNS-over-HTTPS)

These tools are just DNS record lookups. They can all be implemented using **Google DoH** (`https://dns.google/resolve?name=X&type=Y`) or **Cloudflare DoH** (`https://cloudflare-dns.com/dns-query?name=X&type=Y`). Both support CORS natively.

| # | Tool | DNS Query | Notes |
|---|---|---|---|
| 1 | **A/DNS Lookup** | `type=A` | Standard A record |
| 2 | **AAAA Lookup** | `type=AAAA` | IPv6 address record |
| 3 | **CNAME Lookup** | `type=CNAME` | Canonical name |
| 4 | **MX Lookup** | `type=MX` | Mail exchange records |
| 5 | **TXT Lookup** | `type=TXT` | Text records |
| 6 | **SOA Lookup** | `type=SOA` | Start of authority |
| 7 | **SRV Lookup** | `type=SRV` | Service locator |
| 8 | **NS (DNS Lookup)** | `type=NS` | Nameserver records |
| 9 | **LOC Lookup** | `type=LOC` | Location record (rare) |
| 10 | **DNSKEY Lookup** | `type=DNSKEY` | DNSSEC signing keys |
| 11 | **DS Lookup** | `type=DS` | Delegation signer (DNSSEC) |
| 12 | **NSEC Lookup** | `type=NSEC` | Next secure record (DNSSEC) |
| 13 | **NSEC3PARAM Lookup** | `type=NSEC3PARAM` | NSEC3 parameters (DNSSEC) |
| 14 | **RRSIG Lookup** | `type=RRSIG` | DNSSEC signature |
| 15 | **IPSECKEY Lookup** | `type=IPSECKEY` | IPsec key record |
| 16 | **Reverse Lookup** | `type=PTR` on reversed IP | Reverse DNS (PTR record) |
| 17 | **SPF Record Lookup** | `type=TXT` | Parse TXT records starting with `v=spf1` |
| 18 | **DKIM Lookup** | `type=TXT` on `selector._domainkey.domain` | User provides DKIM selector |
| 19 | **DMARC Lookup** | `type=TXT` on `_dmarc.domain` | Parse for `v=DMARC1` |
| 20 | **BIMI Lookup** | `type=TXT` on `default._bimi.domain` | Brand indicator record |
| 21 | **MTA-STS Lookup** | `type=TXT` on `_mta-sts.domain` + `fetch` policy | TXT record + fetch `https://mta-sts.domain/.well-known/mta-sts.txt` |
| 22 | **TLSRPT Lookup** | `type=TXT` on `_smtp._tls.domain` | TLS reporting record |
| 23 | **What Is My IP?** | N/A | Use free APIs: `https://api.ipify.org?format=json`, `https://api64.ipify.org?format=json` |
| 24 | **HTTP Lookup** | `fetch()` | Fetch URL, inspect response status/headers. Works for CORS-enabled sites; can report what's available |
| 25 | **HTTPS Lookup** | `fetch()` | Same as HTTP but over HTTPS. Can verify connectivity. Cannot inspect SSL cert details from browser |
| 26 | **DNS Check** | Multiple `type=` queries | Composite check: query NS, SOA, MX, A, AAAA, TXT and present a health overview |

> [!NOTE]
> **HTTP/HTTPS Lookup** will be limited by CORS for many sites — we can still report connectivity status, redirect chains, and response codes for sites that allow it, and clearly indicate when CORS blocks the request.

> [!NOTE]
> **DNS Check / Domain Health** on MXToolbox queries specific nameservers. We can approximate this by querying all common record types via DoH and presenting a consolidated view. The results will come from the DoH resolver's perspective, not from querying each authoritative NS directly.

---

## Tier 2: ⚠️ Doable with External APIs (free or user API key)

| # | Tool | API / Method | Notes |
|---|---|---|---|
| 27 | **Whois Lookup** | RDAP via `https://rdap.org/domain/{domain}` | Free, no key needed. RDAP is the modern replacement for WHOIS. Some registries may block CORS — falls back to display error |
| 28 | **ARIN Lookup** | `https://rdap.arin.net/registry/ip/{ip}` | Free RDAP endpoint for IP registration info |
| 29 | **ASN Lookup** | `https://api.ipapi.is?q={ip}` or IPinfo with token | ipapi.is: 1,000 free/day. IPinfo: free tier with token (CORS supported) |
| 30 | **CERT Lookup** | `https://crt.sh/?q={domain}&output=json` | Certificate Transparency logs. **No CORS** — needs a CORS proxy or user can self-host a tiny proxy |
| 31 | **Blacklist Check** | Spamhaus DQS (user API key) or other DNSBL APIs | Traditional DNSBL via DoH is **blocked by Spamhaus**. Options: (a) Use Spamhaus DQS with user's free key, (b) Query non-Spamhaus DNSBLs via DoH (some work), (c) Use third-party blacklist check APIs |

> [!IMPORTANT]
> **Blacklist Check** is the most complex. Spamhaus specifically blocks public DoH resolvers. Best approach: let users enter a free Spamhaus DQS key, and also query open DNSBLs (like `zen.spamhaus.org` alternatives) via DoH where possible.

> [!TIP]
> **CERT Lookup** via crt.sh works perfectly but lacks CORS headers. We can either: (a) instruct users to run a tiny local CORS proxy, (b) use a public CORS proxy like `corsproxy.io`, or (c) open crt.sh in a new tab as fallback.

---

## Tier 3: ❌ Not Possible in Browser

These require raw socket access (ICMP, TCP, SMTP) which browsers fundamentally cannot provide.

| # | Tool | Why Not | Alternative |
|---|---|---|---|
| 32 | **Ping** | Requires ICMP packets — browsers have no raw socket API | Could use a third-party ping API, or show "not available locally" |
| 33 | **TCP Lookup** | Requires raw TCP socket connections to arbitrary ports | No browser equivalent |
| 34 | **Trace (Traceroute)** | Requires ICMP/UDP with TTL manipulation | No browser equivalent |
| 35 | **Test Email Server** | Requires SMTP connection on port 25/587 | Could test DNS (MX records exist?) but can't do SMTP handshake |
| 36 | **Email Deliverability** | Composite: DNS parts work, but SMTP connectivity test does not | Can implement partial version (SPF + DKIM + DMARC + MX checks) |

> [!NOTE]
> **Email Deliverability** can be ~70% implemented: we can check SPF, DKIM, DMARC, BIMI, MTA-STS, and MX records. The only missing piece is the actual SMTP connection test. We can label it "Email Authentication Check" instead.

---

## Bonus: Additional Tools Not in Screenshot

These are on MXToolbox but weren't in your screenshot. All are implementable:

| Tool | Method |
|---|---|
| **Email Header Analyzer** | Pure client-side parsing — fully doable |
| **Subnet Calculator** | Pure math — fully doable |
| **SPF Generator** | UI wizard — fully doable |
| **DMARC Generator** | UI wizard — fully doable |

---

## Proposed Architecture

```
┌─────────────────────────────────────────────┐
│              Browser (index.html)            │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │         Tool Selection UI            │    │
│  │    (cards/tabs for each tool)        │    │
│  └──────────┬───────────────────────────┘    │
│             │                                │
│  ┌──────────▼───────────────────────────┐    │
│  │        Query Engine (JS)             │    │
│  │                                      │    │
│  │  ┌─────────┐  ┌──────────────────┐   │    │
│  │  │ DoH     │  │ External APIs    │   │    │
│  │  │ Module  │  │ (RDAP, ipify,    │   │    │
│  │  │         │  │  ipapi, crt.sh)  │   │    │
│  │  └────┬────┘  └────────┬─────────┘   │    │
│  │       │                │             │    │
│  │       ▼                ▼             │    │
│  │  Google/Cloudflare   Public APIs     │    │
│  │  DoH endpoints       + User keys    │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │     Results Display + Export         │    │
│  └──────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### Tech Stack
- **Single HTML file** with embedded CSS/JS (or a small multi-file setup)
- **No backend required** for 26 tools
- **Optional API keys** stored in `localStorage` (never sent to any server)
- **Settings panel** for configuring: DoH provider preference, API keys (IPinfo, Spamhaus DQS), CORS proxy URL

---

## Open Questions

> [!IMPORTANT]
> 1. **Scope**: Do you want all 36 tools, or start with a subset (e.g., the "Most Popular" 4 first)?
> 2. **CORS proxy**: For tools like CERT Lookup, should we bundle a tiny local Node.js proxy, use a public CORS proxy service, or just open external links in new tabs?
> 3. **Single file vs multi-file**: Do you want everything in one HTML file, or a proper project structure with separate JS/CSS files?
> 4. **Email Deliverability**: Should we include a partial version (DNS-only checks) and label it clearly, or skip it entirely?

## Verification Plan

### Automated Tests
- Test each DNS lookup tool against known domains (e.g., `google.com`, `example.com`)
- Verify DoH API responses parse correctly
- Test edge cases: non-existent domains, IDN domains, IPv6 addresses

### Manual Verification
- Open in browser, run each tool, compare results against actual MXToolbox
- Verify API key storage/retrieval in localStorage
- Test responsive layout on different screen sizes
