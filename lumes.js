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

const media=url=>
    window.VinciMedia?.resolveUrl
        ? window.VinciMedia.resolveUrl(url)
        : Promise.resolve(url);

let user=null;
let coverFile=null;

function formatDate(value){
    if(!value)return "SEM DATA";

    return new Date(
        `${value}T12:00:00`
    )
    .toLocaleDateString(
        "pt-BR",
        {
            day:"2-digit",
            month:"short",
            year:"numeric"
        }
    )
    .replace(".","");
}

function statusLabel(lume){
    if(lume.status==="closed")return "ARQUIVADO";
    if(!lume.event_date)return "ABERTO";

    const now=new Date();
    const event=new Date(`${lume.event_date}T12:00:00`);

    const today=new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );

    const target=new Date(
        event.getFullYear(),
        event.getMonth(),
        event.getDate()
    );

    const diff=Math.round(
        (target-today)/86400000
    );

    if(diff===0)return "HOJE";
    if(diff===1)return "AMANHÃ";
    if(diff===-1)return "ONTEM";

    return "ABERTO";
}

async function renderLumes(rows){
    const list=$("#lumesList");

    if(!rows?.length){
        list.innerHTML=`
            <div class="lumes-empty">
                <strong>Seu primeiro Lume começa com um momento.</strong><br>
                Crie um para uma viagem, festa, casamento ou encontro.
            </div>
        `;
        return;
    }

    const cards=await Promise.all(
        rows.map(async lume=>{
            const cover=lume.cover_url
                ? await media(lume.cover_url)
                : null;

            const letter=(lume.name||"L")
                .trim()
                .charAt(0)
                .toUpperCase();

            return `
                <article
                    class="lume-card"
                    data-lume-id="${esc(lume.id)}"
                    style="--lume-accent:${esc(lume.accent_color||"#f4a261")}"
                >
                    <div class="lume-card-cover">
                        ${
                            cover
                            ? `<img src="${esc(cover)}" alt="">`
                            : `<div class="lume-card-cover-letter">${esc(letter)}</div>`
                        }

                        <span class="lume-card-status ${lume.status==="closed"?"closed":""}">
                            ${esc(statusLabel(lume))}
                        </span>
                    </div>

                    <div class="lume-card-body">
                        <span class="lume-card-date">
                            ${esc(formatDate(lume.event_date))}
                        </span>

                        <h3>${esc(lume.name)}</h3>

                        <p>
                            ${esc(lume.description||"Um momento guardado no Vinci.")}
                        </p>

                        <div class="lume-card-foot">
                            <span>👥 ${Number(lume.member_count||0)}</span>
                            <span>◫ ${Number(lume.photo_count||0)} fotos</span>
                        </div>
                    </div>
                </article>
            `;
        })
    );

    list.innerHTML=cards.join("");

    list.querySelectorAll("[data-lume-id]")
        .forEach(card=>{
            card.onclick=()=>{
                location.href=
                    `lume.html?id=${encodeURIComponent(card.dataset.lumeId)}`;
            };
        });
}

async function loadLumes(){
    const list=$("#lumesList");

    const {data,error}=await db.rpc(
        "vinci_my_lumes"
    );

    if(error){
        console.error("Lume:",error);

        list.innerHTML=`
            <div class="lumes-empty">
                O sistema Lume ainda não está instalado.<br>
                Rode o <strong>PATCH 16</strong> no Supabase.
            </div>
        `;
        return;
    }

    await renderLumes(data||[]);
}

function openCreate(){
    $("#lumeCreateModal").classList.remove("hidden");
    $("#lumeCreateModal").setAttribute("aria-hidden","false");
}

function closeCreate(){
    $("#lumeCreateModal").classList.add("hidden");
    $("#lumeCreateModal").setAttribute("aria-hidden","true");
}

async function compressImage(file,maxSide=1800,quality=.84){
    if(!file?.type?.startsWith("image/"))return file;

    try{
        const bitmap=await createImageBitmap(file);
        const scale=Math.min(
            1,
            maxSide/Math.max(bitmap.width,bitmap.height)
        );

        const canvas=document.createElement("canvas");
        canvas.width=Math.max(1,Math.round(bitmap.width*scale));
        canvas.height=Math.max(1,Math.round(bitmap.height*scale));

        canvas.getContext("2d").drawImage(
            bitmap,
            0,
            0,
            canvas.width,
            canvas.height
        );

        bitmap.close?.();

        const blob=await new Promise(resolve=>
            canvas.toBlob(resolve,"image/webp",quality)
        );

        return blob||file;
    }catch{
        return file;
    }
}

async function uploadCover(lumeId){
    if(!coverFile)return;

    const blob=await compressImage(coverFile);
    const ext=blob.type==="image/webp"
        ? "webp"
        : (
            coverFile.name.split(".").pop()||"jpg"
        )
        .replace(/[^a-z0-9]/gi,"")
        .toLowerCase();

    const path=
        `${lumeId}/${user.id}/cover/cover-${crypto.randomUUID()}.${ext}`;

    const {error:uploadError}=await db.storage
        .from("vinci-lumes")
        .upload(
            path,
            blob,
            {
                upsert:false,
                contentType:blob.type||coverFile.type||"image/jpeg"
            }
        );

    if(uploadError)throw uploadError;

    const shape=
        `${SUPABASE_URL}/storage/v1/object/public/vinci-lumes/${path}`;

    const {error:updateError}=await db
        .from("vinci_lumes")
        .update({
            cover_url:shape,
            cover_path:path,
            updated_at:new Date().toISOString()
        })
        .eq("id",lumeId);

    if(updateError){
        await db.storage.from("vinci-lumes").remove([path]);
        throw updateError;
    }
}

async function createLume(){
    const name=$("#lumeName").value.trim();
    const description=$("#lumeDescription").value.trim();
    const eventDate=$("#lumeDate").value||null;
    const color=$("#lumeColor").value||"#f4a261";
    const message=$("#lumeCreateMessage");
    const button=$("#createLumeButton");

    if(name.length<2){
        message.textContent="Dê um nome para o Lume.";
        return;
    }

    button.disabled=true;
    message.textContent="Criando Lume...";

    try{
        const {data,error}=await db.rpc(
            "vinci_create_lume",
            {
                p_name:name,
                p_description:description||null,
                p_event_date:eventDate,
                p_accent_color:color
            }
        );

        if(error)throw error;

        const lumeId=String(data);

        if(coverFile){
            message.textContent="Preparando a capa...";
            await uploadCover(lumeId);
        }

        location.href=
            `lume.html?id=${encodeURIComponent(lumeId)}`;

    }catch(error){
        console.error("Erro ao criar Lume:",error);
        message.textContent=
            error.message||"Não foi possível criar o Lume.";
        button.disabled=false;
    }
}

function bind(){
    $("#openLumeCreate").onclick=openCreate;
    $("#closeLumeCreate").onclick=closeCreate;

    $("#lumeCreateModal").onclick=event=>{
        if(event.target===$("#lumeCreateModal")){
            closeCreate();
        }
    };

    $("#lumeCover").onchange=async event=>{
        const original=
            event.target.files?.[0]||
            null;

        const preview=
            $("#lumeCoverPreview");

        const message=
            $("#lumeCreateMessage");

        if(!original){
            coverFile=null;
            preview.classList.add("hidden");
            preview.removeAttribute("src");
            return;
        }

        try{
            message.textContent=
                "Enquadrando a capa...";

            if(window.VinciImageCropper?.openLumeCover){
                const cropped=
                    await window.VinciImageCropper.openLumeCover(
                        original
                    );

                if(!cropped){
                    event.target.value="";
                    message.textContent="";
                    return;
                }

                coverFile=cropped;
            }else{
                coverFile=original;
            }

            if(preview.src?.startsWith("blob:")){
                URL.revokeObjectURL(preview.src);
            }

            preview.src=
                URL.createObjectURL(
                    coverFile
                );

            preview.classList.remove("hidden");

            message.textContent=
                "Capa enquadrada ✓";

            setTimeout(()=>{
                if(
                    message.textContent===
                    "Capa enquadrada ✓"
                ){
                    message.textContent="";
                }
            },1400);

        }catch(error){
            console.error(
                "Erro no recorte da capa:",
                error
            );

            coverFile=null;
            event.target.value="";
            preview.classList.add("hidden");

            message.textContent=
                error.message||
                "Não foi possível enquadrar a capa.";
        }
    };

    $("#createLumeButton").onclick=createLume;
}

async function init(){
    const {data}=await db.auth.getUser();
    user=data?.user||null;

    if(!user)return;

    bind();
    await loadLumes();
}

if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init,{once:true});
}else{
    init();
}

})();
