// =====================================
// VINCI 0.7 — CÍRCULOS DE ACESSO
// =====================================

(function () {
    "use strict";

    const list = document.getElementById("circlesList");
    const count = document.getElementById("circleCount");
    const input = document.getElementById("newCircleName");
    const createButton = document.getElementById("createCircle");
    const message = document.getElementById("circleMessage");
    const back = document.getElementById("circlesBack");

    if (!list || !input || !createButton) return;

    let currentUser = null;
    let searchTimer = null;

    back?.addEventListener("click", function () {
        history.length > 1 ? history.back() : location.assign("profile.html");
    });

    function escapeHTML(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function avatar(profile) {
        return profile?.avatar_url || "assets/default-avatar.png";
    }

    function setMessage(text, isError) {
        if (!message) return;
        message.textContent = text || "";
        message.classList.toggle("error", Boolean(isError));
    }

    async function fetchProfiles(ids) {
        const unique = [...new Set((ids || []).filter(Boolean))];
        if (!unique.length) return new Map();
        const { data, error } = await db
            .from("profiles")
            .select("id, username, name, avatar_url")
            .in("id", unique);
        if (error) throw error;
        return new Map((data || []).map(function (item) { return [item.id, item]; }));
    }

    async function loadMembers(circleId, membersHost, subtitle) {
        membersHost.innerHTML = '<div class="feature-loading">Carregando pessoas...</div>';
        const { data, error } = await db
            .from("vinci_circle_members")
            .select("user_id, created_at")
            .eq("circle_id", circleId)
            .order("created_at", { ascending: true });

        if (error) {
            membersHost.innerHTML = '<div class="circle-empty">Não foi possível carregar as pessoas.</div>';
            return;
        }

        const rows = data || [];
        subtitle.textContent = rows.length === 1 ? "1 pessoa" : `${rows.length} pessoas`;

        if (!rows.length) {
            membersHost.innerHTML = '<div class="circle-empty">Este círculo ainda está vazio.</div>';
            return;
        }

        const profiles = await fetchProfiles(rows.map(function (row) { return row.user_id; }));
        membersHost.innerHTML = "";

        rows.forEach(function (row) {
            const profile = profiles.get(row.user_id) || {};
            const member = document.createElement("div");
            member.className = "circle-member";
            member.innerHTML = `
                <img src="${escapeHTML(avatar(profile))}" alt="">
                <div class="circle-person">
                    <strong>@${escapeHTML(profile.username || "usuario")}</strong>
                    <span>${escapeHTML(profile.name || "")}</span>
                </div>
                <button type="button" class="circle-remove-member" aria-label="Remover do círculo">×</button>
            `;

            member.querySelector("img").onerror = function () { this.src = "assets/default-avatar.png"; };
            member.querySelector(".circle-remove-member").addEventListener("click", async function () {
                this.disabled = true;
                const { error: removeError } = await db
                    .from("vinci_circle_members")
                    .delete()
                    .eq("circle_id", circleId)
                    .eq("user_id", row.user_id);
                if (removeError) {
                    this.disabled = false;
                    alert("Não foi possível remover esta pessoa.");
                    return;
                }
                await loadMembers(circleId, membersHost, subtitle);
            });
            membersHost.appendChild(member);
        });
    }

    async function searchProfiles(circleId, query, results, membersHost, subtitle) {
        const normalized = String(query || "").trim().replace(/^@+/, "").replace(/[,%()]/g, "");
        if (normalized.length < 2) {
            results.innerHTML = "";
            results.classList.add("hidden");
            return;
        }

        results.innerHTML = '<div class="feature-loading">Procurando...</div>';
        results.classList.remove("hidden");

        const { data, error } = await db
            .from("profiles")
            .select("id, username, name, avatar_url")
            .or(`username.ilike.%${normalized}%,name.ilike.%${normalized}%`)
            .neq("id", currentUser.id)
            .limit(10);

        if (error) {
            results.innerHTML = '<div class="circle-empty">Pesquisa indisponível agora.</div>';
            return;
        }

        if (!data?.length) {
            results.innerHTML = '<div class="circle-empty">Ninguém encontrado.</div>';
            return;
        }

        results.innerHTML = "";
        data.forEach(function (profile) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "circle-search-result";
            button.innerHTML = `
                <img src="${escapeHTML(avatar(profile))}" alt="">
                <div class="circle-person">
                    <strong>@${escapeHTML(profile.username || "usuario")}</strong>
                    <span>${escapeHTML(profile.name || "")}</span>
                </div>
                <span>+</span>
            `;
            button.querySelector("img").onerror = function () { this.src = "assets/default-avatar.png"; };
            button.addEventListener("click", async function () {
                button.disabled = true;
                const { error: addError } = await db
                    .from("vinci_circle_members")
                    .insert({ circle_id: circleId, user_id: profile.id });
                if (addError && !String(addError.message || "").toLowerCase().includes("duplicate")) {
                    button.disabled = false;
                    alert("Não foi possível adicionar esta pessoa.");
                    return;
                }
                results.classList.add("hidden");
                results.innerHTML = "";
                await loadMembers(circleId, membersHost, subtitle);
            });
            results.appendChild(button);
        });
    }

    function renderCircle(circle) {
        const card = document.createElement("article");
        card.className = "circle-card";

        const header = document.createElement("div");
        header.className = "circle-card-header";
        header.innerHTML = `
            <div class="circle-symbol">◎</div>
            <div class="circle-title">
                <strong>${escapeHTML(circle.name)}</strong>
                <span class="circle-member-count">Abrir círculo</span>
            </div>
            <div class="circle-card-actions">
                <button type="button" class="circle-icon-button circle-toggle">Gerenciar</button>
                <button type="button" class="circle-icon-button danger circle-delete">Excluir</button>
            </div>
        `;

        const panel = document.createElement("div");
        panel.className = "circle-panel hidden";
        panel.innerHTML = `
            <div class="circle-member-search">
                <input type="search" placeholder="Adicionar por @usuário ou nome" maxlength="50" autocomplete="off">
                <div class="circle-search-results hidden"></div>
            </div>
            <div class="circle-members"></div>
        `;

        const subtitle = header.querySelector(".circle-member-count");
        const toggle = header.querySelector(".circle-toggle");
        const deleteButton = header.querySelector(".circle-delete");
        const searchInput = panel.querySelector("input");
        const results = panel.querySelector(".circle-search-results");
        const membersHost = panel.querySelector(".circle-members");

        toggle.addEventListener("click", async function () {
            const opening = panel.classList.contains("hidden");
            panel.classList.toggle("hidden", !opening);
            toggle.textContent = opening ? "Fechar" : "Gerenciar";
            if (opening) await loadMembers(circle.id, membersHost, subtitle);
        });

        searchInput.addEventListener("input", function () {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(function () {
                searchProfiles(circle.id, searchInput.value, results, membersHost, subtitle);
            }, 220);
        });

        deleteButton.addEventListener("click", async function () {
            if (!confirm(`Excluir o círculo “${circle.name}”? As publicações ligadas a ele ficarão privadas e visíveis só para você.`)) return;
            deleteButton.disabled = true;

            // O RPC transforma em privado qualquer conteúdo ligado ao círculo
            // antes de excluir o grupo. Assim nada fica público por acidente.
            const { error } = await db.rpc(
                "vinci_delete_circle",
                { p_circle_id: circle.id }
            );

            if (error) {
                deleteButton.disabled = false;
                alert("Não foi possível excluir o círculo com segurança.");
                return;
            }
            await loadCircles();
        });

        card.append(header, panel);
        return card;
    }

    async function loadCircles() {
        list.innerHTML = '<div class="feature-loading">Carregando círculos...</div>';
        const { data, error } = await db
            .from("vinci_circles")
            .select("id, name, created_at")
            .eq("owner_id", currentUser.id)
            .order("created_at", { ascending: false });

        if (error) {
            list.innerHTML = '<div class="circle-empty">Não foi possível carregar seus círculos. Rode o SQL da versão 0.7 no Supabase.</div>';
            return;
        }

        const circles = data || [];
        count.textContent = String(circles.length);
        list.innerHTML = "";

        if (!circles.length) {
            list.innerHTML = '<div class="circle-card"><div class="circle-empty">Crie seu primeiro círculo para começar a controlar quem vê seus conteúdos.</div></div>';
            return;
        }

        circles.forEach(function (circle) { list.appendChild(renderCircle(circle)); });
    }

    createButton.addEventListener("click", async function () {
        const name = input.value.trim();
        if (!name) {
            setMessage("Dê um nome ao círculo.", true);
            input.focus();
            return;
        }
        createButton.disabled = true;
        setMessage("Criando círculo...", false);
        const { error } = await db.from("vinci_circles").insert({ owner_id: currentUser.id, name: name });
        createButton.disabled = false;
        if (error) {
            const duplicate = String(error.message || "").toLowerCase().includes("unique") || String(error.message || "").toLowerCase().includes("duplicate");
            setMessage(duplicate ? "Você já tem um círculo com esse nome." : "Não foi possível criar o círculo.", true);
            return;
        }
        input.value = "";
        setMessage("Círculo criado. ◎", false);
        await loadCircles();
    });

    input.addEventListener("keydown", function (event) {
        if (event.key === "Enter") createButton.click();
    });

    async function init() {
        const { data, error } = await db.auth.getUser();
        if (error || !data?.user) return;
        currentUser = data.user;
        await loadCircles();
    }

    init();
})();
