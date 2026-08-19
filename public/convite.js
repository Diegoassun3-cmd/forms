/**
 * Convite de papel — lógica do app.
 * Busca a configuração em /api/convite/config (editável pelo painel /admin) e monta
 * a experiência. Não é necessário editar este arquivo.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let CFG = {};

  // ------------------------------------------------------------------
  // Utilitários
  // ------------------------------------------------------------------
  function textoOuOculta(elId, valor, wrapperId) {
    const el = $(elId);
    const wrap = wrapperId ? $(wrapperId) : el;
    if (!valor) { if (wrap) wrap.classList.add('oculto'); return; }
    if (el) el.textContent = valor;
  }

  function escaparHtml(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function paramUrl(nome) {
    try { return new URLSearchParams(window.location.search).get(nome); } catch (e) { return null; }
  }

  // ------------------------------------------------------------------
  // 1. Identidade visual (cores, fontes, botões) via CSS custom properties
  // ------------------------------------------------------------------
  function aplicarIdentidadeVisual() {
    const v = CFG.visual || {};
    const root = document.documentElement.style;
    const mapa = {
      corPapel: '--papel', corPapelSombra: '--papel-sombra',
      corEnvelope: '--envelope', corEnvelopeForro: '--envelope-forro',
      corTinta: '--tinta', corDestaque: '--destaque',
      corFundo1: '--fundo-1', corFundo2: '--fundo-2',
    };
    Object.keys(mapa).forEach((chave) => { if (v[chave]) root.setProperty(mapa[chave], v[chave]); });
    if (v.selo && v.selo.cor) root.setProperty('--cor-selo', v.selo.cor);
    root.setProperty('--raio-botao', v.botoesArredondados === false ? '10px' : '999px');
    if (!v.texturaPapel) document.querySelectorAll('.textura').forEach((el) => el.classList.remove('textura'));
  }

  // ------------------------------------------------------------------
  // 2. Fundo em tela cheia (foto ou vídeo), a partir da abertura do convite
  // ------------------------------------------------------------------
  function montarFundoTelaCheia() {
    const f = CFG.fundoTelaCheia || {};
    const container = $('fundo-tela-cheia');
    if (!container) return;
    document.documentElement.style.setProperty('--overlay-opacidade', f.opacidadeOverlay != null ? f.opacidadeOverlay : 0.55);

    if (!f.ativo) { container.innerHTML = ''; return; }

    if (f.tipo === 'video' && f.videoUrl) {
      container.innerHTML = `<video autoplay loop playsinline ${f.videoMudo === false ? '' : 'muted'} src="${escaparHtml(f.videoUrl)}"></video><div class="fundo-overlay"></div>`;
      const video = container.querySelector('video');
      if (video) video.play().catch(() => {});
    } else if (f.tipo === 'foto' && f.fotoUrl) {
      container.innerHTML = `<img src="${escaparHtml(f.fotoUrl)}" alt="">` + '<div class="fundo-overlay"></div>';
    } else {
      container.innerHTML = '';
    }
  }

  function ativarFundoTelaCheia(ativar) {
    const f = CFG.fundoTelaCheia || {};
    const container = $('fundo-tela-cheia');
    if (!container) return;
    const temMidia = f.ativo && ((f.tipo === 'foto' && f.fotoUrl) || (f.tipo === 'video' && f.videoUrl));
    container.classList.toggle('ativo', !!(ativar && temMidia));
  }

  // ------------------------------------------------------------------
  // 3. Personalização do convidado (via ?para=Nome na URL)
  // ------------------------------------------------------------------
  function nomeConvidado() {
    const p = CFG.personalizacao || {};
    if (!p.ativo) return '';
    const valor = paramUrl(p.parametroUrl || 'para');
    return valor ? decodeURIComponent(valor.replace(/\+/g, ' ')) : '';
  }

  // ------------------------------------------------------------------
  // 4. Preenche textos do envelope e da carta
  // ------------------------------------------------------------------
  function preencherConteudo() {
    const ev = CFG.evento || {};
    const v = CFG.visual || {};
    const marca = CFG.marca || {};
    const convidado = nomeConvidado();

    if ($('txt-chamada')) $('txt-chamada').textContent = (ev.chamada || 'Você está convidado').toUpperCase();
    if ($('txt-endereco')) $('txt-endereco').textContent = convidado || (CFG.personalizacao && CFG.personalizacao.textoPadrao) || 'Convidado(a) Especial';
    if ($('selo-iniciais')) $('selo-iniciais').textContent = (v.selo && v.selo.iniciais) || marca.monograma || 'S';
    if (v.selo && v.selo.ativo === false) { $('btn-selo') && ($('btn-selo').style.display = 'none'); }

    const logoEl = $('carta-logo');
    if (logoEl) {
      if (marca.logoUrl) logoEl.innerHTML = `<img src="${escaparHtml(marca.logoUrl)}" alt="${escaparHtml(marca.nome || 'Logo')}">`;
      else logoEl.textContent = marca.monograma || 'S';
    }

    if ($('txt-anfitriao')) $('txt-anfitriao').textContent = (ev.anfitriao || marca.nome || '').toUpperCase();
    if ($('txt-saudacao')) textoOuOculta('txt-saudacao', convidado ? `Querido(a) ${convidado},` : (ev.saudacao || ''));
    if ($('txt-titulo')) $('txt-titulo').textContent = ev.titulo || '';
    textoOuOculta('txt-subtitulo', (ev.subtitulo || '').toUpperCase());
    textoOuOculta('txt-mensagem', ev.mensagem);

    if ($('txt-data')) $('txt-data').textContent = ev.dataLabel || '';
    if ($('txt-hora')) $('txt-hora').textContent = ev.horaLabel || '';
    if ($('txt-local-nome')) $('txt-local-nome').textContent = (ev.local && ev.local.nome) || '';
    if ($('txt-local-endereco')) $('txt-local-endereco').textContent = (ev.local && ev.local.endereco) || '';

    if (ev.trajes && ev.trajes.texto) {
      $('bloco-trajes') && $('bloco-trajes').classList.remove('oculto');
      $('txt-traje') && ($('txt-traje').textContent = ev.trajes.texto);
    }
    if (ev.avisoExtra && ev.avisoExtra.ativo) {
      $('aviso-extra') && $('aviso-extra').classList.remove('oculto');
      $('aviso-extra-titulo') && ($('aviso-extra-titulo').textContent = ev.avisoExtra.titulo || 'Observação');
      $('aviso-extra-texto') && ($('aviso-extra-texto').textContent = ev.avisoExtra.texto || '');
    }

    document.title = `Convite — ${ev.titulo || marca.nome || ''}`;
  }

  // ------------------------------------------------------------------
  // 5. Mídia dentro da carta: foto, vídeo ou nada — e mini galeria
  // ------------------------------------------------------------------
  function montarMidia() {
    const m = CFG.midiaCartao || {};
    const container = $('midia-container');
    if (!container) return;

    if (m.tipo === 'foto' && m.fotoUrl) {
      container.innerHTML = `
        <div class="midia-moldura">
          <img src="${escaparHtml(m.fotoUrl)}" alt="${escaparHtml(m.fotoAlt || '')}" loading="lazy">
        </div>
        ${m.legenda ? `<p class="midia-legenda">${escaparHtml(m.legenda)}</p>` : ''}`;
      const img = container.querySelector('img');
      if (img) {
        img.addEventListener('error', function onErr() {
          img.removeEventListener('error', onErr);
          const moldura = img.closest('.midia-moldura');
          if (moldura) moldura.innerHTML = '<div class="midia-placeholder"><span>Envie a foto de capa pelo painel administrativo</span></div>';
        });
      }
    } else if (m.tipo === 'video' && m.videoUrl) {
      const autoplayAttrs = m.videoAutoplay ? 'autoplay playsinline' : 'controls';
      container.innerHTML = `
        <div class="midia-moldura" id="midia-video-wrap">
          <video id="midia-video" ${autoplayAttrs} ${m.videoLoop ? 'loop' : ''} ${m.videoMudo ? 'muted' : ''}
            ${m.videoPoster ? `poster="${escaparHtml(m.videoPoster)}"` : ''}>
            <source src="${escaparHtml(m.videoUrl)}" type="video/mp4">
          </video>
          ${m.videoBotaoSom ? '<button class="midia-som-btn" id="btn-midia-som" type="button">ATIVAR SOM</button>' : ''}
        </div>
        ${m.legenda ? `<p class="midia-legenda">${escaparHtml(m.legenda)}</p>` : ''}`;

      const video = $('midia-video');
      const btnSom = $('btn-midia-som');
      if (video && m.videoAutoplay) video.play().catch(() => {});
      if (btnSom && video) {
        btnSom.addEventListener('click', () => {
          video.muted = !video.muted;
          btnSom.textContent = video.muted ? 'ATIVAR SOM' : 'SILENCIAR';
        });
      }
      if (video) {
        video.addEventListener('error', function onErr() {
          video.removeEventListener('error', onErr);
          const moldura = video.closest('.midia-moldura');
          if (moldura) moldura.innerHTML = '<div class="midia-placeholder"><span>Envie o vídeo de capa pelo painel administrativo</span></div>';
        });
      }
    } else {
      container.innerHTML = '';
    }

    const galeriaContainer = $('galeria-container');
    if (galeriaContainer) {
      if (Array.isArray(m.galeria) && m.galeria.length) {
        galeriaContainer.innerHTML = `<div class="mini-galeria">${m.galeria
          .map((g) => `<img src="${escaparHtml(g.url)}" alt="${escaparHtml(g.alt || '')}" loading="lazy">`)
          .join('')}</div>`;
      } else {
        galeriaContainer.innerHTML = '';
      }
    }
  }

  // ------------------------------------------------------------------
  // 6. Contagem regressiva até o evento
  // ------------------------------------------------------------------
  let timerContagem = null;
  function iniciarContagem() {
    const ev = CFG.evento || {};
    const container = $('contagem-regressiva');
    if (!container || !CFG.recursos || CFG.recursos.contagemRegressiva === false || !ev.dataISO) return;
    const alvo = new Date(ev.dataISO).getTime();
    if (isNaN(alvo)) return;
    container.classList.remove('oculto');

    function atualizar() {
      const diff = alvo - Date.now();
      if (diff <= 0) {
        container.innerHTML = '<div class="contagem-item contagem-hoje"><span class="n">É HOJE</span></div>';
        clearInterval(timerContagem);
        return;
      }
      const dias = Math.floor(diff / 86400000);
      const horas = Math.floor((diff % 86400000) / 3600000);
      const min = Math.floor((diff % 3600000) / 60000);
      container.innerHTML = `
        <div class="contagem-item"><span class="n">${dias}</span><span class="l">DIAS</span></div>
        <div class="contagem-item"><span class="n">${horas}</span><span class="l">HORAS</span></div>
        <div class="contagem-item"><span class="n">${min}</span><span class="l">MIN</span></div>`;
    }
    atualizar();
    timerContagem = setInterval(atualizar, 60000);
  }

  // ------------------------------------------------------------------
  // 7. Formulário dinâmico
  // ------------------------------------------------------------------
  function montarFormulario() {
    const f = (CFG.formulario && CFG.formulario.campos) || {};
    $('txt-form-titulo') && ($('txt-form-titulo').textContent = (CFG.formulario && CFG.formulario.titulo) || 'Confirme sua presença');
    $('txt-form-subtitulo') && ($('txt-form-subtitulo').textContent = (CFG.formulario && CFG.formulario.subtitulo) || '');
    $('btn-enviar-form') && ($('btn-enviar-form').textContent = (CFG.formulario && CFG.formulario.textoBotao) || 'CONFIRMAR PRESENÇA');

    function config(campo) { return f[campo] || { ativo: true, obrigatorio: false }; }

    aplicarCampo('grupo-email', 'campo-email', config('email'));
    aplicarCampo('grupo-telefone', 'campo-telefone', config('telefone'));
    aplicarCampo('grupo-empresa', 'campo-empresa', config('empresa'));
    aplicarCampo('grupo-restricoes', 'campo-restricoes', config('restricoesAlimentares'));

    const acompCfg = config('acompanhantes');
    const grupoAcomp = $('grupo-acompanhantes');
    const selectAcomp = $('campo-acompanhantes');
    if (acompCfg.ativo === false) {
      grupoAcomp && grupoAcomp.classList.add('oculto');
    } else if (selectAcomp) {
      const max = acompCfg.maximo != null ? acompCfg.maximo : 3;
      selectAcomp.innerHTML = '<option value="">Selecione</option><option value="0">Apenas eu</option>' +
        Array.from({ length: max }, (_, i) => i + 1).map((n) => `<option value="${n}">+ ${n} acompanhante${n > 1 ? 's' : ''}</option>`).join('');
      if (acompCfg.obrigatorio) selectAcomp.required = true;
    }

    const extraCfg = f.perguntaExtra || { ativo: false };
    const grupoExtra = $('grupo-extra');
    if (!extraCfg.ativo) {
      grupoExtra && grupoExtra.classList.add('oculto');
    } else {
      $('label-extra') && ($('label-extra').textContent = (extraCfg.label || 'Pergunta extra').toUpperCase());
      $('campo-extra') && ($('campo-extra').placeholder = extraCfg.placeholder || '');
      if (extraCfg.obrigatorio) $('campo-extra') && ($('campo-extra').required = true);
    }

    if (config('email').ativo === false && config('telefone').ativo === false) $('linha-email-tel') && $('linha-email-tel').classList.add('oculto');
    if (config('empresa').ativo === false && acompCfg.ativo === false) $('linha-empresa-acomp') && $('linha-empresa-acomp').classList.add('oculto');

    const convidado = nomeConvidado();
    if (convidado && $('campo-nome')) $('campo-nome').value = convidado;
  }

  function aplicarCampo(grupoId, campoId, cfgCampo) {
    const grupo = $(grupoId);
    const campo = $(campoId);
    if (!cfgCampo || cfgCampo.ativo === false) { grupo && grupo.classList.add('oculto'); return; }
    if (campo && cfgCampo.obrigatorio) campo.required = true;
  }

  // ------------------------------------------------------------------
  // 8. Navegação entre etapas
  // ------------------------------------------------------------------
  const etapas = ['etapa-envelope', 'etapa-carta', 'etapa-form', 'etapa-confirmacao'];
  function mostrarEtapa(id) {
    etapas.forEach((e) => { $(e).classList.toggle('oculto', e !== id); });
    ativarFundoTelaCheia(id !== 'etapa-envelope');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function abrirEnvelope() {
    $('envelope').classList.add('aberto');
    if ($('instrucao-selo')) $('instrucao-selo').textContent = 'Toque na carta para ler o convite';
    if (CFG.recursos && CFG.recursos.somAoAbrirEnvelope) tocarSomAbrir();
  }

  function tocarSomAbrir() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(340, ctx.currentTime);
      g.gain.setValueAtTime(0.06, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      o.connect(g).connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.4);
    } catch (e) { /* silencioso se não suportado */ }
  }

  function irParaCarta() { mostrarEtapa('etapa-carta'); iniciarContagem(); }

  // ------------------------------------------------------------------
  // 9. Envio do formulário (para o servidor)
  // ------------------------------------------------------------------
  async function handleSubmitForm(evt) {
    evt.preventDefault();
    const form = evt.target;
    const fd = new FormData(form);
    const btn = $('btn-enviar-form');
    const erroEl = $('status-envio-erro');
    if (erroEl) erroEl.classList.add('oculto');

    const dados = {
      nome: (fd.get('nome') || '').trim(),
      email: (fd.get('email') || '').trim(),
      telefone: (fd.get('telefone') || '').trim(),
      empresa: (fd.get('empresa') || '').trim(),
      acompanhantes: fd.get('acompanhantes') || '',
      restricoes: (fd.get('restricoes') || '').trim(),
      extra: (fd.get('extra') || '').trim(),
    };

    btn.disabled = true;
    const textoOriginal = btn.textContent;
    btn.textContent = 'ENVIANDO...';

    let statusMsg = 'Confirmação enviada com sucesso.';
    try {
      const resp = await fetch('/api/convite/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
      if (!resp.ok) throw new Error('Falha no envio');
    } catch (e) {
      statusMsg = 'Não foi possível enviar agora. Tente novamente em instantes.';
      btn.disabled = false;
      btn.textContent = textoOriginal;
      if (erroEl) { erroEl.textContent = statusMsg; erroEl.classList.remove('oculto'); }
      else alert(statusMsg);
      return;
    }

    btn.disabled = false;
    btn.textContent = textoOriginal;

    mostrarResumoConfirmacao(dados, statusMsg);
    mostrarEtapa('etapa-confirmacao');
    if (CFG.recursos && CFG.recursos.celebracaoAoConfirmar) dispararConfete();
  }

  function mostrarResumoConfirmacao(dados, statusMsg) {
    const ev = CFG.evento || {};
    $('resumo-nome') && ($('resumo-nome').textContent = dados.nome || '-');

    if (dados.email) $('resumo-email') && ($('resumo-email').textContent = dados.email);
    else $('resumo-email-wrap') && $('resumo-email-wrap').classList.add('oculto');

    if (dados.acompanhantes !== '') {
      const n = parseInt(dados.acompanhantes, 10);
      $('resumo-acompanhantes') && ($('resumo-acompanhantes').textContent = n > 0 ? `Você + ${n} acompanhante(s)` : 'Apenas você');
    } else {
      $('resumo-acompanhantes-wrap') && $('resumo-acompanhantes-wrap').classList.add('oculto');
    }

    const linkMapa = $('link-mapa');
    if (linkMapa) {
      if (ev.local && ev.local.mapaUrl) linkMapa.href = ev.local.mapaUrl;
      else linkMapa.classList.add('oculto');
    }
    const linkTrajes = $('link-trajes');
    if (linkTrajes) {
      if (ev.trajes && ev.trajes.link) linkTrajes.href = ev.trajes.link;
      else linkTrajes.classList.add('oculto');
    }

    const btnCal = $('link-calendario');
    if (btnCal) {
      if (CFG.recursos && CFG.recursos.botaoAdicionarCalendario !== false && ev.dataISO) btnCal.onclick = () => baixarICS();
      else btnCal.classList.add('oculto');
    }
    const btnShare = $('link-compartilhar');
    if (btnShare) {
      if (CFG.recursos && CFG.recursos.botaoCompartilhar !== false) btnShare.onclick = () => compartilharConvite();
      else btnShare.classList.add('oculto');
    }

    $('status-envio') && ($('status-envio').textContent = statusMsg || '');

    const contato = CFG.contato || {};
    const partes = [];
    if (contato.whatsapp) partes.push(`<a href="https://wa.me/${contato.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>`);
    if (contato.instagram) partes.push(`<a href="https://instagram.com/${String(contato.instagram).replace('@', '')}" target="_blank" rel="noopener">Instagram</a>`);
    if (contato.site) partes.push(`<a href="${contato.site}" target="_blank" rel="noopener">Site</a>`);
    $('rodape-contato') && ($('rodape-contato').innerHTML = partes.join(' • '));
  }

  // ------------------------------------------------------------------
  // 10. Adicionar ao calendário (.ics) e compartilhar
  // ------------------------------------------------------------------
  function baixarICS() {
    const ev = CFG.evento || {};
    const inicio = new Date(ev.dataISO);
    if (isNaN(inicio.getTime())) return;
    const fim = new Date(inicio.getTime() + 3 * 60 * 60 * 1000);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endereco = (ev.local && (ev.local.nome + ' - ' + ev.local.endereco)) || '';
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Convite//PT-BR', 'BEGIN:VEVENT',
      `UID:${Date.now()}@convite`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(inicio)}`, `DTEND:${fmt(fim)}`,
      `SUMMARY:${(ev.titulo || 'Evento').replace(/\r?\n/g, ' ')}`,
      `DESCRIPTION:${(ev.mensagem || '').replace(/\r?\n/g, ' ')}`,
      `LOCATION:${endereco.replace(/\r?\n/g, ' ')}`, 'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${(ev.titulo || 'evento').replace(/\s+/g, '-').toLowerCase()}.ics`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function compartilharConvite() {
    const ev = CFG.evento || {};
    const dadosShare = { title: `Convite — ${ev.titulo || ''}`, text: `${ev.chamada || 'Você está convidado'}: ${ev.titulo || ''}`, url: window.location.href };
    if (navigator.share) { try { await navigator.share(dadosShare); } catch (e) {} }
    else {
      try { await navigator.clipboard.writeText(window.location.href); alert('Link do convite copiado!'); }
      catch (e) { prompt('Copie o link do convite:', window.location.href); }
    }
  }

  // ------------------------------------------------------------------
  // 11. Confete leve na confirmação
  // ------------------------------------------------------------------
  function dispararConfete() {
    const cores = [getComputedStyle(document.documentElement).getPropertyValue('--destaque').trim() || '#004BA3', '#F2EDE6', '#1c2733'];
    for (let i = 0; i < 26; i++) {
      const c = document.createElement('div');
      c.className = 'confete';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = cores[Math.floor(Math.random() * cores.length)];
      c.style.animationDuration = 2.4 + Math.random() * 1.6 + 's';
      c.style.opacity = String(0.6 + Math.random() * 0.4);
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 4200);
    }
  }

  // ------------------------------------------------------------------
  // 12. Reset — nova confirmação
  // ------------------------------------------------------------------
  function resetarTudo() {
    $('form-confirmar') && $('form-confirmar').reset();
    $('envelope') && $('envelope').classList.remove('aberto');
    if ($('instrucao-selo')) $('instrucao-selo').textContent = 'Toque no selo para abrir o convite';
    mostrarEtapa('etapa-envelope');
  }

  // ------------------------------------------------------------------
  // Inicialização
  // ------------------------------------------------------------------
  async function iniciar() {
    try {
      const resp = await fetch('/api/convite/config', { cache: 'no-store' });
      const data = await resp.json();
      CFG = (data && data.config) || {};
    } catch (e) {
      console.error('Não foi possível carregar a configuração do convite.', e);
      CFG = {};
    }

    aplicarIdentidadeVisual();
    montarFundoTelaCheia();
    preencherConteudo();
    montarMidia();
    montarFormulario();

    $('btn-selo') && $('btn-selo').addEventListener('click', abrirEnvelope);
    $('carta-espiando') && $('carta-espiando').addEventListener('click', () => {
      if ($('envelope').classList.contains('aberto')) irParaCarta(); else abrirEnvelope();
    });
    $('carta-espiando') && $('carta-espiando').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if ($('envelope').classList.contains('aberto')) irParaCarta(); else abrirEnvelope();
      }
    });

    $('btn-ir-formulario') && $('btn-ir-formulario').addEventListener('click', () => mostrarEtapa('etapa-form'));
    $('btn-voltar-envelope') && $('btn-voltar-envelope').addEventListener('click', () => {
      $('envelope').classList.remove('aberto');
      if ($('instrucao-selo')) $('instrucao-selo').textContent = 'Toque no selo para abrir o convite';
      mostrarEtapa('etapa-envelope');
    });
    $('btn-voltar-carta') && $('btn-voltar-carta').addEventListener('click', () => mostrarEtapa('etapa-carta'));
    $('form-confirmar') && $('form-confirmar').addEventListener('submit', handleSubmitForm);
    $('btn-nova-confirmacao') && $('btn-nova-confirmacao').addEventListener('click', resetarTudo);

    // usado só pela pré-visualização no /admin: pula direto pro final, sem preencher nada
    if (new URLSearchParams(window.location.search).get('preview_skip') === '1') {
      mostrarResumoConfirmacao({ nome: 'Convidado(a) de teste', email: '', acompanhantes: '' }, 'Pré-visualização');
      mostrarEtapa('etapa-confirmacao');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
