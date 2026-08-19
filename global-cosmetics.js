(function(){
    "use strict";

    const frameCache = new Map();
    const pending = new Set();
    let fetchTimer = null;
    let observer = null;

    function cleanFrameKey(value){
        const allowed = new Set([
            "aurora","orbit","solar","champion",
            "prism","constellation","legend",
            "celestial_wings","sakura_spirit","inferno_dragon",
            "lunar_crown","seraph_prism","eternal_vinci","crystal_garden","midnight_butterfly","ocean_guardian","cyber_koi","royal_phoenix","galaxy_crown","yakodev_core"
        ]);
        return allowed.has(value) ? value : null;
    }

    function getTargetForNode(node){
        if(!node) return null;
        if(node.id === "avatar") return node;
        return node.querySelector?.(".post-avatar, .friend-avatar, .direct-avatar, .friendship-avatar-slot img, .yearbook-cover-avatar img") || null;
    }

    const ART_FRAMES = new Set(["celestial_wings","sakura_spirit","inferno_dragon","lunar_crown","seraph_prism","eternal_vinci","crystal_garden","midnight_butterfly","ocean_guardian","cyber_koi","royal_phoenix","galaxy_crown","yakodev_core"]);

    function ensureFrameArt(wrap, frameKey){
        let art = wrap.querySelector('.vinci-frame-art');
        if(ART_FRAMES.has(frameKey)){
            if(!art){
                art = document.createElement('i');
                art.className = 'vinci-frame-art';
                art.setAttribute('aria-hidden','true');
                art.innerHTML = '<b></b><b></b><b></b><b></b>';
                wrap.insertBefore(art, wrap.firstChild);
            }
        }else if(art){ art.remove(); }
    }

    function ensureWrap(target, frameKey){
        if(!target) return;

        const parent = target.parentElement;
        let wrap = parent?.classList?.contains("vinci-frame-wrap") ? parent : null;

        if(!frameKey){
            if(wrap){
                wrap.parentNode.insertBefore(target, wrap);
                wrap.remove();
            }
            return;
        }

        if(!wrap){
            wrap = document.createElement("span");
            wrap.className = "vinci-frame-wrap";
            target.parentNode.insertBefore(wrap, target);
            wrap.appendChild(target);
        }

        wrap.className = `vinci-frame-wrap vinci-frame-${frameKey}`;
        wrap.dataset.vinciFrame = frameKey;
        ensureFrameArt(wrap, frameKey);
    }

    function applyKnownFrames(){
        document.querySelectorAll("[data-user-id]").forEach(node => {
            const userId = node.dataset.userId;
            if(!userId || !frameCache.has(userId)) return;
            ensureWrap(getTargetForNode(node), frameCache.get(userId));
        });
    }

    function collectUnknownIds(){
        document.querySelectorAll("[data-user-id]").forEach(node => {
            const userId = node.dataset.userId;
            if(userId && !frameCache.has(userId) && !pending.has(userId)){
                pending.add(userId);
            }
        });

        if(pending.size && !fetchTimer){
            fetchTimer = setTimeout(fetchPending, 30);
        }
    }

    async function fetchPending(){
        fetchTimer = null;
        const ids = Array.from(pending);
        pending.clear();
        if(!ids.length) return;

        try{
            const { data, error } = await db
                .from("vinci_game_profiles")
                .select("user_id,equipped_frame")
                .in("user_id", ids);

            if(error) throw error;

            const found = new Map(
                (data || []).map(row => [
                    row.user_id,
                    cleanFrameKey(row.equipped_frame)
                ])
            );

            ids.forEach(id => {
                frameCache.set(id, found.has(id) ? found.get(id) : null);
            });

            applyKnownFrames();
        }catch(error){
            console.warn("Vinci cosmetics: não foi possível carregar molduras.", error);
        }
    }

    async function prepareProfileAvatar(){
        const avatar = document.getElementById("avatar");
        if(!avatar) return;

        try{
            const params = new URLSearchParams(location.search);
            let userId = params.get("id");

            if(!userId){
                const { data } = await db.auth.getUser();
                userId = data?.user?.id || null;
            }

            if(userId){
                avatar.dataset.userId = userId;
                collectUnknownIds();
            }
        }catch(error){
            console.warn("Vinci cosmetics: perfil sem moldura carregada.", error);
        }
    }

    function refreshVisibleFrames(){
        frameCache.clear();
        collectUnknownIds();
    }

    function boot(){
        prepareProfileAvatar();
        collectUnknownIds();
        applyKnownFrames();

        if(!observer){
            observer = new MutationObserver(() => {
                collectUnknownIds();
                applyKnownFrames();
            });
            observer.observe(document.body, {
                childList:true,
                subtree:true,
                attributes:true,
                attributeFilter:["data-user-id"]
            });
        }
    }

    window.addEventListener("vinci-cosmetics-changed", refreshVisibleFrames);
    window.addEventListener("pageshow", collectUnknownIds);

    if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded", boot, { once:true });
    }else{
        boot();
    }
})();
