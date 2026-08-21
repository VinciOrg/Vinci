(function(){

"use strict";

const $=s=>document.querySelector(s);

const esc=v=>String(v??"").replace(
    /[&<>"']/g,
    c=>({
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;",
        "'":"&#39;"
    })[c]
);

const lumeId=
    new URLSearchParams(
        location.search
    ).get("id");

const media=url=>
    window.VinciMedia?.resolveUrl
        ? window.VinciMedia.resolveUrl(url)
        : Promise.resolve(url);

let user=null;
let lume=null;
let me=null;
let members=[];
let photos=[];
let profiles=new Map();
let photoFile=null;
let activePhoto=null;
let channel=null;
let reloadTimer=null;

let shareMode="link";

let inviteGalleryFiles=[];
let inviteGallerySavedPaths=[];
let inviteGalleryObjectURLs=[];

let inviteCardBlob=null;
let inviteCardPreviewURL=null;
let inviteCardRenderToken=0;

let archiveMode="carousel";
let archiveSelectedPhotoIds=[];
let archiveBlobs=[];
let archivePreviewURLs=[];
let archivePreviewIndex=0;
let archiveGenerating=false;

let lastLumeTouchActionAt=0;

function roleLabel(role){
    if(role==="owner")return "Criador";
    if(role==="guest")return "Convidado";
    return "Participante";
}

function memberName(member){
    const profile=profiles.get(member?.user_id);

    if(profile?.username){
        return `@${profile.username}`;
    }

    return member?.display_name||"Convidado";
}

function formatDate(value){
    if(!value)return "SEM DATA";

    return new Date(
        `${value}T12:00:00`
    ).toLocaleDateString(
        "pt-BR",
        {
            day:"2-digit",
            month:"long",
            year:"numeric"
        }
    );
}

function formatTime(value){
    return new Date(value)
        .toLocaleString(
            "pt-BR",
            {
                day:"2-digit",
                month:"short",
                hour:"2-digit",
                minute:"2-digit"
            }
        )
        .replace(".","");
}

async function loadProfiles(){
    const ids=[
        ...new Set(
            members
                .map(m=>m.user_id)
                .filter(Boolean)
        )
    ];

    profiles=new Map();

    if(!ids.length)return;

    const {data}=await db
        .from("profiles")
        .select("id,username,name,avatar_url")
        .in("id",ids);

    profiles=new Map(
        (data||[]).map(p=>[p.id,p])
    );
}

async function loadState(){
    const [
        lumeResult,
        memberResult,
        photoResult
    ]=await Promise.all([
        db
            .from("vinci_lumes")
            .select("*")
            .eq("id",lumeId)
            .single(),

        db
            .from("vinci_lume_members")
            .select("*")
            .eq("lume_id",lumeId)
            .order("joined_at"),

        db
            .from("vinci_lume_photos")
            .select("*")
            .eq("lume_id",lumeId)
            .order(
                "created_at",
                {ascending:false}
            )
    ]);

    if(lumeResult.error||!lumeResult.data){
        document.body.innerHTML=`
            <main style="padding:50px 20px;text-align:center">
                <h1>Lume indisponível</h1>
                <p>
                    Você não participa deste Lume ou o PATCH 16 ainda não foi instalado.
                </p>
                <a href="lumes.html">Voltar</a>
            </main>
        `;
        return false;
    }

    lume=lumeResult.data;
    members=memberResult.data||[];
    photos=photoResult.data||[];

    me=members.find(
        m=>m.user_id===user.id
    )||null;

    if(!me){
        document.body.innerHTML=`
            <main style="padding:50px 20px;text-align:center">
                <h1>Convite necessário</h1>
                <p>Entre neste Lume pelo link ou QR de convite.</p>
                <a href="lumes.html">Voltar</a>
            </main>
        `;
        return false;
    }

    await loadProfiles();

    return true;
}

async function renderHero(){
    document.documentElement.style.setProperty(
        "--lume-accent",
        lume.accent_color||"#f4a261"
    );

    $("#lumeName").textContent=lume.name;

    $("#lumeDescription").textContent=
        lume.description||
        "Um momento guardado por todos que estavam lá.";

    $("#lumeDate").textContent=
        formatDate(lume.event_date);

    $("#lumePeopleCount").textContent=
        members.length;

    $("#lumePhotoCount").textContent=
        photos.length;

    const status=$("#lumeStatus");

    status.textContent=
        lume.status==="closed"
            ? "ARQUIVADO"
            : "ABERTO";

    status.classList.toggle(
        "closed",
        lume.status==="closed"
    );

    $("#openLumeUpload").classList.toggle(
        "hidden",
        lume.status!=="open"
    );

    const owner=me.role==="owner";

    $("#manageLume").classList.toggle(
        "hidden",
        !owner
    );

    $("#archiveLume").classList.toggle(
        "hidden",
        !(
            owner &&
            lume.status==="closed"
        )
    );

    if(owner){
        const closed=lume.status==="closed";

        $("#lumeManageTitle").textContent=
            closed
                ? "Reabrir este Lume?"
                : "Encerrar este Lume?";

        $("#lumeManageText").textContent=
            closed
                ? "As pessoas poderão voltar a adicionar novas fotos."
                : "As fotos continuam guardadas, mas ninguém poderá adicionar novas.";

        const button=$("#toggleLumeStatus");

        button.textContent=
            closed
                ? "Reabrir Lume"
                : "Encerrar e arquivar";

        button.classList.toggle(
            "lume-danger",
            !closed
        );

        button.classList.toggle(
            "lume-primary",
            closed
        );
    }

    const cover=$("#lumeCover");

    if(lume.cover_url){
        const url=await media(lume.cover_url);

        cover.innerHTML=
            url
                ? `<img src="${esc(url)}" alt="">`
                : "";
    }else{
        const letter=(lume.name||"L")
            .trim()
            .charAt(0)
            .toUpperCase();

        cover.innerHTML=
            `<div class="lume-cover-letter">${esc(letter)}</div>`;
    }

    if(me.role==="guest"){
        document.body.classList.add("lume-guest-session");
        $("#guestExit").classList.remove("hidden");
    }else{
        document.body.classList.remove("lume-guest-session");
        $("#guestExit").classList.add("hidden");
    }
}

function renderPeople(){
    $("#lumePeopleList").innerHTML=
        members.map(member=>`
            <article class="lume-person">
                <div>
                    <strong>${esc(memberName(member))}</strong>
                    <small>
                        entrou ${esc(formatTime(member.joined_at))}
                    </small>
                </div>

                <span>${esc(roleLabel(member.role))}</span>
            </article>
        `).join("");
}

async function renderMural(){
    const mural=$("#lumeMural");

    if(!photos.length){
        mural.innerHTML=`
            <div class="lume-empty">
                <strong>O mural ainda está vazio.</strong><br>
                A primeira foto pode ser sua.
            </div>
        `;
        return;
    }

    const resolved=await Promise.all(
        photos.map(async photo=>({
            photo,
            url:await media(photo.image_url)
        }))
    );

    mural.innerHTML=
        resolved
        .filter(item=>Boolean(item.url))
        .map(({photo,url})=>{
            const member=members.find(
                m=>m.user_id===photo.user_id
            );

            return `
                <button
                    class="lume-photo-card"
                    type="button"
                    data-photo-id="${esc(photo.id)}"
                >
                    <img
                        src="${esc(url)}"
                        alt=""
                        loading="lazy"
                    >

                    <span class="lume-photo-card-overlay">
                        <strong>${esc(memberName(member))}</strong>
                        ${
                            photo.caption
                                ? `<span>${esc(photo.caption)}</span>`
                                : ""
                        }
                    </span>
                </button>
            `;
        })
        .join("");

    mural
        .querySelectorAll("[data-photo-id]")
        .forEach(card=>{
            card.onclick=()=>{
                openPhoto(card.dataset.photoId);
            };
        });
}

async function renderAll(){
    await renderHero();
    renderPeople();
    await renderMural();
}

function openModal(id){
    $(id)?.classList.remove("hidden");
}

function closeModal(id){
    $(id)?.classList.add("hidden");
}

function inviteURL(){
    const url=new URL(
        "lume-invite.html",
        location.href
    );

    url.searchParams.set(
        "t",
        lume.invite_token
    );

    return url.href;
}

function setShareMode(mode){
    shareMode=
        mode==="card"
            ? "card"
            : "link";

    document
        .querySelectorAll(
            "[data-lume-share-mode]"
        )
        .forEach(button=>{
            button.classList.toggle(
                "active",
                button.dataset.lumeShareMode===
                    shareMode
            );
        });

    $("#lumeShareLinkPanel")
        .classList
        .toggle(
            "hidden",
            shareMode!=="link"
        );

    $("#lumeShareCardPanel")
        .classList
        .toggle(
            "hidden",
            shareMode!=="card"
        );

    if(shareMode==="card"){
        prepareInviteCardPanel();
    }
}

async function renderInvitePhotoPicker(){

    const picker=
        $("#lumeInvitePhotoPicker");

    const owner=
        me?.role==="owner";

    $("#lumeInviteEditor")
        .classList
        .toggle(
            "hidden",
            !owner
        );

    if(!owner){
        return;
    }

    $("#lumeInviteText").value=
        lume.invite_text||
        "";

    const count=
        inviteGalleryFiles.length
            ? inviteGalleryFiles.length
            : inviteGallerySavedPaths.length;

    $("#lumeInvitePhotoCount")
        .textContent=
        `${count}/3`;

    inviteGalleryObjectURLs
        .forEach(url=>
            URL.revokeObjectURL(url)
        );

    inviteGalleryObjectURLs=[];

    const items=[];

    if(inviteGalleryFiles.length){

        inviteGalleryFiles
            .slice(0,3)
            .forEach((file,index)=>{

                const url=
                    URL.createObjectURL(
                        file
                    );

                inviteGalleryObjectURLs.push(
                    url
                );

                items.push({
                    url,
                    label:
                        `Galeria ${index+1}`
                });
            });

    }else{

        for(
            let index=0;
            index<
                inviteGallerySavedPaths.length;
            index++
        ){

            const path=
                inviteGallerySavedPaths[
                    index
                ];

            const shape=
                `${SUPABASE_URL}/storage/v1/object/public/vinci-lumes/${path}`;

            try{
                const url=
                    await media(
                        shape
                    );

                if(url){
                    items.push({
                        url,
                        label:
                            `Salva ${index+1}`
                    });
                }
            }catch(error){
                console.warn(
                    "Imagem salva do convite:",
                    error
                );
            }
        }
    }

    if(!items.length){

        picker.innerHTML=`
            <div class="lume-invite-photo-empty">
                Escolha até 3 imagens da galeria.
                Elas podem ser fotos do casal, local, convite,
                decoração ou qualquer imagem que represente o momento.
            </div>
        `;

        return;
    }

    picker.innerHTML=
        items
        .map(
            (item,index)=>`
                <div class="lume-invite-gallery-item">

                    <img
                        src="${esc(item.url)}"
                        alt=""
                    >

                    <span>
                        ${index+1}
                    </span>

                </div>
            `
        )
        .join("");
}


function pickInviteGallery(){

    const input=
        $("#lumeInviteGalleryInput");

    if(!input){
        return;
    }

    input.value="";
    input.click();
}

async function handleInviteGalleryFiles(
    fileList
){

    const files=
        Array.from(
            fileList||
            []
        )
        .filter(
            file=>
                file.type
                ?.startsWith(
                    "image/"
                )
        )
        .slice(
            0,
            3
        );

    inviteGalleryFiles=
        files;

    /*
       Uma nova seleção da galeria substitui a composição
       anterior. O banco só é alterado ao tocar em Salvar.
    */
    if(files.length){
        inviteGallerySavedPaths=[];
    }

    const message=
        $("#lumeInviteDesignMessage");

    if(
        fileList?.length>3
    ){
        message.textContent=
            "Usei as 3 primeiras imagens selecionadas.";
    }else{
        message.textContent="";
    }

    await renderInvitePhotoPicker();
    await generateInviteCardPreview();
}

async function clearInviteGallery(){

    inviteGalleryFiles=[];
    inviteGallerySavedPaths=[];

    $("#lumeInviteGalleryInput").value="";

    $("#lumeInviteDesignMessage")
        .textContent=
        "Fotos removidas da composição. Toque em Salvar para confirmar.";

    await renderInvitePhotoPicker();
    await generateInviteCardPreview();
}


function scheduleInviteCardPreview(){
    clearTimeout(
        scheduleInviteCardPreview.timer
    );

    scheduleInviteCardPreview.timer=
        setTimeout(
            ()=>generateInviteCardPreview(),
            220
        );
}

function openShare(){

    $("#lumeInviteLink").value=
        inviteURL();

    inviteGalleryFiles=[];

    inviteGallerySavedPaths=
        Array.isArray(
            lume.invite_image_paths
        )
            ? lume.invite_image_paths
                .slice(0,3)
            : [];

    setShareMode(
        "link"
    );

    openModal(
        "#lumeShareModal"
    );
}

async function prepareInviteCardPanel(){
    await renderInvitePhotoPicker();
    await generateInviteCardPreview();
}


function slugifyFileName(value){
    return String(value||"lume")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g,"-")
        .replace(/^-+|-+$/g,"")
        .slice(0,56)||
        "lume";
}

function roundRectPath(
    ctx,
    x,
    y,
    w,
    h,
    r
){
    const radius=
        Math.max(
            0,
            Math.min(
                r,
                Math.min(w,h)/2
            )
        );

    ctx.beginPath();
    ctx.moveTo(x+radius,y);
    ctx.arcTo(x+w,y,x+w,y+h,radius);
    ctx.arcTo(x+w,y+h,x,y+h,radius);
    ctx.arcTo(x,y+h,x,y,radius);
    ctx.arcTo(x,y,x+w,y,radius);
    ctx.closePath();
}

function fillRoundRect(
    ctx,
    x,
    y,
    w,
    h,
    r,
    fill
){
    ctx.save();
    roundRectPath(ctx,x,y,w,h,r);
    ctx.fillStyle=fill;
    ctx.fill();
    ctx.restore();
}

function drawCoverImage(
    ctx,
    image,
    x,
    y,
    w,
    h,
    radius=28
){
    if(!image)return;

    const imageRatio=
        image.width/
        image.height;

    const boxRatio=
        w/h;

    let sx=0;
    let sy=0;
    let sw=image.width;
    let sh=image.height;

    if(imageRatio>boxRatio){
        sw=
            image.height*
            boxRatio;

        sx=
            (image.width-sw)/2;
    }else{
        sh=
            image.width/
            boxRatio;

        sy=
            (image.height-sh)/2;
    }

    ctx.save();
    roundRectPath(
        ctx,
        x,
        y,
        w,
        h,
        radius
    );
    ctx.clip();

    ctx.drawImage(
        image,
        sx,
        sy,
        sw,
        sh,
        x,
        y,
        w,
        h
    );

    ctx.restore();
}

function wrapCanvasText(
    ctx,
    text,
    maxWidth
){
    const words=
        String(text||"")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    const lines=[];
    let line="";

    for(const word of words){
        const test=
            line
                ? `${line} ${word}`
                : word;

        if(
            ctx.measureText(test).width>
                maxWidth &&
            line
        ){
            lines.push(line);
            line=word;
        }else{
            line=test;
        }
    }

    if(line){
        lines.push(line);
    }

    return lines;
}

function drawWrappedText(
    ctx,
    text,
    x,
    y,
    maxWidth,
    lineHeight,
    maxLines=3
){
    const lines=
        wrapCanvasText(
            ctx,
            text,
            maxWidth
        );

    const visible=
        lines.slice(
            0,
            maxLines
        );

    if(lines.length>maxLines){
        let last=
            visible[
                visible.length-1
            ]||
            "";

        while(
            last &&
            ctx.measureText(
                `${last}…`
            ).width>
                maxWidth
        ){
            last=
                last.slice(0,-1);
        }

        visible[
            visible.length-1
        ]=
            `${last}…`;
    }

    visible.forEach(
        (line,index)=>{
            ctx.fillText(
                line,
                x,
                y+
                index*
                lineHeight
            );
        }
    );

    return y+
        visible.length*
        lineHeight;
}

function loadCanvasImage(url){
    return new Promise(
        (resolve,reject)=>{
            const image=
                new Image();

            image.crossOrigin=
                "anonymous";

            image.onload=
                ()=>resolve(image);

            image.onerror=
                ()=>reject(
                    new Error(
                        "Não foi possível abrir uma imagem do convite."
                    )
                );

            image.src=url;
        }
    );
}

async function createQRCanvas(
    text,
    size=250
){
    if(
        typeof QRCode===
        "undefined"
    ){
        throw new Error(
            "Gerador de QR indisponível."
        );
    }

    const holder=
        document.createElement(
            "div"
        );

    holder.style.position=
        "fixed";

    holder.style.left=
        "-99999px";

    holder.style.top=
        "-99999px";

    document.body
        .appendChild(
            holder
        );

    new QRCode(
        holder,
        {
            text,
            width:size,
            height:size,
            colorDark:"#18130f",
            colorLight:"#ffffff",
            correctLevel:
                QRCode.CorrectLevel.M
        }
    );

    await new Promise(
        resolve=>
            setTimeout(
                resolve,
                30
            )
    );

    const canvas=
        holder.querySelector(
            "canvas"
        );

    if(canvas){
        const copy=
            document.createElement(
                "canvas"
            );

        copy.width=
            canvas.width;

        copy.height=
            canvas.height;

        copy
            .getContext("2d")
            .drawImage(
                canvas,
                0,
                0
            );

        holder.remove();

        return copy;
    }

    const image=
        holder.querySelector(
            "img"
        );

    if(image){
        await new Promise(
            resolve=>{
                if(image.complete){
                    resolve();
                    return;
                }

                image.onload=resolve;
            }
        );

        const copy=
            document.createElement(
                "canvas"
            );

        copy.width=size;
        copy.height=size;

        copy
            .getContext("2d")
            .drawImage(
                image,
                0,
                0,
                size,
                size
            );

        holder.remove();

        return copy;
    }

    holder.remove();

    throw new Error(
        "Não foi possível montar o QR Code."
    );
}

function inviteTextForRender(){
    if(me?.role==="owner"){
        return (
            $("#lumeInviteText")
            ?.value
            ?.trim()||
            ""
        );
    }

    return lume.invite_text||"";
}

async function inviteImagesForRender(){

    const images=[];

    if(
        me?.role==="owner" &&
        inviteGalleryFiles.length
    ){

        for(
            const file of
            inviteGalleryFiles.slice(0,3)
        ){
            const url=
                URL.createObjectURL(
                    file
                );

            try{
                images.push(
                    await loadCanvasImage(
                        url
                    )
                );
            }finally{
                URL.revokeObjectURL(
                    url
                );
            }
        }

        return images;
    }

    const paths=
        inviteGallerySavedPaths.length
            ? inviteGallerySavedPaths
            : (
                Array.isArray(
                    lume.invite_image_paths
                )
                    ? lume.invite_image_paths
                    : []
            );

    for(
        const path of
        paths.slice(0,3)
    ){
        try{
            const shape=
                `${SUPABASE_URL}/storage/v1/object/public/vinci-lumes/${path}`;

            const signed=
                await media(
                    shape
                );

            if(signed){
                images.push(
                    await loadCanvasImage(
                        signed
                    )
                );
            }
        }catch(error){
            console.warn(
                "Imagem do convite ignorada:",
                error
            );
        }
    }

    /*
       Se ainda não houver fotos escolhidas, usa a capa do Lume.
       Assim o convite já pode ser criado ANTES de qualquer post.
    */
    if(
        !images.length &&
        lume.cover_url
    ){
        try{
            const signed=
                await media(
                    lume.cover_url
                );

            if(signed){
                images.push(
                    await loadCanvasImage(
                        signed
                    )
                );
            }
        }catch{}
    }

    return images;
}

async function generateInviteCardBlob(){
    const canvas=
        document.createElement(
            "canvas"
        );

    canvas.width=1080;
    canvas.height=1350;

    const ctx=
        canvas.getContext(
            "2d"
        );

    const accent=
        lume.accent_color||
        "#f4a261";

    // Fundo quente, adulto e editorial.
    const background=
        ctx.createLinearGradient(
            0,
            0,
            1080,
            1350
        );

    background.addColorStop(
        0,
        "#fbf7f3"
    );

    background.addColorStop(
        .55,
        "#f7efe8"
    );

    background.addColorStop(
        1,
        "#f1e4da"
    );

    ctx.fillStyle=
        background;

    ctx.fillRect(
        0,
        0,
        1080,
        1350
    );

    // Mancha luminosa da cor do Lume.
    const glow=
        ctx.createRadialGradient(
            930,
            110,
            10,
            930,
            110,
            360
        );

    glow.addColorStop(
        0,
        `${accent}66`
    );

    glow.addColorStop(
        1,
        `${accent}00`
    );

    ctx.fillStyle=
        glow;

    ctx.fillRect(
        600,
        0,
        480,
        480
    );

    // Logo VINCI.
    let logo=null;

    try{
        logo=
            await loadCanvasImage(
                "assets/icon-vinci.png"
            );
    }catch{}

    if(logo){
        drawCoverImage(
            ctx,
            logo,
            74,
            68,
            72,
            72,
            18
        );
    }

    ctx.fillStyle=
        "#241c17";

    ctx.font=
        "900 28px Arial, sans-serif";

    ctx.fillText(
        "VINCI",
        164,
        98
    );

    ctx.fillStyle=
        accent;

    ctx.font=
        "800 18px Arial, sans-serif";

    ctx.fillText(
        "/ LUME",
        164,
        126
    );

    // Selo.
    fillRoundRect(
        ctx,
        74,
        176,
        224,
        42,
        21,
        "#ffffffcc"
    );

    ctx.fillStyle=
        accent;

    ctx.font=
        "900 15px Arial, sans-serif";

    ctx.letterSpacing=
        "1px";

    ctx.fillText(
        "VOCÊ FOI CONVIDADO",
        94,
        203
    );

    // Nome do Lume — serifado para dar aspecto editorial.
    ctx.fillStyle=
        "#211915";

    ctx.font=
        "700 69px Georgia, 'Times New Roman', serif";

    let afterTitle=
        drawWrappedText(
            ctx,
            lume.name,
            74,
            292,
            900,
            76,
            3
        );

    const customText=
        inviteTextForRender()||
        "Você fez parte desse momento. Entre no Lume e coloque sua perspectiva no mesmo mural.";

    ctx.fillStyle=
        "#6f625a";

    ctx.font=
        "400 27px Arial, sans-serif";

    const afterCopy=
        drawWrappedText(
            ctx,
            customText,
            76,
            afterTitle+16,
            880,
            38,
            3
        );

    // Data.
    const dateText=
        lume.event_date
            ? formatDate(
                lume.event_date
            )
            : "UM MOMENTO NO VINCI";

    ctx.fillStyle=
        accent;

    ctx.font=
        "800 18px Arial, sans-serif";

    ctx.fillText(
        String(dateText)
            .toUpperCase(),
        76,
        afterCopy+17
    );

    // Imagens escolhidas da galeria pelo criador.
    const photoImages=
        await inviteImagesForRender();

    let collageY=
        Math.max(
            520,
            afterCopy+55
        );

    const collageH=
        430;

    if(photoImages.length>=3){
        drawCoverImage(
            ctx,
            photoImages[0],
            74,
            collageY,
            580,
            collageH,
            32
        );

        drawCoverImage(
            ctx,
            photoImages[1],
            674,
            collageY,
            332,
            205,
            28
        );

        drawCoverImage(
            ctx,
            photoImages[2],
            674,
            collageY+225,
            332,
            205,
            28
        );

    }else if(photoImages.length===2){
        drawCoverImage(
            ctx,
            photoImages[0],
            74,
            collageY,
            456,
            collageH,
            32
        );

        drawCoverImage(
            ctx,
            photoImages[1],
            550,
            collageY,
            456,
            collageH,
            32
        );

    }else if(photoImages.length===1){
        drawCoverImage(
            ctx,
            photoImages[0],
            74,
            collageY,
            932,
            collageH,
            32
        );

    }else{
        const fallback=
            ctx.createLinearGradient(
                74,
                collageY,
                1006,
                collageY+collageH
            );

        fallback.addColorStop(
            0,
            `${accent}33`
        );

        fallback.addColorStop(
            1,
            "#ffffff"
        );

        fillRoundRect(
            ctx,
            74,
            collageY,
            932,
            collageH,
            32,
            fallback
        );

        ctx.fillStyle=
            accent;

        ctx.font=
            "700 52px Georgia, serif";

        ctx.fillText(
            "um momento",
            118,
            collageY+190
        );

        ctx.fillStyle=
            "#786a62";

        ctx.font=
            "400 24px Arial, sans-serif";

        ctx.fillText(
            "todas as perspectivas.",
            120,
            collageY+236
        );
    }

    // Cartão inferior com QR.
    const qrBoxY=
        1042;

    fillRoundRect(
        ctx,
        74,
        qrBoxY,
        932,
        238,
        32,
        "#fffdfbdd"
    );

    const qr=
        await createQRCanvas(
            inviteURL(),
            190
        );

    fillRoundRect(
        ctx,
        98,
        qrBoxY+24,
        190,
        190,
        22,
        "#ffffff"
    );

    ctx.drawImage(
        qr,
        110,
        qrBoxY+36,
        166,
        166
    );

    ctx.fillStyle=
        "#251d18";

    ctx.font=
        "900 28px Arial, sans-serif";

    ctx.fillText(
        "ENTRE NO LUME",
        332,
        qrBoxY+72
    );

    ctx.fillStyle=
        "#75685f";

    ctx.font=
        "400 22px Arial, sans-serif";

    drawWrappedText(
        ctx,
        "Aponte a câmera para o QR e coloque suas fotos no mesmo mural.",
        332,
        qrBoxY+112,
        600,
        31,
        3
    );

    ctx.fillStyle=
        accent;

    ctx.font=
        "800 16px Arial, sans-serif";

    ctx.fillText(
        "VINCI · UM MOMENTO, TODAS AS PERSPECTIVAS.",
        332,
        qrBoxY+198
    );

    return await new Promise(
        (resolve,reject)=>{
            canvas.toBlob(
                blob=>
                    blob
                        ? resolve(blob)
                        : reject(
                            new Error(
                                "Não foi possível gerar a imagem do convite."
                            )
                        ),
                "image/png"
            );
        }
    );
}

async function generateInviteCardPreview(){
    const token=
        ++inviteCardRenderToken;

    const loading=
        $("#lumeInviteCardLoading");

    const preview=
        $("#lumeInviteCardPreview");

    loading.classList.remove("hidden");
    loading.textContent=
        "Preparando convite...";

    preview.classList.add("hidden");

    try{
        const blob=
            await generateInviteCardBlob();

        if(token!==inviteCardRenderToken){
            return;
        }

        inviteCardBlob=
            blob;

        if(inviteCardPreviewURL){
            URL.revokeObjectURL(
                inviteCardPreviewURL
            );
        }

        inviteCardPreviewURL=
            URL.createObjectURL(
                blob
            );

        preview.src=
            inviteCardPreviewURL;

        preview.classList.remove("hidden");
        loading.classList.add("hidden");

    }catch(error){
        console.error(
            "Convite do Lume:",
            error
        );

        loading.textContent=
            error.message||
            "Não foi possível montar a prévia.";
    }
}

async function saveInviteDesign(){

    if(me?.role!=="owner"){
        return;
    }

    const button=
        $("#saveLumeInviteDesign");

    const message=
        $("#lumeInviteDesignMessage");

    const text=
        $("#lumeInviteText")
        .value
        .trim();

    button.disabled=true;

    message.textContent=
        "Salvando composição...";

    const oldPaths=
        Array.isArray(
            lume.invite_image_paths
        )
            ? lume.invite_image_paths
                .slice()
            : [];

    const uploadedPaths=[];

    try{

        let finalPaths=
            inviteGallerySavedPaths
            .slice(0,3);

        if(inviteGalleryFiles.length){

            finalPaths=[];

            for(
                const file of
                inviteGalleryFiles.slice(0,3)
            ){

                message.textContent=
                    "Enviando imagens do convite...";

                const blob=
                    await compressImage(
                        file,
                        1800,
                        .88
                    );

                const ext=
                    blob.type===
                    "image/webp"
                        ? "webp"
                        : "jpg";

                const path=
                    `${lumeId}/${user.id}/invite/invite-${crypto.randomUUID()}.${ext}`;

                const {
                    error:uploadError
                }=
                    await db.storage
                    .from(
                        "vinci-lumes"
                    )
                    .upload(
                        path,
                        blob,
                        {
                            upsert:false,
                            contentType:
                                blob.type||
                                file.type||
                                "image/jpeg"
                        }
                    );

                if(uploadError){
                    throw uploadError;
                }

                uploadedPaths.push(
                    path
                );

                finalPaths.push(
                    path
                );
            }
        }

        const {
            error
        }=
            await db.rpc(
                "vinci_update_lume_invite_card",
                {
                    p_lume_id:lumeId,
                    p_invite_text:
                        text||
                        null,
                    p_image_paths:
                        finalPaths
                        .slice(0,3)
                }
            );

        if(error){
            throw error;
        }

        lume.invite_text=
            text||
            null;

        lume.invite_image_paths=
            finalPaths.slice(
                0,
                3
            );

        inviteGallerySavedPaths=
            lume.invite_image_paths
            .slice();

        inviteGalleryFiles=[];

        /*
           Depois que o banco aponta para os novos assets,
           remove os antigos que deixaram de ser usados.
        */
        const obsolete=
            oldPaths.filter(
                path=>
                    !inviteGallerySavedPaths
                    .includes(path)
            );

        if(obsolete.length){
            await db.storage
                .from(
                    "vinci-lumes"
                )
                .remove(
                    obsolete
                );
        }

        message.textContent=
            "Composição salva ✓";

        await renderInvitePhotoPicker();
        await generateInviteCardPreview();

    }catch(error){

        console.error(
            "Salvar convite:",
            error
        );

        if(uploadedPaths.length){
            await db.storage
                .from(
                    "vinci-lumes"
                )
                .remove(
                    uploadedPaths
                );
        }

        message.textContent=
            error.message||
            "Não foi possível salvar o convite.";

    }finally{
        button.disabled=false;
    }
}

async function downloadInviteImage(){
    if(!inviteCardBlob){
        await generateInviteCardPreview();
    }

    if(!inviteCardBlob){
        return;
    }

    const a=
        document.createElement(
            "a"
        );

    const url=
        URL.createObjectURL(
            inviteCardBlob
        );

    a.href=url;
    a.download=
        `lume-${slugifyFileName(lume.name)}-convite.png`;

    document.body
        .appendChild(a);

    a.click();
    a.remove();

    setTimeout(
        ()=>URL.revokeObjectURL(url),
        1200
    );
}

async function shareInviteImage(){
    if(!inviteCardBlob){
        await generateInviteCardPreview();
    }

    if(!inviteCardBlob){
        return;
    }

    const file=
        new File(
            [inviteCardBlob],
            `lume-${slugifyFileName(lume.name)}-convite.png`,
            {
                type:"image/png"
            }
        );

    if(
        navigator.share &&
        (
            !navigator.canShare ||
            navigator.canShare({
                files:[file]
            })
        )
    ){
        try{
            await navigator.share({
                title:
                    `Lume — ${lume.name}`,
                text:
                    "Você foi convidado para um Lume no Vinci.",
                files:[file]
            });

            return;

        }catch(error){
            if(
                error?.name===
                "AbortError"
            ){
                return;
            }
        }
    }

    await downloadInviteImage();
}

async function copyInvite(){
    const link=inviteURL();

    try{
        await navigator.clipboard.writeText(link);
        $("#copyLumeInvite").textContent="Copiado ✓";
    }catch{
        $("#lumeInviteLink").select();
        document.execCommand("copy");
    }

    setTimeout(()=>{
        $("#copyLumeInvite").textContent="Copiar";
    },1500);
}

async function nativeShare(){
    const link=inviteURL();

    if(navigator.share){
        try{
            await navigator.share({
                title:`Lume — ${lume.name}`,
                text:"Entre no nosso Lume e coloque suas fotos no mesmo mural.",
                url:link
            });
            return;
        }catch(error){
            if(error?.name==="AbortError")return;
        }
    }

    await copyInvite();
}

async function compressImage(
    file,
    maxSide=2000,
    quality=.86
){
    if(!file?.type?.startsWith("image/"))return file;

    try{
        const bitmap=await createImageBitmap(file);

        const scale=Math.min(
            1,
            maxSide/Math.max(bitmap.width,bitmap.height)
        );

        const canvas=document.createElement("canvas");

        canvas.width=Math.max(
            1,
            Math.round(bitmap.width*scale)
        );

        canvas.height=Math.max(
            1,
            Math.round(bitmap.height*scale)
        );

        canvas.getContext("2d").drawImage(
            bitmap,
            0,
            0,
            canvas.width,
            canvas.height
        );

        bitmap.close?.();

        const blob=await new Promise(resolve=>
            canvas.toBlob(
                resolve,
                "image/webp",
                quality
            )
        );

        return blob||file;
    }catch{
        return file;
    }
}

async function sendPhoto(){
    if(!photoFile||lume.status!=="open")return;

    const message=$("#lumeUploadMessage");
    const button=$("#sendLumePhoto");

    button.disabled=true;
    message.textContent="Preparando foto...";

    let path=null;

    try{
        if(photoFile.size>15*1024*1024){
            throw new Error(
                "A foto é grande demais. Use uma imagem de até 15 MB."
            );
        }

        const blob=await compressImage(photoFile);

        const ext=blob.type==="image/webp"
            ? "webp"
            : (
                photoFile.name.split(".").pop()||"jpg"
            )
            .replace(/[^a-z0-9]/gi,"")
            .toLowerCase();

        path=
            `${lumeId}/${user.id}/photos/photo-${crypto.randomUUID()}.${ext}`;

        message.textContent="Enviando para o Lume...";

        const {error:uploadError}=await db.storage
            .from("vinci-lumes")
            .upload(
                path,
                blob,
                {
                    upsert:false,
                    contentType:
                        blob.type||
                        photoFile.type||
                        "image/jpeg"
                }
            );

        if(uploadError)throw uploadError;

        const imageURL=
            `${SUPABASE_URL}/storage/v1/object/public/vinci-lumes/${path}`;

        const caption=
            $("#lumePhotoCaption")
            .value
            .trim();

        const {error:insertError}=await db
            .from("vinci_lume_photos")
            .insert({
                lume_id:lumeId,
                user_id:user.id,
                image_url:imageURL,
                image_path:path,
                caption:caption||null
            });

        if(insertError)throw insertError;

        photoFile=null;
        $("#lumePhotoInput").value="";
        $("#lumePhotoCaption").value="";
        $("#lumePhotoPreview").classList.add("hidden");

        closeModal("#lumeUploadModal");
        await refresh();

    }catch(error){
        console.error("Lume upload:",error);

        if(path){
            await db.storage
                .from("vinci-lumes")
                .remove([path]);
        }

        message.textContent=
            error.message||
            "Não foi possível adicionar a foto.";

    }finally{
        button.disabled=!photoFile;
    }
}

async function openPhoto(photoId){
    const photo=photos.find(p=>p.id===photoId);
    if(!photo)return;

    activePhoto=photo;

    const url=await media(photo.image_url);
    if(!url)return;

    const member=members.find(
        m=>m.user_id===photo.user_id
    );

    $("#lumePhotoFull").src=url;
    $("#lumePhotoAuthor").textContent=memberName(member);
    $("#lumePhotoFullCaption").textContent=photo.caption||"";
    $("#lumePhotoTime").textContent=formatTime(photo.created_at);

    $("#deleteLumePhoto").classList.toggle(
        "hidden",
        !(
            photo.user_id===user.id||
            me.role==="owner"
        )
    );

    openModal("#lumePhotoModal");
}

async function deletePhoto(){
    if(!activePhoto)return;

    const button=$("#deleteLumePhoto");

    if(button.dataset.confirm!=="1"){
        button.dataset.confirm="1";
        button.textContent="Toque novamente para remover";

        setTimeout(()=>{
            button.dataset.confirm="0";
            button.textContent="Remover foto";
        },3500);

        return;
    }

    button.disabled=true;

    const photo=activePhoto;

    const {error}=await db
        .from("vinci_lume_photos")
        .delete()
        .eq("id",photo.id);

    if(error){
        alert(error.message);
        button.disabled=false;
        return;
    }

    await db.storage
        .from("vinci-lumes")
        .remove([photo.image_path]);

    activePhoto=null;
    closeModal("#lumePhotoModal");
    button.disabled=false;

    await refresh();
}


function cleanupArchivePreviewURLs(){

    archivePreviewURLs
        .forEach(
            url=>
                URL.revokeObjectURL(
                    url
                )
        );

    archivePreviewURLs=[];
}

function clearArchiveResult(){

    archiveBlobs=[];
    archivePreviewIndex=0;

    cleanupArchivePreviewURLs();

    $("#lumeArchiveResult")
        ?.classList
        .add(
            "hidden"
        );
}

function setArchiveMode(
    mode
){

    archiveMode=
        mode==="stories"
            ? "stories"
            : "carousel";

    document
        .querySelectorAll(
            "[data-lume-archive-mode]"
        )
        .forEach(
            button=>{
                button.classList.toggle(
                    "active",
                    button.dataset.lumeArchiveMode===
                        archiveMode
                );
            }
        );

    $("#lumeArchiveCarouselOptions")
        .classList
        .toggle(
            "hidden",
            archiveMode!=="carousel"
        );

    if(archiveMode==="carousel"){

        $("#lumeArchiveModeTitle")
            .textContent=
            "Carrossel contínuo";

        $("#lumeArchiveModeDescription")
            .textContent=
            "O Vinci monta uma faixa única e depois corta em páginas 1080 × 1350. Fotos atravessam as divisões e se completam no próximo slide.";

    }else{

        $("#lumeArchiveModeTitle")
            .textContent=
            "Stories do Lume";

        $("#lumeArchiveModeDescription")
            .textContent=
            "Cada foto recebe uma composição vertical própria em 1080 × 1920, com identidade do Lume e espaço pensado para Story.";
    }

    clearArchiveResult();
}

async function renderArchivePhotoPicker(){

    const picker=
        $("#lumeArchivePhotoPicker");

    $("#lumeArchivePhotoCount")
        .textContent=
        `${archiveSelectedPhotoIds.length}/10`;

    if(!photos.length){

        picker.innerHTML=`
            <div class="lume-invite-photo-empty">
                Este Lume ainda não tem fotos para montar uma retrospectiva.
            </div>
        `;

        return;
    }

    const resolved=
        await Promise.all(
            photos.map(
                async photo=>({
                    photo,
                    url:
                        await media(
                            photo.image_url
                        )
                })
            )
        );

    picker.innerHTML=
        resolved
        .filter(
            item=>
                Boolean(
                    item.url
                )
        )
        .map(
            ({photo,url})=>{

                const selected=
                    archiveSelectedPhotoIds
                    .includes(
                        photo.id
                    );

                const order=
                    selected
                        ? archiveSelectedPhotoIds
                            .indexOf(
                                photo.id
                            )+1
                        : "";

                return `
                    <button
                        type="button"
                        class="lume-archive-photo-option ${selected?"selected":""}"
                        data-archive-photo-id="${esc(photo.id)}"
                        aria-pressed="${selected?"true":"false"}"
                    >
                        <img
                            src="${esc(url)}"
                            alt=""
                            loading="lazy"
                        >

                        <span>
                            ${order}
                        </span>
                    </button>
                `;
            }
        )
        .join("");

    picker
        .querySelectorAll(
            "[data-archive-photo-id]"
        )
        .forEach(
            button=>{

                button.onclick=
                    async ()=>{

                        const id=
                            button.dataset
                            .archivePhotoId;

                        const index=
                            archiveSelectedPhotoIds
                            .indexOf(
                                id
                            );

                        if(index>=0){

                            archiveSelectedPhotoIds
                                .splice(
                                    index,
                                    1
                                );

                        }else{

                            if(
                                archiveSelectedPhotoIds
                                .length>=10
                            ){
                                $("#lumeArchiveMessage")
                                    .textContent=
                                    "Escolha no máximo 10 fotos.";

                                return;
                            }

                            archiveSelectedPhotoIds
                                .push(
                                    id
                                );
                        }

                        $("#lumeArchiveMessage")
                            .textContent=
                            "";

                        clearArchiveResult();

                        await renderArchivePhotoPicker();
                    };
            }
        );
}

async function openArchiveBuilder(){

    if(
        me?.role!=="owner" ||
        lume.status!=="closed"
    ){
        return;
    }

    if(!archiveSelectedPhotoIds.length){

        archiveSelectedPhotoIds=
            photos
            .slice(
                0,
                Math.min(
                    8,
                    photos.length
                )
            )
            .map(
                photo=>
                    photo.id
            );
    }else{

        archiveSelectedPhotoIds=
            archiveSelectedPhotoIds
            .filter(
                id=>
                    photos.some(
                        photo=>
                            photo.id===id
                    )
            )
            .slice(
                0,
                10
            );
    }

    setArchiveMode(
        archiveMode
    );

    clearArchiveResult();

    $("#lumeArchiveMessage")
        .textContent=
        "";

    openModal(
        "#lumeArchiveModal"
    );

    await renderArchivePhotoPicker();
}

async function loadArchivePhotoImages(){

    const selected=
        archiveSelectedPhotoIds
        .map(
            id=>
                photos.find(
                    photo=>
                        photo.id===id
                )
        )
        .filter(Boolean);

    const items=[];

    for(
        const photo of
        selected
    ){

        try{

            const signed=
                await media(
                    photo.image_url
                );

            if(!signed){
                continue;
            }

            const image=
                await loadCanvasImage(
                    signed
                );

            items.push({
                photo,
                image
            });

        }catch(error){

            console.warn(
                "Foto ignorada na retrospectiva:",
                error
            );
        }
    }

    return items;
}

async function canvasPNG(
    canvas
){

    return await new Promise(
        (resolve,reject)=>{

            canvas.toBlob(
                blob=>
                    blob
                        ? resolve(
                            blob
                        )
                        : reject(
                            new Error(
                                "Não foi possível gerar a imagem."
                            )
                        ),
                "image/png"
            );
        }
    );
}

async function loadVinciLogo(){

    try{
        return await loadCanvasImage(
            "assets/icon-vinci.png"
        );
    }catch{
        return null;
    }
}

function drawArchiveBrand(
    ctx,
    logo,
    x,
    y,
    accent,
    scale=1
){

    const icon=
        58*
        scale;

    if(logo){
        drawCoverImage(
            ctx,
            logo,
            x,
            y,
            icon,
            icon,
            14*
            scale
        );
    }

    ctx.fillStyle=
        "#221a16";

    ctx.font=
        `${Math.round(22*scale)}px Arial, sans-serif`;

    ctx.fillText(
        "VINCI",
        x+
        icon+
        14*
        scale,
        y+
        25*
        scale
    );

    ctx.fillStyle=
        accent;

    ctx.font=
        `800 ${Math.round(14*scale)}px Arial, sans-serif`;

    ctx.fillText(
        "/ LUME",
        x+
        icon+
        14*
        scale,
        y+
        48*
        scale
    );
}

function drawFramedArchiveImage(
    ctx,
    image,
    x,
    y,
    w,
    h,
    angle=0
){

    ctx.save();

    ctx.translate(
        x+
        w/2,
        y+
        h/2
    );

    ctx.rotate(
        angle
    );

    ctx.shadowColor=
        "rgba(45,28,17,.16)";

    ctx.shadowBlur=26;
    ctx.shadowOffsetY=12;

    fillRoundRect(
        ctx,
        -w/2-10,
        -h/2-10,
        w+20,
        h+20,
        28,
        "#fffdfb"
    );

    ctx.shadowColor=
        "transparent";

    drawCoverImage(
        ctx,
        image,
        -w/2,
        -h/2,
        w,
        h,
        22
    );

    ctx.restore();
}

async function generateCarouselArchive(){

    const items=
        await loadArchivePhotoImages();

    if(items.length<2){
        throw new Error(
            "Escolha pelo menos 2 fotos para o carrossel."
        );
    }

    const slideCount=
        Math.max(
            2,
            Math.min(
                5,
                Number(
                    $("#lumeArchiveSlideCount")
                    .value||
                    4
                )
            )
        );

    const W=1080;
    const H=1350;

    const master=
        document.createElement(
            "canvas"
        );

    master.width=
        W*
        slideCount;

    master.height=
        H;

    const ctx=
        master.getContext(
            "2d"
        );

    const accent=
        lume.accent_color||
        "#f4a261";

    const bg=
        ctx.createLinearGradient(
            0,
            0,
            master.width,
            H
        );

    bg.addColorStop(
        0,
        "#fbf7f3"
    );

    bg.addColorStop(
        .5,
        "#f5ece5"
    );

    bg.addColorStop(
        1,
        "#efe1d7"
    );

    ctx.fillStyle=
        bg;

    ctx.fillRect(
        0,
        0,
        master.width,
        H
    );

    const logo=
        await loadVinciLogo();

    /*
       Base de cada página. Ela dá ritmo ao dump.
    */
    for(
        let page=0;
        page<slideCount;
        page++
    ){

        const px=
            page*
            W;

        const item=
            items[
                page%
                items.length
            ];

        drawFramedArchiveImage(
            ctx,
            item.image,
            px+90,
            page===0
                ? 335
                : 160,
            900,
            page===0
                ? 820
                : 990,
            page%2
                ? .018
                : -.014
        );

        ctx.fillStyle=
            "#796c64";

        ctx.font=
            "700 14px Arial, sans-serif";

        ctx.fillText(
            `${String(page+1).padStart(2,"0")} / ${String(slideCount).padStart(2,"0")}`,
            px+900,
            1285
        );
    }

    /*
       O segredo do carrossel contínuo:
       uma foto é desenhada CENTRALIZADA exatamente em cada
       divisão de páginas. Quando o canvas largo é cortado,
       metade fica em um post e metade continua no próximo.
    */
    for(
        let seam=1;
        seam<slideCount;
        seam++
    ){

        const item=
            items[
                (
                    seam+
                    2
                )%
                items.length
            ];

        const w=
            seam%2
                ? 780
                : 700;

        const h=
            seam%2
                ? 520
                : 470;

        const x=
            seam*
            W-
            w/2;

        const y=
            seam%2
                ? 765
                : 90;

        drawFramedArchiveImage(
            ctx,
            item.image,
            x,
            y,
            w,
            h,
            seam%2
                ? -.035
                : .028
        );
    }

    /*
       Primeira página recebe a identidade editorial.
    */
    drawArchiveBrand(
        ctx,
        logo,
        72,
        68,
        accent,
        1
    );

    fillRoundRect(
        ctx,
        72,
        158,
        160,
        37,
        19,
        "#ffffffd9"
    );

    ctx.fillStyle=
        accent;

    ctx.font=
        "900 14px Arial, sans-serif";

    ctx.fillText(
        "LUME DUMP",
        94,
        182
    );

    ctx.fillStyle=
        "#221a16";

    ctx.font=
        "700 52px Georgia, 'Times New Roman', serif";

    drawWrappedText(
        ctx,
        lume.name,
        72,
        255,
        800,
        57,
        2
    );

    ctx.fillStyle=
        "#85776f";

    ctx.font=
        "400 18px Arial, sans-serif";

    ctx.fillText(
        "um momento · todas as perspectivas",
        74,
        314
    );

    /*
       Última página fecha o dump sem quebrar a continuidade.
    */
    const lastX=
        (slideCount-1)*
        W;

    fillRoundRect(
        ctx,
        lastX+620,
        1125,
        370,
        120,
        25,
        "#fffdfbe8"
    );

    ctx.fillStyle=
        "#251d18";

    ctx.font=
        "700 24px Georgia, serif";

    ctx.fillText(
        "ficou no Lume.",
        lastX+652,
        1172
    );

    ctx.fillStyle=
        accent;

    ctx.font=
        "800 13px Arial, sans-serif";

    ctx.fillText(
        "VINCI",
        lastX+652,
        1207
    );

    const blobs=[];

    for(
        let page=0;
        page<slideCount;
        page++
    ){

        const slide=
            document.createElement(
                "canvas"
            );

        slide.width=W;
        slide.height=H;

        slide
            .getContext(
                "2d"
            )
            .drawImage(
                master,
                page*
                W,
                0,
                W,
                H,
                0,
                0,
                W,
                H
            );

        blobs.push(
            await canvasPNG(
                slide
            )
        );
    }

    return blobs;
}

async function generateStoriesArchive(){

    const items=
        await loadArchivePhotoImages();

    if(!items.length){
        throw new Error(
            "Escolha pelo menos 1 foto para os Stories."
        );
    }

    const W=1080;
    const H=1920;

    const accent=
        lume.accent_color||
        "#f4a261";

    const logo=
        await loadVinciLogo();

    const blobs=[];

    for(
        let index=0;
        index<items.length;
        index++
    ){

        const {
            photo,
            image
        }=
            items[index];

        const canvas=
            document.createElement(
                "canvas"
            );

        canvas.width=W;
        canvas.height=H;

        const ctx=
            canvas.getContext(
                "2d"
            );

        const bg=
            ctx.createLinearGradient(
                0,
                0,
                W,
                H
            );

        if(index%2===0){
            bg.addColorStop(
                0,
                "#fbf7f3"
            );

            bg.addColorStop(
                1,
                "#efe1d7"
            );
        }else{
            bg.addColorStop(
                0,
                "#f1e5dc"
            );

            bg.addColorStop(
                1,
                "#fbf8f5"
            );
        }

        ctx.fillStyle=
            bg;

        ctx.fillRect(
            0,
            0,
            W,
            H
        );

        const glow=
            ctx.createRadialGradient(
                940,
                160,
                10,
                940,
                160,
                390
            );

        glow.addColorStop(
            0,
            `${accent}55`
        );

        glow.addColorStop(
            1,
            `${accent}00`
        );

        ctx.fillStyle=
            glow;

        ctx.fillRect(
            550,
            0,
            530,
            560
        );

        drawArchiveBrand(
            ctx,
            logo,
            72,
            78,
            accent,
            1.05
        );

        ctx.fillStyle=
            accent;

        ctx.font=
            "900 15px Arial, sans-serif";

        ctx.fillText(
            `STORY ${String(index+1).padStart(2,"0")} / ${String(items.length).padStart(2,"0")}`,
            76,
            212
        );

        ctx.fillStyle=
            "#221a16";

        ctx.font=
            "700 56px Georgia, 'Times New Roman', serif";

        drawWrappedText(
            ctx,
            lume.name,
            74,
            292,
            900,
            62,
            2
        );

        /*
           Alternar a moldura cria stories que pertencem
           ao mesmo conjunto sem serem cópias idênticas.
        */
        const photoY=
            index%2===0
                ? 465
                : 520;

        const photoH=
            index%2===0
                ? 1120
                : 1030;

        drawFramedArchiveImage(
            ctx,
            image,
            70,
            photoY,
            940,
            photoH,
            index%2===0
                ? -.012
                : .012
        );

        const member=
            members.find(
                member=>
                    member.user_id===
                    photo.user_id
            );

        const bottom=
            photoY+
            photoH+
            78;

        ctx.fillStyle=
            "#655950";

        ctx.font=
            "600 20px Arial, sans-serif";

        ctx.fillText(
            memberName(
                member
            ),
            78,
            bottom
        );

        if(photo.caption){

            ctx.fillStyle=
                "#7d7068";

            ctx.font=
                "400 22px Arial, sans-serif";

            drawWrappedText(
                ctx,
                photo.caption,
                78,
                bottom+48,
                870,
                30,
                2
            );
        }

        ctx.fillStyle=
            accent;

        ctx.font=
            "800 15px Arial, sans-serif";

        ctx.fillText(
            "VINCI · LUME",
            78,
            1848
        );

        blobs.push(
            await canvasPNG(
                canvas
            )
        );
    }

    return blobs;
}

function renderArchivePreview(){

    const result=
        $("#lumeArchiveResult");

    if(!archiveBlobs.length){

        result.classList.add(
            "hidden"
        );

        return;
    }

    if(
        archivePreviewURLs.length!==
        archiveBlobs.length
    ){

        cleanupArchivePreviewURLs();

        archivePreviewURLs=
            archiveBlobs
            .map(
                blob=>
                    URL.createObjectURL(
                        blob
                    )
            );
    }

    archivePreviewIndex=
        Math.max(
            0,
            Math.min(
                archivePreviewIndex,
                archivePreviewURLs.length-1
            )
        );

    const preview=
        $("#lumeArchivePreview");

    preview.src=
        archivePreviewURLs[
            archivePreviewIndex
        ];

    const shell=
        preview.closest(
            ".lume-archive-preview-shell"
        );

    shell.classList.toggle(
        "story",
        archiveMode==="stories"
    );

    $("#lumeArchivePreviewLabel")
        .textContent=
        archiveMode==="stories"
            ? `story ${archivePreviewIndex+1}`
            : `página ${archivePreviewIndex+1}`;

    $("#lumeArchivePreviewCount")
        .textContent=
        `${archivePreviewIndex+1}/${archiveBlobs.length}`;

    result.classList.remove(
        "hidden"
    );
}

async function generateArchive(){

    if(archiveGenerating){
        return;
    }

    archiveGenerating=true;

    const button=
        $("#generateLumeArchive");

    const message=
        $("#lumeArchiveMessage");

    button.disabled=true;

    message.textContent=
        archiveMode==="carousel"
            ? "Montando o carrossel contínuo..."
            : "Montando os Stories...";

    clearArchiveResult();

    try{

        archiveBlobs=
            archiveMode==="carousel"
                ? await generateCarouselArchive()
                : await generateStoriesArchive();

        archivePreviewIndex=0;

        renderArchivePreview();

        message.textContent=
            archiveMode==="carousel"
                ? `${archiveBlobs.length} páginas prontas. Poste na ordem para manter o efeito contínuo.`
                : `${archiveBlobs.length} Stories prontos.`;

    }catch(error){

        console.error(
            "Retrospectiva:",
            error
        );

        message.textContent=
            error.message||
            "Não foi possível gerar a retrospectiva.";

    }finally{

        button.disabled=false;
        archiveGenerating=false;
    }
}

function moveArchivePreview(
    delta
){

    if(!archiveBlobs.length){
        return;
    }

    archivePreviewIndex=
        (
            archivePreviewIndex+
            delta+
            archiveBlobs.length
        )%
        archiveBlobs.length;

    renderArchivePreview();
}

function archiveFiles(){

    const base=
        slugifyFileName(
            lume.name
        );

    const label=
        archiveMode==="carousel"
            ? "carrossel"
            : "story";

    return archiveBlobs
        .map(
            (blob,index)=>
                new File(
                    [blob],
                    `lume-${base}-${label}-${String(index+1).padStart(2,"0")}.png`,
                    {
                        type:"image/png"
                    }
                )
        );
}

async function shareArchive(){

    if(!archiveBlobs.length){
        await generateArchive();
    }

    if(!archiveBlobs.length){
        return;
    }

    const files=
        archiveFiles();

    if(
        navigator.share &&
        (
            !navigator.canShare ||
            navigator.canShare({
                files
            })
        )
    ){

        try{

            await navigator.share({
                title:
                    `Lume — ${lume.name}`,
                text:
                    archiveMode==="carousel"
                        ? "Retrospectiva do nosso Lume."
                        : "Stories do nosso Lume.",
                files
            });

            return;

        }catch(error){

            if(
                error?.name===
                "AbortError"
            ){
                return;
            }
        }
    }

    downloadArchive();
}

function downloadArchive(){

    if(!archiveBlobs.length){
        return;
    }

    archiveFiles()
        .forEach(
            (file,index)=>{

                setTimeout(
                    ()=>{

                        const url=
                            URL.createObjectURL(
                                file
                            );

                        const a=
                            document.createElement(
                                "a"
                            );

                        a.href=url;
                        a.download=
                            file.name;

                        document.body
                            .appendChild(
                                a
                            );

                        a.click();
                        a.remove();

                        setTimeout(
                            ()=>
                                URL.revokeObjectURL(
                                    url
                                ),
                            1400
                        );

                    },
                    index*
                    180
                );
            }
        );
}


async function toggleStatus(){

    if(me.role!=="owner"){
        return;
    }

    const wasClosed=
        lume.status==="closed";

    const next=
        wasClosed
            ? "open"
            : "closed";

    const button=
        $("#toggleLumeStatus");

    button.disabled=true;

    const {
        error
    }=
        await db.rpc(
            "vinci_set_lume_status",
            {
                p_lume_id:lumeId,
                p_status:next
            }
        );

    if(error){

        alert(
            error.message
        );

        button.disabled=false;

        return;
    }

    closeModal(
        "#lumeManageModal"
    );

    await refresh();

    button.disabled=false;

    /*
       Quando o Lume acaba, a próxima ação natural é
       transformar aquele conjunto em algo compartilhável.
    */
    if(!wasClosed){

        setTimeout(
            ()=>
                openArchiveBuilder(),
            180
        );
    }
}

async function leaveGuest(){
    if(me.role!=="guest")return;

    const token=lume.invite_token;

    await db.rpc(
        "vinci_leave_lume",
        {p_lume_id:lumeId}
    );

    await db.auth.signOut();

    location.replace(
        `lume-invite.html?t=${encodeURIComponent(token)}`
    );
}

function scheduleRefresh(){
    clearTimeout(reloadTimer);

    reloadTimer=setTimeout(
        ()=>refresh(),
        160
    );
}

async function refresh(){
    if(!await loadState())return;
    await renderAll();
}

function connectRealtime(){
    if(channel){
        db.removeChannel(channel);
    }

    channel=db
        .channel(
            `lume-live-${lumeId}-${Math.random().toString(36).slice(2,7)}`
        )
        .on(
            "postgres_changes",
            {
                event:"*",
                schema:"public",
                table:"vinci_lume_photos",
                filter:`lume_id=eq.${lumeId}`
            },
            scheduleRefresh
        )
        .on(
            "postgres_changes",
            {
                event:"*",
                schema:"public",
                table:"vinci_lume_members",
                filter:`lume_id=eq.${lumeId}`
            },
            scheduleRefresh
        )
        .on(
            "postgres_changes",
            {
                event:"*",
                schema:"public",
                table:"vinci_lumes",
                filter:`id=eq.${lumeId}`
            },
            scheduleRefresh
        )
        .subscribe(status=>{
            $("#lumeLiveStatus").textContent=
                status==="SUBSCRIBED"
                    ? "ao vivo"
                    : "sincronizando";
        });
}

function bindLumeTap(
    element,
    handler
){
    if(!element)return;

    element.addEventListener(
        "pointerup",
        event=>{
            if(
                event.pointerType===
                "mouse"
            ){
                return;
            }

            if(element.disabled){
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            lastLumeTouchActionAt=
                Date.now();

            handler(event);
        },
        {
            passive:false
        }
    );

    element.addEventListener(
        "click",
        event=>{
            if(element.disabled){
                return;
            }

            /*
               Android/iOS podem disparar um click sintético
               logo depois do pointerup.
            */
            if(
                Date.now()-
                lastLumeTouchActionAt<
                650
            ){
                event.preventDefault();
                return;
            }

            handler(event);
        }
    );
}

function openLumeUploadModal(){
    openModal(
        "#lumeUploadModal"
    );
}

function chooseLumePhoto(){
    const input=
        $("#lumePhotoInput");

    if(!input)return;

    /*
       Limpa o valor para permitir escolher a mesma foto
       novamente, algo comum no Android/iOS.
    */
    input.value="";

    input.click();
}

function bind(){
    bindLumeTap(
        $("#openLumeUpload"),
        openLumeUploadModal
    );

    bindLumeTap(
        $("#pickLumePhoto"),
        chooseLumePhoto
    );

    $("#closeLumeUpload").onclick=
        ()=>closeModal("#lumeUploadModal");

    $("#shareLume").onclick=openShare;
    $("#shareLumeTop").onclick=openShare;

    $("#closeLumeShare").onclick=
        ()=>closeModal("#lumeShareModal");

    document
        .querySelectorAll(
            "[data-lume-share-mode]"
        )
        .forEach(button=>{
            button.onclick=
                ()=>setShareMode(
                    button.dataset.lumeShareMode
                );
        });

    $("#copyLumeInvite").onclick=copyInvite;
    $("#nativeShareLume").onclick=nativeShare;

    $("#lumeInviteText")
        .addEventListener(
            "input",
            scheduleInviteCardPreview
        );

    bindLumeTap(
        $("#pickLumeInviteGallery"),
        pickInviteGallery
    );

    bindLumeTap(
        $("#clearLumeInviteGallery"),
        clearInviteGallery
    );

    $("#lumeInviteGalleryInput")
        .onchange=
        event=>
            handleInviteGalleryFiles(
                event.target.files
            );

    $("#saveLumeInviteDesign")
        .onclick=
        saveInviteDesign;

    $("#refreshLumeInvitePreview")
        .onclick=
        generateInviteCardPreview;

    $("#shareLumeInviteImage")
        .onclick=
        shareInviteImage;

    $("#downloadLumeInviteImage")
        .onclick=
        downloadInviteImage;

    $("#showLumePeople").onclick=
        ()=>openModal("#lumePeopleModal");

    $("#closeLumePeople").onclick=
        ()=>closeModal("#lumePeopleModal");

    $("#manageLume").onclick=
        ()=>openModal("#lumeManageModal");

    $("#closeLumeManage").onclick=
        ()=>closeModal("#lumeManageModal");

    $("#toggleLumeStatus").onclick=toggleStatus;

    bindLumeTap(
        $("#archiveLume"),
        openArchiveBuilder
    );

    $("#closeLumeArchive")
        .onclick=
        ()=>{
            closeModal(
                "#lumeArchiveModal"
            );
        };

    document
        .querySelectorAll(
            "[data-lume-archive-mode]"
        )
        .forEach(
            button=>{
                button.onclick=
                    ()=>setArchiveMode(
                        button.dataset
                        .lumeArchiveMode
                    );
            }
        );

    $("#lumeArchiveSlideCount")
        .onchange=
        clearArchiveResult;

    $("#generateLumeArchive")
        .onclick=
        generateArchive;

    $("#lumeArchivePrev")
        .onclick=
        ()=>moveArchivePreview(
            -1
        );

    $("#lumeArchiveNext")
        .onclick=
        ()=>moveArchivePreview(
            1
        );

    $("#shareLumeArchive")
        .onclick=
        shareArchive;

    $("#downloadLumeArchive")
        .onclick=
        downloadArchive;

    $("#guestExit").onclick=leaveGuest;

    $("#closeLumePhoto").onclick=
        ()=>closeModal("#lumePhotoModal");

    $("#deleteLumePhoto").onclick=deletePhoto;

    $("#lumePhotoInput").onchange=event=>{
        photoFile=event.target.files?.[0]||null;

        const preview=$("#lumePhotoPreview");
        const button=$("#sendLumePhoto");

        button.disabled=!photoFile;
        $("#lumeUploadMessage").textContent="";

        if(!photoFile){
            preview.classList.add("hidden");
            preview.removeAttribute("src");
            return;
        }

        preview.src=URL.createObjectURL(photoFile);
        preview.classList.remove("hidden");
    };

    bindLumeTap(
        $("#sendLumePhoto"),
        sendPhoto
    );

    document.querySelectorAll(".lume-modal")
        .forEach(modal=>{
            modal.addEventListener("click",event=>{
                if(event.target===modal){
                    modal.classList.add("hidden");
                }
            });
        });

    $("#lumePhotoModal").onclick=event=>{
        if(event.target===$("#lumePhotoModal")){
            closeModal("#lumePhotoModal");
        }
    };

    document.addEventListener(
        "visibilitychange",
        ()=>{
            if(document.visibilityState==="visible"){
                refresh();
            }
        }
    );

    window.addEventListener(
        "online",
        ()=>refresh()
    );

    window.addEventListener(
        "pagehide",
        ()=>{
            cleanupArchivePreviewURLs();

            inviteGalleryObjectURLs
                .forEach(
                    url=>
                        URL.revokeObjectURL(
                            url
                        )
                );
        }
    );
}

async function init(){
    if(!lumeId){
        location.replace("lumes.html");
        return;
    }

    const {data}=await db.auth.getUser();
    user=data?.user||null;

    if(!user)return;

    bind();

    if(!await loadState())return;

    await renderAll();
    connectRealtime();
}

if(document.readyState==="loading"){
    document.addEventListener(
        "DOMContentLoaded",
        init,
        {once:true}
    );
}else{
    init();
}

})();
