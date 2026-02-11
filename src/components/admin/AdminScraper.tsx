import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Copy, Check, RefreshCw, Satellite, Zap, Globe, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ScrapedMatch {
  id: string;
  match_id: string;
  match_title: string;
  category: string | null;
  team_home: string | null;
  team_away: string | null;
  source_admin: string | null;
  source_delta: string | null;
  source_echo: string | null;
  source_golf: string | null;
  scanned_at: string;
}

const SERVER_COLORS: Record<string, string> = {
  admin: "bg-red-500/20 text-red-400 border-red-500/30",
  delta: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  echo: "bg-green-500/20 text-green-400 border-green-500/30",
  golf: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const CATEGORY_EMOJIS: Record<string, string> = {
  basketball: "🏀",
  football: "⚽",
  fight: "🥊",
  tennis: "🎾",
  hockey: "🏒",
  baseball: "⚾",
  motorsport: "🏎️",
  other: "🎯",
};

export function AdminScraper() {
  const [matches, setMatches] = useState<ScrapedMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const fetchSavedMatches = async () => {
    setFetching(true);

    // FILTRO PARA LIMPIAR PANEL: Solo partidos de las últimas 24 horas
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const { data, error } = await supabase
      .from("live_scraped_links" as any)
      .select("*")
      .gt("scanned_at", oneDayAgo.toISOString()) // Quita automáticamente lo viejo de la vista
      .order("category", { ascending: true });

    if (error) {
      console.error("Error fetching saved matches:", error);
    } else {
      setMatches((data as any as ScrapedMatch[]) || []);
    }
    setFetching(false);
  };

  const scanAll = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    console.log("Iniciando proceso de escaneo en Supabase...");

    try {
      const { data, error } = await supabase.functions.invoke("scrape-live-matches");

      if (error) throw error;

      if (data?.success) {
        toast.success(`🛰️ Escaneo completo: ${data.count} partidos encontrados`);
        await fetchSavedMatches();
      } else {
        toast.error(data?.error || "Error en el escaneo");
      }
    } catch (err: any) {
      console.error("Scan error:", err);
      toast.error("Error al escanear: " + (err.message || "desconocido"));
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    fetchSavedMatches();
  }, []);

  // --- LÓGICA DE ESCANEO AUTOMÁTICO REPARADA ---
  useEffect(() => {
    console.log("Sistema de Auto-Scan activo.");

    const intervalId = setInterval(() => {
      // Solo dispara si no hay un proceso activo
      if (!loading) {
        console.log("Temporizador: Disparando scanAll...");
        scanAll();
      }
    }, 180000); // 3 minutos

    return () => {
      console.log("Limpiando temporizador de escaneo...");
      clearInterval(intervalId);
    };
  }, [scanAll, loading]);
  // ----------------------------------------------

  const copyLink = async (link: string, matchId: string, server: string) => {
    await navigator.clipboard.writeText(link);
    setCopiedId(`${matchId}-${server}`);
    toast.success(`📋 Link ${server.toUpperCase()} copiado`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const categories = Array.from(new Set(matches.map((m) => m.category).filter(Boolean)));

  const filtered = matches.filter((m) => {
    const matchesSearch =
      !searchQuery ||
      m.match_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.team_home?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.team_away?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = filterCategory === "all" || m.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const lastScan = matches.length > 0 ? matches[0].scanned_at : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute -inset-[1px] bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-2xl opacity-30" />
        <div className="relative bg-black/80 backdrop-blur-xl rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border border-cyan-500/30 flex items-center justify-center">
                <Satellite className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">Escáner Universal</h2>
                  <Badge
                    variant="outline"
                    className="animate-pulse bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px]"
                  >
                    AUTO-SCAN ACTIVO (3m)
                  </Badge>
                </div>
                <p className="text-sm text-white/50">
                  {lastScan ? `Último escaneo: ${new Date(lastScan).toLocaleTimeString("es")}` : "Sin escaneos previos"}
                </p>
              </div>
            </div>

            <Button
              onClick={scanAll}
              disabled={loading}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold px-6 shadow-lg shadow-cyan-500/25"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Escaneando...
                </>
              ) : (
                <>
                  <Satellite className="w-4 h-4 mr-2" />
                  Escanear Cartelera Completa
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-white">{matches.length}</p>
          <p className="text-xs text-white/50">Total</p>
        </div>
        {["admin", "delta", "echo", "golf"].map((server) => {
          const count = matches.filter((m) => m[`source_${server}` as keyof ScrapedMatch]).length;
          return (
            <div key={server} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{count}</p>
              <p className="text-xs text-white/50 uppercase">{server}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Buscar partido..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterCategory("all")}
            className={`border-white/10 ${
              filterCategory === "all" ? "bg-white/20 text-white" : "bg-white/5 text-white/60"
            }`}
          >
            <Globe className="w-3 h-3 mr-1" />
            Todos
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant="outline"
              size="sm"
              onClick={() => setFilterCategory(cat!)}
              className={`border-white/10 ${
                filterCategory === cat ? "bg-white/20 text-white" : "bg-white/5 text-white/60"
              }`}
            >
              {CATEGORY_EMOJIS[cat!] || "🎯"} {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Results Table */}
      {fetching ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-white/50" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <Satellite className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>
            {matches.length === 0
              ? 'Presiona "Escanear Cartelera Completa" para comenzar'
              : "No se encontraron partidos con ese filtro"}
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-3">
            {filtered.map((match) => (
              <div
                key={match.id}
                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.08] transition-colors"
              >
                <div className="flex flex-col gap-3">
                  {/* Match info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] border-white/20 text-white/60">
                          {CATEGORY_EMOJIS[match.category || "other"] || "🎯"} {match.category}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-white text-sm truncate">{match.match_title}</h3>
                      {match.team_home && match.team_away && (
                        <p className="text-xs text-white/40 mt-0.5">
                          {match.team_home} vs {match.team_away}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Server buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(["admin", "delta", "echo", "golf"] as const).map((server) => {
                      const link = match[`source_${server}` as keyof ScrapedMatch] as string | null;
                      const isCopied = copiedId === `${match.match_id}-${server}`;

                      return (
                        <Button
                          key={server}
                          variant="outline"
                          size="sm"
                          disabled={!link}
                          onClick={() => link && copyLink(link, match.match_id, server)}
                          className={`text-xs font-mono ${
                            link ? SERVER_COLORS[server] : "border-white/5 text-white/20 bg-white/[0.02]"
                          } ${isCopied ? "ring-2 ring-green-400/50" : ""}`}
                        >
                          {isCopied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                          {server.toUpperCase()}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Refresh */}
      {matches.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSavedMatches}
            className="border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Actualizar tabla
          </Button>
        </div>
      )}
    </div>
  );
}
