import { useState } from "react";
import { IntroScreen } from "@/components/IntroScreen";
import { Sidebar, ViewType } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { PlayerModal } from "@/components/PlayerModal";
import { ChannelsView } from "@/components/ChannelsView";
import { MoviesView } from "@/components/MoviesView";
import { SeriesView } from "@/components/SeriesView";
import { DoramasView } from "@/components/DoramasView";
import { EventsView } from "@/components/EventsView";
import { CatalogView } from "@/components/CatalogView";

const Index = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [activeView, setActiveView] = useState<ViewType>("catalogo");
  const [searchQuery, setSearchQuery] = useState("");

  const handleViewChange = (view: ViewType) => {
    setActiveView(view);
    setSearchQuery("");
  };

  return (
    <>
      {showIntro && <IntroScreen onComplete={() => setShowIntro(false)} />}
      
      <div className="grid grid-cols-[86px_1fr] max-md:grid-cols-[78px_1fr] min-h-screen relative">
        {/* Ambient background effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/3 w-[600px] h-[400px] bg-primary/5 blur-[150px] rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/5 blur-[120px] rounded-full" />
        </div>

        <Sidebar activeView={activeView} onViewChange={handleViewChange} />
        
        <main className="relative p-5 pb-8 overflow-x-hidden">
          <TopBar
            activeView={activeView}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
          />
          
          <div className="mt-2">
            {activeView === "catalogo" && <CatalogView searchQuery={searchQuery} />}
            {activeView === "canales" && <ChannelsView />}
            {activeView === "peliculas" && <MoviesView searchQuery={searchQuery} />}
            {activeView === "series" && <SeriesView searchQuery={searchQuery} />}
            {activeView === "doramas" && <DoramasView searchQuery={searchQuery} />}
            {activeView === "eventos" && <EventsView />}
          </div>
        </main>
      </div>

      <PlayerModal />
    </>
  );
};

export default Index;
