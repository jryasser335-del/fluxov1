import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { fetchTMDB, TMDBResult } from "@/lib/api";
import { TMDB_IMG } from "@/lib/constants";
import { MediaCard } from "./MediaCard";
import { SkeletonGrid } from "./Skeleton";
import { STREAMING_PLATFORMS, type PlatformValue } from "@/lib/platforms";
import { DEFAULT_WATCH_REGION, getWatchProviderIdForPlatform } from "@/lib/tmdbWatchProviders";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { Loader2, ChevronLeft, ChevronRight, Play, Star, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MediaLink {
  tmdb_id: number;
  stream_url: string;
  platform: string | null;
}

interface MoviesViewProps {
  searchQuery: string;
}

function getCinezoEmbedUrl(tmdbId: number): string {
  return `https://www.cinezo.net/movie/${tmdbId}`;
}

// ── Premium Hero Banner ──
function HeroBanner({ movies, mediaLinks }: { movies: TMDBResult[]; mediaLinks: Map<number, MediaLink> }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { openPlayer } = usePlayerModal();
  const intervalRef = useRef<NodeJS.Timeout>();

  const featured = movies.slice(0, 8);

  useEffect(() => {
    if (featured.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % featured.length);
    }, 6000);
    return () => clearInterval(intervalRef.current);
  }, [featured.length]);

  if (featured.length === 0) return null;

  const movie = featured[activeIndex];
  const title = movie.title || movie.name || "";
  const year = (movie.release_date || movie.first_air_date || "").slice(0, 4);
  const rating = movie.vote_average?.toFixed(1);
  const backdrop = movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : "";

  const handlePlay = () => {
    const link = mediaLinks.get(movie.id);
    const url = link?.stream_url || getCinezoEmbedUrl(movie.id);
    openPlayer(title, { url1: url }, "movie");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative w-full h-[45vh] sm:h-[55vh] md:h-[65vh] rounded-2xl overflow-hidden mb-8 group"
    >
      {/* Backdrop with smooth transition */}
      {backdrop && (
        <motion.img
          key={activeIndex}
          src={backdrop}
          alt={title}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Premium gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_hsl(215_100%_55%/0.08)_0%,_transparent_60%)]" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 md:p-12 z-10">
        <motion.div
          key={`title-${activeIndex}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white uppercase tracking-wider leading-none mb-4 drop-shadow-2xl">
            {title}
          </h1>

          <div className="flex items-center gap-2.5 mb-4">
            {rating && parseFloat(rating) > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/[0.08] text-sm font-semibold">
                <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                <span className="text-warning">{rating}</span>
              </span>
            )}
            {year && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/[0.08] text-sm font-medium text-white/70">
                <Calendar className="w-3.5 h-3.5" />
                {year}
              </span>
            )}
          </div>

          {movie.overview && (
            <p className="text-sm sm:text-base text-white/60 max-w-xl line-clamp-2 mb-5 leading-relaxed">
              {movie.overview}
            </p>
          )}

          <button
            onClick={handlePlay}
            className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:scale-105 active:scale-95"
          >
            <Play className="w-5 h-5 fill-current" />
            Reproducir
          </button>
        </motion.div>
      </div>

      {/* Dots navigation */}
      {featured.length > 1 && (
        <div className="absolute bottom-5 right-5 sm:right-8 flex items-center gap-1.5 z-20">
          {featured.map((_, i) => (
            <button
              key={i}
              onClick={() => { setActiveIndex(i); clearInterval(intervalRef.current); }}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === activeIndex ? "w-6 bg-primary" : "w-1.5 bg-white/20 hover:bg-white/40"
              )}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Premium Movie Carousel ──
function MovieCarousel({
  title,
  movies,
  mediaLinks,
}: {
  title: string;
  movies: TMDBResult[];
  mediaLinks: Map<number, MediaLink>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -400 : 400,
        behavior: "smooth",
      });
    }
  };

  if (movies.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => scroll("left")}
            className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08] hover:border-white/[0.1] transition-all"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08] hover:border-white/[0.1] transition-all"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scroll-smooth pb-2 scrollbar-hide"
      >
        {movies.map((movie, idx) => {
          const link = mediaLinks.get(movie.id);
          const streamUrl = link?.stream_url || getCinezoEmbedUrl(movie.id);
          return (
            <motion.div 
              key={movie.id} 
              className="flex-shrink-0 w-[140px] sm:w-[160px]"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.3 }}
            >
              <MediaCard
                item={movie}
                type="movie"
                streamUrl={streamUrl}
                platform={link?.platform || "cinezo"}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Premium Top 10 List ──
function Top10List({ movies, mediaLinks }: { movies: TMDBResult[]; mediaLinks: Map<number, MediaLink> }) {
  const { openPlayer } = usePlayerModal();
  const top10 = movies.slice(0, 10);

  if (top10.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-foreground mb-4 px-1 flex items-center gap-2">
        <span className="font-display text-primary tracking-wider">TOP 10</span>
        <span className="text-muted-foreground/60 text-sm font-normal">Esta semana</span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {top10.map((movie, i) => {
          const title = movie.title || movie.name || "";
          const link = mediaLinks.get(movie.id);
          const streamUrl = link?.stream_url || getCinezoEmbedUrl(movie.id);
          const poster = movie.poster_path ? `${TMDB_IMG}${movie.poster_path}` : "";

          return (
            <motion.button
              key={movie.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              onClick={() => openPlayer(title, { url1: streamUrl }, "movie")}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.06] hover:border-primary/20 transition-all group text-left"
            >
              <span className="font-display text-2xl text-white/10 w-7 text-center tracking-wider">
                {i + 1}
              </span>
              {poster && (
                <img src={poster} alt={title} className="w-10 h-14 rounded-lg object-cover flex-shrink-0 border border-white/[0.06]" loading="lazy" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground/90 truncate group-hover:text-primary transition-colors">{title}</p>
                <p className="text-xs text-muted-foreground/50 flex items-center gap-1">
                  {movie.vote_average ? (
                    <>
                      <Star className="w-3 h-3 fill-warning text-warning" />
                      {movie.vote_average.toFixed(1)}
                    </>
                  ) : ""}
                </p>
              </div>
              <Play className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors flex-shrink-0" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ──
export function MoviesView({ searchQuery }: MoviesViewProps) {
  const [page, setPage] = useState(1);
  const [allMovies, setAllMovies] = useState<TMDBResult[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<TMDBResult[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<TMDBResult[]>([]);
  const [mediaLinks, setMediaLinks] = useState<Map<number, MediaLink>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [totalPages, setTotalPages] = useState(500);
  const [hasMore, setHasMore] = useState(true);

  const buildBasePath = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    let basePath = "discover/movie?include_adult=false&include_video=false&sort_by=popularity.desc";
    return basePath;
  }, []);

  // Fetch media links
  useEffect(() => {
    const fetchMediaLinks = async () => {
      const { data } = await supabase.from("media_links").select("tmdb_id, stream_url, platform").eq("media_type", "movie").eq("is_active", true);
      if (data) {
        const linksMap = new Map<number, MediaLink>();
        data.forEach((link) => linksMap.set(link.tmdb_id, link));
        setMediaLinks(linksMap);
      }
    };
    fetchMediaLinks();
  }, []);

  // Fetch carousel data
  useEffect(() => {
    const fetchCarouselData = async () => {
      try {
        const [trending, topRated] = await Promise.all([
          fetchTMDB("trending/movie/week"),
          fetchTMDB("movie/top_rated"),
        ]);
        setTrendingMovies(trending.results?.slice(0, 20) || []);
        setTopRatedMovies(topRated.results?.slice(0, 20) || []);
      } catch (err) {
        console.error("Error fetching carousel data:", err);
      }
    };
    fetchCarouselData();
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setAllMovies([]);
    setPage(1);
    setHasMore(true);

    const fetchInitial = async () => {
      try {
        const basePath = await buildBasePath();
        if (basePath === null) {
          if (!cancelled) { setAllMovies([]); setTotalPages(1); setHasMore(false); setLoading(false); }
          return;
        }
        const pagesToFetch = [1, 2, 3, 4, 5];
        const results = await Promise.all(pagesToFetch.map((p) => fetchTMDB(`${basePath}&page=${p}`)));
        if (!cancelled) {
          const combined = results.flatMap((r) => r.results);
          const unique = Array.from(new Map(combined.map((m) => [m.id, m])).values());
          setAllMovies(unique);
          setTotalPages(Math.min(results[0]?.total_pages || 500, 500));
          setPage(5);
          setHasMore(5 < Math.min(results[0]?.total_pages || 500, 500));
          setLoading(false);
        }
      } catch {
        if (!cancelled) { setError(true); setLoading(false); }
      }
    };
    fetchInitial();
    return () => { cancelled = true; };
  }, [buildBasePath]);

  // Load more
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const basePath = await buildBasePath();
      if (!basePath) { setLoadingMore(false); return; }
      const nextPage = page + 1;
      const result = await fetchTMDB(`${basePath}&page=${nextPage}`);
      setAllMovies((prev) => {
        const combined = [...prev, ...result.results];
        return Array.from(new Map(combined.map((m) => [m.id, m])).values());
      });
      setPage(nextPage);
      setHasMore(nextPage < totalPages);
    } catch (err) {
      console.error("Error loading more:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [page, totalPages, hasMore, loadingMore, buildBasePath]);

  const { sentinelRef } = useInfiniteScroll({ hasMore, isLoading: loadingMore, onLoadMore: loadMore });

  const filteredMovies = useMemo(() => {
    let result = allMovies;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((m) => (m.title || "").toLowerCase().includes(q));
    }
    return result;
  }, [allMovies, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="space-y-2">
      {loading ? (
        <SkeletonGrid count={24} />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.04] flex items-center justify-center mb-4">
            <span className="text-3xl">🎬</span>
          </div>
          <p className="text-muted-foreground/60 text-sm">No se pudo cargar el catálogo</p>
        </div>
      ) : isSearching ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <span>Resultados</span>
            <span className="text-muted-foreground/50 text-sm font-normal">({filteredMovies.length})</span>
          </h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            {filteredMovies.map((movie, idx) => {
              const link = mediaLinks.get(movie.id);
              const streamUrl = link?.stream_url || getCinezoEmbedUrl(movie.id);
              return (
                <motion.div
                  key={movie.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02, duration: 0.3 }}
                >
                  <MediaCard item={movie} type="movie" streamUrl={streamUrl} platform={link?.platform || "cinezo"} />
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      ) : (
        <>
          {/* Hero Banner */}
          <HeroBanner movies={trendingMovies} mediaLinks={mediaLinks} />

          {/* Top 10 */}
          <Top10List movies={trendingMovies} mediaLinks={mediaLinks} />

          {/* Trending carousel */}
          <MovieCarousel title="🔥 Tendencias" movies={trendingMovies} mediaLinks={mediaLinks} />

          {/* Top Rated carousel */}
          <MovieCarousel title="⭐ Mejor valoradas" movies={topRatedMovies} mediaLinks={mediaLinks} />

          {/* New Releases */}
          <MovieCarousel title="✨ Nuevos Estrenos" movies={filteredMovies.slice(0, 20)} mediaLinks={mediaLinks} />

          {/* All movies grid */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-foreground mb-4 px-1">Catálogo Completo</h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
              {filteredMovies.slice(20).map((movie, idx) => {
                const link = mediaLinks.get(movie.id);
                const streamUrl = link?.stream_url || getCinezoEmbedUrl(movie.id);
                return (
                  <motion.div
                    key={movie.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.015, 0.3), duration: 0.3 }}
                  >
                    <MediaCard item={movie} type="movie" streamUrl={streamUrl} platform={link?.platform || "cinezo"} />
                  </motion.div>
                );
              })}
            </div>

            <div ref={sentinelRef} className="h-4" />

            {loadingMore && (
              <div className="flex justify-center py-8">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Cargando más...</span>
                </div>
              </div>
            )}

            {!hasMore && filteredMovies.length > 0 && (
              <div className="flex items-center justify-center pt-8 pb-2">
                <div className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.03] text-[11px] text-muted-foreground/30">
                  Has llegado al final del catálogo
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
