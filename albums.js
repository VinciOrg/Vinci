// =====================================
// VINCI 0.7 — ÁLBUNS
// =====================================
(function () {
    "use strict";

    const grid = document.getElementById("albumsGrid");
    const newButton = document.getElementById("newAlbumButton");
    const createPanel = document.getElementById("albumCreatePanel");
    const titleInput = document.getElementById("albumTitle");
    const descriptionInput = document.getElementById("albumDescription");
    const saveButton = document.getElementById("saveAlbum");
    const cancelButton = document.getElementById("cancelAlbum");
    const message = document.getElementById("albumMessage");
    const username = document.getElementById("albumsUsername");
    const back = document.getElementById("albumsBack");

    const viewer = document.getElementById("albumViewer");
    const viewerTitle = document.getElementById("viewerAlbumTitle");
    const viewerDescription = document.getElementById("viewerAlbumDescription");
    const viewerPhotos = document.getElementById("albumPhotos");
    const closeViewer = document.getElementById("closeAlbumViewer");
    const ownerActions = document.getElementById("albumOwnerActions");
    const addPhotosButton = document.getElementById("addPhotosToAlbum");
    const deleteAlbumButton = document.getElementById("deleteAlbum");

    const picker = document.getElementById("albumPicker");
    const pickerGrid = document.getElementById("albumPickerGrid");
    const closePicker = document.getElementById("closeAlbumPicker");

    let currentUser = null;
    let profileId = null;
    let ownProfile = false;
    let activeAlbum = null;
    let activeAlbumPostIds = new Set();

    function escapeHTML(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    back?.addEventListener("click", function () {
        const target = profileId ? `profile.html?id=${encodeURIComponent(profileId)}` : "profile.html";
        history.length > 1 ? history.back() : location.assign(target);
    });

    async function loadProfile() {
        const { data } = await db.from("profiles").select("username, name").eq("id", profileId).maybeSingle();
        username.textContent = `@${data?.username || "usuario"}`;
        document.title = `Álbuns de @${data?.username || "usuario"} — Vinci`;
    }

    async function getCover(albumId) {
        const { data } = await db
            .from("vinci_album_posts")
            .select("post_id, posts(image_url)")
            .eq("album_id", albumId)
            .order("position", { ascending: true })
            .order("added_at", { ascending: true })
            .limit(1)
            .maybeSingle();
        return data?.posts?.image_url || null;
    }

    async function getAlbumCount(albumId) {
        const { count } = await db
            .from("vinci_album_posts")
            .select("post_id", { count: "exact", head: true })
            .eq("album_id", albumId);
        return count || 0;
    }

    async function loadAlbums() {
        grid.innerHTML = '<div class="albums-state">Carregando álbuns...</div>';
        const { data, error } = await db
            .from("vinci_albums")
            .select("id, user_id, title, description, created_at")
            .eq("user_id", profileId)
            .order("created_at", { ascending: false });

        if (error) {
            grid.innerHTML = '<div class="albums-state">Não foi possível carregar os álbuns. Rode o SQL do Vinci 0.7 no Supabase.</div>';
            return;
        }

        const albums = data || [];
        if (!albums.length) {
            grid.innerHTML = `<div class="albums-state">${ownProfile ? "Você ainda não criou nenhum álbum." : "Este perfil ainda não criou álbuns."}</div>`;
            return;
        }

        const details = await Promise.all(albums.map(async function (album) {
            const [cover, count] = await Promise.all([getCover(album.id), getAlbumCount(album.id)]);
            return { album, cover, count };
        }));

        grid.innerHTML = "";
        details.forEach(function ({ album, cover, count }) {
            const card = document.createElement("article");
            card.className = "album-card";
            card.tabIndex = 0;
            card.innerHTML = `
                <div class="album-cover">${cover ? `<img src="${escapeHTML(cover)}" alt="">` : "▧"}</div>
                <div class="album-card-body">
                    <strong>${escapeHTML(album.title)}</strong>
                    <span>${count === 1 ? "1 fotografia" : `${count} fotografias`}</span>
                </div>
            `;
            const open = function () { openAlbum(album); };
            card.addEventListener("click", open);
            card.addEventListener("keydown", function (event) {
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
            });
            grid.appendChild(card);
        });
    }

    async function loadAlbumPhotos() {
        viewerPhotos.innerHTML = '<div class="albums-state">Carregando fotografias...</div>';
        const { data, error } = await db
            .from("vinci_album_posts")
            .select("post_id, position, added_at, posts(id, image_url, caption, created_at)")
            .eq("album_id", activeAlbum.id)
            .order("position", { ascending: true })
            .order("added_at", { ascending: true });

        if (error) {
            viewerPhotos.innerHTML = '<div class="albums-state">Não foi possível carregar este álbum.</div>';
            return;
        }

        const rows = (data || []).filter(function (row) { return row.posts; });
        activeAlbumPostIds = new Set(rows.map(function (row) { return row.post_id; }));
        if (!rows.length) {
            viewerPhotos.innerHTML = `<div class="albums-state">${ownProfile ? "Este álbum está vazio. Use “Adicionar fotos”." : "Este álbum está vazio."}</div>`;
            return;
        }

        viewerPhotos.innerHTML = "";
        rows.forEach(function (row) {
            const cell = document.createElement("div");
            cell.className = "album-photo";
            cell.innerHTML = `<img src="${escapeHTML(row.posts.image_url)}" alt="${escapeHTML(row.posts.caption || "Fotografia")}">`;
            if (ownProfile) {
                const remove = document.createElement("button");
                remove.type = "button";
                remove.className = "album-remove-photo";
                remove.textContent = "×";
                remove.setAttribute("aria-label", "Remover do álbum");
                remove.addEventListener("click", async function (event) {
                    event.stopPropagation();
                    remove.disabled = true;
                    const { error: removeError } = await db
                        .from("vinci_album_posts")
                        .delete()
                        .eq("album_id", activeAlbum.id)
                        .eq("post_id", row.post_id);
                    if (removeError) { remove.disabled = false; return; }
                    await loadAlbumPhotos();
                    await loadAlbums();
                });
                cell.appendChild(remove);
            }
            viewerPhotos.appendChild(cell);
        });
    }

    async function openAlbum(album) {
        activeAlbum = album;
        viewerTitle.textContent = album.title;
        viewerDescription.textContent = album.description || "";
        ownerActions.classList.toggle("hidden", !ownProfile);
        viewer.classList.remove("hidden");
        viewer.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        await loadAlbumPhotos();
    }

    function hideViewer() {
        viewer.classList.add("hidden");
        viewer.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        activeAlbum = null;
    }

    closeViewer.addEventListener("click", hideViewer);
    viewer.addEventListener("click", function (event) { if (event.target === viewer) hideViewer(); });

    async function openPicker() {
        if (!activeAlbum || !ownProfile) return;
        picker.classList.remove("hidden");
        picker.setAttribute("aria-hidden", "false");
        pickerGrid.innerHTML = '<div class="albums-state">Carregando suas fotografias...</div>';

        const { data, error } = await db
            .from("posts")
            .select("id, image_url, caption")
            .eq("user_id", currentUser.id)
            .order("created_at", { ascending: false });

        if (error) {
            pickerGrid.innerHTML = '<div class="albums-state">Não foi possível carregar suas fotografias.</div>';
            return;
        }

        const posts = data || [];
        if (!posts.length) {
            pickerGrid.innerHTML = '<div class="albums-state">Você ainda não publicou fotografias.</div>';
            return;
        }

        pickerGrid.innerHTML = "";
        posts.forEach(function (post) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `album-picker-photo${activeAlbumPostIds.has(post.id) ? " selected" : ""}`;
            button.innerHTML = `<img src="${escapeHTML(post.image_url)}" alt="${escapeHTML(post.caption || "Fotografia")}">`;
            button.addEventListener("click", async function () {
                button.disabled = true;
                const already = activeAlbumPostIds.has(post.id);
                let result;
                if (already) {
                    result = await db.from("vinci_album_posts").delete().eq("album_id", activeAlbum.id).eq("post_id", post.id);
                    if (!result.error) activeAlbumPostIds.delete(post.id);
                } else {
                    result = await db.from("vinci_album_posts").insert({ album_id: activeAlbum.id, post_id: post.id, position: activeAlbumPostIds.size });
                    if (!result.error) activeAlbumPostIds.add(post.id);
                }
                button.disabled = false;
                if (result.error) return;
                button.classList.toggle("selected", activeAlbumPostIds.has(post.id));
                await loadAlbumPhotos();
                await loadAlbums();
            });
            pickerGrid.appendChild(button);
        });
    }

    addPhotosButton.addEventListener("click", openPicker);
    closePicker.addEventListener("click", function () { picker.classList.add("hidden"); picker.setAttribute("aria-hidden", "true"); });
    picker.addEventListener("click", function (event) { if (event.target === picker) closePicker.click(); });

    newButton.addEventListener("click", function () {
        createPanel.classList.remove("hidden");
        titleInput.focus();
    });
    cancelButton.addEventListener("click", function () {
        createPanel.classList.add("hidden");
        titleInput.value = "";
        descriptionInput.value = "";
        message.textContent = "";
    });
    saveButton.addEventListener("click", async function () {
        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();
        if (!title) { message.textContent = "Dê um título ao álbum."; titleInput.focus(); return; }
        saveButton.disabled = true;
        message.textContent = "Criando álbum...";
        const { error } = await db.from("vinci_albums").insert({ user_id: currentUser.id, title, description });
        saveButton.disabled = false;
        if (error) { message.textContent = "Não foi possível criar o álbum."; return; }
        cancelButton.click();
        await loadAlbums();
    });

    deleteAlbumButton.addEventListener("click", async function () {
        if (!activeAlbum || !confirm(`Excluir o álbum “${activeAlbum.title}”? As fotografias não serão apagadas.`)) return;
        deleteAlbumButton.disabled = true;
        const { error } = await db.from("vinci_albums").delete().eq("id", activeAlbum.id);
        deleteAlbumButton.disabled = false;
        if (error) return;
        hideViewer();
        await loadAlbums();
    });

    async function init() {
        const { data, error } = await db.auth.getUser();
        if (error || !data?.user) return;
        currentUser = data.user;
        const params = new URLSearchParams(location.search);
        profileId = params.get("id") || currentUser.id;
        ownProfile = profileId === currentUser.id;
        newButton.classList.toggle("hidden", !ownProfile);
        await Promise.all([loadProfile(), loadAlbums()]);
    }

    init();
})();
