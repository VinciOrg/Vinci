// =====================================
// VINCI — CREATE POST
// =====================================


let currentUser = null;
let selectedFile = null;


// =====================================
// ELEMENTOS
// =====================================

const imageInput =
    document.getElementById(
        "imageInput"
    );


const imagePreview =
    document.getElementById(
        "imagePreview"
    );


const selectSection =
    document.getElementById(
        "selectSection"
    );


const editorSection =
    document.getElementById(
        "editorSection"
    );


const caption =
    document.getElementById(
        "caption"
    );


const captionCounter =
    document.getElementById(
        "captionCounter"
    );


const postMessage =
    document.getElementById(
        "postMessage"
    );


const publishPost =
    document.getElementById(
        "publishPost"
    );


const changeImage =
    document.getElementById(
        "changeImage"
    );


const cancelPost =
    document.getElementById(
        "cancelPost"
    );


// =====================================
// VERIFICAR USUÁRIO
// =====================================

async function loadUser() {

    const {
        data,
        error
    } = await db.auth.getUser();
    
console.log("USER:", data.user);
console.log("AUTH ERROR:", error);

    if (
        error ||
        !data.user
    ) {

        window.location.href =
            "login.html";

        return;

    }


    currentUser =
        data.user;

}


// =====================================
// SELECIONAR FOTO
// =====================================

imageInput.addEventListener(
    "change",
    function () {

        const file =
            this.files[0];


        if (!file) {

            return;

        }


        // =================================
        // VALIDAR TIPO
        // =================================

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];


        if (
            !allowedTypes.includes(
                file.type
            )
        ) {

            postMessage.textContent =
                "Escolha uma imagem JPG, PNG ou WEBP.";

            return;

        }


        // =================================
        // LIMITE DE TAMANHO
        // =================================

        if (
            file.size >
            15 * 1024 * 1024
        ) {

            postMessage.textContent =
                "A imagem precisa ter no máximo 15 MB.";

            return;

        }


        selectedFile =
            file;


        // =================================
        // PREVIEW
        // =================================

        const objectURL =
            URL.createObjectURL(
                file
            );


        imagePreview.src =
            objectURL;


        selectSection
            .classList
            .add("hidden");


        editorSection
            .classList
            .remove("hidden");


        postMessage.textContent =
            "";

    }
);


// =====================================
// TROCAR FOTO
// =====================================

changeImage.addEventListener(
    "click",
    function () {

        imageInput.value =
            "";

        selectedFile =
            null;


        editorSection
            .classList
            .add("hidden");


        selectSection
            .classList
            .remove("hidden");


        imagePreview.src =
            "";

    }
);


// =====================================
// CONTADOR DA LEGENDA
// =====================================

caption.addEventListener(
    "input",
    function () {

        captionCounter.textContent =
            `${this.value.length} / 500`;

    }
);


// =====================================
// COMPRESSÃO
// =====================================

function compressImage(
    file
) {

    return new Promise(
        function (
            resolve,
            reject
        ) {

            const img =
                new Image();


            const reader =
                new FileReader();


            reader.onload =
                function (event) {

                    img.src =
                        event.target.result;

                };


            reader.onerror =
                function () {

                    reject(
                        new Error(
                            "Não foi possível ler a imagem."
                        )
                    );

                };


            img.onload =
                function () {

                    const maxSize =
                        2048;


                    let width =
                        img.width;


                    let height =
                        img.height;


                    // =================================
                    // REDIMENSIONAR
                    // =================================

                    if (
                        width >
                            maxSize ||
                        height >
                            maxSize
                    ) {

                        if (
                            width >
                            height
                        ) {

                            height =
                                Math.round(
                                    height *
                                    maxSize /
                                    width
                                );

                            width =
                                maxSize;

                        }

                        else {

                            width =
                                Math.round(
                                    width *
                                    maxSize /
                                    height
                                );

                            height =
                                maxSize;

                        }

                    }


                    const canvas =
                        document.createElement(
                            "canvas"
                        );


                    canvas.width =
                        width;


                    canvas.height =
                        height;


                    const ctx =
                        canvas.getContext(
                            "2d"
                        );


                    ctx.drawImage(
                        img,
                        0,
                        0,
                        width,
                        height
                    );


                    canvas.toBlob(
                        function (
                            blob
                        ) {

                            if (!blob) {

                                reject(
                                    new Error(
                                        "Falha ao comprimir imagem."
                                    )
                                );

                                return;

                            }


                            resolve(
                                new File(
                                    [
                                        blob
                                    ],
                                    "vinci-image.jpg",
                                    {
                                        type:
                                            "image/jpeg"
                                    }
                                )
                            );

                        },
                        "image/jpeg",
                        0.88
                    );

                };


            img.onerror =
                function () {

                    reject(
                        new Error(
                            "Imagem inválida."
                        )
                    );

                };


            reader.readAsDataURL(
                file
            );

        }
    );

}


// =====================================
// PUBLICAR
// =====================================

publishPost.addEventListener(
    "click",
    async function () {


        if (!selectedFile) {

            postMessage.textContent =
                "Escolha uma fotografia.";

            return;

        }


        publishPost.disabled =
            true;


        changeImage.disabled =
            true;


        postMessage.textContent =
            "Preparando fotografia...";


        try {


            // =================================
            // COMPRIMIR
            // =================================

            const compressedImage =
                await compressImage(
                    selectedFile
                );


            postMessage.textContent =
                "Enviando fotografia...";


            // =================================
            // NOME DO ARQUIVO
            // =================================

            const fileName =
                `${crypto.randomUUID()}.jpg`;


            const filePath =
                `${currentUser.id}/${fileName}`;


            // =================================
            // UPLOAD
            // =================================

            const {
                error: uploadError
            } = await db.storage
                .from("vinci-images")
                .upload(
                    filePath,
                    compressedImage,
                    {
                        contentType:
                            "image/jpeg",

                        cacheControl:
                            "31536000",

                        upsert:
                            false
                    }
                );


            if (uploadError) {

                throw uploadError;

            }


            postMessage.textContent =
                "Criando publicação...";


            // =================================
            // URL PÚBLICA
            // =================================

            const {
                data: publicURL
            } = db.storage
                .from("vinci-images")
                .getPublicUrl(
                    filePath
                );


            const imageURL =
                publicURL.publicUrl;


            // =================================
            // CRIAR POST
            // =================================

            const {
                error: postError
            } = await db
                .from("posts")
                .insert({

                    user_id:
                        currentUser.id,

                    image_url:
                        imageURL,

                    caption:
                        caption.value.trim()

                });


            if (postError) {

                // =================================
                // SE O BANCO FALHAR,
                // REMOVE A FOTO DO STORAGE
                // =================================

                await db.storage
                    .from("vinci-images")
                    .remove([
                        filePath
                    ]);


                throw postError;

            }


            // =================================
            // SUCESSO
            // =================================

            postMessage.textContent =
                "Publicado com sucesso! 📸";


            setTimeout(
                function () {

                    window.location.href =
                        "index.html";

                },
                900
            );


        }

        catch (error) {

            console.error(
                "Erro ao publicar:",
                error
            );


            postMessage.textContent =
                "Não foi possível publicar a fotografia.";


            publishPost.disabled =
                false;


            changeImage.disabled =
                false;

        }

    }
);


// =====================================
// CANCELAR
// =====================================

cancelPost.addEventListener(
    "click",
    function () {

        window.location.href =
            "index.html";

    }
);


// =====================================
// INICIAR
// =====================================

loadUser();
