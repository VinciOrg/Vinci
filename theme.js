(function () {
    "use strict";

    const KEY = "vinci-theme-mode";
    const VALID = new Set(["light", "dark", "system"]);
    const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

    function storedMode() {
        const value = localStorage.getItem(KEY);
        return VALID.has(value) ? value : "system";
    }

    function resolved(mode) {
        return mode === "system" ? (media?.matches ? "dark" : "light") : mode;
    }

    function updateThemeColor(theme) {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", theme === "dark" ? "#11100f" : "#faf9f7");
    }

    function apply(mode, persist) {
        const safe = VALID.has(mode) ? mode : "system";
        if (persist) localStorage.setItem(KEY, safe);

        const theme = resolved(safe);
        document.documentElement.dataset.theme = theme;
        document.documentElement.dataset.themeMode = safe;
        updateThemeColor(theme);

        window.dispatchEvent(new CustomEvent("vinci-theme-changed", {
            detail: { mode: safe, theme }
        }));

        return { mode: safe, theme };
    }

    function syncControls() {
        const mode = storedMode();

        document.querySelectorAll("[data-vinci-theme]").forEach(button => {
            const selected = button.dataset.vinciTheme === mode;
            button.classList.toggle("selected", selected);
            button.setAttribute("aria-pressed", selected ? "true" : "false");
        });

        document.querySelectorAll("[data-vinci-theme-select]").forEach(select => {
            select.value = mode;
        });
    }

    window.VinciTheme = {
        getMode: storedMode,
        setMode(mode) {
            const value = apply(mode, true);
            syncControls();
            return value;
        },
        apply,
        syncControls
    };

    apply(storedMode(), false);

    if (media) {
        const listener = () => {
            if (storedMode() === "system") {
                apply("system", false);
                syncControls();
            }
        };

        if (media.addEventListener) media.addEventListener("change", listener);
        else if (media.addListener) media.addListener(listener);
    }

    document.addEventListener("DOMContentLoaded", syncControls);
})();