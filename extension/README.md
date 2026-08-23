# Noob31's MultiTools Helper - Browser Extension

A companion Chrome / Edge / Brave browser extension that provides high-performance, zero-proxy cross-origin requests for **Noob31's MultiTools** (`https://tools.noob31.com` and `localhost`).

## ✨ Features
- **Zero CORS Proxies**: Fetches public APIs (DNS-over-HTTPS, WHOIS, RDAP, BGP/ASN, Threat Intel, Certificate Transparency) directly with native browser speeds.
- **Strict Outbound Domain Filter**: Restricts external fetches to verified multi-tool data sources and registries.
- **Domain-Salted SHA-256 Authentication**: Ensures only authorized client requests from your MultiTools instance can trigger queries.
- **Visual Design**: Styled with Pacifico & Geist typography and zinc/slate dark palette matching Noob31's MultiTools.

---

## 📦 Installation Instructions

1. Open **Google Chrome**, **Brave**, or **Microsoft Edge**.
2. Navigate to the extensions manager:
   - **Chrome**: `chrome://extensions`
   - **Edge**: `edge://extensions`
   - **Brave**: `brave://extensions`
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked**.
5. Select this `extension/` directory.
6. Open `https://tools.noob31.com` (or `http://localhost:5173`). The **Extension Connected** indicator in the header will turn green.
