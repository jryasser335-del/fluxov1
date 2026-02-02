import { Keyboard, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { key: "Espacio", action: "Reproducir / Pausar" },
  { key: "M", action: "Silenciar / Activar sonido" },
  { key: "F", action: "Pantalla completa" },
  { key: "P", action: "Picture-in-Picture" },
  { key: "T", action: "Modo teatro" },
  { key: "←", action: "Retroceder 10s" },
  { key: "→", action: "Adelantar 10s" },
  { key: "↑", action: "Subir volumen" },
  { key: "↓", action: "Bajar volumen" },
  { key: "1-3", action: "Cambiar opción de stream" },
  { key: "Esc", action: "Cerrar reproductor" },
];

export function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="absolute inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md mx-4 rounded-3xl overflow-hidden border border-white/10 bg-black/90 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-white">Atajos de teclado</h3>
              <p className="text-xs text-white/50">Controla el reproductor fácilmente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {shortcuts.map((shortcut, index) => (
            <div 
              key={shortcut.key}
              className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/5 transition-colors"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <span className="text-sm text-white/70">{shortcut.action}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-xs font-mono text-white/90">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 text-center">
          <p className="text-xs text-white/40">Presiona <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/60">?</kbd> para mostrar/ocultar</p>
        </div>
      </div>
    </div>
  );
}
