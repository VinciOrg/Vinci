// =====================================
// VINCI — REPLY PRIVACY 1.0
// Seletor de pessoas autorizadas a responder
// =====================================

(function () {

    "use strict";

    const searchInput =
        document.getElementById("replyUserSearch");

    const searchResults =
        document.getElementById("replyUserResults");

    const selectedList =
        document.getElementById("replySelectedUsers");

    const selectedCount =
        document.getElementById("replySelectedCount");

    const emptyState =
        document.getElementById("replyPermissionEmpty");

    // O script também existe em páginas que não são post.html.
    if (
        !searchInput ||
        !searchResults ||
        !selectedList
    ) {
        return;
    }

    let currentUser = null;
    let searchTimer = null;
    let searchSequence = 0;

    const selectedUsers = new Map();

    searchInput.disabled = true;


    // =====================================
    // UTILIDADES
    // =====================================

    function normalizeQuery(value) {

        return String(value || "")
            .trim()
            .replace(/^@+/, "")
            .replace(/[,%()]/g, "")
            .slice(0, 50);

    }


    function safeAvatar(profile) {

        return profile?.avatar_url ||
            "assets/default-avatar.png";

    }


    function updateSelectedState() {

        const count = selectedUsers.size;

        if (selectedCount) {
            selectedCount.textContent =
                count === 1
                    ? "1 pessoa selecionada"
                    : `${count} pessoas selecionadas`;
        }

        if (emptyState) {
            emptyState.classList.toggle(
                "hidden",
                count > 0
            );
        }

    }


    function hideResults() {

        searchResults.innerHTML = "";
        searchResults.classList.add("hidden");

    }


    // =====================================
    // USUÁRIOS SELECIONADOS
    // =====================================

    function removeUser(userId) {

        selectedUsers.delete(userId);

        const chip = selectedList.querySelector(
            `[data-selected-reply-user="${CSS.escape(userId)}"]`
        );

        if (chip) {
            chip.remove();
        }

        updateSelectedState();

    }


    function addUser(profile) {

        if (
            !profile?.id ||
            profile.id === currentUser?.id ||
            selectedUsers.has(profile.id)
        ) {
            return;
        }

        selectedUsers.set(
            profile.id,
            {
                id: profile.id,
                username: profile.username || "usuario",
                name: profile.name || "",
                avatar_url: profile.avatar_url || null
            }
        );

        const chip = document.createElement("div");
        chip.className = "reply-selected-user";
        chip.dataset.selectedReplyUser = profile.id;

        const avatar = document.createElement("img");
        avatar.className = "reply-selected-avatar";
        avatar.src = safeAvatar(profile);
        avatar.alt = "";
        avatar.onerror = function () {
            this.src = "assets/default-avatar.png";
        };

        const info = document.createElement("div");
        info.className = "reply-selected-info";

        const username = document.createElement("strong");
        username.textContent = `@${profile.username || "usuario"}`;

        info.appendChild(username);

        if (profile.name) {
            const name = document.createElement("span");
            name.textContent = profile.name;
            info.appendChild(name);
        }

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "reply-selected-remove";
        removeButton.setAttribute(
            "aria-label",
            `Remover @${profile.username || "usuario"}`
        );
        removeButton.textContent = "×";

        removeButton.addEventListener(
            "click",
            function () {
                removeUser(profile.id);
            }
        );

        chip.appendChild(avatar);
        chip.appendChild(info);
        chip.appendChild(removeButton);

        selectedList.appendChild(chip);

        searchInput.value = "";
        hideResults();
        updateSelectedState();

    }


    // =====================================
    // PESQUISA
    // =====================================

    function renderResults(profiles) {

        searchResults.innerHTML = "";

        const availableProfiles = profiles.filter(
            function (profile) {
                return (
                    profile.id !== currentUser?.id &&
                    !selectedUsers.has(profile.id)
                );
            }
        );

        if (availableProfiles.length === 0) {

            const empty = document.createElement("div");
            empty.className = "reply-search-empty";
            empty.textContent = "Nenhum usuário encontrado.";

            searchResults.appendChild(empty);
            searchResults.classList.remove("hidden");
            return;

        }

        availableProfiles.forEach(
            function (profile) {

                const button = document.createElement("button");
                button.type = "button";
                button.className = "reply-search-result";

                const avatar = document.createElement("img");
                avatar.className = "reply-search-avatar";
                avatar.src = safeAvatar(profile);
                avatar.alt = "";
                avatar.onerror = function () {
                    this.src = "assets/default-avatar.png";
                };

                const info = document.createElement("div");
                info.className = "reply-search-info";

                const username = document.createElement("strong");
                username.textContent =
                    `@${profile.username || "usuario"}`;

                const name = document.createElement("span");
                name.textContent = profile.name || "";

                info.appendChild(username);

                if (profile.name) {
                    info.appendChild(name);
                }

                const add = document.createElement("span");
                add.className = "reply-search-add";
                add.textContent = "+";

                button.appendChild(avatar);
                button.appendChild(info);
                button.appendChild(add);

                button.addEventListener(
                    "click",
                    function () {
                        addUser(profile);
                    }
                );

                searchResults.appendChild(button);

            }
        );

        searchResults.classList.remove("hidden");

    }


    async function searchUsers(rawQuery) {

        const query = normalizeQuery(rawQuery);

        if (query.length < 1) {
            hideResults();
            return;
        }

        const sequence = ++searchSequence;

        searchResults.innerHTML = `
            <div class="reply-search-empty">
                Procurando pessoas...
            </div>
        `;
        searchResults.classList.remove("hidden");

        const {
            data,
            error
        } = await db
            .from("profiles")
            .select("id, username, name, avatar_url")
            .or(
                `username.ilike.%${query}%,name.ilike.%${query}%`
            )
            .limit(12);

        if (sequence !== searchSequence) {
            return;
        }

        if (error) {

            console.error(
                "Vinci Privacy: erro ao pesquisar usuários:",
                error
            );

            searchResults.innerHTML = `
                <div class="reply-search-empty">
                    Não foi possível pesquisar agora.
                </div>
            `;
            searchResults.classList.remove("hidden");
            return;

        }

        const normalizedLower = query.toLowerCase();

        const ordered = (data || []).sort(
            function (a, b) {

                const aUsername =
                    (a.username || "").toLowerCase();

                const bUsername =
                    (b.username || "").toLowerCase();

                const score = function (username) {
                    if (username === normalizedLower) return 0;
                    if (username.startsWith(normalizedLower)) return 1;
                    return 2;
                };

                return (
                    score(aUsername) - score(bUsername) ||
                    aUsername.localeCompare(bUsername, "pt-BR")
                );

            }
        );

        renderResults(ordered);

    }


    searchInput.addEventListener(
        "input",
        function () {

            clearTimeout(searchTimer);

            searchTimer = setTimeout(
                function () {
                    searchUsers(searchInput.value);
                },
                220
            );

        }
    );


    searchInput.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Enter") {

                const firstResult =
                    searchResults.querySelector(
                        ".reply-search-result"
                    );

                if (firstResult) {
                    event.preventDefault();
                    firstResult.click();
                }

                return;
            }

            if (event.key === "Escape") {
                hideResults();
                searchInput.blur();
            }

        }
    );


    document.addEventListener(
        "click",
        function (event) {

            if (
                !event.target.closest(
                    ".reply-user-picker"
                )
            ) {
                hideResults();
            }

        }
    );


    // =====================================
    // API PARA post.js
    // =====================================

    window.VinciPrivacy = {

        getReplyUserIds: function () {
            return Array.from(selectedUsers.keys());
        },

        getReplyUsers: function () {
            return Array.from(selectedUsers.values());
        },

        clearReplyUsers: function () {
            selectedUsers.clear();
            selectedList.innerHTML = "";
            updateSelectedState();
            hideResults();
        }

    };


    // =====================================
    // INICIAR
    // =====================================

    async function init() {

        try {

            const {
                data,
                error
            } = await db.auth.getUser();

            if (error) {
                throw error;
            }

            currentUser = data.user || null;
            searchInput.disabled = false;
            updateSelectedState();

            console.log(
                "VINCI — REPLY PRIVACY 1.0 ATIVO ✓"
            );

        }

        catch (error) {

            console.error(
                "Vinci Privacy: não foi possível carregar o usuário:",
                error
            );

        }

    }


    init();

})();
