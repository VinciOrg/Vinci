// =====================================
// VINCI — AVISOS GLOBAIS
// =====================================

(() => {
  const TABLE = "vinci_global_notices";
  const SINGLETON_KEY = "global";
  const HOST_ID = "vinciGlobalNoticeHost";
  const NOTICE_ID = "vinciGlobalNotice";
  const DISMISS_PREFIX = "vinci_notice_dismissed:";

  let autoCloseTimer = null;
  let channel = null;

  const allowedPositions = new Set([
    "top-left",
    "top-center",
    "top-right",
    "bottom-left",
    "bottom-center",
    "bottom-right"
  ]);

  const allowedFonts = new Set([
    "system",
    "serif",
    "mono",
    "rounded",
    "elegant"
  ]);

  const allowedSizes = new Set(["small", "medium", "large"]);
  const allowedAnimations = new Set(["slide", "fade", "scale", "none"]);
  const allowedIcons = new Set(["info", "warning", "success", "maintenance", "none"]);

  function clamp(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  function safeColor(value, fallback) {
    return /^#[0-9a-f]{6}$/i.test(String(value || ""))
      ? String(value)
      : fallback;
  }

  function safeUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    if (raw.startsWith("/") || raw.startsWith("./") || raw.startsWith("../")) {
      return raw;
    }

    try {
      const parsed = new URL(raw, window.location.href);
      return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
    } catch {
      return "";
    }
  }

  function iconSvg(type) {
    const icons = {
      info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 10.5v6"></path><path d="M12 7.3h.01"></path></svg>',
      warning: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.2 4.8 3.4 17a2 2 0 0 0 1.75 3h13.7a2 2 0 0 0 1.75-3L13.8 4.8a2.05 2.05 0 0 0-3.6 0Z"></path><path d="M12 9v4"></path><path d="M12 16.5h.01"></path></svg>',
      success: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m8.2 12.2 2.5 2.5 5.2-5.5"></path></svg>',
      maintenance: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6.2 3.3-3.3 3.3 3.3-3.3 3.3"></path><path d="M16.4 7.6 8.2 15.8"></path><path d="m5.8 13.4 4.8 4.8-3.1 3.1-4.8-4.8z"></path></svg>',
      none: ""
    };

    return icons[type] || icons.info;
  }

  function getHost() {
    let host = document.getElementById(HOST_ID);

    if (!host) {
      host = document.createElement("div");
      host.id = HOST_ID;
      host.className = "vinci-global-notice-host";
      document.body.appendChild(host);
    }

    return host;
  }

  function closeNotice() {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = null;
    document.getElementById(NOTICE_ID)?.remove();
  }

  function dismissalKey(notice) {
    const version = notice.updated_at || notice.id || "global";
    return `${DISMISS_PREFIX}${version}`;
  }

  function isDismissed(notice) {
    if (!notice.dismissible) return false;
    return localStorage.getItem(dismissalKey(notice)) === "1";
  }

  function markDismissed(notice) {
    if (!notice.dismissible) return;
    localStorage.setItem(dismissalKey(notice), "1");
  }

  function normalizedNotice(input = {}) {
    return {
      id: input.id || "preview",
      singleton_key: SINGLETON_KEY,
      enabled: input.enabled !== false,
      title: String(input.title || "Aviso do Vinci").slice(0, 90),
      message: String(input.message || "").slice(0, 1200),
      background_color: safeColor(input.background_color, "#171717"),
      text_color: safeColor(input.text_color, "#ffffff"),
      accent_color: safeColor(input.accent_color, "#f28b3c"),
      border_color: safeColor(input.border_color, "#f28b3c"),
      font_family: allowedFonts.has(input.font_family) ? input.font_family : "system",
      position: allowedPositions.has(input.position) ? input.position : "top-center",
      size: allowedSizes.has(input.size) ? input.size : "medium",
      animation: allowedAnimations.has(input.animation) ? input.animation : "slide",
      icon: allowedIcons.has(input.icon) ? input.icon : "info",
      border_radius: clamp(input.border_radius, 0, 40, 18),
      opacity: clamp(input.opacity, 0.65, 1, 1),
      dismissible: input.dismissible !== false,
      auto_close_seconds: Math.round(clamp(input.auto_close_seconds, 0, 120, 0)),
      action_enabled: input.action_enabled === true,
      action_label: String(input.action_label || "Saiba mais").slice(0, 40),
      action_url: safeUrl(input.action_url),
      updated_at: input.updated_at || null
    };
  }

  function renderNotice(rawNotice, options = {}) {
    const { preview = false, force = false } = options;
    const notice = normalizedNotice(rawNotice);

    closeNotice();

    if (!preview && !notice.enabled) return null;
    if (!preview && !force && isDismissed(notice)) return null;

    const host = getHost();
    const element = document.createElement("aside");
    element.id = NOTICE_ID;
    element.className = "vinci-global-notice";
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");
    element.dataset.position = notice.position;
    element.dataset.font = notice.font_family;
    element.dataset.size = notice.size;
    element.dataset.animation = notice.animation;
    element.dataset.icon = notice.icon;
    element.dataset.dismissible = String(notice.dismissible || preview);

    element.style.setProperty("--notice-bg", notice.background_color);
    element.style.setProperty("--notice-text", notice.text_color);
    element.style.setProperty("--notice-accent", notice.accent_color);
    element.style.setProperty("--notice-border", notice.border_color);
    element.style.setProperty("--notice-opacity", String(notice.opacity));
    element.style.borderRadius = `${notice.border_radius}px`;

    const icon = document.createElement("div");
    icon.className = "vinci-notice-icon";
    icon.innerHTML = iconSvg(notice.icon);

    const copy = document.createElement("div");
    copy.className = "vinci-notice-copy";

    const title = document.createElement("h2");
    title.className = "vinci-notice-title";
    title.textContent = notice.title;

    const message = document.createElement("p");
    message.className = "vinci-notice-message";
    message.textContent = notice.message;

    copy.append(title, message);

    if (notice.action_enabled && notice.action_url && notice.action_label) {
      const action = document.createElement("a");
      action.className = "vinci-notice-action";
      action.textContent = notice.action_label;
      action.href = notice.action_url;
      action.rel = "noopener noreferrer";

      if (/^https?:/i.test(notice.action_url)) {
        action.target = "_blank";
      }

      copy.appendChild(action);
    }

    const close = document.createElement("button");
    close.type = "button";
    close.className = "vinci-notice-close";
    close.setAttribute("aria-label", preview ? "Fechar prévia" : "Fechar aviso");
    close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg>';
    close.addEventListener("click", () => {
      if (!preview) markDismissed(notice);
      closeNotice();
    });

    element.append(icon, copy, close);
    host.appendChild(element);

    if (!preview && notice.auto_close_seconds > 0) {
      autoCloseTimer = setTimeout(() => {
        closeNotice();
      }, notice.auto_close_seconds * 1000);
    }

    return element;
  }

  async function loadNotice(force = false) {
    if (typeof db === "undefined") return null;

    const { data, error } = await db
      .from(TABLE)
      .select("*")
      .eq("singleton_key", SINGLETON_KEY)
      .maybeSingle();

    if (error) {
      // Durante a instalação, a tabela ainda pode não existir.
      if (!String(error.code || "").includes("PGRST")) {
        console.warn("Vinci: não foi possível carregar o aviso global.", error.message);
      }
      return null;
    }

    if (!data?.enabled) {
      closeNotice();
      return data || null;
    }

    renderNotice(data, { force });
    return data;
  }

  function subscribe() {
    if (typeof db === "undefined" || typeof db.channel !== "function" || channel) {
      return;
    }

    channel = db
      .channel("vinci-global-notices-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLE
        },
        () => loadNotice(true)
      )
      .subscribe();
  }

  function start() {
    loadNotice(false);
    subscribe();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.VinciGlobalNotices = {
    load: loadNotice,
    renderPreview(notice) {
      return renderNotice(notice, { preview: true, force: true });
    },
    close: closeNotice,
    normalize: normalizedNotice
  };
})();
