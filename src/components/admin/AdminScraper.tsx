import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2, Search, Copy, Check, RefreshCw, Satellite,
  Zap, Globe, Timer, Play, Pause
} from "lucide-react";
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
};

const SCAN_INTERVAL = 120; // 2 minutes in seconds

export function AdminScraper() {
  const [matches, setMatches] = useState<ScrapedMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [autoScan, setAutoScan] = useState(false);
  const [countdown, setCountdown] = useState(SCAN_INTERVAL);
  const [scanCount, setScanCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchSavedMatches();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const fetchSavedMatches = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from("live_scraped_links" as any)
      .select("*")
      .order("category", { ascending: true });

    if (error) {
      console.error("Error fetching saved matches:", error);
    } else {
      setMatches((data as any as ScrapedMatch[]) || []);
    }
    setFetching(false);
  };

  const runFullCycle = useCallback(async () => {
    setLoading(true);
    try {
      // Step 1: Scrape
      const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke("scrape-live-matches");
      if (scrapeError) throw scrapeError;

      if (scrapeData?.success) {
        // Step 2: Auto-assign
        const { data: assignData } = await supabase.functions.invoke("auto-assign-links");
        
        const msg = `🛰️ Escaneo #${scanCount + 1}: ${scrapeData.count} partidos | ${assignData?.assigned || 0} asignados, ${assignData?.created || 0} creados, ${assignData?.cleaned || 0} limpiados`;
        toast.success(msg);
        setScanCount(prev => prev + 1);
        await fetchSavedMatches();
      } else {
        toast.error(scrapeData?.error || "Error en el escaneo");
      }
    } catch (err: any) {
      console.error("Scan error:", err);
      toast.error("Error al escanear: " + (err.message || "desconocido"));
    }
    setLoading(false);
    setCountdown(SCAN_INTERVAL);
  }, [scanCount]);

  const toggleAutoScan = () => {
    if (autoScan) {
      // Stop
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      intervalRef.current = null;
      countdownRef.current = null;
      setAutoScan(false);
      setCountdown(SCAN_INTERVAL);
    } else {
      // Start - run immediately then every 2 min
      setAutoScan(true);
      runFullCycle();
      
      intervalRef.current = setInterval(() => {
        runFullCycle();
      }, SCAN_INTERVAL * 1000);

      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) return SCAN_INTERVAL;
          return prev - 1;
        });
      }, 1000);
    }
  };

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

    const matchesCategory =
      filterCategory === "all" || m.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const lastScan = matches.length > 0 ? matches[0].scanned_at : null;
  const formatCountdown = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

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
                <h2 className="text-xl font-bold text-white">
                  Escáner Universal
                </h2>
                <p className="text-sm text-white/50">
                  {lastScan
                    ? `Último escaneo: ${new Date(lastScan).toLocaleTimeString("es")}`
                    : "Sin escaneos previos"}
                  {scanCount > 0 && ` • ${scanCount} escaneos realizados`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Auto-scan toggle */}
              <Button
                onClick={toggleAutoScan}
                variant="outline"
                className={`font-bold ${
                  autoScan
                    ? "bg-green-500/20 border-green-500/40 text-green-400 hover:bg-green-500/30"
                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                }`}
              >
                {autoScan ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Detener
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Auto (2min)
                  </>
                )}
              </Button>

              {/* Manual scan */}
              <Button
                onClick={runFullCycle}
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
                    Escanear
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Countdown bar */}
          {autoScan && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                <span className="flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  Próximo escaneo en {formatCountdown(countdown)}
                </span>
                <span>Escaneo #{scanCount + 1}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-1000"
                  style={{ width: `${((SCAN_INTERVAL - countdown) / SCAN_INTERVAL) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-white">{matches.length}</p>
          <p className="text-xs text-white/50">Total</p>
        </div>
        {["admin", "delta", "echo", "golf"].map((server) => {
          const count = matches.filter(
            (m) => m[`source_${server}` as keyof ScrapedMatch]
          ).length;
          return (
            <div
              key={server}
              className="bg-white/5 border border-white/10 rounded-xl p-3 text-center"
            >
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
              filterCategory === "all"
                ? "bg-white/20 text-white"
                : "bg-white/5 text-white/60"
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
                filterCategory === cat
                  ? "bg-white/20 text-white"
                  : "bg-white/5 text-white/60"
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
              ? 'Presiona "Escanear" para comenzar'
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] border-white/20 text-white/60"
                        >
                          {CATEGORY_EMOJIS[match.category || "other"] || "🎯"}{" "}
                          {match.category}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-white text-sm truncate">
                        {match.match_title}
                      </h3>
                      {match.team_home && match.team_away && (
                        <p className="text-xs text-white/40 mt-0.5">
                          {match.team_home} vs {match.team_away}
                        </p>
                      )}
                    </div>
                  </div>

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
                            link
                              ? SERVER_COLORS[server]
                              : "border-white/5 text-white/20 bg-white/[0.02]"
                          } ${isCopied ? "ring-2 ring-green-400/50" : ""}`}
                        >
                          {isCopied ? (
                            <Check className="w-3 h-3 mr-1" />
                          ) : (
                            <Copy className="w-3 h-3 mr-1" />
                          )}
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
