import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const ADMINS_URL =
  Deno.env.get("VINCI_NOTICE_ADMINS_URL") ||
  "https://raw.githubusercontent.com/VinciOrg/Vinci/main/notice-admins.json";

const allowedPositions = new Set([
  "top-left", "top-center", "top-right",
  "bottom-left", "bottom-center", "bottom-right"
]);
const allowedFonts = new Set(["system", "serif", "mono", "rounded", "elegant"]);
const allowedSizes = new Set(["small", "medium", "large"]);
const allowedAnimations = new Set(["slide", "fade", "scale", "none"]);
const allowedIcons = new Set(["info", "warning", "success", "maintenance", "none"]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders
  });
}

function normalizeUsername(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
}

function safeColor(value: unknown, fallback: string) {
  const text = String(value || "");
  return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
}

function numberBetween(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function safeUrl(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "";

  if (text.startsWith("/") || text.startsWith("./") || text.startsWith("../")) {
    return text.slice(0, 500);
  }

  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol)
      ? url.toString().slice(0, 500)
      : "";
  } catch {
    return "";
  }
}

async function getAdmins() {
  const response = await fetch(`${ADMINS_URL}?v=${Date.now()}`, {
    headers: { "Cache-Control": "no-cache" }
  });

  if (!response.ok) {
    throw new Error("Não foi possível validar a lista de administradores no GitHub.");
  }

  const data = await response.json();
  return Array.isArray(data?.admins) ? data.admins : [];
}

function isAuthorized(admins: any[], userId: string, username: string) {
  return admins.some((entry) => {
    if (typeof entry === "string") {
      return normalizeUsername(entry) === username;
    }

    const allowedId = String(entry?.user_id || "").trim();
    const allowedUsername = normalizeUsername(entry?.username);

    return (
      (allowedId && allowedId === userId) ||
      (allowedUsername && allowedUsername === username)
    );
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Método não permitido." }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return json({ ok: false, error: "Login necessário." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return json({ ok: false, error: "Configuração do servidor incompleta." }, 500);
    }

    const adminDb = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: authData, error: authError } = await adminDb.auth.getUser(token);
    const user = authData?.user;

    if (authError || !user) {
      return json({ ok: false, error: "Sessão inválida." }, 401);
    }

    const { data: profile, error: profileError } = await adminDb
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.username) {
      return json({ ok: false, error: "Perfil não encontrado." }, 403);
    }

    const username = normalizeUsername(profile.username);
    const admins = await getAdmins();

    if (!isAuthorized(admins, user.id, username)) {
      return json({ ok: false, error: "Esta conta não tem permissão para publicar avisos." }, 403);
    }

    const body = await req.json();
    const title = String(body?.title || "").trim().slice(0, 90);
    const message = String(body?.message || "").trim().slice(0, 1200);

    if (!title || !message) {
      return json({ ok: false, error: "Título e mensagem são obrigatórios." }, 400);
    }

    const payload = {
      singleton_key: "global",
      enabled: Boolean(body?.enabled),
      title,
      message,
      background_color: safeColor(body?.background_color, "#171717"),
      text_color: safeColor(body?.text_color, "#ffffff"),
      accent_color: safeColor(body?.accent_color, "#f28b3c"),
      border_color: safeColor(body?.border_color, "#f28b3c"),
      font_family: allowedFonts.has(body?.font_family) ? body.font_family : "system",
      position: allowedPositions.has(body?.position) ? body.position : "top-center",
      size: allowedSizes.has(body?.size) ? body.size : "medium",
      animation: allowedAnimations.has(body?.animation) ? body.animation : "slide",
      icon: allowedIcons.has(body?.icon) ? body.icon : "info",
      border_radius: Math.round(numberBetween(body?.border_radius, 0, 40, 18)),
      opacity: numberBetween(body?.opacity, 0.65, 1, 1),
      dismissible: body?.dismissible !== false,
      auto_close_seconds: Math.round(numberBetween(body?.auto_close_seconds, 0, 120, 0)),
      action_enabled: Boolean(body?.action_enabled),
      action_label: String(body?.action_label || "Saiba mais").trim().slice(0, 40),
      action_url: safeUrl(body?.action_url),
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };

    const { data, error } = await adminDb
      .from("vinci_global_notices")
      .upsert(payload, { onConflict: "singleton_key" })
      .select()
      .single();

    if (error) {
      console.error(error);
      return json({ ok: false, error: "Não foi possível salvar o aviso." }, 500);
    }

    return json({ ok: true, notice: data });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: "Erro interno ao publicar o aviso." }, 500);
  }
});
