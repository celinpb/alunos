// ============================================================
// pages/avaliacoes.js — Avaliações (Provas)
// Portal do Aluno — CELINPB
// ============================================================
//
// Aluno: vê provas disponíveis de cada turma, formulário em iframe
// Professor: gerencia apenas as próprias provas
// Coordenação/admin: gerenciam provas de qualquer professor
// ============================================================

Pages.avaliacoes = {

  render() {
    return `
      <div class="page-section" id="aval-page">
        <div id="aval-conteudo">
          <div class="spinner-center"><div class="spinner spinner-lg"></div></div>
        </div>
      </div>`;
  },

  async init() {
    Layout.configurar({
      logado   : true,
      titulo   : 'Avaliações',
      rotaAtiva: 'avaliacoes'
    });

    if (Auth.temPapel('admin', 'coordenacao', 'professor')) {
      await _avalInitGestao();
    } else {
      await _avalInitAluno();
    }
  }
};


// ============================================================
// VISÃO DO ALUNO
// ============================================================

async function _avalInitAluno() {
  const el = document.getElementById('aval-conteudo');
  if (!el) return;

  try {
    const res = await API.getProvasAluno();

    if (!res.success) {
      Components.vazio(el, 'Erro ao carregar avaliações', res.error || '');
      return;
    }

    const turmas = res.data || [];

    if (turmas.length === 0) {
      Components.vazio(el, 'Nenhuma avaliação disponível',
        'Quando houver provas abertas para suas turmas, elas aparecerão aqui.',
        'fa-solid fa-pen-to-square');
      return;
    }

    el.innerHTML = turmas.map((t, i) => _avalTurmaAlunoHTML(t, i)).join('');

  } catch (_) {
    Components.vazio(el, 'Erro de conexão', 'Tente recarregar a página.',
      'fa-solid fa-triangle-exclamation');
  }
}

function _avalTurmaAlunoHTML(t, idx) {
  const delay = `animation-delay:${idx * 0.08}s`;
  return `
    <div class="aval-card animate-fade-in" style="${delay}">
      <div class="aval-card-header">
        <div class="aval-card-titulo">${t.idioma} — ${t.nomeCurso}</div>
        <div class="aval-card-sub">Estágio ${t.estagio} · Turma ${t.turmaId}</div>
      </div>
      ${t.provas.map(p => `
        <div class="aval-prova">
          <div class="aval-prova-header">
            <div>
              <span class="aval-prova-tipo">${p.tipoProva}</span>
              <span class="aval-prova-periodo">
                <i class="fa-solid fa-calendar-days"></i>
                ${p.dataInicio}${p.dataFim ? ` – ${p.dataFim}` : ''}
              </span>
            </div>
          </div>
          <div class="aval-iframe-wrapper">
            <iframe src="${p.formLink}" frameborder="0"
              class="aval-iframe" title="Avaliação: ${p.tipoProva}">
            </iframe>
          </div>
        </div>`).join('')}
    </div>`;
}


// ============================================================
// VISÃO DA GESTÃO (professor / coordenação / admin)
// ============================================================

async function _avalInitGestao() {
  const el = document.getElementById('aval-conteudo');
  if (!el) return;

  const papel = Auth.getPapel();
  const podeFiltrarProfessor = papel === 'admin' || papel === 'coordenacao';

  el.innerHTML = `
    <div class="aval-gestao-toolbar">
      ${podeFiltrarProfessor ? `
      <div class="input-wrapper" style="max-width:240px">
        <i class="input-icon fa-solid fa-magnifying-glass"></i>
        <input class="form-input form-input-mono" type="text"
          id="aval-filtro-prof" placeholder="Filtrar por ProfessorID..." autocomplete="off" />
      </div>` : '<div></div>'}
      <button class="btn btn-primary btn-sm" id="btn-nova-prova">
        <i class="fa-solid fa-plus"></i> Nova prova
      </button>
    </div>
    <div id="aval-lista-gestao">
      <div class="spinner-center"><div class="spinner"></div></div>
    </div>`;

  let _todas = [];

  async function carregar(professorId) {
    const res = await API.getProvasGestao(professorId);
    if (!res.success) {
      Components.vazio(document.getElementById('aval-lista-gestao'), 'Erro ao carregar', res.error || '');
      return;
    }
    _todas = res.data || [];
    _avalRenderGestao(_todas, podeFiltrarProfessor);
  }

  await carregar();

  document.getElementById('btn-nova-prova')?.addEventListener('click', () => {
    _avalAbrirForm(null, podeFiltrarProfessor, () => carregar(
      document.getElementById('aval-filtro-prof')?.value.trim() || ''
    ));
  });

  // Filtro por professor (admin/coordenação)
  let _timer = null;
  document.getElementById('aval-filtro-prof')?.addEventListener('input', e => {
    clearTimeout(_timer);
    _timer = setTimeout(() => carregar(e.target.value.trim()), 300);
  });
}

function _avalRenderGestao(provas, mostrarProfessor) {
  const el = document.getElementById('aval-lista-gestao');
  if (!el) return;

  if (!provas.length) {
    Components.vazio(el, 'Nenhuma prova cadastrada',
      'Clique em "Nova prova" para começar.', 'fa-solid fa-pen-to-square');
    return;
  }

  el.innerHTML = provas.map(p => `
    <div class="aval-gestao-item">
      <div class="aval-gestao-info">
        <div class="aval-gestao-topo">
          <span class="aval-gestao-tipo">${p.tipoProva}</span>
          ${Components.badgeHTML(p.ativo ? 'Ativa' : 'Inativa', p.ativo ? 'success' : 'neutral')}
        </div>
        <div class="aval-gestao-meta">
          ${mostrarProfessor ? `<span class="mono">${p.professorId}</span> · ` : ''}
          Estágio ${p.estagio} · ${p.dataInicio}${p.dataFim ? ` – ${p.dataFim}` : ' (sem prazo)'}
        </div>
        <a href="${p.formLink}" target="_blank" class="aval-gestao-link">
          <i class="fa-solid fa-up-right-from-square"></i> Abrir formulário
        </a>
      </div>
      <div class="aval-gestao-acoes">
        <button class="btn btn-sm btn-ghost btn-prova-editar" data-id="${p.provaId}"
          aria-label="Editar"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-sm btn-ghost btn-prova-excluir" data-id="${p.provaId}"
          aria-label="Excluir" style="color:var(--danger)"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`).join('');

  el.querySelectorAll('.btn-prova-editar').forEach(btn => {
    btn.addEventListener('click', () => {
      const prova = provas.find(p => p.provaId === btn.dataset.id);
      if (prova) _avalAbrirForm(prova, mostrarProfessor, () => {
        const filtro = document.getElementById('aval-filtro-prof')?.value.trim() || '';
        API.getProvasGestao(filtro).then(res => {
          if (res.success) _avalRenderGestao(res.data || [], mostrarProfessor);
        });
      });
    });
  });

  el.querySelectorAll('.btn-prova-excluir').forEach(btn => {
    btn.addEventListener('click', () => {
      Components.modal({
        titulo   : 'Excluir prova',
        corpo    : 'Esta ação é permanente. Deseja excluir esta prova?',
        confirmar: 'Excluir',
        cancelar : 'Cancelar',
        tipo     : 'danger',
        onConfirm: async () => {
          const res = await API.excluirProva(btn.dataset.id);
          if (res.success) {
            Components.toast('Prova excluída.', 'success');
            const filtro = document.getElementById('aval-filtro-prof')?.value.trim() || '';
            const r2 = await API.getProvasGestao(filtro);
            if (r2.success) _avalRenderGestao(r2.data || [], mostrarProfessor);
          } else {
            Components.toast(res.error || 'Erro ao excluir.', 'error');
          }
        }
      });
    });
  });
}


// ============================================================
// FORMULÁRIO DE PROVA
// ============================================================

function _avalAbrirForm(prova, mostrarProfessor, onSalvo) {
  const editando = !!prova;
  document.getElementById('modal-overlay')?.classList.remove('hidden');
  document.getElementById('modal-content').innerHTML = `
    <h3 class="modal-title">${editando ? 'Editar prova' : 'Nova prova'}</h3>
    <div style="display:flex;flex-direction:column;gap:var(--space-4);margin-bottom:var(--space-5)">

      ${mostrarProfessor ? `
      <div class="form-group">
        <label class="form-label" for="fprv-prof">ProfessorID</label>
        <input class="form-input form-input-mono" type="text" id="fprv-prof"
          placeholder="Login do professor" value="${prova?.professorId || ''}" />
      </div>` : ''}

      <div class="form-group">
        <label class="form-label" for="fprv-estagio">Estágio</label>
        <input class="form-input" type="text" id="fprv-estagio"
          placeholder="Ex: 3" value="${prova?.estagio || ''}" />
      </div>

      <div class="form-group">
        <label class="form-label" for="fprv-tipo">Tipo de prova</label>
        <input class="form-input" type="text" id="fprv-tipo"
          placeholder="Ex: Oral 1, Escrita 2" value="${prova?.tipoProva || ''}" />
        <span class="form-hint">Use o mesmo nome do subcomponente de nota (Oral 1, Oral 2, Escrita 1, Escrita 2...).</span>
      </div>

      <div class="form-group">
        <label class="form-label" for="fprv-link">Link do formulário (incorporação)</label>
        <input class="form-input" type="text" id="fprv-link"
          placeholder="https://docs.google.com/forms/d/e/.../viewform?embedded=true"
          value="${prova?.formLink || ''}" />
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
        <div class="form-group">
          <label class="form-label" for="fprv-inicio">Disponível a partir de</label>
          <input class="form-input" type="date" id="fprv-inicio"
            value="${_avalIsoParaInput(prova?.dataInicio) || _avalHojeISO()}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="fprv-fim">Prazo final (opcional)</label>
          <input class="form-input" type="date" id="fprv-fim"
            value="${_avalIsoParaInput(prova?.dataFim) || ''}" />
        </div>
      </div>

      <label class="toggle-wrapper">
        <div class="toggle ${prova?.ativo !== false ? 'active' : ''}" id="fprv-ativo"
          role="switch" aria-checked="${prova?.ativo !== false}" tabindex="0"></div>
        <span class="toggle-label">Ativa (visível para os alunos)</span>
      </label>

      <span id="fprv-erro" class="form-error hidden">
        <i class="fa-solid fa-circle-xmark"></i>
        <span id="fprv-erro-msg"></span>
      </span>
    </div>

    <div class="modal-footer">
      <button class="btn btn-secondary" id="fprv-cancelar">Cancelar</button>
      <button class="btn btn-primary"   id="fprv-salvar">
        <i class="fa-solid fa-floppy-disk"></i> ${editando ? 'Salvar' : 'Criar'}
      </button>
    </div>`;

  // Toggle ativo
  const toggleAtivo = document.getElementById('fprv-ativo');
  toggleAtivo?.addEventListener('click', () => {
    const a = toggleAtivo.classList.toggle('active');
    toggleAtivo.setAttribute('aria-checked', a);
  });
  toggleAtivo?.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleAtivo.click(); }
  });

  document.getElementById('fprv-cancelar')?.addEventListener('click', Components.fecharModal);

  document.getElementById('fprv-salvar')?.addEventListener('click', async () => {
    const btn     = document.getElementById('fprv-salvar');
    const erroBox = document.getElementById('fprv-erro');
    const erroMsg = document.getElementById('fprv-erro-msg');
    erroBox.classList.add('hidden');

    const professorId = mostrarProfessor
      ? document.getElementById('fprv-prof')?.value.trim()
      : undefined;
    const estagio   = document.getElementById('fprv-estagio').value.trim();
    const tipoProva = document.getElementById('fprv-tipo').value.trim();
    const formLink  = document.getElementById('fprv-link').value.trim();
    const inicio    = document.getElementById('fprv-inicio').value;
    const fim       = document.getElementById('fprv-fim').value;
    const ativo     = toggleAtivo?.classList.contains('active') ?? true;

    if (mostrarProfessor && !professorId) {
      erroMsg.textContent = 'Informe o ProfessorID.'; erroBox.classList.remove('hidden'); return;
    }
    if (!estagio)   { erroMsg.textContent = 'Estágio obrigatório.'; erroBox.classList.remove('hidden'); return; }
    if (!tipoProva) { erroMsg.textContent = 'Tipo de prova obrigatório.'; erroBox.classList.remove('hidden'); return; }
    if (!formLink)  { erroMsg.textContent = 'Link do formulário obrigatório.'; erroBox.classList.remove('hidden'); return; }
    if (!inicio)    { erroMsg.textContent = 'Data de início obrigatória.'; erroBox.classList.remove('hidden'); return; }

    const dados = {
      estagio, tipoProva, formLink, ativo,
      dataInicio: _avalInputParaBr(inicio),
      dataFim   : fim ? _avalInputParaBr(fim) : '',
      ...(mostrarProfessor ? { professorId } : {}),
      ...(editando ? { provaId: prova.provaId } : {})
    };

    Components.btnLoading(btn, 'Salvando...');
    try {
      const res = await API.salvarProva(dados);
      if (res.success) {
        Components.fecharModal();
        Components.toast(editando ? 'Prova atualizada!' : 'Prova criada!', 'success');
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


// ── Utilitários de data ───────────────────────────────────────

function _avalHojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function _avalIsoParaInput(str) {
  if (!str) return '';
  const p = str.split('/');
  if (p.length !== 3) return '';
  return `${p[2]}-${p[1]}-${p[0]}`;
}

function _avalInputParaBr(str) {
  if (!str) return '';
  const p = str.split('-');
  if (p.length !== 3) return str;
  return `${p[2]}/${p[1]}/${p[0]}`;
}
