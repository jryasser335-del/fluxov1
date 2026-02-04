import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IntroScreen } from "@/components/IntroScreen";
import { InstallPrompt } from "@/components/InstallPrompt";
import { Sidebar, ViewType } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { PlayerModal } from "@/components/PlayerModal";
import { ChannelsView } from "@/components/ChannelsView";
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
      
      <div className="grid grid-cols-[86px_1fr] max-md:grid-cols-1 min-h-screen relative bg-black">
        {/* Ambient background effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/3 w-[600px] h-[400px] bg-primary/5 blur-[150px] rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/3 blur-[120px] rounded-full" />
        </div>

        {/* Sidebar - hidden on mobile, shown at bottom */}
        <div className="max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:z-50">
          <Sidebar activeView={activeView} onViewChange={handleViewChange} />
        </div>
        
        <main className="relative p-4 md:p-5 pb-24 md:pb-8 overflow-x-hidden">
          <TopBar
            activeView={activeView}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
          />
          
          <div className="mt-2">
            {activeView === "canales" && <ChannelsView />}
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
