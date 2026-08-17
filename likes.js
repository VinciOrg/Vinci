// =====================================
// VINCI — LIKES SYSTEM 1.0
// =====================================


let vinciLikesUser = null;


// =====================================
// CARREGAR USUÁRIO
// =====================================

async function loadLikesUser() {

    const {
        data,
        error
    } = await db.auth.getUser();


    if (
        error ||
        !data?.user
    ) {

        console.error(
            "VINCI LIKES — usuário não autenticado:",
            error
        );

        return false;

    }


    vinciLikesUser =
        data.user;


    return true;

}


// =====================================
// CONFIGURAÇÃO DO TIPO
// =====================================

function getLikeConfig(
    type
) {

    if (
        type === "photo"
    ) {

        return {

            table:
                "post_likes",

            column:
                "post_id"

        };

    }


    if (
        type === "text"
    ) {

        return {

            table:
                "profile_post_likes",

            column:
                "profile_post_id"

        };

    }


    return null;

}


// =====================================
// BUSCAR ESTADO DA CURTIDA
// =====================================

async function loadLikeState(
    type,
    postId
) {

    const config =
        getLikeConfig(
            type
        );


    if (!config) {

        return {
            liked: false,
            count: 0
        };

    }


    try {

        // =================================
        // CONTADOR
        // =================================

        const {
            count,
            error: countError
        } = await db
            .from(
                config.table
            )
            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                config.column,
                postId
            );


        if (countError) {

            throw countError;

        }


        // =================================
        // USUÁRIO CURTIU?
        // =================================

        const {
            data,
            error
        } = await db
            .from(
                config.table
            )
            .select(
                config.column
            )
            .eq(
                config.column,
                postId
            )
            .eq(
                "user_id",
                vinciLikesUser.id
            )
            .maybeSingle();


        if (error) {

            throw error;

        }


        return {

            liked:
                !!data,

            count:
                count || 0

        };

    }

    catch (error) {

        console.error(
            "VINCI LIKES — erro ao carregar curtidas:",
            error
        );


        return {

            liked:
                false,

            count:
                0

        };

    }

}


// =====================================
// ATUALIZAR TODOS OS BOTÕES
// DO MESMO POST
// =====================================

function updateLikeElements(
    type,
    postId,
    liked,
    count
) {

    document
        .querySelectorAll(
            `.vinci-like-control[data-like-type="${type}"][data-like-post-id="${postId}"]`
        )
        .forEach(
            function (control) {

                const button =
                    control.querySelector(
                        ".vinci-like-button"
                    );


                const icon =
                    control.querySelector(
                        ".vinci-like-icon"
                    );


                const countElement =
                    control.querySelector(
                        ".vinci-like-count"
                    );


                if (!button) {

                    return;

                }


                button.classList.toggle(
                    "liked",
                    liked
                );


                button.setAttribute(
                    "aria-pressed",
                    liked
                        ? "true"
                        : "false"
                );


                button.setAttribute(
                    "aria-label",
                    liked
                        ? "Descurtir"
                        : "Curtir"
                );


                if (icon) {

                    icon.textContent =
                        liked
                            ? "♥"
                            : "♡";

                }


                if (countElement) {

                    countElement.textContent =
                        String(
                            Math.max(
                                0,
                                count
                            )
                        );

                }

            }
        );

}


// =====================================
// CURTIR
// =====================================

async function likePost(
    type,
    postId
) {

    const config =
        getLikeConfig(
            type
        );


    if (!config) {

        throw new Error(
            "Tipo de curtida inválido."
        );

    }


    const row = {

        user_id:
            vinciLikesUser.id

    };


    row[
        config.column
    ] = postId;


    const {
        error
    } = await db
        .from(
            config.table
        )
        .insert(
            row
        );


    if (error) {

        throw error;

    }

}


// =====================================
// DESCURTIR
// =====================================

async function unlikePost(
    type,
    postId
) {

    const config =
        getLikeConfig(
            type
        );


    if (!config) {

        throw new Error(
            "Tipo de curtida inválido."
        );

    }


    const {
        error
    } = await db
        .from(
            config.table
        )
        .delete()
        .eq(
            config.column,
            postId
        )
        .eq(
            "user_id",
            vinciLikesUser.id
        );


    if (error) {

        throw error;

    }

}


// =====================================
// ALTERNAR CURTIDA
// =====================================

async function toggleLike(
    type,
    postId,
    control
) {

    if (
        !vinciLikesUser
    ) {

        return;

    }


    const button =
        control.querySelector(
            ".vinci-like-button"
        );


    const countElement =
        control.querySelector(
            ".vinci-like-count"
        );


    if (
        !button ||
        button.disabled
    ) {

        return;

    }


    const currentlyLiked =
        button.classList.contains(
            "liked"
        );


    const currentCount =
        parseInt(
            countElement?.textContent ||
            "0",
            10
        ) || 0;


    const newLiked =
        !currentlyLiked;


    const newCount =
        newLiked
            ? currentCount + 1
            : Math.max(
                0,
                currentCount - 1
            );


    // =================================
    // ATUALIZAÇÃO IMEDIATA
    // =================================

    updateLikeElements(
        type,
        postId,
        newLiked,
        newCount
    );


    document
        .querySelectorAll(
            `.vinci-like-control[data-like-type="${type}"][data-like-post-id="${postId}"] .vinci-like-button`
        )
        .forEach(
            function (likeButton) {

                likeButton.disabled =
                    true;

            }
        );


    try {

        if (newLiked) {

            await likePost(
                type,
                postId
            );

        }

        else {

            await unlikePost(
                type,
                postId
            );

        }


        console.log(
            "VINCI LIKES —",
            newLiked
                ? "curtido ✓"
                : "descurtido ✓",
            postId
        );

    }

    catch (error) {

        console.error(
            "VINCI LIKES — erro:",
            error
        );


        // =================================
        // VOLTAR AO ESTADO ANTERIOR
        // =================================

        updateLikeElements(
            type,
            postId,
            currentlyLiked,
            currentCount
        );


        alert(
            "Não foi possível atualizar a curtida."
        );

    }

    finally {

        document
            .querySelectorAll(
                `.vinci-like-control[data-like-type="${type}"][data-like-post-id="${postId}"] .vinci-like-button`
            )
            .forEach(
                function (likeButton) {

                    likeButton.disabled =
                        false;

                }
            );

    }

}


// =====================================
// CRIAR CONTROLE
// =====================================

async function createLikeControl(
    element,
    type,
    postId,
    mode
) {

    if (
        element.dataset.likesReady ===
        "true"
    ) {

        return;

    }


    element.dataset.likesReady =
        "true";


    const control =
        document.createElement(
            "div"
        );


    control.className =
        "vinci-like-control";


    control.dataset.likeType =
        type;


    control.dataset.likePostId =
        postId;


    if (
        mode === "photo-grid"
    ) {

        control.classList.add(
            "vinci-like-control-grid"
        );

    }


    // =================================
    // BOTÃO
    // =================================

    const button =
        document.createElement(
            "button"
        );


    button.type =
        "button";


    button.className =
        "vinci-like-button";


    button.setAttribute(
        "aria-label",
        "Curtir"
    );


    button.setAttribute(
        "aria-pressed",
        "false"
    );


    // =================================
    // CORAÇÃO
    // =================================

    const icon =
        document.createElement(
            "span"
        );


    icon.className =
        "vinci-like-icon";


    icon.textContent =
        "♡";


    // =================================
    // CONTADOR
    // =================================

    const count =
        document.createElement(
            "span"
        );


    count.className =
        "vinci-like-count";


    count.textContent =
        "0";


    button.appendChild(
        icon
    );


    button.appendChild(
        count
    );


    control.appendChild(
        button
    );


    // =================================
    // INSERIR NA INTERFACE
    // =================================

    if (
        mode === "feed"
    ) {

        const content =
            element.querySelector(
                ".post-content"
            );


        if (content) {

            content.insertBefore(
                control,
                content.firstChild
            );

        }

        else {

            element.appendChild(
                control
            );

        }

    }

    else {

        element.appendChild(
            control
        );

    }


    // =================================
    // NÃO ABRIR FOTO AO CURTIR
    // =================================

    button.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();

            event.stopPropagation();


            await toggleLike(
                type,
                postId,
                control
            );

        }
    );


    // =================================
    // CARREGAR ESTADO
    // =================================

    const state =
        await loadLikeState(
            type,
            postId
        );


    updateLikeElements(
        type,
        postId,
        state.liked,
        state.count
    );

}


// =====================================
// PROCURAR ELEMENTOS
// =====================================

function scanLikeElements() {

    // =================================
    // FEED — FOTOGRAFIAS
    // =================================

    document
        .querySelectorAll(
            ".vinci-post"
        )
        .forEach(
            function (element) {

                const postId =
                    element.dataset.postId;


                if (!postId) {

                    return;

                }


                createLikeControl(
                    element,
                    "photo",
                    postId,
                    "feed"
                );

            }
        );


    // =================================
    // PERFIL — FOTOGRAFIAS
    // =================================

    document
        .querySelectorAll(
            ".profile-post"
        )
        .forEach(
            function (element) {

                const postId =
                    element.dataset.postId;


                if (!postId) {

                    return;

                }


                createLikeControl(
                    element,
                    "photo",
                    postId,
                    "photo-grid"
                );

            }
        );


    // =================================
    // PERFIL — POSTS DE TEXTO
    // =================================

    document
        .querySelectorAll(
            ".profile-text-post"
        )
        .forEach(
            function (element) {

                const postId =
                    element.dataset.postId;


                if (!postId) {

                    return;

                }


                createLikeControl(
                    element,
                    "text",
                    postId,
                    "text"
                );

            }
        );

}


// =====================================
// OBSERVAR POSTS NOVOS
// =====================================

function startLikesObserver() {

    let scanScheduled =
        false;


    const observer =
        new MutationObserver(
            function () {

                if (scanScheduled) {

                    return;

                }


                scanScheduled =
                    true;


                requestAnimationFrame(
                    function () {

                        scanScheduled =
                            false;


                        scanLikeElements();

                    }
                );

            }
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


    scanLikeElements();

}


// =====================================
// INICIAR
// =====================================

async function initLikesSystem() {

    const logged =
        await loadLikesUser();


    if (!logged) {

        return;

    }


    startLikesObserver();


    console.log(
        "VINCI — LIKES SYSTEM 1.0 ATIVO ✓"
    );

}


initLikesSystem();
