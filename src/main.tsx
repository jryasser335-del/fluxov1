import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Production stability: remove stale PWA workers/caches that can cause flashing/stuck loads
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // no-op
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
