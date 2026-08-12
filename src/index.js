/**
 * Worker da Solua Imóveis — formulário de candidatura para corretores(as) parceiros(as).
 *
 * - Qualquer requisição que não seja a API é servida pelos arquivos estáticos em /public
 *   (binding ASSETS, configurado em wrangler.jsonc).
 * - POST /api/submit grava a candidatura na tabela `candidaturas` do D1 (binding DB).
 * - GET /api/config expõe a configuração editável do site (textos, capa, perguntas extras).
 * - POST /admin/config salva essa configuração (protegido por ADMIN_TOKEN).
 */

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/** Campos de texto obrigatórios enviados pelo formulário. */
const REQUIRED_FIELDS = [
  "nome",
  "email",
  "whatsapp",
  "cidade",
  "experiencia",
  "captacao",
  "regioes",
  "disponibilidade",
  "remuneracao",
  "lgpd",
];

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

  // honeypot anti-spam simples: campo invisível que humanos não preenchem
  if (isNonEmptyString(body.website)) {
    return jsonResponse({ ok: true }); // finge sucesso, mas não grava nada
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim());
  if (!emailOk) {
    return jsonResponse({ ok: false, error: "E-mail inválido." }, 400);
  }

  const now = new Date().toISOString();
  const extraRespostas = body.extraRespostas && typeof body.extraRespostas === "object" ? body.extraRespostas : {};

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

/** Lista as candidaturas para a área administrativa (protegida por token). */
async function handleAdminData(request, env) {
  if (!isAuthorizedAdmin(request, env)) {
    return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
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

  if (!id || !/^\d+$/.test(id)) {
    return jsonResponse({ ok: false, error: "ID inválido." }, 400);
  }

  await env.DB.prepare("DELETE FROM candidaturas WHERE id = ?").bind(id).run();

  return jsonResponse({ ok: true });
}

function str(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Valida e normaliza a configuração recebida do painel admin antes de salvar. */
function sanitizeConfig(input) {
  const landing = input && input.landing ? input.landing : {};
  const thanks = input && input.thanks ? input.thanks : {};
  const capa = input && input.capa ? input.capa : {};
  const rawQuestions = input && Array.isArray(input.extraQuestions) ? input.extraQuestions : [];

  return {
    capa: {
      image: str(capa.image, 800),
      position: ["top", "center", "bottom"].includes(capa.position) ? capa.position : "center",
    },
    landing: {
      title: str(landing.title, 200),
      titleSize: ["small", "normal", "large"].includes(landing.titleSize) ? landing.titleSize : "normal",
      subtitle: str(landing.subtitle, 600),
      buttonLabel: str(landing.buttonLabel, 60),
    },
    thanks: {
      title: str(thanks.title, 200),
      message: str(thanks.message, 600),
    },
    extraQuestions: rawQuestions
      .slice(0, 20)
      .map((q, i) => ({
        id: "q" + (i + 1),
        label: str(q && q.label, 200),
        type: ["texto", "textarea", "escolha"].includes(q && q.type) ? q.type : "texto",
        options:
          q && q.type === "escolha" && Array.isArray(q.options)
            ? q.options.map((o) => str(o, 100)).filter(Boolean).slice(0, 10)
            : [],
        required: Boolean(q && q.required),
      }))
      .filter((q) => q.label),
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

      if (url.pathname === "/api/submit" && request.method === "POST") {
        return await handleSubmit(request, env);
      }

      if (url.pathname === "/api/submit") {
        return jsonResponse({ ok: false, error: "Método não permitido." }, 405);
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
        return env.ASSETS.fetch(new Request(new URL("/admin.html", request.url), request));
      }

      return env.ASSETS.fetch(request);
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
