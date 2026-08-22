// ============================================================
// VINCI — NATIVE ANDROID UPDATE GATE
//
// IMPORTANTE:
// Este arquivo também pode existir no site do Vinci.
// Ele NÃO consulta versão e NÃO mostra interface quando
// não estiver dentro de um app Capacitor nativo.
// ============================================================

(() => {
    "use strict";

    const CHECK_INTERVAL_MS =
        5 * 60 * 1000;

    const OPTIONAL_DISMISS_PREFIX =
        "vinci_android_update_dismissed:";

    const HOST_ID =
        "vinciNativeUpdateHost";

    let currentInfo = null;
    let currentConfig = null;
    let hardBlocked = false;
    let checking = false;
    let lastCheckAt = 0;
    let realtimeChannel = null;

    function capacitor() {
        return window.Capacitor || null;
    }

    function isNativeApp() {
        const cap = capacitor();

        if (!cap) {
            return false;
        }

        try {
            if (
                typeof cap.isNativePlatform ===
                "function"
            ) {
                return cap.isNativePlatform();
            }
        } catch {}

        return Boolean(
            cap.getPlatform &&
            cap.getPlatform() !== "web"
        );
    }

    /*
       REGRA PRINCIPAL:
       SITE / GITHUB PAGES / PWA NORMAL
       PARA AQUI.
    */
    if (!isNativeApp()) {
        return;
    }

    function plugins() {
        return capacitor()?.Plugins || {};
    }

    function getAppPlugin() {
        return plugins().App || null;
    }

    function getBrowserPlugin() {
        return plugins().Browser || null;
    }

    function numericBuild(value) {
        const parsed =
            Number.parseInt(
                String(value ?? ""),
                10
            );

        return Number.isFinite(parsed)
            ? parsed
            : 0;
    }

    function safeText(value) {
        return String(
            value ?? ""
        );
    }

    function normalizedConfig(raw) {
        const data =
            Array.isArray(raw)
                ? raw[0]
                : raw;

        if (!data) {
            return null;
        }

        return {
            enabled:
                data.enabled !== false,

            latestVersion:
                safeText(
                    data.latest_version
                ),

            latestBuild:
                numericBuild(
                    data.latest_build
                ),

            minimumVersion:
                safeText(
                    data.minimum_version
                ),

            minimumBuild:
                numericBuild(
                    data.minimum_build
                ),

            apkUrl:
                safeText(
                    data.apk_url
                ).trim(),

            notes:
                safeText(
                    data.release_notes
                ).trim(),

            latestMandatory:
                Boolean(
                    data.latest_mandatory
                ),

            notificationEnabled:
                Boolean(
                    data.notification_enabled
                ),

            updateMessage:
                safeText(
                    data.update_message
                ).trim(),

            publishedAt:
                data.published_at || null
        };
    }

    function isValidUpdateURL(url) {
        try {
            const parsed =
                new URL(url);

            return (
                parsed.protocol ===
                "https:"
            );
        } catch {
            return false;
        }
    }

    function removeGate() {
        document
            .getElementById(
                HOST_ID
            )
            ?.remove();

        document.documentElement
            .classList
            .remove(
                "vinci-update-locked"
            );

        document.body
            ?.classList
            .remove(
                "vinci-update-locked"
            );

        hardBlocked = false;
    }

    function optionalDismissKey(
        config
    ) {
        return (
            OPTIONAL_DISMISS_PREFIX +
            config.latestBuild
        );
    }

    function optionalDismissed(
        config
    ) {
        try {
            return (
                localStorage.getItem(
                    optionalDismissKey(
                        config
                    )
                ) === "1"
            );
        } catch {
            return false;
        }
    }

    function markOptionalDismissed(
        config
    ) {
        try {
            localStorage.setItem(
                optionalDismissKey(
                    config
                ),
                "1"
            );
        } catch {}
    }

    async function openUpdateURL() {
        const url =
            currentConfig?.apkUrl;

        if (
            !url ||
            !isValidUpdateURL(url)
        ) {
            const message =
                document.querySelector(
                    "#vinciNativeUpdateMessage"
                );

            if (message) {
                message.textContent =
                    "O link desta atualização ainda não está disponível. Tente novamente em alguns minutos.";
            }

            return;
        }

        const Browser =
            getBrowserPlugin();

        try {
            if (
                Browser?.open
            ) {
                await Browser.open({
                    url
                });

                return;
            }
        } catch (
            error
        ) {
            console.warn(
                "Vinci Update: Browser.open falhou.",
                error
            );
        }

        window.open(
            url,
            "_blank",
            "noopener,noreferrer"
        );
    }

    function noticeMessage(
        config
    ) {
        const template =
            config?.updateMessage ||
            "Nova atualização do Vinci disponível: versão {{version}}. Para continuar usando o aplicativo, baixe e instale a nova versão.";

        return template.replace(
            /\{\{\s*version\s*\}\}/gi,
            config?.latestVersion || ""
        );
    }

    function notesHTML(
        notes
    ) {
        const lines =
            safeText(notes)
            .split(/\r?\n/)
            .map(
                line=>
                    line.trim()
            )
            .filter(Boolean)
            .slice(0, 8);

        if (!lines.length) {
            return `
                <p class="vinci-native-update-notes-empty">
                    Esta versão traz melhorias e correções para o Vinci.
                </p>
            `;
        }

        return `
            <ul class="vinci-native-update-notes">
                ${lines
                    .map(
                        line=>`
                            <li></li>
                        `
                    )
                    .join("")}
            </ul>
        `;
    }

    function fillNotesSafely(
        root,
        notes
    ) {
        const list =
            root.querySelector(
                ".vinci-native-update-notes"
            );

        if (!list) {
            return;
        }

        const lines =
            safeText(notes)
            .split(/\r?\n/)
            .map(
                line=>
                    line.trim()
            )
            .filter(Boolean)
            .slice(0, 8);

        Array.from(
            list.children
        )
        .forEach(
            (
                item,
                index
            )=>{
                item.textContent =
                    lines[index] || "";
            }
        );
    }

    function renderGate(
        config,
        {
            mandatory
        }
    ) {
        removeGate();

        if (
            !mandatory &&
            optionalDismissed(
                config
            )
        ) {
            return;
        }

        currentConfig =
            config;

        hardBlocked =
            mandatory;

        const host =
            document.createElement(
                "div"
            );

        host.id =
            HOST_ID;

        host.className =
            mandatory
                ? "vinci-native-update-host mandatory"
                : "vinci-native-update-host optional";

        host.setAttribute(
            "role",
            mandatory
                ? "alertdialog"
                : "dialog"
        );

        host.setAttribute(
            "aria-modal",
            "true"
        );

        const currentVersion =
            currentInfo?.version ||
            "—";

        const currentBuild =
            currentInfo?.build ||
            "—";

        host.innerHTML = `
            <section class="vinci-native-update-card">

                <div class="vinci-native-update-mark">
                    <img
                        src="assets/icon-vinci-192.png"
                        alt=""
                    >
                </div>

                <span class="vinci-native-update-kicker">
                    ${mandatory
                        ? "ATUALIZAÇÃO NECESSÁRIA"
                        : "NOVA VERSÃO"}
                </span>

                <h1>
                    ${mandatory
                        ? "Atualize para continuar no Vinci"
                        : "Tem um Vinci novo esperando por você"}
                </h1>

                <p
                    id="vinciNativeUpdateMessage"
                    class="vinci-native-update-copy"
                >
                    ${noticeMessage(config)}
                </p>

                <div class="vinci-native-update-version-grid">

                    <div>
                        <span>NO CELULAR</span>
                        <strong>
                            ${currentVersion}
                        </strong>
                        <small>
                            build ${currentBuild}
                        </small>
                    </div>

                    <div class="latest">
                        <span>VERSÃO NOVA</span>
                        <strong>
                            ${config.latestVersion}
                        </strong>
                        <small>
                            build ${config.latestBuild}
                        </small>
                    </div>

                </div>

                <div class="vinci-native-update-release">

                    <strong>
                        O que mudou
                    </strong>

                    ${notesHTML(
                        config.notes
                    )}

                </div>

                <button
                    id="vinciNativeUpdateAction"
                    class="vinci-native-update-action"
                    type="button"
                >
                    Atualizar Vinci
                </button>

                ${mandatory
                    ? `
                        <p class="vinci-native-update-required">
                            Para continuar usando o aplicativo, instale a versão atualizada.
                        </p>
                    `
                    : `
                        <button
                            id="vinciNativeUpdateLater"
                            class="vinci-native-update-later"
                            type="button"
                        >
                            Agora não
                        </button>
                    `
                }

            </section>
        `;

        fillNotesSafely(
            host,
            config.notes
        );

        document.body
            .appendChild(
                host
            );

        if (mandatory) {
            document.documentElement
                .classList
                .add(
                    "vinci-update-locked"
                );

            document.body
                .classList
                .add(
                    "vinci-update-locked"
                );
        }

        host
            .querySelector(
                "#vinciNativeUpdateAction"
            )
            ?.addEventListener(
                "click",
                openUpdateURL
            );

        host
            .querySelector(
                "#vinciNativeUpdateLater"
            )
            ?.addEventListener(
                "click",
                ()=>{
                    markOptionalDismissed(
                        config
                    );

                    removeGate();
                }
            );
    }

    async function getNativeInfo() {
        const App =
            getAppPlugin();

        if (!App?.getInfo) {
            throw new Error(
                "Plugin App não disponível."
            );
        }

        const info =
            await App.getInfo();

        return {
            name:
                safeText(
                    info?.name
                ),

            id:
                safeText(
                    info?.id
                ),

            version:
                safeText(
                    info?.version
                ),

            build:
                safeText(
                    info?.build
                ),

            buildNumber:
                numericBuild(
                    info?.build
                )
        };
    }

    async function getServerConfig() {
        if (
            typeof db ===
            "undefined"
        ) {
            throw new Error(
                "Supabase ainda não carregou."
            );
        }

        const {
            data,
            error
        }=
            await db.rpc(
                "vinci_get_android_update"
            );

        if (error) {
            throw error;
        }

        return normalizedConfig(
            data
        );
    }

    async function check(
        {
            force=false
        }={}
    ) {
        if (
            checking
        ) {
            return;
        }

        const now =
            Date.now();

        if (
            !force &&
            now-
            lastCheckAt<
            15000
        ) {
            return;
        }

        checking=true;

        try {
            currentInfo =
                await getNativeInfo();

            currentConfig =
                await getServerConfig();

            lastCheckAt =
                Date.now();

            if (
                !currentConfig ||
                !currentConfig.enabled
            ) {
                removeGate();
                return;
            }

            const currentBuild =
                currentInfo.buildNumber;

            if (
                !currentBuild
            ) {
                console.warn(
                    "Vinci Update: build nativo inválido."
                );

                return;
            }

            if (
                !currentConfig.notificationEnabled
            ) {
                removeGate();
                return;
            }

            if (
                currentBuild <
                currentConfig.minimumBuild
            ) {
                renderGate(
                    currentConfig,
                    {
                        mandatory:true
                    }
                );

                return;
            }

            if (
                currentBuild <
                currentConfig.latestBuild
            ) {
                renderGate(
                    currentConfig,
                    {
                        mandatory:false
                    }
                );

                return;
            }

            removeGate();

        } catch (
            error
        ) {
            /*
               Falha de rede NÃO desloga o usuário e não bloqueia
               uma versão que ainda não sabemos se está antiga.
               Se ela já estava hard-blocked, mantemos a tela.
            */
            console.warn(
                "Vinci Update:",
                error?.message ||
                error
            );

            if (
                !hardBlocked
            ) {
                removeGate();
            }

        } finally {
            checking=false;
        }
    }

    function subscribeRealtime() {
        if (
            typeof db ===
            "undefined" ||
            realtimeChannel
        ) {
            return;
        }

        try {
            realtimeChannel =
                db.channel(
                    "vinci-android-update-live"
                )
                .on(
                    "postgres_changes",
                    {
                        event:"*",
                        schema:"public",
                        table:
                            "vinci_app_update_config",
                        filter:
                            "singleton_key=eq.android"
                    },
                    ()=>{
                        check({
                            force:true
                        });
                    }
                )
                .subscribe();
        } catch (
            error
        ) {
            console.warn(
                "Vinci Update realtime:",
                error
            );
        }
    }

    async function start() {
        try {
            await check({
                force:true
            });

            subscribeRealtime();

            const App =
                getAppPlugin();

            if (
                App?.addListener
            ) {
                App.addListener(
                    "appStateChange",
                    ({
                        isActive
                    })=>{
                        if (
                            isActive
                        ) {
                            check({
                                force:true
                            });
                        }
                    }
                );
            }

            document.addEventListener(
                "visibilitychange",
                ()=>{
                    if (
                        document.visibilityState===
                        "visible"
                    ) {
                        check({
                            force:true
                        });
                    }
                }
            );

            window.addEventListener(
                "online",
                ()=>{
                    check({
                        force:true
                    });
                }
            );

            setInterval(
                ()=>{
                    check({
                        force:true
                    });
                },
                CHECK_INTERVAL_MS
            );

            window.VinciNativeUpdate = {
                check,
                getInfo(){
                    return {
                        currentInfo,
                        currentConfig,
                        hardBlocked
                    };
                }
            };

        } catch (
            error
        ) {
            console.warn(
                "Vinci Update start:",
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
