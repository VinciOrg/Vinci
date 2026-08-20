(function () {

    "use strict";


    const $ =
        selector =>
            document.querySelector(
                selector
            );


    const media =
        url =>
            window.VinciMedia?.resolveUrl
                ? window.VinciMedia.resolveUrl(
                    url
                )
                : Promise.resolve(
                    url
                );


    const resolvedMediaCache =
        new Map();


    let user =
        null;

    let profile =
        null;

    let year =
        new Date()
            .getFullYear();

    let stats =
        {};

    let memories =
        [];

    let allMemories =
        [];

    let topRoom =
        null;

    let selectedShareKeys =
        [];


    function esc(
        value
    ) {

        return String(
            value ?? ""
        )
        .replace(
            /[&<>"']/g,
            char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[char]
        );

    }


    function range(
        targetYear
    ) {

        return {
            from:
                `${targetYear}-01-01T00:00:00`,
            to:
                `${targetYear + 1}-01-01T00:00:00`
        };

    }


    function memoryKey(
        source,
        item
    ) {

        return `${source}:${item.id}`;

    }


    async function resolveMedia(
        url
    ) {

        if (!url) {
            return "";
        }


        if (
            resolvedMediaCache.has(
                url
            )
        ) {

            return resolvedMediaCache.get(
                url
            );

        }


        const resolved =
            await media(
                url
            );


        resolvedMediaCache.set(
            url,
            resolved || ""
        );


        return resolved || "";

    }


    async function load() {

        const r =
            range(
                year
            );


        const [
            {
                data:
                    profileRow
            },
            {
                data:
                    posts
            },
            {
                data:
                    entries
            },
            {
                data:
                    members
            },
            {
                data:
                    friends
            },
            {
                data:
                    wins
            }
        ] =
            await Promise.all(
                [

                    db
                    .from(
                        "profiles"
                    )
                    .select(
                        "id,username,name,avatar_url"
                    )
                    .eq(
                        "id",
                        user.id
                    )
                    .single(),


                    db
                    .from(
                        "posts"
                    )
                    .select(
                        "id,image_url,created_at"
                    )
                    .eq(
                        "user_id",
                        user.id
                    )
                    .gte(
                        "created_at",
                        r.from
                    )
                    .lt(
                        "created_at",
                        r.to
                    )
                    .order(
                        "created_at",
                        {
                            ascending:
                                false
                        }
                    ),


                    db
                    .from(
                        "vinci_room_entries"
                    )
                    .select(
                        "id,room_id,image_url,created_at"
                    )
                    .eq(
                        "user_id",
                        user.id
                    )
                    .gte(
                        "created_at",
                        r.from
                    )
                    .lt(
                        "created_at",
                        r.to
                    )
                    .order(
                        "created_at",
                        {
                            ascending:
                                false
                        }
                    ),


                    db
                    .from(
                        "vinci_room_members"
                    )
                    .select(
                        "room_id,joined_at"
                    )
                    .eq(
                        "user_id",
                        user.id
                    ),


                    db
                    .from(
                        "vinci_friendships"
                    )
                    .select(
                        "id,created_at"
                    )
                    .or(
                        `user_a.eq.${user.id},user_b.eq.${user.id}`
                    )
                    .lte(
                        "created_at",
                        r.to
                    ),


                    db
                    .from(
                        "vinci_room_games"
                    )
                    .select(
                        "id,room_id,created_at"
                    )
                    .eq(
                        "winner_user_id",
                        user.id
                    )
                    .gte(
                        "created_at",
                        r.from
                    )
                    .lt(
                        "created_at",
                        r.to
                    )

                ]
            );


        profile =
            profileRow ||
            {};


        const postMemories =
            (
                posts ||
                []
            )
            .map(
                item => ({
                    ...item,
                    source:
                        "post",
                    shareKey:
                        memoryKey(
                            "post",
                            item
                        )
                })
            );


        const roomMemories =
            (
                entries ||
                []
            )
            .map(
                item => ({
                    ...item,
                    source:
                        "room",
                    shareKey:
                        memoryKey(
                            "room",
                            item
                        )
                })
            );


        const roomIds =
            [
                ...new Set(
                    roomMemories
                    .map(
                        entry =>
                            entry.room_id
                    )
                )
            ];


        const {
            data:
                roomRows
        } =
            roomIds.length
                ? await db
                    .from(
                        "vinci_rooms"
                    )
                    .select(
                        "id,name,best_streak"
                    )
                    .in(
                        "id",
                        roomIds
                    )
                : {
                    data:
                        []
                };


        const counts =
            new Map();


        for (
            const entry
            of
            roomMemories
        ) {

            counts.set(
                entry.room_id,
                (
                    counts.get(
                        entry.room_id
                    ) ||
                    0
                ) +
                1
            );

        }


        topRoom =
            (
                roomRows ||
                []
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    (
                        counts.get(
                            b.id
                        ) ||
                        0
                    ) -
                    (
                        counts.get(
                            a.id
                        ) ||
                        0
                    )
            )[0] ||
            null;


        stats = {

            photos:
                postMemories.length,

            roomMoments:
                roomMemories.length,

            rooms:
                (
                    members ||
                    []
                )
                .filter(
                    member =>
                        new Date(
                            member.joined_at
                        ) <
                        new Date(
                            r.to
                        )
                )
                .length,

            friends:
                (
                    friends ||
                    []
                )
                .length,

            wins:
                (
                    wins ||
                    []
                )
                .length,

            bestStreak:
                Math.max(
                    0,
                    ...(
                        roomRows ||
                        []
                    )
                    .map(
                        room =>
                            room.best_streak ||
                            0
                    )
                )

        };


        allMemories =
            [
                ...postMemories,
                ...roomMemories
            ]
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
            );


        memories =
            allMemories
            .slice(
                0,
                7
            );


        selectedShareKeys =
            allMemories
            .slice(
                0,
                3
            )
            .map(
                memory =>
                    memory.shareKey
            );


        await render();

    }


    async function render() {

        $(
            "#yearbookYear"
        )
        .textContent =
            year;


        $(
            "#yearbookCoverTitle"
        )
        .textContent =
            year;


        $(
            "#yearbookCoverText"
        )
        .textContent =
            `@${profile.username || "você"}, você publicou ${stats.photos} foto${stats.photos === 1 ? "" : "s"} e guardou ${stats.photos + stats.roomMoments} momentos no Vinci em ${year}.`;


        const avatarBox =
            $(
                "#yearbookCoverAvatar"
            );


        avatarBox.className =
            "yearbook-cover-avatar";

        avatarBox.dataset.userId =
            user.id;

        avatarBox.innerHTML =
            `
                <img
                    src="${esc(profile.avatar_url || "assets/default-avatar.png.png")}"
                    alt="Foto de perfil"
                >
            `;


        const items =
            [

                [
                    stats.photos,
                    "fotos postadas"
                ],

                [
                    stats.roomMoments,
                    "momentos em Rooms"
                ],

                [
                    stats.rooms,
                    "Rooms"
                ],

                [
                    stats.friends,
                    "amizades"
                ],

                [
                    stats.wins,
                    "vitórias"
                ],

                [
                    stats.bestStreak,
                    "melhor streak"
                ]

            ];


        $(
            "#yearbookStats"
        )
        .innerHTML =
            items
            .map(
                item =>
                    `
                        <div class="yearbook-stat">
                            <strong>
                                ${item[0]}
                            </strong>

                            <span>
                                ${esc(item[1])}
                            </span>
                        </div>
                    `
            )
            .join(
                ""
            );


        $(
            "#yearbookTopRoom"
        )
        .textContent =
            topRoom?.name ||
            "Seu ano foi além das Rooms";


        $(
            "#yearbookTopRoomText"
        )
        .textContent =
            topRoom
                ? `Foi onde você guardou mais momentos em ${year}. Melhor sequência registrada: ${topRoom.best_streak || 0} dias.`
                : "Quando você criar mais memórias em grupo, sua Room do ano aparece aqui.";


        let mosaicHTML =
            "";


        for (
            const memory
            of
            memories
        ) {

            const url =
                await resolveMedia(
                    memory.image_url
                );


            mosaicHTML +=
                `
                    <img
                        src="${esc(url)}"
                        alt="Memória"
                        loading="lazy"
                    >
                `;

        }


        $(
            "#yearbookMosaic"
        )
        .innerHTML =
            mosaicHTML ||
            `
                <div style="grid-column:1/-1;color:#999">
                    As fotos deste ano ainda estão esperando por você.
                </div>
            `;


        await renderPhotoPicker();


        $(
            "#yearbookStatus"
        )
        .classList
        .add(
            "hidden"
        );


        $(
            "#yearbookContent"
        )
        .classList
        .remove(
            "hidden"
        );

    }


    async function renderPhotoPicker() {

        const picker =
            $(
                "#yearbookPhotoPicker"
            );


        if (
            !allMemories.length
        ) {

            picker.innerHTML =
                `
                    <div
                        style="
                            grid-column:1/-1;
                            padding:24px;
                            text-align:center;
                            color:#999;
                        "
                    >
                        Você ainda não tem fotos deste ano para escolher.
                    </div>
                `;


            updateSelectionUI();

            return;

        }


        const resolved =
            await Promise.all(
                allMemories
                .map(
                    async memory => ({
                        memory,
                        url:
                            await resolveMedia(
                                memory.image_url
                            )
                    })
                )
            );


        const options =
            resolved
            .map(
                ({
                    memory,
                    url
                }) => {

                    const order =
                        selectedShareKeys.indexOf(
                            memory.shareKey
                        );


                    return `
                        <button
                            type="button"
                            class="yearbook-photo-option ${order >= 0 ? "selected" : ""}"
                            data-yearbook-photo="${esc(memory.shareKey)}"
                            aria-label="Selecionar foto"
                        >

                            <img
                                src="${esc(url)}"
                                alt="Foto do Yearbook"
                                loading="lazy"
                            >

                            <span class="yearbook-photo-order">
                                ${order >= 0 ? order + 1 : ""}
                            </span>

                        </button>
                    `;

                }
            );


        picker.innerHTML =
            options.join(
                ""
            );


        picker
        .querySelectorAll(
            "[data-yearbook-photo]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        toggleSharePhoto(
                            button.dataset.yearbookPhoto
                        );

                    }
                );

            }
        );


        updateSelectionUI();

    }


    function toggleSharePhoto(
        key
    ) {

        const existingIndex =
            selectedShareKeys.indexOf(
                key
            );


        if (
            existingIndex >=
            0
        ) {

            selectedShareKeys.splice(
                existingIndex,
                1
            );

        } else {

            if (
                selectedShareKeys.length >=
                3
            ) {

                selectedShareKeys.shift();

            }


            selectedShareKeys.push(
                key
            );

        }


        updateSelectionUI();

    }


    function updateSelectionUI() {

        const required =
            Math.min(
                3,
                allMemories.length
            );


        const count =
            $(
                "#yearbookPhotoSelectionCount"
            );


        if (count) {

            count.textContent =
                `${selectedShareKeys.length} / ${required || 3}`;

        }


        document
        .querySelectorAll(
            "[data-yearbook-photo]"
        )
        .forEach(
            button => {

                const order =
                    selectedShareKeys.indexOf(
                        button.dataset.yearbookPhoto
                    );


                button.classList.toggle(
                    "selected",
                    order >= 0
                );


                const badge =
                    button.querySelector(
                        ".yearbook-photo-order"
                    );


                if (badge) {

                    badge.textContent =
                        order >= 0
                            ? String(
                                order + 1
                            )
                            : "";

                }

            }
        );


        const builderButton =
            $(
                "#shareYearbookFromBuilder"
            );


        if (builderButton) {

            builderButton.disabled =
                required > 0 &&
                selectedShareKeys.length !==
                    required;

        }

    }


    function selectedShareMemories() {

        const byKey =
            new Map(
                allMemories
                .map(
                    memory => [
                        memory.shareKey,
                        memory
                    ]
                )
            );


        return selectedShareKeys
            .map(
                key =>
                    byKey.get(
                        key
                    )
            )
            .filter(
                Boolean
            )
            .slice(
                0,
                3
            );

    }


    function roundRectPath(
        ctx,
        x,
        y,
        width,
        height,
        radius
    ) {

        const r =
            Math.min(
                radius,
                width / 2,
                height / 2
            );


        ctx.beginPath();

        ctx.moveTo(
            x + r,
            y
        );

        ctx.arcTo(
            x + width,
            y,
            x + width,
            y + height,
            r
        );

        ctx.arcTo(
            x + width,
            y + height,
            x,
            y + height,
            r
        );

        ctx.arcTo(
            x,
            y + height,
            x,
            y,
            r
        );

        ctx.arcTo(
            x,
            y,
            x + width,
            y,
            r
        );

        ctx.closePath();

    }


    function fillRoundRect(
        ctx,
        x,
        y,
        width,
        height,
        radius,
        color
    ) {

        ctx.save();

        roundRectPath(
            ctx,
            x,
            y,
            width,
            height,
            radius
        );

        ctx.fillStyle =
            color;

        ctx.fill();

        ctx.restore();

    }


    function drawWrappedText(
        ctx,
        text,
        x,
        y,
        maxWidth,
        lineHeight,
        maxLines =
            3
    ) {

        const words =
            String(
                text ||
                ""
            )
            .split(
                /\s+/
            );


        const lines =
            [];

        let current =
            "";


        for (
            const word
            of
            words
        ) {

            const test =
                current
                    ? `${current} ${word}`
                    : word;


            if (
                ctx.measureText(
                    test
                ).width >
                    maxWidth &&
                current
            ) {

                lines.push(
                    current
                );

                current =
                    word;


                if (
                    lines.length ===
                    maxLines - 1
                ) {

                    break;

                }

            } else {

                current =
                    test;

            }

        }


        if (
            current &&
            lines.length <
                maxLines
        ) {

            lines.push(
                current
            );

        }


        lines
        .slice(
            0,
            maxLines
        )
        .forEach(
            (
                line,
                index
            ) => {

                ctx.fillText(
                    line,
                    x,
                    y +
                        index *
                        lineHeight
                );

            }
        );


        return lines.length;

    }


    async function loadCanvasImage(
        url
    ) {

        if (!url) {
            return null;
        }


        try {

            const response =
                await fetch(
                    url,
                    {
                        cache:
                            "no-store"
                    }
                );


            if (
                !response.ok
            ) {

                throw new Error(
                    `HTTP ${response.status}`
                );

            }


            const blob =
                await response.blob();


            if (
                "createImageBitmap"
                in
                window
            ) {

                return await createImageBitmap(
                    blob
                );

            }


            return await new Promise(
                (
                    resolve,
                    reject
                ) => {

                    const objectURL =
                        URL.createObjectURL(
                            blob
                        );


                    const image =
                        new Image();


                    image.onload =
                        () => {

                            URL.revokeObjectURL(
                                objectURL
                            );

                            resolve(
                                image
                            );

                        };


                    image.onerror =
                        () => {

                            URL.revokeObjectURL(
                                objectURL
                            );

                            reject(
                                new Error(
                                    "Imagem inválida."
                                )
                            );

                        };


                    image.src =
                        objectURL;

                }
            );

        } catch (
            error
        ) {

            console.warn(
                "Yearbook: não foi possível carregar uma foto para a arte.",
                error
            );

            return null;

        }

    }


    function imageSize(
        image
    ) {

        return {
            width:
                image?.naturalWidth ||
                image?.width ||
                1,

            height:
                image?.naturalHeight ||
                image?.height ||
                1
        };

    }


    function drawImageCover(
        ctx,
        image,
        x,
        y,
        width,
        height
    ) {

        if (!image) {

            ctx.fillStyle =
                "#d9d0c8";

            ctx.fillRect(
                x,
                y,
                width,
                height
            );

            return;

        }


        const source =
            imageSize(
                image
            );


        const scale =
            Math.max(
                width /
                    source.width,
                height /
                    source.height
            );


        const sourceWidth =
            width /
            scale;

        const sourceHeight =
            height /
            scale;

        const sourceX =
            (
                source.width -
                sourceWidth
            ) /
            2;

        const sourceY =
            (
                source.height -
                sourceHeight
            ) /
            2;


        ctx.drawImage(
            image,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            x,
            y,
            width,
            height
        );

    }


    function drawPrintedPhoto(
        ctx,
        image,
        centerX,
        centerY,
        angle,
        label
    ) {

        const cardWidth =
            410;

        const cardHeight =
            270;

        const imageInset =
            18;

        const photoHeight =
            210;


        ctx.save();


        ctx.translate(
            centerX,
            centerY
        );


        ctx.rotate(
            angle *
            Math.PI /
            180
        );


        ctx.shadowColor =
            "rgba(28,20,14,.24)";

        ctx.shadowBlur =
            26;

        ctx.shadowOffsetY =
            14;


        fillRoundRect(
            ctx,
            -cardWidth / 2,
            -cardHeight / 2,
            cardWidth,
            cardHeight,
            8,
            "#fffdfa"
        );


        ctx.shadowColor =
            "transparent";


        ctx.save();

        roundRectPath(
            ctx,
            -cardWidth / 2 +
                imageInset,
            -cardHeight / 2 +
                imageInset,
            cardWidth -
                imageInset *
                2,
            photoHeight,
            4
        );

        ctx.clip();


        drawImageCover(
            ctx,
            image,
            -cardWidth / 2 +
                imageInset,
            -cardHeight / 2 +
                imageInset,
            cardWidth -
                imageInset *
                2,
            photoHeight
        );


        ctx.restore();


        ctx.fillStyle =
            "#2b231e";

        ctx.font =
            "700 17px Arial";

        ctx.fillText(
            label,
            -cardWidth / 2 +
                22,
            cardHeight / 2 -
                19
        );


        ctx.fillStyle =
            "#a89586";

        ctx.font =
            "italic 14px Arial";

        ctx.textAlign =
            "right";

        ctx.fillText(
            "Vinci Yearbook",
            cardWidth / 2 -
                22,
            cardHeight / 2 -
                19
        );


        ctx.textAlign =
            "left";


        ctx.restore();

    }


    async function drawAvatar(
        ctx,
        url,
        x,
        y,
        size
    ) {

        const resolved =
            await resolveMedia(
                url
            );

        const image =
            await loadCanvasImage(
                resolved
            );


        if (!image) {
            return;
        }


        ctx.save();

        ctx.beginPath();

        ctx.arc(
            x +
                size / 2,
            y +
                size / 2,
            size / 2,
            0,
            Math.PI *
                2
        );

        ctx.clip();


        drawImageCover(
            ctx,
            image,
            x,
            y,
            size,
            size
        );


        ctx.restore();


        ctx.strokeStyle =
            "#ffffff";

        ctx.lineWidth =
            4;

        ctx.beginPath();

        ctx.arc(
            x +
                size / 2,
            y +
                size / 2,
            size / 2 -
                2,
            0,
            Math.PI *
                2
        );

        ctx.stroke();

    }


    async function composeShareImage() {

        const canvas =
            $(
                "#yearbookCanvas"
            );


        const ctx =
            canvas.getContext(
                "2d"
            );


        const selected =
            selectedShareMemories();


        const required =
            Math.min(
                3,
                allMemories.length
            );


        if (
            required > 0 &&
            selected.length !==
                required
        ) {

            throw new Error(
                `Escolha ${required} foto${required === 1 ? "" : "s"} para criar sua imagem.`
            );

        }


        const photoImages =
            [];


        for (
            const memory
            of
            selected
        ) {

            const resolved =
                await resolveMedia(
                    memory.image_url
                );


            photoImages.push(
                await loadCanvasImage(
                    resolved
                )
            );

        }


        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );


        /* papel */
        ctx.fillStyle =
            "#f2ede7";

        ctx.fillRect(
            0,
            0,
            1080,
            1350
        );


        /* textura editorial discreta */
        ctx.fillStyle =
            "#e8dfd644";

        for (
            let y =
                34;
            y <
                1350;
            y +=
                48
        ) {

            ctx.fillRect(
                0,
                y,
                1080,
                1
            );

        }


        /* círculo laranja decorativo */
        ctx.beginPath();

        ctx.arc(
            1020,
            80,
            245,
            0,
            Math.PI *
                2
        );

        ctx.fillStyle =
            "#f4a261";

        ctx.fill();


        ctx.beginPath();

        ctx.arc(
            995,
            72,
            183,
            0,
            Math.PI *
                2
        );

        ctx.strokeStyle =
            "rgba(255,255,255,.3)";

        ctx.lineWidth =
            2;

        ctx.stroke();


        /* cabeçalho */
        ctx.fillStyle =
            "#e98132";

        ctx.font =
            "900 27px Arial";

        ctx.fillText(
            "VINCI YEARBOOK",
            70,
            82
        );


        ctx.fillStyle =
            "#221b17";

        ctx.font =
            "900 146px Arial";

        ctx.fillText(
            String(
                year
            ),
            62,
            236
        );


        if (
            profile.avatar_url
        ) {

            await drawAvatar(
                ctx,
                profile.avatar_url,
                72,
                270,
                62
            );

        }


        ctx.fillStyle =
            "#2d2520";

        ctx.font =
            "700 25px Arial";

        ctx.fillText(
            `@${profile.username || "vinci"}`,
            profile.avatar_url
                ? 150
                : 72,
            309
        );


        ctx.fillStyle =
            "#8d7e73";

        ctx.font =
            "20px Arial";

        ctx.fillText(
            "meu ano contado por fotos",
            profile.avatar_url
                ? 150
                : 72,
            337
        );


        /* destaque principal */
        ctx.fillStyle =
            "#e98132";

        ctx.font =
            "900 21px Arial";

        ctx.fillText(
            "FOTOS POSTADAS",
            72,
            425
        );


        ctx.fillStyle =
            "#211a16";

        ctx.font =
            "900 94px Arial";

        ctx.fillText(
            String(
                stats.photos
            ),
            68,
            512
        );


        ctx.fillStyle =
            "#85766b";

        ctx.font =
            "21px Arial";

        ctx.fillText(
            `${stats.photos + stats.roomMoments} momentos guardados no total`,
            73,
            548
        );


        /* pequenos stats */
        const statCards =
            [

                {
                    value:
                        stats.friends,
                    label:
                        "AMIGOS"
                },

                {
                    value:
                        stats.rooms,
                    label:
                        "ROOMS"
                },

                {
                    value:
                        stats.wins,
                    label:
                        "VITÓRIAS"
                },

                {
                    value:
                        stats.bestStreak,
                    label:
                        "MELHOR STREAK"
                }

            ];


        statCards
        .forEach(
            (
                stat,
                index
            ) => {

                const column =
                    index %
                    2;

                const row =
                    Math.floor(
                        index /
                        2
                    );


                const x =
                    72 +
                    column *
                    190;

                const y =
                    600 +
                    row *
                    132;


                fillRoundRect(
                    ctx,
                    x,
                    y,
                    172,
                    108,
                    18,
                    "#fffaf6"
                );


                ctx.fillStyle =
                    "#261e19";

                ctx.font =
                    "900 38px Arial";

                ctx.fillText(
                    String(
                        stat.value
                    ),
                    x +
                        16,
                    y +
                        48
                );


                ctx.fillStyle =
                    "#9b8879";

                ctx.font =
                    "900 13px Arial";

                ctx.fillText(
                    stat.label,
                    x +
                        16,
                    y +
                        78
                );

            }
        );


        /* Room do ano */
        ctx.fillStyle =
            "#e98132";

        ctx.font =
            "900 17px Arial";

        ctx.fillText(
            "ROOM DO ANO",
            72,
            895
        );


        ctx.fillStyle =
            "#261e19";

        ctx.font =
            "900 31px Arial";


        drawWrappedText(
            ctx,
            topRoom?.name ||
                "Meu ano no Vinci",
            72,
            933,
            400,
            36,
            2
        );


        ctx.fillStyle =
            "#8e7e72";

        ctx.font =
            "18px Arial";


        drawWrappedText(
            ctx,
            topRoom
                ? `Foi onde eu guardei mais momentos. Melhor sequência: ${topRoom.best_streak || 0} dias.`
                : "As fotos passam. As histórias ficam.",
            72,
            1012,
            400,
            27,
            3
        );


        /* 3 fotos impressas */
        const centers =
            [
                {
                    x:
                        787,
                    y:
                        310,
                    angle:
                        -4.5
                },

                {
                    x:
                        795,
                    y:
                        630,
                    angle:
                        3.2
                },

                {
                    x:
                        780,
                    y:
                        950,
                    angle:
                        -2.7
                }

            ];


        for (
            let index =
                0;
            index <
                Math.max(
                    3,
                    photoImages.length
                );
            index +=
                1
        ) {

            const center =
                centers[
                    index
                ];


            drawPrintedPhoto(
                ctx,
                photoImages[
                    index
                ] ||
                null,
                center.x,
                center.y,
                center.angle,
                `0${index + 1} · ${year}`
            );

        }


        /* rodapé */
        ctx.fillStyle =
            "#d9cabe";

        ctx.fillRect(
            68,
            1222,
            944,
            1
        );


        ctx.fillStyle =
            "#211a16";

        ctx.font =
            "900 22px Arial";

        ctx.fillText(
            "VINCI",
            70,
            1273
        );


        ctx.fillStyle =
            "#8e7e72";

        ctx.font =
            "18px Arial";

        ctx.fillText(
            "As fotos passam. As histórias ficam.",
            150,
            1273
        );


        ctx.textAlign =
            "right";

        ctx.fillStyle =
            "#e98132";

        ctx.font =
            "900 17px Arial";

        ctx.fillText(
            `YEARBOOK ${year}`,
            1010,
            1273
        );


        ctx.textAlign =
            "left";


        return canvas;

    }


    function setShareBusy(
        busy
    ) {

        const buttons =
            [
                $(
                    "#shareYearbook"
                ),
                $(
                    "#shareYearbookFromBuilder"
                )
            ]
            .filter(
                Boolean
            );


        for (
            const button
            of
            buttons
        ) {

            if (busy) {

                button.dataset.oldText =
                    button.textContent;

                button.textContent =
                    "Criando...";

                button.disabled =
                    true;

            } else {

                button.textContent =
                    button.dataset.oldText ||
                    (
                        button.id ===
                        "shareYearbook"
                            ? "Compartilhar"
                            : "Criar imagem"
                    );


                delete button.dataset.oldText;

            }

        }


        if (!busy) {

            updateSelectionUI();

        }

    }


    async function share() {

        try {

            setShareBusy(
                true
            );


            const canvas =
                await composeShareImage();


            const blob =
                await new Promise(
                    (
                        resolve,
                        reject
                    ) => {

                        canvas.toBlob(
                            result => {

                                if (result) {

                                    resolve(
                                        result
                                    );

                                } else {

                                    reject(
                                        new Error(
                                            "Não foi possível gerar a imagem."
                                        )
                                    );

                                }

                            },
                            "image/png",
                            1
                        );

                    }
                );


            const file =
                new File(
                    [
                        blob
                    ],
                    `vinci-yearbook-${year}.png`,
                    {
                        type:
                            "image/png"
                    }
                );


            if (
                navigator.share &&
                navigator.canShare?.({
                    files:
                        [
                            file
                        ]
                })
            ) {

                await navigator.share(
                    {
                        files:
                            [
                                file
                            ],
                        title:
                            `Meu ${year} no Vinci`,
                        text:
                            `Meu Yearbook ${year} no Vinci.`
                    }
                );

            } else {

                const objectURL =
                    URL.createObjectURL(
                        blob
                    );


                const anchor =
                    document.createElement(
                        "a"
                    );


                anchor.href =
                    objectURL;

                anchor.download =
                    file.name;


                anchor.click();


                setTimeout(
                    () => {

                        URL.revokeObjectURL(
                            objectURL
                        );

                    },
                    1000
                );

            }

        } catch (
            error
        ) {

            if (
                error?.name ===
                "AbortError"
            ) {

                return;

            }


            console.error(
                "Yearbook share:",
                error
            );


            alert(
                error?.message ||
                "Não consegui criar a imagem do Yearbook."
            );

        } finally {

            setShareBusy(
                false
            );

        }

    }


    async function init() {

        const {
            data: {
                user:
                    currentUser
            }
        } =
            await db
            .auth
            .getUser();


        if (!currentUser) {
            return;
        }


        user =
            currentUser;


        $(
            "#yearbookBack"
        )
        .onclick =
            () =>
                history.length >
                    1
                    ? history.back()
                    : location.assign(
                        "profile.html"
                    );


        $(
            "#shareYearbook"
        )
        .onclick =
            share;


        $(
            "#shareYearbookFromBuilder"
        )
        .onclick =
            share;


        try {

            await load();

        } catch (
            error
        ) {

            $(
                "#yearbookStatus"
            )
            .textContent =
                "Não consegui montar o Yearbook ainda. Confira o PATCH 10 no Supabase.";


            console.error(
                error
            );

        }

    }


    document.addEventListener(
        "DOMContentLoaded",
        init
    );

})();
