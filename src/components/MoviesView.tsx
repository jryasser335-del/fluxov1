import { useState, useEffect, useMemo } from "react";
import { fetchTMDB, TMDBResult } from "@/lib/api";
import { Section } from "./Section";
import { Chips } from "./Chips";
import { Pager } from "./Pager";
import { MediaCard } from "./MediaCard";
import { SkeletonGrid } from "./Skeleton";

const MOVIE_FILTERS = [
  { value: "popular", label: "Popular" },
  { value: "top_rated", label: "Top" },
  { value: "now_playing", label: "Reciente" },
  { value: "upcoming", label: "Próximas" },
];

interface MoviesViewProps {
  searchQuery: string;
}

export function MoviesView({ searchQuery }: MoviesViewProps) {
  const [type, setType] = useState("popular");
  const [page, setPage] = useState(1);
  const [movies, setMovies] = useState<TMDBResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchTMDB(`movie/${type}?page=${page}`)
      .then((data) => {
        if (!cancelled) {
          setMovies(data.results.slice(0, 24));
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

  // Filter by search
  const filteredMovies = useMemo(() => {
    if (!searchQuery.trim()) return movies;
    const q = searchQuery.toLowerCase();
    return movies.filter((m) => (m.title || "").toLowerCase().includes(q));
  }, [movies, searchQuery]);

  const badge = loading
    ? "Cargando…"
    : searchQuery
    ? `${filteredMovies.length} resultados`
    : `Página ${page}/20 • ${filteredMovies.length} títulos`;

  return (
    <Section title="Películas" emoji="🎬" badge={badge}>
      <Chips options={MOVIE_FILTERS} value={type} onChange={handleTypeChange} />
      <Pager page={page} onPageChange={setPage} />

      {loading ? (
        <SkeletonGrid count={12} />
      ) : error ? (
        <div className="text-muted-foreground text-sm py-8 text-center">
          No se pudo cargar TMDB.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {filteredMovies.map((movie) => (
            <MediaCard key={movie.id} item={movie} type="movie" />
          ))}
        </div>
      )}
    </Section>
  );
}
