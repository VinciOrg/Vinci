const SUPABASE_URL = "https://jqbiodjbrliqghshatmv.supabase.co";
const SUPABASE_KEY = "sb_publishable_XEF6TMRQ6cHCWw8Z6LYnHA_YPDpmYV4";

const { createClient } = supabase;

const db = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* =====================================
   VINCI PRIVATE MEDIA
   Resolve URLs from the private
   "vinci-images" bucket automatically.
===================================== */

const VinciMedia = (() => {

  const BUCKET = "vinci-images";
  const SIGNED_URL_TTL = 60 * 60; // 1 hora
  const REFRESH_MARGIN_MS = 5 * 60 * 1000;
  const cache = new Map();

  function extractPath(url) {

    if (!url || typeof url !== "string") {
      return null;
    }

    const markers = [
      `/storage/v1/object/public/${BUCKET}/`,
      `/storage/v1/object/sign/${BUCKET}/`,
      `/storage/v1/object/authenticated/${BUCKET}/`
    ];

    for (const marker of markers) {
      const index = url.indexOf(marker);

      if (index !== -1) {
        return decodeURIComponent(
          url
            .slice(index + marker.length)
            .split("?")[0]
        );
      }
    }

    return null;
  }

  async function signedUrlForPath(path) {

    if (!path) {
      return null;
    }

    const now = Date.now();
    const cached = cache.get(path);

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
        .from(BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL);

      if (error) {
        console.warn(
          "Vinci: mídia protegida não pôde ser carregada.",
          error.message
        );
        cache.delete(path);
        return null;
      }

      const result = data?.signedUrl || null;

      if (result) {
        cache.set(path, {
          url: result,
          expiresAt: Date.now() + SIGNED_URL_TTL * 1000
        });
      }

      return result;

    })();

    cache.set(path, { promise });

    return promise;
  }

  async function resolveUrl(url) {

    const path = extractPath(url);

    if (!path) {
      return url;
    }

    return await signedUrlForPath(path);
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

    // Se a imagem já está usando uma URL assinada válida,
    // não tenta assiná-la novamente.
    if (
      currentSrc.includes(`/storage/v1/object/sign/${BUCKET}/`) &&
      currentSrc.includes("token=")
    ) {
      return;
    }

    const original =
      img.dataset.vinciOriginalSrc ||
      currentSrc;

    const path = extractPath(original);

    if (!path) {
      return;
    }

    img.dataset.vinciOriginalSrc = original;
    img.dataset.vinciMediaResolving = "1";

    const signedUrl = await signedUrlForPath(path);

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
      .querySelectorAll(`img[src*="/vinci-images/"]`)
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
    extractPath,
    resolveUrl,
    signedUrlForPath,
    scan
  };

})();

window.VinciMedia = VinciMedia;
