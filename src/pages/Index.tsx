import { useState } from "react";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PlayerModal } from "@/components/PlayerModal";
import { EventsView } from "@/components/EventsView";
import { MoviesView } from "@/components/MoviesView";
import { MultiStreamView } from "@/components/MultiStreamView";
import { ChannelsView } from "@/components/ChannelsView";
import { NotificationCenter } from "@/components/NotificationCenter";
import { cn } from "@/lib/utils";
import { Trophy, Film, LayoutGrid, Settings, Radio, Tv } from "lucide-react";
import { useAppAuth } from "@/hooks/useAppAuth";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

type ViewType = "eventos" | "peliculas" | "multistream" | "channels247" | "channelsiptv";

const pageVariants = {
  initial: { opacity: 0, y: 12, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.99 },
};

const Index = () => {
  const [activeView, setActiveView] = useState<ViewType>("eventos");
  const [movieSearch, setMovieSearch] = useState("");
  const { appUser } = useAppAuth();
  const isAdmin = appUser?.isAdmin ?? false;

  return (
    <>
      <div className="min-h-screen bg-background">
        <main className="max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 pb-24 md:pb-8 pt-3">
          <AnimatePresence mode="wait">
            {activeView === "eventos" && (
              <motion.div
                key="eventos"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
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
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
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
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <MultiStreamView />
              </motion.div>
            )}
            {activeView === "channels247" && (
              <motion.div
                key="channels247"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <ChannelsView initialTab="247" />
              </motion.div>
            )}
            {activeView === "channelsiptv" && (
              <motion.div
                key="channelsiptv"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <ChannelsView initialTab="normal" />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-50">
          {/* Nav background with frosted glass */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-3xl border-t border-white/[0.04]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
          
          <div className="relative max-w-[600px] mx-auto flex items-center justify-around px-4 py-2.5 safe-area-pb">
            {([
              { view: "eventos" as ViewType, icon: Trophy, label: "Live" },
              { view: "peliculas" as ViewType, icon: Film, label: "Películas" },
              { view: "multistream" as ViewType, icon: LayoutGrid, label: "Multi" },
              { view: "channels247" as ViewType, icon: Radio, label: "24/7" },
              { view: "channelsiptv" as ViewType, icon: Tv, label: "IPTV" },
            ]).map(({ view, icon: Icon, label }) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300",
                  activeView === view
                    ? "text-white"
                    : "text-white/30 hover:text-white/60"
                )}
              >
                {activeView === view && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-gradient-to-r from-primary to-[hsl(200,100%,50%)] rounded-2xl shadow-xl shadow-primary/20"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {label}
                </span>
              </button>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white/20 hover:text-white/50 transition-all duration-300"
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
