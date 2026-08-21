(function () {
    "use strict";

    const PRESETS = {
        avatar: {
            kind: "avatar",
            aspect: 1,
            outputWidth: 640,
            outputHeight: 640,
            title: "Enquadrar foto de perfil",
            help: "Arraste a foto dentro do quadrado. O arquivo será salvo em formato 1:1.",
            formatLabel: "FOTO DE PERFIL · 1:1",
            fileName: "avatar.webp"
        },

        banner: {
            kind: "banner",
            aspect: 3.5,
            outputWidth: 1750,
            outputHeight: 500,
            title: "Enquadrar banner",
            help: "Arraste a imagem dentro do banner. O arquivo será salvo no formato horizontal do perfil.",
            formatLabel: "BANNER · 3.5:1",
            fileName: "banner.webp"
        },

        lumeCover: {
            kind: "lume-cover",
            aspect: 2,
            outputWidth: 1600,
            outputHeight: 800,
            title: "Enquadrar capa do Lume",
            help: "Arraste e aproxime a foto. O enquadramento mostrado aqui será o mesmo usado na capa do Lume.",
            formatLabel: "CAPA DO LUME · 2:1",
            fileName: "lume-cover.webp"
        }
    };

    function loadImage(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const image = new Image();

            image.onload = () => {
                URL.revokeObjectURL(url);
                resolve(image);
            };

            image.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error("Não foi possível abrir esta imagem."));
            };

            image.src = url;
        });
    }

    function canvasBlob(canvas, type = "image/webp", quality = .9) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                blob => blob
                    ? resolve(blob)
                    : reject(new Error("Não foi possível preparar a imagem.")),
                type,
                quality
            );
        });
    }

    function getPreset(kind) {

        if (
            kind === "lume-cover" ||
            kind === "lumeCover"
        ) {
            return PRESETS.lumeCover;
        }

        if (kind === "banner") {
            return PRESETS.banner;
        }

        return PRESETS.avatar;
    }

    async function open(file, options = {}) {
        const preset = getPreset(options.kind);

        // Avatar e banner usam presets fixos e separados.
        const kind = preset.kind;
        const aspect = preset.aspect;
        const outputWidth = preset.outputWidth;
        const outputHeight = preset.outputHeight;
        const title = options.title || preset.title;
        const help = options.help || preset.help;

        const image = await loadImage(file);

        return new Promise((resolve, reject) => {
            const overlay = document.createElement("div");
            overlay.className = `vinci-cropper vinci-cropper-${kind}`;
            overlay.dataset.cropKind = kind;

            overlay.innerHTML = `
                <section class="vinci-cropper-card" role="dialog" aria-modal="true">
                    <header class="vinci-cropper-head">
                        <div>
                            <span>Vinci 1.1 Focus</span>
                            <h2>${title}</h2>
                        </div>
                        <button type="button" class="vinci-cropper-close" aria-label="Cancelar">×</button>
                    </header>

                    <div class="vinci-cropper-body">
                        <div class="vinci-cropper-stage vinci-cropper-stage--${kind}" data-crop-kind="${kind}">
                            <canvas></canvas>
                            <div class="vinci-cropper-mask"></div>
                        </div>

                        <p class="vinci-cropper-format">
                            ${preset.formatLabel}
                        </p>

                        <p class="vinci-cropper-help">${help}</p>

                        <label class="vinci-cropper-control">
                            <span>−</span>
                            <input type="range" min="1" max="3" step="0.01" value="1" aria-label="Zoom">
                            <span>+</span>
                        </label>

                        <div class="vinci-cropper-actions">
                            <button type="button" class="center">Centralizar</button>
                            <div>
                                <button type="button" class="cancel">Cancelar</button>
                                <button type="button" class="apply">Aplicar</button>
                            </div>
                        </div>
                    </div>
                </section>
            `;

            document.body.appendChild(overlay);

            const previousOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";

            const stage = overlay.querySelector(".vinci-cropper-stage");
            const canvas = overlay.querySelector("canvas");
            const ctx = canvas.getContext("2d");
            const zoomInput = overlay.querySelector('input[type="range"]');

            let baseScale = 1;
            let zoom = 1;
            let offsetX = 0;
            let offsetY = 0;
            let dragging = false;
            let lastX = 0;
            let lastY = 0;
            let closed = false;

            function currentScale() {
                return baseScale * zoom;
            }

            function clamp() {
                const scale = currentScale();
                const drawW = image.naturalWidth * scale;
                const drawH = image.naturalHeight * scale;
                const maxX = Math.max(0, (drawW - canvas.width) / 2);
                const maxY = Math.max(0, (drawH - canvas.height) / 2);

                offsetX = Math.max(-maxX, Math.min(maxX, offsetX));
                offsetY = Math.max(-maxY, Math.min(maxY, offsetY));
            }

            function draw() {
                if (!canvas.width || !canvas.height) return;

                const scale = currentScale();
                const drawW = image.naturalWidth * scale;
                const drawH = image.naturalHeight * scale;
                const x = (canvas.width - drawW) / 2 + offsetX;
                const y = (canvas.height - drawH) / 2 + offsetY;

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(image, x, y, drawW, drawH);
            }

            function sizeCanvas() {

                /*
                   FIX DEFINITIVO DO AVATAR.

                   O projeto possui .avatar global com:
                   width: 80px;
                   height: 80px;

                   O cropper não usa mais essa classe.
                   Ainda assim, largura e altura são travadas
                   inline com !important para impedir qualquer
                   CSS antigo/cacheado de achatar o recorte.
                */

                const body =
                    overlay.querySelector(
                        ".vinci-cropper-body"
                    );


                const availableWidth =
                    Math.max(
                        180,
                        body.clientWidth
                    );


                const cssWidth =
                    kind === "avatar"
                        ? Math.min(
                            availableWidth,
                            window.innerWidth <= 520
                                ? 390
                                : 430
                        )
                        : availableWidth;


                const cssHeight =
                    cssWidth /
                    aspect;


                stage.style.setProperty(
                    "width",
                    `${cssWidth}px`,
                    "important"
                );


                stage.style.setProperty(
                    "height",
                    `${cssHeight}px`,
                    "important"
                );


                stage.style.setProperty(
                    "min-height",
                    `${cssHeight}px`,
                    "important"
                );


                stage.style.setProperty(
                    "max-height",
                    `${cssHeight}px`,
                    "important"
                );


                stage.style.setProperty(
                    "aspect-ratio",
                    `${aspect} / 1`,
                    "important"
                );


                if (
                    kind === "avatar"
                ) {

                    stage.style.setProperty(
                        "margin-left",
                        "auto",
                        "important"
                    );


                    stage.style.setProperty(
                        "margin-right",
                        "auto",
                        "important"
                    );

                }


                const dpr =
                    Math.min(
                        window.devicePixelRatio ||
                            1,
                        2
                    );


                canvas.width =
                    Math.max(
                        1,
                        Math.round(
                            cssWidth *
                            dpr
                        )
                    );


                canvas.height =
                    Math.max(
                        1,
                        Math.round(
                            cssHeight *
                            dpr
                        )
                    );


                canvas.style.setProperty(
                    "width",
                    `${cssWidth}px`,
                    "important"
                );


                canvas.style.setProperty(
                    "height",
                    `${cssHeight}px`,
                    "important"
                );


                baseScale =
                    Math.max(
                        canvas.width /
                            image.naturalWidth,
                        canvas.height /
                            image.naturalHeight
                    );


                clamp();

                draw();

            }

            function reset() {
                zoom = 1;
                offsetX = 0;
                offsetY = 0;
                zoomInput.value = "1";
                clamp();
                draw();
            }

            function finish(value) {
                if (closed) return;
                closed = true;

                document.body.style.overflow = previousOverflow;
                overlay.remove();
                window.removeEventListener("resize", sizeCanvas);

                resolve(value);
            }

            zoomInput.addEventListener("input", () => {
                zoom = Number(zoomInput.value) || 1;
                clamp();
                draw();
            });

            stage.addEventListener("wheel", event => {
                event.preventDefault();

                zoom = Math.max(
                    1,
                    Math.min(3, zoom + (event.deltaY < 0 ? .08 : -.08))
                );

                zoomInput.value = String(zoom);

                clamp();
                draw();
            }, { passive: false });

            stage.addEventListener("pointerdown", event => {
                dragging = true;
                lastX = event.clientX;
                lastY = event.clientY;

                stage.classList.add("dragging");
                stage.setPointerCapture?.(event.pointerId);
            });

            stage.addEventListener("pointermove", event => {
                if (!dragging) return;

                const rect = stage.getBoundingClientRect();

                offsetX += (event.clientX - lastX) * (canvas.width / rect.width);
                offsetY += (event.clientY - lastY) * (canvas.height / rect.height);

                lastX = event.clientX;
                lastY = event.clientY;

                clamp();
                draw();
            });

            function endDrag() {
                dragging = false;
                stage.classList.remove("dragging");
            }

            stage.addEventListener("pointerup", endDrag);
            stage.addEventListener("pointercancel", endDrag);

            overlay.querySelector(".center").onclick = reset;
            overlay.querySelector(".cancel").onclick = () => finish(null);
            overlay.querySelector(".vinci-cropper-close").onclick = () => finish(null);

            overlay.onclick = event => {
                if (event.target === overlay) finish(null);
            };

            overlay.querySelector(".apply").onclick = async function () {
                this.disabled = true;
                this.textContent = "Preparando...";

                try {
                    const output = document.createElement("canvas");
                    output.width = outputWidth;
                    output.height = outputHeight;

                    const octx = output.getContext("2d");
                    const scale = currentScale();
                    const drawW = image.naturalWidth * scale;
                    const drawH = image.naturalHeight * scale;
                    const x = (canvas.width - drawW) / 2 + offsetX;
                    const y = (canvas.height - drawH) / 2 + offsetY;

                    // Mesmo aspect no canvas e na saída: sem deformação.
                    const ratio = outputWidth / canvas.width;

                    octx.drawImage(
                        image,
                        x * ratio,
                        y * ratio,
                        drawW * ratio,
                        drawH * ratio
                    );

                    const blob = await canvasBlob(output, "image/webp", .9);

                    finish(
                        new File(
                            [blob],
                            preset.fileName,
                            {
                                type: "image/webp",
                                lastModified: Date.now()
                            }
                        )
                    );
                }
                catch (error) {
                    this.disabled = false;
                    this.textContent = "Aplicar";
                    reject(error);
                }
            };

            window.addEventListener("resize", sizeCanvas);
            requestAnimationFrame(sizeCanvas);
        });
    }

    function openAvatar(file) {
        return open(file, { kind: "avatar" });
    }

    function openBanner(file) {
        return open(file, { kind: "banner" });
    }

    function openLumeCover(file) {
        return open(file, { kind: "lume-cover" });
    }

    window.VinciImageCropper = {
        open,
        openAvatar,
        openBanner,
        openLumeCover,
        presets: PRESETS
    };

})();
