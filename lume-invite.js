(function(){

"use strict";

const $=s=>document.querySelector(s);

const token=
    new URLSearchParams(
        location.search
    ).get("t");

let preview=null;
let sessionUser=null;
let sessionIsAnonymous=false;

function isAnonymous(user){
    return Boolean(
        user?.is_anonymous||
        user?.app_metadata?.provider==="anonymous"
    );
}

function formatDate(value){
    if(!value)return "a combinar";

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

function nextURL(){
    return (
        "lume-invite.html?t="+
        encodeURIComponent(token)
    );
}

async function loadPreview(){
    if(!token){
        $("#inviteName").textContent="Convite inválido";
        $("#inviteDescription").textContent=
            "Este link não possui um Lume.";
        return false;
    }

    const {data,error}=await db.rpc(
        "vinci_lume_invite_preview",
        {p_token:token}
    );

    const row=Array.isArray(data)
        ? data[0]
        : data;

    if(error||!row){
        $("#inviteName").textContent=
            "Este Lume não existe mais";

        $("#inviteDescription").textContent=
            "Peça um novo convite para quem criou o Lume.";

        $("#inviteMessage").textContent=
            error?.message||"";

        return false;
    }

    preview=row;

    document.documentElement.style.setProperty(
        "--invite-accent",
        row.accent_color||"#f4a261"
    );

    $("#inviteName").textContent=row.name;

    $("#inviteDescription").textContent=
        row.description||
        "Um momento coletivo no Vinci.";

    $("#inviteDate").textContent=
        formatDate(row.event_date);

    $("#invitePeople").textContent=
        Number(row.member_count||0);

    $("#invitePhotos").textContent=
        Number(row.photo_count||0);

    $("#inviteOwner").textContent=
        `criado por ${row.owner_name||"alguém no Vinci"}`;

    if(row.status!=="open"){
        $("#inviteMessage").textContent=
            "Este Lume já foi encerrado e está arquivado.";
        return false;
    }

    return true;
}

async function readSession(){
    const {data}=await db.auth.getSession();

    sessionUser=
        data?.session?.user||
        null;

    sessionIsAnonymous=
        isAnonymous(sessionUser);
}

async function renderActions(){
    const actions=$("#inviteActions");
    actions.classList.remove("hidden");

    const guestArea=$("#guestArea");
    const accountButton=$("#joinWithAccount");
    const currentButton=$("#joinCurrentAccount");

    if(sessionUser&&!sessionIsAnonymous){
        guestArea.classList.add("hidden");
        accountButton.classList.add("hidden");
        currentButton.classList.remove("hidden");

        const {data:profile}=await db
            .from("profiles")
            .select("username,name")
            .eq("id",sessionUser.id)
            .maybeSingle();

        currentButton.textContent=
            profile?.username
                ? `Entrar como @${profile.username}`
                : "Entrar no Lume";

        return;
    }

    currentButton.classList.add("hidden");

    guestArea.classList.toggle(
        "hidden",
        !preview.guest_access
    );

    accountButton.classList.remove("hidden");
}

async function join(displayName=null){
    $("#inviteMessage").textContent=
        "Entrando no Lume...";

    const {data,error}=await db.rpc(
        "vinci_join_lume",
        {
            p_token:token,
            p_display_name:displayName
        }
    );

    if(error){
        $("#inviteMessage").textContent=
            error.message;
        return;
    }

    location.replace(
        `lume.html?id=${encodeURIComponent(data)}`
    );
}

async function joinGuest(){
    const name=$("#guestName").value.trim();

    if(name.length<2){
        $("#inviteMessage").textContent=
            "Digite seu nome.";
        return;
    }

    const button=$("#joinAsGuest");
    button.disabled=true;

    try{
        if(!sessionUser||!sessionIsAnonymous){
            const {data,error}=await db.auth
                .signInAnonymously({
                    options:{
                        data:{
                            vinci_lume_guest:true,
                            display_name:name,
                            name:name,
                            username:
                                "lume.guest." +
                                crypto.randomUUID()
                                    .replace(/-/g,"")
                                    .slice(0,12)
                        }
                    }
                });

            if(error)throw error;

            sessionUser=
                data?.user||
                data?.session?.user||
                null;

            sessionIsAnonymous=true;
        }

        await join(name);

    }catch(error){
        console.error(
            "Entrada de convidado:",
            error
        );

        const raw=String(
            error?.message||error
        );

        $("#inviteMessage").textContent=
            /anonymous/i.test(raw)
                ? "A entrada rápida está indisponível agora. Entre com sua conta Vinci."
                : raw;

        button.disabled=false;
    }
}

async function accountLogin(){
    if(sessionUser&&sessionIsAnonymous){
        await db.auth.signOut();
    }

    location.href=
        `login.html?next=${encodeURIComponent(nextURL())}`;
}

function bind(){
    $("#joinAsGuest").onclick=joinGuest;
    $("#joinWithAccount").onclick=accountLogin;
    $("#joinCurrentAccount").onclick=
        ()=>join(null);
}

async function init(){
    bind();

    if(!await loadPreview())return;

    await readSession();
    await renderActions();
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
