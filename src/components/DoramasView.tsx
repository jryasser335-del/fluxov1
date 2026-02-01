import { useState, useEffect, useMemo } from "react";
import { fetchTMDB, TMDBResult } from "@/lib/api";
import { Section } from "./Section";
import { Chips } from "./Chips";
import { Pager } from "./Pager";
import { MediaCard } from "./MediaCard";
import { SkeletonGrid } from "./Skeleton";

const LANG_FILTERS = [
  { value: "ko", label: "K-Drama" },
  { value: "ja", label: "J-Drama" },
  { value: "zh", label: "C-Drama" },
];

const TYPE_FILTERS = [
  { value: "trending", label: "Tendencias" },
  { value: "top", label: "Top" },
];

interface DoramasViewProps {
  searchQuery: string;
}

export function DoramasView({ searchQuery }: DoramasViewProps) {
  const [lang, setLang] = useState("ko");
  const [type, setType] = useState("trending");
  const [page, setPage] = useState(1);
  const [doramas, setDoramas] = useState<TMDBResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    const path =
      type === "top"
        ? `discover/tv?with_original_language=${lang}&sort_by=vote_average.desc&vote_count.gte=200&page=${page}`
        : `discover/tv?with_original_language=${lang}&sort_by=popularity.desc&page=${page}`;

    fetchTMDB(path)
      .then((data) => {
        if (!cancelled) {
          setDoramas(data.results);
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
  }, [lang, type, page]);

  const handleLangChange = (newLang: string) => {
    setLang(newLang);
    setPage(1);
  };

  const handleTypeChange = (newType: string) => {
    setType(newType);
    setPage(1);
  };

  // Filter by search
  const filteredDoramas = useMemo(() => {
    if (!searchQuery.trim()) return doramas;
    const q = searchQuery.toLowerCase();
    return doramas.filter((d) => (d.name || "").toLowerCase().includes(q));
  }, [doramas, searchQuery]);

  const langName = lang === "ko" ? "K-Drama" : lang === "ja" ? "J-Drama" : "C-Drama";
  const typeName = type === "top" ? "Top" : "Tendencias";
  const badge = loading
    ? "Cargando…"
    : searchQuery
    ? `${filteredDoramas.length} resultados`
    : `${langName} • ${typeName} • Página ${page}/20`;

  return (
    <Section title="Doramas" emoji="🎎" badge={badge}>
      <div className="flex flex-wrap gap-4 mb-2">
        <Chips options={LANG_FILTERS} value={lang} onChange={handleLangChange} />
        <Chips options={TYPE_FILTERS} value={type} onChange={handleTypeChange} />
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
          {filteredDoramas.map((d) => (
            <MediaCard key={d.id} item={d} type="dorama" />
          ))}
        </div>
      )}
    </Section>
  );
}
