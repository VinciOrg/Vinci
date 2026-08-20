(function () {
    "use strict";

    const CHAT_ICON = `
        <span>
            <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5.25 5.5h13.5A2.25 2.25 0 0 1 21 7.75v7.5a2.25 2.25 0 0 1-2.25 2.25H10l-5.5 3v-3.25A2.25 2.25 0 0 1 3 15.25v-7.5A2.25 2.25 0 0 1 5.25 5.5z"></path>
                <path d="M7.5 10h9"></path>
                <path d="M7.5 13.5h5.5"></path>
            </svg>
        </span>`;

    function setLabel(element, label) {
        if (!element) return;
        [...element.childNodes].forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) node.remove();
        });
        element.appendChild(document.createTextNode(label));
    }

    function currentPage() {
        return (location.pathname.split("/").pop() || "index.html").toLowerCase();
    }

    function initNav(nav) {
        if (nav.dataset.focusReady === "1") return;
        nav.dataset.focusReady = "1";
        nav.classList.add("focus-bottom-nav");

        const links = [...nav.querySelectorAll("a")];
        const home = links.find(a => (a.getAttribute("href") || "") === "index.html");
        const rooms = links.find(a => (a.getAttribute("href") || "").startsWith("rooms.html"));
        const profile = links.find(a => (a.getAttribute("href") || "").startsWith("profile.html"));
        const create = nav.querySelector(".nav-create");

        if (home) setLabel(home, "Início");
        if (create) setLabel(create, "Criar");

        let chat = nav.querySelector('[data-focus-chat-nav="1"]');

        if (!chat) {
            chat = document.createElement("a");
            chat.href = "chat.html";
            chat.dataset.focusChatNav = "1";
            chat.innerHTML = CHAT_ICON;
            chat.appendChild(document.createTextNode("Chat"));

            if (profile) nav.insertBefore(chat, profile);
            else nav.appendChild(chat);
        }

        nav.querySelectorAll("a").forEach(a => a.classList.remove("active"));

        const page = currentPage();

        if (["chat.html","direct-chat.html","friends.html","circles.html","friendship.html"].includes(page)) {
            chat.classList.add("active");
        } else if (["rooms.html","room.html"].includes(page)) {
            rooms?.classList.add("active");
        } else if (["profile.html","albums.html","capsules.html","yearbook.html","frames.html"].includes(page)) {
            profile?.classList.add("active");
        } else {
            home?.classList.add("active");
        }
    }

    function init() {
        document.querySelectorAll(".bottom-nav").forEach(initNav);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();