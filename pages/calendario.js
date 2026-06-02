// ============================================================
// pages/calendario.js — Calendário e Eventos
// Portal do Aluno — CELINPB
// ============================================================

Pages.calendario = {

  render() {
    const gestao = Auth.temPapel('admin', 'coordenacao', 'secretaria');
    return `
      <div class="page-section" id="cal-page">

        <div class="cal-toolbar">
          <!-- Alternador de visão -->
          <div class="cal-view-toggle" role="group" aria-label="Modo de visualização">
            <button class="cal-view-btn active" data-view="lista" aria-pressed="true">
              <i class="fa-solid fa-list"></i> Lista
            </button>
            <button class="cal-view-btn" data-view="grade" aria-pressed="false">
              <i class="fa-solid fa-table-cells"></i> Grade
            </button>
          </div>

          ${gestao ? `
          <button class="btn btn-primary btn-sm" id="btn-novo-evento">
            <i class="fa-solid fa-plus"></i> Evento
          </button>` : ''}
        </div>

        <!-- Semestre atual -->
        <div class="cal-semestre" id="cal-semestre-label"></div>

        <!-- Conteúdo alternável -->
        <div id="cal-conteudo">
          <div class="spinner-center"><div class="spinner spinner-lg"></div></div>
        </div>

      </div>`;
  },

  async init() {
    const gestao = Auth.temPapel('admin', 'coordenacao', 'secretaria');

    Layout.configurar({
      logado   : true,
      titulo   : 'Calendário',
      rotaAtiva: 'calendario'
    });

    // Carrega dados
    let _eventos = [];
    let _semestre = '';
    let _viewAtual = 'lista';

    try {
      const res = await API.getCalendario();
      if (res.success) {
        _eventos  = res.data.eventos  || [];
        _semestre = res.data.semestre || '';
      }
    } catch (_) {}

    // Label do semestre
    const semLabel = document.getElementById('cal-semestre-label');
    if (semLabel && _semestre) {
      semLabel.innerHTML = `
        <i class="fa-solid fa-calendar-days"></i>
        Semestre ${_semestre}`;
    }

    // Renderiza visão inicial
    _renderizar(_eventos, _viewAtual, gestao);

    // Alternador de visão
    document.querySelectorAll('.cal-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cal-view-btn').forEach(b => {
          b.classList.toggle('active', b === btn);
          b.setAttribute('aria-pressed', b === btn);
        });
        _viewAtual = btn.dataset.view;
        _renderizar(_eventos, _viewAtual, gestao);
      });
    });

    // Botão novo evento
    if (gestao) {
      document.getElementById('btn-novo-evento')
        ?.addEventListener('click', () => _abrirFormEvento(null, async () => {
          const res = await API.getCalendario();
          if (res.success) {
            _eventos  = res.data.eventos  || [];
            _semestre = res.data.semestre || '';
          }
          _renderizar(_eventos, _viewAtual, gestao);
        }));
    }
  }
};


// ============================================================
// RENDERIZAÇÃO
// ============================================================

function _renderizar(eventos, view, gestao) {
  const el = document.getElementById('cal-conteudo');
  if (!el) return;

  if (!eventos || eventos.length === 0) {
    Components.vazio(el, 'Nenhum evento no calendário',
      'Os feriados e eventos do semestre aparecerão aqui.',
      'fa-solid fa-calendar-xmark');
    return;
  }

  if (view === 'lista') {
    _renderizarLista(el, eventos, gestao);
  } else {
    _renderizarGrade(el, eventos, gestao);
  }
}


// ── VISÃO LISTA ───────────────────────────────────────────────

function _renderizarLista(el, eventos, gestao) {
  // Agrupa por mês
  const porMes = {};
  eventos.forEach(ev => {
    const chave = _chaveMes(ev.data);
    if (!porMes[chave]) porMes[chave] = [];
    porMes[chave].push(ev);
  });

  el.innerHTML = Object.keys(porMes).sort().map(chave => {
    const [ano, mes] = chave.split('-');
    const nomeMes = _NOMES_MESES[parseInt(mes) - 1];
    return `
      <div class="cal-mes-grupo">
        <div class="cal-mes-header">
          <span>${nomeMes}</span>
          <span class="cal-mes-ano">${ano}</span>
        </div>
        <div class="cal-eventos-lista">
          ${porMes[chave].map(ev => _eventoListaHTML(ev, gestao)).join('')}
        </div>
      </div>`;
  }).join('');

  _bindAcoesEventos(el, eventos, gestao);
}

function _eventoListaHTML(ev, gestao) {
  const hoje    = _dataHojeStr();
  const passado = ev.data && ev.data < hoje;
  const icone   = _ICONES_TIPO[ev.tipo] || 'fa-solid fa-circle-dot';
  const cor     = _CORES_TIPO[ev.tipo]  || 'neutral';

  return `
    <div class="cal-evento-item ${passado ? 'passado' : ''}" data-id="${ev.eventoId || ''}">
      <div class="cal-evento-data">
        <span class="cal-evento-dia">${_diaDeData(ev.data)}</span>
        <span class="cal-evento-diasem">${_diaSemanaAbrev(ev.diaSemana || _calcDiaSemana(ev.data))}</span>
      </div>
      <div class="cal-evento-dot" style="background:var(--cal-${cor})"></div>
      <div class="cal-evento-info">
        <span class="cal-evento-titulo">${ev.titulo}</span>
        ${ev.descricao ? `<span class="cal-evento-desc">${ev.descricao}</span>` : ''}
        ${Components.badgeHTML(_LABELS_TIPO[ev.tipo] || ev.tipo, cor)}
      </div>
      ${gestao && ev.origem === 'evento' ? `
      <div class="cal-evento-acoes">
        <button class="btn btn-sm btn-ghost btn-ev-editar" data-id="${ev.eventoId}"
          aria-label="Editar"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-sm btn-ghost btn-ev-excluir" data-id="${ev.eventoId}"
          aria-label="Excluir" style="color:var(--danger)"><i class="fa-solid fa-trash"></i></button>
      </div>` : ''}
    </div>`;
}


// ── VISÃO GRADE ───────────────────────────────────────────────

function _renderizarGrade(el, eventos, gestao) {
  // Descobre os meses que têm eventos
  const meses = [...new Set(eventos.map(ev => _chaveMes(ev.data)))].sort();

  el.innerHTML = meses.map(chave => {
    const [ano, mes] = chave.split('-').map(Number);
    return _gradesMesHTML(ano, mes, eventos, gestao);
  }).join('');

  _bindAcoesEventos(el, eventos, gestao);
}

function _gradesMesHTML(ano, mes, eventos, gestao) {
  const nomeMes    = _NOMES_MESES[mes - 1];
  const primeiroDia= new Date(ano, mes - 1, 1).getDay(); // 0=dom
  const diasNoMes  = new Date(ano, mes, 0).getDate();

  // Monta mapa de eventos por dia
  const porDia = {};
  eventos.forEach(ev => {
    if (!ev.data) return;
    const p = ev.data.split('/');
    if (p.length !== 3) return;
    const d = parseInt(p[0]);
    const m = parseInt(p[1]);
    const a = parseInt(p[2]);
    if (a === ano && m === mes) {
      if (!porDia[d]) porDia[d] = [];
      porDia[d].push(ev);
    }
  });

  const hoje = new Date();
  const hojeStr = `${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`;

  // Células da grade
  let celulas = '';
  // Células vazias antes do primeiro dia (iniciando na segunda = offset)
  const offset = primeiroDia === 0 ? 6 : primeiroDia - 1;
  for (let i = 0; i < offset; i++) {
    celulas += `<div class="cal-grade-celula vazia"></div>`;
  }

  for (let d = 1; d <= diasNoMes; d++) {
    const dataStr = `${String(d).padStart(2,'0')}/${String(mes).padStart(2,'0')}/${ano}`;
    const evs     = porDia[d] || [];
    const eHoje   = dataStr === hojeStr;
    const temEvs  = evs.length > 0;
    const cor     = temEvs ? (_CORES_TIPO[evs[0].tipo] || 'neutral') : '';

    celulas += `
      <div class="cal-grade-celula ${eHoje ? 'hoje' : ''} ${temEvs ? 'tem-evento' : ''}"
           ${temEvs ? `data-dia="${dataStr}" title="${evs.map(e=>e.titulo).join(', ')}"` : ''}>
        <span class="cal-grade-num">${d}</span>
        ${temEvs ? `<span class="cal-grade-dot" style="background:var(--cal-${cor})"></span>` : ''}
      </div>`;
  }

  return `
    <div class="cal-mes-grupo">
      <div class="cal-mes-header">
        <span>${nomeMes}</span>
        <span class="cal-mes-ano">${ano}</span>
      </div>
      <div class="cal-grade">
        ${['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d =>
          `<div class="cal-grade-header">${d}</div>`).join('')}
        ${celulas}
      </div>
      <!-- Lista dos eventos do mês abaixo da grade -->
      ${Object.keys(porDia).length > 0 ? `
      <div class="cal-eventos-lista" style="margin-top:var(--space-3)">
        ${eventos
          .filter(ev => {
            if (!ev.data) return false;
            const p = ev.data.split('/');
            return p.length === 3 && parseInt(p[1]) === mes && parseInt(p[2]) === ano;
          })
          .map(ev => _eventoListaHTML(ev, gestao)).join('')}
      </div>` : ''}
    </div>`;
}


// ── Vincula eventos de clique às ações de editar/excluir ──────

function _bindAcoesEventos(el, eventos, gestao) {
  if (!gestao) return;

  el.querySelectorAll('.btn-ev-editar').forEach(btn => {
    btn.addEventListener('click', () => {
      const ev = eventos.find(e => e.eventoId === btn.dataset.id);
      if (ev) _abrirFormEvento(ev, async () => {
        const res = await API.getCalendario();
        // Recria a lista atualizada
        if (res.success) {
          const novosEventos = res.data.eventos || [];
          const view = document.querySelector('.cal-view-btn.active')?.dataset.view || 'lista';
          _renderizar(novosEventos, view, gestao);
          // Re-bind necessário após re-render
          _bindAcoesEventos(document.getElementById('cal-conteudo'), novosEventos, gestao);
        }
      });
    });
  });

  el.querySelectorAll('.btn-ev-excluir').forEach(btn => {
    btn.addEventListener('click', () => {
      Components.modal({
        titulo   : 'Excluir evento',
        corpo    : 'Deseja excluir este evento do calendário?',
        confirmar: 'Excluir',
        cancelar : 'Cancelar',
        tipo     : 'danger',
        onConfirm: async () => {
          const res = await API.excluirEvento(btn.dataset.id);
          if (res.success) {
            Components.toast('Evento excluído.', 'success');
            const resC = await API.getCalendario();
            if (resC.success) {
              const novosEventos = resC.data.eventos || [];
              const view = document.querySelector('.cal-view-btn.active')?.dataset.view || 'lista';
              _renderizar(novosEventos, view, gestao);
              _bindAcoesEventos(document.getElementById('cal-conteudo'), novosEventos, gestao);
            }
          } else {
            Components.toast(res.error || 'Erro ao excluir.', 'error');
          }
        }
      });
    });
  });
}


// ============================================================
// FORMULÁRIO DE EVENTO
// ============================================================

function _abrirFormEvento(evento, onSalvo) {
  const editando = !!evento;
  document.getElementById('modal-overlay')?.classList.remove('hidden');
  document.getElementById('modal-content').innerHTML = `
    <h3 class="modal-title">${editando ? 'Editar evento' : 'Novo evento'}</h3>
    <div style="display:flex;flex-direction:column;gap:var(--space-4);margin-bottom:var(--space-5)">

      <div class="form-group">
        <label class="form-label" for="fev-titulo">Título</label>
        <input class="form-input" type="text" id="fev-titulo"
          placeholder="Ex: Prova Final" maxlength="100"
          value="${evento?.titulo || ''}" />
      </div>

      <div class="form-group">
        <label class="form-label" for="fev-data">Data</label>
        <input class="form-input" type="date" id="fev-data"
          value="${_isoParaInputCal(evento?.data) || ''}" />
      </div>

      <div class="form-group">
        <label class="form-label" for="fev-tipo">Tipo</label>
        <select class="form-input" id="fev-tipo">
          ${['prova','evento','prazo','feriado','aviso'].map(t =>
            `<option value="${t}" ${evento?.tipo === t ? 'selected' : ''}>${_LABELS_TIPO[t] || t}</option>`
          ).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="fev-desc">Descrição (opcional)</label>
        <input class="form-input" type="text" id="fev-desc"
          placeholder="Detalhes adicionais"
          value="${evento?.descricao || ''}" />
      </div>

      <span id="fev-erro" class="form-error hidden">
        <i class="fa-solid fa-circle-xmark"></i>
        <span id="fev-erro-msg"></span>
      </span>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="fev-cancelar">Cancelar</button>
      <button class="btn btn-primary"   id="fev-salvar">
        <i class="fa-solid fa-floppy-disk"></i>
        ${editando ? 'Salvar' : 'Criar'}
      </button>
    </div>`;

  document.getElementById('fev-cancelar')?.addEventListener('click', Components.fecharModal);

  document.getElementById('fev-salvar')?.addEventListener('click', async () => {
    const btn   = document.getElementById('fev-salvar');
    const titulo = document.getElementById('fev-titulo').value.trim();
    const data   = document.getElementById('fev-data').value;
    const tipo   = document.getElementById('fev-tipo').value;
    const desc   = document.getElementById('fev-desc').value.trim();
    const erroBox= document.getElementById('fev-erro');
    const erroMsg= document.getElementById('fev-erro-msg');

    erroBox.classList.add('hidden');
    if (!titulo) { erroMsg.textContent = 'Título obrigatório.'; erroBox.classList.remove('hidden'); return; }
    if (!data)   { erroMsg.textContent = 'Data obrigatória.';   erroBox.classList.remove('hidden'); return; }

    Components.btnLoading(btn, 'Salvando...');
    try {
      const dados = {
        titulo,
        descricao: desc,
        data     : _inputParaBrCal(data),
        tipo,
        ...(editando ? { eventoId: evento.eventoId } : {})
      };
      const res = await API.salvarEvento(dados);
      if (res.success) {
        Components.fecharModal();
        Components.toast(editando ? 'Evento atualizado!' : 'Evento criado!', 'success');
        onSalvo?.();
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


// ============================================================
// UTILITÁRIOS
// ============================================================

const _NOMES_MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

const _DIAS_SEMANA_ABREV = {
  'SEGUNDA-FEIRA': 'Seg', 'TERÇA-FEIRA': 'Ter', 'QUARTA-FEIRA': 'Qua',
  'QUINTA-FEIRA' : 'Qui', 'SEXTA-FEIRA' : 'Sex', 'SÁBADO'      : 'Sáb',
  'DOMINGO'      : 'Dom'
};

const _ICONES_TIPO = {
  prova  : 'fa-solid fa-pen-to-square',
  evento : 'fa-solid fa-star',
  prazo  : 'fa-solid fa-clock',
  feriado: 'fa-solid fa-umbrella-beach',
  aviso  : 'fa-solid fa-bell'
};

const _LABELS_TIPO = {
  prova  : 'Prova',
  evento : 'Evento',
  prazo  : 'Prazo',
  feriado: 'Feriado',
  aviso  : 'Aviso'
};

// Mapeamento tipo → variável CSS de cor
const _CORES_TIPO = {
  prova  : 'prova',
  evento : 'evento',
  prazo  : 'prazo',
  feriado: 'feriado',
  aviso  : 'aviso'
};

function _chaveMes(dataStr) {
  if (!dataStr) return '0000-00';
  const p = dataStr.split('/');
  if (p.length !== 3) return '0000-00';
  return `${p[2]}-${p[1].padStart(2,'0')}`;
}

function _diaDeData(dataStr) {
  if (!dataStr) return '';
  return dataStr.split('/')[0] || '';
}

function _diaSemanaAbrev(str) {
  return _DIAS_SEMANA_ABREV[String(str).toUpperCase()] || str?.slice(0,3) || '';
}

function _calcDiaSemana(dataStr) {
  if (!dataStr) return '';
  const p = dataStr.split('/');
  if (p.length !== 3) return '';
  const d = new Date(p[2], p[1]-1, p[0]);
  const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  return dias[d.getDay()] || '';
}

function _dataHojeStr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function _isoParaInputCal(str) {
  if (!str) return '';
  const p = str.split('/');
  if (p.length !== 3) return '';
  return `${p[2]}-${p[1]}-${p[0]}`;
}

function _inputParaBrCal(str) {
  if (!str) return '';
  const p = str.split('-');
  if (p.length !== 3) return str;
  return `${p[2]}/${p[1]}/${p[0]}`;
}
