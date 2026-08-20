// =====================================
// VINCI 1.1 FOCUS — AUTH GUARD
// LOGIN PERSISTENTE / PWA / SAFARI
// =====================================

(async function () {

    "use strict";


    const LOGIN_PAGE =
        "login.html";


    function goToLogin() {

        window.location.replace(
            LOGIN_PAGE
        );

    }


    async function readSession() {

        const {
            data,
            error
        } =
            await db.auth.getSession();


        if (error) {

            throw error;

        }


        return data?.session ||
            null;

    }


    function waitForInitialAuthState(
        timeoutMs = 1800
    ) {

        return new Promise(
            resolve => {

                let settled =
                    false;


                let timer =
                    null;


                let subscription =
                    null;


                const finish =
                    session => {

                        if (settled) {
                            return;
                        }


                        settled =
                            true;


                        if (timer) {

                            clearTimeout(
                                timer
                            );

                        }


                        subscription
                            ?.unsubscribe?.();


                        resolve(
                            session ||
                            null
                        );

                    };


                const authListener =
                    db.auth
                    .onAuthStateChange(
                        (
                            event,
                            session
                        ) => {

                            if (
                                event ===
                                    "INITIAL_SESSION" ||
                                event ===
                                    "SIGNED_IN" ||
                                event ===
                                    "TOKEN_REFRESHED"
                            ) {

                                finish(
                                    session
                                );

                            }

                        }
                    );


                subscription =
                    authListener
                    ?.data
                    ?.subscription ||
                    null;


                timer =
                    setTimeout(
                        () => {

                            finish(
                                null
                            );

                        },
                        timeoutMs
                    );

            }
        );

    }


    try {

        if (
            typeof db ===
            "undefined"
        ) {

            console.error(
                "Vinci: Supabase não foi carregado."
            );

            return;

        }


        /*
           Normalmente a sessão já vem daqui porque fica
           persistida no localStorage.
        */

        let session =
            await readSession();


        /*
           Em PWA/Safari, ao voltar de suspensão, o Auth pode
           precisar de alguns milissegundos para restaurar
           e renovar a sessão.
        */

        if (!session) {

            session =
                await waitForInitialAuthState();

        }


        /*
           Última leitura após INITIAL_SESSION/TOKEN_REFRESHED.
        */

        if (!session) {

            session =
                await readSession();

        }


        if (!session) {

            goToLogin();

            return;

        }


        console.log(
            "Vinci: sessão restaurada."
        );


    } catch (error) {

        console.error(
            "Vinci: erro ao restaurar sessão:",
            error
        );


        /*
           Uma falha momentânea não deve expulsar o usuário
           sem tentar uma última leitura local.
        */

        try {

            const fallback =
                await readSession();


            if (fallback) {

                return;

            }

        } catch (
            fallbackError
        ) {

            console.error(
                "Vinci: fallback da sessão falhou:",
                fallbackError
            );

        }


        goToLogin();

    }

})();
