// =====================================
// VINCI 0.7.0 — CREATE MENU
// =====================================


const openCreateMenu =
    document.getElementById(
        "openCreateMenu"
    );


const createMenu =
    document.getElementById(
        "createMenu"
    );


const closeCreateMenu =
    document.getElementById(
        "closeCreateMenu"
    );


const cancelCreate =
    document.getElementById(
        "cancelCreate"
    );


const createPublication =
    document.getElementById(
        "createPublication"
    );


const createProfilePost =
    document.getElementById(
        "createProfilePost"
    );


// =====================================
// ABRIR
// =====================================

openCreateMenu.addEventListener(
    "click",
    function () {

        createMenu
            .classList
            .remove("hidden");

    }
);


// =====================================
// FECHAR
// =====================================

function closeMenu() {

    createMenu
        .classList
        .add("hidden");

}


closeCreateMenu.addEventListener(
    "click",
    closeMenu
);


cancelCreate.addEventListener(
    "click",
    closeMenu
);


// =====================================
// CLICAR FORA
// =====================================

createMenu.addEventListener(
    "click",
    function (event) {

        if (
            event.target ===
            createMenu
        ) {

            closeMenu();

        }

    }
);


// =====================================
// PUBLICAÇÃO
// =====================================

createPublication.addEventListener(
    "click",
    function () {

        window.location.href =
            "post.html";

    }
);


// =====================================
// POST DE PERFIL
// =====================================

createProfilePost.addEventListener(
    "click",
    function () {

        window.location.href =
            "profile-post.html";

    }
);


// =====================================
// ABRIR AO VIR DE OUTRA PÁGINA
// =====================================

if (
    window.location.hash === "#create" &&
    createMenu
) {

    createMenu
        .classList
        .remove("hidden");

    history.replaceState(
        null,
        "",
        window.location.pathname +
        window.location.search
    );

}
