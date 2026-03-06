import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppAuthGuard } from "@/components/AppAuthGuard";
import Index from "./pages/Index";
import AppLogin from "./pages/AppLogin";
import Admin from "./pages/Admin";
import Install from "./pages/Install";
import DownloadApp from "./pages/DownloadApp";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AppLogin />} />
          <Route path="/" element={<AppAuthGuard><Index /></AppAuthGuard>} />
          <Route path="/admin" element={<AppAuthGuard><Admin /></AppAuthGuard>} />
          <Route path="/install" element={<Install />} />
          <Route path="/app" element={<DownloadApp />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
