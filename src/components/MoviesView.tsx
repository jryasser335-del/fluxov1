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

const MOVIE_FILTERS = [
  { value: "popular", label: "Popular" },
  { value: "top_rated", label: "Top" },
  { value: "now_playing", label: "Reciente" },
  { value: "upcoming", label: "Próximas" },
];

const PLATFORM_FILTERS = [
  { value: "all", label: "Todas" },
  ...STREAMING_PLATFORMS.map((p) => ({ value: p.value, label: p.label })),
];

interface MoviesViewProps {
  searchQuery: string;
}

export function MoviesView({ searchQuery }: MoviesViewProps) {
  const [type, setType] = useState("popular");
  const [platform, setPlatform] = useState("all");
  const [page, setPage] = useState(1);
  const [allMovies, setAllMovies] = useState<TMDBResult[]>([]);
  const [mediaLinks, setMediaLinks] = useState<Map<number, MediaLink>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [totalPages, setTotalPages] = useState(20);

  // Fetch media links from database
  useEffect(() => {
    supabase
      .from("media_links")
      .select("tmdb_id, stream_url, platform")
      .eq("media_type", "movie")
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
          fetchTMDB(`movie/${type}?page=${p}`)
        );
        
        const results = await Promise.all(promises);
        
        if (!cancelled) {
          const combined = results.flatMap(r => r.results);
          const unique = Array.from(new Map(combined.map(m => [m.id, m])).values());
          setAllMovies(unique);
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

  const handlePlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform);
  };

  // Filter by search and platform
  const filteredMovies = useMemo(() => {
    let result = allMovies;
    
    // Filter by platform - only show movies that have a link with that platform
    if (platform !== "all") {
      result = result.filter((m) => {
        const link = mediaLinks.get(m.id);
        return link && link.platform === platform;
      });
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((m) => (m.title || "").toLowerCase().includes(q));
    }
    
    return result;
  }, [allMovies, platform, mediaLinks, searchQuery]);

  const platformLabel = platform === "all" ? "Todas" : STREAMING_PLATFORMS.find(p => p.value === platform)?.label || platform;
  const badge = loading
    ? "Cargando…"
    : platform !== "all"
    ? `${filteredMovies.length} en ${platformLabel}`
    : searchQuery
    ? `${filteredMovies.length} resultados`
    : `Página ${page} • ${allMovies.length} títulos`;

  return (
    <Section title="Películas" emoji="🎬" badge={badge}>
      <div className="flex flex-wrap gap-4 mb-2">
        <Chips options={MOVIE_FILTERS} value={type} onChange={handleTypeChange} />
        <Chips options={PLATFORM_FILTERS} value={platform} onChange={handlePlatformChange} />
      </div>
      <Pager page={page} onPageChange={setPage} maxPage={Math.ceil(totalPages / 3)} />

      {loading ? (
        <SkeletonGrid count={24} />
      ) : error ? (
        <div className="text-muted-foreground text-sm py-8 text-center">
          No se pudo cargar TMDB.
        </div>
      ) : filteredMovies.length === 0 && platform !== "all" ? (
        <div className="text-muted-foreground text-sm py-8 text-center">
          No hay películas de {platformLabel} agregadas. Agrega enlaces en el panel Admin.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {filteredMovies.map((movie) => {
            const link = mediaLinks.get(movie.id);
            return (
              <MediaCard 
                key={movie.id} 
                item={movie} 
                type="movie" 
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