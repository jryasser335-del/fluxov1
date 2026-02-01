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

const LANG_FILTERS = [
  { value: "ko", label: "K-Drama" },
  { value: "ja", label: "J-Drama" },
  { value: "zh", label: "C-Drama" },
];

const TYPE_FILTERS = [
  { value: "trending", label: "Tendencias" },
  { value: "top", label: "Top" },
];

const PLATFORM_FILTERS = [
  { value: "all", label: "Todas" },
  ...STREAMING_PLATFORMS.map((p) => ({ value: p.value, label: p.label })),
];

interface DoramasViewProps {
  searchQuery: string;
}

export function DoramasView({ searchQuery }: DoramasViewProps) {
  const [lang, setLang] = useState("ko");
  const [type, setType] = useState("trending");
  const [platform, setPlatform] = useState("all");
  const [page, setPage] = useState(1);
  const [doramas, setDoramas] = useState<TMDBResult[]>([]);
  const [mediaLinks, setMediaLinks] = useState<Map<number, MediaLink>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fetch media links from database
  useEffect(() => {
    supabase
      .from("media_links")
      .select("tmdb_id, stream_url, platform")
      .eq("media_type", "dorama")
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

  const handlePlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform);
    setPage(1);
  };

  // Filter by search and platform
  const filteredDoramas = useMemo(() => {
    let result = doramas;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) => (d.name || "").toLowerCase().includes(q));
    }
    
    if (platform !== "all") {
      result = result.filter((d) => {
        const link = mediaLinks.get(d.id);
        return link?.platform === platform;
      });
    }
    
    return result;
  }, [doramas, searchQuery, platform, mediaLinks]);

  const langName = lang === "ko" ? "K-Drama" : lang === "ja" ? "J-Drama" : "C-Drama";
  const typeName = type === "top" ? "Top" : "Tendencias";
  const badge = loading
    ? "Cargando…"
    : searchQuery || platform !== "all"
    ? `${filteredDoramas.length} resultados`
    : `${langName} • ${typeName} • Página ${page}/20`;

  return (
    <Section title="Doramas" emoji="🎎" badge={badge}>
      <div className="flex flex-wrap gap-4 mb-2">
        <Chips options={LANG_FILTERS} value={lang} onChange={handleLangChange} />
        <Chips options={TYPE_FILTERS} value={type} onChange={handleTypeChange} />
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
          {filteredDoramas.map((d) => {
            const link = mediaLinks.get(d.id);
            return (
              <MediaCard 
                key={d.id} 
                item={d} 
                type="dorama" 
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
