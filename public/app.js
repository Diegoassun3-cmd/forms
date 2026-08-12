/**
 * Formulário de candidatura — Solua Imóveis
 *
 * ---------------------------------------------------------------
 * PARA PERSONALIZAR TEXTOS E FOTOS: edite apenas o objeto CONFIG
 * abaixo. Troque as imagens colocando os arquivos em /public/images
 * e apontando `image` para o novo caminho (ex.: "/images/foto.jpg").
 * ---------------------------------------------------------------
 */
const CONFIG = {
  landing: {
    image: "/images/placeholder.svg",
    eyebrow: "Solua Imóveis",
    title: "Vagas para corretores(as) parceiros(as)",
    subtitle:
      "Leva menos de 5 minutos. Conte um pouco sobre sua experiência e a forma como você atua " +
      "no mercado imobiliário para darmos início à conversa.",
    buttonLabel: "Iniciar",
  },
  thanks: {
    image: "/images/placeholder.svg",
    title: "Recebemos sua candidatura!",
    message:
      "Obrigado por dedicar seu tempo. Nosso time vai analisar suas respostas e entrar em " +
      "contato pelo WhatsApp informado em breve.",
  },
};

const TOTAL_STEPS = 5;

function applyConfig() {
  document.getElementById("landing-image").src = CONFIG.landing.image;
  document.getElementById("landing-eyebrow").textContent = CONFIG.landing.eyebrow;
  document.getElementById("landing-title").textContent = CONFIG.landing.title;
  document.getElementById("landing-subtitle").textContent = CONFIG.landing.subtitle;
  document.getElementById("btn-start").textContent = CONFIG.landing.buttonLabel;

  document.getElementById("thanks-image").src = CONFIG.thanks.image;
  document.getElementById("thanks-title").textContent = CONFIG.thanks.title;
  document.getElementById("thanks-message").textContent = CONFIG.thanks.message;
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

  // grupos de opções (radio / checkbox) obrigatórios
  stepEl.querySelectorAll(".options[data-name]").forEach((group) => {
    const name = group.dataset.name;
    const isMulti = group.dataset.multi === "true";
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

function init() {
  applyConfig();
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
