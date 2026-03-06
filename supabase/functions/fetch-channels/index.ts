import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IPTV_ORG_API = "https://iptv-org.github.io/api/";
const IPSTREET_M3U_URL = "https://raw.githubusercontent.com/ipstreet312/freeiptv/master/all.m3u";
const TV_GARDEN_COUNTRIES_URL = "https://raw.githubusercontent.com/famelack/famelack-channels/main/channels/raw/countries_metadata.json";
const TV_GARDEN_BASE = "https://raw.githubusercontent.com/famelack/famelack-channels/main/channels/raw/countries/";

interface Channel {
  name: string;
  logo: string | null;
  stream_url: string;
  category: string;
  country: string;
  source: string;
}

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response;
  } catch {
    return null;
  }
}

// ── 24/7 Channels from PPV.to ──
async function fetch247Channels(): Promise<Channel[]> {
  const channels: Channel[] = [];
  for (const url of ["https://api.ppv.to/api/streams", "https://api.ppv.land/api/streams"]) {
    try {
      const response = await fetchWithTimeout(url);
      if (!response?.ok) continue;
      const data = await response.json();
      if (!data.success || !data.streams) continue;

      for (const category of data.streams) {
        for (const stream of category.streams || []) {
          if (!stream.name || !stream.iframe || !stream.always_live) continue;
          channels.push({
            name: stream.name,
            logo: stream.poster || stream.logo || null,
            stream_url: stream.iframe,
            category: (category.category || "General").toLowerCase(),
            country: "",
            source: "ppv247",
          });
        }
      }
      if (channels.length > 0) break;
    } catch { continue; }
  }
  console.log(`PPV 24/7: Found ${channels.length} channels`);
  return channels;
}

// ── IPTV-ORG Channels ──
async function fetchIptvOrg(): Promise<Channel[]> {
  const channels: Channel[] = [];
  try {
    const [chRes, stRes] = await Promise.all([
      fetchWithTimeout(`${IPTV_ORG_API}channels.json`),
      fetchWithTimeout(`${IPTV_ORG_API}streams.json`),
    ]);
    if (!chRes?.ok || !stRes?.ok) return [];

    const allChannels = await chRes.json();
    const allStreams = await stRes.json();

    // Index streams by channel id
    const streamMap = new Map<string, string>();
    for (const s of allStreams) {
      if (s.channel && s.url && !streamMap.has(s.channel)) {
        streamMap.set(s.channel, s.url);
      }
    }

    // Only include channels that have a stream
    for (const ch of allChannels) {
      const url = streamMap.get(ch.id);
      if (!url) continue;
      channels.push({
        name: ch.name || ch.id,
        logo: ch.logo || null,
        stream_url: url,
        category: (ch.categories?.[0] || "general").toLowerCase(),
        country: (ch.country || "").toUpperCase(),
        source: "iptv-org",
      });
    }
    console.log(`IPTV-ORG: Found ${channels.length} channels`);
  } catch (e) {
    console.error("IPTV-ORG failed:", e);
  }
  return channels;
}

// ── IPStreet M3U Channels ──
async function fetchIpstreet(): Promise<Channel[]> {
  const channels: Channel[] = [];
  try {
    const response = await fetchWithTimeout(IPSTREET_M3U_URL, 12000);
    if (!response?.ok) return [];
    const text = await response.text();
    const lines = text.split("\n");
    let current: Partial<Channel> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#EXTINF:")) {
        const nameMatch = trimmed.match(/,(.+)$/);
        const logoMatch = trimmed.match(/tvg-logo="([^"]+)"/);
        const groupMatch = trimmed.match(/group-title="([^"]+)"/);
        current = {
          name: nameMatch?.[1]?.trim() || "Unknown",
          logo: logoMatch?.[1] || null,
          category: (groupMatch?.[1] || "general").toLowerCase(),
          country: "",
          source: "ipstreet",
        };
      } else if (trimmed && !trimmed.startsWith("#") && current) {
        channels.push({ ...current, stream_url: trimmed } as Channel);
        current = null;
      }
    }
    console.log(`IPStreet: Found ${channels.length} channels`);
  } catch (e) {
    console.error("IPStreet failed:", e);
  }
  return channels;
}

// ── TV Garden (top countries only) ──
async function fetchTvGarden(): Promise<Channel[]> {
  const channels: Channel[] = [];
  try {
    const metaRes = await fetchWithTimeout(TV_GARDEN_COUNTRIES_URL);
    if (!metaRes?.ok) return [];
    const countries = await metaRes.json();

    // Get ALL countries with channels
    const allCountryCodes = Object.entries(countries as Record<string, any>)
      .filter(([, v]: [string, any]) => v.hasChannels)
      .map(([code]) => code);

    const promises = allCountryCodes.map(async (code) => {
      try {
        const res = await fetchWithTimeout(`${TV_GARDEN_BASE}${code.toLowerCase()}.json`, 6000);
        if (!res?.ok) return [];
        const data = await res.json();
        return (data as any[]).map((ch: any) => ({
          name: ch.name || "Unknown",
          logo: ch.logo || null,
          stream_url: (ch.iptv_urls?.[0] || ch.youtube_urls?.[0] || "") as string,
          category: "general",
          country: code.toUpperCase(),
          source: "tvgarden",
        })).filter((c: Channel) => c.stream_url);
      } catch { return []; }
    });

    const results = await Promise.all(promises);
    channels.push(...results.flat());
    console.log(`TV Garden: Found ${channels.length} channels`);
  } catch (e) {
    console.error("TV Garden failed:", e);
  }
  return channels;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Support both GET params and POST body
    const url = new URL(req.url);
    let body: Record<string, any> = {};
    if (req.method === "POST") {
      try { body = await req.json() || {}; } catch { body = {}; }
    }
    const type = body.type || url.searchParams.get("type") || "all";
    const category = body.category || url.searchParams.get("category") || "";
    const country = body.country || url.searchParams.get("country") || "";
    const search = body.search || url.searchParams.get("search") || "";
    const limit = parseInt(body.limit || url.searchParams.get("limit") || "10000");
    const offset = parseInt(body.offset || url.searchParams.get("offset") || "0");

    let channels247: Channel[] = [];
    let channelsNormal: Channel[] = [];

    if (type === "247" || type === "all") {
      channels247 = await fetch247Channels();
    }

    if (type === "normal" || type === "all") {
      // Fetch from multiple sources in parallel
      const [iptvOrg, ipstreet, tvGarden] = await Promise.all([
        fetchIptvOrg(),
        fetchIpstreet(),
        fetchTvGarden(),
      ]);
      channelsNormal = [...iptvOrg, ...ipstreet, ...tvGarden];

      // Deduplicate by name (case-insensitive)
      const seen = new Set<string>();
      channelsNormal = channelsNormal.filter((ch) => {
        const key = ch.name.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    // Apply filters
    const filterChannels = (list: Channel[]) => {
      let filtered = list;
      if (category) {
        filtered = filtered.filter((ch) => ch.category.includes(category.toLowerCase()));
      }
      if (country) {
        filtered = filtered.filter((ch) => ch.country.toUpperCase() === country.toUpperCase());
      }
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter((ch) => ch.name.toLowerCase().includes(q));
      }
      return filtered;
    };

    const filtered247 = filterChannels(channels247);
    const filteredNormal = filterChannels(channelsNormal);

    return new Response(
      JSON.stringify({
        success: true,
        channels_247: filtered247.slice(offset, offset + limit),
        channels_normal: filteredNormal.slice(offset, offset + limit),
        total_247: filtered247.length,
        total_normal: filteredNormal.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Fetch channels error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
