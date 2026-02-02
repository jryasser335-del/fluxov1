import { History } from "lucide-react";
import { useState } from "react";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { RecentlyWatched } from "./player/RecentlyWatched";

export function HistoryButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { history } = useWatchHistory();
  const { openPlayer } = usePlayerModal();

  const handlePlay = (url: string, title: string) => {
    openPlayer(title, { url1: url });
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative h-10 px-3 rounded-xl flex items-center gap-2 bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
      >
        <History className="w-4 h-4" />
        <span className="hidden sm:inline text-sm font-medium">Historial</span>
        {history.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">
            {history.length > 9 ? "9+" : history.length}
          </span>
        )}
      </button>

      <RecentlyWatched 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        onPlay={handlePlay}
      />
    </>
  );
}
