import { useState } from "react";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PlayerModal } from "@/components/PlayerModal";
import { EventsView } from "@/components/EventsView";
import { MoviesView } from "@/components/MoviesView";
import { MultiStreamView } from "@/components/MultiStreamView";
import { NotificationCenter } from "@/components/NotificationCenter";
import { cn } from "@/lib/utils";
import { Trophy, Film, LayoutGrid, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

type ViewType = "eventos" | "peliculas" | "multistream";

const Index = () => {
  const [activeView, setActiveView] = useState<ViewType>("eventos");
  const [movieSearch, setMovieSearch] = useState("");
  const { isAdmin } = useAuth();

  return (
    <>
      <div className="min-h-screen bg-[#080808]">
        <main className="max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 pb-24 md:pb-8 pt-3">
          {activeView === "eventos" && <EventsView />}
          {activeView === "peliculas" && <MoviesView searchQuery={movieSearch} />}
          {activeView === "multistream" && <MultiStreamView />}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/[0.06]">
          <div className="max-w-[600px] mx-auto flex items-center justify-around px-4 py-2.5 safe-area-pb">
            <button
              onClick={() => setActiveView("eventos")}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all",
                activeView === "eventos"
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "text-white/50 hover:text-white"
              )}
            >
              <Trophy className="w-4 h-4" />
              Live
            </button>
            <button
              onClick={() => setActiveView("peliculas")}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all",
                activeView === "peliculas"
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "text-white/50 hover:text-white"
              )}
            >
              <Film className="w-4 h-4" />
              Películas
            </button>
            <button
              onClick={() => setActiveView("multistream")}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all",
                activeView === "multistream"
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "text-white/50 hover:text-white"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              Schedule
            </button>
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium text-white/50 hover:text-white transition-all"
              >
                <Settings className="w-4 h-4" />
              </Link>
            )}
          </div>
        </nav>
      </div>

      <PlayerModal />
      <NotificationCenter />
      <InstallPrompt />
    </>
  );
};

export default Index;
