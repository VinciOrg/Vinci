// =====================================
// VINCI — PROFILE 0.5.3
// =====================================

let currentUser = null;
let currentProfile = null;

// =====================================
// ELEMENTOS
// =====================================

const profileName =
    document.getElementById("profileName");

const profileUsername =
    document.getElementById("profileUsername");

const profileBio =
    document.getElementById("profileBio");

const avatarInput =
    document.getElementById("avatarInput");

const changeAvatar =
    document.getElementById("changeAvatar");

const avatar =
    document.getElementById("avatar");

const avatarLetter =
    document.getElementById("avatarLetter");

const editProfileButton =
    document.getElementById("editProfile");

const editModal =
    document.getElementById("editModal");

const closeModal =
    document.getElementById("closeModal");

const profileForm =
    document.getElementById("profileForm");

const editName =
    document.getElementById("editName");

const editUsername =
    document.getElementById("editUsername");

const editBio =
    document.getElementById("editBio");

const nameChangeInfo =
    document.getElementById("nameChangeInfo");

const usernameChangeInfo =
    document.getElementById(
        "usernameChangeInfo"
    );

const profileMessage =
    document.getElementById(
        "profileMessage"
    );

const profilePostsSection =
    document.getElementById(
        "profilePostsSection"
    );

const profilePosts =
    document.getElementById(
        "profilePosts"
    );

// =====================================
// ÁREAS DO PERFIL
// =====================================

let profileStats = null;
let postsGrid = null;
let postsTitle = null;

// =====================================
// CRIAR ÁREA DE PUBLICAÇÕES
// =====================================

function createPostsArea() {

    postsGrid =
        document.getElementById(
            "profilePostsGrid"
        );

    if (postsGrid) {

        postsTitle =
            document.querySelector(
                ".profile-posts-title"
            );

        return;

    }

    const container =
        document.createElement(
            "section"
        );

    container.className =
        "profile-posts-section";

    postsTitle =
        document.createElement(
            "h2"
        );

    postsTitle.className =
        "profile-posts-title";

    postsTitle.textContent =
        "Publicações";

    postsGrid =
        document.createElement(
            "div"
        );

    postsGrid.id =
        "profilePostsGrid";

    postsGrid.className =
        "profile-posts-grid";

    container.appendChild(
        postsTitle
    );

    container.appendChild(
        postsGrid
    );

    const bottomNav =
        document.querySelector(
            ".bottom-nav"
        );

    if (bottomNav) {

        document.body.insertBefore(
            container,
            bottomNav
        );

    }

    else {

        document.body.appendChild(
            container
        );

    }

}

// =====================================
// CRIAR ESTATÍSTICAS
// =====================================

function createStatsArea() {

    const existing =
        document.getElementById(
            "profileStats"
        );

    if (existing) {

        profileStats =
            existing;

        return;

    }

    profileStats =
        document.createElement(
            "div"
        );

    profileStats.id =
        "profileStats";

    profileStats.className =
        "profile-stats";

    profileStats.innerHTML = `

        <div class="profile-stat">

            <strong id="postsCount">
                0
            </strong>

            <span>
                publicações
            </span>

        </div>

    `;

    const editParent =
        editProfileButton?.parentElement;

    if (
        editParent &&
        editParent.parentElement
    ) {

        editParent.parentElement.insertBefore(
            profileStats,
            editParent
        );

    }

    else {

        document.body.appendChild(
            profileStats
        );

    }

}

// =====================================
// VERIFICAR LOGIN
// =====================================

async function loadUser() {

    const {
        data,
        error
    } = await db.auth.getUser();

    if (
        error ||
        !data.user
    ) {

        window.location.href =
            "login.html";

        return;

    }

    currentUser =
        data.user;

    await loadProfile();

}

// =====================================
// CARREGAR PERFIL
// =====================================

async function loadProfile() {

    const {
        data,
        error
    } = await db
        .from("profiles")
        .select("*")
        .eq(
            "id",
            currentUser.id
        )
        .maybeSingle();

    if (error) {

        console.error(
            "Erro ao carregar perfil:",
            error
        );

        return;

    }

    // =================================
    // PERFIL NÃO EXISTE
    // =================================

    if (!data) {

        const metadata =
            currentUser.user_metadata || {};

        let username =
            metadata.username ||
            "usuario" +
            Math.floor(
                Math.random() * 99999
            );

        username =
            username
                .toLowerCase()
                .replace(
                    /[^a-z0-9._]/g,
                    ""
                );

        const name =
            metadata.name ||
            "Usuário";

        const {
            data: newProfile,
            error: createError
        } = await db
            .from("profiles")
            .insert({

                id:
                    currentUser.id,

                username:
                    username,

                name:
                    name,

                bio:
                    "",

                avatar_url:
                    null

            })
            .select()
            .single();

        if (createError) {

            console.error(
                "Erro ao criar perfil:",
                createError
            );

            return;

        }

        currentProfile =
            newProfile;

    }

    else {

        currentProfile =
            data;

    }

    // =================================
    // CRIAR INTERFACE
    // =================================

    createStatsArea();

    createPostsArea();

    // =================================
    // RENDERIZAR
    // =================================

    renderProfile();

    updateChangeInfo();

    // =================================
    // CARREGAR PUBLICAÇÕES
    // =================================

    await loadUserPosts();

    // =================================
    // CARREGAR POSTS DE TEXTO
    // =================================

    await loadProfilePosts();

}

// =====================================
// MOSTRAR PERFIL
// =====================================

function renderProfile() {

    if (profileName) {

        profileName.textContent =
            currentProfile.name;

    }

    if (profileUsername) {

        profileUsername.textContent =
            "@" +
            currentProfile.username;

    }

    // =================================
    // BIO
    // =================================

    if (profileBio) {

        if (
            currentProfile.bio
        ) {

            profileBio.textContent =
                currentProfile.bio;

        }

        else {

            profileBio.textContent =
                "Sua bio ainda está vazia.";

        }

    }

    // =================================
    // AVATAR
    // =================================

    if (
        currentProfile.avatar_url
    ) {

        avatar.style.backgroundImage =
            `url("${currentProfile.avatar_url}")`;

        avatar.style.backgroundSize =
            "cover";

        avatar.style.backgroundPosition =
            "center";

        avatarLetter.style.display =
            "none";

    }

    else {

        avatar.style.backgroundImage =
            "none";

        avatarLetter.style.display =
            "block";

        avatarLetter.textContent =
            currentProfile.name
                .charAt(0)
                .toUpperCase();

    }

}

// =====================================
// CARREGAR PUBLICAÇÕES DE FOTOS
// =====================================

async function loadUserPosts() {

    if (!postsGrid) {

        return;

    }

    postsGrid.innerHTML = `

        <div class="profile-posts-loading">

            Carregando fotografias...

        </div>

    `;

    const {
        data,
        error
    } = await db
        .from("posts")
        .select(`
            id,
            image_url,
            caption,
            created_at
        `)
        .eq(
            "user_id",
            currentUser.id
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );

    if (error) {

        console.error(
            "Erro ao carregar posts:",
            error
        );

        postsGrid.innerHTML = `

            <div class="profile-posts-empty">

                <div class="profile-empty-icon">
                    ⚠️
                </div>

                <strong>
                    Erro ao carregar publicações
                </strong>

                <span>
                    ${escapeHTML(
                        error.message
                    )}
                </span>

            </div>

        `;

        return;

    }

    // =================================
    // CONTADOR
    // =================================

    const postsCount =
        document.getElementById(
            "postsCount"
        );

    if (postsCount) {

        postsCount.textContent =
            data?.length || 0;

    }

    // =================================
    // TÍTULO
    // =================================

    if (postsTitle) {

        postsTitle.textContent =
            data.length === 1
                ? "Publicação"
                : "Publicações";

    }

    // =================================
    // NENHUMA PUBLICAÇÃO
    // =================================

    if (
        !data ||
        data.length === 0
    ) {

        postsGrid.innerHTML = `

            <div class="profile-posts-empty">

                <div class="profile-empty-icon">
                    📸
                </div>

                <strong>
                    Nenhuma fotografia ainda
                </strong>

                <span>
                    Suas publicações aparecerão aqui.
                </span>

            </div>

        `;

        return;

    }

    // =================================
    // GRID
    // =================================

    postsGrid.innerHTML =
        "";

    data.forEach(
        function (post) {

            const postElement =
                document.createElement(
                    "article"
                );

            postElement.className =
                "profile-post";

            const image =
                document.createElement(
                    "img"
                );

            image.src =
                post.image_url;

            image.alt =
                post.caption ||
                "Fotografia";

            image.loading =
                "lazy";

            const date =
                new Date(
                    post.created_at
                );

            postElement.title =
                post.caption ||
                `Publicado em ${date.toLocaleDateString(
                    "pt-BR"
                )}`;

            postElement.addEventListener(
                "click",
                function () {

                    openPostViewer(
                        post
                    );

                }
            );

            postElement.appendChild(
                image
            );

            postsGrid.appendChild(
                postElement
            );

        }
    );

}

// =====================================
// VISUALIZAR PUBLICAÇÃO
// =====================================

function openPostViewer(
    post
) {

    const existing =
        document.getElementById(
            "postViewer"
        );

    if (existing) {

        existing.remove();

    }

    const viewer =
        document.createElement(
            "div"
        );

    viewer.id =
        "postViewer";

    viewer.className =
        "post-viewer";

    viewer.innerHTML = `

        <div class="post-viewer-content">

            <button
                class="post-viewer-close"
                id="closePostViewer"
            >
                ×
            </button>

            <img
                src="${post.image_url}"
                alt=""
                class="post-viewer-image"
            >

            ${
                post.caption
                    ? `
                        <p class="post-viewer-caption">
                            ${escapeHTML(
                                post.caption
                            )}
                        </p>
                    `
                    : ""
            }

            <time class="post-viewer-date">

                ${new Date(
                    post.created_at
                ).toLocaleDateString(
                    "pt-BR",
                    {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    }
                )}

            </time>

        </div>

    `;

    document.body.appendChild(
        viewer
    );

    document
        .getElementById(
            "closePostViewer"
        )
        .addEventListener(
            "click",
            function () {

                viewer.remove();

            }
        );

    viewer.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                viewer
            ) {

                viewer.remove();

            }

        }
    );

}

// =====================================
// CARREGAR POSTS DE TEXTO
// =====================================

async function loadProfilePosts() {

    if (!profilePosts) {

        console.warn(
            "Área de posts do perfil não encontrada."
        );

        return;

    }

    profilePosts.innerHTML = `

        <div class="profile-posts-loading">

            Carregando posts...

        </div>

    `;

    try {

        const {
            data,
            error
        } = await db
            .from("profile_posts")
            .select(`
                id,
                user_id,
                content,
                created_at
            `)
            .eq(
                "user_id",
                currentUser.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

        if (error) {

            throw error;

        }

        // =================================
        // NENHUM POST
        // =================================

        if (
            !data ||
            data.length === 0
        ) {

            profilePosts.innerHTML = `

                <div class="profile-posts-empty">

                    <div class="profile-empty-icon">
                        💬
                    </div>

                    <strong>
                        Nenhum post ainda
                    </strong>

                    <span>
                        Seus posts aparecerão aqui.
                    </span>

                </div>

            `;

            return;

        }

        // =================================
        // LIMPAR
        // =================================

        profilePosts.innerHTML =
            "";

        // =================================
        // CRIAR POSTS
        // =================================

        data.forEach(
            function (post) {

                const article =
                    document.createElement(
                        "article"
                    );

                article.className =
                    "profile-text-post";

                // =================================
                // CONTEÚDO
                // =================================

                const content =
                    document.createElement(
                        "p"
                    );

                content.className =
                    "profile-text-post-content";

                content.textContent =
                    post.content;

                // =================================
                // DATA
                // =================================

                const date =
                    document.createElement(
                        "time"
                    );

                date.className =
                    "profile-text-post-date";

                date.textContent =
                    formatPostDate(
                        post.created_at
                    );

                article.appendChild(
                    content
                );

                article.appendChild(
                    date
                );

                profilePosts.appendChild(
                    article
                );

            }
        );

    }

    catch (error) {

        console.error(
            "Erro ao carregar posts do perfil:",
            error
        );

        profilePosts.innerHTML = `

            <div class="profile-posts-empty">

                <div class="profile-empty-icon">
                    ⚠️
                </div>

                <strong>
                    Erro ao carregar posts
                </strong>

                <span>
                    Não foi possível carregar seus posts.
                </span>

            </div>

        `;

    }

}

// =====================================
// FORMATAR DATA DO POST
// =====================================

function formatPostDate(
    date
) {

    const postDate =
        new Date(date);

    const now =
        new Date();

    const difference =
        now.getTime() -
        postDate.getTime();

    const seconds =
        Math.floor(
            difference / 1000
        );

    if (seconds < 60) {

        return "agora";

    }

    const minutes =
        Math.floor(
            seconds / 60
        );

    if (minutes < 60) {

        return (
            minutes === 1
                ? "há 1 minuto"
                : `há ${minutes} minutos`
        );

    }

    const hours =
        Math.floor(
            minutes / 60
        );

    if (hours < 24) {

        return (
            hours === 1
                ? "há 1 hora"
                : `há ${hours} horas`
        );

    }

    const days =
        Math.floor(
            hours / 24
        );

    if (days < 7) {

        return (
            days === 1
                ? "ontem"
                : `há ${days} dias`
        );

    }

    return postDate.toLocaleDateString(
        "pt-BR",
        {
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );

}

// =====================================
// ESCAPAR HTML
// =====================================

function escapeHTML(
    text
) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text;

    return div.innerHTML;

}

// =====================================
// CALCULAR TEMPO RESTANTE
// =====================================

function getTimeRemaining(
    date,
    days
) {

    if (!date) {

        return null;

    }

    const changedAt =
        new Date(date).getTime();

    const availableAt =
        changedAt +
        days *
        24 *
        60 *
        60 *
        1000;

    const remaining =
        availableAt -
        Date.now();

    if (remaining <= 0) {

        return null;

    }

    const totalMinutes =
        Math.ceil(
            remaining / 60000
        );

    const totalHours =
        Math.floor(
            totalMinutes / 60
        );

    const minutes =
        totalMinutes % 60;

    const totalDays =
        Math.floor(
            totalHours / 24
        );

    const hours =
        totalHours % 24;

    if (totalDays > 0) {

        return `${totalDays}d ${hours}h`;

    }

    if (totalHours > 0) {

        return `${totalHours}h ${minutes}min`;

    }

    return `${minutes}min`;

}

// =====================================
// ATUALIZAR AVISOS
// =====================================

function updateChangeInfo() {

    // =================================
    // USERNAME
    // =================================

    const usernameRemaining =
        getTimeRemaining(
            currentProfile.username_changed_at,
            20
        );

    if (usernameRemaining) {

        usernameChangeInfo.textContent =
            `Você poderá alterar novamente em ${usernameRemaining}.`;

        usernameChangeInfo.classList.add(
            "locked"
        );

    }

    else {

        usernameChangeInfo.textContent =
            "✓ Disponível para alteração";

        usernameChangeInfo.classList.remove(
            "locked"
        );

    }

    // =================================
    // NOME
    // =================================

    const nameRemaining =
        getTimeRemaining(
            currentProfile.name_changed_at,
            1
        );

    if (nameRemaining) {

        nameChangeInfo.textContent =
            `Você poderá alterar novamente em ${nameRemaining}.`;

        nameChangeInfo.classList.add(
            "locked"
        );

    }

    else {

        nameChangeInfo.textContent =
            "✓ Disponível para alteração";

        nameChangeInfo.classList.remove(
            "locked"
        );

    }

}

// =====================================
// EDITAR PERFIL
// =====================================

if (editProfileButton) {

    editProfileButton.addEventListener(
        "click",
        function () {

            editName.value =
                currentProfile.name;

            editUsername.value =
                currentProfile.username;

            editBio.value =
                currentProfile.bio || "";

            profileMessage.textContent =
                "";

            updateChangeInfo();

            editModal
                .classList
                .remove(
                    "hidden"
                );

        }
    );

}

// =====================================
// FECHAR MODAL
// =====================================

if (closeModal) {

    closeModal.addEventListener(
        "click",
        function () {

            editModal
                .classList
                .add(
                    "hidden"
                );

        }
    );

}

// =====================================
// FECHAR CLICANDO FORA
// =====================================

if (editModal) {

    editModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                editModal
            ) {

                editModal
                    .classList
                    .add(
                        "hidden"
                    );

            }

        }
    );

}

// =====================================
// USERNAME AUTOMÁTICO
// =====================================

if (editUsername) {

    editUsername.addEventListener(
        "input",
        function () {

            this.value =
                this.value
                    .toLowerCase()
                    .replace(
                        /[^a-z0-9._]/g,
                        ""
                    );

        }
    );

}

// =====================================
// SALVAR PERFIL
// =====================================

if (profileForm) {

    profileForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const name =
                editName.value.trim();

            const username =
                editUsername.value
                    .trim()
                    .toLowerCase();

            const bio =
                editBio.value.trim();

            // =================================
            // VALIDAÇÕES
            // =================================

            if (!name) {

                profileMessage.textContent =
                    "Digite seu nome.";

                return;

            }

            if (!username) {

                profileMessage.textContent =
                    "Digite um nome de usuário.";

                return;

            }

            if (
                !/^[a-z0-9._]+$/.test(
                    username
                )
            ) {

                profileMessage.textContent =
                    "Use apenas letras, números, ponto e _.";

                return;

            }

            if (
                username.length < 3
            ) {

                profileMessage.textContent =
                    "O nome de usuário precisa ter pelo menos 3 caracteres.";

                return;

            }

            profileMessage.textContent =
                "Salvando...";

            // =================================
            // SUPABASE RPC
            // =================================

            const {
                data,
                error
            } = await db.rpc(
                "update_profile",
                {

                    new_name:
                        name,

                    new_username:
                        username,

                    new_bio:
                        bio

                }
            );

            // =================================
            // ERRO
            // =================================

            if (error) {

                console.error(
                    "Erro ao atualizar:",
                    error
                );

                const errorMessage =
                    error.message || "";

                if (
                    errorMessage.includes(
                        "20 dias"
                    )
                ) {

                    profileMessage.textContent =
                        "Você só pode alterar o nome de usuário a cada 20 dias.";

                    return;

                }

                if (
                    errorMessage.includes(
                        "24 horas"
                    )
                ) {

                    profileMessage.textContent =
                        "Você só pode alterar o nome a cada 24 horas.";

                    return;

                }

                if (
                    errorMessage.includes(
                        "duplicate"
                    ) ||
                    errorMessage.includes(
                        "unique"
                    ) ||
                    errorMessage.includes(
                        "profiles_username_key"
                    )
                ) {

                    profileMessage.textContent =
                        "Esse nome de usuário já está sendo usado.";

                    return;

                }

                profileMessage.textContent =
                    "Não foi possível salvar as alterações.";

                return;

            }

            // =================================
            // ATUALIZOU
            // =================================

            currentProfile =
                data;

            renderProfile();

            updateChangeInfo();

            profileMessage.textContent =
                "Perfil atualizado!";

            setTimeout(
                function () {

                    editModal
                        .classList
                        .add(
                            "hidden"
                        );

                },
                800
            );

        }
    );

}

// =====================================
// ALTERAR FOTO DE PERFIL
// =====================================

if (
    changeAvatar &&
    avatarInput
) {

    changeAvatar.addEventListener(
        "click",
        function () {

            avatarInput.click();

        }
    );

    avatarInput.addEventListener(
        "change",
        async function () {

            const file =
                this.files[0];

            if (!file) {

                return;

            }

            // =================================
            // FORMATOS
            // =================================

            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp"
            ];

            if (
                !allowedTypes.includes(
                    file.type
                )
            ) {

                alert(
                    "Escolha uma imagem JPG, PNG ou WEBP."
                );

                return;

            }

            // =================================
            // LIMITE
            // =================================

            if (
                file.size >
                5 * 1024 * 1024
            ) {

                alert(
                    "A foto precisa ter no máximo 5 MB."
                );

                return;

            }

            changeAvatar.disabled =
                true;

            changeAvatar.textContent =
                "Enviando...";

            try {

                // =================================
                // EXTENSÃO
                // =================================

                const extension =
                    file.name
                        .split(".")
                        .pop()
                        .toLowerCase();

                // =================================
                // CAMINHO
                // =================================

                const filePath =
                    `${currentUser.id}/avatar.${extension}`;

                // =================================
                // UPLOAD
                // =================================

                const {
                    error: uploadError
                } = await db.storage
                    .from("avatars")
                    .upload(
                        filePath,
                        file,
                        {
                            contentType:
                                file.type,

                            cacheControl:
                                "3600",

                            upsert:
                                true
                        }
                    );

                if (uploadError) {

                    throw uploadError;

                }

                // =================================
                // URL PÚBLICA
                // =================================

                const {
                    data: publicURL
                } = db.storage
                    .from("avatars")
                    .getPublicUrl(
                        filePath
                    );

                const avatarURL =
                    publicURL.publicUrl;

                // =================================
                // CACHE BUSTER
                // =================================

                const finalURL =
                    `${avatarURL}?t=${Date.now()}`;

                // =================================
                // ATUALIZAR PERFIL
                // =================================

                const {
                    error: updateError
                } = await db
                    .from("profiles")
                    .update({

                        avatar_url:
                            finalURL

                    })
                    .eq(
                        "id",
                        currentUser.id
                    );

                if (updateError) {

                    throw updateError;

                }

                // =================================
                // ATUALIZAR LOCAL
                // =================================

                currentProfile.avatar_url =
                    finalURL;

                renderProfile();

                changeAvatar.textContent =
                    "Foto atualizada! ✓";

                setTimeout(
                    function () {

                        changeAvatar.textContent =
                            "Alterar foto";

                    },
                    1500
                );

            }

            catch (error) {

                console.error(
                    "Erro ao alterar avatar:",
                    error
                );

                alert(
                    "Não foi possível alterar a foto."
                );

                changeAvatar.textContent =
                    "Alterar foto";

            }

            changeAvatar.disabled =
                false;

            avatarInput.value =
                "";

        }
    );

}

// =====================================
// INICIAR VINCI
// =====================================

loadUser();
