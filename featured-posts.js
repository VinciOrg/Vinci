// =====================================
// VINCI 0.7 — PUBLICAÇÕES EM DESTAQUE
// =====================================
(function () {
    "use strict";

    let currentUser = null;
    let scheduled = false;

    async function toggle(postId, next, button, message) {
        button.disabled = true;
        message.textContent = next ? "Destacando..." : "Removendo destaque...";

        const { error } = await db.rpc("vinci_set_featured_post", {
            p_post_id: postId,
            p_featured: next
        });

        if (error) {
            const text = String(error.message || "");
            message.textContent = text.includes("3 publicações")
                ? "Você já tem 3 destaques. Remova um antes."
                : "Não foi possível alterar o destaque.";
            button.disabled = false;
            return;
        }

        const viewer = document.getElementById("postViewer");
        viewer?.remove();

        if (typeof window.loadUserPosts === "function") {
            await window.loadUserPosts();
        } else if (typeof loadUserPosts === "function") {
            await loadUserPosts();
        } else {
            location.reload();
        }
    }

    function scan() {
        const viewer = document.querySelector("#postViewer[data-post-id][data-user-id]");
        if (!viewer || viewer.dataset.featuredControlReady === "true") return;
        if (!currentUser || viewer.dataset.userId !== currentUser.id) return;

        viewer.dataset.featuredControlReady = "true";
        const content = viewer.querySelector(".post-viewer-content");
        if (!content) return;

        const featured = viewer.dataset.featured === "true";
        const button = document.createElement("button");
        button.type = "button";
        button.className = `vinci-featured-action${featured ? " active" : ""}`;
        button.textContent = featured ? "★ Remover dos destaques" : "☆ Destacar no perfil";

        const message = document.createElement("p");
        message.className = "vinci-featured-message";
        message.textContent = featured ? "Esta é uma das suas publicações em destaque." : "Você pode destacar até 3 fotografias.";

        button.addEventListener("click", function (event) {
            event.stopPropagation();
            toggle(viewer.dataset.postId, !featured, button, message);
        });

        content.append(button, message);
    }

    function schedule() {
        if (scheduled) return;
        scheduled = true;
        queueMicrotask(function () {
            scheduled = false;
            scan();
        });
    }

    async function init() {
        const { data } = await db.auth.getUser();
        currentUser = data?.user || null;
        if (!currentUser) return;
        new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
        scan();
    }

    init();
})();
