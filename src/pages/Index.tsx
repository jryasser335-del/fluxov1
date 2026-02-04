import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IntroScreen } from "@/components/IntroScreen";
import { InstallPrompt } from "@/components/InstallPrompt";
import { Sidebar, ViewType } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { PlayerModal } from "@/components/PlayerModal";
import { ChannelsView } from "@/components/ChannelsView";
import { MoviesView } from "@/components/MoviesView";
import { SeriesView } from "@/components/SeriesView";
import { DoramasView } from "@/components/DoramasView";
import { EventsView } from "@/components/EventsView";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useAppAuth } from "@/hooks/useAppAuth";

const Index = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [activeView, setActiveView] = useState<ViewType>("canales");
  const [searchQuery, setSearchQuery] = useState("");
  const { appUser, checkAccess } = useAppAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!appUser || !checkAccess()) {
      navigate("/login");
    }
  }, [appUser, checkAccess, navigate]);

  const handleViewChange = (view: ViewType) => {
    setActiveView(view);
    setSearchQuery("");
  };

  // Don't render content if not authenticated
  if (!appUser || !checkAccess()) {
    return null;
  }

  return (
    <>
      {showIntro && <IntroScreen onComplete={() => setShowIntro(false)} />}
      
      <div className="grid grid-cols-[86px_1fr] max-md:grid-cols-[78px_1fr] min-h-screen relative bg-[hsl(240_15%_4%)]">
        {/* Ambient background effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/3 w-[600px] h-[400px] bg-primary/8 blur-[150px] rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/5 blur-[120px] rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-purple-600/5 blur-[180px] rounded-full" />
        </div>

        <Sidebar activeView={activeView} onViewChange={handleViewChange} />
        
        <main className="relative p-5 pb-8 overflow-x-hidden">
          <TopBar
            activeView={activeView}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
          />
          
          <div className="mt-2">
            {activeView === "canales" && <ChannelsView />}
            {activeView === "peliculas" && <MoviesView searchQuery={searchQuery} />}
            {activeView === "series" && <SeriesView searchQuery={searchQuery} />}
            {activeView === "doramas" && <DoramasView searchQuery={searchQuery} />}
            {activeView === "eventos" && <EventsView />}
          </div>
        </main>
      </div>

      <PlayerModal />
      <NotificationCenter />
      <InstallPrompt />
    </>
  );
};

export default Index;
