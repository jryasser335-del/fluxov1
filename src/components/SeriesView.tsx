import { useState, useEffect, useMemo } from "react";
import { fetchTMDB, TMDBResult } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Section } from "./Section";
import { Chips } from "./Chips";
import { Pager } from "./Pager";
import { MediaCard } from "./MediaCard";
import { SkeletonGrid } from "./Skeleton";

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

interface SeriesViewProps {
  searchQuery: string;
}

export function SeriesView({ searchQuery }: SeriesViewProps) {
  const [type, setType] = useState("popular");
  const [page, setPage] = useState(1);
  const [allSeries, setAllSeries] = useState<TMDBResult[]>([]);
  const [mediaLinks, setMediaLinks] = useState<Map<number, MediaLink>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [totalPages, setTotalPages] = useState(20);

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

  // Fetch multiple pages for more content
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    const fetchMultiplePages = async () => {
      try {
        const pagesToFetch = [page, page + 1, page + 2];
        const promises = pagesToFetch.map(p => 
          fetchTMDB(`tv/${type}?page=${p}`)
        );
        
        const results = await Promise.all(promises);
        
        if (!cancelled) {
          const combined = results.flatMap(r => r.results);
          const unique = Array.from(new Map(combined.map(s => [s.id, s])).values());
          setAllSeries(unique);
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
  }, [type, page]);

  const handleTypeChange = (newType: string) => {
    setType(newType);
    setPage(1);
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

  const badge = loading
    ? "Cargando…"
    : searchQuery
    ? `${filteredSeries.length} resultados`
    : `Página ${page} • ${filteredSeries.length} títulos`;

  return (
    <Section title="Series" emoji="📺" badge={badge}>
      <div className="flex flex-wrap gap-4 mb-2">
        <Chips options={SERIES_FILTERS} value={type} onChange={handleTypeChange} />
      </div>
      <Pager page={page} onPageChange={setPage} maxPage={Math.ceil(totalPages / 3)} />

      {loading ? (
        <SkeletonGrid count={24} />
      ) : error ? (
        <div className="text-muted-foreground text-sm py-8 text-center">
          No se pudo cargar TMDB.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
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