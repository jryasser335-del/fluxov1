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
  const [movies, setMovies] = useState<TMDBResult[]>([]);
  const [mediaLinks, setMediaLinks] = useState<Map<number, MediaLink>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchTMDB(`movie/${type}?page=${page}`)
      .then((data) => {
        if (!cancelled) {
          setMovies(data.results);
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
  const filteredMovies = useMemo(() => {
    let result = movies;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((m) => (m.title || "").toLowerCase().includes(q));
    }
    
    // Filter by platform
    if (platform !== "all") {
      result = result.filter((m) => {
        const link = mediaLinks.get(m.id);
        return link?.platform === platform;
      });
    }
    
    return result;
  }, [movies, searchQuery, platform, mediaLinks]);

  const badge = loading
    ? "Cargando…"
    : searchQuery || platform !== "all"
    ? `${filteredMovies.length} resultados`
    : `Página ${page}/20 • ${filteredMovies.length} títulos`;

  return (
    <Section title="Películas" emoji="🎬" badge={badge}>
      <div className="flex flex-wrap gap-4 mb-2">
        <Chips options={MOVIE_FILTERS} value={type} onChange={handleTypeChange} />
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
