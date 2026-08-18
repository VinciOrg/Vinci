// =====================================
// VINCI 0.7 — UTILITÁRIOS DE FOTO EM RESPOSTAS
// =====================================
(function () {
    "use strict";

    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    const MAX_BYTES = 12 * 1024 * 1024;

    function validate(file) {
        if (!file) return { ok: false, message: "Escolha uma fotografia." };
        if (!ALLOWED.includes(file.type)) {
            return { ok: false, message: "Use uma imagem JPG, PNG ou WEBP." };
        }
        if (file.size > MAX_BYTES) {
            return { ok: false, message: "A fotografia precisa ter no máximo 12 MB." };
        }
        return { ok: true };
    }

    function compress(file) {
        return new Promise(function (resolve, reject) {
            const reader = new FileReader();
            reader.onload = function () {
                const img = new Image();
                img.onload = function () {
                    let width = img.width;
                    let height = img.height;
                    const max = 1600;
                    if (width > max || height > max) {
                        if (width >= height) {
                            height = Math.round(height * (max / width));
                            width = max;
                        } else {
                            width = Math.round(width * (max / height));
                            height = max;
                        }
                    }
                    const canvas = document.createElement("canvas");
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob(function (blob) {
                        if (!blob) {
                            reject(new Error("Não foi possível preparar a fotografia."));
                            return;
                        }
                        resolve(new File([blob], "vinci-reply.jpg", { type: "image/jpeg" }));
                    }, "image/jpeg", 0.86);
                };
                img.onerror = function () { reject(new Error("Imagem inválida.")); };
                img.src = reader.result;
            };
            reader.onerror = function () { reject(new Error("Não foi possível ler a imagem.")); };
            reader.readAsDataURL(file);
        });
    }

    async function upload(file, userId) {
        const check = validate(file);
        if (!check.ok) throw new Error(check.message);
        const compressed = await compress(file);
        const path = `${userId}/replies/${crypto.randomUUID()}.jpg`;
        const { error } = await db.storage
            .from("vinci-images")
            .upload(path, compressed, {
                contentType: "image/jpeg",
                cacheControl: "31536000",
                upsert: false
            });
        if (error) throw error;
        const { data } = db.storage.from("vinci-images").getPublicUrl(path);
        return { url: data.publicUrl, path };
    }

    async function removePath(path) {
        if (!path) return;
        try {
            await db.storage.from("vinci-images").remove([path]);
        } catch (error) {
            console.warn("Vinci Reply Photos: não foi possível remover o arquivo:", error);
        }
    }

    function pathFromPublicUrl(url) {
        if (!url) return null;
        const marker = "/storage/v1/object/public/vinci-images/";
        const index = String(url).indexOf(marker);
        if (index === -1) return null;
        return decodeURIComponent(String(url).slice(index + marker.length).split("?")[0]);
    }

    window.VinciReplyPhotos = {
        validate,
        upload,
        removePath,
        removeUrl: function (url) {
            return removePath(pathFromPublicUrl(url));
        }
    };
})();
