import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Loader2, Tv, Trophy, Users, ArrowLeft, Sparkles, Shield, Zap, Satellite } from "lucide-react";
import { AdminChannels } from "@/components/admin/AdminChannels";
import { AdminEvents } from "@/components/admin/AdminEvents";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminScraper } from "@/components/admin/AdminScraper";

export default function Admin() {
  const { user, isAdmin, isLoading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    } else if (!isLoading && user && !isAdmin) {
      navigate("/");
    }
  }, [user, isAdmin, isLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 w-20 h-20 bg-primary/30 rounded-full blur-xl animate-pulse" />
          <Loader2 className="w-10 h-10 animate-spin text-primary relative z-10" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[600px] h-[400px] bg-primary/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-7xl mx-auto p-4 md:p-8">
        {/* Premium Header */}
        <div className="relative mb-8 overflow-hidden rounded-2xl">
          <div className="absolute -inset-[1px] bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-2xl opacity-30" />
          <div className="relative bg-black/80 backdrop-blur-xl rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-purple-500/30 border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/20">
                  <Shield className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-display font-bold text-white">
                      Panel Admin
                    </h1>
                    <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                  </div>
                  <p className="text-sm text-white/50 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Gestiona tu plataforma de streaming
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/")}
                  className="border-white/10 bg-white/5 text-white hover:bg-white/10 backdrop-blur-sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleSignOut}
                  className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Salir
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Tabs */}
        <Tabs defaultValue="events" className="space-y-6">
          <TabsList className="relative inline-flex w-full max-w-2xl bg-black/40 border border-white/10 p-1.5 rounded-2xl backdrop-blur-sm">
            <TabsTrigger 
              value="events" 
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-300"
            >
              <Trophy className="w-4 h-4" />
              <span className="font-medium">Eventos</span>
            </TabsTrigger>
            <TabsTrigger 
              value="channels" 
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-300"
            >
              <Tv className="w-4 h-4" />
              <span className="font-medium">Canales</span>
            </TabsTrigger>
            <TabsTrigger 
              value="scraper" 
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/25 transition-all duration-300"
            >
              <Satellite className="w-4 h-4" />
              <span className="font-medium">Escáner</span>
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/25 transition-all duration-300"
            >
              <Users className="w-4 h-4" />
              <span className="font-medium">Usuarios</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-6">
            <AdminEvents />
          </TabsContent>

          <TabsContent value="channels" className="mt-6">
            <AdminChannels />
          </TabsContent>

          <TabsContent value="scraper" className="mt-6">
            <AdminScraper />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <AdminUsers />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
