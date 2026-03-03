import { useState } from "react";
import { InstallPrompt } from "@/components/InstallPrompt";
import { Sidebar, ViewType } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { PlayerModal } from "@/components/PlayerModal";
import { EventsView } from "@/components/EventsView";
import { MultiStreamView } from "@/components/MultiStreamView";
import { NotificationCenter } from "@/components/NotificationCenter";
import { IntroScreen } from "@/components/IntroScreen";
import { PremiumPageWrapper } from "@/components/PremiumPageWrapper";

const Index = () => {
  const [activeView, setActiveView] = useState<ViewType>("eventos");
  const [searchQuery, setSearchQuery] = useState("");
  const [showIntro, setShowIntro] = useState(() => {
    const lastShown = sessionStorage.getItem("fluxo_intro_shown");
    return !lastShown;
  });

  const handleViewChange = (view: ViewType) => {
    setActiveView(view);
    setSearchQuery("");
  };

  const handleIntroDone = () => {
    setShowIntro(false);
    sessionStorage.setItem("fluxo_intro_shown", "1");
  };

  return (
    <>
      {showIntro && <IntroScreen onComplete={handleIntroDone} />}

      <div className="grid grid-cols-[86px_1fr] max-md:grid-cols-1 min-h-screen relative bg-black">
        {/* Ambient background effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/3 w-[600px] h-[400px] bg-primary/5 blur-[150px] rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/3 blur-[120px] rounded-full" />
          {/* Extra premium ambient orbs */}
          <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-primary/[0.03] blur-[100px] rounded-full animate-pulse" />
          <div className="absolute bottom-0 right-1/3 w-[400px] h-[200px] bg-accent/[0.02] blur-[80px] rounded-full" />
        </div>

        {/* Sidebar - hidden on mobile, shown at bottom */}
        <div className="max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:z-50">
          <Sidebar activeView={activeView} onViewChange={handleViewChange} />
        </div>
        
        <main className="relative p-4 md:p-5 pb-24 md:pb-8 overflow-x-hidden">
          <PremiumPageWrapper>
            <TopBar
              activeView={activeView}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
            />
            
            <div className="mt-2">
              {activeView === "eventos" && <EventsView />}
              {activeView === "multistream" && <MultiStreamView />}
            </div>
          </PremiumPageWrapper>
        </main>
      </div>

      <PlayerModal />
      <NotificationCenter />
      <InstallPrompt />
    </>
  );
};

export default Index;
