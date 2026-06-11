// ============================================================
// pages/rematricula.js — Rematrícula
// Portal do Aluno — CELINPB
// ============================================================
//
// Aluno: solicita rematrícula e acompanha status
// Gestão (secretaria/coordenação/admin): painel de gestão
// ============================================================

Pages.rematricula = {

  render() {
    const gestao = Auth.temPapel('admin', 'coordenacao', 'secretaria');
    return `
      <div class="page-section" id="rem-page">
        <div id="rem-conteudo">
          <div class="spinner-center"><div class="spinner spinner-lg"></div></div>
        </div>
      </div>`;
  },

  async init() {
    Layout.configurar({
      logado   : true,
      titulo   : 'Rematrícula',
      rotaAtiva: 'rematricula'
    });

    const gestao = Auth.temPapel('admin', 'coordenacao', 'secretaria');

    if (gestao) {
      await _initGestao();
    } else {
      await _initAluno();
    }
  }
};


// ============================================================
// VISÃO DO ALUNO
// ============================================================

async function _initAluno() {
  const el = document.getElementById('rem-conteudo');
  if (!el) return;

  try {
    const res = await API.getTurmasRematricula();

    if (!res.success) {
      Components.vazio(el,
        res.error || 'Rematrícula indisponível',
        'O período de rematrícula não está aberto no momento.',
        'fa-solid fa-rotate');
      return;
    }

    const { semestre, proximoSemestre, turmas, formLink } = res.data;

    if (!turmas || turmas.length === 0) {
      Components.vazio(el,
        'Nenhuma turma encontrada',
        'Não há turmas disponíveis para rematrícula no momento.',
        'fa-solid fa-rotate');
      return;
    }

    el.innerHTML = `
      <div class="rem-info-banner">
        <i class="fa-solid fa-circle-info"></i>
        <div>
          <strong>Rematrícula ${proximoSemestre}</strong>
          <p>Selecione a turma desejada para o próximo semestre e envie os documentos necessários.</p>
        </div>
      </div>

      <div id="rem-turmas">
        ${turmas.map((t, i) => _turmaRematHTML(t, i)).join('')}
      </div>`;

    // Inicializa botões de solicitação
    el.querySelectorAll('.btn-solicitar-rem').forEach(btn => {
      btn.addEventListener('click', async () => {
        const turmaAtualId    = btn.dataset.turmaAtual;
        const turmaDesejadaId = btn.dataset.turmaDesejada;
        const semestreId      = btn.dataset.semestre;

        Components.modal({
          titulo   : 'Confirmar solicitação',
          corpo    : `Deseja solicitar rematrícula para a turma <strong>${turmaDesejadaId}</strong>?`,
          confirmar: 'Confirmar',
          cancelar : 'Cancelar',
          onConfirm: async () => {
            const r = await API.solicitarRematricula({ turmaAtualId, turmaDesejadaId, semestreId });
            if (r.success) {
              Components.toast('Solicitação registrada! Agora envie os documentos.', 'success', 5000);
              await _initAluno(); // recarrega
            } else {
              Components.toast(r.error || 'Erro ao solicitar.', 'error');
            }
          }
        });
      });
    });

    // Formulário do Google Forms (iframe)
    if (formLink) {
      const formEl = document.getElementById('rem-form-docs');
      if (formEl) {
        formEl.innerHTML = `
          <div class="rem-form-titulo">
            <i class="fa-solid fa-paperclip"></i> Envio de documentos
          </div>
          <div class="rem-form-iframe-wrapper">
            <iframe src="${formLink}"
              frameborder="0" marginheight="0" marginwidth="0"
              class="rem-form-iframe"
              title="Formulário de documentos para rematrícula">
              Carregando formulário...
            </iframe>
          </div>`;
      }
    }

  } catch (_) {
    Components.vazio(
      document.getElementById('rem-conteudo'),
      'Erro de conexão',
      'Tente recarregar a página.',
      'fa-solid fa-triangle-exclamation'
    );
  }
}


function _turmaRematHTML(t, idx) {
  const delay = `animation-delay:${idx * 0.07}s`;
  const sol   = t.solicitacao;

  // ── Situação já solicitada ──
  if (sol) {
    const cfgStatus = {
      AGUARDANDO   : { label: 'Aguardando',            tipo: 'neutral', icone: 'fa-solid fa-clock' },
      EM_ANALISE   : { label: 'Em análise',            tipo: 'info',    icone: 'fa-solid fa-magnifying-glass' },
      APROVADO     : { label: 'Aprovado',              tipo: 'success', icone: 'fa-solid fa-circle-check' },
      PENDENTE_DOC : { label: 'Pendente de documentos',tipo: 'warning', icone: 'fa-solid fa-triangle-exclamation' },
      RECUSADO     : { label: 'Recusado',              tipo: 'danger',  icone: 'fa-solid fa-circle-xmark' }
    };
    const cfg = cfgStatus[sol.status] || cfgStatus.AGUARDANDO;

    return `
      <div class="rem-card animate-fade-in" style="${delay}">
        <div class="rem-card-header">
          <div class="rem-card-titulo">${t.idioma} — ${t.nomeCurso}</div>
          <div class="rem-card-sub">Turma atual: ${t.turmaAtualId} · ${t.estagio} · ${t.modalidade}</div>
        </div>
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
        ${sol.status === 'PENDENTE_DOC' ? `
        <div class="rem-alerta-doc" id="rem-form-docs-${t.turmaAtualId}">
          <i class="fa-solid fa-paperclip"></i>
          Envie os documentos pendentes pelo formulário abaixo.
        </div>` : ''}
        ${sol.status === 'APROVADO' ? `
        <div class="rem-aprovado-info">
          <i class="fa-solid fa-party-horn"></i>
          Sua rematrícula foi aprovada! Sua matrícula para ${t.proximoSemestre} foi gerada.
        </div>` : ''}
      </div>
      ${sol.status === 'PENDENTE_DOC' ? `<div id="rem-form-docs"></div>` : ''}`;
  }

  // ── Sem solicitação: mostra turmas disponíveis ──
  if (!t.turmasDisponiveis || t.turmasDisponiveis.length === 0) {
    return `
      <div class="rem-card animate-fade-in" style="${delay}">
        <div class="rem-card-header">
          <div class="rem-card-titulo">${t.idioma} — ${t.nomeCurso}</div>
          <div class="rem-card-sub">Turma atual: ${t.turmaAtualId} · ${t.estagio} · ${t.modalidade}</div>
        </div>
        <div class="empty-state" style="padding:var(--space-6) 0">
          <i class="empty-state-icon fa-solid fa-calendar-xmark"></i>
          <p class="empty-state-title">Sem turmas disponíveis</p>
          <p class="empty-state-desc">Não há turmas abertas para ${t.proximoSemestre} nesta modalidade.</p>
        </div>
      </div>`;
  }

  return `
    <div class="rem-card animate-fade-in" style="${delay}">
      <div class="rem-card-header">
        <div class="rem-card-titulo">${t.idioma} — ${t.nomeCurso}</div>
        <div class="rem-card-sub">Turma atual: ${t.turmaAtualId} · ${t.estagio} · ${t.modalidade}</div>
      </div>
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
    </div>
    <div id="rem-form-docs"></div>`;
}


// ============================================================
// VISÃO DA GESTÃO
// ============================================================

const _STATUS_CFG = {
  AGUARDANDO   : { label: 'Aguardando',             tipo: 'neutral' },
  EM_ANALISE   : { label: 'Em análise',             tipo: 'info'    },
  APROVADO     : { label: 'Aprovado',               tipo: 'success' },
  PENDENTE_DOC : { label: 'Pendente de documentos', tipo: 'warning' },
  RECUSADO     : { label: 'Recusado',               tipo: 'danger'  }
};

async function _initGestao() {
  const el = document.getElementById('rem-conteudo');
  if (!el) return;

  el.innerHTML = `
    <div class="rem-gestao-toolbar">
      <div class="rem-filtros" role="group" aria-label="Filtrar por status">
        ${['', 'AGUARDANDO', 'EM_ANALISE', 'PENDENTE_DOC', 'APROVADO', 'RECUSADO'].map(s => `
          <button class="rem-filtro-btn ${s === '' ? 'active' : ''}" data-status="${s}">
            ${s === '' ? 'Todos' : (_STATUS_CFG[s]?.label || s)}
          </button>`).join('')}
      </div>
      <div class="input-wrapper" style="max-width:220px">
        <i class="input-icon fa-solid fa-magnifying-glass"></i>
        <input class="form-input form-input-mono" type="text"
          id="rem-busca" placeholder="Buscar aluno..." autocomplete="off" />
      </div>
    </div>
    <div id="rem-lista-gestao">
      <div class="spinner-center"><div class="spinner"></div></div>
    </div>`;

  let _todos = [];
  let _filtroStatus = '';
  let _filtroBusca  = '';

  // Carrega dados
  const res = await API.getRematriculas();
  if (!res.success) {
    Components.vazio(document.getElementById('rem-lista-gestao'),
      'Erro ao carregar', res.error || '');
    return;
  }
  _todos = res.data || [];
  _renderGestao(_todos, _filtroStatus, _filtroBusca);

  // Filtros de status
  el.querySelectorAll('.rem-filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.rem-filtro-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _filtroStatus = btn.dataset.status;
      _renderGestao(_todos, _filtroStatus, _filtroBusca);
    });
  });

  // Busca por aluno
  let _timer = null;
  document.getElementById('rem-busca')?.addEventListener('input', e => {
    clearTimeout(_timer);
    _timer = setTimeout(() => {
      _filtroBusca = e.target.value.trim().toLowerCase();
      _renderGestao(_todos, _filtroStatus, _filtroBusca);
    }, 250);
  });
}

function _renderGestao(todos, filtroStatus, filtroBusca) {
  const el = document.getElementById('rem-lista-gestao');
  if (!el) return;

  let lista = todos;
  if (filtroStatus) lista = lista.filter(r => r.status === filtroStatus);
  if (filtroBusca)  lista = lista.filter(r =>
    r.nomeAluno.toLowerCase().includes(filtroBusca) ||
    r.alunoId.toLowerCase().includes(filtroBusca));

  if (lista.length === 0) {
    Components.vazio(el, 'Nenhuma solicitação encontrada', '', 'fa-solid fa-inbox');
    return;
  }

  el.innerHTML = lista.map(r => {
    const cfg = _STATUS_CFG[r.status] || _STATUS_CFG.AGUARDANDO;
    return `
      <div class="rem-gestao-item" data-id="${r.rematriculaId}">
        <div class="rem-gestao-info">
          <span class="rem-gestao-nome">${r.nomeAluno}</span>
          <span class="rem-gestao-id mono">${r.alunoId}</span>
          <div class="rem-gestao-meta">
            ${Components.badgeHTML(cfg.label, cfg.tipo)}
            <span class="rem-gestao-turmas">
              ${r.turmaAtualId} → ${r.turmaDesejadaId}
            </span>
            <span class="rem-gestao-data">${r.dataSolicitacao}</span>
          </div>
          ${r.obsSecretaria ? `<div class="rem-gestao-obs">${r.obsSecretaria}</div>` : ''}
          ${r.matriculaId   ? `<div class="rem-gestao-matid">Matrícula: <strong>${r.matriculaId}</strong></div>` : ''}
        </div>
        <button class="btn btn-sm btn-secondary btn-rem-acao" data-id="${r.rematriculaId}"
          aria-label="Atualizar status">
          <i class="fa-solid fa-pen"></i>
        </button>
      </div>`;
  }).join('');

  el.querySelectorAll('.btn-rem-acao').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = todos.find(r => r.rematriculaId === btn.dataset.id);
      if (item) _abrirModalStatus(item, todos);
    });
  });
}

function _abrirModalStatus(item, todos) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  if (!overlay || !content) return;

  const opcoes = ['AGUARDANDO', 'EM_ANALISE', 'APROVADO', 'PENDENTE_DOC', 'RECUSADO'];

  content.innerHTML = `
    <h3 class="modal-title">Atualizar status</h3>
    <div style="margin-bottom:var(--space-2);font-size:var(--text-sm);color:var(--text-muted)">
      ${item.nomeAluno} · ${item.turmaAtualId} → ${item.turmaDesejadaId}
    </div>

    <div style="display:flex;flex-direction:column;gap:var(--space-4);margin-bottom:var(--space-5)">
      <div class="form-group">
        <label class="form-label" for="rem-novo-status">Novo status</label>
        <select class="form-input" id="rem-novo-status">
          ${opcoes.map(s => `
            <option value="${s}" ${s === item.status ? 'selected' : ''}>
              ${_STATUS_CFG[s]?.label || s}
            </option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="rem-obs">Observação (opcional)</label>
        <textarea class="form-input" id="rem-obs" rows="3"
          placeholder="Mensagem para o aluno..."
          style="resize:vertical">${item.obsSecretaria || ''}</textarea>
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn btn-secondary" id="rem-modal-cancelar">Cancelar</button>
      <button class="btn btn-primary"   id="rem-modal-salvar">Salvar</button>
    </div>`;

  overlay.classList.remove('hidden');

  document.getElementById('rem-modal-cancelar')?.addEventListener('click', Components.fecharModal);

  document.getElementById('rem-modal-salvar')?.addEventListener('click', async () => {
    const btn    = document.getElementById('rem-modal-salvar');
    const status = document.getElementById('rem-novo-status').value;
    const obs    = document.getElementById('rem-obs').value.trim();

    Components.btnLoading(btn, 'Salvando...');
    try {
      const res = await API.atualizarStatusRematricula({
        rematriculaId: item.rematriculaId,
        status,
        obsSecretaria: obs
      });

      if (res.success) {
        Components.fecharModal();
        Components.toast(`Status atualizado: ${_STATUS_CFG[status]?.label || status}`, 'success');
        // Atualiza localmente
        const idx = todos.findIndex(r => r.rematriculaId === item.rematriculaId);
        if (idx !== -1) {
          todos[idx].status        = status;
          todos[idx].obsSecretaria = obs;
          todos[idx].dataAtualizacao = new Date().toLocaleDateString('pt-BR');
          if (status === 'APROVADO' && res.data) {
            todos[idx].matriculaId = res.data.matriculaId || '';
          }
        }
        const filtroAtivo = document.querySelector('.rem-filtro-btn.active')?.dataset.status || '';
        const buscaAtiva  = document.getElementById('rem-busca')?.value.trim().toLowerCase() || '';
        _renderGestao(todos, filtroAtivo, buscaAtiva);
      } else {
        Components.toast(res.error || 'Erro ao atualizar.', 'error');
      }
    } catch (_) {
      Components.toast('Erro de conexão.', 'error');
    } finally {
      Components.btnPronto(btn);
    }
  });
}
