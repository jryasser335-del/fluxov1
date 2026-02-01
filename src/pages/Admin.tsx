import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LogOut, Loader2, Tv, Film, Clapperboard, Theater, Users } from "lucide-react";
import { AdminChannels } from "@/components/admin/AdminChannels";
import { AdminMedia } from "@/components/admin/AdminMedia";
import { AdminEvents } from "@/components/admin/AdminEvents";

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <h1 className="text-2xl font-bold">Panel Admin</h1>
          </div>

          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="channels" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="channels" className="flex items-center gap-2">
              <Tv className="w-4 h-4" />
              <span className="hidden sm:inline">Canales</span>
            </TabsTrigger>
            <TabsTrigger value="movies" className="flex items-center gap-2">
              <Film className="w-4 h-4" />
              <span className="hidden sm:inline">Películas</span>
            </TabsTrigger>
            <TabsTrigger value="series" className="flex items-center gap-2">
              <Clapperboard className="w-4 h-4" />
              <span className="hidden sm:inline">Series</span>
            </TabsTrigger>
            <TabsTrigger value="doramas" className="flex items-center gap-2">
              <Theater className="w-4 h-4" />
              <span className="hidden sm:inline">Doramas</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Eventos</span>
            </TabsTrigger>
          </TabsList>

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

          <TabsContent value="events">
            <AdminEvents />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
