import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Install from "./pages/Install";
import DownloadApp from "./pages/DownloadApp";
import NotFound from "./pages/NotFound";
import { MaintenanceBanner } from "./components/MaintenanceBanner";

const queryClient = new QueryClient();

// Set to false to fully disable the maintenance banner
const MAINTENANCE_MODE = true;
const SKIP_KEY = "fluxo_skip_maintenance";

const App = () => {
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SKIP_KEY) === "1") setSkipped(true);
  }, []);

  const handleSkip = () => {
    sessionStorage.setItem(SKIP_KEY, "1");
    setSkipped(true);
  };

  if (MAINTENANCE_MODE && !skipped) {
    return <MaintenanceBanner onSkip={handleSkip} />;
  }
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/install" element={<Install />} />
          <Route path="/app" element={<DownloadApp />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
