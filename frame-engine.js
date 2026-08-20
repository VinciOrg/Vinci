(function () {
    "use strict";

    const ACTIVE = new Set([
        "vector_nova",
        "event_horizon",
        "neon_symphony"
    ]);

    let observer = null;


    function frameKey(wrap) {

        if (
            wrap.classList.contains(
                "vinci-frame-vector_nova"
            )
        ) {
            return "vector_nova";
        }

        if (
            wrap.classList.contains(
                "vinci-frame-event_horizon"
            )
        ) {
            return "event_horizon";
        }

        if (
            wrap.classList.contains(
                "vinci-frame-neon_symphony"
            )
        ) {
            return "neon_symphony";
        }

        return null;

    }


    function cancelEffects(wrap) {

        wrap
            .querySelectorAll(
                ".vinci-fx-art, .vinci-fx-art *"
            )
            .forEach(
                element => {

                    element
                        .getAnimations?.()
                        .forEach(
                            animation => {
                                animation.cancel();
                            }
                        );

                }
            );

    }


    function animate(
        element,
        keyframes,
        options
    ) {

        if (
            !element ||
            typeof element.animate !== "function"
        ) {
            return null;
        }

        const animation =
            element.animate(
                keyframes,
                {
                    fill: "both",
                    ...options
                }
            );

        animation.play();

        return animation;

    }


    function vectorMarkup() {

        return `
            <i
                class="vinci-frame-art vinci-fx-art"
                aria-hidden="true"
                data-vinci-fx-art="vector_nova"
            >
                <span class="fx-vector-ring-a"></span>
                <span class="fx-vector-ring-b"></span>
                <span class="fx-vector-scan"></span>

                <span class="fx-vector-node n1"></span>
                <span class="fx-vector-node n2"></span>
                <span class="fx-vector-node n3"></span>
                <span class="fx-vector-node n4"></span>
            </i>
        `;

    }


    function horizonMarkup() {

        return `
            <i
                class="vinci-frame-art vinci-fx-art"
                aria-hidden="true"
                data-vinci-fx-art="event_horizon"
            >
                <span class="fx-horizon-disk"></span>
                <span class="fx-horizon-lens"></span>

                <span class="fx-horizon-orbit">
                    <i class="fx-horizon-moon m1"></i>
                    <i class="fx-horizon-moon m2"></i>
                </span>

                <span class="fx-horizon-star s1"></span>
                <span class="fx-horizon-star s2"></span>
                <span class="fx-horizon-star s3"></span>
                <span class="fx-horizon-star s4"></span>
            </i>
        `;

    }


    function musicMarkup() {

        return `
            <i
                class="vinci-frame-art vinci-fx-art"
                aria-hidden="true"
                data-vinci-fx-art="neon_symphony"
            >
                <span class="fx-music-staff">
                    <i class="l1"></i>
                    <i class="l2"></i>
                    <i class="l3"></i>
                    <i class="l4"></i>
                    <i class="l5"></i>
                </span>

                <span class="fx-music-spectrum"></span>
                <span class="fx-music-wave"></span>

                <span class="fx-music-orbit">
                    <i class="fx-music-note n1">♪</i>
                    <i class="fx-music-note n2">♫</i>
                    <i class="fx-music-note n3">♪</i>
                </span>

                <span class="fx-music-beat b1"></span>
                <span class="fx-music-beat b2"></span>
                <span class="fx-music-beat b3"></span>
                <span class="fx-music-beat b4"></span>
            </i>
        `;

    }


    function installMarkup(
        wrap,
        key
    ) {

        const current =
            wrap.querySelector(
                ".vinci-frame-art"
            );


        if (
            current?.dataset?.vinciFxArt === key
        ) {
            return current;
        }


        cancelEffects(
            wrap
        );


        current?.remove();


        const holder =
            document.createElement(
                "template"
            );


        holder.innerHTML =
            key === "vector_nova"
                ? vectorMarkup()
                : key === "event_horizon"
                    ? horizonMarkup()
                    : musicMarkup();


        const art =
            holder
                .content
                .firstElementChild;


        const image =
            wrap.querySelector(
                "img, .profile-avatar"
            );


        if (image) {

            wrap.insertBefore(
                art,
                image
            );

        } else {

            wrap.appendChild(
                art
            );

        }


        return art;

    }


    function startVector(
        art
    ) {

        const ringA =
            art.querySelector(
                ".fx-vector-ring-a"
            );

        const ringB =
            art.querySelector(
                ".fx-vector-ring-b"
            );

        const scan =
            art.querySelector(
                ".fx-vector-scan"
            );

        const nodes =
            [
                ...art.querySelectorAll(
                    ".fx-vector-node"
                )
            ];


        animate(
            ringA,
            [
                {
                    transform:
                        "rotate(0deg)"
                },
                {
                    transform:
                        "rotate(360deg)"
                }
            ],
            {
                duration: 8200,
                iterations: Infinity,
                easing: "linear"
            }
        );


        animate(
            ringB,
            [
                {
                    transform:
                        "rotate(360deg)"
                },
                {
                    transform:
                        "rotate(0deg)"
                }
            ],
            {
                duration: 5600,
                iterations: Infinity,
                easing: "linear"
            }
        );


        animate(
            scan,
            [
                {
                    transform:
                        "rotate(0deg)",
                    opacity: .4
                },
                {
                    transform:
                        "rotate(180deg)",
                    opacity: 1
                },
                {
                    transform:
                        "rotate(360deg)",
                    opacity: .4
                }
            ],
            {
                duration: 3000,
                iterations: Infinity,
                easing: "linear"
            }
        );


        const baseTransforms = [
            "rotate(0deg) translateY(-355%) rotate(0deg)",
            "rotate(90deg) translateY(-355%) rotate(-90deg)",
            "rotate(180deg) translateY(-355%) rotate(-180deg)",
            "rotate(270deg) translateY(-355%) rotate(-270deg)"
        ];


        nodes.forEach(
            (
                node,
                index
            ) => {

                animate(
                    node,
                    [
                        {
                            transform:
                                `${baseTransforms[index]} scale(.78)`,
                            opacity: .62
                        },
                        {
                            transform:
                                `${baseTransforms[index]} scale(1.16)`,
                            opacity: 1
                        },
                        {
                            transform:
                                `${baseTransforms[index]} scale(.78)`,
                            opacity: .62
                        }
                    ],
                    {
                        duration: 1500,
                        delay:
                            index * 190,
                        iterations: Infinity,
                        easing:
                            "ease-in-out"
                    }
                );

            }
        );

    }


    function startHorizon(
        art
    ) {

        const disk =
            art.querySelector(
                ".fx-horizon-disk"
            );

        const lens =
            art.querySelector(
                ".fx-horizon-lens"
            );

        const orbit =
            art.querySelector(
                ".fx-horizon-orbit"
            );

        const stars =
            [
                ...art.querySelectorAll(
                    ".fx-horizon-star"
                )
            ];


        animate(
            disk,
            [
                {
                    transform:
                        "rotate(-12deg) scaleX(.96)",
                    filter:
                        "brightness(.9) saturate(1)"
                },
                {
                    transform:
                        "rotate(348deg) scaleX(1.04)",
                    filter:
                        "brightness(1.18) saturate(1.2)"
                }
            ],
            {
                duration: 11000,
                iterations: Infinity,
                easing: "linear"
            }
        );


        animate(
            orbit,
            [
                {
                    transform:
                        "rotate(0deg)"
                },
                {
                    transform:
                        "rotate(360deg)"
                }
            ],
            {
                duration: 6500,
                iterations: Infinity,
                easing: "linear"
            }
        );


        animate(
            lens,
            [
                {
                    transform:
                        "scale(.94)",
                    opacity: .55
                },
                {
                    transform:
                        "scale(1.06)",
                    opacity: 1
                },
                {
                    transform:
                        "scale(.94)",
                    opacity: .55
                }
            ],
            {
                duration: 2400,
                iterations: Infinity,
                easing: "ease-in-out"
            }
        );


        stars.forEach(
            (
                star,
                index
            ) => {

                animate(
                    star,
                    [
                        {
                            transform:
                                "scale(.45)",
                            opacity: .2
                        },
                        {
                            transform:
                                "scale(1.45)",
                            opacity: 1
                        },
                        {
                            transform:
                                "scale(.45)",
                            opacity: .2
                        }
                    ],
                    {
                        duration:
                            1250 +
                            index * 170,
                        delay:
                            index * 260,
                        iterations: Infinity,
                        easing: "ease-in-out"
                    }
                );

            }
        );

    }


    function startMusic(
        art
    ) {

        const staff =
            art.querySelector(
                ".fx-music-staff"
            );

        const spectrum =
            art.querySelector(
                ".fx-music-spectrum"
            );

        const wave =
            art.querySelector(
                ".fx-music-wave"
            );

        const orbit =
            art.querySelector(
                ".fx-music-orbit"
            );

        const notes =
            [
                ...art.querySelectorAll(
                    ".fx-music-note"
                )
            ];

        const beats =
            [
                ...art.querySelectorAll(
                    ".fx-music-beat"
                )
            ];


        /*
           Esse é o movimento principal.
           Não depende de @keyframes.
        */
        animate(
            orbit,
            [
                {
                    transform:
                        "rotate(0deg)"
                },
                {
                    transform:
                        "rotate(360deg)"
                }
            ],
            {
                duration: 7200,
                iterations: Infinity,
                easing: "linear"
            }
        );


        animate(
            spectrum,
            [
                {
                    transform:
                        "rotate(0deg) scale(.96)",
                    opacity: .68
                },
                {
                    transform:
                        "rotate(180deg) scale(1.04)",
                    opacity: 1
                },
                {
                    transform:
                        "rotate(360deg) scale(.96)",
                    opacity: .68
                }
            ],
            {
                duration: 9600,
                iterations: Infinity,
                easing: "linear"
            }
        );


        animate(
            staff,
            [
                {
                    transform:
                        "rotate(-4deg) scale(.97)",
                    opacity: .52
                },
                {
                    transform:
                        "rotate(4deg) scale(1.03)",
                    opacity: .88
                },
                {
                    transform:
                        "rotate(-4deg) scale(.97)",
                    opacity: .52
                }
            ],
            {
                duration: 3600,
                iterations: Infinity,
                easing: "ease-in-out"
            }
        );


        animate(
            wave,
            [
                {
                    transform:
                        "scale(.88)",
                    opacity: .75
                },
                {
                    transform:
                        "scale(1.17)",
                    opacity: 0
                }
            ],
            {
                duration: 1650,
                iterations: Infinity,
                easing: "ease-out"
            }
        );


        const noteBases = [
            "rotate(0deg) translateY(-225%) rotate(0deg)",
            "rotate(120deg) translateY(-225%) rotate(-120deg)",
            "rotate(240deg) translateY(-225%) rotate(-240deg)"
        ];


        notes.forEach(
            (
                note,
                index
            ) => {

                const base =
                    noteBases[index] ||
                    noteBases[0];


                animate(
                    note,
                    [
                        {
                            transform:
                                `${base} scale(.82)`,
                            opacity: .68
                        },
                        {
                            transform:
                                `${base} scale(1.18)`,
                            opacity: 1
                        },
                        {
                            transform:
                                `${base} scale(.82)`,
                            opacity: .68
                        }
                    ],
                    {
                        duration: 1200,
                        delay:
                            index * 240,
                        iterations: Infinity,
                        easing: "ease-in-out"
                    }
                );

            }
        );


        beats.forEach(
            (
                beat,
                index
            ) => {

                animate(
                    beat,
                    [
                        {
                            transform:
                                "scale(.55)",
                            opacity: .35
                        },
                        {
                            transform:
                                "scale(1.45)",
                            opacity: 1
                        },
                        {
                            transform:
                                "scale(.55)",
                            opacity: .35
                        }
                    ],
                    {
                        duration: 1080,
                        delay:
                            index * 135,
                        iterations: Infinity,
                        easing:
                            "cubic-bezier(.4,0,.2,1)"
                    }
                );

            }
        );

    }


    function startEffects(
        wrap,
        key
    ) {

        const art =
            installMarkup(
                wrap,
                key
            );


        if (!art) {
            return;
        }


        if (
            art.dataset.vinciFxRunning ===
            "1"
        ) {
            return;
        }


        art.dataset.vinciFxRunning =
            "1";


        if (
            key ===
            "vector_nova"
        ) {

            startVector(
                art
            );

        } else if (
            key ===
            "event_horizon"
        ) {

            startHorizon(
                art
            );

        } else {

            startMusic(
                art
            );

        }

    }


    function scan() {

        document
            .querySelectorAll(
                ".vinci-frame-wrap"
            )
            .forEach(
                wrap => {

                    const key =
                        frameKey(
                            wrap
                        );


                    if (
                        !key ||
                        !ACTIVE.has(
                            key
                        )
                    ) {
                        return;
                    }


                    startEffects(
                        wrap,
                        key
                    );

                }
            );

    }


    function boot() {

        scan();


        if (!observer) {

            observer =
                new MutationObserver(
                    () => {
                        scan();
                    }
                );


            observer.observe(
                document.body,
                {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: [
                        "class"
                    ]
                }
            );

        }


        window.addEventListener(
            "vinci-cosmetics-changed",
            scan
        );


        window.addEventListener(
            "pageshow",
            scan
        );

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            boot,
            {
                once: true
            }
        );

    } else {

        boot();

    }

})();
