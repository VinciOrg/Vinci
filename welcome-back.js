(function () {

    "use strict";


    const FIVE_DAYS =
        5 *
        24 *
        60 *
        60 *
        1000;


    const TOUCH_INTERVAL =
        60 *
        1000;


    let currentUser =
        null;

    let pendingReturn =
        false;

    let lastTouch =
        0;

    let overlay =
        null;


    function key(
        name,
        userId
    ) {

        return `vinci:${name}:${userId}`;

    }


    function now() {

        return Date.now();

    }


    function readNumber(
        storageKey
    ) {

        const value =
            Number(
                localStorage.getItem(
                    storageKey
                )
            );


        return Number.isFinite(
            value
        )
            ? value
            : 0;

    }


    function writeNumber(
        storageKey,
        value
    ) {

        localStorage.setItem(
            storageKey,
            String(
                value
            )
        );

    }


    function forceMode() {

        const params =
            new URLSearchParams(
                location.search
            );


        return params.get(
            "welcome"
        ) ===
            "1";

    }


    function daysBetween(
        from,
        to
    ) {

        return Math.max(
            0,
            Math.floor(
                (
                    to -
                    from
                ) /
                (
                    24 *
                    60 *
                    60 *
                    1000
                )
            )
        );

    }


    function titleForDays(
        days
    ) {

        if (
            days >=
            30
        ) {

            return {
                first:
                    "Olha quem",
                accent:
                    "voltou."
            };

        }


        if (
            days >=
            10
        ) {

            return {
                first:
                    "Faz um",
                accent:
                    "tempo."
            };

        }


        return {
            first:
                "Bem-vindo",
            accent:
                "de volta."
        };

    }


    function plural(
        number,
        singular,
        pluralWord
    ) {

        return number ===
            1
            ? singular
            : pluralWord;

    }


    function escapeHTML(
        value
    ) {

        return String(
            value ??
            ""
        )
        .replace(
            /[&<>"']/g,
            character => ({
                "&":
                    "&amp;",
                "<":
                    "&lt;",
                ">":
                    "&gt;",
                '"':
                    "&quot;",
                "'":
                    "&#39;"
            })[
                character
            ]
        );

    }


    async function resolveMedia(
        url
    ) {

        if (!url) {
            return "";
        }


        try {

            if (
                window
                .VinciMedia
                ?.resolveUrl
            ) {

                return (
                    await window
                    .VinciMedia
                    .resolveUrl(
                        url
                    )
                ) ||
                "";

            }

        } catch (
            error
        ) {

            console.warn(
                "Welcome Back: mídia privada não pôde ser resolvida.",
                error
            );

        }


        return url;

    }


    async function safeQuery(
        callback,
        fallback
    ) {

        try {

            const result =
                await callback();


            if (
                result?.error
            ) {

                throw result.error;

            }


            return result;

        } catch (
            error
        ) {

            console.warn(
                "Welcome Back: uma parte do resumo não pôde ser carregada.",
                error
            );


            return fallback;

        }

    }


    async function profileFor(
        userId
    ) {

        const result =
            await safeQuery(
                () =>
                    db
                    .from(
                        "profiles"
                    )
                    .select(
                        "id,username,name,avatar_url"
                    )
                    .eq(
                        "id",
                        userId
                    )
                    .maybeSingle(),
                {
                    data:
                        null
                }
            );


        return result?.data ||
            {
                id:
                    userId,
                username:
                    "vinci",
                name:
                    "Vinci"
            };

    }


    async function friendshipContext(
        userId
    ) {

        const result =
            await safeQuery(
                () =>
                    db
                    .from(
                        "vinci_friendships"
                    )
                    .select(
                        "id,user_a,user_b"
                    )
                    .or(
                        `user_a.eq.${userId},user_b.eq.${userId}`
                    ),
                {
                    data:
                        []
                }
            );


        const friendships =
            result?.data ||
            [];


        return {
            friendships,

            friendIds:
                [
                    ...new Set(
                        friendships
                        .map(
                            friendship =>
                                friendship.user_a ===
                                    userId
                                    ? friendship.user_b
                                    : friendship.user_a
                        )
                        .filter(
                            Boolean
                        )
                    )
                ]
        };

    }


    async function roomContext(
        userId
    ) {

        const result =
            await safeQuery(
                () =>
                    db
                    .from(
                        "vinci_room_members"
                    )
                    .select(
                        "room_id"
                    )
                    .eq(
                        "user_id",
                        userId
                    ),
                {
                    data:
                        []
                }
            );


        return {
            roomIds:
                [
                    ...new Set(
                        (
                            result?.data ||
                            []
                        )
                        .map(
                            membership =>
                                membership.room_id
                        )
                        .filter(
                            Boolean
                        )
                    )
                ]
        };

    }


    async function countFriendPosts(
        friendIds,
        sinceISO
    ) {

        if (
            !friendIds.length
        ) {

            return 0;

        }


        const result =
            await safeQuery(
                () =>
                    db
                    .from(
                        "posts"
                    )
                    .select(
                        "id",
                        {
                            count:
                                "exact",
                            head:
                                true
                        }
                    )
                    .in(
                        "user_id",
                        friendIds
                    )
                    .gt(
                        "created_at",
                        sinceISO
                    ),
                {
                    count:
                        0
                }
            );


        return result?.count ||
            0;

    }


    async function countRoomMoments(
        roomIds,
        userId,
        sinceISO
    ) {

        if (
            !roomIds.length
        ) {

            return 0;

        }


        const result =
            await safeQuery(
                () =>
                    db
                    .from(
                        "vinci_room_entries"
                    )
                    .select(
                        "id",
                        {
                            count:
                                "exact",
                            head:
                                true
                        }
                    )
                    .in(
                        "room_id",
                        roomIds
                    )
                    .neq(
                        "user_id",
                        userId
                    )
                    .gt(
                        "created_at",
                        sinceISO
                    ),
                {
                    count:
                        0
                }
            );


        return result?.count ||
            0;

    }


    async function countFriendRequests(
        userId,
        sinceISO
    ) {

        const result =
            await safeQuery(
                () =>
                    db
                    .from(
                        "vinci_friend_requests"
                    )
                    .select(
                        "id",
                        {
                            count:
                                "exact",
                            head:
                                true
                        }
                    )
                    .eq(
                        "recipient_id",
                        userId
                    )
                    .eq(
                        "status",
                        "pending"
                    )
                    .gt(
                        "created_at",
                        sinceISO
                    ),
                {
                    count:
                        0
                }
            );


        return result?.count ||
            0;

    }


    async function countMessages(
        friendshipIds,
        userId,
        sinceISO
    ) {

        if (
            !friendshipIds.length
        ) {

            return 0;

        }


        const result =
            await safeQuery(
                () =>
                    db
                    .from(
                        "vinci_direct_messages"
                    )
                    .select(
                        "id",
                        {
                            count:
                                "exact",
                            head:
                                true
                        }
                    )
                    .in(
                        "friendship_id",
                        friendshipIds
                    )
                    .neq(
                        "user_id",
                        userId
                    )
                    .gt(
                        "created_at",
                        sinceISO
                    ),
                {
                    count:
                        0
                }
            );


        return result?.count ||
            0;

    }


    async function recentPhotos(
        friendIds,
        roomIds,
        userId,
        sinceISO
    ) {

        const requests =
            [];


        if (
            friendIds.length
        ) {

            requests.push(
                safeQuery(
                    () =>
                        db
                        .from(
                            "posts"
                        )
                        .select(
                            "id,image_url,created_at,user_id"
                        )
                        .in(
                            "user_id",
                            friendIds
                        )
                        .gt(
                            "created_at",
                            sinceISO
                        )
                        .order(
                            "created_at",
                            {
                                ascending:
                                    false
                            }
                        )
                        .limit(
                            5
                        ),
                    {
                        data:
                            []
                    }
                )
            );

        }


        if (
            roomIds.length
        ) {

            requests.push(
                safeQuery(
                    () =>
                        db
                        .from(
                            "vinci_room_entries"
                        )
                        .select(
                            "id,image_url,created_at,user_id"
                        )
                        .in(
                            "room_id",
                            roomIds
                        )
                        .neq(
                            "user_id",
                            userId
                        )
                        .gt(
                            "created_at",
                            sinceISO
                        )
                        .order(
                            "created_at",
                            {
                                ascending:
                                    false
                            }
                        )
                        .limit(
                            5
                        ),
                    {
                        data:
                            []
                    }
                )
            );

        }


        if (
            !requests.length
        ) {

            return [];

        }


        const resultSets =
            await Promise.all(
                requests
            );


        const merged =
            resultSets
            .flatMap(
                result =>
                    result?.data ||
                    []
            )
            .filter(
                item =>
                    item.image_url
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    new Date(
                        b.created_at
                    ) -
                    new Date(
                        a.created_at
                    )
            )
            .slice(
                0,
                3
            );


        const resolved =
            [];


        for (
            const item
            of
            merged
        ) {

            const url =
                await resolveMedia(
                    item.image_url
                );


            if (url) {

                resolved.push(
                    {
                        ...item,
                        url
                    }
                );

            }

        }


        return resolved;

    }


    async function buildSummary(
        userId,
        sinceTimestamp
    ) {

        const sinceISO =
            new Date(
                sinceTimestamp
            )
            .toISOString();


        const [
            profile,
            friends,
            rooms
        ] =
            await Promise.all(
                [
                    profileFor(
                        userId
                    ),
                    friendshipContext(
                        userId
                    ),
                    roomContext(
                        userId
                    )
                ]
            );


        const friendshipIds =
            friends.friendships
            .map(
                friendship =>
                    friendship.id
            );


        if (
            profile.avatar_url
        ) {

            profile.avatar_url =
                await resolveMedia(
                    profile.avatar_url
                );

        }


        const [
            friendPosts,
            roomMoments,
            friendRequests,
            messages,
            photos
        ] =
            await Promise.all(
                [
                    countFriendPosts(
                        friends.friendIds,
                        sinceISO
                    ),

                    countRoomMoments(
                        rooms.roomIds,
                        userId,
                        sinceISO
                    ),

                    countFriendRequests(
                        userId,
                        sinceISO
                    ),

                    countMessages(
                        friendshipIds,
                        userId,
                        sinceISO
                    ),

                    recentPhotos(
                        friends.friendIds,
                        rooms.roomIds,
                        userId,
                        sinceISO
                    )
                ]
            );


        return {
            profile,
            friendPosts,
            roomMoments,
            friendRequests,
            messages,
            photos
        };

    }


    function createOverlay(
        days,
        forced
    ) {

        const title =
            titleForDays(
                days
            );


        const element =
            document.createElement(
                "div"
            );


        element.className =
            "vinci-welcome-back";


        element.innerHTML =
            `
                <section
                    class="vinci-welcome-card"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="vinciWelcomeTitle"
                >

                    <header class="vinci-welcome-hero">

                        <span class="vinci-welcome-kicker">
                            VINCI 1.1 FOCUS
                        </span>

                        <h1
                            id="vinciWelcomeTitle"
                            class="vinci-welcome-title"
                        >
                            ${escapeHTML(title.first)}
                            <em>
                                ${escapeHTML(title.accent)}
                            </em>
                        </h1>

                        <p class="vinci-welcome-copy">
                            As memórias continuaram aqui.
                            Separei um resumo leve do que aconteceu
                            enquanto você estava fora.
                        </p>

                        <div
                            id="vinciWelcomePerson"
                            class="vinci-welcome-person"
                        >
                            <img
                                src="assets/default-avatar.png.png"
                                alt=""
                            >

                            <div>
                                <span>
                                    carregando...
                                </span>

                                <strong>
                                    Vinci
                                </strong>
                            </div>
                        </div>

                    </header>


                    <div class="vinci-welcome-body">

                        <div class="vinci-welcome-section-head">

                            <div>

                                <span>
                                    ENQUANTO VOCÊ ESTAVA FORA
                                </span>

                                <h3>
                                    Seu Vinci continuou acontecendo.
                                </h3>

                            </div>

                            <div class="vinci-welcome-days">
                                ${
                                    forced
                                        ? "modo teste"
                                        : `${days} ${plural(days, "dia", "dias")} fora`
                                }
                            </div>

                        </div>


                        <div
                            id="vinciWelcomeContent"
                            class="vinci-welcome-loading"
                        >
                            Montando seu resumo...
                        </div>


                        <div class="vinci-welcome-actions">

                            <button
                                type="button"
                                id="vinciWelcomeContinue"
                                class="vinci-welcome-primary"
                            >
                                Continuar para o Vinci
                            </button>

                            ${
                                forced
                                    ? `
                                        <button
                                            type="button"
                                            id="vinciWelcomeCloseTest"
                                            class="vinci-welcome-secondary"
                                        >
                                            fechar modo de teste
                                        </button>
                                    `
                                    : ""
                            }

                        </div>

                    </div>

                </section>
            `;


        return element;

    }


    function renderSummary(
        summary
    ) {

        const person =
            document.getElementById(
                "vinciWelcomePerson"
            );


        if (person) {

            const image =
                person.querySelector(
                    "img"
                );

            const label =
                person.querySelector(
                    "span"
                );

            const name =
                person.querySelector(
                    "strong"
                );


            image.src =
                summary.profile.avatar_url ||
                "assets/default-avatar.png.png";


            image.onerror =
                () => {

                    image.src =
                        "assets/default-avatar.png.png";

                };


            label.textContent =
                `@${summary.profile.username || "vinci"}`;


            name.textContent =
                summary.profile.name ||
                "Seu perfil";

        }


        const content =
            document.getElementById(
                "vinciWelcomeContent"
            );


        if (!content) {
            return;
        }


        content.className =
            "";


        const statsHTML =
            `
                <div class="vinci-welcome-stats">

                    <article class="vinci-welcome-stat">
                        <strong>
                            ${summary.friendPosts}
                        </strong>

                        <span>
                            ${plural(summary.friendPosts, "post novo de amigo", "posts novos de amigos")}
                        </span>
                    </article>


                    <article class="vinci-welcome-stat">
                        <strong>
                            ${summary.roomMoments}
                        </strong>

                        <span>
                            ${plural(summary.roomMoments, "momento novo nas Rooms", "momentos novos nas Rooms")}
                        </span>
                    </article>


                    <article class="vinci-welcome-stat">
                        <strong>
                            ${summary.messages}
                        </strong>

                        <span>
                            ${plural(summary.messages, "mensagem recebida", "mensagens recebidas")}
                        </span>
                    </article>


                    <article class="vinci-welcome-stat">
                        <strong>
                            ${summary.friendRequests}
                        </strong>

                        <span>
                            ${plural(summary.friendRequests, "pedido de amizade", "pedidos de amizade")}
                        </span>
                    </article>

                </div>
            `;


        let memoriesHTML =
            "";


        if (
            summary.photos.length
        ) {

            memoriesHTML =
                `
                    <section class="vinci-welcome-memories">

                        <div class="vinci-welcome-memories-head">

                            <strong>
                                Alguns quadros que apareceram
                            </strong>

                            <span>
                                recentes
                            </span>

                        </div>


                        <div class="vinci-welcome-photo-stack">

                            ${
                                summary.photos
                                .map(
                                    (
                                        photo,
                                        index
                                    ) =>
                                        `
                                            <figure class="vinci-welcome-photo p${index + 1}">
                                                <img
                                                    src="${escapeHTML(photo.url)}"
                                                    alt="Momento recente"
                                                >
                                            </figure>
                                        `
                                )
                                .join(
                                    ""
                                )
                            }

                        </div>

                    </section>
                `;

        } else {

            memoriesHTML =
                `
                    <div class="vinci-welcome-empty">
                        Nenhuma foto nova apareceu nesse intervalo.
                        Seu resumo continua aqui, sem inventar movimento
                        onde não teve.
                    </div>
                `;

        }


        content.innerHTML =
            statsHTML +
            memoriesHTML;

    }


    function touchVisit(
        force = false
    ) {

        if (
            !currentUser ||
            pendingReturn
        ) {

            return;

        }


        const timestamp =
            now();


        if (
            !force &&
            timestamp -
                lastTouch <
                TOUCH_INTERVAL
        ) {

            return;

        }


        lastTouch =
            timestamp;


        writeNumber(
            key(
                "lastSeen",
                currentUser.id
            ),
            timestamp
        );

    }


    function installVisitTracking() {

        document.addEventListener(
            "visibilitychange",
            () => {

                if (
                    document.visibilityState ===
                    "hidden"
                ) {

                    touchVisit(
                        true
                    );

                }

            }
        );


        window.addEventListener(
            "pagehide",
            () => {

                touchVisit(
                    true
                );

            }
        );


        window.setInterval(
            () => {

                touchVisit();

            },
            TOUCH_INTERVAL
        );

    }


    function closeOverlay(
        forced
    ) {

        if (!overlay) {
            return;
        }


        overlay.classList.add(
            "closing"
        );


        document.body
        .classList
        .remove(
            "vinci-welcome-open"
        );


        window.setTimeout(
            () => {

                overlay?.remove();

                overlay =
                    null;

            },
            280
        );


        pendingReturn =
            false;


        if (!forced) {

            touchVisit(
                true
            );

        }

    }


    async function showWelcome(
        sinceTimestamp,
        days,
        forced
    ) {

        pendingReturn =
            true;


        overlay =
            createOverlay(
                days,
                forced
            );


        document.body.appendChild(
            overlay
        );


        document.body
        .classList
        .add(
            "vinci-welcome-open"
        );


        requestAnimationFrame(
            () => {

                overlay
                ?.classList
                .add(
                    "visible"
                );

            }
        );


        const continueButton =
            document.getElementById(
                "vinciWelcomeContinue"
            );


        continueButton
        ?.addEventListener(
            "click",
            () => {

                closeOverlay(
                    forced
                );

            }
        );


        document
        .getElementById(
            "vinciWelcomeCloseTest"
        )
        ?.addEventListener(
            "click",
            () => {

                const url =
                    new URL(
                        location.href
                    );


                url.searchParams.delete(
                    "welcome"
                );


                history.replaceState(
                    {},
                    "",
                    url
                );


                closeOverlay(
                    true
                );

            }
        );


        try {

            const summary =
                await buildSummary(
                    currentUser.id,
                    sinceTimestamp
                );


            renderSummary(
                summary
            );

        } catch (
            error
        ) {

            console.error(
                "Welcome Back:",
                error
            );


            const content =
                document.getElementById(
                    "vinciWelcomeContent"
                );


            if (content) {

                content.className =
                    "vinci-welcome-empty";


                content.textContent =
                    "Seu resumo não carregou inteiro agora, mas sua sessão está normal. Você pode continuar para o Vinci.";

            }

        }

    }


    async function boot() {

        if (
            typeof db ===
            "undefined"
        ) {

            return;

        }


        const {
            data
        } =
            await db.auth.getUser();


        currentUser =
            data?.user ||
            null;


        if (!currentUser) {
            return;
        }


        installVisitTracking();


        const forced =
            forceMode();


        const visitKey =
            key(
                "lastSeen",
                currentUser.id
            );


        const currentTime =
            now();


        let previous =
            readNumber(
                visitKey
            );


        /*
           Modo teste:
           usa uma janela fictícia de 7 dias para a consulta,
           mas NÃO altera a data real de último acesso.
        */
        if (forced) {

            const fakeSince =
                currentTime -
                (
                    7 *
                    24 *
                    60 *
                    60 *
                    1000
                );


            await showWelcome(
                fakeSince,
                7,
                true
            );


            return;

        }


        /*
           Primeira vez neste dispositivo:
           apenas registra a visita.
        */
        if (!previous) {

            writeNumber(
                visitKey,
                currentTime
            );


            lastTouch =
                currentTime;


            return;

        }


        const elapsed =
            currentTime -
            previous;


        if (
            elapsed >=
            FIVE_DAYS
        ) {

            const days =
                Math.max(
                    5,
                    daysBetween(
                        previous,
                        currentTime
                    )
                );


            await showWelcome(
                previous,
                days,
                false
            );


            return;

        }


        touchVisit(
            true
        );

    }


    window.VinciWelcomeBack = {

        showTest() {

            const url =
                new URL(
                    location.href
                );


            url.searchParams.set(
                "welcome",
                "1"
            );


            location.href =
                url.toString();

        },


        resetForTest(
            days = 6
        ) {

            if (!currentUser) {

                console.warn(
                    "Vinci Welcome Back: usuário ainda não carregado."
                );

                return;

            }


            const amount =
                Math.max(
                    5,
                    Number(
                        days
                    ) ||
                    6
                );


            writeNumber(
                key(
                    "lastSeen",
                    currentUser.id
                ),
                now() -
                    amount *
                    24 *
                    60 *
                    60 *
                    1000
            );


            console.log(
                `Vinci Welcome Back: último acesso definido para ${amount} dias atrás.`
            );

        }

    };


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            boot,
            {
                once:
                    true
            }
        );

    } else {

        boot();

    }

})();
