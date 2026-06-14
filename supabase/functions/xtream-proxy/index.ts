import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const RAW_BASE = Deno.env.get('XTREAM_URL') || '';
const BASE = RAW_BASE.replace(/\/+$/, '');
const USER = Deno.env.get('XTREAM_USER') || '';
const PASS = Deno.env.get('XTREAM_PASS') || '';

const ACTION_MAP: Record<string, string> = {
  info: '',
  live_cats: 'get_live_categories',
  live: 'get_live_streams',
  vod_cats: 'get_vod_categories',
  vod: 'get_vod_streams',
  series_cats: 'get_series_categories',
  series: 'get_series',
  series_info: 'get_series_info',
  vod_info: 'get_vod_info',
};

function buildStreamUrl(type: string, id: string, ext = 'm3u8') {
  const u = encodeURIComponent(USER);
  const p = encodeURIComponent(PASS);
  if (type === 'live') return `${BASE}/live/${u}/${p}/${id}.m3u8`;
  if (type === 'movie') return `${BASE}/movie/${u}/${p}/${id}.${ext}`;
  if (type === 'series') return `${BASE}/series/${u}/${p}/${id}.${ext}`;
  return '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!BASE || !USER || !PASS) {
    return new Response(JSON.stringify({ error: 'XTREAM credentials missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'info';

    // Build playable stream URL
    if (action === 'play') {
      const type = url.searchParams.get('type') || 'live';
      const id = url.searchParams.get('id') || '';
      const ext = url.searchParams.get('ext') || 'm3u8';
      return new Response(JSON.stringify({ url: buildStreamUrl(type, id, ext) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const xtreamAction = ACTION_MAP[action];
    if (xtreamAction === undefined) {
      return new Response(JSON.stringify({ error: 'invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const params = new URLSearchParams({ username: USER, password: PASS });
    if (xtreamAction) params.set('action', xtreamAction);

    const categoryId = url.searchParams.get('category_id');
    if (categoryId) params.set('category_id', categoryId);

    const id = url.searchParams.get('id');
    if (id) {
      if (action === 'series_info') params.set('series_id', id);
      else if (action === 'vod_info') params.set('vod_id', id);
    }

    const apiUrl = `${BASE}/player_api.php?${params.toString()}`;
    const r = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FluxoIPTV/1.0)' },
    });
    const text = await r.text();
    return new Response(text, {
      status: r.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
