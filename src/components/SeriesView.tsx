import { useState, useEffect, useMemo } from "react";
import { fetchTMDB, TMDBResult } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Section } from "./Section";
import { Chips } from "./Chips";
import { Pager } from "./Pager";
import { MediaCard } from "./MediaCard";
import { SkeletonGrid } from "./Skeleton";
import { STREAMING_PLATFORMS } from "@/lib/platforms";

interface MediaLink {
  tmdb_id: number;
  stream_url: string;
  platform: string | null;
}

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

interface SeriesViewProps {
  searchQuery: string;
}

export function SeriesView({ searchQuery }: SeriesViewProps) {
  const [type, setType] = useState("popular");
  const [platform, setPlatform] = useState("all");
  const [page, setPage] = useState(1);
  const [series, setSeries] = useState<TMDBResult[]>([]);
  const [mediaLinks, setMediaLinks] = useState<Map<number, MediaLink>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fetch media links from database
  useEffect(() => {
    supabase
      .from("media_links")
      .select("tmdb_id, stream_url, platform")
      .eq("media_type", "series")
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) {
          const linksMap = new Map<number, MediaLink>();
          data.forEach((link: MediaLink) => linksMap.set(link.tmdb_id, link));
          setMediaLinks(linksMap);
        }
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchTMDB(`tv/${type}?page=${page}`)
      .then((data) => {
        if (!cancelled) {
          setSeries(data.results);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [type, page]);

  const handleTypeChange = (newType: string) => {
    setType(newType);
    setPage(1);
  };

  const handlePlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform);
    setPage(1);
  };

  // Filter by search and platform
  const filteredSeries = useMemo(() => {
    let result = series;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => (s.name || "").toLowerCase().includes(q));
    }
    
    if (platform !== "all") {
      result = result.filter((s) => {
        const link = mediaLinks.get(s.id);
        return link?.platform === platform;
      });
    }
    
    return result;
  }, [series, searchQuery, platform, mediaLinks]);

  const badge = loading
    ? "Cargando…"
    : searchQuery || platform !== "all"
    ? `${filteredSeries.length} resultados`
    : `Página ${page}/20 • ${filteredSeries.length} títulos`;

  return (
    <Section title="Series" emoji="📺" badge={badge}>
      <div className="flex flex-wrap gap-4 mb-2">
        <Chips options={SERIES_FILTERS} value={type} onChange={handleTypeChange} />
        <Chips options={PLATFORM_FILTERS} value={platform} onChange={handlePlatformChange} />
      </div>
      <Pager page={page} onPageChange={setPage} />

      {loading ? (
        <SkeletonGrid count={12} />
      ) : error ? (
        <div className="text-muted-foreground text-sm py-8 text-center">
          No se pudo cargar TMDB.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
          {filteredSeries.map((s) => {
            const link = mediaLinks.get(s.id);
            return (
              <MediaCard 
                key={s.id} 
                item={s} 
                type="series" 
                streamUrl={link?.stream_url}
                platform={link?.platform}
              />
            );
          })}
        </div>
      )}
    </Section>
  );
}
