# Solua Imóveis — Formulário de candidatura

Formulário para captação de corretores(as) parceiros(as), com uma tela inicial (foto + texto +
botão "Iniciar"), 5 etapas (uma "página" por seção) e uma tela final de agradecimento (foto + texto
personalizáveis). Roda como um Cloudflare Worker com assets estáticos, gravando cada candidatura em
um banco D1.

## Estrutura

```
public/          → front-end (HTML/CSS/JS puro, sem build step)
  index.html     → telas: inicial, 5 etapas do formulário, agradecimento
  app.js         → CONFIG (textos/fotos editáveis), navegação e validação
  styles.css     → estilos
  images/        → fotos da tela inicial e de agradecimento
src/index.js     → Worker: serve os assets e expõe POST /api/submit (grava no D1)
migrations/      → schema SQL da tabela `candidaturas`
wrangler.jsonc   → configuração do Worker (nome, assets, binding do D1)
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
- Worker: `solua`
- Banco D1: `solua-candidaturas` (tabela `candidaturas` já criada)

Para publicar a partir da sua máquina:

```bash
npm install
npx wrangler login   # autentica com sua conta Cloudflare
npm run deploy
```

Ou conecte este repositório ao Worker pelo painel da Cloudflare (**Workers & Pages → solua → Settings
→ Builds**) apontando para a branch deste projeto — cada push passa a publicar automaticamente.

## Dados

Cada envio é validado no servidor (`src/index.js`) e gravado na tabela `candidaturas` do D1, incluindo
a confirmação de autorização LGPD. Envios sem a autorização (`lgpd = "Não"`) são rejeitados.
