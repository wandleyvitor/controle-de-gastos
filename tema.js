// Personalização: cor principal, modo claro/escuro e nome do painel.
// Carregado no <head> para aplicar o tema antes da página aparecer, sem piscar.
(function () {
  const prefsKey = "controle-gastos-preferencias";
  const defaults = { name: "Meus gastos", accent: "#963a68", mode: "claro" };
  const presets = [
    ["Rosa", "#963a68"],
    ["Azul", "#2a6fc9"],
    ["Verde", "#2f7d5b"],
    ["Roxo", "#6a4bc4"],
    ["Laranja", "#c25a1c"],
    ["Grafite", "#3f4a57"],
  ];
  const isHex = (v) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

  function clean(p) {
    const out = { ...defaults };
    if (p && typeof p === "object") {
      if (
        typeof p.name === "string" &&
        p.name.trim() &&
        p.name.trim().length <= 40
      )
        out.name = p.name.trim();
      if (isHex(p.accent)) out.accent = p.accent.toLowerCase();
      if (p.mode === "claro" || p.mode === "escuro") out.mode = p.mode;
    }
    return out;
  }

  function load() {
    try {
      return clean(JSON.parse(localStorage.getItem(prefsKey) || "null"));
    } catch {
      return { ...defaults };
    }
  }

  // Luminância relativa (WCAG) para decidir o texto sobre a cor e o quanto escurecer o topo.
  function luminance(hex) {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  let prefs = load();

  function apply(p) {
    const root = document.documentElement;
    const lum = luminance(p.accent);
    root.style.setProperty("--accent", p.accent);
    root.style.setProperty("--on-accent", lum > 0.35 ? "#1b1219" : "#fff");
    const headerMix = lum > 0.5 ? 35 : lum > 0.25 ? 50 : 68;
    root.style.setProperty(
      "--header",
      p.mode === "escuro"
        ? `color-mix(in oklch, ${p.accent} 45%, #0d0c0e)`
        : `color-mix(in oklch, ${p.accent} ${headerMix}%, #000)`,
    );
    root.dataset.mode = p.mode;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta)
      meta.content =
        getComputedStyle(root).getPropertyValue("--header").trim() || p.accent;
    const title = document.getElementById("title");
    if (title) title.textContent = p.name;
    document.title = p.name;
  }

  function save(p) {
    prefs = clean(p);
    apply(prefs);
    try {
      localStorage.setItem(prefsKey, JSON.stringify(prefs));
    } catch {}
  }

  apply(prefs);

  function openPanel() {
    const before = { ...prefs };
    const overlay = document.createElement("div");
    overlay.className = "dialog-overlay";
    const box = document.createElement("form");
    box.className = "dialog-box custom-box";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", "custom-title");

    const h = document.createElement("h2");
    h.id = "custom-title";
    h.textContent = "Personalizar";

    // Nome
    const nameLabel = document.createElement("label");
    nameLabel.className = "text-field";
    nameLabel.textContent = "Nome do painel";
    const nameInput = document.createElement("input");
    nameInput.id = "custom-name";
    nameInput.maxLength = 40;
    nameInput.value = prefs.name;
    nameInput.placeholder = defaults.name;
    nameInput.oninput = () =>
      save({ ...prefs, name: nameInput.value || defaults.name });
    nameLabel.append(nameInput);

    // Cor
    const colors = document.createElement("fieldset");
    const colorsLegend = document.createElement("legend");
    colorsLegend.textContent = "Cor";
    const swatches = document.createElement("div");
    swatches.className = "swatches";
    const picker = document.createElement("input");
    picker.type = "color";
    picker.id = "custom-color";
    picker.value = prefs.accent;
    const pickerLabel = document.createElement("label");
    pickerLabel.className = "color-field";
    pickerLabel.append(picker, document.createTextNode("Escolher outra cor"));
    function markSwatches() {
      for (const b of swatches.children)
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.color === prefs.accent),
        );
      picker.value = prefs.accent;
    }
    for (const [label, color] of presets) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "swatch";
      b.dataset.color = color;
      b.style.background = color;
      b.setAttribute("aria-label", label);
      b.title = label;
      b.onclick = () => {
        save({ ...prefs, accent: color });
        markSwatches();
      };
      swatches.append(b);
    }
    picker.oninput = () => {
      save({ ...prefs, accent: picker.value });
      markSwatches();
    };
    colors.append(colorsLegend, swatches, pickerLabel);

    // Modo
    const modes = document.createElement("fieldset");
    const modesLegend = document.createElement("legend");
    modesLegend.textContent = "Aparência";
    const seg = document.createElement("div");
    seg.className = "segmented";
    for (const [value, label] of [
      ["claro", "Claro"],
      ["escuro", "Escuro"],
    ]) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.mode = value;
      b.textContent = label;
      b.onclick = () => {
        save({ ...prefs, mode: value });
        markModes();
      };
      seg.append(b);
    }
    function markModes() {
      for (const b of seg.children)
        b.setAttribute("aria-pressed", String(b.dataset.mode === prefs.mode));
    }
    modes.append(modesLegend, seg);

    // Botões
    const buttons = document.createElement("div");
    buttons.className = "custom-buttons";
    const reset = document.createElement("button");
    reset.type = "button";
    reset.textContent = "Restaurar padrão";
    reset.onclick = () => {
      save({ ...defaults });
      nameInput.value = prefs.name;
      markSwatches();
      markModes();
    };
    const right = document.createElement("div");
    right.className = "segmented";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancelar";
    cancel.onclick = () => {
      save(before);
      close();
    };
    const done = document.createElement("button");
    done.type = "submit";
    done.className = "primary";
    done.textContent = "Pronto";
    right.append(cancel, done);
    buttons.append(reset, right);

    box.append(h, nameLabel, colors, modes, buttons);
    overlay.append(box);
    document.body.append(overlay);
    markSwatches();
    markModes();

    function close() {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
      document.getElementById("customize")?.focus();
    }
    function onKey(e) {
      if (e.key === "Escape") cancel.click();
    }
    document.addEventListener("keydown", onKey);
    box.onsubmit = (e) => {
      e.preventDefault();
      close();
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };
    nameInput.focus();
  }

  document.addEventListener("DOMContentLoaded", () => {
    apply(prefs);
    document.getElementById("customize")?.addEventListener("click", openPanel);
  });

  // Usado pelo backup: as preferências vão junto no arquivo exportado.
  window.temaPreferencias = {
    get: () => ({ ...prefs }),
    set: (p) => save(p),
  };
})();
