// Noob31's MultiTools Extension Content Script Bridge
// Relays window.postMessage calls from tools.noob31.com and localhost to the background service worker

window.addEventListener("message", (event) => {
  if (event.source !== window || !event.data) return;

  if (event.data.source === "MULTITOOLS_PAGE") {
    const { type, requestId, url, options, authHash } = event.data;

    if (type === "MULTITOOLS_PING") {
      try {
        chrome.runtime.sendMessage({ type: "PING", authHash }, (response) => {
          const lastErr = chrome.runtime.lastError;
          window.postMessage({
            source: "MULTITOOLS_EXTENSION",
            type: "MULTITOOLS_PONG",
            version: "1.0.0",
            response: lastErr ? { success: false, error: lastErr.message } : response
          }, "*");
        });
      } catch (err) {
        window.postMessage({
          source: "MULTITOOLS_EXTENSION",
          type: "MULTITOOLS_PONG",
          version: "1.0.0",
          response: { success: false, error: err instanceof Error ? err.message : String(err) }
        }, "*");
      }
    } else if (type === "MULTITOOLS_FETCH") {
      try {
        chrome.runtime.sendMessage({ type: "FETCH_PROXY", url, options, authHash }, (response) => {
          const lastErr = chrome.runtime.lastError;
          window.postMessage({
            source: "MULTITOOLS_EXTENSION",
            type: "MULTITOOLS_FETCH_RESPONSE",
            requestId,
            response: lastErr ? { success: false, error: lastErr.message } : response
          }, "*");
        });
      } catch (err) {
        window.postMessage({
          source: "MULTITOOLS_EXTENSION",
          type: "MULTITOOLS_FETCH_RESPONSE",
          requestId,
          response: { success: false, error: err instanceof Error ? err.message : String(err) }
        }, "*");
      }
    }
  }
});

// Announce presence to page immediately and with brief retry on initial DOM bootstrap
function announcePresence() {
  window.postMessage({ source: "MULTITOOLS_EXTENSION", type: "MULTITOOLS_ANNOUNCE", version: "1.0.0" }, "*");
}

announcePresence();
setTimeout(announcePresence, 250);
setTimeout(announcePresence, 1000);
