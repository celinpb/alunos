// ============================================================
// pages/rematricula.js — Rematrícula (versão expandida)
// Portal do Aluno — CELINPB
// ============================================================

Pages.rematricula = {
  render() {
    return `<div class="page-section" id="rem-page">
      <div id="rem-conteudo">
        <div class="spinner-center"><div class="spinner spinner-lg"></div></div>
      </div>
    </div>`;
  },
  async init() {
    Layout.configurar({ logado: true, titulo: 'Rematrícula', rotaAtiva: 'rematricula' });
    if (Auth.temPapel('admin', 'coordenacao', 'secretaria')) {
      await _remInitGestao();
    } else {
      await _remInitAluno();
    }
  }
};


// ============================================================
// VISÃO DO ALUNO
// ============================================================

async function _remInitAluno() {
  const el = document.getElementById('rem-conteudo');
  if (!el) return;

  try {
    const [resRem, resCfg] = await Promise.all([
      API.getTurmasRematricula(),
      API.getConfigRematricula()
    ]);

    if (!resRem.success) {
      Components.vazio(el, resRem.error || 'Rematrícula indisponível',
        'O período de rematrícula não está aberto.', 'fa-solid fa-rotate');
      return;
    }

    const { semestre, proximoSemestre, turmas, formLink } = resRem.data;
    const config = resCfg.success ? resCfg.data : { documentos: [], semestres: [] };

    // Data limite
    const semInfo = config.semestres?.find(s => s.rematricula);
    const dataLimite = semInfo?.dataLimite || '';

    el.innerHTML = `
      <div class="rem-info-banner">
        <i class="fa-solid fa-circle-info"></i>
        <div>
          <strong>Rematrícula ${proximoSemestre}</strong>
          <p>Selecione a turma para o próximo semestre e envie os documentos necessários.
          ${dataLimite ? `<br>Prazo: <strong>${dataLimite}</strong>.` : ''}</p>
        </div>
      </div>
      <div id="rem-turmas">
        ${turmas.map((t, i) => _remTurmaAlunoHTML(t, i, config)).join('')}
      </div>
      ${formLink ? `<div id="rem-form-area"></div>` : ''}`;

    // Botões de solicitação
    el.querySelectorAll('.btn-solicitar-rem').forEach(btn => {
      btn.addEventListener('click', () => {
        Components.modal({
          titulo   : 'Confirmar solicitação',
          corpo    : `Deseja solicitar rematrícula para a turma <strong>${btn.dataset.turmaDesejada}</strong>?`,
          confirmar: 'Confirmar',
          cancelar : 'Cancelar',
          onConfirm: async () => {
            const r = await API.solicitarRematricula({
              turmaAtualId   : btn.dataset.turmaAtual,
              turmaDesejadaId: btn.dataset.turmaDesejada,
              semestreId     : btn.dataset.semestre
            });
            if (r.success) {
              Components.toast('Solicitação registrada! Envie os documentos abaixo.', 'success', 5000);
              _remInitAluno();
            } else {
              Components.toast(r.error || 'Erro ao solicitar.', 'error');
            }
          }
        });
      });
    });

    // Posição na fila para solicitações existentes
    turmas.forEach(t => {
      if (t.solicitacao) {
        const filaEl = document.getElementById(`rem-fila-${t.turmaAtualId}`);
        if (!filaEl) return;
        API.getPosicaoFila({
          turmaDesejadaId: t.solicitacao.turmaDesejadaId,
          semestreId     : t.proximoSemestreId,
          rematriculaId  : t.solicitacao.rematriculaId
        }).then(res => {
          if (res.success) {
            const d = res.data;
            filaEl.innerHTML = `
              <div class="rem-fila-info ${!d.dentroDoLimite ? 'rem-fila-risco' : ''}">
                <i class="fa-solid fa-list-ol"></i>
                Posição na fila: <strong>${d.posicao}º</strong> de ${d.totalFila}
                solicitação(ões) · ${d.vagas > 0 ? d.vagas + ' vagas' : 'vagas a definir'}
                ${!d.dentroDoLimite ? '<span class="badge badge-danger">Fora do limite de vagas</span>' : ''}
              </div>`;
          }
        });
      }
    });

    // Formulário incorporado
    if (formLink) {
      const formArea = document.getElementById('rem-form-area');
      if (formArea) {
        // Monta URL pré-preenchida com o AlunoID
        const entryId  = config.entryAlunoId || '';
        const alunoId  = Auth.getLogin();
        const urlForm  = entryId
          ? `${formLink}${formLink.includes('?') ? '&' : '?'}entry.${entryId}=${encodeURIComponent(alunoId)}`
          : formLink;

        formArea.innerHTML = `
          <div class="rem-form-titulo">
            <i class="fa-solid fa-paperclip"></i> Envio de documentos
          </div>
          <div class="rem-form-iframe-wrapper">
            <iframe src="${urlForm}" frameborder="0"
              class="rem-form-iframe" title="Envio de documentos para rematrícula">
            </iframe>
          </div>`;
      }
    }

  } catch (_) {
    Components.vazio(el, 'Erro de conexão', 'Tente recarregar a página.', 'fa-solid fa-triangle-exclamation');
  }
}

function _remTurmaAlunoHTML(t, idx, config) {
  const delay = `animation-delay:${idx * 0.07}s`;
  const sol   = t.solicitacao;

  const _STATUS_CFG = {
    AGUARDANDO   : { label: 'Aguardando análise',     tipo: 'neutral', icone: 'fa-solid fa-clock' },
    EM_ANALISE   : { label: 'Em análise',             tipo: 'info',    icone: 'fa-solid fa-magnifying-glass' },
    APROVADO     : { label: 'Aprovado',               tipo: 'success', icone: 'fa-solid fa-circle-check' },
    PENDENTE_DOC : { label: 'Pendente de documentos', tipo: 'warning', icone: 'fa-solid fa-triangle-exclamation' },
    RECUSADO     : { label: 'Recusado',               tipo: 'danger',  icone: 'fa-solid fa-circle-xmark' }
  };

  const header = `
    <div class="rem-card-header">
      <div class="rem-card-titulo">${t.idioma} — ${t.nomeCurso}</div>
      <div class="rem-card-sub">Turma atual: ${t.turmaAtualId} · ${t.estagio} · ${t.modalidade}</div>
    </div>`;

  if (sol) {
    const cfg = _STATUS_CFG[sol.status] || _STATUS_CFG.AGUARDANDO;

    // Mostra documentos inválidos se PENDENTE_DOC
    let docsInvalidosHTML = '';
    if (sol.status === 'PENDENTE_DOC' && sol.validacaoDocs) {
      let validacoes = sol.validacaoDocs;
      if (typeof validacoes === 'string') {
        try { validacoes = JSON.parse(validacoes); } catch(_) { validacoes = []; }
      }
      const invalidos = validacoes.filter(v => v.valido === false || v.valido === 'false');
      if (invalidos.length > 0) {
        const docsConfig = config.documentos || [];
        const justsConfig = config.justificativas || [];
        docsInvalidosHTML = `
          <div class="rem-docs-invalidos">
            <div class="rem-docs-invalidos-titulo">
              <i class="fa-solid fa-triangle-exclamation"></i> Documentos para reenviar:
            </div>
            ${invalidos.map(v => {
              const doc  = docsConfig.find(d => d.docId === v.docId) || {};
              const just = v.justOutro || (justsConfig.find(j => j.justId === v.justId) || {}).texto || '';
              return `<div class="rem-doc-invalido-item">
                <strong>${doc.nome || v.docId}</strong>
                ${just ? `<span>— ${just}</span>` : ''}
              </div>`;
            }).join('')}
          </div>`;
      }
    }

    return `
      <div class="rem-card animate-fade-in" style="${delay}">
        ${header}
        <div class="rem-status-box rem-status-${cfg.tipo}">
          <i class="${cfg.icone}"></i>
          <div>
            <div class="rem-status-label">${cfg.label}</div>
            <div class="rem-status-detalhe">
              Turma solicitada: <strong>${sol.turmaDesejadaId}</strong>
              ${sol.matriculaId ? ` · Matrícula: <strong>${sol.matriculaId}</strong>` : ''}
            </div>
          </div>
        </div>
        <div id="rem-fila-${t.turmaAtualId}"></div>
        ${docsInvalidosHTML}
        ${sol.status === 'APROVADO' ? `
        <div class="rem-aprovado-info">
          <i class="fa-solid fa-circle-check"></i>
          Rematrícula aprovada para ${t.proximoSemestre}!
        </div>` : ''}
      </div>`;
  }

  // Sem solicitação — mostra turmas disponíveis
  if (!t.turmasDisponiveis?.length) {
    return `
      <div class="rem-card animate-fade-in" style="${delay}">
        ${header}
        <div class="empty-state" style="padding:var(--space-6) 0">
          <i class="empty-state-icon fa-solid fa-calendar-xmark"></i>
          <p class="empty-state-title">Sem turmas disponíveis</p>
          <p class="empty-state-desc">Não há turmas abertas para ${t.proximoSemestre} nesta modalidade.</p>
        </div>
      </div>`;
  }

  return `
    <div class="rem-card animate-fade-in" style="${delay}">
      ${header}
      <div class="rem-secao-label">
        <i class="fa-solid fa-list-check"></i>
        Turmas disponíveis para ${t.proximoSemestre}
      </div>
      <div class="rem-turmas-lista">
        ${t.turmasDisponiveis.map(td => `
          <div class="rem-turma-item">
            <div class="rem-turma-info">
              <span class="rem-turma-id mono">${td.turmaId}</span>
              <span class="rem-turma-detalhe">
                ${td.diaSemana} · ${td.horario} · ${td.turno}
                ${td.vagas ? ` · ${td.vagas} vagas` : ''}
              </span>
            </div>
            <button class="btn btn-primary btn-sm btn-solicitar-rem"
              data-turma-atual="${t.turmaAtualId}"
              data-turma-desejada="${td.turmaId}"
              data-semestre="${t.proximoSemestreId}">
              Solicitar
            </button>
          </div>`).join('')}
      </div>
    </div>`;
}


// ============================================================
// VISÃO DA GESTÃO
// ============================================================

const _REM_STATUS_CFG = {
  AGUARDANDO   : { label: 'Aguardando',             tipo: 'neutral' },
  EM_ANALISE   : { label: 'Em análise',             tipo: 'info'    },
  APROVADO     : { label: 'Aprovado',               tipo: 'success' },
  PENDENTE_DOC : { label: 'Pendente de doc.',       tipo: 'warning' },
  RECUSADO     : { label: 'Recusado',               tipo: 'danger'  }
};

async function _remInitGestao() {
  const el = document.getElementById('rem-conteudo');
  if (!el) return;

  el.innerHTML = `
    <div class="rem-gestao-toolbar">
      <div class="rem-filtros">
        ${['','AGUARDANDO','EM_ANALISE','PENDENTE_DOC','APROVADO','RECUSADO'].map(s => `
          <button class="rem-filtro-btn ${s===''?'active':''}" data-status="${s}">
            ${s==='' ? 'Todos' : (_REM_STATUS_CFG[s]?.label || s)}
          </button>`).join('')}
      </div>
      <div class="input-wrapper" style="max-width:200px">
        <i class="input-icon fa-solid fa-magnifying-glass"></i>
        <input class="form-input form-input-mono" type="text"
          id="rem-busca" placeholder="Nome ou matrícula..." autocomplete="off" />
      </div>
    </div>
    <div id="rem-lista-gestao">
      <div class="spinner-center"><div class="spinner"></div></div>
    </div>`;

  let _todos = [];
  let _config = { documentos: [], justificativas: [] };
  let _filtroStatus = '';
  let _filtroBusca  = '';

  const [resRem, resCfg] = await Promise.all([
    API.getRematriculas(),
    API.getConfigRematricula()
  ]);

  if (!resRem.success) {
    Components.vazio(document.getElementById('rem-lista-gestao'), 'Erro ao carregar', resRem.error || '');
    return;
  }

  _todos  = resRem.data || [];
  _config = resCfg.success ? resCfg.data : _config;
  _remRenderGestao(_todos, _filtroStatus, _filtroBusca, _config);

  el.querySelectorAll('.rem-filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.rem-filtro-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _filtroStatus = btn.dataset.status;
      _remRenderGestao(_todos, _filtroStatus, _filtroBusca, _config);
    });
  });

  let _timer = null;
  document.getElementById('rem-busca')?.addEventListener('input', e => {
    clearTimeout(_timer);
    _timer = setTimeout(() => {
      _filtroBusca = e.target.value.trim().toLowerCase();
      _remRenderGestao(_todos, _filtroStatus, _filtroBusca, _config);
    }, 250);
  });
}

function _remRenderGestao(todos, filtroStatus, filtroBusca, config) {
  const el = document.getElementById('rem-lista-gestao');
  if (!el) return;

  let lista = todos;
  if (filtroStatus) lista = lista.filter(r => r.status === filtroStatus);
  if (filtroBusca)  lista = lista.filter(r =>
    r.nomeAluno.toLowerCase().includes(filtroBusca) ||
    r.alunoId.toLowerCase().includes(filtroBusca));

  if (!lista.length) {
    Components.vazio(el, 'Nenhuma solicitação', '', 'fa-solid fa-inbox');
    return;
  }

  el.innerHTML = lista.map(r => {
    const cfg = _REM_STATUS_CFG[r.status] || _REM_STATUS_CFG.AGUARDANDO;
    return `
      <div class="rem-gestao-item">
        <div class="rem-gestao-info">
          <span class="rem-gestao-nome">${r.nomeAluno}</span>
          <span class="rem-gestao-id mono">${r.alunoId}</span>
          <div class="rem-gestao-meta">
            ${Components.badgeHTML(cfg.label, cfg.tipo)}
            <span class="rem-gestao-turmas">${r.turmaAtualId} → ${r.turmaDesejadaId}</span>
            <span class="rem-gestao-data">${r.dataSolicitacao}</span>
          </div>
          ${r.obsSecretaria ? `<div class="rem-gestao-obs">${r.obsSecretaria}</div>` : ''}
          ${r.matriculaId   ? `<div class="rem-gestao-matid">Matrícula: <strong>${r.matriculaId}</strong></div>` : ''}
        </div>
        <button class="btn btn-sm btn-secondary btn-rem-validar" data-id="${r.rematriculaId}">
          <i class="fa-solid fa-pen"></i>
        </button>
      </div>`;
  }).join('');

  el.querySelectorAll('.btn-rem-validar').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = todos.find(r => r.rematriculaId === btn.dataset.id);
      if (item) _remAbrirValidacao(item, todos, config);
    });
  });
}

async function _remAbrirValidacao(item, todos, config) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  if (!overlay || !content) return;

  // Carrega documentos enviados pelo aluno
  content.innerHTML = `
    <h3 class="modal-title">Validar documentos</h3>
    <div style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-4)">
      ${item.nomeAluno} · ${item.alunoId}<br>
      ${item.turmaAtualId} → ${item.turmaDesejadaId}
    </div>
    <div class="spinner-center"><div class="spinner"></div></div>`;
  overlay.classList.remove('hidden');

  const [resDocs, resFila] = await Promise.all([
    API.getDocsAluno(item.alunoId),
    API.getPosicaoFila({
      turmaDesejadaId: item.turmaDesejadaId,
      semestreId     : item.semestreId,
      rematriculaId  : item.rematriculaId
    })
  ]);

  const docs  = resDocs.success  ? resDocs.data   : { encontrado: false, docs: [] };
  const fila  = resFila.success  ? resFila.data   : null;
  const docsConfig   = config.documentos    || [];
  const justConfig   = config.justificativas|| [];

  // Recupera validações anteriores
  let validacoesAntegiores = [];
  if (item.validacaoDocs) {
    try { validacoesAntegiores = JSON.parse(item.validacaoDocs); } catch(_) {}
  }

  content.innerHTML = `
    <h3 class="modal-title">Validar documentos</h3>
    <div style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-3)">
      ${item.nomeAluno} · <span class="mono">${item.alunoId}</span>
      ${fila ? ` · Posição: <strong>${fila.posicao}º/${fila.totalFila}</strong> · ${fila.vagas} vagas` : ''}
    </div>

    ${!docs.encontrado ? `
    <div class="rem-docs-aviso">
      <i class="fa-solid fa-triangle-exclamation"></i>
      Nenhum envio encontrado para este aluno na planilha do Forms.
    </div>` : `
    <div class="rem-docs-enviados">
      <div class="rem-docs-titulo"><i class="fa-solid fa-paperclip"></i> Arquivos enviados</div>
      ${docs.docs.map(d => `
        <div class="rem-doc-link-item">
          <span>${d.coluna}</span>
          <a href="${d.link}" target="_blank" class="btn btn-sm btn-secondary">
            <i class="fa-solid fa-eye"></i> Ver
          </a>
        </div>`).join('')}
    </div>`}

    <div style="margin-top:var(--space-4)">
      <div class="rem-docs-titulo"><i class="fa-solid fa-clipboard-check"></i> Validação</div>
      <div id="rem-validacao-form">
        ${docsConfig.filter(d => d.solicitado).map(doc => {
          const anterior = validacoesAntegiores.find(v => v.docId === doc.docId) || {};
          const valido   = anterior.valido === undefined ? null : (anterior.valido === true || anterior.valido === 'true');
          return `
            <div class="rem-doc-validar-item" data-doc-id="${doc.docId}">
              <div class="rem-doc-validar-nome">
                ${doc.nome}
                ${doc.obrigatorio  ? Components.badgeHTML('Obrigatório',  'warning') : ''}
                ${doc.eliminatorio ? Components.badgeHTML('Eliminatório', 'danger')  : ''}
              </div>
              <div class="rem-doc-validar-btns">
                <button class="btn btn-sm ${valido === true  ? 'btn-primary' : 'btn-secondary'} btn-doc-valido"
                  data-doc="${doc.docId}" data-val="true">
                  <i class="fa-solid fa-check"></i> Válido
                </button>
                <button class="btn btn-sm ${valido === false ? 'btn-danger'  : 'btn-secondary'} btn-doc-invalido"
                  data-doc="${doc.docId}" data-val="false">
                  <i class="fa-solid fa-xmark"></i> Inválido
                </button>
              </div>
              <div class="rem-doc-just-area hidden" id="just-${doc.docId}">
                <select class="form-input form-input-sm" id="just-sel-${doc.docId}">
                  ${justConfig.map(j => `
                    <option value="${j.justId}" ${anterior.justId === j.justId ? 'selected' : ''}>
                      ${j.texto}
                    </option>`).join('')}
                </select>
                <input class="form-input form-input-sm" type="text"
                  id="just-outro-${doc.docId}"
                  placeholder="Descreva o motivo..."
                  style="display:none;margin-top:var(--space-2)"
                  value="${anterior.justOutro || ''}" />
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>

    <span id="rem-val-erro" class="form-error hidden" style="margin-top:var(--space-3)">
      <i class="fa-solid fa-circle-xmark"></i>
      <span id="rem-val-erro-msg"></span>
    </span>

    <div class="modal-footer" style="margin-top:var(--space-5)">
      <button class="btn btn-secondary" id="rem-val-cancelar">Cancelar</button>
      <button class="btn btn-primary"   id="rem-val-salvar">Salvar validação</button>
    </div>`;

  // Toggle válido/inválido
  content.querySelectorAll('.btn-doc-valido, .btn-doc-invalido').forEach(btn => {
    btn.addEventListener('click', () => {
      const docId  = btn.dataset.doc;
      const valido = btn.dataset.val === 'true';
      const item   = content.querySelector(`.rem-doc-validar-item[data-doc-id="${docId}"]`);
      item.querySelector('.btn-doc-valido')  .className = `btn btn-sm ${valido ? 'btn-primary' : 'btn-secondary'} btn-doc-valido`;
      item.querySelector('.btn-doc-invalido').className = `btn btn-sm ${!valido ? 'btn-danger'  : 'btn-secondary'} btn-doc-invalido`;
      const justArea = document.getElementById(`just-${docId}`);
      if (justArea) justArea.classList.toggle('hidden', valido);
    });
  });

  // Mostrar campo "Outro" quando selecionado
  docsConfig.filter(d => d.solicitado).forEach(doc => {
    const sel = document.getElementById(`just-sel-${doc.docId}`);
    const outro = document.getElementById(`just-outro-${doc.docId}`);
    if (!sel || !outro) return;
    const verificar = () => {
      const txt = sel.options[sel.selectedIndex]?.text?.toLowerCase() || '';
      outro.style.display = txt.includes('outro') ? '' : 'none';
    };
    sel.addEventListener('change', verificar);
    verificar();
  });

  // Restaura estado anterior de inválidos
  validacoesAntegiores.forEach(v => {
    if (v.valido === false || v.valido === 'false') {
      const justArea = document.getElementById(`just-${v.docId}`);
      justArea?.classList.remove('hidden');
    }
  });

  document.getElementById('rem-val-cancelar')?.addEventListener('click', Components.fecharModal);

  document.getElementById('rem-val-salvar')?.addEventListener('click', async () => {
    const btn    = document.getElementById('rem-val-salvar');
    const erroBox= document.getElementById('rem-val-erro');
    const erroMsg= document.getElementById('rem-val-erro-msg');
    erroBox.classList.add('hidden');

    // Coleta validações
    const validacoes = docsConfig.filter(d => d.solicitado).map(doc => {
      const item    = content.querySelector(`.rem-doc-validar-item[data-doc-id="${doc.docId}"]`);
      const btnVal  = item?.querySelector('.btn-doc-valido');
      const valido  = btnVal?.className.includes('btn-primary') ?? true;
      const justSel = document.getElementById(`just-sel-${doc.docId}`);
      const justOut = document.getElementById(`just-outro-${doc.docId}`);
      return {
        docId    : doc.docId,
        valido   : valido,
        justId   : valido ? '' : (justSel?.value || ''),
        justOutro: valido ? '' : (justOut?.style.display !== 'none' ? justOut?.value || '' : '')
      };
    });

    // Valida: docs inválidos precisam de justificativa
    const semJust = validacoes.find(v => !v.valido && !v.justId && !v.justOutro);
    if (semJust) {
      erroMsg.textContent = 'Informe a justificativa para todos os documentos inválidos.';
      erroBox.classList.remove('hidden');
      return;
    }

    Components.btnLoading(btn, 'Salvando...');
    try {
      const res = await API.validarDocs({ rematriculaId: item.rematriculaId, validacoes });
      if (res.success) {
        Components.fecharModal();
        Components.toast(`Validação salva. Status: ${_REM_STATUS_CFG[res.data.status]?.label || res.data.status}`, 'success');
        const idx = todos.findIndex(r => r.rematriculaId === item.rematriculaId);
        if (idx !== -1) {
          todos[idx].status         = res.data.status;
          todos[idx].validacaoDocs  = JSON.stringify(validacoes);
          todos[idx].matriculaId    = res.data.matriculaId || todos[idx].matriculaId;
        }
        const filtroAtivo = document.querySelector('.rem-filtro-btn.active')?.dataset.status || '';
        const buscaAtiva  = document.getElementById('rem-busca')?.value.trim().toLowerCase() || '';
        _remRenderGestao(todos, filtroAtivo, buscaAtiva, config);
      } else {
        erroMsg.textContent = res.error || 'Erro ao salvar.';
        erroBox.classList.remove('hidden');
      }
    } catch (_) {
      erroMsg.textContent = 'Erro de conexão.';
      erroBox.classList.remove('hidden');
    } finally {
      Components.btnPronto(btn);
    }
  });
}
