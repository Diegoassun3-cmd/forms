/**
 * Formulário de Indicação — Solua Imóveis
 *
 * Mesma lógica de navegação/validação do formulário de vagas (public/app.js), mas com uma
 * etapa condicional: as perguntas da etapa 3 mudam de acordo com o tipo de indicação escolhido
 * na etapa 1 (imóvel, seguro ou consórcio) — assim quem indica um seguro não vê perguntas de
 * imóvel, e vice-versa.
 *
 * PARA PERSONALIZAR: os valores padrão abaixo (CONFIG) só valem enquanto ninguém salvou nada
 * em Configurações (aba Indicações) no /admin. Depois de salvar por lá, o que estiver no banco
 * manda — este objeto vira só o "modo de segurança" caso o banco esteja vazio ou fora do ar.
 */

const CAPA_URL = "https://drive.google.com/thumbnail?id=1AQSDOAJ0f0w6NtLSyc3UzGU-DSGaUwpz&sz=w1600";

const CONFIG = {
  footer: "Solua Imobiliária — Imóveis • Consórcios • Seguros — 25 anos ao seu lado.",
  capa: {
    image: CAPA_URL,
    position: "center",
    gradient: true,
  },
  logo: {
    image: "",
    position: "top-left",
    size: "medio",
  },
  landing: {
    title: "Uma indicação pode virar comissão.",
    titleSize: "normal",
    subtitle:
      "Conhece alguém que quer vender ou alugar um imóvel, contratar um seguro ou fazer um " +
      "consórcio? Indique para a Solua. A gente cuida do atendimento e, se fechar negócio, sua " +
      "indicação pode virar comissão.",
    buttonLabel: "Quero fazer uma indicação",
    textAlign: "left",
    textPosition: "bottom",
  },
  thanks: {
    title: "Indicação recebida. 💙",
    message:
      "Agora é com a Solua. Nossa equipe vai entrar em contato com a pessoa indicada e entender " +
      "como podemos ajudar. Se fechar negócio, sua indicação pode virar comissão. Obrigado por " +
      "indicar a Solua.",
    textAlign: "center",
    textPosition: "center",
  },
  extraPages: [],
};

const BASE_STEPS = 5;
let TOTAL_STEPS = BASE_STEPS;
let extraPages = [];

// Dá pra indicar mais de uma pessoa/oportunidade no mesmo envio (até MAX_INDICACOES). As etapas
// 1-3 preenchem uma indicação por vez; "+ Adicionar outra indicação" guarda a atual e limpa os
// campos pra receber a próxima, sem perder o que já foi preenchido.
const MAX_INDICACOES = 5;
let indicacoesBatch = [];

/** Mescla a configuração salva no banco (se houver) por cima dos padrões locais. */
function mergeConfig(saved) {
  if (!saved || typeof saved !== "object") return CONFIG;

  return {
    footer: typeof saved.footer === "string" ? saved.footer : CONFIG.footer,
    capa: { ...CONFIG.capa, ...(saved.capa || {}) },
    logo: { ...CONFIG.logo, ...(saved.logo || {}) },
    landing: { ...CONFIG.landing, ...(saved.landing || {}) },
    thanks: { ...CONFIG.thanks, ...(saved.thanks || {}) },
    extraPages: Array.isArray(saved.extraPages) ? saved.extraPages : [],
  };
}

async function loadConfig() {
  try {
    const res = await fetch("/api/config?form=indicacao", { cache: "no-store" });
    if (!res.ok) return CONFIG;
    const data = await res.json();
    return mergeConfig(data.config);
  } catch {
    return CONFIG; // offline ou API fora do ar: segue com os padrões locais
  }
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

function setTextAlign(el, align) {
  el.classList.remove("text-align-left", "text-align-center", "text-align-right");
  el.classList.add(`text-align-${["left", "center", "right"].includes(align) ? align : "left"}`);
}

function setTextPosition(el, position) {
  el.classList.remove("text-pos-top", "text-pos-center", "text-pos-bottom");
  el.classList.add(`text-pos-${["top", "center", "bottom"].includes(position) ? position : "bottom"}`);
}

const LOGO_POSITIONS = ["top-left", "top-center", "top-right", "center", "bottom-left", "bottom-right"];
const LOGO_SIZES = ["pequeno", "medio", "grande"];

function applyLogo(imgEl, cfg) {
  const hasLogo = Boolean(cfg.logo && cfg.logo.image);
  imgEl.classList.toggle("hidden", !hasLogo);
  if (!hasLogo) return;

  imgEl.src = cfg.logo.image;
  LOGO_POSITIONS.forEach((pos) => imgEl.classList.remove(`brand-logo--${pos}`));
  const position = LOGO_POSITIONS.includes(cfg.logo.position) ? cfg.logo.position : "top-left";
  imgEl.classList.add(`brand-logo--${position}`);

  LOGO_SIZES.forEach((size) => imgEl.classList.remove(`brand-logo--size-${size}`));
  const size = LOGO_SIZES.includes(cfg.logo.size) ? cfg.logo.size : "medio";
  imgEl.classList.add(`brand-logo--size-${size}`);
}

function applyFooter(el, cfg) {
  const text = (cfg.footer || "").trim();
  el.textContent = text;
  el.classList.toggle("hidden", !text);
}

function applyConfig(cfg) {
  // se a capa foi removida no admin sem colocar outra no lugar, evita quebrar a imagem no ar
  const capaImage = cfg.capa.image || CONFIG.capa.image;
  document.getElementById("landing-image").src = capaImage;
  document.getElementById("landing-image").style.objectPosition = cfg.capa.position || "center";
  document.getElementById("landing-overlay").classList.toggle("is-hidden", cfg.capa.gradient === false);
  document.getElementById("landing-title").textContent = cfg.landing.title;
  document.getElementById("landing-subtitle").textContent = cfg.landing.subtitle;
  document.getElementById("btn-start").textContent = cfg.landing.buttonLabel;
  applyLogo(document.getElementById("landing-logo"), cfg);
  applyFooter(document.getElementById("landing-footer"), cfg);

  const landingContent = document.querySelector(".hero__content");
  setTextAlign(landingContent, cfg.landing.textAlign);
  setTextPosition(landingContent, cfg.landing.textPosition);

  const titleEl = document.getElementById("landing-title");
  titleEl.classList.remove("title-size-small", "title-size-large");
  if (cfg.landing.titleSize === "small") titleEl.classList.add("title-size-small");
  if (cfg.landing.titleSize === "large") titleEl.classList.add("title-size-large");

  document.getElementById("thanks-image").src = capaImage;
  document.getElementById("thanks-image").style.objectPosition = cfg.capa.position || "center";
  document.getElementById("thanks-overlay").classList.toggle("is-hidden", cfg.capa.gradient === false);
  document.getElementById("thanks-title").textContent = cfg.thanks.title;
  document.getElementById("thanks-message").textContent = cfg.thanks.message;
  applyLogo(document.getElementById("thanks-logo"), cfg);
  applyFooter(document.getElementById("thanks-footer"), cfg);

  const thanksContent = document.querySelector(".thanks__content");
  setTextAlign(thanksContent, cfg.thanks.textAlign);
  setTextPosition(thanksContent, cfg.thanks.textPosition);
}

/** HTML de um único campo de pergunta extra, de acordo com o tipo configurado (igual ao form de vagas). */
function renderQuestionField(q) {
  const name = `extra_${q.id}`;
  const label = escapeHtml(q.label);

  if (q.type === "textarea") {
    return `<div class="field">
      <label class="field__label" for="${name}">${label}</label>
      <textarea id="${name}" name="${name}" rows="3" ${q.required ? "required" : ""}></textarea>
      <span class="field-error">Preencha esse campo.</span>
    </div>`;
  }

  if (q.type === "escolha" || q.type === "checkbox") {
    const inputType = q.type === "checkbox" ? "checkbox" : "radio";
    const opts = (q.options || [])
      .map((opt, oi) => {
        const letter = String.fromCharCode(65 + oi);
        return `<div class="option">
          <input type="${inputType}" name="${name}" id="${name}-${oi}" value="${escapeHtml(opt)}" />
          <label for="${name}-${oi}"><span class="option__letter">${letter}</span>${escapeHtml(opt)}</label>
        </div>`;
      })
      .join("");
    const errMsg = q.type === "checkbox" ? "Selecione ao menos uma opção." : "Selecione uma opção.";
    return `<div class="field">
      <label class="field__label">${label}</label>
      <div class="options" data-name="${name}" data-error="${errMsg}" ${q.required ? "" : 'data-optional="true"'}>${opts}</div>
      <span class="field-error" data-for="${name}">${errMsg}</span>
    </div>`;
  }

  if (q.type === "simnao") {
    return `<div class="field">
      <label class="field__label">${label}</label>
      <div class="options simnao" data-name="${name}" data-error="Responda sim ou não." ${q.required ? "" : 'data-optional="true"'}>
        <div class="option">
          <input type="radio" name="${name}" id="${name}-sim" value="Sim" />
          <label for="${name}-sim">Sim</label>
        </div>
        <div class="option">
          <input type="radio" name="${name}" id="${name}-nao" value="Não" />
          <label for="${name}-nao">Não</label>
        </div>
      </div>
      <span class="field-error" data-for="${name}">Responda sim ou não.</span>
    </div>`;
  }

  return `<div class="field">
    <label class="field__label" for="${name}">${label}</label>
    <input type="text" id="${name}" name="${name}" ${q.required ? "required" : ""} />
    <span class="field-error">Preencha esse campo.</span>
  </div>`;
}

/** Cria uma etapa (página) do formulário para cada página extra configurada. */
function buildExtraPages(pages) {
  document.querySelectorAll(".step[data-extra-page]").forEach((el) => el.remove());
  if (!pages.length) return;

  const form = document.getElementById("form");
  const actions = form.querySelector(".actions");

  pages.forEach((page, i) => {
    const stepNumber = BASE_STEPS + i + 1;
    const section = document.createElement("section");
    section.className = "step hidden";
    section.dataset.step = String(stepNumber);
    section.dataset.extraPage = "true";
    section.innerHTML = `
      <div class="progress"></div>
      <span class="step__eyebrow">${String(stepNumber).padStart(2, "0")}</span>
      <h2 class="step__title">${escapeHtml(page.title || "Mais perguntas")}</h2>
      <div class="extra-page-fields">
        ${(page.questions || []).map(renderQuestionField).join("")}
      </div>
    `;
    form.insertBefore(section, actions);
  });
}

function buildProgressBars() {
  document.querySelectorAll(".progress").forEach((container) => {
    const stepEl = container.closest(".step");
    const currentStepNum = Number(stepEl.dataset.step);
    container.innerHTML = "";
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      const bar = document.createElement("div");
      bar.className = "progress__bar" + (i <= currentStepNum ? " is-filled" : "");
      container.appendChild(bar);
    }
  });
}

function showScreen(name) {
  document.querySelectorAll("[data-screen]").forEach((el) => {
    el.classList.toggle("hidden", el.dataset.screen !== name);
  });
  const form = document.getElementById("form");
  form.classList.toggle("hidden", name !== "form");
  window.scrollTo(0, 0);
}

let currentStep = 1;

function showStep(n) {
  currentStep = n;
  document.querySelectorAll(".step").forEach((el) => {
    el.classList.toggle("hidden", Number(el.dataset.step) !== n);
  });
  document.getElementById("btn-back").style.visibility = n === 1 ? "hidden" : "visible";
  document.getElementById("btn-next").textContent = n === TOTAL_STEPS ? "Enviar indicação" : "Continuar";
  window.scrollTo(0, 0);
}

function setFieldError(fieldEl, hasError) {
  fieldEl.classList.toggle("has-error", hasError);
}

/**
 * Etapa 3 é condicional: mostra só o grupo de campos do tipo escolhido na etapa 1, e liga/desliga
 * a obrigatoriedade dos campos marcados com data-required-if-active só nesse grupo — assim quem
 * indica um seguro não é obrigado a preencher nada de imóvel, e vice-versa.
 */
const TITLE_BY_TIPO = {
  imovel_venda: "Sobre o imóvel",
  imovel_locacao: "Sobre o imóvel",
  seguro: "Sobre o seguro",
  consorcio: "Sobre o consórcio",
};

function updateConditionalGroup(tipo) {
  document.querySelectorAll(".cond-group").forEach((group) => {
    const conds = (group.dataset.cond || "").split(",");
    const active = conds.includes(tipo);
    group.classList.toggle("hidden", !active);

    group.querySelectorAll("input[data-required-if-active], textarea[data-required-if-active]").forEach((input) => {
      input.required = active;
    });
    group.querySelectorAll(".options[data-required-if-active]").forEach((optGroup) => {
      if (active) optGroup.removeAttribute("data-optional");
      else optGroup.dataset.optional = "true";
    });
  });

  const titleEl = document.getElementById("step3-title");
  if (titleEl) titleEl.textContent = TITLE_BY_TIPO[tipo] || "Conte um pouco sobre a oportunidade";
}

/* ---------- lote de indicações (até MAX_INDICACOES por envio) ---------- */

function collectCurrentIndicacao() {
  const form = document.getElementById("form");
  const fd = new FormData(form);
  const tipo = fd.get("tipo") || "";
  return {
    tipo,
    nomeIndicado: fd.get("nomeIndicado") || "",
    whatsappIndicado: fd.get("whatsappIndicado") || "",
    emailIndicado: fd.get("emailIndicado") || "",
    comoConhece: fd.get("comoConhece") || "",
    detalhes: collectDetalhes(fd, tipo),
  };
}

/** Limpa os campos das etapas 1-3 pra receber uma nova indicação do zero. */
function resetIndicacaoFields() {
  const form = document.getElementById("form");
  ["tipo", "comoConhece", "disponibilidadeImovel", "tipoImovel", "tipoSeguro", "tipoConsorcio"].forEach((name) => {
    form.querySelectorAll(`input[name="${name}"]`).forEach((el) => {
      el.checked = false;
    });
  });
  [
    "nomeIndicado", "whatsappIndicado", "emailIndicado", "cidadeBairro", "valorImovel",
    "detalhesImovel", "detalhesSeguro", "valorConsorcio", "detalhesConsorcio",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document
    .querySelectorAll('.step[data-step="1"] .field, .step[data-step="2"] .field, .step[data-step="3"] .field')
    .forEach((f) => f.classList.remove("has-error"));
  updateConditionalGroup("");
}

/** Não há nada preenchido ainda pra essa indicação (nem tipo, nem nome, nem WhatsApp). */
function currentDraftIsEmpty() {
  const tipo = document.querySelector('input[name="tipo"]:checked');
  const nome = document.getElementById("nomeIndicado").value.trim();
  const whats = document.getElementById("whatsappIndicado").value.trim();
  return !tipo && !nome && !whats;
}

// Índice, dentro do lote, da indicação que corresponde aos campos preenchidos agora nas etapas
// 1-3 (-1 = ainda não foi adicionada). Assim, voltar da etapa 4 pra 3 sem editar nada não duplica
// a indicação ao clicar em "Continuar" de novo — e editar um campo depois de voltar remove a
// versão antiga do lote automaticamente, pra não ficar duas cópias divergentes da mesma pessoa.
let draftBatchIndex = -1;

function markDraftDirty() {
  if (draftBatchIndex < 0) return;
  indicacoesBatch.splice(draftBatchIndex, 1);
  draftBatchIndex = -1;
  renderIndicacoesBatch();
}

function renderIndicacoesBatch() {
  const listEl = document.getElementById("indicacoes-batch-list");
  const hintEl = document.getElementById("indicacoes-batch-hint");
  const addBtn = document.getElementById("btn-add-indicacao");
  const progressHint = document.getElementById("indicacoes-progress-hint");

  listEl.innerHTML = indicacoesBatch
    .map((item, i) => {
      const tipoLabel = TITLE_BY_TIPO[item.tipo] ? TITLE_BY_TIPO[item.tipo].replace("Sobre o ", "").replace("Sobre a ", "") : item.tipo;
      return `<li>
        <span>${escapeHtml(tipoLabel)} — ${escapeHtml(item.nomeIndicado)}</span>
        <button type="button" class="item-remove" data-remove-indicacao="${i}">Remover</button>
      </li>`;
    })
    .join("");

  const atMax = indicacoesBatch.length >= MAX_INDICACOES;
  hintEl.textContent = indicacoesBatch.length
    ? `${indicacoesBatch.length}/${MAX_INDICACOES} indicações adicionadas nesse envio.`
    : `Você pode indicar até ${MAX_INDICACOES} pessoas nesse envio.`;
  addBtn.disabled = atMax;
  addBtn.textContent = atMax ? `Máximo de ${MAX_INDICACOES} indicações atingido` : "+ Adicionar outra indicação";

  if (indicacoesBatch.length) {
    progressHint.textContent = `Você já adicionou ${indicacoesBatch.length}/${MAX_INDICACOES} indicação(ões) nesse envio.`;
    progressHint.classList.remove("hidden");
  } else {
    progressHint.classList.add("hidden");
  }
}

/**
 * Chamado ao sair da etapa 3 pelo botão "Continuar": se a indicação atual já estiver no lote (e
 * nada mudou desde então), não faz nada. Se estiver vazia e já tiver pelo menos uma indicação no
 * lote, também não há nada a fazer — a pessoa só quer seguir em frente com o que já adicionou.
 * Caso contrário, valida e guarda a indicação atual no lote.
 */
function finalizeCurrentDraftIfNeeded() {
  if (draftBatchIndex >= 0) {
    return true;
  }
  if (currentDraftIsEmpty() && indicacoesBatch.length > 0) {
    return true;
  }
  if (!validateStep(3)) {
    return false;
  }
  if (indicacoesBatch.length < MAX_INDICACOES) {
    indicacoesBatch.push(collectCurrentIndicacao());
    draftBatchIndex = indicacoesBatch.length - 1;
    renderIndicacoesBatch();
  }
  return true;
}

/** Valida a etapa atual; retorna true se pode avançar. */
function validateStep(n) {
  let valid = true;
  const stepEl = document.querySelector(`.step[data-step="${n}"]`);
  if (!stepEl) return true;

  // inputs de texto/textarea simples com atributo required (e checkbox único de confirmação)
  stepEl.querySelectorAll("input[required], textarea[required]").forEach((input) => {
    const fieldEl = input.closest(".field");
    if (input.type === "checkbox") {
      const ok = input.checked;
      setFieldError(fieldEl, !ok);
      if (!ok) valid = false;
      return;
    }
    const ok = input.value.trim().length > 0;
    if (input.type === "email" && ok) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
      setFieldError(fieldEl, !emailOk);
      if (!emailOk) valid = false;
      return;
    }
    setFieldError(fieldEl, !ok);
    if (!ok) valid = false;
  });

  // grupos de opções (radio / checkbox) — obrigatórios, a menos que marcados como opcionais
  stepEl.querySelectorAll(".options[data-name]").forEach((group) => {
    if (group.dataset.optional === "true") return;

    const name = group.dataset.name;
    const checked = group.querySelectorAll(`input[name="${name}"]:checked`);
    const errorEl = stepEl.querySelector(`.field-error[data-for="${name}"]`);
    const ok = checked.length > 0;
    if (!ok) {
      valid = false;
      if (errorEl) errorEl.style.display = "block";
    } else if (errorEl) {
      errorEl.style.display = "none";
    }
  });

  return valid;
}

function allExtraQuestions() {
  return extraPages.flatMap((p) => p.questions || []);
}

function collectExtraRespostas(fd) {
  const result = {};
  allExtraQuestions().forEach((q) => {
    const name = `extra_${q.id}`;
    if (q.type === "checkbox") {
      const vals = fd.getAll(name);
      if (vals.length) result[q.label] = vals.join(", ");
      return;
    }
    const val = fd.get(name);
    if (val) result[q.label] = val;
  });
  return result;
}

/** Só os campos do tipo escolhido entram no "detalhes" — os das outras abas ficam de fora. */
function collectDetalhes(fd, tipo) {
  if (tipo === "imovel_venda" || tipo === "imovel_locacao") {
    return {
      disponibilidadeImovel: fd.get("disponibilidadeImovel") || "",
      cidadeBairro: fd.get("cidadeBairro") || "",
      tipoImovel: fd.get("tipoImovel") || "",
      valorImovel: fd.get("valorImovel") || "",
      detalhesImovel: fd.get("detalhesImovel") || "",
    };
  }
  if (tipo === "seguro") {
    return {
      tipoSeguro: fd.get("tipoSeguro") || "",
      detalhesSeguro: fd.get("detalhesSeguro") || "",
    };
  }
  if (tipo === "consorcio") {
    return {
      tipoConsorcio: fd.get("tipoConsorcio") || "",
      valorConsorcio: fd.get("valorConsorcio") || "",
      detalhesConsorcio: fd.get("detalhesConsorcio") || "",
    };
  }
  return {};
}

function collectFormData() {
  const form = document.getElementById("form");
  const fd = new FormData(form);

  return {
    indicacoes: indicacoesBatch,
    nomeIndicador: fd.get("nomeIndicador") || "",
    whatsappIndicador: fd.get("whatsappIndicador") || "",
    emailIndicador: fd.get("emailIndicador") || "",
    autorizaContato: fd.get("autorizaContato") || "",
    confirmaPermissao: fd.get("confirmaPermissao") ? "Sim" : "",
    extraRespostas: collectExtraRespostas(fd),
    website: fd.get("website") || "", // honeypot
  };
}

async function submitForm() {
  const btnNext = document.getElementById("btn-next");
  const errorBox = document.getElementById("submit-error");
  errorBox.classList.remove("is-visible");
  errorBox.textContent = "";

  const original = btnNext.innerHTML;
  btnNext.disabled = true;
  btnNext.innerHTML = '<span class="spinner"></span>Enviando…';

  try {
    const res = await fetch("/api/indicacao/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(collectFormData()),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Não foi possível enviar a indicação. Tente novamente.");
    }

    showScreen("thanks");
  } catch (err) {
    errorBox.textContent = err.message || "Erro inesperado. Tente novamente em instantes.";
    errorBox.classList.add("is-visible");
    errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
  } finally {
    btnNext.disabled = false;
    btnNext.innerHTML = original;
  }
}

async function init() {
  const cfg = await loadConfig();

  extraPages = cfg.extraPages || [];
  TOTAL_STEPS = BASE_STEPS + extraPages.length;

  applyConfig(cfg);
  buildExtraPages(extraPages);
  buildProgressBars();

  document.querySelectorAll('input[name="tipo"]').forEach((input) => {
    input.addEventListener("change", () => updateConditionalGroup(input.value));
  });

  // usado só pela pré-visualização no /admin: pula direto pro final, sem preencher nada
  const previewSkip = new URLSearchParams(window.location.search).get("preview_skip") === "1";
  if (previewSkip) {
    showScreen("thanks");
  } else {
    showStep(1);
  }

  document.getElementById("btn-start").addEventListener("click", () => {
    showScreen("form");
  });

  document.getElementById("btn-back").addEventListener("click", () => {
    if (currentStep > 1) showStep(currentStep - 1);
  });

  document.getElementById("btn-next").addEventListener("click", async () => {
    // etapa 3: guarda (ou não, se não houver nada de novo) a indicação atual no lote antes de seguir
    if (currentStep === 3) {
      if (!finalizeCurrentDraftIfNeeded()) return;
      showStep(4);
      return;
    }

    if (!validateStep(currentStep)) return;

    if (currentStep < TOTAL_STEPS) {
      showStep(currentStep + 1);
    } else {
      await submitForm();
    }
  });

  document.getElementById("btn-add-indicacao").addEventListener("click", () => {
    if (indicacoesBatch.length >= MAX_INDICACOES) return;
    if (draftBatchIndex < 0) {
      if (!validateStep(3)) return;
      indicacoesBatch.push(collectCurrentIndicacao());
    }
    renderIndicacoesBatch();
    resetIndicacaoFields();
    draftBatchIndex = -1;
    showStep(1);
  });

  document.getElementById("indicacoes-batch-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-indicacao]");
    if (!btn) return;
    const idx = Number(btn.dataset.removeIndicacao);
    indicacoesBatch.splice(idx, 1);
    if (draftBatchIndex === idx) draftBatchIndex = -1;
    else if (draftBatchIndex > idx) draftBatchIndex -= 1;
    renderIndicacoesBatch();
  });

  // qualquer edição nas etapas 1-3 depois de já ter adicionado essa indicação ao lote a remove de
  // lá — evita ficar uma cópia desatualizada enquanto a pessoa corrige um campo depois de voltar
  ["input", "change"].forEach((evt) => {
    document.getElementById("form").addEventListener(evt, (e) => {
      if (e.target.closest('.step[data-step="1"], .step[data-step="2"], .step[data-step="3"]')) {
        markDraftDirty();
      }
    });
  });

  renderIndicacoesBatch();

  // Enter não deve enviar o form prematuramente (exceto em textarea, que já quebra linha)
  document.getElementById("form").addEventListener("submit", (e) => e.preventDefault());
}

document.addEventListener("DOMContentLoaded", init);
