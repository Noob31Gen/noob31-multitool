# API Documentation - Network Diagnostics & Domain Health Worker

A self-contained REST API for network diagnostics, domain health, email authentication, and security analysis. Running natively on Cloudflare Workers with a 10ms CPU limit.

## Base URL
* **Local Development**: `http://localhost:8787`
* **Production**: `https://<your-worker-subdomain>.<your-username>.workers.dev`

---

## Global Query Parameters
Every `GET` request supports the following optional parameters to customize DNS behavior:
* `dohProvider`: DNS resolver to use (`auto`, `google`, `cloudflare`, `alidns`, `adguard`, `quad9`, `opendns`). Defaults to `auto`.
* `customDnsUrl`: A custom DNS-over-HTTPS URL if `dohProvider` is set to `custom`.

---

## API Endpoints Reference

### 1. DNS Lookup (`GET /dns`)
Retrieves standard DNS resource records for a hostname.
* **Parameters**:
  * `target` (Required): Domain name (e.g. `example.com`).
  * `type` (Optional): Record type (e.g. `A`, `AAAA`, `MX`, `TXT`, `NS`, `CNAME`, `SOA`). Defaults to `A`.
* **Example Request**:
  `/dns?target=google.com&type=A`
* **Example Response**:
  ```json
  {
    "status": 0,
    "records": [
      {
        "name": "google.com.",
        "type": 1,
        "typeName": "A",
        "TTL": 218,
        "data": "142.250.190.46"
      }
    ],
    "authority": [],
    "queryTime": 42,
    "provider": "google"
  }
  ```

---

### 2. DNSSEC Verification (`GET /dnssec`)
Checks if DNSSEC signatures and keys are present on a domain.
* **Parameters**:
  * `target` (Required): Domain name.
  * `type` (Optional): Record type to check. Defaults to `A`.
* **Example Request**:
  `/dnssec?target=cloudflare.com`
* **Example Response**:
  ```json
  {
    "main": {
      "status": 0,
      "records": [...]
    },
    "dnskey": {
      "status": 0,
      "records": [
        {
          "name": "cloudflare.com.",
          "type": 48,
          "typeName": "DNSKEY",
          "TTL": 3600,
          "data": "256 3 13 oGsQ/A..."
        }
      ]
    },
    "isSigned": true
  }
  ```

---

### 3. Email Authentication Records (`GET /email-auth`)
Queries and parses SPF, DKIM, DMARC, BIMI, MTA-STS, and TLSRPT records.
* **Parameters**:
  * `target` (Required): Domain name.
  * `selector` (Optional): DKIM selector prefix. Defaults to `default`.
* **Example Request**:
  `/email-auth?target=gmail.com&selector=20230601`
* **Example Response**:
  ```json
  {
    "spf": {
      "raw": [{ "name": "gmail.com.", "type": 16, "typeName": "TXT", "TTL": 300, "data": "v=spf1 redirect=_spf.google.com" }],
      "parsed": [
        { "key": "Version", "value": "v=spf1" },
        { "key": "Mechanism", "value": "redirect=_spf.google.com" }
      ]
    },
    "dkim": { "raw": [], "parsed": null },
    "dmarc": {
      "raw": [{ "name": "_dmarc.gmail.com.", "type": 16, "typeName": "TXT", "TTL": 300, "data": "v=DMARC1; p=none; sp=quarantine;..." }],
      "parsed": [
        { "key": "v", "value": "DMARC1" },
        { "key": "p", "value": "none" }
      ]
    },
    ...
  }
  ```

---

### 4. Registration / WHOIS (`GET /registration`)
Queries WHOIS metadata via the standard RDAP protocol.
* **Parameters**:
  * `target` (Required): Domain name or IP address.
* **Example Request**:
  `/registration?target=google.com`
* **Example Response**:
  ```json
  {
    "ldhName": "google.com",
    "handle": "2138514_DOMAIN_COM-VRSN",
    "objectClassName": "domain",
    "status": ["client delete prohibited", "client transfer prohibited"],
    "nameservers": [
      { "ldhName": "ns1.google.com" }
    ],
    "events": [
      { "eventAction": "registration", "eventDate": "1997-09-15T04:00:00Z" }
    ],
    "entities": [...]
  }
  ```

---

### 5. Company SEC Lookup (`GET /company`)
Looks up publicly traded corporations metadata from Shodan EntityDB.
* **Parameters**:
  * `symbol` (Optional): Ticker symbol. If omitted, returns list of all available companies.
* **Example Request**:
  `/company?symbol=MSFT`
* **Example Response**:
  ```json
  {
    "finance_data": [
      { "report_year": 2023, "revenue": 211915000000, "net_income": 72361000000 }
    ],
    "entity": {
      "entity_name": "MICROSOFT CORP",
      "cik": 789019,
      "tickers": ["MSFT"],
      "exchanges": ["NASDAQ"]
    },
    "executives": [...]
  }
  ```

---

### 6. URL Analyzer (`GET /url-scanner`)
Parses URL components (authority, path, query parameters) and visits the target URL checking redirect headers.
* **Parameters**:
  * `target` (Required): URL to scan.
* **Example Request**:
  `/url-scanner?target=https://google.com`
* **Example Response**:
  ```json
  {
    "parsed": {
      "original": "https://google.com",
      "normalized": "https://www.google.com/",
      "length": 18,
      "scheme": { "value": "https", "isSecure": true },
      "authority": { "host": { "hostname": "google.com", "registeredDomain": "google.com", "tld": "com" } }
    },
    "visit": {
      "status": 200,
      "statusText": "OK",
      "redirected": true,
      "finalUrl": "https://www.google.com/",
      "responseTime": 142,
      "contentType": "text/html; charset=UTF-8",
      "server": "gws",
      "redirectChain": [
        "https://google.com",
        "https://www.google.com/"
      ]
    }
  }
  ```

---

### 7. Subdomain Discovery (`GET /subdomains`)
Crawls passive DNS and certificate lists globally to find active subdomains.
* **Parameters**:
  * `target` (Required): Domain name.
* **Example Request**:
  `/subdomains?target=example.com`
* **Example Response**:
  ```json
  {
    "subdomains": [
      { "subdomain": "example.com", "sources": ["crt.sh", "HackerTarget"] },
      { "subdomain": "www.example.com", "sources": ["crt.sh", "URLScan.io"] }
    ],
    "errors": []
  }
  ```

---

### 8. Reverse DNS Lookup (`GET /reverse-dns`)
Resolves an IP address to its configured PTR hostname.
* **Parameters**:
  * `target` (Required): IPv4 or IPv6 address.
* **Example Request**:
  `/reverse-dns?target=8.8.8.8`
* **Example Response**:
  ```json
  {
    "ip": "8.8.8.8",
    "isIPv6": false,
    "reverseDomain": "8.8.8.8.in-addr.arpa",
    "classification": "Public IPv4 Address",
    "hostnames": [
      "dns.google"
    ],
    "queryTime": 24,
    "provider": "google",
    "asnDetails": {
      "asn": "15169",
      "org": "Google LLC",
      "country": "US"
    }
  }
  ```

---

### 9. Client IP Diagnostic (`GET /my-ip`)
Analyzes the requester's IP, geographic, and network connection properties provided by Cloudflare.
* **Example Request**:
  `/my-ip`
* **Example Response**:
  ```json
  {
    "ip": "203.0.113.1",
    "country": "US",
    "city": "San Jose",
    "asn": 15169,
    "asOrganization": "Google LLC",
    "latitude": 37.3382,
    "longitude": -121.8863,
    "postalCode": "95101",
    "region": "California",
    "regionCode": "CA",
    "timezone": "America/Los_Angeles"
  }
  ```

---

### 10. MAC Address Lookup (`GET /mac-lookup`)
Looks up hardware vendor details for a MAC address OUI.
* **Parameters**:
  * `target` (Required): MAC address (e.g. `00:11:22:33:44:55`).
* **Example Request**:
  `/mac-lookup?target=00-11-22-33-44-55`
* **Example Response**:
  ```json
  {
    "mac": "001122334455",
    "vendor": "Cisco Systems, Inc",
    "address": "170 W. Tasman Drive\nSan Jose CA 95134\nUNITED STATES",
    "country": "US",
    "oui": "001122",
    "success": true,
    "isUnicast": true,
    "isUniversal": true,
    "category": "Networking / Infrastructure",
    "queryTime": 65
  }
  ```

---

### 11. HTTP Header Analyzer (`GET /http`)
Fetches and lists the response headers for any external HTTP or HTTPS URL.
* **Parameters**:
  * `target` (Required): Hostname or full URL.
  * `scheme` (Optional): Protocol (`http` or `https`). Defaults to `https`.
* **Example Request**:
  `/http?target=example.com&scheme=https`
* **Example Response**:
  ```json
  {
    "status": 200,
    "statusText": "OK",
    "headers": [
      { "key": "content-type", "value": "text/html; charset=UTF-8" },
      { "key": "server", "value": "ECS (sjc/F16B)" }
    ],
    "redirected": false,
    "finalUrl": "https://example.com/"
  }
  ```

---

### 12. Global Geoping (`GET /ping`)
Pings an IP address or hostname from 5 distinct global regions using Shodan Geonet.
* **Parameters**:
  * `target` (Required): Hostname or IP address.
* **Example Request**:
  `/ping?target=8.8.8.8`
* **Example Response**:
  ```json
  [
    {
      "ip": "8.8.8.8",
      "is_alive": true,
      "min_rtt": 1.117,
      "avg_rtt": 1.395,
      "max_rtt": 1.941,
      "packets_sent": 3,
      "packets_received": 3,
      "from_loc": {
        "city": "Clifton",
        "country": "US"
      }
    },
    ...
  ]
  ```

---

### 13. Domain Health Check (`GET /domain-health`)
Calculates an overall health rating and returns a detailed diagnostics list for a domain.
* **Parameters**:
  * `target` (Required): Domain name.
  * `selector` (Optional): Selector for DKIM.
* **Example Request**:
  `/domain-health?target=google.com`
* **Example Response**:
  ```json
  {
    "score": 92,
    "grade": "A",
    "dnsResults": [...],
    "emailResults": [...],
    "recommendations": [
      { "level": "medium", "msg": "DMARC policy 'p=none' is only monitoring. Consider quarantine/reject." }
    ]
  }
  ```

---

### 14. Email Deliverability Check (`GET /deliverability`)
Performs SPF alignment, DMARC syntax, DKIM discoverability, and standard MX record sanity checks.
* **Parameters**:
  * `target` (Required): Domain name.
  * `selector` (Optional): DKIM selector.
* **Example Request**:
  `/deliverability?target=gmail.com`
* **Example Response**:
  ```json
  {
    "score": 85,
    "grade": "B",
    "results": [
      { "name": "MX Records", "status": "pass", "details": "5 MX records found." },
      { "name": "SPF Record", "status": "pass", "details": "Valid SPF configuration." }
    ],
    "recommendations": [...]
  }
  ```

---

### 15. TLS/SSL Certificate Lookup (`GET /cert`)
Searches for certificate log transparency entries for a domain.
* **Parameters**:
  * `target` (Required): Domain name.
* **Example Request**:
  `/cert?target=google.com`
* **Example Response**:
  ```json
  [
    {
      "not_before": "2026-06-01T00:00:00Z",
      "not_after": "2026-09-01T00:00:00Z",
      "common_name": "google.com",
      "issuer_name": "WRIS"
    }
  ]
  ```

---

### 16. DNSBL IP Blacklist Check (`GET /blacklist`)
Checks if an IP is listed on major DNS Blocklists (Spamcop, Barracuda, DroneBL, etc.).
* **Parameters**:
  * `target` (Required): IP address.
* **Example Request**:
  `/blacklist?target=127.0.0.2`
* **Example Response**:
  ```json
  [
    { "zone": "bl.spamcop.net", "listed": true, "details": "Returned DNS resolution: 127.0.0.2" },
    { "zone": "b.barracudacentral.org", "listed": false, "details": null }
  ]
  ```

---

### 17. Domain Reputation (`GET /reputation`)
Queries blocklists, Quad9, Shodan pulses, and domain age registries.
* **Parameters**:
  * `target` (Required): Domain name.
* **Example Request**:
  `/reputation?target=google.com`
* **Example Response**:
  ```json
  {
    "domain": "google.com",
    "score": 100,
    "status": "Clean",
    "blocklists": [...],
    "quad9Blocked": false,
    "otxPulses": [],
    "domainAgeDays": 10452,
    "registrationDate": "1997-09-15T04:00:00Z",
    "dnssecActive": false,
    "queryTime": 245
  }
  ```

---

### 18. Threat Intelligence Aggregator (`GET /threat-intel`)
Searches AlienVault OTX and URLScan.io databases for a keyword, IP, domain, URL, or file hash.
* **Parameters**:
  * `target` (Required): The query string.
* **Example Request**:
  `/threat-intel?target=8.8.8.8`
* **Example Response**:
  ```json
  {
    "query": "8.8.8.8",
    "detectedType": "ip",
    "otxPulses": [...],
    "urlScanHistory": [...],
    "internetDb": { "ports": [53, 443], "cves": [], "tags": ["dns"] },
    "queryTime": 412,
    "sourceErrors": {}
  }
  ```

---

### 19. CVE Vulnerability Lookup (`GET /cve`)
Looks up vulnerability parameters (CVSS score, EPSS ranking, Ransomware campaign status, CPE definitions) for a CVE identifier.
* **Parameters**:
  * `target` (Required): CVE ID (e.g. `CVE-2021-34527`).
* **Example Request**:
  `/cve?target=CVE-2021-44228`
* **Example Response**:
  ```json
  {
    "cve_id": "CVE-2021-44228",
    "summary": "Apache Log4j2 JNDI features do not protect against attacker controlled LDAP...",
    "cvss": 10.0,
    "cvss_version": 3,
    "cvss_v3": 10.0,
    "epss": 0.97,
    "ranking_epss": 0.99,
    "kev": true,
    "ransomware_campaign": "Known Campaigns",
    "references": [...]
  }
  ```

---

### 20. Email Header Parser (`POST /email-headers`)
Analyzes email headers to calculate delivery latency hops, identify mail transfer agent pathing, and inspect authentication tags.
* **Body** (Required): Raw email headers in plain text.
* **Example Request**:
  `POST /email-headers`
  *Body*:
  ```text
  Delivered-To: user@example.com
  Received: by 2002:a05... with SMTP id ...; Thu, 25 Jun 2026 10:00:00 -0700
  Received: from mail.sender.com ...; Thu, 25 Jun 2026 09:59:58 -0700
  From: sender@example.com
  Subject: Test Email
  ```
* **Example Response**:
  ```json
  {
    "from": "sender@example.com",
    "to": "user@example.com",
    "subject": "Test Email",
    "date": "Thu, 25 Jun 2026 09:59:58 -0700",
    "messageId": "Unknown",
    "authResults": [],
    "spf": "Not found",
    "dmarc": "Not found",
    "dkim": "Not found",
    "hops": [
      "from mail.sender.com ...; Thu, 25 Jun 2026 09:59:58 -0700",
      "by 2002:a05... with SMTP id ...; Thu, 25 Jun 2026 10:00:00 -0700 [Delay: 2s]"
    ]
  }
  ```

---

### 21. Subnet Calculator (`GET /subnet`)
Calculates network properties (mask, network address, broadcast address, hosts count) for a CIDR boundary.
* **Parameters**:
  * `ip` (Required): IPv4 address.
  * `cidr` (Required): Subnet prefix length (e.g. `24`).
* **Example Request**:
  `/subnet?ip=192.168.1.15&cidr=24`
* **Example Response**:
  ```json
  {
    "ip": "192.168.1.15",
    "cidr": 24,
    "mask": "255.255.255.0",
    "network": "192.168.1.0",
    "broadcast": "192.168.1.255",
    "firstHost": "192.168.1.1",
    "lastHost": "192.168.1.254",
    "totalHosts": 254,
    "wildcard": "0.0.0.255",
    "maskBinary": "11111111.11111111.11111111.00000000"
  }
  ```
