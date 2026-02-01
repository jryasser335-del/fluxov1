import { useState, useEffect, useMemo } from "react";
import { fetchTMDB, TMDBResult } from "@/lib/api";
import { Section } from "./Section";
import { Chips } from "./Chips";
import { Pager } from "./Pager";
import { MediaCard } from "./MediaCard";
import { SkeletonGrid } from "./Skeleton";

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
  const [series, setSeries] = useState<TMDBResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchTMDB(`tv/${type}?page=${page}`)
      .then((data) => {
        if (!cancelled) {
          setSeries(data.results.slice(0, 24));
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
  const filteredSeries = useMemo(() => {
    if (!searchQuery.trim()) return series;
    const q = searchQuery.toLowerCase();
    return series.filter((s) => (s.name || "").toLowerCase().includes(q));
  }, [series, searchQuery]);

  const badge = loading
    ? "Cargando…"
    : searchQuery
    ? `${filteredSeries.length} resultados`
    : `Página ${page}/20 • ${filteredSeries.length} títulos`;

  return (
    <Section title="Series" emoji="📺" badge={badge}>
      <Chips options={SERIES_FILTERS} value={type} onChange={handleTypeChange} />
      <Pager page={page} onPageChange={setPage} />

      {loading ? (
        <SkeletonGrid count={12} />
      ) : error ? (
        <div className="text-muted-foreground text-sm py-8 text-center">
          No se pudo cargar TMDB.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {filteredSeries.map((s) => (
            <MediaCard key={s.id} item={s} type="series" />
          ))}
        </div>
      )}
    </Section>
  );
}
