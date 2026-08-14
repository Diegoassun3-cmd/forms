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

const REQUIRED_FIELDS_CAPTACAO = ["nome", "whatsapp", "objetivo", "cep", "endereco", "bairro", "cidade", "tipoImovel", "temValor", "lgpd"];

/** Recebe um cadastro de imóvel (formulário /captacao) e grava na tabela `captacoes`. */
async function handleSubmitCaptacao(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "JSON inválido." }, 400);
  }

  for (const field of REQUIRED_FIELDS_CAPTACAO) {
    if (!isNonEmptyString(body[field])) {
      return jsonResponse({ ok: false, error: `Campo obrigatório ausente: ${field}` }, 400);
    }
  }

  const lgpd = body.lgpd.trim().toLowerCase();
  if (lgpd !== "sim") {
    return jsonResponse(
      { ok: false, error: "É necessário autorizar o tratamento dos dados (LGPD) para enviar o cadastro." },
      400
    );
  }

  if (isNonEmptyString(body.website)) {
    return jsonResponse({ ok: true }); // honeypot: finge sucesso, não grava
  }

  const temValor = body.temValor.trim().toLowerCase();
  if (temValor === "sim" && !isNonEmptyString(body.valorPretendido)) {
    return jsonResponse({ ok: false, error: "Informe o valor pretendido." }, 400);
  }

  if (isNonEmptyString(body.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    return jsonResponse({ ok: false, error: "E-mail inválido." }, 400);
  }

  if (!env.DB) {
    return jsonResponse(
      { ok: false, error: "Banco de dados não configurado neste Worker (falta o binding DB)." },
      500
    );
  }

  const now = new Date().toISOString();
  const extraRespostas = body.extraRespostas && typeof body.extraRespostas === "object" ? body.extraRespostas : {};

  try {
    await env.DB.prepare(
      `INSERT INTO captacoes
        (nome, whatsapp, email, objetivo, cep, endereco, numero, complemento, bairro, cidade,
         tipo_imovel, valor_pretendido, lgpd, criado_em, extra_respostas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        body.nome.trim(),
        body.whatsapp.trim(),
        (body.email || "").trim() || null,
        body.objetivo.trim(),
        body.cep.trim(),
        body.endereco.trim(),
        (body.numero || "").trim() || null,
        (body.complemento || "").trim() || null,
        body.bairro.trim(),
        body.cidade.trim(),
        body.tipoImovel.trim(),
        (body.valorPretendido || "").trim() || null,
        "Sim",
        now,
        Object.keys(extraRespostas).length ? JSON.stringify(extraRespostas) : null
      )
      .run();
  } catch (err) {
    return jsonResponse({ ok: false, error: "Erro ao salvar cadastro." }, 500);
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

  if (!env.DB) {
    return jsonResponse(
      { ok: false, error: "Banco de dados não configurado neste Worker (falta o binding DB)." },
      500
    );
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

/** Três "instâncias" de formulário, cada uma com sua própria tabela de respostas e de config. */
const FORM_TABLES = {
  vagas: { data: "candidaturas", config: "site_config" },
  indicacao: { data: "indicacoes", config: "indicacao_config" },
  captacao: { data: "captacoes", config: "captacao_config" },
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

  if (!env.DB) {
    return jsonResponse({ ok: false, error: "Banco de dados não configurado (falta o binding DB)." }, 500);
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

  if (!env.DB) {
    return jsonResponse({ ok: false, error: "Banco de dados não configurado (falta o binding DB)." }, 500);
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

/** Valida e normaliza a configuração recebida do painel admin antes de salvar. */
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
    `INSERT INTO ${table} (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`
  )
    .bind(JSON.stringify(config))
    .run();

  return jsonResponse({ ok: true, config });
}

// =====================================================================
// Email marketing (aba própria em Configurações): criativos, listas de
// contatos e campanhas, enviadas via Resend (https://resend.com).
// =====================================================================

function escapeHtmlEmail(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function personalize(text, contact) {
  return String(text || "").replace(/\{\{\s*nome\s*\}\}/gi, contact.nome || "");
}

/** Uma linha de HTML de e-mail (tabela, pra funcionar em qualquer cliente de e-mail) por bloco. */
function renderBlockHtml(block, contact) {
  if (block.type === "heading") {
    return `<tr><td style="padding:0 28px 16px;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:900;color:#0b1b2b;">${escapeHtmlEmail(personalize(block.text, contact))}</td></tr>`;
  }
  if (block.type === "text") {
    const html = escapeHtmlEmail(personalize(block.text, contact)).replace(/\n/g, "<br>");
    return `<tr><td style="padding:0 28px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0b1b2b;">${html}</td></tr>`;
  }
  if (block.type === "image") {
    if (!block.src) return "";
    const img = `<img src="${escapeHtmlEmail(block.src)}" alt="" width="544" style="width:100%;max-width:544px;display:block;border-radius:8px;" />`;
    const wrapped = block.link ? `<a href="${escapeHtmlEmail(block.link)}" target="_blank" rel="noopener">${img}</a>` : img;
    return `<tr><td style="padding:0 28px 16px;">${wrapped}</td></tr>`;
  }
  if (block.type === "button") {
    const align = ["left", "center", "right"].includes(block.align) ? block.align : "left";
    return `<tr><td style="padding:0 28px 24px;" align="${align}">
      <a href="${escapeHtmlEmail(block.url || "#")}" target="_blank" rel="noopener" style="background:#024ba5;color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:15px;display:inline-block;">${escapeHtmlEmail(block.label || "Saiba mais")}</a>
    </td></tr>`;
  }
  if (block.type === "divider") {
    return `<tr><td style="padding:0 28px 16px;"><hr style="border:none;border-top:1px solid #e2d9c9;margin:0;" /></td></tr>`;
  }
  if (block.type === "spacer") {
    return `<tr><td style="line-height:${Math.max(4, Math.min(120, Number(block.height) || 24))}px;font-size:1px;">&nbsp;</td></tr>`;
  }
  return "";
}

/** Monta o HTML completo do e-mail (blocos do criativo + rodapé com link de descadastro). */
function renderEmailHtml(blocks, contact, unsubscribeUrl) {
  const body = (Array.isArray(blocks) ? blocks : []).map((b) => renderBlockHtml(b, contact)).join("");
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f2ede6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2ede6;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
            <tr><td style="line-height:24px;font-size:1px;">&nbsp;</td></tr>
            ${body}
            <tr>
              <td style="padding:24px 28px;border-top:1px solid #e2d9c9;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#5c6773;text-align:center;">
                Você está recebendo este e-mail porque faz parte da lista de contatos da Solua Imóveis.
                <br /><a href="${escapeHtmlEmail(unsubscribeUrl)}" style="color:#5c6773;">Cancelar inscrição</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Token curto pra link de descadastro — só pra evitar que deem descadastro em outro contato só chutando o ID. */
async function unsubscribeToken(env, contactId) {
  const secret = (env.ADMIN_TOKEN || "solua-email-marketing") + "-unsub";
  const full = await hmacHex(secret, String(contactId));
  return full.slice(0, 16);
}

async function handleUnsubscribe(request, env, url) {
  const c = url.searchParams.get("c");
  const t = url.searchParams.get("t");
  const invalidHtml = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;text-align:center;padding:60px 20px;">
    <h1 style="color:#c23b2e;">Link inválido</h1><p>Esse link de descadastro não é válido.</p></body></html>`;

  if (!c || !t || !/^\d+$/.test(c)) {
    return new Response(invalidHtml, { status: 400, headers: { "content-type": "text/html; charset=utf-8" } });
  }
  const expected = await unsubscribeToken(env, c);
  if (expected !== t) {
    return new Response(invalidHtml, { status: 400, headers: { "content-type": "text/html; charset=utf-8" } });
  }
  if (env.DB) {
    await env.DB.prepare("UPDATE email_contacts SET opt_out = 1 WHERE id = ?").bind(c).run();
  }
  return new Response(
    `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;text-align:center;padding:60px 20px;">
      <h1 style="color:#024ba5;">Inscrição cancelada</h1>
      <p>Você não vai mais receber e-mails da Solua Imóveis. Se mudar de ideia, é só entrar em contato com a gente.</p>
    </body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

// ---------------------- Configurações do provedor de e-mail ----------------------

function sanitizeEmailSettings(input, existing) {
  const s = input || {};
  const apiKey = isNonEmptyString(s.apiKey) ? s.apiKey.trim() : (existing && existing.apiKey) || "";
  return {
    provider: "resend",
    apiKey,
    fromName: str(s.fromName, 100),
    fromEmail: str(s.fromEmail, 200),
    replyTo: str(s.replyTo, 200),
  };
}

function publicEmailSettings(settings) {
  if (!settings) return null;
  return {
    provider: settings.provider,
    fromName: settings.fromName,
    fromEmail: settings.fromEmail,
    replyTo: settings.replyTo,
    apiKeySet: Boolean(settings.apiKey),
  };
}

async function handleGetEmailSettings(request, env) {
  if (!isAuthorizedAdmin(request, env)) return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  if (!env.DB) return jsonResponse({ ok: true, settings: null });
  const row = await env.DB.prepare("SELECT data FROM email_settings WHERE id = 1").first();
  return jsonResponse({ ok: true, settings: row ? publicEmailSettings(JSON.parse(row.data)) : null });
}

async function handleSaveEmailSettings(request, env) {
  if (!isAuthorizedAdmin(request, env)) return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  if (!env.DB) return jsonResponse({ ok: false, error: "Banco de dados não configurado (falta o binding DB)." }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "JSON inválido." }, 400);
  }

  const existingRow = await env.DB.prepare("SELECT data FROM email_settings WHERE id = 1").first();
  const existing = existingRow ? JSON.parse(existingRow.data) : null;
  const settings = sanitizeEmailSettings(body, existing);

  await env.DB.prepare(
    "INSERT INTO email_settings (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data"
  )
    .bind(JSON.stringify(settings))
    .run();

  return jsonResponse({ ok: true, settings: publicEmailSettings(settings) });
}

// ---------------------- Listas e contatos ----------------------

async function handleListEmailLists(request, env) {
  if (!isAuthorizedAdmin(request, env)) return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  if (!env.DB) return jsonResponse({ ok: false, error: "Banco de dados não configurado (falta o binding DB)." }, 500);

  const { results } = await env.DB.prepare(
    `SELECT l.id, l.nome, l.criado_em,
      (SELECT COUNT(*) FROM email_contacts c WHERE c.list_id = l.id AND c.opt_out = 0) as total_contatos
     FROM email_lists l ORDER BY l.criado_em DESC`
  ).all();

  return jsonResponse({ ok: true, lists: results });
}

async function handleCreateEmailList(request, env) {
  if (!isAuthorizedAdmin(request, env)) return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  if (!env.DB) return jsonResponse({ ok: false, error: "Banco de dados não configurado (falta o binding DB)." }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "JSON inválido." }, 400);
  }

  const nome = str(body.nome, 100);
  if (!nome) return jsonResponse({ ok: false, error: "Informe um nome pra lista." }, 400);

  const now = new Date().toISOString();
  const result = await env.DB.prepare("INSERT INTO email_lists (nome, criado_em) VALUES (?, ?)").bind(nome, now).run();

  return jsonResponse({ ok: true, list: { id: result.meta.last_row_id, nome, criado_em: now, total_contatos: 0 } });
}

async function handleDeleteEmailList(request, env, id) {
  if (!isAuthorizedAdmin(request, env)) return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  if (!env.DB) return jsonResponse({ ok: false, error: "Banco de dados não configurado (falta o binding DB)." }, 500);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM email_contacts WHERE list_id = ?").bind(id),
    env.DB.prepare("DELETE FROM email_lists WHERE id = ?").bind(id),
  ]);

  return jsonResponse({ ok: true });
}

async function handleListContacts(request, env, listId) {
  if (!isAuthorizedAdmin(request, env)) return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  if (!env.DB) return jsonResponse({ ok: false, error: "Banco de dados não configurado (falta o binding DB)." }, 500);

  const { results } = await env.DB.prepare("SELECT * FROM email_contacts WHERE list_id = ? ORDER BY criado_em DESC")
    .bind(listId)
    .all();

  return jsonResponse({ ok: true, contacts: results });
}

/** Insere/atualiza contatos numa lista, ignorando linhas sem e-mail válido e duplicadas. */
async function upsertContacts(env, listId, rows) {
  const now = new Date().toISOString();
  const seen = new Set();
  const statements = [];
  for (const row of rows) {
    const email = String((row && row.email) || "").trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    const nome = str(row && row.nome, 150);
    statements.push(
      env.DB.prepare(
        "INSERT INTO email_contacts (list_id, nome, email, opt_out, criado_em) VALUES (?, ?, ?, 0, ?) " +
          "ON CONFLICT(list_id, email) DO UPDATE SET nome = COALESCE(NULLIF(excluded.nome, ''), email_contacts.nome)"
      ).bind(listId, nome || null, email, now)
    );
  }
  if (statements.length) await env.DB.batch(statements);
  return { imported: statements.length, skipped: rows.length - statements.length };
}

async function handleImportContacts(request, env, listId) {
  if (!isAuthorizedAdmin(request, env)) return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  if (!env.DB) return jsonResponse({ ok: false, error: "Banco de dados não configurado (falta o binding DB)." }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "JSON inválido." }, 400);
  }

  const rows = (Array.isArray(body.contacts) ? body.contacts : []).slice(0, 2000);
  const { imported, skipped } = await upsertContacts(env, listId, rows);

  return jsonResponse({ ok: true, imported, skipped });
}

/** De onde dá pra puxar e-mails já cadastrados: os três formulários do site. */
const IMPORTABLE_FORM_EMAIL_COLUMNS = {
  vagas: { table: "candidaturas", nameCol: "nome", emailCol: "email" },
  indicacao: { table: "indicacoes", nameCol: "nome_indicado", emailCol: "email_indicado" },
  captacao: { table: "captacoes", nameCol: "nome", emailCol: "email" },
};

async function handleImportFromForm(request, env, listId) {
  if (!isAuthorizedAdmin(request, env)) return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  if (!env.DB) return jsonResponse({ ok: false, error: "Banco de dados não configurado (falta o binding DB)." }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "JSON inválido." }, 400);
  }

  const src = IMPORTABLE_FORM_EMAIL_COLUMNS[body.form];
  if (!src) return jsonResponse({ ok: false, error: "Formulário inválido." }, 400);

  const { results } = await env.DB.prepare(
    `SELECT DISTINCT ${src.nameCol} as nome, ${src.emailCol} as email FROM ${src.table}
     WHERE ${src.emailCol} IS NOT NULL AND TRIM(${src.emailCol}) != ''`
  ).all();

  const { imported, skipped } = await upsertContacts(env, listId, results);

  return jsonResponse({ ok: true, imported, skipped });
}

async function handleDeleteContact(request, env, id) {
  if (!isAuthorizedAdmin(request, env)) return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  if (!env.DB) return jsonResponse({ ok: false, error: "Banco de dados não configurado (falta o binding DB)." }, 500);

  await env.DB.prepare("DELETE FROM email_contacts WHERE id = ?").bind(id).run();

  return jsonResponse({ ok: true });
}

// ---------------------- Criativos (templates) ----------------------

const EMAIL_BLOCK_TYPES = ["heading", "text", "image", "button", "divider", "spacer"];

function sanitizeEmailBlocks(rawBlocks) {
  return (Array.isArray(rawBlocks) ? rawBlocks : []).slice(0, 60).map((raw) => {
    const b = raw && typeof raw === "object" ? raw : {};
    const type = EMAIL_BLOCK_TYPES.includes(b.type) ? b.type : "text";
    const block = { type };
    if (type === "heading" || type === "text") block.text = str(b.text, 4000);
    if (type === "image") {
      block.src = str(b.src, 2000000); // aceita arquivo enviado (data URI)
      block.link = str(b.link, 500);
    }
    if (type === "button") {
      block.label = str(b.label, 60);
      block.url = str(b.url, 500);
      block.align = ["left", "center", "right"].includes(b.align) ? b.align : "left";
    }
    if (type === "spacer") block.height = Math.max(4, Math.min(120, Number(b.height) || 24));
    return block;
  });
}

async function handleListTemplates(request, env) {
  if (!isAuthorizedAdmin(request, env)) return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  if (!env.DB) return jsonResponse({ ok: false, error: "Banco de dados não configurado (falta o binding DB)." }, 500);

  const { results } = await env.DB.prepare("SELECT * FROM email_templates ORDER BY atualizado_em DESC").all();

  return jsonResponse({ ok: true, templates: results.map((r) => ({ ...r, blocks: JSON.parse(r.blocks) })) });
}

async function handleSaveTemplate(request, env) {
  if (!isAuthorizedAdmin(request, env)) return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  if (!env.DB) return jsonResponse({ ok: false, error: "Banco de dados não configurado (falta o binding DB)." }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "JSON inválido." }, 400);
  }

  const nome = str(body.nome, 150) || "Criativo sem nome";
  const blocks = sanitizeEmailBlocks(body.blocks);
  const now = new Date().toISOString();

  if (body.id && /^\d+$/.test(String(body.id))) {
    await env.DB.prepare("UPDATE email_templates SET nome = ?, blocks = ?, atualizado_em = ? WHERE id = ?")
      .bind(nome, JSON.stringify(blocks), now, body.id)
      .run();
    return jsonResponse({ ok: true, template: { id: Number(body.id), nome, blocks, atualizado_em: now } });
  }

  const result = await env.DB.prepare(
    "INSERT INTO email_templates (nome, blocks, criado_em, atualizado_em) VALUES (?, ?, ?, ?)"
  )
    .bind(nome, JSON.stringify(blocks), now, now)
    .run();

  return jsonResponse({ ok: true, template: { id: result.meta.last_row_id, nome, blocks, criado_em: now, atualizado_em: now } });
}

async function handleDeleteTemplate(request, env, id) {
  if (!isAuthorizedAdmin(request, env)) return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  if (!env.DB) return jsonResponse({ ok: false, error: "Banco de dados não configurado (falta o binding DB)." }, 500);

  await env.DB.prepare("DELETE FROM email_templates WHERE id = ?").bind(id).run();

  return jsonResponse({ ok: true });
}

// ---------------------- Campanhas (disparos) ----------------------

async function handleListCampaigns(request, env) {
  if (!isAuthorizedAdmin(request, env)) return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  if (!env.DB) return jsonResponse({ ok: false, error: "Banco de dados não configurado (falta o binding DB)." }, 500);

  const { results } = await env.DB.prepare(
    `SELECT c.id, c.nome, c.assunto, c.status, c.criado_em, c.template_id, c.list_id,
      l.nome as lista_nome,
      (SELECT COUNT(*) FROM email_sends s WHERE s.campaign_id = c.id) as total,
      (SELECT COUNT(*) FROM email_sends s WHERE s.campaign_id = c.id AND s.status = 'enviado') as enviados,
      (SELECT COUNT(*) FROM email_sends s WHERE s.campaign_id = c.id AND s.status = 'falhou') as falhas
     FROM email_campaigns c
     LEFT JOIN email_lists l ON l.id = c.list_id
     ORDER BY c.criado_em DESC`
  ).all();

  return jsonResponse({ ok: true, campaigns: results });
}

async function handleCreateCampaign(request, env) {
  if (!isAuthorizedAdmin(request, env)) return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  if (!env.DB) return jsonResponse({ ok: false, error: "Banco de dados não configurado (falta o binding DB)." }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "JSON inválido." }, 400);
  }

  const nome = str(body.nome, 150);
  const assunto = str(body.assunto, 200);
  const templateId = Number(body.templateId);
  const listId = Number(body.listId);
  if (!nome || !assunto || !templateId || !listId) {
    return jsonResponse({ ok: false, error: "Preencha nome, assunto, criativo e lista." }, 400);
  }

  const now = new Date().toISOString();
  const result = await env.DB.prepare(
    "INSERT INTO email_campaigns (nome, assunto, template_id, list_id, status, criado_em) VALUES (?, ?, ?, ?, 'rascunho', ?)"
  )
    .bind(nome, assunto, templateId, listId, now)
    .run();
  const campaignId = result.meta.last_row_id;

  // pré-popula email_sends com um "pendente" por contato ativo da lista (não duplica se já existir)
  await env.DB.prepare(
    `INSERT OR IGNORE INTO email_sends (campaign_id, contact_id, status)
     SELECT ?, id, 'pendente' FROM email_contacts WHERE list_id = ? AND opt_out = 0`
  )
    .bind(campaignId, listId)
    .run();

  return jsonResponse({ ok: true, campaignId });
}

async function handleDeleteCampaign(request, env, id) {
  if (!isAuthorizedAdmin(request, env)) return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  if (!env.DB) return jsonResponse({ ok: false, error: "Banco de dados não configurado (falta o binding DB)." }, 500);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM email_sends WHERE campaign_id = ?").bind(id),
    env.DB.prepare("DELETE FROM email_campaigns WHERE id = ?").bind(id),
  ]);

  return jsonResponse({ ok: true });
}

const EMAIL_SEND_BATCH_SIZE = 20;

/** Envia até EMAIL_SEND_BATCH_SIZE e-mails pendentes da campanha via Resend; chamar de novo até done:true. */
async function handleSendCampaignBatch(request, env, campaignId, url) {
  if (!isAuthorizedAdmin(request, env)) return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  if (!env.DB) return jsonResponse({ ok: false, error: "Banco de dados não configurado (falta o binding DB)." }, 500);

  const campaign = await env.DB.prepare("SELECT * FROM email_campaigns WHERE id = ?").bind(campaignId).first();
  if (!campaign) return jsonResponse({ ok: false, error: "Campanha não encontrada." }, 404);

  const templateRow = await env.DB.prepare("SELECT * FROM email_templates WHERE id = ?").bind(campaign.template_id).first();
  if (!templateRow) return jsonResponse({ ok: false, error: "Criativo não encontrado (pode ter sido excluído)." }, 400);
  const blocks = JSON.parse(templateRow.blocks);

  const settingsRow = await env.DB.prepare("SELECT data FROM email_settings WHERE id = 1").first();
  const settings = settingsRow ? JSON.parse(settingsRow.data) : null;
  if (!settings || !settings.apiKey || !settings.fromEmail) {
    return jsonResponse(
      { ok: false, error: "Configure o provedor de e-mail (API key e e-mail do remetente) antes de enviar." },
      400
    );
  }

  const { results: pending } = await env.DB.prepare(
    `SELECT s.id as send_id, c.id as contact_id, c.nome, c.email
     FROM email_sends s JOIN email_contacts c ON c.id = s.contact_id
     WHERE s.campaign_id = ? AND s.status = 'pendente' AND c.opt_out = 0 LIMIT ?`
  )
    .bind(campaignId, EMAIL_SEND_BATCH_SIZE)
    .all();

  if (!pending.length) {
    const { results: countRows } = await env.DB.prepare(
      "SELECT status, COUNT(*) as n FROM email_sends WHERE campaign_id = ? GROUP BY status"
    )
      .bind(campaignId)
      .all();
    const enviados = countRows.find((r) => r.status === "enviado")?.n || 0;
    const falhas = countRows.find((r) => r.status === "falhou")?.n || 0;
    if (campaign.status !== "concluida") {
      await env.DB.prepare("UPDATE email_campaigns SET status = 'concluida' WHERE id = ?").bind(campaignId).run();
    }
    return jsonResponse({ ok: true, done: true, sent: enviados, failed: falhas });
  }

  if (campaign.status === "rascunho") {
    await env.DB.prepare("UPDATE email_campaigns SET status = 'enviando' WHERE id = ?").bind(campaignId).run();
  }

  const results = await Promise.allSettled(
    pending.map(async (p) => {
      const contact = { id: p.contact_id, nome: p.nome, email: p.email };
      const token = await unsubscribeToken(env, p.contact_id);
      const unsubscribeUrl = `${url.origin}/unsubscribe?c=${p.contact_id}&t=${token}`;
      const html = renderEmailHtml(blocks, contact, unsubscribeUrl);
      const payload = {
        from: settings.fromName ? `${settings.fromName} <${settings.fromEmail}>` : settings.fromEmail,
        to: [contact.email],
        subject: personalize(campaign.assunto, contact),
        html,
      };
      if (settings.replyTo) payload.reply_to = settings.replyTo;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${settings.apiKey}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Resend ${res.status}: ${errBody.slice(0, 200)}`);
      }
      return p.send_id;
    })
  );

  const statements = results.map((r, i) => {
    const sendId = pending[i].send_id;
    if (r.status === "fulfilled") {
      return env.DB.prepare("UPDATE email_sends SET status = 'enviado', enviado_em = ?, erro = NULL WHERE id = ?").bind(
        new Date().toISOString(),
        sendId
      );
    }
    const msg = String((r.reason && r.reason.message) || r.reason || "erro desconhecido").slice(0, 300);
    return env.DB.prepare("UPDATE email_sends SET status = 'falhou', erro = ? WHERE id = ?").bind(msg, sendId);
  });
  await env.DB.batch(statements);

  const sentNow = results.filter((r) => r.status === "fulfilled").length;
  const failedNow = results.length - sentNow;

  const { results: remainingRows } = await env.DB.prepare(
    "SELECT COUNT(*) as n FROM email_sends WHERE campaign_id = ? AND status = 'pendente'"
  )
    .bind(campaignId)
    .all();
  const remaining = remainingRows[0]?.n || 0;

  return jsonResponse({ ok: true, done: false, sentNow, failedNow, remaining });
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/api/submit") {
        if (request.method !== "POST") return jsonResponse({ ok: false, error: "Método não permitido." }, 405);
        return await handleSubmit(request, env);
      }

      if (url.pathname === "/api/indicacao/submit") {
        if (request.method !== "POST") return jsonResponse({ ok: false, error: "Método não permitido." }, 405);
        return await handleSubmitIndicacao(request, env);
      }

      if (url.pathname === "/api/captacao/submit") {
        if (request.method !== "POST") return jsonResponse({ ok: false, error: "Método não permitido." }, 405);
        return await handleSubmitCaptacao(request, env);
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

      // ---------------------- Email marketing ----------------------

      if (url.pathname === "/unsubscribe") {
        return await handleUnsubscribe(request, env, url);
      }

      if (url.pathname === "/admin/email/settings" && request.method === "GET") {
        return await handleGetEmailSettings(request, env);
      }

      if (url.pathname === "/admin/email/settings" && request.method === "POST") {
        return await handleSaveEmailSettings(request, env);
      }

      if (url.pathname === "/admin/email/lists" && request.method === "GET") {
        return await handleListEmailLists(request, env);
      }

      if (url.pathname === "/admin/email/lists" && request.method === "POST") {
        return await handleCreateEmailList(request, env);
      }

      {
        const m = url.pathname.match(/^\/admin\/email\/lists\/(\d+)$/);
        if (m && request.method === "DELETE") return await handleDeleteEmailList(request, env, m[1]);
      }

      {
        const m = url.pathname.match(/^\/admin\/email\/lists\/(\d+)\/contacts$/);
        if (m && request.method === "GET") return await handleListContacts(request, env, m[1]);
        if (m && request.method === "POST") return await handleImportContacts(request, env, m[1]);
      }

      {
        const m = url.pathname.match(/^\/admin\/email\/lists\/(\d+)\/import$/);
        if (m && request.method === "POST") return await handleImportFromForm(request, env, m[1]);
      }

      {
        const m = url.pathname.match(/^\/admin\/email\/contacts\/(\d+)$/);
        if (m && request.method === "DELETE") return await handleDeleteContact(request, env, m[1]);
      }

      if (url.pathname === "/admin/email/templates" && request.method === "GET") {
        return await handleListTemplates(request, env);
      }

      if (url.pathname === "/admin/email/templates" && request.method === "POST") {
        return await handleSaveTemplate(request, env);
      }

      {
        const m = url.pathname.match(/^\/admin\/email\/templates\/(\d+)$/);
        if (m && request.method === "DELETE") return await handleDeleteTemplate(request, env, m[1]);
      }

      if (url.pathname === "/admin/email/campaigns" && request.method === "GET") {
        return await handleListCampaigns(request, env);
      }

      if (url.pathname === "/admin/email/campaigns" && request.method === "POST") {
        return await handleCreateCampaign(request, env);
      }

      {
        const m = url.pathname.match(/^\/admin\/email\/campaigns\/(\d+)$/);
        if (m && request.method === "DELETE") return await handleDeleteCampaign(request, env, m[1]);
      }

      {
        const m = url.pathname.match(/^\/admin\/email\/campaigns\/(\d+)\/send$/);
        if (m && request.method === "POST") return await handleSendCampaignBatch(request, env, m[1], url);
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

      if (url.pathname === "/indicacao.js") {
        return new Response(INDICACAO_JS, {
          headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" },
        });
      }

      if (url.pathname === "/captacao.js") {
        return new Response(CAPTACAO_JS, {
          headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" },
        });
      }

      if (url.pathname === "/images/placeholder.svg") {
        return new Response(PLACEHOLDER_SVG, {
          headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "no-store" },
        });
      }

      if (url.pathname === "/indicacao") {
        return new Response(INDICACAO_HTML, {
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
        });
      }

      if (url.pathname === "/captacao") {
        return new Response(CAPTACAO_HTML, {
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
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
