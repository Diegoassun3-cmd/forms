const REQUIRED_FIELDS = [
  "nome", "email", "whatsapp", "cidade", "experiencia", "captacao",
  "regioes", "disponibilidade", "remuneracao", "lgpd",
];

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function handleSubmit(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "JSON inválido." }, 400);
  }

  for (const field of REQUIRED_FIELDS) {
    if (!isNonEmptyString(body[field])) {
      return jsonResponse({ ok: false, error: `Campo obrigatório ausente: ${field}` }, 400);
    }
  }

  if (!Array.isArray(body.tiposImovel) || body.tiposImovel.length === 0) {
    return jsonResponse({ ok: false, error: "Selecione ao menos um tipo de imóvel." }, 400);
  }

  const lgpd = body.lgpd.trim().toLowerCase();
  if (lgpd !== "sim") {
    return jsonResponse(
      { ok: false, error: "É necessário autorizar o tratamento dos dados (LGPD) para enviar a candidatura." },
      400
    );
  }

  if (isNonEmptyString(body.website)) {
    return jsonResponse({ ok: true }); // honeypot: finge sucesso, não grava
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim());
  if (!emailOk) {
    return jsonResponse({ ok: false, error: "E-mail inválido." }, 400);
  }

  const now = new Date().toISOString();
  const extraRespostas = body.extraRespostas && typeof body.extraRespostas === "object" ? body.extraRespostas : {};

  if (!env.DB) {
    return jsonResponse(
      { ok: false, error: "Banco de dados não configurado neste Worker (falta o binding DB)." },
      500
    );
  }

  try {
    await env.DB.prepare(
      `INSERT INTO candidaturas
        (nome, email, whatsapp, cidade, creci, experiencia, captacao, regioes,
         tipos_imovel, disponibilidade, veiculo, portfolio, remuneracao, sobre_voce, lgpd, criado_em, extra_respostas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        body.nome.trim(),
        body.email.trim(),
        body.whatsapp.trim(),
        body.cidade.trim(),
        (body.creci || "").trim() || null,
        body.experiencia.trim(),
        body.captacao.trim(),
        body.regioes.trim(),
        body.tiposImovel.join(", "),
        body.disponibilidade.trim(),
        (body.veiculo || "").trim() || null,
        (body.portfolio || "").trim() || null,
        body.remuneracao.trim(),
        (body.sobreVoce || "").trim() || null,
        "Sim",
        now,
        Object.keys(extraRespostas).length ? JSON.stringify(extraRespostas) : null
      )
      .run();
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erro ao salvar candidatura." }, 500);
  }

  return jsonResponse({ ok: true });
}

function isAuthorizedAdmin(request, env) {
  const token = request.headers.get("x-admin-token") || "";
  return Boolean(env.ADMIN_TOKEN) && token === env.ADMIN_TOKEN;
}

async function handleAdminData(request, env) {
  if (!isAuthorizedAdmin(request, env)) {
    return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  }

  if (!env.DB) {
    return jsonResponse({ ok: false, error: "Banco de dados não configurado (falta o binding DB)." }, 500);
  }

  const { results } = await env.DB.prepare(
    "SELECT * FROM candidaturas ORDER BY criado_em DESC"
  ).all();

  return jsonResponse({ ok: true, rows: results });
}

/** Exclui uma candidatura pelo id (protegida por token). */
async function handleAdminDelete(request, env, id) {
  if (!isAuthorizedAdmin(request, env)) {
    return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  }

  if (!env.DB) {
    return jsonResponse({ ok: false, error: "Banco de dados não configurado (falta o binding DB)." }, 500);
  }

  if (!id || !/^\d+$/.test(id)) {
    return jsonResponse({ ok: false, error: "ID inválido." }, 400);
  }

  await env.DB.prepare("DELETE FROM candidaturas WHERE id = ?").bind(id).run();

  return jsonResponse({ ok: true });
}

function str(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

const QUESTION_TYPES = ["texto", "textarea", "escolha", "checkbox", "simnao"];
const QUESTION_TYPES_WITH_OPTIONS = ["escolha", "checkbox"];
const LOGO_POSITIONS = ["top-left", "top-center", "top-right", "bottom-left", "bottom-right"];
const TEXT_ALIGNS = ["left", "center", "right"];
const TEXT_POSITIONS = ["top", "center", "bottom"];

function sanitizeQuestions(rawQuestions, pagePrefix) {
  return (Array.isArray(rawQuestions) ? rawQuestions : [])
    .slice(0, 20)
    .map((q, i) => ({
      id: `${pagePrefix}q${i + 1}`,
      label: str(q && q.label, 200),
      type: QUESTION_TYPES.includes(q && q.type) ? q.type : "texto",
      options:
        q && QUESTION_TYPES_WITH_OPTIONS.includes(q.type) && Array.isArray(q.options)
          ? q.options.map((o) => str(o, 100)).filter(Boolean).slice(0, 10)
          : [],
      required: Boolean(q && q.required),
    }))
    .filter((q) => q.label);
}

function sanitizePages(rawPages) {
  return (Array.isArray(rawPages) ? rawPages : [])
    .slice(0, 10)
    .map((p, i) => ({
      id: "p" + (i + 1),
      title: str(p && p.title, 100) || `Página extra ${i + 1}`,
      questions: sanitizeQuestions(p && p.questions, `p${i + 1}_`),
    }))
    .filter((p) => p.questions.length > 0);
}

/** Valida e normaliza a configuração recebida do painel admin antes de salvar. */
function sanitizeConfig(input) {
  const landing = input && input.landing ? input.landing : {};
  const thanks = input && input.thanks ? input.thanks : {};
  const capa = input && input.capa ? input.capa : {};
  const logo = input && input.logo ? input.logo : {};

  return {
    capa: {
      image: str(capa.image, 800),
      position: ["top", "center", "bottom"].includes(capa.position) ? capa.position : "center",
      gradient: capa.gradient !== false,
    },
    logo: {
      image: str(logo.image, 800),
      position: LOGO_POSITIONS.includes(logo.position) ? logo.position : "top-left",
    },
    landing: {
      title: str(landing.title, 200),
      titleSize: ["small", "normal", "large"].includes(landing.titleSize) ? landing.titleSize : "normal",
      subtitle: str(landing.subtitle, 600),
      buttonLabel: str(landing.buttonLabel, 60),
      textAlign: TEXT_ALIGNS.includes(landing.textAlign) ? landing.textAlign : "left",
      textPosition: TEXT_POSITIONS.includes(landing.textPosition) ? landing.textPosition : "bottom",
    },
    thanks: {
      title: str(thanks.title, 200),
      message: str(thanks.message, 600),
      textAlign: TEXT_ALIGNS.includes(thanks.textAlign) ? thanks.textAlign : "center",
      textPosition: TEXT_POSITIONS.includes(thanks.textPosition) ? thanks.textPosition : "center",
      whatsappNumber: str(thanks.whatsappNumber, 30),
      whatsappMessage: str(thanks.whatsappMessage, 400),
    },
    extraPages: sanitizePages(input && input.extraPages),
  };
}

/** Retorna a configuração salva (ou null se ninguém salvou nada ainda). */
async function handleGetConfig(env) {
  if (!env.DB) return jsonResponse({ ok: true, config: null });
  try {
    const row = await env.DB.prepare("SELECT data FROM site_config WHERE id = 1").first();
    return jsonResponse({ ok: true, config: row ? JSON.parse(row.data) : null });
  } catch {
    return jsonResponse({ ok: true, config: null });
  }
}

/** Salva a configuração (protegido por token). */
async function handleSaveConfig(request, env) {
  if (!isAuthorizedAdmin(request, env)) {
    return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  }

  if (!env.DB) {
    return jsonResponse({ ok: false, error: "Banco de dados não configurado (falta o binding DB)." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "JSON inválido." }, 400);
  }

  const config = sanitizeConfig(body);

  await env.DB.prepare(
    "INSERT INTO site_config (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data"
  )
    .bind(JSON.stringify(config))
    .run();

  return jsonResponse({ ok: true, config });
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/api/submit") {
        if (request.method !== "POST") return jsonResponse({ ok: false, error: "Método não permitido." }, 405);
        return await handleSubmit(request, env);
      }

      if (url.pathname === "/api/config") {
        return await handleGetConfig(env);
      }

      if (url.pathname === "/admin/config" && request.method === "POST") {
        return await handleSaveConfig(request, env);
      }

      if (url.pathname.startsWith("/admin/data/") && request.method === "DELETE") {
        const id = url.pathname.slice("/admin/data/".length);
        return await handleAdminDelete(request, env, id);
      }

      if (url.pathname === "/admin/data") {
        return await handleAdminData(request, env);
      }

      if (url.pathname === "/admin") {
        return new Response(ADMIN_HTML, {
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
        });
      }

      if (url.pathname === "/styles.css") {
        return new Response(STYLES_CSS, {
          headers: { "content-type": "text/css; charset=utf-8", "cache-control": "no-store" },
        });
      }

      if (url.pathname === "/app.js") {
        return new Response(APP_JS, {
          headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" },
        });
      }

      if (url.pathname === "/images/placeholder.svg") {
        return new Response(PLACEHOLDER_SVG, {
          headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "no-store" },
        });
      }

      return new Response(INDEX_HTML, {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      });
    } catch (err) {
      // Nunca deixa a página de erro genérica da Cloudflare aparecer sem explicação:
      // mostra a mensagem real pra dar pra diagnosticar na hora.
      const message = (err && err.stack) || String(err);
      return new Response("Erro no Worker:\n\n" + message, {
        status: 500,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
  },
};
