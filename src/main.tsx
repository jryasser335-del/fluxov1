import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const SW_CLEANUP_FLAG = "fluxo-sw-cleanup-v1";

// Production stability: remove stale PWA workers/caches once and force a clean reload
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    if (sessionStorage.getItem(SW_CLEANUP_FLAG) === "done") return;

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const hadServiceWorkers = registrations.length > 0;

      await Promise.all(registrations.map((r) => r.unregister()));

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }

      if (hadServiceWorkers) {
        sessionStorage.setItem(SW_CLEANUP_FLAG, "done");
        window.location.reload();
      }
    } catch {
      // no-op
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
