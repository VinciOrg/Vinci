// =====================================
// VINCI — FEED
// =====================================


const feed =
    document.getElementById(
        "feed"
    );


const feedLoading =
    document.getElementById(
        "feedLoading"
    );


const feedEmpty =
    document.getElementById(
        "feedEmpty"
    );


const feedError =
    document.getElementById(
        "feedError"
    );


// =====================================
// FORMATAR DATA
// =====================================

function formatDate(
    date
) {

    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    ).format(
        new Date(date)
    );

}


// =====================================
// CRIAR POST
// =====================================

function createPostElement(
    post
) {


    const article =
        document.createElement(
            "article"
        );


    article.className =
        "vinci-post";


    // =================================
    // CABEÇALHO
    // =================================

    const header =
        document.createElement(
            "div"
        );


    header.className =
        "post-user";


    // AVATAR

    const avatar =
        document.createElement(
            "img"
        );


    avatar.className =
        "post-avatar";


    avatar.src =
        post.profiles?.avatar_url ||
        "assets/default-avatar.png";


    avatar.alt =
        "";


    // INFORMAÇÕES

    const userInfo =
        document.createElement(
            "div"
        );


    userInfo.className =
        "post-user-info";


    const username =
        document.createElement(
            "strong"
        );


    username.textContent =
        "@" +
        (
            post.profiles?.username ||
            "usuário"
        );


    const name =
        document.createElement(
            "span"
        );


    name.textContent =
        post.profiles?.name ||
        "";


    userInfo.appendChild(
        username
    );


    if (
        post.profiles?.name
    ) {

        userInfo.appendChild(
            name
        );

    }


    header.appendChild(
        avatar
    );


    header.appendChild(
        userInfo
    );


    // =================================
    // FOTO
    // =================================

    const image =
        document.createElement(
            "img"
        );


    image.className =
        "post-image";


    image.src =
        post.image_url;


    image.alt =
        post.caption ||
        "Fotografia publicada no Vinci";


    image.loading =
        "lazy";


    // =================================
    // INFORMAÇÕES
    // =================================

    const content =
        document.createElement(
            "div"
        );


    content.className =
        "post-content";


    if (
        post.caption
    ) {

        const caption =
            document.createElement(
                "p"
            );


        caption.className =
            "post-caption";


        caption.textContent =
            post.caption;


        content.appendChild(
            caption
        );

    }


    const date =
        document.createElement(
            "time"
        );


    date.className =
        "post-date";


    date.textContent =
        formatDate(
            post.created_at
        );


    content.appendChild(
        date
    );


    // =================================
    // MONTAR
    // =================================

    article.appendChild(
        header
    );


    article.appendChild(
        image
    );


    article.appendChild(
        content
    );


    return article;

}


// =====================================
// CARREGAR POSTS
// =====================================

async function loadFeed() {


    feedLoading
        .classList
        .remove(
            "hidden"
        );


    feedEmpty
        .classList
        .add(
            "hidden"
        );


    feedError
        .classList
        .add(
            "hidden"
        );


    try {


        const {
            data,
            error
        } = await db
            .from("posts")
            .select(`
                id,
                user_id,
                image_url,
                caption,
                created_at,
                profiles (
                    username,
                    name,
                    avatar_url
                )
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {

            throw error;

        }


        feed.innerHTML =
            "";


        feedLoading
            .classList
            .add(
                "hidden"
            );


        // =================================
        // NENHUM POST
        // =================================

        if (
            !data ||
            data.length === 0
        ) {

            feedEmpty
                .classList
                .remove(
                    "hidden"
                );

            return;

        }


        // =================================
        // POSTS
        // =================================

        data.forEach(
            function (post) {

                const element =
                    createPostElement(
                        post
                    );


                feed.appendChild(
                    element
                );

            }
        );


    }

    catch (error) {

        console.error(
            "Erro ao carregar feed:",
            error
        );


        feedLoading
            .classList
            .add(
                "hidden"
            );


        feedError
            .classList
            .remove(
                "hidden"
            );

    }

}


// =====================================
// INICIAR
// =====================================

loadFeed();
