import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchTMDB, TMDBResult } from "@/lib/api";
import { Section } from "./Section";
import { Chips } from "./Chips";
import { MediaCard } from "./MediaCard";
import { SkeletonGrid } from "./Skeleton";
import { STREAMING_PLATFORMS, type PlatformValue } from "@/lib/platforms";
import { DEFAULT_WATCH_REGION, getWatchProviderIdForPlatform } from "@/lib/tmdbWatchProviders";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SERIES_FILTERS = [
  { value: "popular", label: "Popular" },
  { value: "top_rated", label: "Top" },
  { value: "on_the_air", label: "En emisión" },
  { value: "airing_today", label: "Hoy" },
];

const PLATFORM_FILTERS = [
  { value: "all", label: "Todas" },
  ...STREAMING_PLATFORMS.map((p) => ({ value: p.value, label: p.label })),
];

interface MediaLink {
  tmdb_id: number;
  stream_url: string;
  platform: string | null;
}

interface SeriesViewProps {
  searchQuery: string;
}

export function SeriesView({ searchQuery }: SeriesViewProps) {
  const [type, setType] = useState("popular");
  const [platform, setPlatform] = useState<"all" | PlatformValue>("all");
  const [page, setPage] = useState(1);
  const [allSeries, setAllSeries] = useState<TMDBResult[]>([]);
  const [mediaLinks, setMediaLinks] = useState<Map<number, MediaLink>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [totalPages, setTotalPages] = useState(500);
  const [hasMore, setHasMore] = useState(true);

  // Build the base path for queries
  const buildBasePath = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const watchRegion = DEFAULT_WATCH_REGION;

    const providerId =
      platform === "all"
        ? null
        : await getWatchProviderIdForPlatform({
            mediaType: "tv",
            platform,
            region: watchRegion,
          });

    let basePath = "discover/tv?include_adult=false";
    if (type === "popular") {
      basePath += "&sort_by=popularity.desc";
    } else if (type === "top_rated") {
      basePath += "&sort_by=vote_average.desc&vote_count.gte=200";
    } else if (type === "on_the_air") {
      basePath += `&sort_by=first_air_date.desc&first_air_date.lte=${today}`;
    } else if (type === "airing_today") {
      basePath += `&sort_by=first_air_date.desc&first_air_date.gte=${today}&first_air_date.lte=${today}`;
    }

    if (providerId) {
      basePath += `&with_watch_providers=${providerId}&watch_region=${watchRegion}&with_watch_monetization_types=flatrate`;
    } else if (platform !== "all") {
      return null;
    }

    return basePath;
  }, [type, platform]);

  // Fetch media links from database
  useEffect(() => {
    const fetchMediaLinks = async () => {
      const { data } = await supabase
        .from("media_links")
        .select("tmdb_id, stream_url, platform")
        .eq("media_type", "series")
        .eq("is_active", true);
      
      if (data) {
        const linksMap = new Map<number, MediaLink>();
        data.forEach((link) => {
          linksMap.set(link.tmdb_id, link);
        });
        setMediaLinks(linksMap);
      }
    };
    fetchMediaLinks();
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setAllSeries([]);
    setPage(1);
    setHasMore(true);

    const fetchInitial = async () => {
      try {
        const basePath = await buildBasePath();
        if (basePath === null) {
          if (!cancelled) {
            setAllSeries([]);
            setTotalPages(1);
            setHasMore(false);
            setLoading(false);
          }
          return;
        }

        const pagesToFetch = [1, 2, 3, 4, 5];
        const promises = pagesToFetch.map(p => fetchTMDB(`${basePath}&page=${p}`));
        const results = await Promise.all(promises);

        if (!cancelled) {
          const combined = results.flatMap(r => r.results);
          const unique = Array.from(new Map(combined.map(s => [s.id, s])).values());
          setAllSeries(unique);
          setTotalPages(Math.min(results[0]?.total_pages || 500, 500));
          setPage(5);
          setHasMore(5 < Math.min(results[0]?.total_pages || 500, 500));
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchInitial();

    return () => {
      cancelled = true;
    };
  }, [type, platform, buildBasePath]);

  // Load more function for infinite scroll
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const basePath = await buildBasePath();
      if (!basePath) {
        setLoadingMore(false);
        return;
      }

      const nextPage = page + 1;
      const result = await fetchTMDB(`${basePath}&page=${nextPage}`);
      
      setAllSeries(prev => {
        const combined = [...prev, ...result.results];
        return Array.from(new Map(combined.map(s => [s.id, s])).values());
      });
      setPage(nextPage);
      setHasMore(nextPage < totalPages);
    } catch (err) {
      console.error("Error loading more:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [page, totalPages, hasMore, loadingMore, buildBasePath]);

  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    isLoading: loadingMore,
    onLoadMore: loadMore,
  });

  const handleTypeChange = (newType: string) => {
    setType(newType);
  };

  const handlePlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform as "all" | PlatformValue);
  };

  // Filter by search only
  const filteredSeries = useMemo(() => {
    let result = allSeries;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => (s.name || "").toLowerCase().includes(q));
    }
    
    return result;
  }, [allSeries, searchQuery]);

  const platformLabel = platform === "all" ? "Todas" : STREAMING_PLATFORMS.find(p => p.value === platform)?.label || platform;
  const badge = loading
    ? "Cargando…"
    : searchQuery
    ? `${filteredSeries.length} resultados`
    : `${filteredSeries.length} series`;

  return (
    <Section title="Series" emoji="📺" badge={badge}>
      <div className="flex flex-wrap gap-4 mb-4">
        <Chips options={SERIES_FILTERS} value={type} onChange={handleTypeChange} />
        <Chips options={PLATFORM_FILTERS} value={platform} onChange={handlePlatformChange} />
      </div>

      {loading ? (
        <SkeletonGrid count={24} />
      ) : error ? (
        <div className="text-muted-foreground text-sm py-8 text-center">
          No se pudo cargar TMDB.
        </div>
      ) : filteredSeries.length === 0 && platform !== "all" ? (
        <div className="text-muted-foreground text-sm py-8 text-center">
          TMDB no devolvió resultados para {platformLabel}.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
            {filteredSeries.map((s) => {
              const link = mediaLinks.get(s.id);
              return (
                <MediaCard 
                  key={s.id} 
                  item={s} 
                  type="series" 
                  streamUrl={link?.stream_url}
                  platform={link?.platform || (platform === "all" ? null : platform)}
                />
              );
            })}
          </div>
          
          <div ref={sentinelRef} className="h-4" />
          
          {loadingMore && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          
          {!hasMore && filteredSeries.length > 0 && (
            <div className="text-center text-muted-foreground text-sm py-6">
              Has llegado al final del catálogo
            </div>
          )}
        </>
      )}
    </Section>
  );
}
