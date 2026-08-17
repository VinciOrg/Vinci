// =====================================
// VINCI — DELETE SYSTEM 1.2
// =====================================

let deleteCurrentUser = null;


// =====================================
// CARREGAR USUÁRIO
// =====================================

async function loadDeleteUser() {

    const {
        data,
        error
    } = await db.auth.getUser();


    if (
        error ||
        !data?.user
    ) {

        console.error(
            "VINCI DELETE — usuário não autenticado:",
            error
        );

        return false;

    }


    deleteCurrentUser =
        data.user;


    return true;

}


// =====================================
// PEGAR CAMINHO DA IMAGEM
// =====================================

function getImageStoragePath(
    imageURL
) {

    if (!imageURL) {

        return null;

    }


    try {

        const url =
            new URL(
                imageURL
            );


        const marker =
            "/storage/v1/object/public/vinci-images/";


        const index =
            url.pathname.indexOf(
                marker
            );


        if (
            index === -1
        ) {

            return null;

        }


        return decodeURIComponent(
            url.pathname.substring(
                index +
                marker.length
            )
        );

    }

    catch (error) {

        console.error(
            "VINCI DELETE — URL inválida:",
            error
        );

        return null;

    }

}


// =====================================
// APAGAR IMAGEM
// =====================================

async function removePostImage(
    imageURL
) {

    const path =
        getImageStoragePath(
            imageURL
        );


    if (!path) {

        return;

    }


    const {
        error
    } = await db.storage
        .from(
            "vinci-images"
        )
        .remove([
            path
        ]);


    if (error) {

        console.error(
            "VINCI DELETE — erro no Storage:",
            error
        );

        throw error;

    }

}


// =====================================
// EXCLUIR FOTO
// =====================================

async function removePhotoPost(
    postId,
    userId,
    element,
    imageURL
) {

    console.log(
        "VINCI DELETE — excluindo:",
        postId
    );


    const {
        data: authData,
        error: authError
    } = await db.auth.getUser();


    if (
        authError ||
        !authData?.user
    ) {

        alert(
            "Usuário não autenticado."
        );

        return;

    }


    if (
        authData.user.id !==
        userId
    ) {

        alert(
            "Você só pode excluir suas próprias publicações."
        );

        return;

    }


    // =================================
    // DELETE DO BANCO
    // =================================

    const {
        error
    } = await db
        .from(
            "posts"
        )
        .delete()
        .eq(
            "id",
            postId
        )
        .eq(
            "user_id",
            authData.user.id
        );


    if (error) {

        console.error(
            "VINCI DELETE — erro no Supabase:",
            error
        );


        alert(
            "Não foi possível excluir a publicação.\n\n" +
            error.message
        );


        return;

    }


    // =================================
    // DELETE DO STORAGE
    // =================================

    try {

        await removePostImage(
            imageURL
        );

    }

    catch (storageError) {

        console.error(
            "VINCI DELETE — erro no Storage:",
            storageError
        );

    }


    // =================================
    // REMOVER DA TELA
    // =================================

    if (element) {

        element.remove();

    }


    console.log(
        "VINCI DELETE — publicação excluída ✓"
    );

}


// =====================================
// EXCLUIR POST DE TEXTO
// =====================================

async function removeTextPost(
    postId,
    userId,
    element
) {

    const {
        data: authData,
        error: authError
    } = await db.auth.getUser();


    if (
        authError ||
        !authData?.user
    ) {

        alert(
            "Usuário não autenticado."
        );

        return;

    }


    if (
        authData.user.id !==
        userId
    ) {

        alert(
            "Você só pode excluir seus próprios posts."
        );

        return;

    }


    const {
        error
    } = await db
        .from(
            "profile_posts"
        )
        .delete()
        .eq(
            "id",
            postId
        )
        .eq(
            "user_id",
            authData.user.id
        );


    if (error) {

        console.error(
            "VINCI DELETE — erro no Supabase:",
            error
        );


        alert(
            "Não foi possível excluir o post.\n\n" +
            error.message
        );


        return;

    }


    if (element) {

        element.remove();

    }


    console.log(
        "VINCI DELETE — post excluído ✓"
    );

}


// =====================================
// CANCELAR CONFIRMAÇÃO
// =====================================

function resetDeleteButtons(
    exceptButton = null
) {

    document
        .querySelectorAll(
            ".vinci-delete-button.confirming"
        )
        .forEach(
            function (button) {

                if (
                    button ===
                    exceptButton
                ) {

                    return;

                }


                button.classList.remove(
                    "confirming"
                );


                button.textContent =
                    "Excluir";

            }
        );

}


// =====================================
// BOTÃO FOTO
// =====================================

function addPhotoDeleteButton(
    element
) {

    if (
        !deleteCurrentUser
    ) {

        return;

    }


    if (
        element.dataset.deleteReady ===
        "true"
    ) {

        return;

    }


    const postId =
        element.dataset.postId;


    const userId =
        element.dataset.userId;


    if (
        !postId ||
        !userId
    ) {

        return;

    }


    if (
        userId !==
        deleteCurrentUser.id
    ) {

        return;

    }


    const image =
        element.querySelector(
            "img"
        );


    const imageURL =
        image?.src ||
        "";


    const button =
        document.createElement(
            "button"
        );


    button.type =
        "button";


    button.className =
        "vinci-delete-button";


    button.textContent =
        "Excluir";


    button.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();

            event.stopPropagation();


            // =================================
            // PRIMEIRO TOQUE
            // =================================

            if (
                !button.classList.contains(
                    "confirming"
                )
            ) {

                resetDeleteButtons(
                    button
                );


                button.classList.add(
                    "confirming"
                );


                button.textContent =
                    "Excluir?";


                return;

            }


            // =================================
            // SEGUNDO TOQUE
            // =================================

            button.disabled =
                true;


            button.textContent =
                "Excluindo...";


            await removePhotoPost(
                postId,
                userId,
                element,
                imageURL
            );

        }
    );


    element.appendChild(
        button
    );


    element.dataset.deleteReady =
        "true";

}


// =====================================
// BOTÃO POST DE TEXTO
// =====================================

function addTextDeleteButton(
    element
) {

    if (
        !deleteCurrentUser
    ) {

        return;

    }


    if (
        element.dataset.deleteReady ===
        "true"
    ) {

        return;

    }


    const postId =
        element.dataset.postId;


    if (!postId) {

        return;

    }


    const profileId =
        new URLSearchParams(
            window.location.search
        ).get("id");


    const viewingId =
        profileId ||
        deleteCurrentUser.id;


    if (
        viewingId !==
        deleteCurrentUser.id
    ) {

        return;

    }


    const button =
        document.createElement(
            "button"
        );


    button.type =
        "button";


    button.className =
        "vinci-delete-button";


    button.textContent =
        "Excluir";


    button.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();

            event.stopPropagation();


            // PRIMEIRO TOQUE

            if (
                !button.classList.contains(
                    "confirming"
                )
            ) {

                resetDeleteButtons(
                    button
                );


                button.classList.add(
                    "confirming"
                );


                button.textContent =
                    "Excluir?";


                return;

            }


            // SEGUNDO TOQUE

            button.disabled =
                true;


            button.textContent =
                "Excluindo...";


            await removeTextPost(
                postId,
                deleteCurrentUser.id,
                element
            );

        }
    );


    element.appendChild(
        button
    );


    element.dataset.deleteReady =
        "true";

}


// =====================================
// PROCURAR POSTS
// =====================================

function scanDeleteElements() {

    document
        .querySelectorAll(
            ".vinci-post"
        )
        .forEach(
            function (element) {

                addPhotoDeleteButton(
                    element
                );

            }
        );


    document
        .querySelectorAll(
            ".profile-post"
        )
        .forEach(
            function (element) {

                addPhotoDeleteButton(
                    element
                );

            }
        );


    document
        .querySelectorAll(
            ".profile-text-post"
        )
        .forEach(
            function (element) {

                addTextDeleteButton(
                    element
                );

            }
        );

}


// =====================================
// CANCELAR AO CLICAR FORA
// =====================================

document.addEventListener(
    "click",
    function (event) {

        if (
            !event.target.closest(
                ".vinci-delete-button"
            )
        ) {

            resetDeleteButtons();

        }

    }
);


// =====================================
// OBSERVADOR
// =====================================

function startDeleteObserver() {

    const observer =
        new MutationObserver(
            function () {

                scanDeleteElements();

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


    scanDeleteElements();

}


// =====================================
// INICIAR
// =====================================

async function initDeleteSystem() {

    const logged =
        await loadDeleteUser();


    if (!logged) {

        return;

    }


    startDeleteObserver();


    console.log(
        "VINCI — DELETE SYSTEM 1.2 ATIVO ✓"
    );

}


initDeleteSystem();
