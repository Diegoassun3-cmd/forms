/**
 * Formulário de candidatura — Solua Imóveis
 *
 * ---------------------------------------------------------------
 * PARA PERSONALIZAR: os textos/foto/perguntas padrão abaixo (CONFIG)
 * só valem enquanto ninguém salvou nada em Configurações no /admin.
 * Depois de salvar por lá, o que estiver no banco manda — este
 * objeto vira só o "modo de segurança" caso o banco esteja vazio.
 * ---------------------------------------------------------------
 */
const CAPA_URL = "https://drive.google.com/thumbnail?id=1AQSDOAJ0f0w6NtLSyc3UzGU-DSGaUwpz&sz=w1600";

const CONFIG = {
  capa: {
    image: CAPA_URL,
    position: "center",
  },
  landing: {
    title: "Vagas para corretores (as)",
    titleSize: "normal",
    subtitle:
      "Leva menos de 5 minutos. Conte um pouco sobre sua experiência e a forma como você atua " +
      "no mercado imobiliário para darmos início à conversa.",
    buttonLabel: "Iniciar",
  },
  thanks: {
    title: "Recebemos sua candidatura!",
    message:
      "Obrigado por dedicar seu tempo. Nosso time vai analisar suas respostas e entrar em " +
      "contato pelo WhatsApp informado em breve.",
  },
  extraQuestions: [],
};

const BASE_STEPS = 5;
let TOTAL_STEPS = BASE_STEPS;
let extraQuestions = [];

/** Mescla a configuração salva no banco (se houver) por cima dos padrões locais. */
function mergeConfig(saved) {
  if (!saved || typeof saved !== "object") return CONFIG;
  return {
    capa: { ...CONFIG.capa, ...(saved.capa || {}) },
    landing: { ...CONFIG.landing, ...(saved.landing || {}) },
    thanks: { ...CONFIG.thanks, ...(saved.thanks || {}) },
    extraQuestions: Array.isArray(saved.extraQuestions) ? saved.extraQuestions : [],
  };
}

async function loadConfig() {
  try {
    const res = await fetch("/api/config");
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

function applyConfig(cfg) {
  document.getElementById("landing-image").src = cfg.capa.image;
  document.getElementById("landing-image").style.objectPosition = cfg.capa.position || "center";
  document.getElementById("landing-title").textContent = cfg.landing.title;
  document.getElementById("landing-subtitle").textContent = cfg.landing.subtitle;
  document.getElementById("btn-start").textContent = cfg.landing.buttonLabel;

  const titleEl = document.getElementById("landing-title");
  titleEl.classList.remove("title-size-small", "title-size-large");
  if (cfg.landing.titleSize === "small") titleEl.classList.add("title-size-small");
  if (cfg.landing.titleSize === "large") titleEl.classList.add("title-size-large");

  document.getElementById("thanks-image").src = cfg.capa.image;
  document.getElementById("thanks-image").style.objectPosition = cfg.capa.position || "center";
  document.getElementById("thanks-title").textContent = cfg.thanks.title;
  document.getElementById("thanks-message").textContent = cfg.thanks.message;
}

/** Monta os campos da etapa extra (perguntas configuráveis) a partir do CONFIG. */
function buildExtraStep(questions) {
  const stepEl = document.getElementById("step-extra");
  const fieldsEl = document.getElementById("step-extra-fields");
  if (!stepEl || !fieldsEl) return;

  if (!questions.length) {
    stepEl.remove();
    return;
  }

  fieldsEl.innerHTML = questions
    .map((q) => {
      const name = `extra_${q.id}`;
      const label = escapeHtml(q.label);

      if (q.type === "textarea") {
        return `<div class="field">
          <label class="field__label" for="${name}">${label}</label>
          <textarea id="${name}" name="${name}" rows="3" ${q.required ? "required" : ""}></textarea>
          <span class="field-error">Preencha esse campo.</span>
        </div>`;
      }

      if (q.type === "escolha") {
        const opts = (q.options || [])
          .map((opt, oi) => {
            const letter = String.fromCharCode(65 + oi);
            return `<div class="option">
              <input type="radio" name="${name}" id="${name}-${oi}" value="${escapeHtml(opt)}" />
              <label for="${name}-${oi}"><span class="option__letter">${letter}</span>${escapeHtml(opt)}</label>
            </div>`;
          })
          .join("");
        return `<div class="field">
          <label class="field__label">${label}</label>
          <div class="options" data-name="${name}" data-error="Selecione uma opção." ${q.required ? "" : 'data-optional="true"'}>${opts}</div>
          <span class="field-error" data-for="${name}">Selecione uma opção.</span>
        </div>`;
      }

      return `<div class="field">
        <label class="field__label" for="${name}">${label}</label>
        <input type="text" id="${name}" name="${name}" ${q.required ? "required" : ""} />
        <span class="field-error">Preencha esse campo.</span>
      </div>`;
    })
    .join("");
}

function buildProgressBars() {
  document.querySelectorAll(".progress").forEach((container) => {
    const stepEl = container.closest(".step");
    const currentStep = Number(stepEl.dataset.step);
    container.innerHTML = "";
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      const bar = document.createElement("div");
      bar.className = "progress__bar" + (i <= currentStep ? " is-filled" : "");
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

function collectExtraRespostas(fd) {
  const result = {};
  extraQuestions.forEach((q) => {
    const val = fd.get(`extra_${q.id}`);
    if (val) result[q.label] = val;
  });
  return result;
}

function collectFormData() {
  const form = document.getElementById("form");
  const fd = new FormData(form);

  return {
    nome: fd.get("nome") || "",
    email: fd.get("email") || "",
    whatsapp: fd.get("whatsapp") || "",
    cidade: fd.get("cidade") || "",
    creci: fd.get("creci") || "",
    experiencia: fd.get("experiencia") || "",
    captacao: buildCaptacaoText(fd),
    regioes: fd.get("regioes") || "",
    tiposImovel: fd.getAll("tiposImovel"),
    disponibilidade: fd.get("disponibilidade") || "",
    veiculo: fd.get("veiculo") || "",
    portfolio: fd.get("portfolio") || "",
    remuneracao: fd.get("remuneracao") || "",
    sobreVoce: fd.get("sobreVoce") || "",
    lgpd: fd.get("lgpd") || "",
    extraRespostas: collectExtraRespostas(fd),
    website: fd.get("website") || "", // honeypot
  };
}

function buildCaptacaoText(fd) {
  const resposta = fd.get("captacaoResposta") || "";
  const comentario = (fd.get("captacaoComentario") || "").trim();
  return comentario ? `${resposta} — ${comentario}` : resposta;
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
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(collectFormData()),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Não foi possível enviar sua candidatura. Tente novamente.");
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

  extraQuestions = cfg.extraQuestions || [];
  TOTAL_STEPS = BASE_STEPS + (extraQuestions.length > 0 ? 1 : 0);

  applyConfig(cfg);
  buildExtraStep(extraQuestions);
  buildProgressBars();
  showStep(1);

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
