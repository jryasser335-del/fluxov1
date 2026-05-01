import { useState } from "react";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PlayerModal } from "@/components/PlayerModal";
import { EventsView } from "@/components/EventsView";
import { MoviesView } from "@/components/MoviesView";
import { MultiStreamView } from "@/components/MultiStreamView";
import { IPTVView } from "@/components/IPTVView";
import { NotificationCenter } from "@/components/NotificationCenter";
import { cn } from "@/lib/utils";
import { Trophy, Film, LayoutGrid, Settings, Crown } from "lucide-react";
import { useAppAuth } from "@/hooks/useAppAuth";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

type ViewType = "eventos" | "peliculas" | "multistream" | "iptv";

const pageVariants = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(2px)" },
};

const NAV_ITEMS = [
  { view: "eventos" as ViewType, icon: Trophy, label: "Live", color: "from-primary to-primary-glow" },
  { view: "peliculas" as ViewType, icon: Film, label: "Películas", color: "from-accent to-primary" },
  { view: "multistream" as ViewType, icon: LayoutGrid, label: "Multi", color: "from-destructive to-warning" },
  { view: "iptv" as ViewType, icon: Crown, label: "IPTV", color: "from-amber-500 to-fuchsia-500" },
];

const Index = () => {
  const [activeView, setActiveView] = useState<ViewType>("eventos");
  const [movieSearch, setMovieSearch] = useState("");
  const { appUser } = useAppAuth();
  const isAdmin = appUser?.isAdmin ?? false;

  return (
    <>
      <div className="min-h-screen bg-background relative">
        {/* Ambient background orbs - deeper and more cinematic */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-[400px] -left-[300px] w-[800px] h-[800px] rounded-full bg-primary/[0.025] blur-[200px]" />
          <div className="absolute -bottom-[300px] -right-[300px] w-[700px] h-[700px] rounded-full bg-accent/[0.015] blur-[180px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.008] blur-[150px]" />
        </div>

        <main className="relative max-w-[1440px] mx-auto px-3 sm:px-5 md:px-8 pb-28 md:pb-8 pt-5">
          <AnimatePresence mode="wait">
            {activeView === "eventos" && (
              <motion.div
                key="eventos"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <MultiStreamView />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Bottom Navigation - Ultra premium glassmorphism */}
        <nav className="fixed bottom-0 left-0 right-0 z-50">
          {/* Multi-layer glass effect */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          
          <div className="relative max-w-[520px] mx-auto flex items-center justify-around px-3 py-2.5 safe-area-pb">
            {NAV_ITEMS.map(({ view, icon: Icon, label, color }) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={cn(
                  "relative flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[13px] font-semibold transition-all duration-400",
                  activeView === view
                    ? "text-white"
                    : "text-white/20 hover:text-white/45"
                )}
              >
                {activeView === view && (
                  <motion.div
                    layoutId="nav-pill"
                    className={cn("absolute inset-0 rounded-2xl bg-gradient-to-br shadow-xl", color)}
                    style={{ boxShadow: '0 10px 40px -10px hsl(215 100% 55% / 0.35)' }}
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  />
                )}
                {activeView === view && (
                  <>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/25 to-transparent" />
                    <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                  </>
                )}
                <span className="relative z-10 flex items-center gap-2.5">
                  <Icon className="w-[18px] h-[18px]" />
                  <span className="hidden sm:inline">{label}</span>
                </span>
              </button>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-2 px-3 py-3 rounded-2xl text-[13px] font-semibold text-white/10 hover:text-white/35 transition-all duration-300"
              >
                <Settings className="w-[18px] h-[18px]" />
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