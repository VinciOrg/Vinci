// =====================================
// VINCI 0.7.0 — PROFILE POST
// =====================================


let currentUser = null;


// =====================================
// ELEMENTOS
// =====================================

const contentInput =
    document.getElementById(
        "profilePostContent"
    );


const counter =
    document.getElementById(
        "profilePostCounter"
    );


const message =
    document.getElementById(
        "profilePostMessage"
    );


const publishButton =
    document.getElementById(
        "publishProfilePost"
    );


const cancelButton =
    document.getElementById(
        "cancelPost"
    );


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

}


// =====================================
// CONTADOR
// =====================================

contentInput.addEventListener(
    "input",
    function () {

        counter.textContent =
            `${this.value.length} / 500`;

    }
);


// =====================================
// PUBLICAR
// =====================================

publishButton.addEventListener(
    "click",
    async function () {

        const content =
            contentInput.value.trim();


        // =================================
        // VALIDAÇÃO
        // =================================

        if (!content) {

            message.textContent =
                "Escreva alguma coisa antes de publicar.";

            contentInput.focus();

            return;

        }


        if (content.length > 500) {

            message.textContent =
                "O post pode ter no máximo 500 caracteres.";

            return;

        }


        if (
            window.VinciPostCircles &&
            !window.VinciPostCircles.isValid()
        ) {

            message.textContent =
                "Escolha um círculo para este post.";

            return;

        }


        // =================================
        // DESATIVAR
        // =================================

        publishButton.disabled =
            true;


        publishButton.textContent =
            "Publicando...";


        message.textContent =
            "";


        try {


            // =================================
            // INSERIR NO BANCO
            // =================================

            const {
                data,
                error
            } = await db
                .from("profile_posts")
                .insert({

                    user_id:
                        currentUser.id,

                    content:
                        content,

                    ...(window.VinciPostCircles
                        ?.getAudience
                        ?.() || {
                            audience_type: "public",
                            circle_id: null
                        })

                })
                .select()
                .single();


            if (error) {

                throw error;

            }


            console.log(
                "Post criado:",
                data
            );


            // =================================
            // SUCESSO
            // =================================

            message.textContent =
                "Publicado! 🍊";


            setTimeout(
                function () {

                    window.location.href =
                        "profile.html";

                },
                600
            );


        }

        catch (error) {

            console.error(
                "Erro ao criar post:",
                error
            );


            message.textContent =
                "Não foi possível publicar o post.";


            publishButton.disabled =
                false;


            publishButton.textContent =
                "Publicar";

        }

    }
);


// =====================================
// CANCELAR
// =====================================

cancelButton.addEventListener(
    "click",
    function () {

        window.location.href =
            "index.html";

    }
);


// =====================================
// INICIAR
// =====================================

loadUser();
