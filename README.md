# Solua Imóveis — Formulários

Três formulários independentes, cada um com sua tela inicial, etapas e tela final personalizáveis,
administrados a partir do mesmo painel `/admin`. Rodam como um único Cloudflare Worker com assets
estáticos, gravando cada resposta em tabelas próprias no banco D1.

- **Vagas** (`/`) — candidatura de corretores(as) parceiros(as): 5 etapas fixas + LGPD.
- **Indicações** (`/indicacao`) — indicação de imóvel, seguro ou consórcio: 5 etapas, com a etapa
  "sobre a oportunidade" condicional — só mostra as perguntas do tipo escolhido no início (imóvel,
  seguro ou consórcio), sem obrigar quem indica a passar por perguntas que não fazem sentido pra ele.
  Dá pra indicar mais de uma pessoa/oportunidade no mesmo envio (até 5) — o botão "+ Adicionar outra
  indicação", ao final da etapa 3, guarda a indicação atual e limpa os campos pra receber a próxima.
- **Captação** (`/captacao`) — cadastro de imóvel pra venda ou locação: 5 etapas (dados de quem
  cadastra, objetivo, endereço, tipo de imóvel, valor + LGPD), com o campo "Valor pretendido"
  aparecendo só quando a pessoa responde que já tem um valor em mente.

## Estrutura

```
public/               → front-end (HTML/CSS/JS puro, sem build step)
  index.html          → telas do formulário de Vagas: inicial, 5 etapas, agradecimento
  app.js              → CONFIG, navegação e validação do formulário de Vagas
  indicacao.html       → telas do formulário de Indicações (mesma lógica, com etapa condicional)
  indicacao.js          → CONFIG, navegação, validação e lógica condicional do form de Indicações
  captacao.html         → telas do formulário de Captação de imóveis
  captacao.js           → CONFIG, navegação e validação do form de Captação (com campo condicional)
  admin.html           → painel administrativo (protegido por token) — cobre os três formulários
  styles.css           → estilos compartilhados pelos três formulários e pela tela inicial/final
  images/              → fotos padrão
src/index.js           → Worker: serve os assets e expõe as rotas de API (D1)
migrations/            → schema SQL (candidaturas, indicações, captações e as tabelas de configuração)
wrangler.jsonc         → configuração do Worker (nome, assets, binding do D1)
dashboard-worker.js    → mesmo Worker em arquivo único, para colar na aba "Edit code" do painel
```

## Personalizar textos, capa e perguntas — sem mexer em código

A forma recomendada é pela aba **Configurações** dentro do `/admin`: escolha no topo qual dos três
formulários você quer editar (**Vagas**, **Indicações** ou **Captação** — cada um com sua própria
configuração, independente dos demais) e ajuste título/subtítulo/botão da tela inicial, tamanho do
título, capa (upload de arquivo + posição), logo (upload de arquivo, posição e tamanho), rodapé,
texto de agradecimento e páginas extras. Tudo fica salvo no banco D1 e o site aplica na hora, sem
precisar publicar de novo.

Os objetos `CONFIG` no topo de `public/app.js`, `public/indicacao.js` e `public/captacao.js` só são
usados como **valor padrão** enquanto nada foi salvo em Configurações ainda (ou se o banco estiver
fora do ar).

## Rodar localmente

```bash
npm install
npm run dev
```

## Publicar (deploy)

Este repositório já está configurado para reutilizar os recursos Cloudflare existentes:
- Worker: `formsvagas`
- Banco D1: `solua-candidaturas` (tabelas `candidaturas`, `indicacoes`, `captacoes`, `site_config`,
  `indicacao_config` e `captacao_config` já criadas)

Para publicar a partir da sua máquina:

```bash
npm install
npx wrangler login   # autentica com sua conta Cloudflare
npm run deploy
```

Ou conecte este repositório ao Worker pelo painel da Cloudflare (**Workers & Pages → formsvagas →
Settings → Builds**) apontando para a branch deste projeto — cada push passa a publicar
automaticamente.

Sem acesso a `wrangler`/API, publique colando `dashboard-worker.js` na aba **Edit code** do Worker
no painel da Cloudflare e clicando em **Deploy**.

## Dados — onde ficam e como acompanhar

Cada envio é validado no servidor (`src/index.js`) antes de ser gravado. As candidaturas de Vagas e
os cadastros de Captação exigem a autorização LGPD (`lgpd = "Não"` é rejeitado); as indicações
exigem a confirmação de que quem indicou tem autorização para compartilhar os dados da pessoa
indicada.

Duas formas de consultar as respostas:

1. **Painel `/admin`** (recomendado): abra `https://<seu-worker>/admin`, informe o token de
   administrador. Seis abas:
   - **Candidaturas**: respostas do formulário de Vagas — tabela, exportação em CSV e exclusão por linha.
   - **Indicações**: respostas do formulário de Indicações — mesma ideia (tabela, CSV, exclusão),
     incluindo o tipo escolhido (imóvel/seguro/consórcio) e os detalhes específicos de cada um.
   - **Captações**: cadastros de imóveis recebidos — mesma ideia (tabela, CSV, exclusão), incluindo
     endereço completo, tipo de imóvel e valor pretendido.
   - **Páginas**: visão geral de todas as páginas do formulário selecionado no topo (Vagas,
     Indicações ou Captação), na ordem em que aparecem. As páginas extras podem ser reordenadas
     arrastando pelo ícone ⠿ (funciona com mouse e touch) — solte na posição desejada e clique em
     "Salvar ordem".
   - **Configurações**: capa (upload de arquivo, com redimensionamento/compressão automáticos,
     posição e gradiente), logo (upload de arquivo, posição — incluindo centro — e tamanho
     pequeno/médio/grande), rodapé, textos e alinhamento/posição do texto na tela inicial e de
     agradecimento, botão de WhatsApp na tela de agradecimento (segue a paleta de cor do site — não
     aparece no formulário de Indicações), e páginas extras — cada uma com suas próprias perguntas
     (texto curto, texto longo, múltipla escolha de uma ou várias opções, ou sim/não), reordenáveis
     com as setas ↑/↓. Escolha no topo qual formulário está editando — cada um guarda sua própria
     configuração.
   - **Visualizar**: o formulário selecionado ao vivo dentro do próprio painel, pra conferir o
     resultado sem precisar abrir outra aba. O botão "Pular pro final" pula direto pra tela de
     agradecimento sem precisar preencher nenhuma pergunta.
   - Configure o token em **Settings → Variables and Secrets → Add** → tipo *Secret* → variable name
     `ADMIN_TOKEN` → valor: uma senha à sua escolha. Sem isso o `/admin` fica bloqueado (401).
2. **Direto no D1**: painel Cloudflare → **Workers & Pages → D1 → solua-candidaturas → Console**,
   rode `SELECT * FROM candidaturas ORDER BY criado_em DESC;`,
   `SELECT * FROM indicacoes ORDER BY criado_em DESC;` ou
   `SELECT * FROM captacoes ORDER BY criado_em DESC;`.
