// Server-side authentication for app users.
// All credential verification happens here using the service role key,
// so password hashes are never exposed to the client.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Must match legacy hashing scheme so existing accounts keep working.
async function legacyHash(password: string): Promise<string> {
  const data = new TextEncoder().encode(password + "fluxo_salt_2024");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Constant-time string comparison
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function newToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function handleLogin(body: { username?: unknown; password?: unknown }) {
  const start = Date.now();
  const username = typeof body.username === "string" ? body.username.toLowerCase().trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  // Always do roughly the same amount of work to mitigate user enumeration / timing attacks
  const hash = await legacyHash(password);

  let userRow: {
    id: string; username: string; display_name: string | null;
    expires_at: string; is_active: boolean; password_hash: string;
  } | null = null;

  if (username.length >= 1 && username.length <= 64 && password.length >= 1 && password.length <= 200) {
    const { data } = await admin
      .from("app_users")
      .select("id, username, display_name, expires_at, is_active, password_hash")
      .eq("username", username)
      .maybeSingle();
    userRow = data ?? null;
  }

  // Always compare hashes (dummy compare on missing user)
  const stored = userRow?.password_hash ?? "0".repeat(64);
  const passwordOk = safeEqual(hash, stored);

  const now = new Date();
  const valid =
    !!userRow &&
    passwordOk &&
    userRow.is_active &&
    new Date(userRow.expires_at) > now;

  // Pad response time to ~500ms to flatten timing differences
  const elapsed = Date.now() - start;
  if (elapsed < 500) await new Promise((r) => setTimeout(r, 500 - elapsed));

  if (!valid || !userRow) {
    return json(401, { error: "Credenciales inválidas" });
  }

  // Create server-side session
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const { error: insErr } = await admin.from("app_user_sessions").insert({
    user_id: userRow.id,
    token,
    expires_at: expiresAt,
  });
  if (insErr) {
    console.error("session insert error", insErr);
    return json(500, { error: "No se pudo iniciar sesión" });
  }

  return json(200, {
    token,
    user: {
      id: userRow.id,
      username: userRow.username,
      display_name: userRow.display_name,
      expires_at: userRow.expires_at,
      is_active: userRow.is_active,
    },
  });
}

async function handleSession(body: { token?: unknown }) {
  const token = typeof body.token === "string" ? body.token : "";
  if (token.length !== 64) return json(401, { error: "Invalid session" });

  const { data: sess } = await admin
    .from("app_user_sessions")
    .select("user_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!sess) return json(401, { error: "Invalid session" });
  if (new Date(sess.expires_at) <= new Date()) {
    await admin.from("app_user_sessions").delete().eq("token", token);
    return json(401, { error: "Session expired" });
  }

  const { data: user } = await admin
    .from("app_users")
    .select("id, username, display_name, expires_at, is_active")
    .eq("id", sess.user_id)
    .maybeSingle();

  if (!user || !user.is_active || new Date(user.expires_at) <= new Date()) {
    return json(401, { error: "Access revoked" });
  }

  return json(200, { user });
}

async function handleLogout(body: { token?: unknown }) {
  const token = typeof body.token === "string" ? body.token : "";
  if (token.length === 64) {
    await admin.from("app_user_sessions").delete().eq("token", token);
  }
  return json(200, { ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const action = typeof body.action === "string" ? body.action : "";
  try {
    if (action === "login") return await handleLogin(body as { username?: unknown; password?: unknown });
    if (action === "session") return await handleSession(body as { token?: unknown });
    if (action === "logout") return await handleLogout(body as { token?: unknown });
    return json(400, { error: "Unknown action" });
  } catch (e) {
    console.error("app-auth error", e);
    return json(500, { error: "Internal error" });
  }
});
