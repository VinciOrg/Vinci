// =====================================
// VINCI 0.7 — NOTIFICAÇÕES
// =====================================
(function () {
    "use strict";

    const list = document.getElementById("notificationsList");
    const markAll = document.getElementById("markAllRead");
    const back = document.getElementById("notificationsBack");
    if (!list) return;

    let currentUser = null;

    back?.addEventListener("click", function () {
        history.length > 1 ? history.back() : location.assign("index.html");
    });

    function formatDate(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    function copyFor(type) {
        const map = {
            photo_like: { icon: "♥", text: "curtiu sua fotografia" },
            text_like: { icon: "♥", text: "curtiu seu post" },
            reply: { icon: "↩", text: "respondeu sua fotografia" },
            photo_reply: { icon: "📷", text: "respondeu sua fotografia com uma foto" },
            circle_added: { icon: "◎", text: "adicionou você a um círculo" },
            room_invite: { icon: "👥", text: "convidou você para uma Room" },
            friend_request: { icon: "🤝", text: "quer ser seu amigo" },
            friend_accept: { icon: "🧡", text: "aceitou seu pedido de amizade" },
            direct_message: { icon: "💬", text: "enviou uma mensagem" },
            direct_audio: { icon: "🎙️", text: "enviou um áudio" }
        };
        return map[type] || { icon: "●", text: "interagiu com você" };
    }

    async function getProfiles(ids) {
        const unique = [...new Set(ids.filter(Boolean))];
        if (!unique.length) return new Map();
        const { data, error } = await db
            .from("profiles")
            .select("id, username, name, avatar_url")
            .in("id", unique);
        if (error) return new Map();
        return new Map((data || []).map(function (p) { return [p.id, p]; }));
    }

    async function markRead(id) {
        await db
            .from("vinci_notifications")
            .update({ is_read: true })
            .eq("id", id)
            .eq("user_id", currentUser.id);
    }

    function destination(notification) {
        if (notification.type === "room_invite") return `rooms.html?invite=${encodeURIComponent(notification.room_invite_id || "")}`;
        if (notification.type === "friend_request") return 'friends.html';
        if (notification.type === "friend_accept" && notification.friendship_id) return `friendship.html?id=${encodeURIComponent(notification.friendship_id)}`;
        if ((notification.type === "direct_message" || notification.type === "direct_audio") && notification.friendship_id) return `direct-chat.html?id=${encodeURIComponent(notification.friendship_id)}`;
        if (notification.actor_id) return `profile.html?id=${encodeURIComponent(notification.actor_id)}`;
        return "index.html";
    }

    async function load() {
        list.innerHTML = '<div class="notifications-state">Carregando notificações...</div>';
        const { data, error } = await db
            .from("vinci_notifications")
            .select("id, actor_id, type, post_id, profile_post_id, reply_id, circle_id, room_id, room_invite_id, friend_request_id, friendship_id, direct_message_id, is_read, created_at")
            .eq("user_id", currentUser.id)
            .order("created_at", { ascending: false })
            .limit(100);

        if (error) {
            list.innerHTML = '<div class="notifications-state"><strong>Notificações ainda não estão disponíveis.</strong>Rode o SQL do Vinci 0.7 no Supabase.</div>';
            return;
        }

        const rows = data || [];
        if (!rows.length) {
            list.innerHTML = '<div class="notifications-state"><strong>Nada por aqui ainda.</strong>Quando alguém interagir com você, vai aparecer aqui.</div>';
            return;
        }

        const profiles = await getProfiles(rows.map(function (n) { return n.actor_id; }));
        list.innerHTML = "";

        rows.forEach(function (notification) {
            const actor = profiles.get(notification.actor_id) || {};
            const copy = copyFor(notification.type);
            const item = document.createElement("article");
            item.className = `notification-item${notification.is_read ? "" : " unread"}`;
            item.tabIndex = 0;
            item.innerHTML = `
                <img class="notification-avatar" src="${actor.avatar_url || "assets/default-avatar.png"}" alt="">
                <div class="notification-body">
                    <p><strong>@${actor.username || "vinci"}</strong> ${copy.text}.</p>
                    <time>${formatDate(notification.created_at)}</time>
                </div>
                <div class="notification-icon">${copy.icon}</div>
                ${notification.is_read ? "" : '<span class="notification-dot"></span>'}
            `;
            item.querySelector("img").onerror = function () { this.src = "assets/default-avatar.png"; };

            const open = async function () {
                if (!notification.is_read) await markRead(notification.id);
                location.assign(destination(notification));
            };
            item.addEventListener("click", open);
            item.addEventListener("keydown", function (event) {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    open();
                }
            });
            list.appendChild(item);
        });
    }

    markAll?.addEventListener("click", async function () {
        markAll.disabled = true;
        await db
            .from("vinci_notifications")
            .update({ is_read: true })
            .eq("user_id", currentUser.id)
            .eq("is_read", false);
        await load();
        markAll.disabled = false;
    });

    async function init() {
        const { data, error } = await db.auth.getUser();
        if (error || !data?.user) return;
        currentUser = data.user;
        await load();
    }
    init();
})();
