// =====================================
// VINCI — PHOTO REPLIES 1.1 / VINCI 0.7
// Respostas com permissão individual por @
// =====================================

(function () {

    "use strict";

    let currentUser = null;
    let observer = null;
    let scanScheduled = false;

    const DEFAULT_AVATAR =
        "assets/default-avatar.png";


    // =====================================
    // UTILIDADES
    // =====================================

    function formatReplyDate(value) {

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return new Intl.DateTimeFormat(
            "pt-BR",
            {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
            }
        ).format(date);

    }


    function normalizeSearch(value) {

        return String(value || "")
            .trim()
            .replace(/^@+/, "")
            .replace(/[,%()]/g, "")
            .slice(0, 50);

    }


    async function fetchProfiles(userIds) {

        const ids = Array.from(
            new Set(
                (userIds || []).filter(Boolean)
            )
        );

        if (ids.length === 0) {
            return new Map();
        }

        const {
            data,
            error
        } = await db
            .from("profiles")
            .select("id, username, name, avatar_url")
            .in("id", ids);

        if (error) {

            console.error(
                "Vinci Replies: erro ao carregar perfis:",
                error
            );

            return new Map();
        }

        return new Map(
            (data || []).map(
                function (profile) {
                    return [profile.id, profile];
                }
            )
        );

    }


    async function getReplyCount(postId) {

        const {
            count,
            error
        } = await db
            .from("post_replies")
            .select("id", {
                count: "exact",
                head: true
            })
            .eq("post_id", postId);

        if (error) {

            console.error(
                "Vinci Replies: erro ao contar respostas:",
                error
            );

            return 0;
        }

        return count || 0;

    }


    async function canCurrentUserReply(
        postId,
        postOwnerId
    ) {

        if (!currentUser) {
            return false;
        }

        if (currentUser.id === postOwnerId) {
            return true;
        }

        const {
            data,
            error
        } = await db
            .from("post_reply_permissions")
            .select("post_id")
            .eq("post_id", postId)
            .eq("user_id", currentUser.id)
            .maybeSingle();

        if (error) {

            console.error(
                "Vinci Replies: erro ao verificar permissão:",
                error
            );

            return false;
        }

        return Boolean(data);

    }


    function updateReplyCountEverywhere(
        postId,
        count
    ) {

        document
            .querySelectorAll(
                `.vinci-replies-shell[data-reply-post-id="${postId}"]`
            )
            .forEach(
                function (shell) {

                    const countElement =
                        shell.querySelector(
                            ".vinci-replies-count"
                        );

                    if (countElement) {

                        countElement.textContent =
                            count === 1
                                ? "1 resposta"
                                : `${count} respostas`;

                    }

                }
            );

    }


    // =====================================
    // LISTA DE RESPOSTAS
    // =====================================

    function createReplyItem(
        reply,
        profile,
        postOwnerId,
        reload
    ) {

        const item = document.createElement("article");

        item.className =
            "vinci-reply-item";

        item.dataset.replyId =
            reply.id;


        const avatar =
            document.createElement("img");

        avatar.className =
            "vinci-reply-avatar";

        avatar.src =
            profile?.avatar_url ||
            DEFAULT_AVATAR;

        avatar.alt = "";

        avatar.onerror =
            function () {

                this.src =
                    DEFAULT_AVATAR;

            };


        const body =
            document.createElement("div");

        body.className =
            "vinci-reply-body";


        const meta =
            document.createElement("div");

        meta.className =
            "vinci-reply-meta";


        const username =
            document.createElement("strong");

        username.textContent =
            `@${profile?.username || "usuario"}`;


        const date =
            document.createElement("time");

        date.textContent =
            formatReplyDate(
                reply.created_at
            );


        meta.appendChild(
            username
        );

        meta.appendChild(
            date
        );


        body.appendChild(
            meta
        );


        if (reply.content) {

            const content =
                document.createElement("p");

            content.className =
                "vinci-reply-text";

            content.textContent =
                reply.content;

            body.appendChild(
                content
            );

        }


        if (reply.image_url) {

            const replyImage =
                document.createElement("img");

            replyImage.className =
                "vinci-reply-image";

            replyImage.src =
                reply.image_url;

            replyImage.alt =
                "Fotografia enviada na resposta";

            replyImage.loading =
                "lazy";

            body.appendChild(
                replyImage
            );

        }


        item.appendChild(
            avatar
        );

        item.appendChild(
            body
        );


        const canDelete =
            currentUser &&
            (
                currentUser.id ===
                reply.user_id
                ||
                currentUser.id ===
                postOwnerId
            );


        if (canDelete) {

            const deleteButton =
                document.createElement(
                    "button"
                );

            deleteButton.type =
                "button";

            deleteButton.className =
                "vinci-reply-delete";

            deleteButton.setAttribute(
                "aria-label",
                "Excluir resposta"
            );

            deleteButton.textContent =
                "×";


            let confirming =
                false;

            let resetTimer =
                null;


            deleteButton.addEventListener(
                "click",
                async function () {

                    if (!confirming) {

                        confirming =
                            true;

                        deleteButton
                            .classList
                            .add(
                                "confirming"
                            );

                        deleteButton
                            .textContent =
                            "Excluir?";


                        clearTimeout(
                            resetTimer
                        );


                        resetTimer =
                            setTimeout(
                                function () {

                                    confirming =
                                        false;

                                    deleteButton
                                        .classList
                                        .remove(
                                            "confirming"
                                        );

                                    deleteButton
                                        .textContent =
                                        "×";

                                },
                                3500
                            );


                        return;

                    }


                    deleteButton.disabled =
                        true;


                    const {
                        error
                    } = await db
                        .from(
                            "post_replies"
                        )
                        .delete()
                        .eq(
                            "id",
                            reply.id
                        );


                    if (error) {

                        console.error(
                            "Vinci Replies: erro ao excluir resposta:",
                            error
                        );


                        deleteButton.disabled =
                            false;

                        deleteButton.textContent =
                            "×";

                        deleteButton
                            .classList
                            .remove(
                                "confirming"
                            );

                        confirming =
                            false;

                        return;

                    }


                    if (
                        reply.image_url &&
                        window.VinciReplyPhotos
                    ) {

                        await window.VinciReplyPhotos
                            .removeUrl(
                                reply.image_url
                            );

                    }


                    await reload();

                }
            );


            item.appendChild(
                deleteButton
            );

        }


        return item;

    }


    async function loadRepliesIntoPanel(
        panel,
        postId,
        postOwnerId
    ) {

        const list =
            panel.querySelector(
                ".vinci-replies-list"
            );


        if (!list) {

            return;

        }


        list.innerHTML = `
            <div class="vinci-replies-status">
                Carregando respostas...
            </div>
        `;


        const {
            data,
            error
        } = await db
            .from(
                "post_replies"
            )
            .select(
                "id, post_id, user_id, content, image_url, created_at"
            )
            .eq(
                "post_id",
                postId
            )
            .order(
                "created_at",
                {
                    ascending:
                        true
                }
            );


        if (error) {

            console.error(
                "Vinci Replies: erro ao carregar respostas:",
                error
            );


            list.innerHTML = `
                <div class="vinci-replies-status vinci-replies-error">
                    Não foi possível carregar as respostas.
                </div>
            `;

            return;

        }


        const replies =
            data || [];


        updateReplyCountEverywhere(
            postId,
            replies.length
        );


        if (
            replies.length === 0
        ) {

            list.innerHTML = `
                <div class="vinci-replies-status">
                    Nenhuma resposta ainda.
                </div>
            `;

            return;

        }


        const profiles =
            await fetchProfiles(
                replies.map(
                    function (
                        reply
                    ) {

                        return reply.user_id;

                    }
                )
            );


        list.innerHTML =
            "";


        const reload =
            function () {

                return loadRepliesIntoPanel(
                    panel,
                    postId,
                    postOwnerId
                );

            };


        replies.forEach(
            function (
                reply
            ) {

                list.appendChild(
                    createReplyItem(
                        reply,
                        profiles.get(
                            reply.user_id
                        ),
                        postOwnerId,
                        reload
                    )
                );

            }
        );

    }


    // =====================================
    // ESCREVER RESPOSTA
    // =====================================

    function setupComposer(
        panel,
        postId,
        postOwnerId
    ) {

        const form =
            panel.querySelector(
                ".vinci-reply-form"
            );


        if (!form) {

            return;

        }


        const textarea =
            form.querySelector(
                ".vinci-reply-input"
            );


        const counter =
            form.querySelector(
                ".vinci-reply-counter"
            );


        const submit =
            form.querySelector(
                ".vinci-reply-submit"
            );


        const message =
            form.querySelector(
                ".vinci-reply-message"
            );


        const photoInput =
            form.querySelector(
                ".vinci-reply-photo-input"
            );


        const photoButton =
            form.querySelector(
                ".vinci-reply-photo-button"
            );


        const photoRemove =
            form.querySelector(
                ".vinci-reply-photo-remove"
            );


        const previewWrap =
            form.querySelector(
                ".vinci-reply-photo-preview-wrap"
            );


        const preview =
            form.querySelector(
                ".vinci-reply-photo-preview"
            );


        let previewURL = null;


        function clearPhoto() {

            if (previewURL) {

                URL.revokeObjectURL(
                    previewURL
                );

                previewURL = null;

            }


            if (photoInput) {

                photoInput.value = "";

            }


            if (preview) {

                preview.src = "";

            }


            previewWrap
                ?.classList
                .add("hidden");

            photoRemove
                ?.classList
                .add("hidden");

        }


        textarea.addEventListener(
            "input",
            function () {

                counter.textContent =
                    `${textarea.value.length} / 500`;

            }
        );


        photoButton?.addEventListener(
            "click",
            function () {

                photoInput?.click();

            }
        );


        photoRemove?.addEventListener(
            "click",
            function () {

                clearPhoto();

                message.textContent = "";

            }
        );


        photoInput?.addEventListener(
            "change",
            function () {

                const file =
                    photoInput.files?.[0];


                if (!file) {

                    clearPhoto();

                    return;

                }


                const validation =
                    window.VinciReplyPhotos
                        ?.validate(file);


                if (
                    validation &&
                    !validation.ok
                ) {

                    message.textContent =
                        validation.message;

                    clearPhoto();

                    return;

                }


                if (previewURL) {

                    URL.revokeObjectURL(
                        previewURL
                    );

                }


                previewURL =
                    URL.createObjectURL(
                        file
                    );


                if (preview) {

                    preview.src =
                        previewURL;

                }


                previewWrap
                    ?.classList
                    .remove("hidden");

                photoRemove
                    ?.classList
                    .remove("hidden");

                message.textContent = "";

            }
        );


        form.addEventListener(
            "submit",
            async function (
                event
            ) {

                event.preventDefault();


                const content =
                    textarea
                        .value
                        .trim();


                const photoFile =
                    photoInput
                        ?.files
                        ?.[0] ||
                    null;


                if (
                    !content &&
                    !photoFile
                ) {

                    message.textContent =
                        "Escreva uma resposta ou escolha uma foto.";

                    return;

                }


                submit.disabled =
                    true;

                textarea.disabled =
                    true;

                if (photoButton) {

                    photoButton.disabled =
                        true;

                }

                if (photoRemove) {

                    photoRemove.disabled =
                        true;

                }


                message.textContent =
                    photoFile
                        ? "Enviando fotografia..."
                        : "Enviando resposta...";


                let uploaded =
                    null;


                try {

                    if (photoFile) {

                        if (!window.VinciReplyPhotos) {

                            throw new Error(
                                "Sistema de fotos indisponível."
                            );

                        }


                        uploaded =
                            await window
                                .VinciReplyPhotos
                                .upload(
                                    photoFile,
                                    currentUser.id
                                );

                    }


                    const {
                        error
                    } = await db
                        .from(
                            "post_replies"
                        )
                        .insert({

                            post_id:
                                postId,

                            user_id:
                                currentUser.id,

                            content:
                                content || null,

                            image_url:
                                uploaded?.url || null

                        });


                    if (error) {

                        throw error;

                    }


                    textarea.value =
                        "";

                    counter.textContent =
                        "0 / 500";

                    clearPhoto();

                    message.textContent =
                        "";


                    await loadRepliesIntoPanel(
                        panel,
                        postId,
                        postOwnerId
                    );

                }

                catch (error) {

                    console.error(
                        "Vinci Replies: erro ao responder:",
                        error
                    );


                    if (
                        uploaded?.path &&
                        window.VinciReplyPhotos
                    ) {

                        await window
                            .VinciReplyPhotos
                            .removePath(
                                uploaded.path
                            );

                    }


                    const text =
                        String(
                            error?.message ||
                            ""
                        );


                    message.textContent =
                        text.includes("permission") ||
                        text.includes("policy") ||
                        text.includes("row-level")
                            ? "Você não tem permissão para responder esta publicação."
                            : (text || "Não foi possível enviar a resposta.");

                }

                finally {

                    submit.disabled =
                        false;

                    textarea.disabled =
                        false;

                    if (photoButton) {

                        photoButton.disabled =
                            false;

                    }

                    if (photoRemove) {

                        photoRemove.disabled =
                            false;

                    }

                }

            }
        );

    }


    // =====================================
    // GERENCIAR PERMISSÕES — AUTOR
    // =====================================

    async function loadPermissionManager(
        manager,
        postId
    ) {

        const selected =
            manager.querySelector(
                ".vinci-permission-selected"
            );


        const searchInput =
            manager.querySelector(
                ".vinci-permission-search-input"
            );


        const results =
            manager.querySelector(
                ".vinci-permission-search-results"
            );


        const status =
            manager.querySelector(
                ".vinci-permission-status"
            );


        if (
            !selected ||
            !searchInput ||
            !results ||
            !status
        ) {

            return;

        }


        let allowedUsers =
            new Map();


        let timer =
            null;


        let sequence =
            0;


        // =================================
        // MOSTRAR USUÁRIOS AUTORIZADOS
        // =================================

        function renderAllowed() {

            selected.innerHTML =
                "";


            if (
                allowedUsers.size === 0
            ) {

                const empty =
                    document.createElement(
                        "p"
                    );

                empty.className =
                    "vinci-permission-empty";

                empty.textContent =
                    "Nenhuma pessoa adicionada. Só você pode responder.";


                selected.appendChild(
                    empty
                );

                return;

            }


            allowedUsers.forEach(
                function (
                    profile
                ) {

                    const row =
                        document.createElement(
                            "div"
                        );

                    row.className =
                        "vinci-permission-user";


                    const avatar =
                        document.createElement(
                            "img"
                        );

                    avatar.src =
                        profile.avatar_url ||
                        DEFAULT_AVATAR;

                    avatar.alt =
                        "";

                    avatar.onerror =
                        function () {

                            this.src =
                                DEFAULT_AVATAR;

                        };


                    const info =
                        document.createElement(
                            "div"
                        );


                    const username =
                        document.createElement(
                            "strong"
                        );

                    username.textContent =
                        `@${profile.username || "usuario"}`;


                    const name =
                        document.createElement(
                            "span"
                        );

                    name.textContent =
                        profile.name ||
                        "";


                    info.appendChild(
                        username
                    );


                    if (
                        profile.name
                    ) {

                        info.appendChild(
                            name
                        );

                    }


                    const remove =
                        document.createElement(
                            "button"
                        );

                    remove.type =
                        "button";

                    remove.className =
                        "vinci-permission-remove";

                    remove.textContent =
                        "×";

                    remove.setAttribute(
                        "aria-label",
                        `Remover @${profile.username || "usuario"}`
                    );


                    remove.addEventListener(
                        "click",
                        async function () {

                            remove.disabled =
                                true;


                            const {
                                error
                            } = await db
                                .from(
                                    "post_reply_permissions"
                                )
                                .delete()
                                .eq(
                                    "post_id",
                                    postId
                                )
                                .eq(
                                    "user_id",
                                    profile.id
                                );


                            if (error) {

                                console.error(
                                    "Vinci Replies: erro ao remover permissão:",
                                    error
                                );


                                status.textContent =
                                    "Não foi possível remover essa pessoa.";

                                remove.disabled =
                                    false;

                                return;

                            }


                            allowedUsers.delete(
                                profile.id
                            );


                            status.textContent =
                                `@${profile.username || "usuario"} não pode mais responder.`;


                            renderAllowed();

                        }
                    );


                    row.appendChild(
                        avatar
                    );

                    row.appendChild(
                        info
                    );

                    row.appendChild(
                        remove
                    );


                    selected.appendChild(
                        row
                    );

                }
            );

        }


        // =================================
        // CARREGAR PERMISSÕES
        // =================================

        async function loadCurrentPermissions() {

            status.textContent =
                "Carregando pessoas autorizadas...";


            const {
                data,
                error
            } = await db
                .from(
                    "post_reply_permissions"
                )
                .select(
                    "user_id"
                )
                .eq(
                    "post_id",
                    postId
                );


            if (error) {

                console.error(
                    "Vinci Replies: erro ao carregar permissões:",
                    error
                );


                status.textContent =
                    "Não foi possível carregar as permissões.";

                return;

            }


            const ids =
                (data || [])
                    .map(
                        function (
                            row
                        ) {

                            return row.user_id;

                        }
                    );


            const profileMap =
                await fetchProfiles(
                    ids
                );


            allowedUsers =
                profileMap;


            status.textContent =
                "";


            renderAllowed();

        }


        // =================================
        // ADICIONAR PERMISSÃO
        // =================================

        async function addPermission(
            profile
        ) {

            if (
                !profile?.id ||
                profile.id ===
                    currentUser.id ||
                allowedUsers.has(
                    profile.id
                )
            ) {

                return;

            }


            status.textContent =
                `Liberando @${profile.username || "usuario"}...`;


            const {
                error
            } = await db
                .from(
                    "post_reply_permissions"
                )
                .insert({

                    post_id:
                        postId,

                    user_id:
                        profile.id

                });


            if (error) {

                console.error(
                    "Vinci Replies: erro ao adicionar permissão:",
                    error
                );


                status.textContent =
                    "Não foi possível adicionar essa pessoa.";

                return;

            }


            allowedUsers.set(
                profile.id,
                profile
            );


            searchInput.value =
                "";


            results.innerHTML =
                "";


            results.classList.add(
                "hidden"
            );


            status.textContent =
                `@${profile.username || "usuario"} agora pode responder.`;


            renderAllowed();

        }


        // =================================
        // RESULTADOS DA PESQUISA
        // =================================

        function renderSearchResults(
            profiles
        ) {

            results.innerHTML =
                "";


            const filtered =
                (profiles || [])
                    .filter(
                        function (
                            profile
                        ) {

                            return (
                                profile.id !==
                                    currentUser.id
                                &&
                                !allowedUsers.has(
                                    profile.id
                                )
                            );

                        }
                    );


            if (
                filtered.length === 0
            ) {

                const empty =
                    document.createElement(
                        "div"
                    );

                empty.className =
                    "vinci-permission-search-empty";

                empty.textContent =
                    "Nenhum usuário encontrado.";


                results.appendChild(
                    empty
                );


                results.classList.remove(
                    "hidden"
                );

                return;

            }


            filtered.forEach(
                function (
                    profile
                ) {

                    const button =
                        document.createElement(
                            "button"
                        );

                    button.type =
                        "button";

                    button.className =
                        "vinci-permission-search-result";


                    const avatar =
                        document.createElement(
                            "img"
                        );

                    avatar.src =
                        profile.avatar_url ||
                        DEFAULT_AVATAR;

                    avatar.alt =
                        "";

                    avatar.onerror =
                        function () {

                            this.src =
                                DEFAULT_AVATAR;

                        };


                    const info =
                        document.createElement(
                            "div"
                        );


                    const username =
                        document.createElement(
                            "strong"
                        );

                    username.textContent =
                        `@${profile.username || "usuario"}`;


                    const name =
                        document.createElement(
                            "span"
                        );

                    name.textContent =
                        profile.name ||
                        "";


                    info.appendChild(
                        username
                    );


                    if (
                        profile.name
                    ) {

                        info.appendChild(
                            name
                        );

                    }


                    const add =
                        document.createElement(
                            "span"
                        );

                    add.textContent =
                        "+";


                    button.appendChild(
                        avatar
                    );

                    button.appendChild(
                        info
                    );

                    button.appendChild(
                        add
                    );


                    button.addEventListener(
                        "click",
                        function () {

                            addPermission(
                                profile
                            );

                        }
                    );


                    results.appendChild(
                        button
                    );

                }
            );


            results.classList.remove(
                "hidden"
            );

        }


        // =================================
        // PESQUISAR USUÁRIOS
        // =================================

        async function searchUsers(
            rawValue
        ) {

            const query =
                normalizeSearch(
                    rawValue
                );


            if (!query) {

                results.innerHTML =
                    "";

                results.classList.add(
                    "hidden"
                );

                return;

            }


            const thisSequence =
                ++sequence;


            results.innerHTML = `
                <div class="vinci-permission-search-empty">
                    Procurando pessoas...
                </div>
            `;


            results.classList.remove(
                "hidden"
            );


            const {
                data,
                error
            } = await db
                .from(
                    "profiles"
                )
                .select(
                    "id, username, name, avatar_url"
                )
                .or(
                    `username.ilike.%${query}%,name.ilike.%${query}%`
                )
                .limit(
                    10
                );


            if (
                thisSequence !==
                sequence
            ) {

                return;

            }


            if (error) {

                console.error(
                    "Vinci Replies: erro na busca de permissões:",
                    error
                );


                results.innerHTML = `
                    <div class="vinci-permission-search-empty">
                        Não foi possível pesquisar agora.
                    </div>
                `;


                results.classList.remove(
                    "hidden"
                );

                return;

            }


            renderSearchResults(
                data || []
            );

        }


        searchInput.addEventListener(
            "input",
            function () {

                clearTimeout(
                    timer
                );


                timer =
                    setTimeout(
                        function () {

                            searchUsers(
                                searchInput.value
                            );

                        },
                        220
                    );

            }
        );


        searchInput.addEventListener(
            "keydown",
            function (
                event
            ) {

                if (
                    event.key ===
                    "Enter"
                ) {

                    const firstResult =
                        results.querySelector(
                            ".vinci-permission-search-result"
                        );


                    if (
                        firstResult
                    ) {

                        event.preventDefault();

                        firstResult.click();

                    }


                    return;

                }


                if (
                    event.key ===
                    "Escape"
                ) {

                    results.classList.add(
                        "hidden"
                    );

                }

            }
        );


        await loadCurrentPermissions();

    }


    // =====================================
    // PAINEL DE RESPOSTAS
    // =====================================

    async function buildPanel(
        shell,
        postId,
        postOwnerId,
        canReply
    ) {

        const panel =
            document.createElement(
                "section"
            );


        panel.className =
            "vinci-replies-panel hidden";


        const isOwner =
            currentUser?.id ===
            postOwnerId;


        // =================================
        // CABEÇALHO
        // =================================

        const header =
            document.createElement(
                "div"
            );


        header.className =
            "vinci-replies-header";


        const title =
            document.createElement(
                "strong"
            );


        title.textContent =
            "Respostas";


        header.appendChild(
            title
        );


        let manageButton =
            null;


        let manager =
            null;


        if (isOwner) {

            manageButton =
                document.createElement(
                    "button"
                );


            manageButton.type =
                "button";


            manageButton.className =
                "vinci-manage-replies-button";


            manageButton.textContent =
                "Gerenciar quem pode responder";


            header.appendChild(
                manageButton
            );

        }


        // =================================
        // LISTA
        // =================================

        const list =
            document.createElement(
                "div"
            );


        list.className =
            "vinci-replies-list";


        panel.appendChild(
            header
        );


        panel.appendChild(
            list
        );


        // =================================
        // COMPOSITOR / AVISO
        // =================================

        if (canReply) {

            const form =
                document.createElement(
                    "form"
                );


            form.className =
                "vinci-reply-form";


            const textarea =
                document.createElement(
                    "textarea"
                );


            textarea.className =
                "vinci-reply-input";


            textarea.maxLength =
                500;


            textarea.placeholder =
                "Escreva uma resposta...";


            textarea.setAttribute(
                "aria-label",
                "Escrever resposta"
            );


            const footer =
                document.createElement(
                    "div"
                );


            footer.className =
                "vinci-reply-form-footer";


            const counter =
                document.createElement(
                    "span"
                );


            counter.className =
                "vinci-reply-counter";


            counter.textContent =
                "0 / 500";


            const submit =
                document.createElement(
                    "button"
                );


            submit.type =
                "submit";


            submit.className =
                "vinci-reply-submit";


            submit.textContent =
                "Responder";


            const message =
                document.createElement(
                    "p"
                );


            message.className =
                "vinci-reply-message";


            const photoTools =
                document.createElement(
                    "div"
                );


            photoTools.className =
                "vinci-reply-photo-tools";


            const photoButton =
                document.createElement(
                    "button"
                );


            photoButton.type =
                "button";

            photoButton.className =
                "vinci-reply-photo-button";

            photoButton.textContent =
                "📷 Foto";


            const photoRemove =
                document.createElement(
                    "button"
                );


            photoRemove.type =
                "button";

            photoRemove.className =
                "vinci-reply-photo-remove hidden";

            photoRemove.textContent =
                "Remover foto";


            const photoInput =
                document.createElement(
                    "input"
                );


            photoInput.type =
                "file";

            photoInput.accept =
                "image/jpeg,image/png,image/webp";

            photoInput.className =
                "vinci-reply-photo-input";

            photoInput.hidden =
                true;


            const previewWrap =
                document.createElement(
                    "div"
                );


            previewWrap.className =
                "vinci-reply-photo-preview-wrap hidden";


            const preview =
                document.createElement(
                    "img"
                );


            preview.className =
                "vinci-reply-photo-preview";

            preview.alt =
                "Prévia da fotografia da resposta";


            previewWrap.appendChild(
                preview
            );


            photoTools.appendChild(
                photoButton
            );

            photoTools.appendChild(
                photoRemove
            );

            photoTools.appendChild(
                photoInput
            );


            footer.appendChild(
                counter
            );


            footer.appendChild(
                submit
            );


            form.appendChild(
                textarea
            );


            form.appendChild(
                photoTools
            );


            form.appendChild(
                previewWrap
            );


            form.appendChild(
                footer
            );


            form.appendChild(
                message
            );


            panel.appendChild(
                form
            );

        }

        else {

            const locked =
                document.createElement(
                    "div"
                );


            locked.className =
                "vinci-replies-locked";


            locked.innerHTML = `
                <span>Privado</span>

                <p>
                    O autor não liberou respostas para você nesta publicação.
                </p>
            `;


            panel.appendChild(
                locked
            );

        }


        // =================================
        // GERENCIADOR DO AUTOR
        // =================================

        if (isOwner) {

            manager =
                document.createElement(
                    "section"
                );


            manager.className =
                "vinci-permission-manager hidden";


            manager.innerHTML = `

                <div class="vinci-permission-manager-head">

                    <strong>
                        Quem pode responder
                    </strong>

                    <span>
                        Você sempre pode responder às suas próprias publicações.
                    </span>

                </div>


                <div class="vinci-permission-search">

                    <span>
                        @
                    </span>

                    <input
                        type="search"
                        class="vinci-permission-search-input"
                        placeholder="Adicionar usuário"
                        autocomplete="off"
                        autocapitalize="none"
                        spellcheck="false"
                        maxlength="50"
                    >

                    <div
                        class="vinci-permission-search-results hidden"
                    ></div>

                </div>


                <div
                    class="vinci-permission-selected"
                ></div>


                <p
                    class="vinci-permission-status"
                ></p>

            `;


            // =================================
            // CORREÇÃO IMPORTANTE
            // =================================
            //
            // O gerenciador agora entra
            // IMEDIATAMENTE DEPOIS DO CABEÇALHO.
            //
            // Antes ele ficava no final do painel,
            // então parecia que o botão não abria nada.
            // =================================

            header.insertAdjacentElement(
                "afterend",
                manager
            );


            manageButton.setAttribute(
                "aria-expanded",
                "false"
            );


            let managerLoaded =
                false;


            manageButton.addEventListener(
                "click",
                async function (
                    event
                ) {

                    event.preventDefault();

                    event.stopPropagation();


                    const opening =
                        manager.classList.contains(
                            "hidden"
                        );


                    manager.classList.toggle(
                        "hidden",
                        !opening
                    );


                    manageButton
                        .classList
                        .toggle(
                            "active",
                            opening
                        );


                    manageButton.setAttribute(
                        "aria-expanded",
                        opening
                            ? "true"
                            : "false"
                    );


                    manageButton.textContent =
                        opening
                            ? "Fechar gerenciamento"
                            : "Gerenciar quem pode responder";


                    // =========================
                    // CARREGA SOMENTE AO ABRIR
                    // =========================

                    if (
                        opening &&
                        !managerLoaded
                    ) {

                        managerLoaded =
                            true;


                        try {

                            await loadPermissionManager(
                                manager,
                                postId
                            );

                        }

                        catch (
                            error
                        ) {

                            managerLoaded =
                                false;


                            console.error(
                                "Vinci Replies: erro ao abrir gerenciamento:",
                                error
                            );


                            const status =
                                manager.querySelector(
                                    ".vinci-permission-status"
                                );


                            if (
                                status
                            ) {

                                status.textContent =
                                    "Não foi possível carregar o gerenciamento agora.";

                            }

                        }

                    }


                    // =========================
                    // GARANTE QUE APAREÇA
                    // NA TELA
                    // =========================

                    if (opening) {

                        requestAnimationFrame(
                            function () {

                                manager.scrollIntoView({

                                    behavior:
                                        "smooth",

                                    block:
                                        "nearest"

                                });


                                const input =
                                    manager.querySelector(
                                        ".vinci-permission-search-input"
                                    );


                                input?.focus({

                                    preventScroll:
                                        true

                                });

                            }
                        );

                    }

                }
            );

        }


        shell.appendChild(
            panel
        );


        setupComposer(
            panel,
            postId,
            postOwnerId
        );


        await loadRepliesIntoPanel(
            panel,
            postId,
            postOwnerId
        );


        return panel;

    }


    // =====================================
    // ADICIONAR CONTROLE A UMA FOTO
    // =====================================

    async function createReplyControl(
        host,
        postId,
        postOwnerId,
        mode
    ) {

        if (
            !postId ||
            !postOwnerId ||
            host.dataset.repliesReady ===
                "true"
        ) {

            return;

        }


        host.dataset.repliesReady =
            "true";


        const shell =
            document.createElement(
                "div"
            );


        shell.className =
            "vinci-replies-shell";


        shell.dataset.replyPostId =
            postId;


        shell.dataset.replyMode =
            mode;


        // =================================
        // BOTÃO PRINCIPAL
        // =================================

        const toggle =
            document.createElement(
                "button"
            );


        toggle.type =
            "button";


        toggle.className =
            "vinci-replies-toggle";


        toggle.setAttribute(
            "aria-expanded",
            "false"
        );


        const icon =
            document.createElement(
                "span"
            );


        icon.className =
            "vinci-replies-icon";


        icon.textContent =
            "↩";


        const count =
            document.createElement(
                "span"
            );


        count.className =
            "vinci-replies-count";


        count.textContent =
            "Respostas";


        const access =
            document.createElement(
                "span"
            );


        access.className =
            "vinci-replies-access";


        access.textContent =
            "Ver";


        toggle.appendChild(
            icon
        );


        toggle.appendChild(
            count
        );


        toggle.appendChild(
            access
        );


        shell.appendChild(
            toggle
        );


        // =================================
        // POSICIONAR
        // =================================

        if (
            mode ===
            "feed"
        ) {

            const content =
                host.querySelector(
                    ".post-content"
                );


            if (content) {

                content.appendChild(
                    shell
                );

            }

            else {

                host.appendChild(
                    shell
                );

            }

        }

        else {

            const viewerContent =
                host.querySelector(
                    ".post-viewer-content"
                );


            if (
                viewerContent
            ) {

                viewerContent.appendChild(
                    shell
                );

            }

            else {

                host.appendChild(
                    shell
                );

            }

        }


        // =================================
        // PERMISSÃO + CONTADOR
        // =================================

        const [
            allowed,
            replyCount
        ] = await Promise.all([

            canCurrentUserReply(
                postId,
                postOwnerId
            ),

            getReplyCount(
                postId
            )

        ]);


        count.textContent =
            replyCount === 1
                ? "1 resposta"
                : `${replyCount} respostas`;


        access.textContent =
            allowed
                ? "Responder"
                : "Respostas restritas";


        access.classList.toggle(
            "restricted",
            !allowed
        );


        let panel =
            null;


        let loadingPanel =
            false;


        // =================================
        // ABRIR RESPOSTAS
        // =================================

        toggle.addEventListener(
            "click",
            async function (
                event
            ) {

                event.preventDefault();

                event.stopPropagation();


                if (
                    loadingPanel
                ) {

                    return;

                }


                if (!panel) {

                    loadingPanel =
                        true;


                    toggle.disabled =
                        true;


                    try {

                        panel =
                            await buildPanel(
                                shell,
                                postId,
                                postOwnerId,
                                allowed
                            );

                    }

                    catch (
                        error
                    ) {

                        console.error(
                            "Vinci Replies: erro ao criar painel:",
                            error
                        );

                    }

                    finally {

                        loadingPanel =
                            false;

                        toggle.disabled =
                            false;

                    }

                }


                if (!panel) {

                    return;

                }


                const opening =
                    panel
                        .classList
                        .contains(
                            "hidden"
                        );


                panel.classList.toggle(
                    "hidden",
                    !opening
                );


                toggle.classList.toggle(
                    "open",
                    opening
                );


                toggle.setAttribute(
                    "aria-expanded",
                    opening
                        ? "true"
                        : "false"
                );

            }
        );


        shell.addEventListener(
            "click",
            function (
                event
            ) {

                event.stopPropagation();

            }
        );

    }


    // =====================================
    // ESCANEAR FEED / VISUALIZADOR
    // =====================================

    function scanReplyElements() {

        // =================================
        // FEED
        // =================================

        document
            .querySelectorAll(
                ".vinci-post"
            )
            .forEach(
                function (
                    post
                ) {

                    createReplyControl(
                        post,
                        post.dataset.postId,
                        post.dataset.userId,
                        "feed"
                    );

                }
            );


        // =================================
        // VISUALIZADOR DO PERFIL
        // =================================

        document
            .querySelectorAll(
                "#postViewer[data-post-id][data-user-id]"
            )
            .forEach(
                function (
                    viewer
                ) {

                    createReplyControl(
                        viewer,
                        viewer.dataset.postId,
                        viewer.dataset.userId,
                        "viewer"
                    );

                }
            );

    }


    // =====================================
    // ESCANEAMENTO OTIMIZADO
    // =====================================

    function scheduleScan() {

        if (
            scanScheduled
        ) {

            return;

        }


        scanScheduled =
            true;


        queueMicrotask(
            function () {

                scanScheduled =
                    false;


                scanReplyElements();

            }
        );

    }


    // =====================================
    // OBSERVADOR
    // =====================================

    function startObserver() {

        observer =
            new MutationObserver(
                scheduleScan
            );


        observer.observe(
            document.body,
            {

                childList:
                    true,

                subtree:
                    true

            }
        );

    }


    // =====================================
    // INICIAR
    // =====================================

    async function init() {

        try {

            const {
                data,
                error
            } = await db
                .auth
                .getUser();


            if (error) {

                throw error;

            }


            currentUser =
                data.user ||
                null;


            if (
                !currentUser
            ) {

                return;

            }


            startObserver();

            scanReplyElements();


            console.log(
                "VINCI — PHOTO REPLIES 1.0 ATIVO ✓"
            );

        }

        catch (
            error
        ) {

            console.error(
                "Vinci Replies: erro ao iniciar sistema:",
                error
            );

        }

    }


    init();

})();