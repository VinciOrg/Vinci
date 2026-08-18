// =====================================
// VINCI 0.7 — BADGE DE NOTIFICAÇÕES
// =====================================
(function () {
    "use strict";

    async function init() {
        const { data } = await db.auth.getUser();
        const user = data?.user;
        if (!user) return;

        let link = document.querySelector(".vinci-notification-link");
        if (!link) {
            const header = document.querySelector(".feed-header");
            if (!header) return;
            link = document.createElement("a");
            link.href = "notifications.html";
            link.className = "vinci-notification-link";
            link.setAttribute("aria-label", "Notificações");
            link.innerHTML = '<span class="nav-bell-icon" aria-hidden="true"><svg class="nav-icon" viewBox="0 0 24 24"><path d="M9 17.5h6l1.2-1.9V10a4.2 4.2 0 0 0-8.4 0v5.6z"></path><path d="M10.5 19a1.7 1.7 0 0 0 3 0"></path></svg></span><span class="vinci-notification-badge hidden">0</span>';

            const search = header.querySelector(".search-button");
            if (search) header.insertBefore(link, search);
            else header.appendChild(link);
        }

        const badge = link.querySelector(".vinci-notification-badge");
        if (!badge) return;

        const { count, error } = await db
            .from("vinci_notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false);

        if (error) return;
        const value = count || 0;
        badge.textContent = value > 99 ? "99+" : String(value);
        badge.classList.toggle("hidden", value === 0);
    }

    init();
})();
