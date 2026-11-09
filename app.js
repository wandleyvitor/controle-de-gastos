function askUI(message, initial) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "dialog-overlay";
    const box = document.createElement("form");
    box.className = "dialog-box";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    const title = document.createElement("label");
    title.textContent = message;
    const field = document.createElement("input");
    field.type = "text";
    field.value = initial || "";
    field.required = true;
    title.append(field);
    const buttons = document.createElement("div");
    buttons.className = "dialog-buttons";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancelar";
    const save = document.createElement("button");
    save.type = "submit";
    save.className = "primary";
    save.textContent = "Continuar";
    buttons.append(cancel, save);
    box.append(title, buttons);
    overlay.append(box);
    document.body.append(overlay);
    function finish(result) {
      overlay.remove();
      resolve(result);
    }
    cancel.onclick = () => finish(null);
    box.onsubmit = (e) => {
      e.preventDefault();
      finish(field.value);
    };
    field.focus();
    field.select();
  });
}
const $ = (id) => document.getElementById(id),
  key = "controle-pessoal-lista-v1",
  money = (c) =>
    (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
// Lê valores no formato brasileiro: "1.250,00", "1250,5", "R$ 89,90" ou "1250.50".
function parseBRL(raw) {
  let s = String(raw)
    .trim()
    .replace(/^R\$\s*/i, "")
    .replace(/\s/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  return Math.round(Number(s) * 100);
}
const initial = [];
// Dados de exemplo fictícios, carregados na primeira visita para mostrar o sistema funcionando.
const exampleId = (n) => "exemplo-" + n;
const today = new Date().toISOString().slice(0, 10);
const example = [
  {
    id: exampleId(1),
    name: "Aluguel",
    cents: 120000,
    group: "fixed",
    status: "paid",
    estimate: false,
  },
  {
    id: exampleId(2),
    name: "Internet",
    cents: 9990,
    group: "fixed",
    status: "paid",
    estimate: false,
  },
  {
    id: exampleId(3),
    name: "Energia",
    cents: 18640,
    group: "fixed",
    status: "pending",
    estimate: true,
  },
  {
    id: exampleId(4),
    name: "Mercado do mês",
    cents: 90000,
    group: "fixed",
    status: "unknown",
    estimate: false,
    budget: true,
    expenses: [
      { id: exampleId("4a"), description: "Feira", cents: 14230, date: today },
      {
        id: exampleId("4b"),
        description: "Supermercado",
        cents: 31875,
        date: today,
      },
    ],
  },
  {
    id: exampleId(5),
    name: "Plano de saúde",
    cents: 28900,
    group: "fixed",
    status: "pending",
    estimate: false,
    healthExtras: true,
    expenses: [
      {
        id: exampleId("5a"),
        description: "Consulta",
        cents: 15000,
        date: today,
        status: "paid",
      },
    ],
  },
  {
    id: exampleId(6),
    name: "Notebook",
    cents: 34990,
    group: "other",
    status: "pending",
    estimate: false,
    installment: 4,
    installments: 10,
  },
  {
    id: exampleId(7),
    name: "Curso online",
    cents: 12900,
    group: "other",
    status: "unknown",
    estimate: false,
  },
  {
    id: exampleId(8),
    name: "Presente de aniversário",
    cents: 8500,
    group: "other",
    status: "pending",
    estimate: false,
  },
];
const demoKey = "controle-gastos-exemplo";
function valid(a) {
  return (
    Array.isArray(a) &&
    a.length <= 5000 &&
    new Set(a.map((x) => x.id)).size === a.length &&
    a.every(
      (x) =>
        typeof x.id === "string" &&
        typeof x.name === "string" &&
        x.name.length > 0 &&
        x.name.length <= 120 &&
        Number.isSafeInteger(x.cents) &&
        x.cents >= 0 &&
        ["fixed", "other"].includes(x.group) &&
        ["paid", "pending", "unknown"].includes(x.status) &&
        typeof x.estimate === "boolean" &&
        (x.budget === undefined || typeof x.budget === "boolean") &&
        (x.healthExtras === undefined || typeof x.healthExtras === "boolean") &&
        (x.installments === undefined ||
          (Number.isInteger(x.installments) &&
            x.installments >= 2 &&
            x.installments <= 120 &&
            Number.isInteger(x.installment) &&
            x.installment >= 1 &&
            x.installment <= x.installments)) &&
        (x.expenses === undefined ||
          (Array.isArray(x.expenses) &&
            x.expenses.every(
              (e) =>
                typeof e.id === "string" &&
                typeof e.description === "string" &&
                typeof e.date === "string" &&
                Number.isSafeInteger(e.cents) &&
                e.cents > 0 &&
                (e.status === undefined ||
                  ["paid", "pending", "unknown"].includes(e.status)),
            ))),
    )
  );
}
let accounts = structuredClone(initial);
let showingExample = false;
try {
  let saved = localStorage.getItem(key);
  if (saved === null) {
    accounts = structuredClone(example);
    showingExample = true;
    localStorage.setItem(key, JSON.stringify(accounts));
    localStorage.setItem(demoKey, "1");
  } else if (localStorage.getItem(demoKey) === "1") showingExample = true;
  if (saved) {
    const data = JSON.parse(saved);
    if (valid(data)) accounts = data;
    else
      $("toast").textContent =
        "Não foi possível ler os registros salvos. Você pode restaurar um backup.";
  }
} catch {
  $("toast").textContent = "Não foi possível acessar os registros salvos.";
}
const spent = (a) => (a.expenses || []).reduce((n, e) => n + e.cents, 0);
function budgetUI(a, value, state) {
  value.replaceChildren();
  let available = a.cents - spent(a);
  let box = document.createElement("div");
  box.className = "budget-values";
  for (let [label, amount, kind] of [
    ["Limite", a.cents, "limit"],
    ["Gasto", spent(a), "used"],
    [
      available < 0 ? "Excedido" : "Disponível",
      Math.abs(available),
      available < 0 ? "over" : "available",
    ],
  ]) {
    let metric = document.createElement("div");
    metric.className = "budget-metric " + kind;
    let caption = document.createElement("small");
    caption.textContent = label;
    let number = document.createElement("strong");
    number.textContent = money(amount);
    metric.append(caption, number);
    box.append(metric);
  }
  value.append(box);
  let track = document.createElement("div");
  track.className = "budget-track";
  track.setAttribute("role", "img");
  track.setAttribute(
    "aria-label",
    money(spent(a)) + " gastos de " + money(a.cents),
  );
  let fill = document.createElement("div");
  fill.style.width =
    Math.min(
      100,
      a.cents > 0 ? (spent(a) / a.cents) * 100 : spent(a) > 0 ? 100 : 0,
    ) + "%";
  if (available < 0) fill.style.background = "var(--danger)";
  track.append(fill);
  value.append(track);
  let add = document.createElement("button");
  add.className = "smallbtn primary";
  add.textContent = "+ Registrar gasto";
  add.onclick = async () => {
    let description = await askUI("Com o que gastou? Ex.: combustível");
    if (description === null) return;
    description = description.trim();
    if (!description || description.length > 120) {
      alert("Informe uma descrição de até 120 caracteres.");
      return;
    }
    let raw = await askUI("Quanto gastou (R$)?");
    if (raw === null) return;
    let cents = parseBRL(raw);
    if (!Number.isSafeInteger(cents) || cents <= 0) {
      alert("Informe um valor maior que zero.");
      return;
    }
    persist(
      accounts.map((x) =>
        x.id === a.id
          ? {
              ...x,
              expenses: [
                ...(x.expenses || []),
                {
                  id: crypto.randomUUID(),
                  description,
                  cents,
                  date: new Date().toISOString().slice(0, 10),
                },
              ],
            }
          : x,
      ),
    );
  };
  state.append(add);
  let details = document.createElement("details"),
    summary = document.createElement("summary");
  summary.textContent = "Lançamentos (" + (a.expenses || []).length + ")";
  details.className = "expense-history";
  details.append(summary);
  for (let e of a.expenses || []) {
    let row = document.createElement("div");
    row.className = "muted";
    row.textContent = e.description + " · " + money(e.cents) + " ";
    let del = document.createElement("button");
    del.textContent = "Remover";
    del.className = "smallbtn";
    del.onclick = () => {
      if (confirm("Remover este lançamento?"))
        persist(
          accounts.map((x) =>
            x.id === a.id
              ? { ...x, expenses: x.expenses.filter((y) => y.id !== e.id) }
              : x,
          ),
        );
    };
    row.append(del);
    details.append(row);
  }
  state.append(details);
}
function healthUI(a, value, state) {
  value.replaceChildren();
  let box = document.createElement("div");
  box.className = "budget-values";
  for (let [label, amount] of [
    ["Mensalidade", a.cents],
    ["Consultas e exames", spent(a)],
    ["Total", a.cents + spent(a)],
  ]) {
    let m = document.createElement("div");
    m.className = "budget-metric";
    let cap = document.createElement("small");
    cap.textContent = label;
    let strong = document.createElement("strong");
    strong.textContent = money(amount);
    m.append(cap, strong);
    box.append(m);
  }
  value.append(box);
  let add = document.createElement("button");
  add.className = "smallbtn primary";
  add.textContent = "+ Consulta ou exame";
  add.style.marginTop = "8px";
  add.onclick = async () => {
    let description = await askUI("Descrição: consulta, exame ou outro gasto");
    if (description === null) return;
    description = description.trim();
    if (!description || description.length > 120) {
      alert("Informe uma descrição de até 120 caracteres.");
      return;
    }
    let raw = await askUI("Valor (R$):");
    if (raw === null) return;
    let cents = parseBRL(raw);
    if (!Number.isSafeInteger(cents) || cents <= 0) {
      alert("Informe um valor maior que zero.");
      return;
    }
    persist(
      accounts.map((x) =>
        x.id === a.id
          ? {
              ...x,
              expenses: [
                ...(x.expenses || []),
                {
                  id: crypto.randomUUID(),
                  description,
                  cents,
                  date: new Date().toISOString().slice(0, 10),
                  status: "pending",
                },
              ],
            }
          : x,
      ),
    );
  };
  state.append(add);
  let details = document.createElement("details"),
    summary = document.createElement("summary");
  summary.textContent =
    "Consultas e exames (" + (a.expenses || []).length + ")";
  details.className = "expense-history";
  details.append(summary);
  for (let e of a.expenses || []) {
    let row = document.createElement("div");
    row.className = "muted";
    row.textContent = e.description + " · " + money(e.cents) + " ";
    let sel = document.createElement("select");
    sel.setAttribute("aria-label", "Situação de " + e.description);
    for (let [v, t] of [
      ["paid", "✅ Pago"],
      ["pending", "⏳ Pendente"],
      ["unknown", "❓ Confirmar"],
    ])
      sel.add(new Option(t, v));
    sel.value = e.status || "pending";
    sel.onchange = () =>
      persist(
        accounts.map((x) =>
          x.id === a.id
            ? {
                ...x,
                expenses: x.expenses.map((y) =>
                  y.id === e.id ? { ...y, status: sel.value } : y,
                ),
              }
            : x,
        ),
      );
    let del = document.createElement("button");
    del.className = "smallbtn";
    del.textContent = "Remover";
    del.onclick = () => {
      if (confirm("Remover este lançamento?"))
        persist(
          accounts.map((x) =>
            x.id === a.id
              ? { ...x, expenses: x.expenses.filter((y) => y.id !== e.id) }
              : x,
          ),
        );
    };
    row.append(sel, del);
    details.append(row);
  }
  state.append(details);
}
function persist(next) {
  try {
    localStorage.setItem(key, JSON.stringify(next));
    accounts = next;
    render();
    $("toast").textContent = "Alterações salvas neste navegador.";
    return true;
  } catch {
    $("toast").textContent =
      "Não foi possível salvar. Exporte um backup antes de sair.";
    return false;
  }
}
const sum = (a) =>
  a.reduce(
    (n, x) =>
      n + (x.budget ? spent(x) : x.cents + (x.healthExtras ? spent(x) : 0)),
    0,
  );
function render() {
  renderResumo();
  for (let status of ["paid", "pending", "unknown"])
    $(status).textContent = money(
      accounts
        .filter((x) => !x.budget && x.status === status)
        .reduce((n, x) => n + x.cents, 0) +
        accounts
          .filter((x) => x.healthExtras && !x.budget)
          .reduce(
            (n, x) =>
              n +
              (x.expenses || [])
                .filter((e) => (e.status || "pending") === status)
                .reduce((v, e) => v + e.cents, 0),
            0,
          ) +
        (status === "paid"
          ? accounts.filter((x) => x.budget).reduce((n, x) => n + spent(x), 0)
          : 0),
    );
  $("total").textContent = money(sum(accounts));
  $("lists").replaceChildren();
  for (let [group, title] of [
    ["fixed", "Contas fixas mensais"],
    ["other", "Outros gastos e parcelas"],
  ]) {
    let section = document.createElement("section");
    section.className = "panel";
    let h = document.createElement("h2");
    h.textContent = title;
    section.append(h);
    let p = document.createElement("p");
    p.className = "muted";
    p.textContent =
      "Altere a situação de cada conta. Use Editar para corrigir o valor ou Excluir para remover a conta da lista e dos totais.";
    section.append(p);
    let wrap = document.createElement("div");
    wrap.className = "tablewrap";
    let table = document.createElement("table");
    table.innerHTML =
      "<thead><tr><th>Conta</th><th>Valor</th><th>Situação</th><th></th></tr></thead>";
    let body = document.createElement("tbody");
    let rows = accounts.filter((x) => x.group === group);
    for (let a of rows) {
      let tr = document.createElement("tr"),
        name = document.createElement("td"),
        value = document.createElement("td"),
        state = document.createElement("td"),
        actions = document.createElement("td");
      name.textContent = a.name + (a.estimate ? " *" : "");
      value.textContent = money(a.cents);
      value.className = "account-value";
      name.className = "account-name";
      state.className = "account-status";
      actions.className = "account-actions";
      let select = document.createElement("select");
      select.className = a.status;
      select.setAttribute("aria-label", "Situação de " + a.name);
      for (let [v, t] of [
        ["paid", "✅ Pago"],
        ["pending", "⏳ Pendente"],
        ["unknown", "❓ Confirmar"],
      ]) {
        let o = new Option(t, v);
        select.add(o);
      }
      select.value = a.status;
      select.onchange = () => {
        if (
          !persist(
            accounts.map((x) =>
              x.id === a.id ? { ...x, status: select.value } : x,
            ),
          )
        )
          select.value = a.status;
      };
      if (
        Number.isInteger(a.installments) &&
        a.installments > 1 &&
        Number.isInteger(a.installment) &&
        a.installment >= 1 &&
        a.installment <= a.installments
      ) {
        const info = document.createElement("div");
        info.className = "muted";
        info.textContent =
          "Parcela " +
          a.installment +
          " de " +
          a.installments +
          " · Total da compra: " +
          money(a.cents * a.installments);
        value.append(info);
        if (a.status === "paid" && a.installment < a.installments) {
          const advance = document.createElement("button");
          advance.className = "smallbtn";
          advance.textContent = "Próxima parcela";
          advance.onclick = () =>
            persist(
              accounts.map((x) =>
                x.id === a.id
                  ? { ...x, installment: a.installment + 1, status: "pending" }
                  : x,
              ),
            );
          state.append(advance);
        }
      }
      if (a.budget) budgetUI(a, value, state);
      else {
        state.append(select);
        if (a.healthExtras) healthUI(a, value, state);
      }
      let edit = document.createElement("button");
      edit.textContent = "Editar";
      edit.className = "smallbtn";
      edit.onclick = async () => {
        let raw = await askUI(
          (a.budget ? "Limite de " : "Valor de ") + a.name + " (R$):",
          (a.cents / 100).toFixed(2).replace(".", ","),
        );
        if (raw === null) return;
        let cents = parseBRL(raw);
        if (!Number.isSafeInteger(cents) || cents < 0) {
          alert("Informe um valor válido. Ex.: 1.250,00");
          return;
        }
        persist(
          accounts.map((x) =>
            x.id === a.id ? { ...x, cents, estimate: false } : x,
          ),
        );
      };
      let remove = document.createElement("button");
      remove.textContent = "Excluir";
      remove.className = "smallbtn";
      remove.style.color = "var(--danger)";
      remove.style.marginTop = "5px";
      remove.setAttribute("aria-label", "Excluir " + a.name);
      remove.onclick = () => {
        if (confirm("Excluir " + a.name + " da lista e dos totais?"))
          persist(accounts.filter((x) => x.id !== a.id));
      };
      let mode = document.createElement("button");
      mode.className = "smallbtn";
      mode.textContent = a.budget ? "Usar como conta" : "Usar como limite";
      mode.onclick = () => {
        if (a.healthExtras) {
          alert("Esta conta inclui mensalidade e gastos adicionais.");
          return;
        }
        if (a.budget && (a.expenses || []).length) {
          alert("Remova os lançamentos antes de transformar em conta.");
          return;
        }
        if (
          confirm(
            a.budget
              ? "Voltar a tratar como uma conta com valor a pagar?"
              : "Tratar este valor como limite, sem considerá-lo uma dívida? Os gastos serão registrados separadamente.",
          )
        )
          persist(
            accounts.map((x) =>
              x.id === a.id
                ? { ...x, budget: !x.budget, expenses: [], status: "unknown" }
                : x,
            ),
          );
      };
      let menu = document.createElement("details"),
        label = document.createElement("summary");
      label.textContent = "Opções";
      menu.className = "account-menu";
      menu.append(label, edit);
      if (!a.healthExtras && !a.installments) menu.append(mode);
      menu.append(remove);
      actions.append(menu);
      tr.append(name, value, state, actions);
      body.append(tr);
    }
    table.append(body);
    let foot = document.createElement("tfoot"),
      r = document.createElement("tr"),
      l = document.createElement("td"),
      v = document.createElement("td");
    l.textContent = "Total do grupo";
    v.textContent = money(sum(rows));
    r.append(l, v);
    foot.append(r);
    table.append(foot);
    wrap.append(table);
    section.append(wrap);
    if (!rows.length) {
      let note = document.createElement("p");
      note.className = "muted";
      note.textContent =
        "Nenhum lançamento neste grupo. Adicione uma conta abaixo para começar.";
      section.append(note);
    }
    $("lists").append(section);
  }
}
$("add").onsubmit = async (e) => {
  e.preventDefault();
  let name = $("name").value.trim(),
    cents = Math.round(Number($("amount").value) * 100);
  if (!name || !Number.isSafeInteger(cents) || cents <= 0) return;
  const type = $("kind").value,
    extra = {};
  if (type === "limit") {
    extra.budget = true;
    extra.expenses = [];
  }
  if (type === "extras") {
    extra.healthExtras = true;
    extra.expenses = [];
  }
  if (type === "parcel") {
    const raw = await askUI("Quantidade de parcelas (2 a 120):");
    if (raw === null) return;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 2 || n > 120) {
      $("toast").textContent = "Informe uma quantidade entre 2 e 120.";
      return;
    }
    extra.installment = 1;
    extra.installments = n;
  }
  if (
    persist([
      ...accounts,
      {
        id: crypto.randomUUID(),
        name,
        cents,
        group: $("group").value,
        status: "pending",
        estimate: false,
        ...extra,
      },
    ])
  ) {
    $("name").value = "";
    $("amount").value = "";
  }
};
$("export").onclick = () => {
  const preferences = window.temaPreferencias?.get();
  const b = new Blob(
      [JSON.stringify({ version: 1, accounts, preferences }, null, 2)],
      {
        type: "application/json",
      },
    ),
    url = URL.createObjectURL(b),
    a = document.createElement("a");
  a.href = url;
  a.download = "meus-gastos-backup.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("import").onclick = () => $("file").click();
$("file").onchange = async (e) => {
  try {
    if (!e.target.files[0]) return;
    let data = JSON.parse(await e.target.files[0].text());
    if (data.version !== 1 || !valid(data.accounts)) throw Error();
    if (confirm("Substituir as contas desta tela pelo backup?")) {
      if (persist(data.accounts)) setExample(false);
      if (data.preferences) window.temaPreferencias?.set(data.preferences);
    }
  } catch {
    alert("Backup inválido. Use o backup completo desta tela.");
  } finally {
    e.target.value = "";
  }
};
// Resumo em gráficos: situação do total (pago, pendente, a confirmar) e peso de cada conta.
const statusInfo = [
  ["paid", "✅", "Já pago", "var(--st-pago)"],
  ["pending", "⏳", "Pendente", "var(--st-pendente)"],
  ["unknown", "❓", "A confirmar", "var(--st-confirmar)"],
];
function statusTotal(status) {
  return (
    accounts
      .filter((x) => !x.budget && x.status === status)
      .reduce((n, x) => n + x.cents, 0) +
    accounts
      .filter((x) => x.healthExtras && !x.budget)
      .reduce(
        (n, x) =>
          n +
          (x.expenses || [])
            .filter((e) => (e.status || "pending") === status)
            .reduce((v, e) => v + e.cents, 0),
        0,
      ) +
    (status === "paid"
      ? accounts.filter((x) => x.budget).reduce((n, x) => n + spent(x), 0)
      : 0)
  );
}
const pct = (v, total) =>
  (total ? (v / total) * 100 : 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 0,
  }) + "%";
function showTip(target, text, evt) {
  const tip = $("dica");
  tip.textContent = text;
  tip.hidden = false;
  const r = target.getBoundingClientRect();
  const x =
    evt && evt.clientX !== undefined ? evt.clientX : r.left + r.width / 2;
  const y = evt && evt.clientY !== undefined ? evt.clientY : r.top;
  tip.style.left =
    Math.max(
      8,
      Math.min(innerWidth - tip.offsetWidth - 8, x - tip.offsetWidth / 2),
    ) + "px";
  tip.style.top = Math.max(8, y - tip.offsetHeight - 12) + "px";
}
function withTip(el, text) {
  el.tabIndex = 0;
  el.setAttribute("aria-label", text);
  el.onpointermove = (e) => showTip(el, text, e);
  el.onpointerleave = () => ($("dica").hidden = true);
  el.onfocus = () => showTip(el, text);
  el.onblur = () => ($("dica").hidden = true);
}
function renderResumo() {
  const total = sum(accounts);
  $("resumo-vazio").hidden = total > 0;
  $("resumo-graficos").hidden = total === 0;
  if (!total) return;

  // 1. Barra dividida por situação
  const box = $("g-situacao");
  box.replaceChildren();
  const bar = document.createElement("div");
  bar.className = "st-bar";
  const legend = document.createElement("ul");
  legend.className = "st-legend";
  for (const [status, icon, label, color] of statusInfo) {
    const v = statusTotal(status);
    const text = `${label}: ${money(v)} (${pct(v, total)} do total)`;
    if (v > 0) {
      const seg = document.createElement("div");
      seg.style.flex = String(v);
      seg.style.background = color;
      withTip(seg, text);
      bar.append(seg);
    }
    const li = document.createElement("li");
    const sw = document.createElement("i");
    sw.style.background = color;
    const name = document.createElement("span");
    name.textContent = `${icon} ${label}`;
    const val = document.createElement("strong");
    val.textContent = pct(v, total);
    li.append(sw, name, val);
    legend.append(li);
  }
  box.append(bar, legend);

  // 2. Contas que mais pesam (até 6; o resto vira "Outras")
  const list = $("g-contas");
  list.replaceChildren();
  const items = accounts
    .map((x) => ({
      name: x.name,
      value: x.budget ? spent(x) : x.cents + (x.healthExtras ? spent(x) : 0),
      note: x.budget ? " (gasto no limite)" : "",
    }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
  const shown = items.slice(0, 6);
  const rest = items.slice(6);
  if (rest.length)
    shown.push({
      name: `Outras (${rest.length})`,
      value: rest.reduce((n, x) => n + x.value, 0),
      note: "",
    });
  const max = Math.max(...shown.map((x) => x.value));
  for (const it of shown) {
    const row = document.createElement("div");
    row.className = "conta-row";
    const name = document.createElement("span");
    name.className = "conta-nome";
    name.textContent = it.name;
    const track = document.createElement("div");
    track.className = "conta-track";
    const fill = document.createElement("div");
    fill.className = "conta-fill";
    fill.style.width = Math.max(2, (it.value / max) * 100) + "%";
    track.append(fill);
    const val = document.createElement("span");
    val.className = "conta-valor";
    val.textContent = pct(it.value, total);
    withTip(
      row,
      `${it.name}${it.note}: ${money(it.value)} (${pct(it.value, total)} do total)`,
    );
    row.append(name, track, val);
    list.append(row);
  }
}

function setExample(on) {
  showingExample = on;
  try {
    if (on) localStorage.setItem(demoKey, "1");
    else localStorage.removeItem(demoKey);
  } catch {}
  $("example-bar").hidden = !on;
}
$("start-empty").onclick = () => {
  if (confirm("Apagar os dados de exemplo e começar com a lista vazia?")) {
    if (persist([])) setExample(false);
    $("toast").textContent = "Lista vazia. Adicione sua primeira conta abaixo.";
  }
};
setExample(showingExample);
render();
