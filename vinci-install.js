(function () {
    "use strict";

    let deferredPrompt = null;

    const ua = navigator.userAgent || "";

    const platform = {
        android: /Android/i.test(ua),
        ios: /iPhone|iPad|iPod/i.test(ua),
        instagram: /Instagram/i.test(ua),
        facebook: /FBAN|FBAV/i.test(ua),
        tiktok: /TikTok/i.test(ua),
        chromium: /Chrome|CriOS|EdgA|SamsungBrowser/i.test(ua),
        safari: /Safari/i.test(ua) && !/Chrome|CriOS|Edg|OPR|FxiOS/i.test(ua)
    };

    platform.inApp =
        platform.instagram ||
        platform.facebook ||
        platform.tiktok;

    function isStandalone() {
        return (
            window.matchMedia?.("(display-mode: standalone)")?.matches ||
            window.navigator.standalone === true
        );
    }

    function currentAbsoluteURL() {
        return location.href.split("#")[0];
    }

    function chromeIntentURL() {
        const url = new URL(currentAbsoluteURL());

        return (
            `intent://${url.host}${url.pathname}${url.search}` +
            `#Intent;scheme=${url.protocol.replace(":", "")};` +
            `package=com.android.chrome;end`
        );
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(
            /[&<>"']/g,
            character => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[character]
        );
    }

    function removeModal() {
        document
            .querySelector(".vinci-install-modal")
            ?.remove();

        document.body.classList.remove(
            "vinci-install-modal-open"
        );
    }

    function modalContent(type) {
        if (type === "ios") {
            return {
                badge: "IPHONE · SAFARI",
                title: "Instale o Vinci.",
                copy:
                    "No iPhone a instalação é feita pelo menu de compartilhamento do Safari.",
                steps: [
                    ["1", "Toque em Compartilhar", "Use o ícone de quadrado com seta para cima."],
                    ["2", "Adicionar à Tela de Início", "Role as opções e escolha essa ação."],
                    ["3", "Adicionar", "Confirme no canto superior direito."]
                ]
            };
        }

        if (type === "inapp-ios") {
            return {
                badge: "INSTAGRAM · IPHONE",
                title: "Abra no Safari.",
                copy:
                    "O navegador interno do Instagram não consegue abrir a instalação do PWA.",
                steps: [
                    ["1", "Abra o menu do Instagram", "Toque nos três pontinhos desta página."],
                    ["2", "Abrir no navegador", "Escolha abrir fora do Instagram, de preferência no Safari."],
                    ["3", "Instale pelo Safari", "Compartilhar → Adicionar à Tela de Início."]
                ]
            };
        }

        if (type === "android-wait") {
            return {
                badge: "ANDROID · CHROME",
                title: "Quase pronto.",
                copy:
                    "O Chrome ainda não liberou a janela automática de instalação nesta visita.",
                steps: [
                    ["1", "Continue no Vinci por alguns segundos", "O Chrome usa critérios próprios antes de liberar o prompt."],
                    ["2", "Toque em Instalar novamente", "Assim que o navegador liberar, a janela nativa abre daqui mesmo."],
                    ["3", "Ou use o menu do Chrome", "⋮ → Instalar app / Adicionar à tela inicial."]
                ]
            };
        }

        return {
            badge: "VINCI · PWA",
            title: "Instale o Vinci.",
            copy:
                "Seu navegador não ofereceu a instalação automática agora.",
            steps: [
                ["1", "Abra em um navegador compatível", "No Android, prefira Chrome ou outro navegador Chromium."],
                ["2", "Procure Instalar app", "A opção costuma ficar no menu do navegador."],
                ["3", "Confirme a instalação", "O Vinci passa a abrir como aplicativo."]
            ]
        };
    }

    function showModal(type) {
        removeModal();

        const info = modalContent(type);

        const modal = document.createElement("div");
        modal.className = "vinci-install-modal";

        modal.innerHTML = `
            <section
                class="vinci-install-modal-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="vinciInstallModalTitle"
            >
                <header>
                    <div>
                        <span>${escapeHTML(info.badge)}</span>
                        <h2 id="vinciInstallModalTitle">${escapeHTML(info.title)}</h2>
                    </div>

                    <button
                        type="button"
                        class="vinci-install-modal-close"
                        aria-label="Fechar"
                    >
                        ×
                    </button>
                </header>

                <p class="vinci-install-modal-copy">
                    ${escapeHTML(info.copy)}
                </p>

                <div class="vinci-install-steps">
                    ${info.steps.map(step => `
                        <article>
                            <i>${escapeHTML(step[0])}</i>
                            <span>
                                <strong>${escapeHTML(step[1])}</strong>
                                <small>${escapeHTML(step[2])}</small>
                            </span>
                        </article>
                    `).join("")}
                </div>

                <button
                    type="button"
                    class="vinci-install-modal-done"
                >
                    Entendi
                </button>
            </section>
        `;

        document.body.appendChild(modal);
        document.body.classList.add("vinci-install-modal-open");

        modal
            .querySelector(".vinci-install-modal-close")
            .onclick = removeModal;

        modal
            .querySelector(".vinci-install-modal-done")
            .onclick = removeModal;

        modal.onclick = event => {
            if (event.target === modal) {
                removeModal();
            }
        };
    }

    function updateButtons() {
        const installed = isStandalone();

        document
            .querySelectorAll("[data-vinci-install-button]")
            .forEach(button => {
                if (installed) {
                    button.dataset.installState = "installed";
                    button.textContent =
                        button.dataset.installedLabel ||
                        "Instalado ✓";

                    if (
                        button.dataset.hideWhenInstalled ===
                        "true"
                    ) {
                        button.classList.add("hidden");
                    }

                    return;
                }

                button.classList.remove("hidden");

                if (
                    platform.inApp &&
                    platform.android
                ) {
                    button.dataset.installState = "external";
                    button.textContent =
                        button.dataset.externalLabel ||
                        "Abrir no Chrome";
                    return;
                }

                if (
                    platform.inApp &&
                    platform.ios
                ) {
                    button.dataset.installState = "instructions";
                    button.textContent =
                        button.dataset.iosLabel ||
                        "Como instalar";
                    return;
                }

                if (deferredPrompt) {
                    button.dataset.installState = "ready";
                    button.textContent =
                        button.dataset.readyLabel ||
                        "Instalar Vinci";
                    return;
                }

                if (platform.ios) {
                    button.dataset.installState = "instructions";
                    button.textContent =
                        button.dataset.iosLabel ||
                        "Instalar Vinci";
                    return;
                }

                button.dataset.installState = "waiting";
                button.textContent =
                    button.dataset.waitingLabel ||
                    "Instalar Vinci";
            });

        window.dispatchEvent(
            new CustomEvent(
                "vinci-install-state",
                {
                    detail: getState()
                }
            )
        );
    }

    function getState() {
        return {
            installed: isStandalone(),
            promptReady: Boolean(deferredPrompt),
            ...platform
        };
    }

    async function trigger() {
        if (isStandalone()) {
            location.href = "index.html";
            return {
                outcome: "already-installed"
            };
        }

        if (
            platform.inApp &&
            platform.android
        ) {
            location.href = chromeIntentURL();

            return {
                outcome: "external-browser"
            };
        }

        if (
            platform.inApp &&
            platform.ios
        ) {
            showModal("inapp-ios");

            return {
                outcome: "instructions"
            };
        }

        if (deferredPrompt) {
            const prompt = deferredPrompt;

            deferredPrompt = null;

            await prompt.prompt();

            const choice =
                await prompt.userChoice;

            updateButtons();

            return choice;
        }

        if (platform.ios) {
            showModal("ios");

            return {
                outcome: "instructions"
            };
        }

        if (
            platform.android &&
            platform.chromium
        ) {
            showModal("android-wait");

            return {
                outcome: "waiting"
            };
        }

        showModal("generic");

        return {
            outcome: "instructions"
        };
    }

    async function copyInstallLink() {
        const url =
            new URL(
                "install.html",
                location.href
            ).href;

        try {
            await navigator.clipboard.writeText(url);
            return true;
        }
        catch (error) {
            const input =
                document.createElement("textarea");

            input.value = url;
            input.style.position = "fixed";
            input.style.opacity = "0";

            document.body.appendChild(input);
            input.select();

            const ok =
                document.execCommand("copy");

            input.remove();

            return ok;
        }
    }

    function bindButtons() {
        document
            .querySelectorAll(
                "[data-vinci-install-button]"
            )
            .forEach(button => {
                if (
                    button.dataset.installBound ===
                    "1"
                ) {
                    return;
                }

                button.dataset.installBound = "1";

                button.addEventListener(
                    "click",
                    async event => {
                        event.preventDefault();
                        await trigger();
                    }
                );
            });

        document
            .querySelectorAll(
                "[data-vinci-copy-install]"
            )
            .forEach(button => {
                if (
                    button.dataset.installCopyBound ===
                    "1"
                ) {
                    return;
                }

                button.dataset.installCopyBound = "1";

                button.addEventListener(
                    "click",
                    async () => {
                        const original =
                            button.textContent;

                        const ok =
                            await copyInstallLink();

                        button.textContent =
                            ok
                                ? "Link copiado ✓"
                                : "Não foi possível copiar";

                        setTimeout(
                            () => {
                                button.textContent =
                                    original;
                            },
                            1800
                        );
                    }
                );
            });

        updateButtons();
    }

    window.addEventListener(
        "beforeinstallprompt",
        event => {
            event.preventDefault();

            deferredPrompt = event;

            bindButtons();
        }
    );

    window.addEventListener(
        "appinstalled",
        () => {
            deferredPrompt = null;
            updateButtons();
        }
    );

    window
        .matchMedia?.(
            "(display-mode: standalone)"
        )
        ?.addEventListener?.(
            "change",
            updateButtons
        );

    const observer =
        new MutationObserver(
            () => {
                bindButtons();
            }
        );

    function init() {
        bindButtons();

        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );
    }

    window.VinciInstall = {
        trigger,
        getState,
        updateButtons,
        copyInstallLink,
        showModal
    };

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );
    }
    else {
        init();
    }
})();
