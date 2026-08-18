// =====================================
// VINCI — USER SEARCH 2.0
// =====================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const searchButton =
            document.getElementById(
                "openSearch"
            );

        const searchPanel =
            document.getElementById(
                "searchPanel"
            );

        const closeSearch =
            document.getElementById(
                "closeSearch"
            );

        const searchInput =
            document.getElementById(
                "searchInput"
            );

        const searchSubmit =
            document.getElementById(
                "searchSubmit"
            );

        const searchResults =
            document.getElementById(
                "searchResults"
            );


        // =================================
        // VERIFICAR ELEMENTOS
        // =================================

        if (
            !searchButton ||
            !searchPanel ||
            !closeSearch ||
            !searchInput ||
            !searchSubmit ||
            !searchResults
        ) {

            console.error(
                "VINCI SEARCH — elementos da pesquisa não encontrados."
            );

            return;

        }


        // =================================
        // ABRIR
        // =================================

        searchButton.addEventListener(
            "click",
            function () {

                searchPanel.classList.remove(
                    "hidden"
                );

                setTimeout(
                    function () {

                        searchInput.focus();

                    },
                    50
                );

            }
        );


        // =================================
        // FECHAR
        // =================================

        function closeSearchPanel() {

            searchPanel.classList.add(
                "hidden"
            );

            searchInput.value =
                "";

            searchResults.innerHTML =
                "";

        }


        closeSearch.addEventListener(
            "click",
            closeSearchPanel
        );


        // =================================
        // FECHAR CLICANDO FORA
        // =================================

        searchPanel.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    searchPanel
                ) {

                    closeSearchPanel();

                }

            }
        );


        // =================================
        // FECHAR COM ESC
        // =================================

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Escape" &&
                    !searchPanel.classList.contains(
                        "hidden"
                    )
                ) {

                    closeSearchPanel();

                }

            }
        );


        // =================================
        // EXECUTAR PESQUISA
        // =================================

        async function runSearch() {

            let query =
                searchInput.value
                    .trim()
                    .toLowerCase();


            // =================================
            // ACEITAR @USUARIO
            // =================================

            query =
                query.replace(
                    /^@+/,
                    ""
                );


            // =================================
            // PESQUISA VAZIA
            // =================================

            if (!query) {

                searchResults.innerHTML = `

                    <div class="search-status">

                        <div class="search-status-icon">
                            🔎
                        </div>

                        <strong>
                            Digite um usuário
                        </strong>

                        <span>
                            Você pode pesquisar por @, nome de usuário ou nome.
                        </span>

                    </div>

                `;

                return;

            }


            // =================================
            // ESTADO DE CARREGAMENTO
            // =================================

            searchSubmit.disabled =
                true;


            searchSubmit.textContent =
                "Buscando...";


            searchResults.innerHTML = `

                <div class="search-status">

                    Pesquisando...

                </div>

            `;


            try {

                // =================================
                // LIMPAR CARACTERES PROBLEMÁTICOS
                // =================================

                const safeQuery =
                    query
                        .replace(/,/g, "")
                        .replace(/\(/g, "")
                        .replace(/\)/g, "");


                // =================================
                // CONSULTAR SUPABASE
                // =================================

                const {
                    data,
                    error
                } = await db
                    .from("profiles")
                    .select(`
                        id,
                        username,
                        name,
                        avatar_url
                    `)
                    .or(
                        `username.ilike.%${safeQuery}%,name.ilike.%${safeQuery}%`
                    )
                    .limit(20);


                // =================================
                // ERRO DO SUPABASE
                // =================================

                if (error) {

                    throw error;

                }


                searchResults.innerHTML =
                    "";


                // =================================
                // NENHUM RESULTADO
                // =================================

                if (
                    !data ||
                    data.length === 0
                ) {

                    searchResults.innerHTML = `

                        <div class="search-status">

                            <div class="search-status-icon">
                                🔎
                            </div>

                            <strong>
                                Nenhuma conta encontrada
                            </strong>

                            <span>
                                Tente outro nome ou nome de usuário.
                            </span>

                        </div>

                    `;

                    return;

                }


                // =================================
                // ORGANIZAR RESULTADOS
                // =================================

                const sortedProfiles =
                    [...data].sort(
                        function (
                            a,
                            b
                        ) {

                            const aUsername =
                                (
                                    a.username ||
                                    ""
                                ).toLowerCase();


                            const bUsername =
                                (
                                    b.username ||
                                    ""
                                ).toLowerCase();


                            // USERNAME EXATO PRIMEIRO

                            if (
                                aUsername === query &&
                                bUsername !== query
                            ) {

                                return -1;

                            }


                            if (
                                bUsername === query &&
                                aUsername !== query
                            ) {

                                return 1;

                            }


                            // USERNAMES QUE COMEÇAM
                            // COM A PESQUISA DEPOIS

                            if (
                                aUsername.startsWith(
                                    query
                                ) &&
                                !bUsername.startsWith(
                                    query
                                )
                            ) {

                                return -1;

                            }


                            if (
                                bUsername.startsWith(
                                    query
                                ) &&
                                !aUsername.startsWith(
                                    query
                                )
                            ) {

                                return 1;

                            }


                            return aUsername.localeCompare(
                                bUsername
                            );

                        }
                    );


                // =================================
                // CRIAR RESULTADOS
                // =================================

                sortedProfiles.forEach(
                    function (profile) {

                        const result =
                            document.createElement(
                                "button"
                            );


                        result.type =
                            "button";


                        result.className =
                            "search-result";


                        // =============================
                        // AVATAR
                        // =============================

                        const avatar =
                            document.createElement(
                                "img"
                            );


                        avatar.className =
                            "search-result-avatar";


                        avatar.src =
                            profile.avatar_url ||
                            "assets/default-avatar.png";


                        avatar.alt =
                            "";


                        avatar.onerror =
                            function () {

                                this.onerror =
                                    null;


                                this.src =
                                    "assets/default-avatar.png";

                            };


                        // =============================
                        // INFORMAÇÕES
                        // =============================

                        const info =
                            document.createElement(
                                "div"
                            );


                        info.className =
                            "search-result-info";


                        const name =
                            document.createElement(
                                "strong"
                            );


                        name.textContent =
                            profile.name ||
                            "Usuário";


                        const username =
                            document.createElement(
                                "span"
                            );


                        username.textContent =
                            "@" +
                            (
                                profile.username ||
                                "usuario"
                            );


                        info.appendChild(
                            name
                        );


                        info.appendChild(
                            username
                        );


                        // =============================
                        // SETA
                        // =============================

                        const arrow =
                            document.createElement(
                                "span"
                            );


                        arrow.className =
                            "search-result-arrow";


                        arrow.textContent =
                            "›";


                        // =============================
                        // MONTAR RESULTADO
                        // =============================

                        result.appendChild(
                            avatar
                        );


                        result.appendChild(
                            info
                        );


                        result.appendChild(
                            arrow
                        );


                        // =============================
                        // ABRIR PERFIL
                        // =============================

                        result.addEventListener(
                            "click",
                            function () {

                                window.location.href =
                                    `profile.html?id=${encodeURIComponent(
                                        profile.id
                                    )}`;

                            }
                        );


                        searchResults.appendChild(
                            result
                        );

                    }
                );

            }

            catch (error) {

                console.error(
                    "VINCI SEARCH — erro:",
                    error
                );


                searchResults.innerHTML =
                    "";


                // =================================
                // MOSTRAR ERRO NA TELA
                // =================================

                const errorBox =
                    document.createElement(
                        "div"
                    );


                errorBox.className =
                    "search-status search-error";


                const icon =
                    document.createElement(
                        "div"
                    );


                icon.className =
                    "search-status-icon";


                icon.textContent =
                    "⚠️";


                const title =
                    document.createElement(
                        "strong"
                    );


                title.textContent =
                    "Não foi possível pesquisar";


                const message =
                    document.createElement(
                        "span"
                    );


                message.textContent =
                    error.message ||
                    "Tente novamente.";


                errorBox.appendChild(
                    icon
                );


                errorBox.appendChild(
                    title
                );


                errorBox.appendChild(
                    message
                );


                searchResults.appendChild(
                    errorBox
                );

            }

            finally {

                // =================================
                // RESTAURAR BOTÃO
                // =================================

                searchSubmit.disabled =
                    false;


                searchSubmit.textContent =
                    "Pesquisar";

            }

        }


        // =================================
        // BOTÃO PESQUISAR
        // =================================

        searchSubmit.addEventListener(
            "click",
            runSearch
        );


        // =================================
        // ENTER TAMBÉM PESQUISA
        // =================================

        searchInput.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Enter"
                ) {

                    event.preventDefault();


                    runSearch();

                }

            }
        );


        // =================================
        // SISTEMA PRONTO
        // =================================

        console.log(
            "VINCI — SEARCH SYSTEM 2.0 ATIVO ✓"
        );

    }
);