// Gera dashboard-worker.js a partir dos arquivos em public/ + do runtime do Worker.
// Uso: node scripts/build-dashboard-worker.mjs
import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("public/index.html", "utf8");
const css = readFileSync("public/styles.css", "utf8");
const js = readFileSync("public/app.js", "utf8");
const svg = readFileSync("public/images/placeholder.svg", "utf8");
const admin = readFileSync("public/admin.html", "utf8");
const indicacaoHtml = readFileSync("public/indicacao.html", "utf8");
const indicacaoJs = readFileSync("public/indicacao.js", "utf8");
const captacaoHtml = readFileSync("public/captacao.html", "utf8");
const captacaoJs = readFileSync("public/captacao.js", "utf8");
const mailHtml = readFileSync("public/mail.html", "utf8");
const conviteHtml = readFileSync("public/convite.html", "utf8");
const conviteJs = readFileSync("public/convite.js", "utf8");

const header = `/**
 * Worker da Solua Imóveis — formulário de candidatura para corretores(as) parceiros(as).
 * Versão "arquivo único" para colar no editor de código do painel da Cloudflare
 * (Workers & Pages → formsvagas → Edit code).
 *
 * Depois de colar e clicar em "Deploy", configure em Settings → Variables and Secrets:
 *  1) D1 database binding → variable name "DB" → banco "solua-candidaturas"
 *  2) Secret de texto → variable name "ADMIN_TOKEN" → uma senha sua escolha
 *     (protege o painel de candidaturas em /admin)
 */

`;

const constants = [
  ["INDEX_HTML", html],
  ["STYLES_CSS", css],
  ["APP_JS", js],
  ["PLACEHOLDER_SVG", svg],
  ["ADMIN_HTML", admin],
  ["INDICACAO_HTML", indicacaoHtml],
  ["INDICACAO_JS", indicacaoJs],
  ["CAPTACAO_HTML", captacaoHtml],
  ["CAPTACAO_JS", captacaoJs],
  ["MAIL_HTML", mailHtml],
  ["CONVITE_HTML", conviteHtml],
  ["CONVITE_JS", conviteJs],
]
  .map(([name, value]) => `const ${name} = ${JSON.stringify(value)};`)
  .join("\n");

const runtime = readFileSync("scripts/worker-runtime.js", "utf8");

writeFileSync("dashboard-worker.js", header + constants + "\n\n" + runtime);
console.log("dashboard-worker.js gerado:", Buffer.byteLength(header + constants + runtime), "bytes");
