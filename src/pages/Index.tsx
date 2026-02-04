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
import { AdBlockBanner } from "@/components/AdBlockBanner";
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
        {/* Ultra-premium ambient background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* Primary glow orb */}
          <div className="absolute top-0 left-1/4 w-[800px] h-[600px] bg-primary/8 blur-[200px] rounded-full animate-pulse [animation-duration:8s]" />
          {/* Accent glow orb */}
          <div className="absolute bottom-1/3 right-1/4 w-[600px] h-[600px] bg-accent/5 blur-[180px] rounded-full animate-pulse [animation-duration:10s] [animation-delay:2s]" />
          {/* Subtle secondary orb */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] bg-primary/3 blur-[250px] rounded-full" />
          {/* Premium grid overlay */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px'
            }}
          />
        </div>

        {/* Sidebar - hidden on mobile, shown at bottom */}
        <div className="max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:z-50">
          <Sidebar activeView={activeView} onViewChange={handleViewChange} />
        </div>
        
        <main className="relative p-4 md:p-6 pb-24 md:pb-8 overflow-x-hidden">
          <TopBar
            activeView={activeView}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
          />
          
          {/* AdBlock Banner */}
          <div className="mt-4">
            <AdBlockBanner />
          </div>
          
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
