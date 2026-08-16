// =====================================
// VINCI — PROFILE 0.6.1
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
    document.getElementById("usernameChangeInfo");

const profileMessage =
    document.getElementById("profileMessage");


// =====================================
// CONTEÚDO
// =====================================

const profilePosts =
    document.getElementById("profilePosts");

const profilePostsSection =
    document.getElementById("profilePostsSection");

const profilePhotosSection =
    document.getElementById("profilePhotosSection");

const profilePostsGrid =
    document.getElementById("profilePostsGrid");


// =====================================
// ABAS
// =====================================

const textPostsTab =
    document.getElementById("textPostsTab");

const photoPostsTab =
    document.getElementById("photoPostsTab");


// =====================================
// ESTATÍSTICAS
// =====================================

const postsCount =
    document.getElementById("postsCount");


// =====================================
// LOGIN
// =====================================

async function loadUser() {

    try {

        const {
            data,
            error
        } = await db.auth.getUser();


        if (
            error ||
            !data ||
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

    catch (error) {

        console.error(
            "Erro ao verificar usuário:",
            error
        );

        window.location.href =
            "login.html";

    }

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

        showProfileError(
            "Não foi possível carregar seu perfil."
        );

        return;

    }


    // =================================
    // CRIAR PERFIL CASO NÃO EXISTA
    // =================================

    if (!data) {

        const metadata =
            currentUser.user_metadata || {};


        let username =
            metadata.username ||
            `usuario${Math.floor(
                Math.random() * 99999
            )}`;


        username =
            sanitizeUsername(
                username
            );


        if (
            username.length < 3
        ) {

            username =
                `usuario${Math.floor(
                    Math.random() * 99999
                )}`;

        }


        const name =
            metadata.name ||
            currentUser.email?.split("@")[0] ||
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

            showProfileError(
                "Não foi possível criar seu perfil."
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


    renderProfile();

    updateChangeInfo();

    await loadUserPosts();

    await loadProfilePosts();

}


// =====================================
// RENDERIZAR PERFIL
// =====================================

function renderProfile() {

    if (!currentProfile) {

        return;

    }


    // =================================
    // NOME
    // =================================

    if (profileName) {

        profileName.textContent =
            currentProfile.name ||
            "Usuário";

    }


    // =================================
    // USERNAME
    // =================================

    if (profileUsername) {

        profileUsername.textContent =
            "@" +
            (
                currentProfile.username ||
                "usuario"
            );

    }


    // =================================
    // BIO
    // =================================

    if (profileBio) {

        const bio =
            currentProfile.bio?.trim();


        profileBio.textContent =
            bio ||
            "Sua bio ainda está vazia.";

    }


    // =================================
    // AVATAR
    // =================================

    if (
        avatar &&
        avatarLetter
    ) {

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


            const firstLetter =
                (
                    currentProfile.name ||
                    "U"
                )
                    .trim()
                    .charAt(0)
                    .toUpperCase();


            avatarLetter.textContent =
                firstLetter;

        }

    }

}


// =====================================
// CARREGAR FOTOGRAFIAS
// =====================================

async function loadUserPosts() {

    if (!profilePostsGrid) {

        return;

    }


    profilePostsGrid.innerHTML = `

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
            "Erro ao carregar fotografias:",
            error
        );


        profilePostsGrid.innerHTML = `

            <div class="profile-posts-empty">

                <div class="profile-empty-icon">
                    ⚠️
                </div>

                <strong>
                    Erro ao carregar publicações
                </strong>

                <span>
                    Não foi possível carregar suas fotografias.
                </span>

            </div>

        `;

        return;

    }


    const photos =
        data || [];


    // =================================
    // CONTADOR
    // =================================

    updatePostsCounter(
        photos.length
    );


    // =================================
    // NENHUMA FOTO
    // =================================

    if (
        photos.length === 0
    ) {

        profilePostsGrid.innerHTML = `

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

    profilePostsGrid.innerHTML =
        "";


    photos.forEach(
        function (post) {

            const article =
                document.createElement(
                    "article"
                );


            article.className =
                "profile-post";


            const image =
                document.createElement(
                    "img"
                );


            image.src =
                post.image_url;


            image.alt =
                post.caption ||
                "Fotografia publicada";


            image.loading =
                "lazy";


            image.addEventListener(
                "error",
                function () {

                    image.style.display =
                        "none";

                    article.style.background =
                        "#eeeeee";

                }
            );


            const date =
                new Date(
                    post.created_at
                );


            article.title =
                post.caption ||
                `Publicado em ${date.toLocaleDateString(
                    "pt-BR"
                )}`;


            article.addEventListener(
                "click",
                function () {

                    openPostViewer(
                        post
                    );

                }
            );


            article.appendChild(
                image
            );


            profilePostsGrid.appendChild(
                article
            );

        }
    );

}


// =====================================
// CONTADOR DE PUBLICAÇÕES
// =====================================

function updatePostsCounter(
    photoCount
) {

    if (!postsCount) {

        return;

    }


    postsCount.textContent =
        photoCount;

}


// =====================================
// VISUALIZADOR DE FOTO
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


    const content =
        document.createElement(
            "div"
        );


    content.className =
        "post-viewer-content";


    const closeButton =
        document.createElement(
            "button"
        );


    closeButton.className =
        "post-viewer-close";

    closeButton.type =
        "button";

    closeButton.textContent =
        "×";


    const image =
        document.createElement(
            "img"
        );


    image.className =
        "post-viewer-image";

    image.src =
        post.image_url;

    image.alt =
        post.caption ||
        "Fotografia";


    content.appendChild(
        closeButton
    );

    content.appendChild(
        image
    );


    if (post.caption) {

        const caption =
            document.createElement(
                "p"
            );


        caption.className =
            "post-viewer-caption";


        caption.textContent =
            post.caption;


        content.appendChild(
            caption
        );

    }


    const date =
        document.createElement(
            "time"
        );


    date.className =
        "post-viewer-date";


    date.textContent =
        new Date(
            post.created_at
        ).toLocaleDateString(
            "pt-BR",
            {
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );


    content.appendChild(
        date
    );


    viewer.appendChild(
        content
    );


    document.body.appendChild(
        viewer
    );


    closeButton.addEventListener(
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


    document.addEventListener(
        "keydown",
        function escapeViewer(event) {

            if (
                event.key ===
                "Escape"
            ) {

                viewer.remove();

                document.removeEventListener(
                    "keydown",
                    escapeViewer
                );

            }

        }
    );

}


// =====================================
// CARREGAR POSTS DE TEXTO
// =====================================

async function loadProfilePosts() {

    if (!profilePosts) {

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


        const posts =
            data || [];


        // =================================
        // NENHUM POST
        // =================================

        if (
            posts.length === 0
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


        profilePosts.innerHTML =
            "";


        posts.forEach(
            function (post) {

                const article =
                    document.createElement(
                        "article"
                    );


                article.className =
                    "profile-text-post";


                const content =
                    document.createElement(
                        "p"
                    );


                content.className =
                    "profile-text-post-content";


                content.textContent =
                    post.content || "";


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
            "Erro ao carregar posts:",
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
// FORMATAR DATA
// =====================================

function formatPostDate(
    date
) {

    const postDate =
        new Date(date);


    if (
        Number.isNaN(
            postDate.getTime()
        )
    ) {

        return "";

    }


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

        return minutes === 1
            ? "há 1 minuto"
            : `há ${minutes} minutos`;

    }


    const hours =
        Math.floor(
            minutes / 60
        );


    if (hours < 24) {

        return hours === 1
            ? "há 1 hora"
            : `há ${hours} horas`;

    }


    const days =
        Math.floor(
            hours / 24
        );


    if (days < 7) {

        return days === 1
            ? "ontem"
            : `há ${days} dias`;

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
// USERNAME
// =====================================

function sanitizeUsername(
    username
) {

    return String(
        username || ""
    )
        .toLowerCase()
        .replace(
            /[^a-z0-9._]/g,
            ""
        );

}


// =====================================
// TEMPO RESTANTE
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


    if (
        Number.isNaN(
            changedAt
        )
    ) {

        return null;

    }


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


    if (
        remaining <= 0
    ) {

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


    if (
        totalDays > 0
    ) {

        return `${totalDays}d ${hours}h`;

    }


    if (
        totalHours > 0
    ) {

        return `${totalHours}h ${minutes}min`;

    }


    return `${minutes}min`;

}


// =====================================
// AVISOS DE ALTERAÇÃO
// =====================================

function updateChangeInfo() {

    if (
        !currentProfile
    ) {

        return;

    }


    // =================================
    // USERNAME
    // =================================

    const usernameRemaining =
        getTimeRemaining(
            currentProfile.username_changed_at,
            20
        );


    if (
        usernameRemaining
    ) {

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


    if (
        nameRemaining
    ) {

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
// ABRIR EDITOR
// =====================================

if (
    editProfileButton
) {

    editProfileButton.addEventListener(
        "click",
        function () {

            if (
                !currentProfile
            ) {

                return;

            }


            editName.value =
                currentProfile.name ||
                "";


            editUsername.value =
                currentProfile.username ||
                "";


            editBio.value =
                currentProfile.bio ||
                "";


            profileMessage.textContent =
                "";


            updateChangeInfo();


            editModal
                .classList
                .remove("hidden");


            setTimeout(
                function () {

                    editName.focus();

                },
                100
            );

        }
    );

}


// =====================================
// FECHAR MODAL
// =====================================

function closeEditModal() {

    if (!editModal) {

        return;

    }


    editModal
        .classList
        .add("hidden");

}


if (closeModal) {

    closeModal.addEventListener(
        "click",
        closeEditModal
    );

}


if (editModal) {

    editModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                editModal
            ) {

                closeEditModal();

            }

        }
    );

}


// =====================================
// ESC FECHA MODAL
// =====================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape" &&
            editModal &&
            !editModal.classList.contains(
                "hidden"
            )
        ) {

            closeEditModal();

        }

    }
);


// =====================================
// USERNAME — LIMPEZA
// =====================================

if (editUsername) {

    editUsername.addEventListener(
        "input",
        function () {

            this.value =
                sanitizeUsername(
                    this.value
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


            if (
                !currentProfile
            ) {

                return;

            }


            const name =
                editName.value.trim();


            const username =
                sanitizeUsername(
                    editUsername.value.trim()
                );


            const bio =
                editBio.value.trim();


            // =================================
            // VALIDAÇÃO
            // =================================

            if (!name) {

                profileMessage.textContent =
                    "Digite seu nome.";

                return;

            }


            if (
                name.length > 40
            ) {

                profileMessage.textContent =
                    "O nome pode ter no máximo 40 caracteres.";

                return;

            }


            if (!username) {

                profileMessage.textContent =
                    "Digite um nome de usuário.";

                return;

            }


            if (
                username.length < 3
            ) {

                profileMessage.textContent =
                    "O nome de usuário precisa ter pelo menos 3 caracteres.";

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
                bio.length > 150
            ) {

                profileMessage.textContent =
                    "A bio pode ter no máximo 150 caracteres.";

                return;

            }


            // =================================
            // BOTÃO
            // =================================

            const submitButton =
                profileForm.querySelector(
                    'button[type="submit"]'
                );


            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "Salvando...";

            }


            profileMessage.textContent =
                "";


            try {

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


                if (error) {

                    throw error;

                }


                if (!data) {

                    throw new Error(
                        "O servidor não retornou o perfil atualizado."
                    );

                }


                currentProfile =
                    data;


                renderProfile();

                updateChangeInfo();


                profileMessage.textContent =
                    "Perfil atualizado! ✓";


                setTimeout(
                    function () {

                        closeEditModal();

                    },
                    700
                );

            }

            catch (error) {

                console.error(
                    "Erro ao atualizar perfil:",
                    error
                );


                const message =
                    String(
                        error?.message ||
                        ""
                    ).toLowerCase();


                if (
                    message.includes(
                        "20 dias"
                    )
                ) {

                    profileMessage.textContent =
                        "Você só pode alterar o nome de usuário a cada 20 dias.";

                }

                else if (
                    message.includes(
                        "24 horas"
                    )
                ) {

                    profileMessage.textContent =
                        "Você só pode alterar o nome a cada 24 horas.";

                }

                else if (
                    message.includes(
                        "duplicate"
                    ) ||
                    message.includes(
                        "unique"
                    ) ||
                    message.includes(
                        "profiles_username_key"
                    ) ||
                    message.includes(
                        "username"
                    ) &&
                    message.includes(
                        "already"
                    )
                ) {

                    profileMessage.textContent =
                        "Esse nome de usuário já está sendo usado.";

                }

                else {

                    profileMessage.textContent =
                        "Não foi possível salvar as alterações.";

                }

            }

            finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        "Salvar alterações";

                }

            }

        }
    );

}


// =====================================
// ALTERAR AVATAR
// =====================================

if (
    changeAvatar &&
    avatarInput
) {

    changeAvatar.addEventListener(
        "click",
        function () {

            if (
                changeAvatar.disabled
            ) {

                return;

            }


            avatarInput.click();

        }
    );


    avatarInput.addEventListener(
        "change",
        async function () {

            const file =
                this.files?.[0];


            if (!file) {

                return;

            }


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

                this.value =
                    "";

                return;

            }


            if (
                file.size >
                5 * 1024 * 1024
            ) {

                alert(
                    "A foto precisa ter no máximo 5 MB."
                );

                this.value =
                    "";

                return;

            }


            changeAvatar.disabled =
                true;


            changeAvatar.textContent =
                "Enviando...";


            try {

                // =================================
                // CAMINHO FIXO
                // =================================

                const extension =
                    file.name
                        .split(".")
                        .pop()
                        .toLowerCase();


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
                // URL
                // =================================

                const {
                    data: publicData
                } = db.storage
                    .from("avatars")
                    .getPublicUrl(
                        filePath
                    );


                if (
                    !publicData?.publicUrl
                ) {

                    throw new Error(
                        "Não foi possível obter a URL da imagem."
                    );

                }


                const avatarURL =
                    publicData.publicUrl;


                const finalURL =
                    `${avatarURL}?t=${Date.now()}`;


                // =================================
                // SALVAR NO PERFIL
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

            finally {

                changeAvatar.disabled =
                    false;


                avatarInput.value =
                    "";

            }

        }
    );

}


// =====================================
// ABAS
// =====================================

function showTextPosts() {

    profilePostsSection
        ?.classList
        .remove("hidden");


    profilePhotosSection
        ?.classList
        .add("hidden");


    textPostsTab
        ?.classList
        .add("active");


    photoPostsTab
        ?.classList
        .remove("active");

}


function showPhotoPosts() {

    profilePostsSection
        ?.classList
        .add("hidden");


    profilePhotosSection
        ?.classList
        .remove("hidden");


    textPostsTab
        ?.classList
        .remove("active");


    photoPostsTab
        ?.classList
        .add("active");

}


textPostsTab?.addEventListener(
    "click",
    showTextPosts
);


photoPostsTab?.addEventListener(
    "click",
    showPhotoPosts
);


// =====================================
// ERRO DE PERFIL
// =====================================

function showProfileError(
    message
) {

    if (profileName) {

        profileName.textContent =
            "Erro";

    }


    if (profileUsername) {

        profileUsername.textContent =
            "";

    }


    if (profileBio) {

        profileBio.textContent =
            message;

    }

}


// =====================================
// INICIAR
// =====================================

loadUser();
