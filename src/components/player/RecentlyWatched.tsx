import { Clock, History, Trash2, Play, X } from "lucide-react";
import { useWatchHistory, formatWatchTime } from "@/hooks/useWatchHistory";
import { cn } from "@/lib/utils";

interface RecentlyWatchedProps {
  isOpen: boolean;
  onClose: () => void;
  onPlay: (url: string, title: string) => void;
}

export function RecentlyWatched({ isOpen, onClose, onPlay }: RecentlyWatchedProps) {
  const { history, removeFromHistory, clearHistory, getRecentlyWatched } = useWatchHistory();
  const recentItems = getRecentlyWatched(10);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9980] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg rounded-3xl overflow-hidden border border-white/10 bg-black/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-white">Visto recientemente</h3>
              <p className="text-xs text-white/50">{history.length} elementos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Limpiar todo
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {recentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <History className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-white/60 font-medium">No hay historial</p>
              <p className="text-sm text-white/40 mt-1">Los streams que veas aparecerán aquí</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentItems.map((item, index) => (
                <div 
                  key={item.id}
                  className="group flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Thumbnail placeholder */}
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Play className="w-5 h-5 text-primary" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3 text-white/40" />
                      <span className="text-xs text-white/40">{formatWatchTime(item.timestamp)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onPlay(item.url, item.title)}
                      className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 text-primary fill-primary" />
                    </button>
                    <button
                      onClick={() => removeFromHistory(item.id)}
                      className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-white/50 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
