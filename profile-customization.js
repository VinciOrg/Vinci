// =====================================
// VINCI 0.7.4 — PERSONALIZAÇÃO DE PERFIL
// =====================================
(function () {
    "use strict";

    const DEFAULTS = {
        accent_color: "#f28b3c",
        banner_url: null,
        name_font: "default"
    };

    const VALID_FONTS = [
        "default",
        "elegant",
        "mono",
        "soft",
        "classic",
        "pixel",
        "arcade",
        "cute",
        "bubble",
        "script",
        "hand"
    ];

    const profileCard = document.getElementById("profileCard");
    const profileBanner = document.getElementById("profileBanner");
    const profileName = document.getElementById("profileName");
    const profileUsername = document.getElementById("profileUsername");
    const profileAvatar = document.getElementById("avatar");
    const avatarLetter = document.getElementById("avatarLetter");

    const customizeButton = document.getElementById("customizeProfile");
    const customizeModal = document.getElementById("customizeModal");
    const closeCustomizeModal = document.getElementById("closeCustomizeModal");
    const bannerInput = document.getElementById("bannerInput");
    const chooseBanner = document.getElementById("chooseBanner");
    const removeBanner = document.getElementById("removeBanner");
    const accentInput = document.getElementById("profileAccentColor");
    const colorSwatches = document.getElementById("profileColorSwatches");
    const nameFontOptions = document.getElementById("nameFontOptions");
    const saveButton = document.getElementById("saveCustomization");
    const message = document.getElementById("customizeMessage");

    const preview = document.getElementById("customizePreview");
    const previewBanner = document.getElementById("customizePreviewBanner");
    const previewAvatar = document.getElementById("customizePreviewAvatar");
    const previewName = document.getElementById("customizePreviewName");
    const previewUsername = document.getElementById("customizePreviewUsername");

    let authUser = null;
    let viewedProfileId = null;
    let savedCustomization = { ...DEFAULTS };
    let draftCustomization = { ...DEFAULTS };
    let selectedBannerFile = null;
    let selectedBannerPreviewURL = null;
    let removeBannerRequested = false;

    function safeColor(value) {
        return /^#[0-9a-f]{6}$/i.test(String(value || ""))
            ? String(value).toLowerCase()
            : DEFAULTS.accent_color;
    }

    function safeFont(value) {
        return VALID_FONTS.includes(value)
            ? value
            : DEFAULTS.name_font;
    }

    function hexToRgba(hex, alpha) {
        const clean = safeColor(hex).slice(1);
        const r = parseInt(clean.slice(0, 2), 16);
        const g = parseInt(clean.slice(2, 4), 16);
        const b = parseInt(clean.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function normalizeCustomization(row) {
        return {
            accent_color: safeColor(row?.accent_color),
            banner_url: row?.banner_url || null,
            name_font: safeFont(row?.name_font)
        };
    }

    function setNameFont(element, fontName) {
        if (!element) return;

        VALID_FONTS.forEach(function (font) {
            element.classList.remove(`profile-name-font-${font}`);
        });

        element.classList.add(`profile-name-font-${safeFont(fontName)}`);
    }

    function setBanner(element, url, accent, previewMode) {
        if (!element) return;

        if (url) {
            element.style.backgroundImage = `url("${String(url).replace(/"/g, "%22")}")`;
            element.style.backgroundSize = "cover";
            element.style.backgroundPosition = "center";
            if (!previewMode) element.classList.add("has-image");
        }
        else {
            element.style.backgroundImage = `linear-gradient(135deg, ${accent}, ${hexToRgba(accent, 0.16)})`;
            element.style.backgroundSize = "cover";
            element.style.backgroundPosition = "center";
            if (!previewMode) element.classList.remove("has-image");
        }
    }

    function applyCustomization(customization) {
        const custom = normalizeCustomization(customization);

        if (profileCard) {
            profileCard.style.setProperty("--profile-accent", custom.accent_color);
            profileCard.style.setProperty("--profile-accent-soft", hexToRgba(custom.accent_color, 0.14));
            profileCard.style.setProperty("--profile-accent-faint", hexToRgba(custom.accent_color, 0.07));
        }

        setBanner(profileBanner, custom.banner_url, custom.accent_color, false);
        setNameFont(profileName, custom.name_font);
    }

    async function loadCustomization() {
        const { data, error } = await db
            .from("profile_customization")
            .select("user_id, accent_color, banner_url, name_font")
            .eq("user_id", viewedProfileId)
            .maybeSingle();

        if (error) {
            console.warn("VINCI — personalização ainda não disponível:", error.message);
            savedCustomization = { ...DEFAULTS };
        }
        else {
            savedCustomization = normalizeCustomization(data || DEFAULTS);
        }

        applyCustomization(savedCustomization);
    }

    function getCurrentBannerForPreview() {
        if (removeBannerRequested) return null;
        if (selectedBannerPreviewURL) return selectedBannerPreviewURL;
        return savedCustomization.banner_url;
    }

    function refreshSwatches() {
        if (!colorSwatches) return;

        colorSwatches
            .querySelectorAll(".color-swatch")
            .forEach(function (button) {
                button.classList.toggle(
                    "selected",
                    safeColor(button.dataset.color) === safeColor(draftCustomization.accent_color)
                );
            });
    }

    function refreshFontButtons() {
        if (!nameFontOptions) return;

        nameFontOptions
            .querySelectorAll(".name-font-option")
            .forEach(function (button) {
                button.style.setProperty("--selected-accent", draftCustomization.accent_color);
                button.classList.toggle(
                    "selected",
                    button.dataset.font === draftCustomization.name_font
                );
            });
    }

    function updatePreview() {
        if (!preview) return;

        const accent = safeColor(draftCustomization.accent_color);

        preview.style.setProperty("--preview-accent", accent);
        preview.style.setProperty("--preview-soft", hexToRgba(accent, 0.16));

        setBanner(
            previewBanner,
            getCurrentBannerForPreview(),
            accent,
            true
        );

        if (previewName) {
            previewName.textContent = profileName?.textContent?.trim() || "Seu nome";
            setNameFont(previewName, draftCustomization.name_font);
        }

        if (previewUsername) {
            previewUsername.textContent = profileUsername?.textContent?.trim() || "@usuario";
        }

        if (previewAvatar) {
            const avatarBackground = profileAvatar?.style?.backgroundImage;

            if (avatarBackground && avatarBackground !== "none") {
                previewAvatar.style.backgroundImage = avatarBackground;
                previewAvatar.style.backgroundSize = "cover";
                previewAvatar.style.backgroundPosition = "center";
                previewAvatar.textContent = "";
            }
            else {
                previewAvatar.style.backgroundImage = "none";
                previewAvatar.style.backgroundColor = accent;
                previewAvatar.textContent = avatarLetter?.textContent?.trim() || "V";
            }
        }

        if (accentInput) accentInput.value = accent;
        refreshSwatches();
        refreshFontButtons();
    }

    function resetDraft() {
        draftCustomization = { ...savedCustomization };
        selectedBannerFile = null;
        removeBannerRequested = false;

        if (selectedBannerPreviewURL) {
            URL.revokeObjectURL(selectedBannerPreviewURL);
            selectedBannerPreviewURL = null;
        }

        if (bannerInput) bannerInput.value = "";
        if (message) message.textContent = "";

        updatePreview();
    }

    function openModal() {
        resetDraft();
        customizeModal?.classList.remove("hidden");
        document.body.classList.add("modal-open");
    }

    function closeModal() {
        customizeModal?.classList.add("hidden");
        document.body.classList.remove("modal-open");
        resetDraft();
    }

    function validateBanner(file) {
        const allowed = ["image/jpeg", "image/png", "image/webp"];

        if (!allowed.includes(file.type)) {
            return "Escolha uma imagem JPG, PNG ou WEBP.";
        }

        if (file.size > 5 * 1024 * 1024) {
            return "O banner precisa ter no máximo 5 MB.";
        }

        return null;
    }

    async function uploadBanner(file) {
        const extension = (file.name.split(".").pop() || "jpg")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");

        const path = `${authUser.id}/banner.${extension}`;

        const { error } = await db.storage
            .from("avatars")
            .upload(path, file, {
                contentType: file.type,
                cacheControl: "3600",
                upsert: true
            });

        if (error) throw error;

        const { data } = db.storage
            .from("avatars")
            .getPublicUrl(path);

        return `${data.publicUrl}?t=${Date.now()}`;
    }

    async function saveCustomization() {
        if (!authUser || viewedProfileId !== authUser.id) return;

        saveButton.disabled = true;
        if (message) message.textContent = "Salvando personalização...";

        try {
            let bannerURL = savedCustomization.banner_url;

            if (removeBannerRequested) {
                bannerURL = null;
            }

            if (selectedBannerFile) {
                if (message) message.textContent = "Enviando banner...";
                bannerURL = await uploadBanner(selectedBannerFile);
            }

            const payload = {
                user_id: authUser.id,
                accent_color: safeColor(draftCustomization.accent_color),
                banner_url: bannerURL,
                name_font: safeFont(draftCustomization.name_font),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await db
                .from("profile_customization")
                .upsert(payload, { onConflict: "user_id" })
                .select("user_id, accent_color, banner_url, name_font")
                .single();

            if (error) throw error;

            savedCustomization = normalizeCustomization(data);
            applyCustomization(savedCustomization);

            if (message) message.textContent = "Personalização salva! ✓";

            setTimeout(function () {
                customizeModal?.classList.add("hidden");
                document.body.classList.remove("modal-open");
                resetDraft();
            }, 700);
        }
        catch (error) {
            console.error("VINCI — erro ao personalizar perfil:", error);

            if (message) {
                if (String(error?.message || "").includes("profile_customization")) {
                    message.textContent = "Rode o SQL da personalização no Supabase primeiro.";
                }
                else {
                    message.textContent = "Não foi possível salvar a personalização.";
                }
            }
        }
        finally {
            saveButton.disabled = false;
        }
    }

    async function init() {
        if (!profileCard) return;

        const { data, error } = await db.auth.getUser();

        if (error || !data?.user) return;

        authUser = data.user;

        const params = new URLSearchParams(location.search);
        viewedProfileId = params.get("id") || authUser.id;

        if (customizeButton) {
            customizeButton.style.display = viewedProfileId === authUser.id ? "" : "none";
        }

        await loadCustomization();
    }

    customizeButton?.addEventListener("click", openModal);
    closeCustomizeModal?.addEventListener("click", closeModal);

    customizeModal?.addEventListener("click", function (event) {
        if (event.target === customizeModal) closeModal();
    });

    chooseBanner?.addEventListener("click", function () {
        bannerInput?.click();
    });

    bannerInput?.addEventListener("change", async function () {
        let file = this.files?.[0];
        if (!file) return;

        const validationError = validateBanner(file);

        if (validationError) {
            if (message) message.textContent = validationError;
            this.value = "";
            return;
        }

        if (window.VinciImageCropper?.open) {
            try {
                const croppedFile = await window.VinciImageCropper.open(file, {
                    kind: "banner",
                    aspect: 3.5,
                    outputWidth: 1750,
                    outputHeight: 500,
                    title: "Enquadrar banner"
                });

                if (!croppedFile) {
                    this.value = "";
                    return;
                }

                file = croppedFile;
            } catch (cropError) {
                console.error("Erro ao enquadrar banner:", cropError);
                if (message) message.textContent = "Não foi possível preparar esse banner.";
                this.value = "";
                return;
            }
        }

        if (selectedBannerPreviewURL) {
            URL.revokeObjectURL(selectedBannerPreviewURL);
        }

        selectedBannerFile = file;
        selectedBannerPreviewURL = URL.createObjectURL(file);
        removeBannerRequested = false;

        if (message) message.textContent = "Banner enquadrado e pronto para salvar.";
        updatePreview();
    });

    removeBanner?.addEventListener("click", function () {
        selectedBannerFile = null;
        removeBannerRequested = true;

        if (selectedBannerPreviewURL) {
            URL.revokeObjectURL(selectedBannerPreviewURL);
            selectedBannerPreviewURL = null;
        }

        if (bannerInput) bannerInput.value = "";
        if (message) message.textContent = "O banner será removido ao salvar.";
        updatePreview();
    });

    accentInput?.addEventListener("input", function () {
        draftCustomization.accent_color = safeColor(this.value);
        updatePreview();
    });

    colorSwatches?.addEventListener("click", function (event) {
        const button = event.target.closest(".color-swatch");
        if (!button) return;

        draftCustomization.accent_color = safeColor(button.dataset.color);
        updatePreview();
    });

    nameFontOptions?.addEventListener("click", function (event) {
        const button = event.target.closest(".name-font-option");
        if (!button) return;

        draftCustomization.name_font = safeFont(button.dataset.font);
        updatePreview();
    });

    saveButton?.addEventListener("click", saveCustomization);

    init();
})();
