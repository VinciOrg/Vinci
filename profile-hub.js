// =====================================
// VINCI 0.7 — ATALHOS DO PERFIL
// =====================================
(function () {
    "use strict";

    const host = document.querySelector(".profile-actions");
    if (!host || host.dataset.vinciHubReady === "true") return;
    host.dataset.vinciHubReady = "true";

    function addButton(label, handler, className) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `button secondary vinci-profile-feature ${className || ""}`.trim();
        button.textContent = label;
        button.addEventListener("click", handler);
        host.appendChild(button);
    }

    async function init() {
        const { data } = await db.auth.getUser();
        const user = data?.user;
        if (!user) return;

        const params = new URLSearchParams(location.search);
        const viewedId = params.get("id") || user.id;
        const own = viewedId === user.id;

        addButton("Álbuns", function () {
            location.assign(`albums.html?id=${encodeURIComponent(viewedId)}`);
        }, "vinci-albums-shortcut");

        if (own) {
            addButton("Círculos", function () { location.assign("circles.html"); }, "vinci-circles-shortcut");
            addButton("Notificações", function () { location.assign("notifications.html"); }, "vinci-notifications-shortcut");
        }
    }

    init();
})();
