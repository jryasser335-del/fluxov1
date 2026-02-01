import { useState, useEffect, useMemo } from "react";
import { fetchTMDB, TMDBResult } from "@/lib/api";
import { Section } from "./Section";
import { Chips } from "./Chips";
import { Pager } from "./Pager";
import { MediaCard } from "./MediaCard";
import { SkeletonGrid } from "./Skeleton";
import { STREAMING_PLATFORMS, type PlatformValue } from "@/lib/platforms";
import { DEFAULT_WATCH_REGION, getWatchProviderIdForPlatform } from "@/lib/tmdbWatchProviders";

const LANG_FILTERS = [
  { value: "ko", label: "K-Drama" },
  { value: "ja", label: "J-Drama" },
  { value: "zh", label: "C-Drama" },
];

const TYPE_FILTERS = [
  { value: "trending", label: "Tendencias" },
  { value: "top", label: "Top" },
];

const PLATFORM_FILTERS = [
  { value: "all", label: "Todas" },
  ...STREAMING_PLATFORMS.map((p) => ({ value: p.value, label: p.label })),
];

interface DoramasViewProps {
  searchQuery: string;
}

export function DoramasView({ searchQuery }: DoramasViewProps) {
  const [lang, setLang] = useState("ko");
  const [type, setType] = useState("trending");
  const [platform, setPlatform] = useState<"all" | PlatformValue>("all");
  const [page, setPage] = useState(1);
  const [allDoramas, setAllDoramas] = useState<TMDBResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [totalPages, setTotalPages] = useState(20);

  // Fetch multiple pages for more content
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    const fetchMultiplePages = async () => {
      try {
        const watchRegion = DEFAULT_WATCH_REGION;
        const providerId =
          platform === "all"
            ? null
            : await getWatchProviderIdForPlatform({
                mediaType: "tv",
                platform,
                region: watchRegion,
              });

        const pagesToFetch = [page, page + 1, page + 2];
        let basePath =
          type === "top"
            ? `discover/tv?with_original_language=${lang}&sort_by=vote_average.desc&vote_count.gte=200`
            : `discover/tv?with_original_language=${lang}&sort_by=popularity.desc`;

        if (providerId) {
          basePath += `&with_watch_providers=${providerId}&watch_region=${watchRegion}&with_watch_monetization_types=flatrate`;
        } else if (platform !== "all") {
          if (!cancelled) {
            setAllDoramas([]);
            setTotalPages(1);
            setLoading(false);
          }
          return;
        }
        
        const promises = pagesToFetch.map(p => 
          fetchTMDB(`${basePath}&page=${p}`)
        );
        
        const results = await Promise.all(promises);
        
        if (!cancelled) {
          const combined = results.flatMap(r => r.results);
          const unique = Array.from(new Map(combined.map(d => [d.id, d])).values());
          setAllDoramas(unique);
          setTotalPages(Math.min(results[0]?.total_pages || 20, 500));
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchMultiplePages();

    return () => {
      cancelled = true;
    };
  }, [lang, type, platform, page]);

  const handleLangChange = (newLang: string) => {
    setLang(newLang);
    setPage(1);
  };

  const handleTypeChange = (newType: string) => {
    setType(newType);
    setPage(1);
  };

  const handlePlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform as "all" | PlatformValue);
    setPage(1);
  };

  // Filter by search only (platform is fetched from TMDB via watch providers)
  const filteredDoramas = useMemo(() => {
    let result = allDoramas;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) => (d.name || "").toLowerCase().includes(q));
    }
    
    return result;
  }, [allDoramas, searchQuery]);

  const langName = lang === "ko" ? "K-Drama" : lang === "ja" ? "J-Drama" : "C-Drama";
  const typeName = type === "top" ? "Top" : "Tendencias";
  const platformLabel = platform === "all" ? "Todas" : STREAMING_PLATFORMS.find(p => p.value === platform)?.label || platform;
  const badge = loading
    ? "Cargando…"
    : platform !== "all"
    ? `${filteredDoramas.length} en ${platformLabel}`
    : searchQuery
    ? `${filteredDoramas.length} resultados`
    : `${langName} • ${typeName} • Página ${page}`;

  return (
    <Section title="Doramas" emoji="🎎" badge={badge}>
      <div className="flex flex-wrap gap-4 mb-2">
        <Chips options={LANG_FILTERS} value={lang} onChange={handleLangChange} />
        <Chips options={TYPE_FILTERS} value={type} onChange={handleTypeChange} />
        <Chips options={PLATFORM_FILTERS} value={platform} onChange={handlePlatformChange} />
      </div>
      <Pager page={page} onPageChange={setPage} maxPage={Math.ceil(totalPages / 3)} />

      {loading ? (
        <SkeletonGrid count={24} />
      ) : error ? (
        <div className="text-muted-foreground text-sm py-8 text-center">
          No se pudo cargar TMDB.
        </div>
      ) : filteredDoramas.length === 0 && platform !== "all" ? (
        <div className="text-muted-foreground text-sm py-8 text-center">
          TMDB no devolvió resultados para {platformLabel}.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {filteredDoramas.map((d) => {
            return (
              <MediaCard 
                key={d.id} 
                item={d} 
                type="dorama" 
                platform={platform === "all" ? null : platform}
              />
            );
          })}
        </div>
      )}
    </Section>
  );
}
