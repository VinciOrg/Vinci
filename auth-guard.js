// =====================================
// VINCI — AUTH GUARD
// =====================================

(async function () {

    try {

        // Espera o Supabase estar disponível
        if (typeof db === "undefined") {

            console.error(
                "Vinci: Supabase não foi carregado."
            );

            return;

        }


        // Verifica a sessão atual
        const {
            data,
            error
        } = await db.auth.getSession();


        // Erro ao verificar sessão
        if (error) {

            console.error(
                "Erro ao verificar sessão:",
                error
            );

            window.location.replace(
                "login.html"
            );

            return;

        }


        // Usuário não está logado
        if (!data.session) {

            window.location.replace(
                "login.html"
            );

            return;

        }


        // Usuário está autenticado
        console.log(
            "Vinci: usuário autenticado."
        );


    } catch (error) {

        console.error(
            "Erro no Auth Guard:",
            error
        );

        window.location.replace(
            "login.html"
        );

    }

})();
