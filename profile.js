// =====================================
// VINCI — PROFILE
// =====================================


let currentUser = null;
let currentProfile = null;


// =====================================
// CARREGAR USUÁRIO
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

        console.error(error);

        return;

    }


    // =================================
    // PERFIL AINDA NÃO EXISTE
    // =================================

    if (!data) {

        const metadata =
            currentUser.user_metadata || {};


        const username =
            metadata.username ||
            "usuario" +
            Math.floor(
                Math.random() * 99999
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

                id: currentUser.id,

                username: username,

                name: name,

                bio: "",

                avatar_url: null

            })
            .select()
            .single();


        if (createError) {

            console.error(createError);

            document.getElementById(
                "profileMessage"
            ).textContent =
                "Não foi possível criar seu perfil.";

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

    document.getElementById(
        "profileName"
    ).textContent =
        currentProfile.name;


    document.getElementById(
        "profileUsername"
    ).textContent =
        "@" +
        currentProfile.username;


    const bio =
        document.getElementById(
            "profileBio"
        );


    if (currentProfile.bio) {

        bio.textContent =
            currentProfile.bio;

    }

    else {

        bio.textContent =
            "Sua bio ainda está vazia.";

    }


    // =================================
    // AVATAR
    // =================================

    const avatar =
        document.getElementById(
            "avatar"
        );


    const avatarLetter =
        document.getElementById(
            "avatarLetter"
        );


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
// ABRIR EDITOR
// =====================================

document
    .getElementById("editProfile")
    .addEventListener(
        "click",
        function () {

            document.getElementById(
                "editName"
            ).value =
                currentProfile.name;


            document.getElementById(
                "editUsername"
            ).value =
                currentProfile.username;


            document.getElementById(
                "editBio"
            ).value =
                currentProfile.bio || "";


            document
                .getElementById("editModal")
                .classList
                .remove("hidden");

        }
    );


// =====================================
// FECHAR MODAL
// =====================================

document
    .getElementById("closeModal")
    .addEventListener(
        "click",
        function () {

            document
                .getElementById("editModal")
                .classList
                .add("hidden");

        }
    );


// =====================================
// SALVAR PERFIL
// =====================================

document
    .getElementById("profileForm")
    .addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const message =
                document.getElementById(
                    "profileMessage"
                );


            const name =
                document.getElementById(
                    "editName"
                ).value.trim();


            const username =
                document.getElementById(
                    "editUsername"
                ).value
                    .trim()
                    .toLowerCase()
                    .replace("@", "");


            const bio =
                document.getElementById(
                    "editBio"
                ).value.trim();


            if (!name || !username) {

                message.textContent =
                    "Preencha seu nome e username.";

                return;

            }


            if (
                !/^[a-z0-9._]+$/.test(
                    username
                )
            ) {

                message.textContent =
                    "Use apenas letras, números, ponto e _.";

                return;

            }


            message.textContent =
                "Salvando...";


            const {
    data,
    error
} = await db.rpc(
    "update_profile",
    {
        new_name: name,
        new_username: username,
        new_bio: bio
    }
);


            if (error) {

                console.error(error);


                if (
                    error.code ===
                    "23505"
                ) {

                    message.textContent =
                        "Esse nome de usuário já está sendo usado.";

                }

                else {

                    message.textContent =
                        "Não foi possível salvar as alterações.";

                }

                return;

            }


            currentProfile =
                data;


            renderProfile();


            message.textContent =
                "Perfil atualizado!";


            setTimeout(
                function () {

                    document
                        .getElementById(
                            "editModal"
                        )
                        .classList
                        .add("hidden");

                },
                700
            );

        }
    );


// =====================================
// INICIAR
// =====================================

loadUser();

// =====================================
// TEMPO PARA PRÓXIMA ALTERAÇÃO
// =====================================

function getTimeRemaining(date, days) {

    if (!date) {
        return null;
    }

    const changedAt =
        new Date(date).getTime();

    const availableAt =
        changedAt +
        days * 24 * 60 * 60 * 1000;

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

    const remainingMinutes =
        totalMinutes % 60;

    const totalDays =
        Math.floor(
            totalHours / 24
        );

    const remainingHours =
        totalHours % 24;


    if (totalDays > 0) {

        return `${totalDays}d ${remainingHours}h`;

    }


    if (totalHours > 0) {

        return `${totalHours}h ${remainingMinutes}min`;

    }


    return `${remainingMinutes}min`;

}
