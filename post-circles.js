// =====================================
// VINCI 0.7 — CÍRCULOS NA PUBLICAÇÃO
// =====================================
(function () {
    "use strict";

    const publicInput = document.querySelector('input[name="audienceType"][value="public"]');
    const circleInput = document.querySelector('input[name="audienceType"][value="circle"]');
    const wrap = document.getElementById("circleAudienceWrap");
    const select = document.getElementById("circleAudienceSelect");
    const note = document.getElementById("circleAudienceNote");

    if (!publicInput || !circleInput || !wrap || !select) return;

    let circles = [];

    function sync() {
        const circleMode = circleInput.checked;
        wrap.classList.toggle("hidden", !circleMode);
        if (circleMode && !circles.length) {
            note.textContent = "Você ainda não tem círculos. Crie um no seu perfil antes de usar esta privacidade.";
        } else {
            note.textContent = circleMode
                ? "Somente as pessoas desse círculo (e você) poderão ver este conteúdo."
                : "";
        }
    }

    publicInput.addEventListener("change", sync);
    circleInput.addEventListener("change", sync);

    async function load() {
        const { data: authData } = await db.auth.getUser();
        const user = authData?.user;
        if (!user) return;

        const { data, error } = await db
            .from("vinci_circles")
            .select("id, name")
            .eq("owner_id", user.id)
            .order("name", { ascending: true });

        if (error) {
            select.innerHTML = '<option value="">Rode o SQL do Vinci 0.7</option>';
            circleInput.disabled = true;
            return;
        }

        circles = data || [];
        select.innerHTML = '<option value="">Escolha um círculo</option>';
        circles.forEach(function (circle) {
            const option = document.createElement("option");
            option.value = circle.id;
            option.textContent = circle.name;
            select.appendChild(option);
        });
        circleInput.disabled = circles.length === 0;
        sync();
    }

    window.VinciPostCircles = {
        getAudience: function () {
            if (circleInput.checked) {
                return {
                    audience_type: "circle",
                    circle_id: select.value || null
                };
            }
            return { audience_type: "public", circle_id: null };
        },
        isValid: function () {
            return !circleInput.checked || Boolean(select.value);
        }
    };

    load();
})();
