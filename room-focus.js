(function () {

    "use strict";


    function init() {

        const original =
            document.querySelector(
                ".room-tabs"
            );

        const heroActions =
            document.querySelector(
                ".room-hero-actions"
            );


        if (
            !original ||
            original.dataset.focusReady ===
                "1"
        ) {
            return;
        }


        original.dataset.focusReady =
            "1";


        original.classList.add(
            "focus-original-room-tabs"
        );


        /* =====================================
           NAVEGAÇÃO FOCUS
        ===================================== */

        const nav =
            document.createElement(
                "nav"
            );


        nav.className =
            "focus-room-tabs";


        nav.innerHTML =
            `
                <button
                    type="button"
                    class="active"
                    data-focus-room="today"
                >
                    Hoje
                </button>

                <button
                    type="button"
                    data-focus-room="chat"
                >
                    Chat
                </button>

                <button
                    type="button"
                    data-focus-room="memories"
                >
                    Memórias
                </button>

                <button
                    type="button"
                    data-focus-room="more"
                >
                    Mais
                </button>
            `;


        original.insertAdjacentElement(
            "beforebegin",
            nav
        );


        /* =====================================
           MEMÓRIAS
        ===================================== */

        const memories =
            document.createElement(
                "section"
            );


        memories.id =
            "focus-room-memories";


        memories.className =
            "focus-room-panel hidden";


        memories.innerHTML =
            `
                <header>

                    <span>
                        MEMÓRIAS
                    </span>

                    <h2>
                        O que vocês viveram
                    </h2>

                    <p>
                        Mural, arquivo e cápsulas ficam juntos agora.
                    </p>

                </header>


                <div class="focus-room-cards">

                    <button
                        type="button"
                        data-open-tab="mural"
                    >
                        <i>▦</i>

                        <span>
                            <strong>
                                Mural de hoje
                            </strong>

                            <small>
                                Fotos e votação do desafio atual.
                            </small>
                        </span>

                        <b>›</b>
                    </button>


                    <button
                        type="button"
                        data-open-tab="murals"
                    >
                        <i>◫</i>

                        <span>
                            <strong>
                                Murais anteriores
                            </strong>

                            <small>
                                Reveja os desafios que já passaram.
                            </small>
                        </span>

                        <b>›</b>
                    </button>


                    <button
                        type="button"
                        data-open-tab="capsules"
                    >
                        <i>⌛</i>

                        <span>
                            <strong>
                                Cápsulas do Tempo
                            </strong>

                            <small>
                                Memórias guardadas para o futuro.
                            </small>
                        </span>

                        <b>›</b>
                    </button>

                </div>
            `;


        /* =====================================
           MAIS
        ===================================== */

        const more =
            document.createElement(
                "section"
            );


        more.id =
            "focus-room-more";


        more.className =
            "focus-room-panel hidden";


        more.innerHTML =
            `
                <header>

                    <span>
                        MAIS DA ROOM
                    </span>

                    <h2>
                        Recursos secundários
                    </h2>

                    <p>
                        Continuam aqui, só não disputam atenção
                        com o desafio e o chat.
                    </p>

                </header>


                <div class="focus-room-cards">

                    <button
                        type="button"
                        data-open-tab="games"
                    >
                        <i>✦</i>

                        <span>
                            <strong>
                                Jogos
                            </strong>

                            <small>
                                Vinci Flash, Quem Tirou? e Blind Caption.
                            </small>
                        </span>

                        <b>›</b>
                    </button>


                    <button
                        type="button"
                        data-open-tab="ranking"
                    >
                        <i>🏆</i>

                        <span>
                            <strong>
                                Ranking
                            </strong>

                            <small>
                                Hall of Fame e vencedores da Room.
                            </small>
                        </span>

                        <b>›</b>
                    </button>


                    <button
                        type="button"
                        data-focus-level
                    >
                        <i>↗</i>

                        <span>
                            <strong>
                                Nível da Room
                            </strong>

                            <small>
                                XP, progresso e temporada.
                            </small>
                        </span>

                        <b>›</b>
                    </button>


                    <button
                        type="button"
                        data-focus-room-settings
                    >
                        <i>⚙</i>

                        <span>
                            <strong>
                                Configurações
                            </strong>

                            <small>
                                Nome, descrição, capa e gerenciamento.
                            </small>
                        </span>

                        <b>›</b>
                    </button>

                </div>
            `;


        original.insertAdjacentElement(
            "afterend",
            more
        );


        original.insertAdjacentElement(
            "afterend",
            memories
        );


        function oldButton(
            tab
        ) {

            return original.querySelector(
                `[data-tab="${tab}"]`
            );

        }


        function hidePanels() {

            memories.classList.add(
                "hidden"
            );


            more.classList.add(
                "hidden"
            );

        }


        function activeFocus(
            key
        ) {

            nav
            .querySelectorAll(
                "button"
            )
            .forEach(
                button => {

                    button.classList.toggle(
                        "active",
                        button.dataset.focusRoom ===
                            key
                    );

                }
            );

        }


        function openOld(
            tab,
            category
        ) {

            hidePanels();


            oldButton(
                tab
            )
            ?.click();


            activeFocus(
                category ||
                tab
            );

        }


        nav
        .querySelector(
            '[data-focus-room="today"]'
        )
        .onclick =
            () =>
                openOld(
                    "today",
                    "today"
                );


        nav
        .querySelector(
            '[data-focus-room="chat"]'
        )
        .onclick =
            () =>
                openOld(
                    "chat",
                    "chat"
                );


        nav
        .querySelector(
            '[data-focus-room="memories"]'
        )
        .onclick =
            () => {

                document
                .querySelectorAll(
                    ".room-tab"
                )
                .forEach(
                    section => {

                        section.classList.remove(
                            "active"
                        );

                    }
                );


                more.classList.add(
                    "hidden"
                );


                memories.classList.remove(
                    "hidden"
                );


                activeFocus(
                    "memories"
                );

            };


        nav
        .querySelector(
            '[data-focus-room="more"]'
        )
        .onclick =
            () => {

                document
                .querySelectorAll(
                    ".room-tab"
                )
                .forEach(
                    section => {

                        section.classList.remove(
                            "active"
                        );

                    }
                );


                memories.classList.add(
                    "hidden"
                );


                more.classList.remove(
                    "hidden"
                );


                activeFocus(
                    "more"
                );

            };


        memories
        .querySelectorAll(
            "[data-open-tab]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        openOld(
                            button.dataset.openTab,
                            "memories"
                        );

            }
        );


        more
        .querySelectorAll(
            "[data-open-tab]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        openOld(
                            button.dataset.openTab,
                            "more"
                        );

            }
        );


        more
        .querySelector(
            "[data-focus-level]"
        )
        .onclick =
            () => {

                openOld(
                    "today",
                    "more"
                );


                setTimeout(
                    () => {

                        document
                        .getElementById(
                            "roomProgressPanel"
                        )
                        ?.scrollIntoView({
                            behavior:
                                "smooth",
                            block:
                                "center"
                        });

                    },
                    80
                );

            };


        more
        .querySelector(
            "[data-focus-room-settings]"
        )
        .onclick =
            () => {

                const edit =
                    document.getElementById(
                        "editRoomButton"
                    );


                const invite =
                    document.getElementById(
                        "inviteMemberButton"
                    );


                if (
                    edit &&
                    !edit.classList.contains(
                        "hidden"
                    )
                ) {

                    edit.click();

                    return;

                }


                if (
                    invite &&
                    !invite.classList.contains(
                        "hidden"
                    )
                ) {

                    invite.click();

                    return;

                }


                alert(
                    "Você não tem opções de gerenciamento nesta Room."
                );

            };


        original
        .querySelectorAll(
            "[data-tab]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const tab =
                            button.dataset.tab;


                        if (
                            tab ===
                            "today"
                        ) {

                            activeFocus(
                                "today"
                            );

                        } else if (
                            tab ===
                            "chat"
                        ) {

                            activeFocus(
                                "chat"
                            );

                        } else if (
                            [
                                "mural",
                                "murals",
                                "capsules"
                            ]
                            .includes(
                                tab
                            )
                        ) {

                            activeFocus(
                                "memories"
                            );

                        } else {

                            activeFocus(
                                "more"
                            );

                        }

                    },
                    true
                );

            }
        );


        /* =====================================
           MENU DOS 3 PONTOS — CORREÇÃO
        ===================================== */

        if (heroActions) {

            const editButton =
                document.getElementById(
                    "editRoomButton"
                );


            const inviteButton =
                document.getElementById(
                    "inviteMemberButton"
                );


            const leaveButton =
                document.getElementById(
                    "leaveRoomButton"
                );


            /*
               Os botões ORIGINAIS continuam no DOM.
               room.js continua controlando permissões e onclick.

               Nós apenas escondemos visualmente esses botões
               e criamos um menu flutuante que chama .click()
               neles.
            */

            heroActions.classList.add(
                "focus-room-actions-ready"
            );


            const trigger =
                document.createElement(
                    "button"
                );


            trigger.type =
                "button";


            trigger.className =
                "room-soft-btn focus-room-actions-trigger";


            trigger.innerHTML =
                `
                    <span aria-hidden="true">
                        •••
                    </span>
                `;


            trigger.setAttribute(
                "aria-label",
                "Mais opções da Room"
            );


            trigger.setAttribute(
                "aria-haspopup",
                "menu"
            );


            trigger.setAttribute(
                "aria-expanded",
                "false"
            );


            heroActions.appendChild(
                trigger
            );


            const menu =
                document.createElement(
                    "div"
                );


            menu.className =
                "focus-room-actions-menu hidden";


            menu.setAttribute(
                "role",
                "menu"
            );


            document.body.appendChild(
                menu
            );


            function sourceVisible(
                source
            ) {

                return Boolean(
                    source &&
                    !source.classList.contains(
                        "hidden"
                    )
                );

            }


            function menuItem(
                label,
                icon,
                source,
                danger =
                    false
            ) {

                if (
                    !sourceVisible(
                        source
                    )
                ) {

                    return "";

                }


                return `
                    <button
                        type="button"
                        class="focus-room-menu-item ${danger ? "danger" : ""}"
                        role="menuitem"
                        data-source-id="${source.id}"
                    >

                        <span class="focus-room-menu-icon">
                            ${icon}
                        </span>

                        <span class="focus-room-menu-copy">
                            ${label}
                        </span>

                    </button>
                `;

            }


            function rebuildMenu() {

                menu.innerHTML =
                    [
                        menuItem(
                            "Editar Room",
                            "✎",
                            editButton
                        ),

                        menuItem(
                            "Convidar pessoa",
                            "+",
                            inviteButton
                        ),

                        menuItem(
                            "Sair da Room",
                            "↗",
                            leaveButton,
                            true
                        )
                    ]
                    .filter(
                        Boolean
                    )
                    .join(
                        ""
                    );


                menu
                .querySelectorAll(
                    "[data-source-id]"
                )
                .forEach(
                    item => {

                        item.addEventListener(
                            "click",
                            event => {

                                event.preventDefault();

                                event.stopPropagation();


                                const source =
                                    document.getElementById(
                                        item.dataset.sourceId
                                    );


                                closeMenu();


                                /*
                                   Deixa o menu fechar primeiro.
                                   Depois chama o handler ORIGINAL
                                   do room.js.
                                */
                                setTimeout(
                                    () => {

                                        source?.click();

                                    },
                                    0
                                );

                            }
                        );

                    }
                );

            }


            function positionMenu() {

                if (
                    menu.classList.contains(
                        "hidden"
                    )
                ) {
                    return;
                }


                const triggerRect =
                    trigger.getBoundingClientRect();


                const menuWidth =
                    220;


                const margin =
                    10;


                const left =
                    Math.max(
                        margin,
                        Math.min(
                            window.innerWidth -
                                menuWidth -
                                margin,
                            triggerRect.right -
                                menuWidth
                        )
                    );


                menu.style.width =
                    `${menuWidth}px`;


                menu.style.left =
                    `${left}px`;


                /*
                   Primeiro posiciona abaixo.
                */
                menu.style.top =
                    `${triggerRect.bottom + 8}px`;


                const menuRect =
                    menu.getBoundingClientRect();


                /*
                   Se faltar espaço embaixo, abre acima.
                */
                if (
                    menuRect.bottom >
                    window.innerHeight -
                        margin
                ) {

                    menu.style.top =
                        `${Math.max(
                            margin,
                            triggerRect.top -
                                menuRect.height -
                                8
                        )}px`;

                }

            }


            function openMenu() {

                rebuildMenu();


                if (
                    !menu.children.length
                ) {

                    return;

                }


                menu.classList.remove(
                    "hidden"
                );


                trigger.setAttribute(
                    "aria-expanded",
                    "true"
                );


                positionMenu();


                requestAnimationFrame(
                    () => {

                        menu.classList.add(
                            "visible"
                        );

                    }
                );

            }


            function closeMenu() {

                menu.classList.remove(
                    "visible"
                );


                trigger.setAttribute(
                    "aria-expanded",
                    "false"
                );


                menu.classList.add(
                    "hidden"
                );

            }


            function toggleMenu(
                event
            ) {

                event.preventDefault();

                event.stopPropagation();


                if (
                    menu.classList.contains(
                        "hidden"
                    )
                ) {

                    openMenu();

                } else {

                    closeMenu();

                }

            }


            trigger.addEventListener(
                "click",
                toggleMenu
            );


            /*
               pointerdown funciona melhor no Safari/iPhone
               para fechar ao tocar fora.
            */
            document.addEventListener(
                "pointerdown",
                event => {

                    if (
                        event.target ===
                            trigger ||
                        trigger.contains(
                            event.target
                        ) ||
                        menu.contains(
                            event.target
                        )
                    ) {

                        return;

                    }


                    closeMenu();

                }
            );


            window.addEventListener(
                "resize",
                closeMenu
            );


            window.addEventListener(
                "orientationchange",
                closeMenu
            );


            /*
               Se o usuário rolar a página, fecha em vez de
               deixar o menu flutuando no lugar errado.
            */
            window.addEventListener(
                "scroll",
                closeMenu,
                {
                    passive:
                        true,
                    capture:
                        true
                }
            );


            window.visualViewport
            ?.addEventListener(
                "resize",
                closeMenu
            );

        }

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();

    }

})();
