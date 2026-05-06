# Security & Privacy Audit Results

This document summarizes the findings of a comprehensive security audit performed on the project.

**Audit Date**: May 6, 2026
**Scope**: `./src` directory, dependencies, and network activity.

---

## 1. Automated Dependency Audit (`npm audit`)

| Severity | Count | Issue | Dependency Path |
| :--- | :--- | :--- | :--- |
| **Moderate** | 4 | XSS in Address6 HTML-emitting methods | `ip-address` ← `express-rate-limit` ← `@modelcontextprotocol/sdk` ← `shadcn` |

**Analysis**: The vulnerability is in the `ip-address` library. While `shadcn` is listed in the dependency tree, it is primarily used as a CLI tool or for UI components. The vulnerable "HTML-emitting methods" of `Address6` are not used in this project's runtime. However, an update is recommended.

---

## 2. Privacy & Data Leakage (Logs)

The project claims to be "fully client-side" with "no tracking or metrics".

**Findings**:
- **Third-Party Analytics**: **NOT FOUND**. No Google Analytics, Sentry, Mixpanel, or other tracking scripts were detected in `index.html` or the source code.
- **Console Logging**: Several files use `console.error(err)` or `console.warn(...)`.
    - **Risk**: If an error occurs during a network request (e.g., in `doh.ts` or `subdomains.ts`), the error object logged to the *browser console* may contain the full URL, which includes the user's query (e.g., the domain being searched).
    - **Mitigation**: While these logs are local to the user's browser, they should be sanitized to remove sensitive query parameters before logging.
- **External Communication**: All network requests are directed to intended tool providers (Google, Cloudflare, RIPE, etc.) or the user-defined CORS proxy. No "stealth" requests to unknown servers were found.

---

## 3. Cross-Site Scripting (XSS) Assessment

**Findings**:
- **Unsafe innerHTML**: `dangerouslySetInnerHTML` is used in `CodeScannerPage.tsx` but only for a static `<style>` block, which is **SAFE**.
- **Unsanitized Links**: In `CodeScannerPage.tsx` (Line 281), the "Open Link" feature for scanned QR codes uses a weak validation:
  ```tsx
  {scanResult.startsWith('http') && ( ... <a href={scanResult} ... )}
  ```
  - **Risk**: A malicious QR code could contain `http:javascript:alert(1)` or similar payloads that might bypass this simple check in some browsers or scenarios, leading to XSS if the user clicks the link.
  - **Recommendation**: Use a stricter regex like `/^https?:\/\//i` for URL validation.
- **React Escaping**: Most other data rendering is handled via standard JSX text nodes, which provides built-in protection against XSS.

---

## 4. Local Storage & Persistence

**Findings**:
- **Persistence**: `localStorage` is used via a `safeStorage` wrapper.
- **Stored Data**:
    - App settings (theme, DNS/CORS providers).
    - Code Generator preferences (QR size, margin, etc.).
- **Privacy**: **NO** search history, scanned URLs, or sensitive results are stored in `localStorage`. The project successfully maintains a "no history" policy.

---

## 5. Security Recommendations (Summary)

1. **[LOW] Sanitize Logs**: Implement a wrapper for `console.error` that strips query strings from URLs before logging.
2. **[MODERATE] Harden URL Detection**: Update the `CodeScannerPage.tsx` to use a more robust URL validation regex before rendering the "Open Link" button.
3. **[LOW] Update Dependencies**: Run `npm audit fix --force` (with caution regarding `shadcn` breaking changes) or manually update the vulnerable paths if possible.
4. **[LOW] Content Security Policy (CSP)**: Consider adding a CSP header/meta tag to further restrict which domains the app can communicate with, although this might be complex given the variety of tool providers.

---
**Status**: The project is highly private and secure, with only minor "hygiene" improvements suggested.
