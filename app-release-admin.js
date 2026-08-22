// ============================================================
// VINCI — ADMIN · ATUALIZAÇÕES DO APP ANDROID
// ============================================================

(() => {
    "use strict";

    const ADMINS_FILE =
        "notice-admins.json";

    const READ_RPC =
        "vinci_get_android_update";

    const PUBLISH_RPC =
        "vinci_publish_android_release";

    const SEND_NOTICE_RPC =
        "vinci_send_android_update_notice";

    const REMOVE_NOTICE_RPC =
        "vinci_remove_android_update_notice";

    const DEFAULT_UPDATE_MESSAGE =
        "Nova atualização do Vinci disponível: versão {{version}}. Para continuar usando o aplicativo, baixe e instale a nova versão.";

    let currentUser = null;
    let currentUsername = "";
    let currentConfig = null;

    let modal = null;
    let form = null;
    let messageEl = null;
    let publishButton = null;
    let sendNoticeButton = null;
    let removeNoticeButton = null;
    let noticePreview = null;

    let confirmUntil = 0;
    let confirmTimer = null;

    function normalizeUsername(
        value
    ) {
        return String(
            value || ""
        )
        .trim()
        .toLowerCase()
        .replace(
            /^@/,
            ""
        );
    }

    function ownProfileIsOpen() {
        const idParam =
            new URLSearchParams(
                location.search
            )
            .get(
                "id"
            );

        return (
            !idParam ||
            idParam ===
                currentUser?.id
        );
    }

    async function fetchAdmins() {
        const response =
            await fetch(
                `${ADMINS_FILE}?v=${Date.now()}`,
                {
                    cache:"no-store"
                }
            );

        if (!response.ok) {
            throw new Error(
                "Não foi possível carregar a lista de administradores."
            );
        }

        const data =
            await response.json();

        return Array.isArray(
            data?.admins
        )
            ? data.admins
            : [];
    }

    function userIsAdmin(
        admins
    ) {
        const userId =
            currentUser?.id || "";

        const username =
            normalizeUsername(
                currentUsername
            );

        return admins.some(
            entry=>{
                if (
                    typeof entry ===
                    "string"
                ) {
                    return (
                        normalizeUsername(
                            entry
                        ) ===
                        username
                    );
                }

                const allowedId =
                    String(
                        entry?.user_id ||
                        ""
                    ).trim();

                const allowedUsername =
                    normalizeUsername(
                        entry?.username
                    );

                return (
                    (
                        allowedId &&
                        allowedId ===
                            userId
                    ) ||
                    (
                        allowedUsername &&
                        allowedUsername ===
                            username
                    )
                );
            }
        );
    }

    function readRow(
        data
    ) {
        return Array.isArray(
            data
        )
            ? data[0]
            : data;
    }

    function createField(
        label,
        control,
        full=false
    ) {
        const wrapper =
            document.createElement(
                "label"
            );

        wrapper.className =
            `vinci-release-field${full?" full":""}`;

        const title =
            document.createElement(
                "span"
            );

        title.textContent =
            label;

        wrapper.append(
            title,
            control
        );

        return wrapper;
    }

    function input(
        name,
        type="text",
        attrs={}
    ) {
        const element =
            document.createElement(
                "input"
            );

        element.name =
            name;

        element.type =
            type;

        Object.entries(
            attrs
        )
        .forEach(
            ([key,value])=>{
                if (
                    key in element
                ) {
                    element[key]=
                        value;
                } else {
                    element.setAttribute(
                        key,
                        value
                    );
                }
            }
        );

        return element;
    }

    function resetConfirmation() {
        confirmUntil=0;

        clearTimeout(
            confirmTimer
        );

        if (
            publishButton
        ) {
            publishButton.textContent =
                "Atualização realizada";
        }
    }

    function createModal() {
        modal =
            document.createElement(
                "div"
            );

        modal.className =
            "vinci-release-modal hidden";

        modal.setAttribute(
            "aria-hidden",
            "true"
        );


        const panel =
            document.createElement(
                "section"
            );

        panel.className =
            "vinci-release-panel";


        const head =
            document.createElement(
                "header"
            );

        head.className =
            "vinci-release-head";

        head.innerHTML=`
            <div>
                <span>VINCI ADMIN · ANDROID</span>
                <h2>Atualizações do app</h2>
            </div>
        `;


        const close =
            document.createElement(
                "button"
            );

        close.type =
            "button";

        close.className =
            "vinci-release-close";

        close.textContent =
            "×";

        close.setAttribute(
            "aria-label",
            "Fechar"
        );

        close.onclick =
            closeModal;

        head.appendChild(
            close
        );


        const body =
            document.createElement(
                "div"
            );

        body.className =
            "vinci-release-body";


        const status =
            document.createElement(
                "section"
            );

        status.id =
            "vinciReleaseCurrent";

        status.className =
            "vinci-release-current";

        status.innerHTML=`
            <span>VERSÃO PUBLICADA</span>
            <strong>Carregando...</strong>
            <small></small>
        `;


        form =
            document.createElement(
                "form"
            );

        form.onsubmit =
            event=>
                event.preventDefault();


        const grid =
            document.createElement(
                "div"
            );

        grid.className =
            "vinci-release-grid";


        const version =
            input(
                "version",
                "text",
                {
                    maxLength:40,
                    placeholder:"1.1.1"
                }
            );

        const build =
            input(
                "build",
                "number",
                {
                    min:1,
                    step:1,
                    placeholder:"2"
                }
            );

        const apkUrl =
            input(
                "apk_url",
                "url",
                {
                    maxLength:1500,
                    placeholder:"https://.../Vinci-1.1.1.apk"
                }
            );

        const notes =
            document.createElement(
                "textarea"
            );

        notes.name =
            "release_notes";

        notes.maxLength =
            5000;

        notes.placeholder =
            "Uma novidade por linha...\nCorreções nos jogos\nMelhorias no Lume";


        const updateMessage =
            document.createElement(
                "textarea"
            );

        updateMessage.name =
            "update_message";

        updateMessage.maxLength =
            1000;

        updateMessage.value =
            DEFAULT_UPDATE_MESSAGE;

        updateMessage.placeholder =
            DEFAULT_UPDATE_MESSAGE;

        updateMessage.addEventListener(
            "input",
            updateNoticePreview
        );

        version.addEventListener(
            "input",
            updateNoticePreview
        );


        const mandatoryWrap =
            document.createElement(
                "label"
            );

        mandatoryWrap.className =
            "vinci-release-mandatory";

        const mandatory =
            input(
                "mandatory",
                "checkbox"
            );

        mandatory.checked =
            true;

        mandatoryWrap.append(
            mandatory,
            document.createElement(
                "div"
            )
        );

        mandatoryWrap.lastChild.innerHTML=`
            <strong>Atualização obrigatória</strong>
            <span>
                APKs abaixo deste build ficam bloqueados até atualizar.
                O site nunca é bloqueado.
            </span>
        `;


        grid.append(
            createField(
                "Nova versão",
                version
            ),

            createField(
                "Novo build",
                build
            ),

            createField(
                "Link HTTPS do APK",
                apkUrl,
                true
            ),

            createField(
                "Notas da atualização",
                notes,
                true
            ),

            createField(
                "Mensagem da notificação",
                updateMessage,
                true
            )
        );


        messageEl =
            document.createElement(
                "p"
            );

        messageEl.className =
            "vinci-release-message";


        form.append(
            grid,
            mandatoryWrap,
            messageEl
        );


        noticePreview =
            document.createElement(
                "div"
            );

        noticePreview.className =
            "vinci-release-notice-preview";

        noticePreview.innerHTML=`
            <span>PRÉVIA DA NOTIFICAÇÃO</span>
            <strong></strong>
        `;

        const tip =
            document.createElement(
                "div"
            );

        tip.className =
            "vinci-release-tip";

        tip.innerHTML=`
            <strong>Como funciona</strong>
            <p>
                Você publica aqui depois de subir o APK novo.
                O Vinci Android compara o build instalado com o mínimo permitido.
                Navegador, GitHub Pages e PWA normal ignoram completamente este bloqueio.
            </p>
        `;


        body.append(
            status,
            form,
            noticePreview,
            tip
        );


        const footer =
            document.createElement(
                "footer"
            );

        footer.className =
            "vinci-release-actions";


        const refresh =
            document.createElement(
                "button"
            );

        refresh.type =
            "button";

        refresh.textContent =
            "Recarregar";

        refresh.onclick =
            loadCurrent;


        publishButton =
            document.createElement(
                "button"
            );

        publishButton.type =
            "button";

        publishButton.className =
            "primary";

        publishButton.textContent =
            "Atualização realizada";

        publishButton.onclick =
            requestPublish;



        sendNoticeButton =
            document.createElement(
                "button"
            );

        sendNoticeButton.type =
            "button";

        sendNoticeButton.className =
            "primary";

        sendNoticeButton.textContent =
            "Enviar notificação";

        sendNoticeButton.onclick =
            sendNotice;


        removeNoticeButton =
            document.createElement(
                "button"
            );

        removeNoticeButton.type =
            "button";

        removeNoticeButton.className =
            "danger";

        removeNoticeButton.textContent =
            "Remover notificação";

        removeNoticeButton.onclick =
            removeNotice;


        footer.append(
            refresh,
            publishButton,
            sendNoticeButton,
            removeNoticeButton
        );


        panel.append(
            head,
            body,
            footer
        );

        modal.appendChild(
            panel
        );

        document.body
            .appendChild(
                modal
            );


        modal.onclick =
            event=>{
                if (
                    event.target===
                    modal
                ) {
                    closeModal();
                }
            };
    }


    function resolvedUpdateMessage() {
        const version =
            form?.elements?.version?.value
            ?.trim() ||
            currentConfig?.latest_version ||
            "1.1.0";

        const template =
            form?.elements?.update_message?.value
            ?.trim() ||
            DEFAULT_UPDATE_MESSAGE;

        return template.replace(
            /\{\{\s*version\s*\}\}/gi,
            version
        );
    }

    function updateNoticePreview() {
        if (!noticePreview) {
            return;
        }

        const strong =
            noticePreview.querySelector(
                "strong"
            );

        if (strong) {
            strong.textContent =
                resolvedUpdateMessage();
        }
    }

    async function sendNotice() {
        const config =
            collect();

        const messageTemplate =
            form.elements.update_message.value
            .trim() ||
            DEFAULT_UPDATE_MESSAGE;

        const validation =
            validate(
                config
            );

        if (
            validation
        ) {
            messageEl.textContent =
                validation;

            return;
        }

        sendNoticeButton.disabled =
            true;

        removeNoticeButton.disabled =
            true;

        messageEl.textContent =
            config.mandatory
                ? "Ativando atualização obrigatória..."
                : "Enviando aviso de atualização...";

        try {
            const {
                data,
                error
            }=
                await db.rpc(
                    SEND_NOTICE_RPC,
                    {
                        p_version:
                            config.version,

                        p_build:
                            config.build,

                        p_apk_url:
                            config.apkUrl,

                        p_message_template:
                            messageTemplate,

                        p_mandatory:
                            config.mandatory,

                        p_release_notes:
                            config.notes
                    }
                );

            if (
                error
            ) {
                throw error;
            }

            currentConfig =
                readRow(
                    data
                ) ||
                currentConfig;

            currentSummary(
                currentConfig
            );

            updateNoticePreview();

            messageEl.textContent =
                config.mandatory
                    ? `Bloqueio ativado para APKs abaixo do build ${config.build}.`
                    : `Notificação enviada para APKs abaixo do build ${config.build}.`;

        } catch (
            error
        ) {
            console.error(
                "Vinci Release Notice:",
                error
            );

            messageEl.textContent =
                error?.message ||
                "Não foi possível enviar a notificação.";

        } finally {
            sendNoticeButton.disabled =
                false;

            removeNoticeButton.disabled =
                false;
        }
    }

    async function removeNotice() {
        removeNoticeButton.disabled =
            true;

        if (
            sendNoticeButton
        ) {
            sendNoticeButton.disabled =
                true;
        }

        messageEl.textContent =
            "Removendo completamente a tela de atualização...";

        try {
            const {
                data,
                error
            }=
                await db.rpc(
                    REMOVE_NOTICE_RPC
                );

            if (
                error
            ) {
                throw error;
            }

            currentConfig =
                readRow(
                    data
                ) ||
                currentConfig;

            currentSummary(
                currentConfig
            );

            messageEl.textContent =
                "Tela de atualização removida de todos os APKs.";

        } catch (
            error
        ) {
            console.error(
                "Vinci Remove Notice:",
                error
            );

            messageEl.textContent =
                error?.message ||
                "Não foi possível remover o bloqueio.";

        } finally {
            removeNoticeButton.disabled =
                false;

            if (
                sendNoticeButton
            ) {
                sendNoticeButton.disabled =
                    false;
            }
        }
    }

    function currentSummary(
        row
    ) {
        const status =
            document.getElementById(
                "vinciReleaseCurrent"
            );

        if (!status) {
            return;
        }

        if (!row) {
            status.innerHTML=`
                <span>VERSÃO PUBLICADA</span>
                <strong>Não configurado</strong>
                <small>Rode o Patch 19.</small>
            `;
            return;
        }

        status.innerHTML=`
            <span>VERSÃO PUBLICADA</span>
            <strong></strong>
            <small></small>
        `;

        status.querySelector(
            "strong"
        ).textContent =
            `${row.latest_version} · build ${row.latest_build}`;

        status.querySelector(
            "small"
        ).textContent =
            `mínimo permitido: ${row.minimum_version} · build ${row.minimum_build} · tela: ${row.enabled && row.notification_enabled ? "ATIVA" : "REMOVIDA"}`;
    }

    async function loadCurrent() {
        if (!form) {
            return;
        }

        resetConfirmation();

        messageEl.textContent =
            "Carregando configuração Android...";

        try {
            const {
                data,
                error
            }=
                await db.rpc(
                    READ_RPC
                );

            if (error) {
                throw error;
            }

            const row =
                readRow(
                    data
                );

            currentConfig =
                row || null;

            currentSummary(
                row
            );

            if (row) {
                form.elements.version.value =
                    row.latest_version ||
                    "";

                form.elements.build.value =
                    Number(
                        row.latest_build ||
                        1
                    );

                form.elements.apk_url.value =
                    row.apk_url ||
                    "";

                form.elements.release_notes.value =
                    row.release_notes ||
                    "";

                form.elements.update_message.value =
                    row.update_message ||
                    DEFAULT_UPDATE_MESSAGE;

                form.elements.mandatory.checked =
                    true;

                updateNoticePreview();

                messageEl.textContent =
                    row.enabled && row.notification_enabled
                        ? "A tela de atualização está ativa."
                        : "A tela de atualização está removida.";
            } else {
                messageEl.textContent =
                    "Rode o Patch 19 no Supabase.";
            }

        } catch (
            error
        ) {
            console.error(
                "Vinci Release Admin:",
                error
            );

            currentSummary(
                null
            );

            messageEl.textContent =
                "Não foi possível carregar. Confira se o Patch 19 foi executado.";
        }
    }

    function collect() {
        const version =
            form.elements.version.value
            .trim();

        const build =
            Number.parseInt(
                form.elements.build.value,
                10
            );

        const apkUrl =
            form.elements.apk_url.value
            .trim();

        const notes =
            form.elements.release_notes.value
            .trim();

        const mandatory =
            form.elements.mandatory.checked;

        return {
            version,
            build,
            apkUrl,
            notes,
            mandatory
        };
    }

    function validate(
        config
    ) {
        if (
            !/^[0-9]+(\.[0-9]+){1,3}([+-][A-Za-z0-9.-]+)?$/
            .test(
                config.version
            )
        ) {
            return "Use uma versão como 1.1.1 ou 1.2.0.";
        }

        if (
            !Number.isInteger(
                config.build
            ) ||
            config.build<1
        ) {
            return "O build precisa ser um número inteiro maior que zero.";
        }

        if (
            currentConfig &&
            config.build<=
                Number(
                    currentConfig.latest_build
                )
        ) {
            return `O build precisa ser maior que ${currentConfig.latest_build}.`;
        }

        try {
            const parsed =
                new URL(
                    config.apkUrl
                );

            if (
                parsed.protocol!==
                "https:"
            ) {
                return "O link do APK precisa usar HTTPS.";
            }
        } catch {
            return "Informe um link HTTPS válido para o APK.";
        }

        return "";
    }

    async function requestPublish() {
        const config =
            collect();

        const validation =
            validate(
                config
            );

        if (
            validation
        ) {
            resetConfirmation();
            messageEl.textContent =
                validation;
            return;
        }

        const now =
            Date.now();

        /*
           Dois cliques evitam bloquear todos por acidente.
        */
        if (
            now>
            confirmUntil
        ) {
            confirmUntil =
                now+
                6000;

            publishButton.textContent =
                config.mandatory
                    ? "Confirmar atualização obrigatória"
                    : "Confirmar publicação";

            messageEl.textContent =
                config.mandatory
                    ? `Confirme: todos os APKs abaixo do build ${config.build} serão bloqueados.`
                    : `Confirme a publicação do build ${config.build}.`;

            clearTimeout(
                confirmTimer
            );

            confirmTimer =
                setTimeout(
                    resetConfirmation,
                    6000
                );

            return;
        }

        await publish(
            config
        );
    }

    async function publish(
        config
    ) {
        publishButton.disabled =
            true;

        messageEl.textContent =
            "Publicando atualização...";

        try {
            const {
                data,
                error
            }=
                await db.rpc(
                    PUBLISH_RPC,
                    {
                        p_version:
                            config.version,

                        p_build:
                            config.build,

                        p_apk_url:
                            config.apkUrl,

                        p_release_notes:
                            config.notes,

                        p_mandatory:
                            config.mandatory
                    }
                );

            if (error) {
                throw error;
            }

            currentConfig =
                readRow(
                    data
                ) ||
                currentConfig;

            messageEl.textContent =
                config.mandatory
                    ? "Atualização publicada. APKs antigos serão bloqueados quando receberem a nova configuração."
                    : "Atualização publicada como opcional.";

            currentSummary(
                currentConfig
            );

            /*
               Mantém versão/build/link na tela.
               Assim o admin pode salvar a release e,
               em seguida, tocar "Enviar notificação"
               para exatamente o mesmo APK.
            */

            resetConfirmation();

        } catch (
            error
        ) {
            console.error(
                "Vinci Release Admin:",
                error
            );

            messageEl.textContent =
                error?.message ||
                "Não foi possível publicar a atualização.";

            resetConfirmation();

        } finally {
            publishButton.disabled =
                false;
        }
    }

    async function openModal() {
        if (!modal) {
            createModal();
        }

        modal.classList
            .remove(
                "hidden"
            );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";

        await loadCurrent();
    }

    function closeModal() {
        if (!modal) {
            return;
        }

        resetConfirmation();

        modal.classList
            .add(
                "hidden"
            );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.style.overflow =
            "";
    }

    function insertButton() {
        const actions =
            document.querySelector(
                ".profile-actions"
            );

        if (
            !actions ||
            document.getElementById(
                "manageAppReleases"
            )
        ) {
            return;
        }

        const button =
            document.createElement(
                "button"
            );

        button.id =
            "manageAppReleases";

        button.type =
            "button";

        button.className =
            "button secondary vinci-release-admin-button";

        button.textContent =
            "Atualizações do app";

        button.onclick =
            openModal;

        actions.appendChild(
            button
        );
    }

    async function start() {
        if (
            typeof db ===
            "undefined"
        ) {
            return;
        }

        try {
            const {
                data,
                error
            }=
                await db.auth
                .getUser();

            if (
                error ||
                !data?.user
            ) {
                return;
            }

            currentUser =
                data.user;

            if (
                !ownProfileIsOpen()
            ) {
                return;
            }

            const {
                data:profile,
                error:profileError
            }=
                await db
                .from(
                    "profiles"
                )
                .select(
                    "username"
                )
                .eq(
                    "id",
                    currentUser.id
                )
                .single();

            if (
                profileError ||
                !profile?.username
            ) {
                return;
            }

            currentUsername =
                normalizeUsername(
                    profile.username
                );

            const admins =
                await fetchAdmins();

            if (
                !userIsAdmin(
                    admins
                )
            ) {
                return;
            }

            insertButton();

        } catch (
            error
        ) {
            console.warn(
                "Vinci: painel de releases indisponível.",
                error?.message ||
                error
            );
        }
    }

    if (
        document.readyState===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            start,
            {
                once:true
            }
        );
    } else {
        start();
    }
})();
