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

const TIPOS_INDICACAO = ["imovel_venda", "imovel_locacao", "seguro", "consorcio"];
const MAX_INDICACOES_POR_ENVIO = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Valida uma indicação individual dentro do lote; retorna uma mensagem de erro ou null se ok. */
function validarIndicacaoItem(item) {
  if (!item || typeof item !== "object") return "Indicação inválida.";
  if (!isNonEmptyString(item.tipo) || !TIPOS_INDICACAO.includes(item.tipo)) {
    return "Tipo de indicação inválido.";
  }
  if (!isNonEmptyString(item.nomeIndicado) || !isNonEmptyString(item.whatsappIndicado)) {
    return "Preencha o nome e o WhatsApp de cada pessoa indicada.";
  }
  if (isNonEmptyString(item.emailIndicado) && !EMAIL_RE.test(item.emailIndicado.trim())) {
    return "E-mail de uma das pessoas indicadas é inválido.";
  }
  const detalhes = item.detalhes && typeof item.detalhes === "object" ? item.detalhes : {};
  if (item.tipo === "imovel_venda" || item.tipo === "imovel_locacao") {
    if (!isNonEmptyString(detalhes.cidadeBairro) || !isNonEmptyString(detalhes.tipoImovel)) {
      return "Preencha as informações do imóvel.";
    }
  } else if (item.tipo === "seguro") {
    if (!isNonEmptyString(detalhes.tipoSeguro)) return "Preencha as informações do seguro.";
  } else if (item.tipo === "consorcio") {
    if (!isNonEmptyString(detalhes.tipoConsorcio)) return "Preencha as informações do consórcio.";
  }
  return null;
}

/** Recebe até MAX_INDICACOES_POR_ENVIO indicações num só envio (formulário /indicacao) e grava uma linha por indicação na tabela `indicacoes`. */
async function handleSubmitIndicacao(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "JSON inválido." }, 400);
  }

  const requiredFields = ["nomeIndicador", "whatsappIndicador", "autorizaContato"];
  for (const field of requiredFields) {
    if (!isNonEmptyString(body[field])) {
      return jsonResponse({ ok: false, error: `Campo obrigatório ausente: ${field}` }, 400);
    }
  }

  const confirmaPermissao = String(body.confirmaPermissao || "").trim().toLowerCase();
  if (confirmaPermissao !== "sim") {
    return jsonResponse(
      { ok: false, error: "É necessário confirmar a autorização para compartilhar os dados dessa pessoa." },
      400
    );
  }

  if (isNonEmptyString(body.website)) {
    return jsonResponse({ ok: true }); // honeypot: finge sucesso, não grava
  }

  const indicacoesList = Array.isArray(body.indicacoes) ? body.indicacoes : [];
  if (!indicacoesList.length) {
    return jsonResponse({ ok: false, error: "Adicione ao menos uma indicação." }, 400);
  }
  if (indicacoesList.length > MAX_INDICACOES_POR_ENVIO) {
    return jsonResponse({ ok: false, error: `No máximo ${MAX_INDICACOES_POR_ENVIO} indicações por envio.` }, 400);
  }
  for (const item of indicacoesList) {
    const erro = validarIndicacaoItem(item);
    if (erro) return jsonResponse({ ok: false, error: erro }, 400);
  }

  if (isNonEmptyString(body.emailIndicador) && !EMAIL_RE.test(body.emailIndicador.trim())) {
    return jsonResponse({ ok: false, error: "Seu e-mail é inválido." }, 400);
  }

  const now = new Date().toISOString();
  const extraRespostas = body.extraRespostas && typeof body.extraRespostas === "object" ? body.extraRespostas : {};
  const extraRespostasJson = Object.keys(extraRespostas).length ? JSON.stringify(extraRespostas) : null;

  const insertStmt = env.DB.prepare(
    `INSERT INTO indicacoes
      (tipo, nome_indicado, whatsapp_indicado, email_indicado, como_conhece, detalhes,
       nome_indicador, whatsapp_indicador, email_indicador, autoriza_contato, confirma_permissao,
       criado_em, extra_respostas)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const statements = indicacoesList.map((item) => {
    const detalhes = item.detalhes && typeof item.detalhes === "object" ? item.detalhes : {};
    return insertStmt.bind(
      item.tipo,
      item.nomeIndicado.trim(),
      item.whatsappIndicado.trim(),
      (item.emailIndicado || "").trim() || null,
      (item.comoConhece || "").trim() || null,
      Object.keys(detalhes).length ? JSON.stringify(detalhes) : null,
      body.nomeIndicador.trim(),
      body.whatsappIndicador.trim(),
      (body.emailIndicador || "").trim() || null,
      body.autorizaContato.trim(),
      "Sim",
      now,
      extraRespostasJson
    );
  });

  try {
    await env.DB.batch(statements); // grava todas as indicações do envio de uma vez (atômico)
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erro ao salvar indicação." }, 500);
  }

  return jsonResponse({ ok: true });
}

function isAuthorizedAdmin(request, env) {
  const token = request.headers.get("x-admin-token") || "";
  return Boolean(env.ADMIN_TOKEN) && token === env.ADMIN_TOKEN;
}

/** Duas "instâncias" de formulário, cada uma com sua própria tabela de respostas e de config. */
const FORM_TABLES = {
  vagas: { data: "candidaturas", config: "site_config" },
  indicacao: { data: "indicacoes", config: "indicacao_config" },
};

function resolveForm(url) {
  const f = url.searchParams.get("form");
  return Object.prototype.hasOwnProperty.call(FORM_TABLES, f) ? f : "vagas";
}

/** Lista as respostas de um formulário para a área administrativa (protegida por token). */
async function handleAdminData(request, env, table) {
  if (!isAuthorizedAdmin(request, env)) {
    return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  }

  const { results } = await env.DB.prepare(
    `SELECT * FROM ${table} ORDER BY criado_em DESC`
  ).all();

  return jsonResponse({ ok: true, rows: results });
}

/** Exclui uma resposta pelo id (protegida por token). */
async function handleAdminDelete(request, env, table, id) {
  if (!isAuthorizedAdmin(request, env)) {
    return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  }

  if (!id || !/^\d+$/.test(id)) {
    return jsonResponse({ ok: false, error: "ID inválido." }, 400);
  }

  await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();

  return jsonResponse({ ok: true });
}

function str(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Valida e normaliza a configuração recebida do painel admin antes de salvar. */
const QUESTION_TYPES = ["texto", "textarea", "escolha", "checkbox", "simnao"];
const QUESTION_TYPES_WITH_OPTIONS = ["escolha", "checkbox"];
const LOGO_POSITIONS = ["top-left", "top-center", "top-right", "center", "bottom-left", "bottom-right"];
const LOGO_SIZES = ["pequeno", "medio", "grande"];
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

function sanitizeConfig(input) {
  const landing = input && input.landing ? input.landing : {};
  const thanks = input && input.thanks ? input.thanks : {};
  const capa = input && input.capa ? input.capa : {};
  const logo = input && input.logo ? input.logo : {};

  return {
    footer: str(input && input.footer, 300),
    capa: {
      image: str(capa.image, 2000000), // aceita arquivo enviado (data URI), não só link
      position: ["top", "center", "bottom"].includes(capa.position) ? capa.position : "center",
      gradient: capa.gradient !== false,
    },
    logo: {
      image: str(logo.image, 2000000), // aceita arquivo enviado (data URI), não só link
      position: LOGO_POSITIONS.includes(logo.position) ? logo.position : "top-left",
      size: LOGO_SIZES.includes(logo.size) ? logo.size : "medio",
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

/** Retorna a configuração salva de um formulário (ou null se ninguém salvou nada ainda). */
async function handleGetConfig(env, table) {
  if (!env.DB) return jsonResponse({ ok: true, config: null });
  try {
    const row = await env.DB.prepare(`SELECT data FROM ${table} WHERE id = 1`).first();
    return jsonResponse({ ok: true, config: row ? JSON.parse(row.data) : null });
  } catch {
    return jsonResponse({ ok: true, config: null });
  }
}

/** Salva a configuração de um formulário (protegido por token). */
async function handleSaveConfig(request, env, table) {
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
    `INSERT INTO ${table} (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`
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

      if (url.pathname === "/api/indicacao/submit") {
        if (request.method !== "POST") return jsonResponse({ ok: false, error: "Método não permitido." }, 405);
        return await handleSubmitIndicacao(request, env);
      }

      if (url.pathname === "/api/config") {
        return await handleGetConfig(env, FORM_TABLES[resolveForm(url)].config);
      }

      if (url.pathname === "/admin/config" && request.method === "POST") {
        return await handleSaveConfig(request, env, FORM_TABLES[resolveForm(url)].config);
      }

      if (url.pathname.startsWith("/admin/data/") && request.method === "DELETE") {
        const id = url.pathname.slice("/admin/data/".length);
        return await handleAdminDelete(request, env, FORM_TABLES[resolveForm(url)].data, id);
      }

      if (url.pathname === "/admin/data") {
        return await handleAdminData(request, env, FORM_TABLES[resolveForm(url)].data);
      }

      if (url.pathname === "/admin") {
        return env.ASSETS.fetch(new Request(new URL("/admin.html", request.url), request));
      }

      if (url.pathname === "/indicacao") {
        return env.ASSETS.fetch(new Request(new URL("/indicacao.html", request.url), request));
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
