const SUPABASE_URL = "https://jqbiodjbrliqghshatmv.supabase.co";
const SUPABASE_KEY = "sb_publishable_XEF6TMRQ6cHCWw8Z6LYnHA_YPDpmYV4";

const { createClient } = supabase;

const db = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* =====================================
   VINCI PRIVATE MEDIA
   Resolve URLs from private Vinci
   Storage buckets automatically.
===================================== */

const VinciMedia = (() => {

  const DEFAULT_BUCKET = "vinci-images";
  const PRIVATE_BUCKETS = new Set([
    "vinci-images",
    "vinci-audio"
  ]);

  const SIGNED_URL_TTL = 60 * 60; // 1 hora
  const REFRESH_MARGIN_MS = 5 * 60 * 1000;
  const cache = new Map();

  function extractRef(url) {

    if (!url || typeof url !== "string") {
      return null;
    }

    for (const bucket of PRIVATE_BUCKETS) {
      const markers = [
        `/storage/v1/object/public/${bucket}/`,
        `/storage/v1/object/sign/${bucket}/`,
        `/storage/v1/object/authenticated/${bucket}/`
      ];

      for (const marker of markers) {
        const index = url.indexOf(marker);

        if (index !== -1) {
          return {
            bucket,
            path: decodeURIComponent(
              url
                .slice(index + marker.length)
                .split("?")[0]
            )
          };
        }
      }
    }

    return null;
  }

  // Mantém compatibilidade com o restante do Vinci.
  function extractPath(url) {
    return extractRef(url)?.path || null;
  }

  async function signedUrlForPath(path, bucket = DEFAULT_BUCKET) {

    if (!path || !PRIVATE_BUCKETS.has(bucket)) {
      return null;
    }

    const cacheKey = `${bucket}:${path}`;
    const now = Date.now();
    const cached = cache.get(cacheKey);

    if (
      cached &&
      cached.url &&
      cached.expiresAt - REFRESH_MARGIN_MS > now
    ) {
      return cached.url;
    }

    if (cached?.promise) {
      return cached.promise;
    }

    const promise = (async () => {

      const { data, error } = await db.storage
        .from(bucket)
        .createSignedUrl(path, SIGNED_URL_TTL);

      if (error) {
        console.warn(
          `Vinci: mídia protegida (${bucket}) não pôde ser carregada.`,
          error.message
        );
        cache.delete(cacheKey);
        return null;
      }

      const result = data?.signedUrl || null;

      if (result) {
        cache.set(cacheKey, {
          url: result,
          expiresAt: Date.now() + SIGNED_URL_TTL * 1000
        });
      }

      return result;

    })();

    cache.set(cacheKey, { promise });

    return promise;
  }

  async function resolveUrl(url) {

    const ref = extractRef(url);

    if (!ref) {
      return url;
    }

    return await signedUrlForPath(ref.path, ref.bucket);
  }

  async function protectImage(img) {

    if (!(img instanceof HTMLImageElement)) {
      return;
    }

    if (img.dataset.vinciMediaResolving === "1") {
      return;
    }

    const currentSrc =
      img.getAttribute("src") ||
      "";

    // Auto-proteção visual é usada só para imagens.
    const currentRef = extractRef(currentSrc);

    if (
      currentRef?.bucket === DEFAULT_BUCKET &&
      currentSrc.includes(`/storage/v1/object/sign/${DEFAULT_BUCKET}/`) &&
      currentSrc.includes("token=")
    ) {
      return;
    }

    const original =
      img.dataset.vinciOriginalSrc ||
      currentSrc;

    const ref = extractRef(original);

    if (!ref || ref.bucket !== DEFAULT_BUCKET) {
      return;
    }

    img.dataset.vinciOriginalSrc = original;
    img.dataset.vinciMediaResolving = "1";

    const signedUrl = await signedUrlForPath(
      ref.path,
      ref.bucket
    );

    if (signedUrl) {
      img.src = signedUrl;
    } else {
      // Evita ficar tentando a URL pública de um bucket privado.
      img.removeAttribute("src");
      img.classList.add("vinci-media-unavailable");
    }

    delete img.dataset.vinciMediaResolving;
  }

  function scan(root = document) {

    if (!root?.querySelectorAll) {
      return;
    }

    if (root instanceof HTMLImageElement) {
      protectImage(root);
    }

    root
      .querySelectorAll(`img[src*="/${DEFAULT_BUCKET}/"]`)
      .forEach(protectImage);
  }

  function observe() {

    const start = () => {

      scan(document);

      const observer = new MutationObserver((mutations) => {

        for (const mutation of mutations) {

          if (
            mutation.type === "attributes" &&
            mutation.target instanceof HTMLImageElement &&
            mutation.attributeName === "src"
          ) {
            protectImage(mutation.target);
          }

          for (const node of mutation.addedNodes) {

            if (!(node instanceof Element)) {
              continue;
            }

            if (node instanceof HTMLImageElement) {
              protectImage(node);
            }

            scan(node);
          }
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src"]
      });
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start, {
        once: true
      });
    } else {
      start();
    }
  }

  observe();

  return {
    extractRef,
    extractPath,
    resolveUrl,
    signedUrlForPath,
    scan
  };

})();

window.VinciMedia = VinciMedia;
