// =====================================
// VINCI — PROFILE
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


// =====================================
// VERIFICAR LOGIN
// =====================================

async function loadUser() {

    const {
        data,
        error
    } = await db.auth.getUser();


    if (error || !data.user) {

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
        .eq("id", currentUser.id)
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


    renderProfile();

}


// =====================================
// MOSTRAR PERFIL
// =====================================

function renderProfile() {

    profileName.textContent =
        currentProfile.name;


    profileUsername.textContent =
        "@" +
        currentProfile.username;


    // =================================
    // BIO
    // =================================

    if (currentProfile.bio) {

        profileBio.textContent =
            currentProfile.bio;

    }

    else {

        profileBio.textContent =
            "Sua bio ainda está vazia.";

    }


    // =================================
    // FOTO / LETRA DO AVATAR
    // =================================

    if (currentProfile.avatar_url) {

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
// ATUALIZAR AVISOS DE ALTERAÇÃO
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
// ABRIR EDITAR PERFIL
// =====================================

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
            .remove("hidden");

    }
);


// =====================================
// FECHAR MODAL
// =====================================

closeModal.addEventListener(
    "click",
    function () {

        editModal
            .classList
            .add("hidden");

    }
);


// =====================================
// FECHAR CLICANDO FORA
// =====================================

editModal.addEventListener(
    "click",
    function (event) {

        if (
            event.target ===
            editModal
        ) {

            editModal
                .classList
                .add("hidden");

        }

    }
);


// =====================================
// USERNAME AUTOMÁTICO
// =====================================

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


// =====================================
// SALVAR ALTERAÇÕES
// =====================================

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
        // ATUALIZAR PELO SUPABASE
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
                    .add("hidden");

            },
            800
        );

    }
);


// =====================================
// INICIAR
// =====================================

loadUser();
