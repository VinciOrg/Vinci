// =====================================
// VINCI — LOGOUT NO PERFIL
// =====================================

(function () {
    "use strict";

    const button =
        document.getElementById("profileLogoutButton");

    if (!button) return;


    async function initProfileLogout() {

        try {

            if (typeof db === "undefined") {
                return;
            }

            const {
                data,
                error
            } = await db.auth.getUser();

            if (
                error ||
                !data?.user
            ) {
                return;
            }

            const loggedUser = data.user;

            const params =
                new URLSearchParams(
                    window.location.search
                );

            const requestedProfileId =
                params.get("id");

            // Sem ?id=, o usuário está no próprio perfil.
            // Com ?id=, só mostra o botão se o ID for o dele.
            const isOwnProfile =
                !requestedProfileId ||
                requestedProfileId === loggedUser.id;

            if (isOwnProfile) {
                button.classList.remove("hidden");
            }

        } catch (error) {

            console.error(
                "Vinci: erro ao preparar logout:",
                error
            );

        }
    }


    button.addEventListener(
        "click",
        async function () {

            const confirmed = window.confirm(
                "Quer sair da sua conta do Vinci?"
            );

            if (!confirmed) return;

            const originalHTML = button.innerHTML;

            button.disabled = true;
            button.textContent = "Saindo...";

            try {

                const { error } =
                    await db.auth.signOut();

                if (error) {
                    throw error;
                }

                window.location.replace(
                    "login.html"
                );

            } catch (error) {

                console.error(
                    "Vinci: erro ao sair da conta:",
                    error
                );

                button.disabled = false;
                button.innerHTML = originalHTML;

                window.alert(
                    "Não foi possível sair agora. Tente novamente."
                );

            }

        }
    );


    initProfileLogout();

})();
