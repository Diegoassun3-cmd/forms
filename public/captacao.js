/**
 * Formulário de Captação de imóveis — Solua Imóveis
 *
 * Mesma lógica de navegação/validação dos outros formulários (public/app.js e
 * public/indicacao.js), com um pequeno grupo condicional: o campo "Valor pretendido" só aparece
 * (e só é obrigatório) quando a pessoa responde "Sim" pra "Você já tem um valor em mente?".
 *
 * PARA PERSONALIZAR: os valores padrão abaixo (CONFIG) só valem enquanto ninguém salvou nada em
 * Configurações (aba Captação) no /admin. Depois de salvar por lá, o que estiver no banco manda —
 * este objeto vira só o "modo de segurança" caso o banco esteja vazio ou fora do ar.
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
    title: "Seu imóvel, novos caminhos.",
    titleSize: "normal",
    subtitle:
      "Quer vender ou alugar seu imóvel? Deixe seus dados e as informações básicas da " +
      "propriedade. A equipe Solua vai entrar em contato para entender seu objetivo e apresentar " +
      "as melhores possibilidades.",
    buttonLabel: "Cadastrar meu imóvel",
    textAlign: "left",
    textPosition: "bottom",
  },
  thanks: {
    title: "Recebemos os dados do seu imóvel!",
    message:
      "Nossa equipe vai analisar as informações e entrar em contato em breve para conversar " +
      "sobre as melhores possibilidades para vender ou alugar seu imóvel.",
    textAlign: "center",
    textPosition: "center",
    whatsappNumber: "",
    whatsappMessage: "Olá! Acabei de cadastrar meu imóvel no site da Solua.",
  },
  extraPages: [],
};

const BASE_STEPS = 5;
let TOTAL_STEPS = BASE_STEPS;
let extraPages = [];

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
    const res = await fetch("/api/config?form=captacao", { cache: "no-store" });
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

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
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

function applyWhatsappButton(cfg) {
  const btn = document.getElementById("thanks-whatsapp");
  const number = digitsOnly(cfg.thanks.whatsappNumber);
  if (!number) {
    btn.classList.add("hidden");
    return;
  }
  const text = encodeURIComponent(cfg.thanks.whatsappMessage || "");
  btn.href = `https://wa.me/${number}${text ? `?text=${text}` : ""}`;
  btn.classList.remove("hidden");
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
  applyWhatsappButton(cfg);
  applyFooter(document.getElementById("thanks-footer"), cfg);

  const thanksContent = document.querySelector(".thanks__content");
  setTextAlign(thanksContent, cfg.thanks.textAlign);
  setTextPosition(thanksContent, cfg.thanks.textPosition);
}

/** HTML de um único campo de pergunta extra, de acordo com o tipo configurado (igual aos outros forms). */
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
  document.getElementById("btn-next").textContent = n === TOTAL_STEPS ? "Enviar" : "Avançar";
  window.scrollTo(0, 0);
}

function setFieldError(fieldEl, hasError) {
  fieldEl.classList.toggle("has-error", hasError);
}

/** "Valor pretendido" só aparece (e só é obrigatório) quando a pessoa responde "Sim". */
function updateValorGroup(temValor) {
  document.querySelectorAll(".cond-group").forEach((group) => {
    const active = (group.dataset.cond || "") === temValor;
    group.classList.toggle("hidden", !active);
    group.querySelectorAll("input[data-required-if-active], textarea[data-required-if-active]").forEach((input) => {
      input.required = active;
    });
  });
}

/** Valida a etapa atual; retorna true se pode avançar. */
function validateStep(n) {
  let valid = true;
  const stepEl = document.querySelector(`.step[data-step="${n}"]`);
  if (!stepEl) return true;

  // inputs de texto/textarea simples com atributo required
  stepEl.querySelectorAll("input[required], textarea[required]").forEach((input) => {
    const fieldEl = input.closest(".field");
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

function collectFormData() {
  const form = document.getElementById("form");
  const fd = new FormData(form);

  return {
    nome: fd.get("nome") || "",
    whatsapp: fd.get("whatsapp") || "",
    email: fd.get("email") || "",
    objetivo: fd.get("objetivo") || "",
    cep: fd.get("cep") || "",
    endereco: fd.get("endereco") || "",
    numero: fd.get("numero") || "",
    complemento: fd.get("complemento") || "",
    bairro: fd.get("bairro") || "",
    cidade: fd.get("cidade") || "",
    tipoImovel: fd.get("tipoImovel") || "",
    temValor: fd.get("temValor") || "",
    valorPretendido: fd.get("valorPretendido") || "",
    lgpd: fd.get("lgpd") || "",
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
    const res = await fetch("/api/captacao/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(collectFormData()),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Não foi possível enviar o cadastro. Tente novamente.");
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

  document.querySelectorAll('input[name="temValor"]').forEach((input) => {
    input.addEventListener("change", () => updateValorGroup(input.value));
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
    if (!validateStep(currentStep)) return;

    if (currentStep < TOTAL_STEPS) {
      showStep(currentStep + 1);
    } else {
      await submitForm();
    }
  });

  // Enter não deve enviar o form prematuramente (exceto em textarea, que já quebra linha)
  document.getElementById("form").addEventListener("submit", (e) => e.preventDefault());
}

document.addEventListener("DOMContentLoaded", init);
