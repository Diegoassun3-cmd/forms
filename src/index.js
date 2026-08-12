/**
 * Worker da Solua Imóveis — formulário de candidatura para corretores(as) parceiros(as).
 *
 * - Qualquer requisição que não seja a API é servida pelos arquivos estáticos em /public
 *   (binding ASSETS, configurado em wrangler.jsonc).
 * - POST /api/submit grava a candidatura na tabela `candidaturas` do D1 (binding DB).
 */

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

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

  try {
    await env.DB.prepare(
      `INSERT INTO candidaturas
        (nome, email, whatsapp, cidade, creci, experiencia, captacao, regioes,
         tipos_imovel, disponibilidade, veiculo, portfolio, remuneracao, sobre_voce, lgpd, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        now
      )
      .run();
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erro ao salvar candidatura." }, 500);
  }

  return jsonResponse({ ok: true });
}

/** Lista as candidaturas para a área administrativa (protegida por token). */
async function handleAdminData(request, env) {
  const token = request.headers.get("x-admin-token") || "";
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  }

  const { results } = await env.DB.prepare(
    "SELECT * FROM candidaturas ORDER BY criado_em DESC"
  ).all();

  return jsonResponse({ ok: true, rows: results });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/submit" && request.method === "POST") {
      return handleSubmit(request, env);
    }

    if (url.pathname === "/api/submit") {
      return jsonResponse({ ok: false, error: "Método não permitido." }, 405);
    }

    if (url.pathname === "/admin/data") {
      return handleAdminData(request, env);
    }

    if (url.pathname === "/admin") {
      return env.ASSETS.fetch(new Request(new URL("/admin.html", request.url), request));
    }

    return env.ASSETS.fetch(request);
  },
};
