# Solua Imóveis — Formulário de candidatura

Formulário para captação de corretores(as) parceiros(as), com uma tela inicial (foto + texto +
botão "Iniciar"), 5 etapas (uma "página" por seção) e uma tela final de agradecimento (foto + texto
personalizáveis). Roda como um Cloudflare Worker com assets estáticos, gravando cada candidatura em
um banco D1.

## Estrutura

```
public/          → front-end (HTML/CSS/JS puro, sem build step)
  index.html     → telas: inicial, 5 etapas do formulário, agradecimento
  admin.html     → painel para consultar as candidaturas recebidas (protegido por token)
  app.js         → CONFIG (textos/fotos editáveis), navegação e validação
  styles.css     → estilos
  images/        → fotos da tela inicial e de agradecimento
src/index.js     → Worker: serve os assets e expõe POST /api/submit e GET /admin/data (D1)
migrations/      → schema SQL da tabela `candidaturas`
wrangler.jsonc   → configuração do Worker (nome, assets, binding do D1)
dashboard-worker.js → mesmo Worker em arquivo único, para colar na aba "Edit code" do painel
```

## Personalizar textos e fotos

Edite o objeto `CONFIG` no topo de `public/app.js`:

```js
const CONFIG = {
  landing: { image: "/images/placeholder.svg", eyebrow: "...", title: "...", subtitle: "...", buttonLabel: "Iniciar" },
  thanks:  { image: "/images/placeholder.svg", title: "...", message: "..." },
};
```

Para trocar as fotos, coloque o arquivo (jpg/png) dentro de `public/images/` e aponte `image` para o
novo caminho, ex. `"/images/foto-equipe.jpg"`.

## Rodar localmente

```bash
npm install
npm run dev
```

## Publicar (deploy)

Este repositório já está configurado para reutilizar os recursos Cloudflare existentes:
- Worker: `formsvagas`
- Banco D1: `solua-candidaturas` (tabela `candidaturas` já criada)

Para publicar a partir da sua máquina:

```bash
npm install
npx wrangler login   # autentica com sua conta Cloudflare
npm run deploy
```

Ou conecte este repositório ao Worker pelo painel da Cloudflare (**Workers & Pages → formsvagas →
Settings → Builds**) apontando para a branch deste projeto — cada push passa a publicar
automaticamente.

## Dados — onde ficam e como acompanhar

Cada envio é validado no servidor (`src/index.js`) e gravado na tabela `candidaturas` do banco D1
**`solua-candidaturas`**, incluindo a confirmação de autorização LGPD. Envios sem a autorização
(`lgpd = "Não"`) são rejeitados e nada é salvo.

Duas formas de consultar as respostas:

1. **Painel `/admin`** (recomendado): abra `https://<seu-worker>/admin`, informe o token de
   administrador e veja todas as candidaturas numa tabela, com botão para exportar CSV.
   - Configure o token em **Settings → Variables and Secrets → Add** → tipo *Secret* → variable name
     `ADMIN_TOKEN` → valor: uma senha à sua escolha. Sem isso o `/admin` fica bloqueado (401).
2. **Direto no D1**: painel Cloudflare → **Workers & Pages → D1 → solua-candidaturas → Console**,
   rode `SELECT * FROM candidaturas ORDER BY criado_em DESC;`.
