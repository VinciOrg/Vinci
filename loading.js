// =====================================
// VINCI 0.7.7 — SMART SHUTTER LOADER
// =====================================
//
// O loader NÃO aparece em toda troca de página.
// Ele só entra quando uma espera realmente fica perceptível.
//
// Automático:
// 1) carregamento inicial que passar do limite;
// 2) fetch/Supabase que passar do limite;
// 3) navegação interna que realmente demorar.
//
// Manual:
// window.VinciLoading.show("Publicando");
// window.VinciLoading.hide(token);
// window.VinciLoading.track(promessa, "Carregando", { immediate: false });

(function () {
    "use strict";

    // Evita piscar o loader em operações rápidas.
    const AUTO_SHOW_DELAY = 800;

    // Depois que apareceu, deixa tempo suficiente para a animação ser percebida.
    const MIN_VISIBLE_TIME = 420;

    const DEFAULT_MESSAGE = "Carregando";

    let overlay = null;
    let messageElement = null;

    let booting = true;
    let navigating = false;
    let networkRequests = 0;

    const manualTokens = new Set();

    let showTimer = null;
    let hideTimer = null;
    let navigationSafetyTimer = null;
    let visibleSince = 0;

    // =====================================
    // ELEMENTOS
    // =====================================

    function resolveElements() {
        if (!overlay) {
            overlay = document.getElementById("vinciGlobalLoader");
        }

        if (!messageElement && overlay) {
            messageElement = overlay.querySelector(
                ".vinci-loader__message-text"
            );
        }

        return Boolean(overlay);
    }

    function setMessage(message) {
        if (!resolveElements() || !messageElement) return;

        messageElement.textContent =
            String(message || DEFAULT_MESSAGE).trim() ||
            DEFAULT_MESSAGE;
    }

    // =====================================
    // ESTADO
    // =====================================

    function hasWork() {
        return (
            booting ||
            navigating ||
            networkRequests > 0 ||
            manualTokens.size > 0
        );
    }

    function isVisible() {
        return (
            resolveElements() &&
            overlay.classList.contains("vinci-loader--visible")
        );
    }

    function clearShowTimer() {
        if (showTimer !== null) {
            clearTimeout(showTimer);
            showTimer = null;
        }
    }

    function clearHideTimer() {
        if (hideTimer !== null) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
    }

    // =====================================
    // MOSTRAR / ESCONDER
    // =====================================

    function showNow(message) {
        if (!resolveElements()) return;

        clearShowTimer();
        clearHideTimer();

        if (message) setMessage(message);

        if (!isVisible()) {
            visibleSince = performance.now();
        }

        overlay.classList.add("vinci-loader--visible");
        overlay.setAttribute("aria-hidden", "false");
    }

    function scheduleShow(message) {
        if (!resolveElements()) return;

        if (isVisible()) {
            if (message) setMessage(message);
            return;
        }

        if (showTimer !== null) return;

        showTimer = setTimeout(function () {
            showTimer = null;

            if (!hasWork()) return;

            showNow(message || DEFAULT_MESSAGE);
        }, AUTO_SHOW_DELAY);
    }

    function hideNow() {
        if (!resolveElements()) return;

        clearShowTimer();
        clearHideTimer();

        overlay.classList.remove("vinci-loader--visible");
        overlay.setAttribute("aria-hidden", "true");

        setMessage(DEFAULT_MESSAGE);
    }

    function scheduleHide() {
        if (!resolveElements()) return;

        clearShowTimer();

        if (hasWork()) return;

        if (!isVisible()) {
            hideNow();
            return;
        }

        const elapsed = performance.now() - visibleSince;
        const remaining = Math.max(0, MIN_VISIBLE_TIME - elapsed);

        clearHideTimer();

        hideTimer = setTimeout(function () {
            hideTimer = null;

            if (!hasWork()) {
                hideNow();
            }
        }, remaining);
    }

    function refresh(options) {
        const opts = options || {};

        if (hasWork()) {
            // Só operações explicitamente marcadas como imediatas
            // bloqueiam a tela sem esperar os 800 ms.
            if (opts.immediate === true) {
                showNow(opts.message);
            } else {
                scheduleShow(opts.message);
            }

            return;
        }

        scheduleHide();
    }

    // =====================================
    // API MANUAL
    // =====================================

    function manualShow(message, options) {
        const token = Symbol("vinci-loading");

        manualTokens.add(token);

        refresh({
            immediate: options?.immediate !== false,
            message: message || DEFAULT_MESSAGE
        });

        return token;
    }

    function manualHide(token) {
        if (token) {
            manualTokens.delete(token);
        } else {
            manualTokens.clear();
        }

        refresh();
    }

    function track(promise, message, options) {
        const token = manualShow(
            message,
            options || { immediate: false }
        );

        return Promise.resolve(promise).finally(function () {
            manualHide(token);
        });
    }

    window.VinciLoading = {
        show: manualShow,
        hide: manualHide,
        track,
        setMessage,

        get active() {
            return hasWork();
        }
    };

    // =====================================
    // MONITOR AUTOMÁTICO DE FETCH / SUPABASE
    // =====================================

    if (
        typeof window.fetch === "function" &&
        !window.fetch.__vinciLoadingWrapped
    ) {
        const originalFetch = window.fetch.bind(window);

        const wrappedFetch = function () {
            networkRequests += 1;

            refresh({
                immediate: false,
                message: DEFAULT_MESSAGE
            });

            let request;

            try {
                request = originalFetch.apply(window, arguments);
            } catch (error) {
                networkRequests = Math.max(0, networkRequests - 1);
                refresh();
                throw error;
            }

            return Promise.resolve(request).finally(function () {
                networkRequests = Math.max(0, networkRequests - 1);
                refresh();
            });
        };

        wrappedFetch.__vinciLoadingWrapped = true;
        wrappedFetch.__vinciOriginalFetch = originalFetch;
        window.fetch = wrappedFetch;
    }

    // =====================================
    // NAVEGAÇÃO INTERNA
    // =====================================

    function isInternalNavigation(anchor) {
        if (!anchor) return false;

        if (
            anchor.hasAttribute("download") ||
            anchor.target === "_blank"
        ) {
            return false;
        }

        const href = anchor.getAttribute("href");

        if (
            !href ||
            href.startsWith("#") ||
            href.startsWith("javascript:") ||
            href.startsWith("mailto:") ||
            href.startsWith("tel:")
        ) {
            return false;
        }

        try {
            const url = new URL(anchor.href, window.location.href);
            return url.origin === window.location.origin;
        } catch (_) {
            return false;
        }
    }

    document.addEventListener(
        "click",
        function (event) {
            if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            ) {
                return;
            }

            const anchor = event.target.closest?.("a[href]");

            if (!isInternalNavigation(anchor)) return;

            navigating = true;

            // IMPORTANTE: não mostra imediatamente.
            // Se Feed -> Perfil abrir rápido, o usuário não vê loader nenhum.
            refresh({
                immediate: false,
                message: "Abrindo"
            });

            clearTimeout(navigationSafetyTimer);

            // Se algum script cancelar a navegação, não deixa estado preso.
            navigationSafetyTimer = setTimeout(function () {
                navigating = false;
                refresh();
            }, 2400);
        },
        true
    );

    // Não forçamos loader no beforeunload.
    // Uma navegação rápida deve continuar parecendo instantânea.

    window.addEventListener("pageshow", function (event) {
        if (!event.persisted) return;

        navigating = false;
        booting = false;
        networkRequests = 0;
        manualTokens.clear();

        refresh();
    });

    // =====================================
    // FIM DO BOOT
    // =====================================

    function finishBoot() {
        booting = false;
        refresh();
    }

    if (document.readyState === "complete") {
        setTimeout(finishBoot, 0);
    } else {
        window.addEventListener("load", finishBoot, { once: true });
    }

    // O HTML começa escondido. Se o carregamento total realmente demorar,
    // só então o loader aparece.
    resolveElements();
    refresh({ immediate: false, message: DEFAULT_MESSAGE });
})();
