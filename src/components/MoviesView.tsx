import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { fetchTMDB, TMDBResult } from "@/lib/api";
import { TMDB_IMG } from "@/lib/constants";
import { Chips } from "./Chips";
import { MediaCard } from "./MediaCard";
import { SkeletonGrid } from "./Skeleton";
import { STREAMING_PLATFORMS, type PlatformValue } from "@/lib/platforms";
import { DEFAULT_WATCH_REGION, getWatchProviderIdForPlatform } from "@/lib/tmdbWatchProviders";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { Loader2, ChevronLeft, ChevronRight, Play, Star, Calendar, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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

// ── Hero Banner ──
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
    <div className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] rounded-2xl overflow-hidden mb-8 group">
      {/* Backdrop */}
      {backdrop && (
        <img
          src={backdrop}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-105"
        />
      )}

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#080808]/80 via-transparent to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 md:p-14 z-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight leading-none mb-4 drop-shadow-2xl" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          {title}
        </h1>

        <div className="flex items-center gap-3 mb-4">
          {rating && parseFloat(rating) > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-sm font-bold">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-yellow-400">{rating}/10</span>
            </span>
          )}
          {year && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-sm font-medium text-white/80">
              <Calendar className="w-4 h-4" />
              {year}
            </span>
          )}
        </div>

        {movie.overview && (
          <p className="text-sm sm:text-base text-white/70 max-w-xl line-clamp-3 mb-6 leading-relaxed">
            {movie.overview}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handlePlay}
            className="flex items-center gap-2.5 px-7 py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95"
          >
            <Play className="w-5 h-5 fill-black" />
            Play
          </button>
          <button className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-white/10 backdrop-blur-md text-white font-medium text-sm border border-white/10 hover:bg-white/20 transition-all">
            <Info className="w-5 h-5" />
            See More
          </button>
        </div>
      </div>

      {/* Dots navigation */}
      {featured.length > 1 && (
        <div className="absolute bottom-4 right-6 sm:right-10 flex items-center gap-1.5 z-20">
          {featured.map((_, i) => (
            <button
              key={i}
              onClick={() => { setActiveIndex(i); clearInterval(intervalRef.current); }}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === activeIndex ? "w-8 bg-white" : "w-1.5 bg-white/30 hover:bg-white/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Movie Carousel (cinezo-style) ──
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
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white/70" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-white/70" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {movies.map((movie) => {
          const link = mediaLinks.get(movie.id);
          const streamUrl = link?.stream_url || getCinezoEmbedUrl(movie.id);
          return (
            <div key={movie.id} className="flex-shrink-0 w-[150px] sm:w-[170px]">
              <MediaCard
                item={movie}
                type="movie"
                streamUrl={streamUrl}
                platform={link?.platform || "cinezo"}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Top 10 List ──
function Top10List({ movies, mediaLinks }: { movies: TMDBResult[]; mediaLinks: Map<number, MediaLink> }) {
  const { openPlayer } = usePlayerModal();
  const top10 = movies.slice(0, 10);

  if (top10.length === 0) return null;

  return (
    <div className="mb-10">
      <h3 className="text-xl font-bold text-white mb-4 px-1">TOP 10</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {top10.map((movie, i) => {
          const title = movie.title || movie.name || "";
          const link = mediaLinks.get(movie.id);
          const streamUrl = link?.stream_url || getCinezoEmbedUrl(movie.id);
          const poster = movie.poster_path ? `${TMDB_IMG}${movie.poster_path}` : "";

          return (
            <button
              key={movie.id}
              onClick={() => openPlayer(title, { url1: streamUrl }, "movie")}
              className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] transition-all group text-left"
            >
              <span className="text-3xl font-black text-white/20 w-8 text-center" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                {i + 1}
              </span>
              {poster && (
                <img src={poster} alt={title} className="w-12 h-16 rounded-lg object-cover flex-shrink-0" loading="lazy" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate group-hover:text-primary transition-colors">{title}</p>
                <p className="text-xs text-white/40">
                  {movie.vote_average ? `⭐ ${movie.vote_average.toFixed(1)}` : ""}
                </p>
              </div>
              <Play className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ──
export function MoviesView({ searchQuery }: MoviesViewProps) {
  const [type, setType] = useState("popular");
  const [platform, setPlatform] = useState<"all" | PlatformValue>("all");
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
    const watchRegion = DEFAULT_WATCH_REGION;
    const providerId = platform === "all" ? null : await getWatchProviderIdForPlatform({ mediaType: "movie", platform, region: watchRegion });

    let basePath = "discover/movie?include_adult=false&include_video=false";
    if (type === "popular") basePath += "&sort_by=popularity.desc";
    else if (type === "top_rated") basePath += "&sort_by=vote_average.desc&vote_count.gte=200";
    else if (type === "now_playing") basePath += `&sort_by=primary_release_date.desc&primary_release_date.lte=${today}`;
    else if (type === "upcoming") basePath += `&sort_by=primary_release_date.asc&primary_release_date.gte=${today}`;

    if (providerId) basePath += `&with_watch_providers=${providerId}&watch_region=${watchRegion}&with_watch_monetization_types=flatrate`;
    else if (platform !== "all") return null;

    return basePath;
  }, [type, platform]);

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
  }, [type, platform, buildBasePath]);

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
      {/* No filters - clean cinezo-style layout */}

      {loading ? (
        <SkeletonGrid count={24} />
      ) : error ? (
        <div className="text-muted-foreground text-sm py-8 text-center">No se pudo cargar TMDB.</div>
      ) : isSearching ? (
        <div>
          <h3 className="text-lg font-bold text-white mb-4">🔍 Resultados ({filteredMovies.length})</h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {filteredMovies.map((movie) => {
              const link = mediaLinks.get(movie.id);
              const streamUrl = link?.stream_url || getCinezoEmbedUrl(movie.id);
              return <MediaCard key={movie.id} item={movie} type="movie" streamUrl={streamUrl} platform={link?.platform || "cinezo"} />;
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Hero Banner */}
          <HeroBanner movies={trendingMovies} mediaLinks={mediaLinks} />

          {/* Top 10 */}
          <Top10List movies={trendingMovies} mediaLinks={mediaLinks} />

          {/* Trending carousel */}
          <MovieCarousel title="Trending movies" movies={trendingMovies} mediaLinks={mediaLinks} />

          {/* Top Rated carousel */}
          <MovieCarousel title="Top rated movies" movies={topRatedMovies} mediaLinks={mediaLinks} />

          {/* New Releases */}
          <MovieCarousel title="Nuevos Estrenos" movies={filteredMovies.slice(0, 20)} mediaLinks={mediaLinks} />

          {/* All movies grid */}
          <div className="mt-8">
            <h3 className="text-xl font-bold text-white mb-4 px-1">Todas las Películas</h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              {filteredMovies.slice(20).map((movie) => {
                const link = mediaLinks.get(movie.id);
                const streamUrl = link?.stream_url || getCinezoEmbedUrl(movie.id);
                return <MediaCard key={movie.id} item={movie} type="movie" streamUrl={streamUrl} platform={link?.platform || "cinezo"} />;
              })}
            </div>

            <div ref={sentinelRef} className="h-4" />

            {loadingMore && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            {!hasMore && filteredMovies.length > 0 && (
              <div className="text-center text-muted-foreground text-sm py-6">Has llegado al final del catálogo</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
