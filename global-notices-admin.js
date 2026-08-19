// =====================================
// VINCI — ADMIN DE AVISOS GLOBAIS
// =====================================

(() => {
  const ADMINS_FILE = "notice-admins.json";
  const TABLE = "vinci_global_notices";
  const FUNCTION_NAME = "vinci-global-notice-admin";

  const DEFAULT_NOTICE = {
    singleton_key: "global",
    enabled: true,
    title: "Aviso do Vinci",
    message: "Escreva aqui o aviso que aparecerá para todos.",
    background_color: "#171717",
    text_color: "#ffffff",
    accent_color: "#f28b3c",
    border_color: "#f28b3c",
    font_family: "system",
    position: "top-center",
    size: "medium",
    animation: "slide",
    icon: "info",
    border_radius: 18,
    opacity: 1,
    dismissible: true,
    auto_close_seconds: 0,
    action_enabled: false,
    action_label: "Saiba mais",
    action_url: ""
  };

  let currentUser = null;
  let currentUsername = "";
  let modal = null;
  let form = null;
  let publishButton = null;
  let messageEl = null;

  function normalizeUsername(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/^@/, "");
  }

  async function fetchAdmins() {
    const response = await fetch(`${ADMINS_FILE}?v=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Não foi possível carregar a lista de administradores.");
    }

    const data = await response.json();
    return Array.isArray(data?.admins) ? data.admins : [];
  }

  function userIsAdmin(admins) {
    const userId = currentUser?.id || "";
    const username = normalizeUsername(currentUsername);

    return admins.some((entry) => {
      if (typeof entry === "string") {
        return normalizeUsername(entry) === username;
      }

      const allowedId = String(entry?.user_id || "").trim();
      const allowedUsername = normalizeUsername(entry?.username);

      return (
        (allowedId && allowedId === userId) ||
        (allowedUsername && allowedUsername === username)
      );
    });
  }

  function ownProfileIsOpen() {
    const idParam = new URLSearchParams(location.search).get("id");
    return !idParam || idParam === currentUser?.id;
  }

  function makeField(label, control, full = false) {
    const wrapper = document.createElement("label");
    wrapper.className = `vinci-notice-admin-field${full ? " full" : ""}`;

    const title = document.createElement("span");
    title.textContent = label;

    wrapper.append(title, control);
    return wrapper;
  }

  function makeInput(name, type = "text", attrs = {}) {
    const input = document.createElement("input");
    input.name = name;
    input.type = type;

    for (const [key, value] of Object.entries(attrs)) {
      if (key in input) input[key] = value;
      else input.setAttribute(key, value);
    }

    return input;
  }

  function makeSelect(name, options) {
    const select = document.createElement("select");
    select.name = name;

    options.forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });

    return select;
  }

  function createModal() {
    modal = document.createElement("div");
    modal.className = "vinci-notice-admin-modal hidden";
    modal.setAttribute("aria-hidden", "true");

    const panel = document.createElement("section");
    panel.className = "vinci-notice-admin-panel";

    const head = document.createElement("header");
    head.className = "vinci-notice-admin-head";
    head.innerHTML = `
      <div>
        <span>Vinci Admin</span>
        <h2>Avisos globais</h2>
      </div>
    `;

    const close = document.createElement("button");
    close.type = "button";
    close.className = "vinci-notice-admin-close";
    close.setAttribute("aria-label", "Fechar");
    close.textContent = "×";
    close.addEventListener("click", closeModal);
    head.appendChild(close);

    const body = document.createElement("div");
    body.className = "vinci-notice-admin-body";

    form = document.createElement("form");
    form.addEventListener("submit", (event) => event.preventDefault());

    const grid = document.createElement("div");
    grid.className = "vinci-notice-admin-grid";

    const titleInput = makeInput("title", "text", { maxLength: 90, placeholder: "Título do aviso" });
    const messageInput = document.createElement("textarea");
    messageInput.name = "message";
    messageInput.maxLength = 1200;
    messageInput.placeholder = "Mensagem do aviso...";

    grid.append(
      makeField("Título", titleInput, true),
      makeField("Mensagem", messageInput, true),
      makeField("Posição", makeSelect("position", [
        ["top-left", "Topo — esquerda"],
        ["top-center", "Topo — centro"],
        ["top-right", "Topo — direita"],
        ["bottom-left", "Rodapé — esquerda"],
        ["bottom-center", "Rodapé — centro"],
        ["bottom-right", "Rodapé — direita"]
      ])),
      makeField("Fonte", makeSelect("font_family", [
        ["system", "Padrão Vinci"],
        ["serif", "Serifada"],
        ["mono", "Monoespaçada"],
        ["rounded", "Arredondada"],
        ["elegant", "Elegante"]
      ])),
      makeField("Tamanho", makeSelect("size", [
        ["small", "Pequeno"],
        ["medium", "Médio"],
        ["large", "Grande"]
      ])),
      makeField("Animação", makeSelect("animation", [
        ["slide", "Deslizar"],
        ["fade", "Suave"],
        ["scale", "Escala"],
        ["none", "Sem animação"]
      ])),
      makeField("Ícone", makeSelect("icon", [
        ["info", "Informação"],
        ["warning", "Alerta"],
        ["success", "Sucesso"],
        ["maintenance", "Manutenção"],
        ["none", "Sem ícone"]
      ])),
      makeField("Fechar automaticamente (segundos)", makeInput("auto_close_seconds", "number", { min: 0, max: 120, step: 1 }))
    );

    const radius = makeInput("border_radius", "range", { min: 0, max: 40, step: 1 });
    const radiusOutput = document.createElement("output");
    const radiusWrap = document.createElement("div");
    radiusWrap.className = "vinci-notice-admin-range";
    radiusWrap.append(radius, radiusOutput);
    grid.appendChild(makeField("Arredondamento", radiusWrap));

    const opacity = makeInput("opacity", "range", { min: 0.65, max: 1, step: 0.01 });
    const opacityOutput = document.createElement("output");
    const opacityWrap = document.createElement("div");
    opacityWrap.className = "vinci-notice-admin-range";
    opacityWrap.append(opacity, opacityOutput);
    grid.appendChild(makeField("Opacidade", opacityWrap));

    const colors = document.createElement("div");
    colors.className = "vinci-notice-admin-colors";

    [
      ["background_color", "Fundo"],
      ["text_color", "Texto"],
      ["accent_color", "Destaque"],
      ["border_color", "Borda"]
    ].forEach(([name, label]) => {
      const wrapper = document.createElement("label");
      wrapper.className = "vinci-notice-color-control";
      wrapper.textContent = label;
      wrapper.appendChild(makeInput(name, "color"));
      colors.appendChild(wrapper);
    });

    const switches = document.createElement("div");
    switches.className = "vinci-notice-admin-switches";

    [
      ["enabled", "Aviso ativo"],
      ["dismissible", "Usuário pode fechar"],
      ["action_enabled", "Mostrar botão/link"]
    ].forEach(([name, label]) => {
      const wrapper = document.createElement("label");
      wrapper.className = "vinci-notice-switch";
      const input = makeInput(name, "checkbox");
      wrapper.append(input, document.createTextNode(label));
      switches.appendChild(wrapper);
    });

    const actionLabel = makeInput("action_label", "text", { maxLength: 40, placeholder: "Ex.: Saiba mais" });
    const actionUrl = makeInput("action_url", "url", { maxLength: 500, placeholder: "https://..." });

    grid.append(
      colors,
      switches,
      makeField("Texto do botão", actionLabel),
      makeField("Link do botão", actionUrl)
    );

    messageEl = document.createElement("p");
    messageEl.className = "vinci-notice-admin-message";

    form.append(grid, messageEl);
    body.appendChild(form);

    const actions = document.createElement("footer");
    actions.className = "vinci-notice-admin-actions";

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.textContent = "Restaurar padrão";
    resetButton.addEventListener("click", () => {
      fillForm(DEFAULT_NOTICE);
      preview();
    });

    const previewButton = document.createElement("button");
    previewButton.type = "button";
    previewButton.textContent = "Pré-visualizar";
    previewButton.addEventListener("click", preview);

    const disableButton = document.createElement("button");
    disableButton.type = "button";
    disableButton.className = "danger";
    disableButton.textContent = "Desativar aviso";
    disableButton.addEventListener("click", () => publish({ forceDisabled: true }));

    publishButton = document.createElement("button");
    publishButton.type = "button";
    publishButton.className = "primary";
    publishButton.textContent = "Publicar aviso";
    publishButton.addEventListener("click", () => publish({ forceDisabled: false }));

    actions.append(resetButton, previewButton, disableButton, publishButton);
    panel.append(head, body, actions);
    modal.appendChild(panel);
    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });

    radius.addEventListener("input", () => {
      radiusOutput.value = `${radius.value}px`;
    });

    opacity.addEventListener("input", () => {
      opacityOutput.value = `${Math.round(Number(opacity.value) * 100)}%`;
    });

    form.addEventListener("input", () => {
      radiusOutput.value = `${form.elements.border_radius.value}px`;
      opacityOutput.value = `${Math.round(Number(form.elements.opacity.value) * 100)}%`;
    });
  }

  function collectForm() {
    const elements = form.elements;

    return {
      singleton_key: "global",
      enabled: elements.enabled.checked,
      title: elements.title.value.trim(),
      message: elements.message.value.trim(),
      background_color: elements.background_color.value,
      text_color: elements.text_color.value,
      accent_color: elements.accent_color.value,
      border_color: elements.border_color.value,
      font_family: elements.font_family.value,
      position: elements.position.value,
      size: elements.size.value,
      animation: elements.animation.value,
      icon: elements.icon.value,
      border_radius: Number(elements.border_radius.value),
      opacity: Number(elements.opacity.value),
      dismissible: elements.dismissible.checked,
      auto_close_seconds: Number(elements.auto_close_seconds.value || 0),
      action_enabled: elements.action_enabled.checked,
      action_label: elements.action_label.value.trim(),
      action_url: elements.action_url.value.trim()
    };
  }

  function fillForm(raw = {}) {
    const data = { ...DEFAULT_NOTICE, ...raw };
    const elements = form.elements;

    Object.entries(data).forEach(([key, value]) => {
      const control = elements[key];
      if (!control) return;

      if (control.type === "checkbox") {
        control.checked = Boolean(value);
      } else {
        control.value = value ?? "";
      }
    });

    form.dispatchEvent(new Event("input", { bubbles: true }));
  }

  async function loadCurrentNotice() {
    messageEl.textContent = "Carregando aviso atual...";

    const { data, error } = await db
      .from(TABLE)
      .select("*")
      .eq("singleton_key", "global")
      .maybeSingle();

    if (error) {
      fillForm(DEFAULT_NOTICE);
      messageEl.textContent = "O banco de avisos ainda não foi configurado. Você ainda pode testar a prévia.";
      return;
    }

    fillForm(data || DEFAULT_NOTICE);
    messageEl.textContent = data
      ? `Editando o aviso atual. Administrador: @${currentUsername}`
      : "Nenhum aviso publicado ainda.";
  }

  function preview() {
    const config = collectForm();
    window.VinciGlobalNotices?.renderPreview(config);
    messageEl.textContent = "Prévia aberta. Nada foi publicado ainda.";
  }

  async function publish({ forceDisabled }) {
    const config = collectForm();

    // O botão Publicar sempre coloca o aviso no ar.
    // Para removê-lo, existe o botão separado "Desativar aviso".
    config.enabled = !forceDisabled;

    if (form?.elements?.enabled) {
      form.elements.enabled.checked = config.enabled;
    }

    if (!config.title) {
      messageEl.textContent = "Coloque um título no aviso.";
      return;
    }

    if (!config.message) {
      messageEl.textContent = "Escreva a mensagem do aviso.";
      return;
    }

    publishButton.disabled = true;
    messageEl.textContent = forceDisabled
      ? "Desativando aviso..."
      : "Publicando para todos...";

    try {
      const { data, error } = await db.functions.invoke(FUNCTION_NAME, {
        body: config
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Falha ao publicar.");

      messageEl.textContent = forceDisabled
        ? "Aviso desativado para todos."
        : "Aviso ATIVADO e publicado para todos. As telas abertas recebem a mudança em tempo real.";

      await window.VinciGlobalNotices?.load(true);
    } catch (error) {
      console.error("Vinci Notice Admin:", error);
      messageEl.textContent = "Não foi possível publicar. Confira se o SQL e a Edge Function do pacote foram instalados no Supabase.";
    } finally {
      publishButton.disabled = false;
    }
  }

  async function openModal() {
    if (!modal) createModal();

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    await loadCurrentNotice();
  }

  function closeModal() {
    if (!modal) return;

    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    window.VinciGlobalNotices?.close();
    window.VinciGlobalNotices?.load(false);
  }

  function insertAdminButton() {
    const actions = document.querySelector(".profile-actions");
    if (!actions || document.getElementById("manageGlobalNotices")) return;

    const button = document.createElement("button");
    button.id = "manageGlobalNotices";
    button.type = "button";
    button.className = "button secondary vinci-notice-admin-button";
    button.textContent = "Avisos globais";
    button.addEventListener("click", openModal);
    actions.appendChild(button);
  }

  async function start() {
    if (typeof db === "undefined") return;

    try {
      const { data, error } = await db.auth.getUser();
      if (error || !data?.user) return;

      currentUser = data.user;
      if (!ownProfileIsOpen()) return;

      const { data: profile, error: profileError } = await db
        .from("profiles")
        .select("username")
        .eq("id", currentUser.id)
        .single();

      if (profileError || !profile?.username) return;
      currentUsername = normalizeUsername(profile.username);

      const admins = await fetchAdmins();
      if (!userIsAdmin(admins)) return;

      insertAdminButton();
    } catch (error) {
      console.warn("Vinci: painel de avisos indisponível.", error.message);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
