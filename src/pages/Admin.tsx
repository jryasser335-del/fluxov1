import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LogOut, Loader2, Tv, Film, Clapperboard, Theater, Trophy, Users } from "lucide-react";
import { AdminChannels } from "@/components/admin/AdminChannels";
import { AdminMedia } from "@/components/admin/AdminMedia";
import { AdminEvents } from "@/components/admin/AdminEvents";
import { AdminUsers } from "@/components/admin/AdminUsers";

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
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                Panel Admin
              </h1>
              <p className="text-sm text-white/40">Gestiona tu plataforma de streaming</p>
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={handleSignOut}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="events" className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full max-w-3xl bg-black/40 border border-white/10 p-1 rounded-xl">
            <TabsTrigger 
              value="events" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white rounded-lg"
            >
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Eventos</span>
            </TabsTrigger>
            <TabsTrigger 
              value="channels" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white rounded-lg"
            >
              <Tv className="w-4 h-4" />
              <span className="hidden sm:inline">Canales</span>
            </TabsTrigger>
            <TabsTrigger 
              value="movies" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white rounded-lg"
            >
              <Film className="w-4 h-4" />
              <span className="hidden sm:inline">Películas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="series" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white rounded-lg"
            >
              <Clapperboard className="w-4 h-4" />
              <span className="hidden sm:inline">Series</span>
            </TabsTrigger>
            <TabsTrigger 
              value="doramas" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white rounded-lg"
            >
              <Theater className="w-4 h-4" />
              <span className="hidden sm:inline">Doramas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Usuarios</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <AdminEvents />
          </TabsContent>

          <TabsContent value="channels">
            <AdminChannels />
          </TabsContent>

          <TabsContent value="movies">
            <AdminMedia mediaType="movie" title="Películas" />
          </TabsContent>

          <TabsContent value="series">
            <AdminMedia mediaType="series" title="Series" />
          </TabsContent>

          <TabsContent value="doramas">
            <AdminMedia mediaType="dorama" title="Doramas" />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
