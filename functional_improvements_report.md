# Comprehensive Functional Analysis & Improvement Plan

This report proposes a set of backend-less, client-side functional improvements across all modules of **Noob31's MultiTools**. These improvements enhance data quality, reliability, and security without requiring UI changes or server-side infrastructure.

---

## 1. Subdomain Scanner (`src/lib/subdomains.ts`)

### Current State
* Queries 8 APIs sequentially.
* If one API hangs or takes long, it delays the overall progress (configured with a high timeout).
* Several APIs (like BufferOver) frequently change endpoints, return HTML error pages, or are deprecated.

### Proposed Functional Improvements
1. **Parallel Stream Fetching**:
   * Instead of a sequential `for (const source of sources)` loop, fire all API requests concurrently using `Promise.all` or a custom promise pool.
   * Stream results back incrementally to the UI progress handler as each source resolves.
2. **Add Free Passive DNS Sources**:
   * **AlienVault OTX**: `https://otx.alienvault.com/api/v1/indicators/domain/${domain}/passive_dns` (no key required for basic queries).
   * **ThreatMiner**: `https://api.threatminer.org/v2/domain.php?q=${domain}&rt=5` (great for subdomain listings).
   * **Subdomain Center**: `https://api.subdomain.center/api4?domain=${domain}` (a fast, free subdomain scraping API).
3. **API Validation & Fallback Proxies**:
   * If a source returns HTML content (often indicating a rate limit, Cloudflare challenge, or proxy blockage), automatically retry the query using an alternative CORS proxy (e.g., swapping `codetabs` for `corsproxy.io`).

---

## 2. DNS & DNSSEC Diagnostics (`src/lib/doh.ts`)

### Current State
* Queries a single DoH resolver (Google, Cloudflare, AliDNS, AdGuard).
* No local client-side caching.
* No automatic failover if the primary provider is blocked or down.

### Proposed Functional Improvements
1. **Resolver Grouping & Failover Routing**:
   * If a query fails or times out, automatically retry against the next provider in the pool (e.g., if Google fails, failover to Cloudflare, then Quad9).
2. **New DoH Resolvers**:
   * Add **Quad9** (`https://dns.quad9.net/dns-query`) for malware-blocking DNS lookups.
   * Add **OpenDNS** (`https://doh.opendns.com/dns-query`).
3. **In-Memory Cache**:
   * Implement a lightweight, client-side cache keyed by `domain_type_provider`. Use the record's actual TTL to expire cached records, preventing duplicate queries.
4. **Client-side Verification Checks**:
   * Verify the Transaction ID and look for the Truncated (`TC`) bit in DNS binary packets. If truncated, warn or suggest TCP-based queries or proxy fallbacks.

---

## 3. Email Diagnostics & Deliverability (`src/lib/deliverability.ts`)

### Current State
* Checks MX, SPF, DKIM (default selector), DMARC, BIMI, MTA-STS, and TLSRPT.
* Requires the user to enter a DKIM selector; defaults to `'default'`, which often produces a false negative if the domain uses a different selector.

### Proposed Functional Improvements
1. **DKIM Selector Autodiscovery**:
   * If no selector is provided, query common default selectors (e.g., `google`, `default`, `k1`, `mail`, `mx`, `selector1`, `sig1`, `dkim`, `key`) in parallel using DoH. If a valid TXT record is returned containing `v=DKIM1;` or `p=`, flag that selector as discovered.
2. **DMARC & SPF Syntax Verification**:
   * Parse tag-value parameters (e.g., check that `pct` in DMARC is an integer between 0 and 100, check if `rua` or `ruf` URIs are properly formatted mailto links).
   * Verify that any domain references in `include:` or `redirect=` tags in the SPF record actually exist by performing a fast DNS lookup on them.
3. **DNSSEC Status Association**:
   * Cross-reference DNSSEC records for the domain. If DNSSEC is active, award extra deliverability points because it protects MX and TXT records from spoofing/poisoning.

---

## 4. MAC OUI Lookup (`src/lib/macLookup.ts`)

### Current State
* Queries `macvendorlookup.com` via proxy.
* Does not differentiate between hardware-burned MACs and randomized/private MACs.

### Proposed Functional Improvements
1. **Local Address Randomization Check**:
   * Check the **Locally Administered Bit** (the second hex character's second-least-significant bit). If the bit is set (e.g., if the second character is `2`, `6`, `A`, or `E`), inform the user that this is a locally generated/randomized MAC address (common in iOS/Android and modern OS Wi-Fi randomization) and that an OUI lookup will not return a hardware vendor.
2. **Multiple API Fallbacks**:
   * Differentiate and fallback between APIs if rate-limited:
     * **Primary**: `https://api.maclookup.app/v2/macs/${oui}`
     * **Secondary**: `https://api.macvendors.com/${oui}`
     * **Tertiary**: Raw prefix matching against a small client-side list of top vendors (Apple, Cisco, Intel, Samsung, Dell, etc.) for offline/no-proxy lookups.

---

## 5. URL Scanner & Analyzer (`src/lib/urlScanner.ts`)

### Current State
* Breaks down URL components.
* Visits the URL via a CORS proxy to get headers, final URL, and server details.
* Only logs the final URL after redirect, losing intermediate redirect hops.

### Proposed Functional Improvements
1. **Redirect Chain Mapping**:
   * Inspect intermediate HTTP responses (by disabling auto-redirects on fetch if the proxy allows, or by parsing intermediate `Location` headers) to document the entire redirect chain (e.g., `http://short.url` -> `https://track.ing/click` -> `https://final.dest`).
2. **Domain Reputation Integration**:
   * Check the scanned domain name against open-source threat lists (e.g., querying Quad9 or CleanBrowsing DNS for malware category block status, or looking up the domain age via RDAP to flag newly registered domains under 30 days old as high-risk).
3. **Passive Parameter Expansion**:
   * Expand the passive redirect parser keys to include: `dest`, `destination`, `link`, `to`, `r`, `out`, `go`, `next`, `forward`, `click`, `href`, `site`, `view`.

---

## 6. Email Header Analyzer (`src/lib/headerParser.ts`)

### Current State
* Splitting on colons and extracting generic headers.
* Simply reverses the `Received` header list to show hops.

### Proposed Functional Improvements
1. **Hop Latency & Routing Analysis**:
   * Parse the date and timestamp from each `Received` header hop.
   * Calculate the duration (latency) between consecutive hops to pinpoint where delivery delays occurred (e.g., Hop 2 to Hop 3 took 45 minutes).
2. **Authentication Header Parsing**:
   * Parse the structure of the `Authentication-Results` and `Received-SPF` headers. Extract individual sub-results for SPF, DKIM, and DMARC (e.g., `spf=pass`, `dkim=fail`) and present them as a parsed security summary.
3. **DKIM-Signature Detail Extraction**:
   * Extract key attributes from the `DKIM-Signature` header (such as the signing domain `d=`, selector `s=`, hashing algorithm `a=`, and the signature hashes `bh=` and `b=`) for inspection.

---

## 7. IP Blacklist Checker (`src/lib/blacklist.ts`)

### Current State
* Queries 15 DNSBL zones in parallel.
* Restricts checks to IPv4 addresses.

### Proposed Functional Improvements
1. **IPv6 Blacklist Support**:
   * Support checking IPv6 addresses by expanding the IP parser.
   * Reverse the IPv6 nibbles (4-bit chunks) and append the IPv6-compatible DNSBL zone (e.g., converting `2001:db8::1` into a 32-nibble reversed string followed by `.rbl.example.com`).
2. **Zone Health/Response Verification**:
   * Verify that the IP returned by DNSBL resolves strictly to loopback addresses in the range `127.0.0.2` - `127.0.0.254` (as defined in RFC 5782). Ignore responses that resolve to external IPs, which often indicate a misconfigured DNS resolver wildcard catch-all.
3. **Abuse IP DB checking**:
   * Crosscheck IP reputations against free reputation check feeds.

---

## 8. Subnet Calculator (`src/lib/subnet.ts`)

### Current State
* Performs subnet calculations solely for IPv4.

### Proposed Functional Improvements
1. **IPv6 Subnetting Support**:
   * Add a full client-side IPv6 subnetting engine (handling 128-bit big integers, network prefix masks, first/last addresses, representation abbreviation, and address counting).
2. **Range to CIDR Converter**:
   * Given a starting IP and ending IP, calculate the minimal set of CIDR blocks that span exactly that range.
3. **RFC Range Classifier**:
   * Dynamically classify the input subnet based on RFC ranges (e.g., Private Network RFC 1918, Link-Local APIPA, Loopback, Carrier Grade NAT RFC 6598, Multicast, Broadcast).

---

## 9. WHOIS/Registration Lookup (`src/lib/rdap.ts` / `src/lib/rdapParser.ts`)

### Current State
* Queries `rdap.org` and parses basic metadata.

### Proposed Functional Improvements
1. **Direct Registry Query Fallbacks**:
   * If `rdap.org` fails, rate-limits, or times out, directly target regional internet registries (ARIN for North America, RIPE for Europe/Middle East, APNIC for Asia-Pacific, LACNIC for Latin America, AFRINIC for Africa) based on IP address ranges or TLD routing.
2. **Timezone Normalization**:
   * Automatically convert registration, expiration, and update ISO timestamps to the user's local timezone for easier readability.
3. **Local RDAP Caching**:
   * Cache WHOIS outputs in local storage to respect lookup rate limits on public RDAP endpoints.
