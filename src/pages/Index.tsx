import { useState } from "react";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PlayerModal } from "@/components/PlayerModal";
import { EventsView } from "@/components/EventsView";
import { MoviesView } from "@/components/MoviesView";
import { MultiStreamView } from "@/components/MultiStreamView";
import { NotificationCenter } from "@/components/NotificationCenter";
import { cn } from "@/lib/utils";
import { Trophy, Film, LayoutGrid, Settings } from "lucide-react";
import { useAppAuth } from "@/hooks/useAppAuth";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

type ViewType = "eventos" | "peliculas" | "multistream";

const pageVariants = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(2px)" },
};

const NAV_ITEMS = [
  { view: "eventos" as ViewType, icon: Trophy, label: "Live", color: "from-primary to-primary-glow" },
  { view: "peliculas" as ViewType, icon: Film, label: "Películas", color: "from-accent to-primary" },
  { view: "multistream" as ViewType, icon: LayoutGrid, label: "Multi", color: "from-destructive to-warning" },
];

const Index = () => {
  const [activeView, setActiveView] = useState<ViewType>("eventos");
  const [movieSearch, setMovieSearch] = useState("");
  const { appUser } = useAppAuth();
  const isAdmin = appUser?.isAdmin ?? false;

  return (
    <>
      <div className="min-h-screen bg-background relative">
        {/* Ambient background orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-[300px] -left-[200px] w-[600px] h-[600px] rounded-full bg-primary/[0.03] blur-[150px]" />
          <div className="absolute -bottom-[200px] -right-[200px] w-[500px] h-[500px] rounded-full bg-accent/[0.02] blur-[120px]" />
        </div>

        <main className="relative max-w-[1440px] mx-auto px-3 sm:px-5 md:px-8 pb-28 md:pb-8 pt-4">
          <AnimatePresence mode="wait">
            {activeView === "eventos" && (
              <motion.div
                key="eventos"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <EventsView />
              </motion.div>
            )}
            {activeView === "peliculas" && (
              <motion.div
                key="peliculas"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <MoviesView searchQuery={movieSearch} />
              </motion.div>
            )}
            {activeView === "multistream" && (
              <motion.div
                key="multistream"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <MultiStreamView />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-50">
          <div className="absolute inset-0 bg-background/90 backdrop-blur-2xl border-t border-white/[0.04]" />
          
          <div className="relative max-w-[520px] mx-auto flex items-center justify-around px-3 py-2 safe-area-pb">
            {NAV_ITEMS.map(({ view, icon: Icon, label, color }) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[13px] font-semibold transition-all duration-400",
                  activeView === view
                    ? "text-white"
                    : "text-white/25 hover:text-white/50"
                )}
              >
                {activeView === view && (
                  <motion.div
                    layoutId="nav-pill"
                    className={cn("absolute inset-0 rounded-2xl bg-gradient-to-r shadow-lg", color)}
                    style={{ boxShadow: '0 8px 30px -8px hsl(215 100% 55% / 0.3)' }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {activeView === view && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 to-transparent" />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </span>
              </button>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-[13px] font-semibold text-white/15 hover:text-white/40 transition-all duration-300"
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