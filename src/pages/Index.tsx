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

const Index = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [activeView, setActiveView] = useState<ViewType>("canales");
  const [searchQuery, setSearchQuery] = useState("");

  const handleViewChange = (view: ViewType) => {
    setActiveView(view);
    setSearchQuery("");
  };

  return (
    <>
      {showIntro && <IntroScreen onComplete={() => setShowIntro(false)} />}
      
      <div className="grid grid-cols-[86px_1fr] max-md:grid-cols-[78px_1fr] min-h-screen">
        <Sidebar activeView={activeView} onViewChange={handleViewChange} />
        
        <main className="p-4 pb-7 overflow-x-hidden">
          <TopBar
            activeView={activeView}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
          />
          
          {activeView === "canales" && <ChannelsView />}
          {activeView === "peliculas" && <MoviesView searchQuery={searchQuery} />}
          {activeView === "series" && <SeriesView searchQuery={searchQuery} />}
          {activeView === "doramas" && <DoramasView searchQuery={searchQuery} />}
          {activeView === "eventos" && <EventsView />}
        </main>
      </div>

      <PlayerModal />
    </>
  );
};

export default Index;
