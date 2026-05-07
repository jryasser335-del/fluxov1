import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Check } from "lucide-react";

const KEY = "fluxo_theme_v1";
const SHOWN_KEY = "fluxo_theme_shown_v1";

export interface ThemeDef {
  id: string;
  name: string;
  primary: string;        // "H S% L%"
  glow: string;
  accent: string;
  preview: string;        // gradient css
}

export const THEMES: ThemeDef[] = [
  { id: "blue",    name: "Cobalto",   primary: "215 100% 55%", glow: "200 100% 60%", accent: "215 85% 60%",
    preview: "linear-gradient(135deg,#1e6bff,#22d3ff)" },
  { id: "violet",  name: "Aurora",    primary: "275 90% 62%",  glow: "295 100% 70%", accent: "260 90% 65%",
    preview: "linear-gradient(135deg,#a855f7,#ec4899)" },
  { id: "amber",   name: "Oro",       primary: "38 100% 55%",  glow: "28 100% 60%",  accent: "45 100% 60%",
    preview: "linear-gradient(135deg,#f59e0b,#fb923c)" },
  { id: "emerald", name: "Esmeralda", primary: "155 80% 45%",  glow: "170 90% 55%",  accent: "150 75% 50%",
    preview: "linear-gradient(135deg,#10b981,#06b6d4)" },
  { id: "rose",    name: "Rubí",      primary: "350 90% 60%",  glow: "330 100% 65%", accent: "0 85% 62%",
    preview: "linear-gradient(135deg,#e11d48,#f43f5e)" },
  { id: "cyan",    name: "Neón",      primary: "190 100% 55%", glow: "180 100% 60%", accent: "200 100% 60%",
    preview: "linear-gradient(135deg,#06b6d4,#22d3ee)" },
];

export function applyTheme(t: ThemeDef) {
  const r = document.documentElement;
  r.style.setProperty("--primary", t.primary);
  r.style.setProperty("--primary-glow", t.glow);
  r.style.setProperty("--accent", t.accent);
  r.style.setProperty("--ring", t.primary);
  r.style.setProperty("--sidebar-primary", t.primary);
  r.style.setProperty("--sidebar-ring", t.primary);
  r.style.setProperty("--gradient-primary", `linear-gradient(135deg, hsl(${t.primary}), hsl(${t.glow}))`);
}

export function loadSavedTheme() {
  try {
    const id = localStorage.getItem(KEY);
    const t = THEMES.find((x) => x.id === id);
    if (t) applyTheme(t);
  } catch { /* ignore */ }
}

export function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    const shown = localStorage.getItem(SHOWN_KEY);
    if (saved) {
      const t = THEMES.find((x) => x.id === saved);
      if (t) applyTheme(t);
      setSelected(saved);
    }
    // Always show on entry until user explicitly closes (per request "siempre que entren")
    if (!shown) {
      setOpen(true);
    } else {
      // show again every visit but slightly delayed
      setOpen(true);
    }
  }, []);

  const choose = (t: ThemeDef) => {
    applyTheme(t);
    localStorage.setItem(KEY, t.id);
    setSelected(t.id);
  };

  const confirm = () => {
    localStorage.setItem(SHOWN_KEY, "1");
    setOpen(false);
  };

  return (
    <>
      {/* Floating toggle to reopen */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 w-11 h-11 rounded-full border border-white/10 bg-black/60 backdrop-blur-xl flex items-center justify-center text-white/80 hover:scale-105 transition-transform shadow-xl"
        style={{ boxShadow: "0 10px 30px -10px hsl(var(--primary) / 0.5)" }}
        aria-label="Cambiar color"
      >
        <Palette className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={confirm}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#070707] p-6 overflow-hidden"
            >
              {/* aurora bg */}
              <div className="absolute inset-0 opacity-40 pointer-events-none"
                style={{ backgroundImage: "radial-gradient(circle at 20% 10%, hsl(var(--primary)/0.5), transparent 50%), radial-gradient(circle at 80% 90%, hsl(var(--primary-glow)/0.4), transparent 55%)" }}
              />
              <div className="relative">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-wide">Elige tu color</h2>
                    <p className="text-xs text-white/50">Personaliza la apariencia de FLUXO</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
                  {THEMES.map((t, i) => {
                    const active = selected === t.id;
                    return (
                      <motion.button
                        key={t.id}
                        onClick={() => choose(t)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        className={`relative group rounded-2xl overflow-hidden border-2 ${
                          active ? "border-white" : "border-white/10 hover:border-white/30"
                        } transition-colors`}
                      >
                        <div className="aspect-[4/3]" style={{ background: t.preview }} />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-3 py-2">
                          <span className="text-xs font-bold text-white tracking-wider">{t.name}</span>
                        </div>
                        {active && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-black" />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <button
                  onClick={confirm}
                  className="mt-6 w-full py-3 rounded-2xl font-bold text-white tracking-wider"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))" }}
                >
                  Empezar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
