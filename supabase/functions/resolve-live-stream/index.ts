import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STREAMED_BASES = ["https://streamed.pk", "https://streamed.su"];

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function tokenize(name: string): string[] {
  const stopwords = new Set(["fc", "cf", "sc", "ac", "club", "the", "de", "la", "el", "vs", "v"]);
  return normalize(name).split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !stopwords.has(t));
}

function matchScore(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  return overlap / Math.max(ta.size, tb.size);
}

function buildLinks(urls: { url: string; source: string }[]) {
  return {
    url1: urls[0]?.url || null,
    url2: urls[1]?.url || null,
    url3: urls[2]?.url || null,
  };
}

function raceTimeout<T>(promise: Promise<T>, ms: number, label = ""): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((r) => setTimeout(() => { console.log(`⏱️ Timeout: ${label} (${ms}ms)`); r(null); }, ms)),
  ]);
}

async function fetchFast(url: string, timeoutMs = 2500): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = { "User-Agent": "Mozilla/5.0", Accept: "application/json" };
    if (url.includes("streamed.pk")) {
      headers.Origin = "https://streamed.pk";
      headers.Referer = "https://streamed.pk/";
    } else if (url.includes("streamed.su")) {
      headers.Origin = "https://streamed.su";
      headers.Referer = "https://streamed.su/";
    }

    const res = await fetch(url, {
      headers,
      signal: controller.signal,
    });
    clearTimeout(t);
    return res;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const t0 = Date.now();
  const respond = (body: any, status = 200) => {
    console.log(`✅ Response in ${Date.now() - t0}ms`);
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  };

  try {
    const { homeTeam, awayTeam, espnId, sport } = await req.json();
    if (!homeTeam || !awayTeam) return respond({ error: "homeTeam and awayTeam required" }, 400);

    console.log(`🔍 ${homeTeam} vs ${awayTeam}`);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // --- FAST PATH: DB lookup (2s max) ---
    const dbResult = await raceTimeout((async () => {
      // 1) By ESPN ID
      if (espnId) {
        const { data } = await supabase
          .from("events")
          .select("stream_url, stream_url_2, stream_url_3")
          .eq("espn_id", espnId)
          .not("stream_url", "is", null)
          .maybeSingle();
        if (data?.stream_url) return [
          { url: data.stream_url, source: "db" },
          ...(data.stream_url_2 ? [{ url: data.stream_url_2, source: "db" }] : []),
          ...(data.stream_url_3 ? [{ url: data.stream_url_3, source: "db" }] : []),
        ];
      }

      // 2) Fuzzy from scraped links
      const { data: scraped } = await supabase
        .from("live_scraped_links")
        .select("team_home, team_away, source_admin, source_delta, source_echo, source_golf")
        .limit(200);

      let best: any = null, bestScore = 0;
      for (const row of scraped || []) {
        if (!row.team_home || !row.team_away) continue;
        const d = (matchScore(homeTeam, row.team_home) + matchScore(awayTeam, row.team_away)) / 2;
        const s = (matchScore(homeTeam, row.team_away) + matchScore(awayTeam, row.team_home)) / 2;
        const sc = Math.max(d, s);
        if (sc > bestScore) { bestScore = sc; best = row; }
      }

      if (best && bestScore >= 0.55) {
        const urls: { url: string; source: string }[] = [];
        if (best.source_admin) urls.push({ url: best.source_admin, source: "scraped" });
        if (best.source_delta) urls.push({ url: best.source_delta, source: "scraped" });
        if (best.source_echo) urls.push({ url: best.source_echo, source: "scraped" });
        if (best.source_golf) urls.push({ url: best.source_golf, source: "scraped" });
        if (urls.length) return urls;
      }
      return null;
    })(), 2000, "DB lookup");

    if (dbResult && dbResult.length > 0) {
      console.log(`📦 DB hit: ${dbResult.length} links`);
      return respond({ success: true, links: buildLinks(dbResult), fast: true });
    }

    // --- SLOW PATH: External APIs (5s max total) ---
    const externalResult = await raceTimeout(Promise.all([
      // PPV.to
      (async (): Promise<{ url: string; source: string } | null> => {
        for (const apiUrl of ["https://api.ppv.to/api/streams", "https://api.ppv.land/api/streams"]) {
          const res = await fetchFast(apiUrl, 2500);
          if (!res?.ok) continue;
          const data = await res.json();
          if (!data.success || !data.streams) continue;
          let bestUrl: string | null = null, bestScore = 0;
          for (const cat of data.streams) {
            for (const s of cat.streams || []) {
              if (!s.name || !s.iframe || s.always_live) continue;
              const sc = (matchScore(homeTeam, s.name) + matchScore(awayTeam, s.name)) / 2;
              if (sc > bestScore) { bestScore = sc; bestUrl = s.iframe; }
            }
          }
          if (bestUrl && bestScore >= 0.3) return { url: bestUrl, source: "ppv" };
        }
        return null;
      })(),
      // Streamed
      (async (): Promise<{ url: string; source: string }[]> => {
        for (const base of STREAMED_BASES) {
          // Streamed base-specific match endpoints
          const matchEndpoints = base.includes("streamed.pk")
            ? ["/api/matches/football", "/api/matches/all-today", "/api/matches/live", "/api/matches/live/popular"]
            : ["/api/matches/all", "/api/matches/all-today", "/api/matches/football", "/api/matches/live"];

          let matches: any[] = [];
          for (const ep of matchEndpoints) {
            const res = await fetchFast(`${base}${ep}`, 2500);
            if (!res?.ok) continue;
            try {
              const data = await res.json();
              if (Array.isArray(data) && data.length) {
                matches = data;
                break;
              }
            } catch {
              // ignore
            }
          }
          if (!matches.length) continue;

          let bestMatch: any = null, bestScore = 0;
          for (const m of matches) {
            const mH = m.teams?.home?.name || "", mA = m.teams?.away?.name || "";
            if (!mH || !mA) continue;
            const sc = Math.max(
              (matchScore(homeTeam, mH) + matchScore(awayTeam, mA)) / 2,
              (matchScore(homeTeam, mA) + matchScore(awayTeam, mH)) / 2,
            );
            if (sc > bestScore) { bestScore = sc; bestMatch = m; }
          }

          if (bestMatch && bestScore >= 0.5) {
            const hdSrcs = ["delta", "echo", "alpha", "bravo", "charlie"];
            const srcs = (bestMatch.sources || []).filter((s: any) => hdSrcs.includes(s.source)).slice(0, 3);
            const urls: { url: string; source: string }[] = [];

            await Promise.all(srcs.map(async (src: any) => {
              const r = await fetchFast(`${base}/api/stream/${src.source}/${src.id}`, 2500);
              if (!r?.ok) return;
              let streams: any = null;
              try {
                streams = await r.json();
              } catch {
                return;
              }
              if (Array.isArray(streams) && streams.length) {
                const hd = streams.find((s: any) => s?.hd) || streams[0];
                const embed = hd?.embedUrl ?? hd?.embed_url ?? hd?.url;
                if (embed) urls.push({ url: String(embed), source: "streamed" });
              }
            }));

            return urls;
          }
        }
        return [];
      })(),
    ]), 5000, "External APIs");

    const allUrls: { url: string; source: string }[] = [];
    if (externalResult) {
      const [ppv, streamed] = externalResult;
      if (ppv) allUrls.push(ppv);
      for (const u of streamed) allUrls.push(u);
    }

    const links = buildLinks(allUrls);
    console.log(`🌐 External: ${allUrls.length} links found`);

    // Save to DB (fire-and-forget)
    if (links.url1 && espnId) {
      const payload = {
        stream_url: links.url1,
        stream_url_2: links.url2,
        stream_url_3: links.url3,
        pending_url: links.url1,
        is_live: true,
        is_active: true,
      };
      supabase.from("events").select("id").eq("espn_id", espnId).maybeSingle().then(({ data: existing }) => {
        if (existing?.id) {
          supabase.from("events").update(payload).eq("id", existing.id).then(() => {});
        } else {
          supabase.from("events").insert({
            espn_id: espnId, name: `${homeTeam} vs ${awayTeam}`,
            team_home: homeTeam, team_away: awayTeam,
            sport: sport || "Other", event_date: new Date().toISOString(),
            ...payload,
          }).then(() => {});
        }
      });
    }

    return respond({ success: true, links, fast: false });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return respond({ success: false, error: error.message }, 500);
  }
});
