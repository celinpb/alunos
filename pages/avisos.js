// ============================================================
// pages/avisos.js — Avisos e Comunicados
// Portal do Aluno — CELINPB
// ============================================================
//
// Alunos/professores: visualização dos avisos ativos
// Admin/coordenação: visualização + publicação + gestão
// ============================================================

Pages.avisos = {

  render() {
    const gestao = Auth.temPapel('admin', 'coordenacao');
    return `
      <div class="page-section" id="avisos-page">

        ${gestao ? `
        <div style="display:flex;justify-content:flex-end;margin-bottom:var(--space-2)">
          <button class="btn btn-primary btn-sm" id="btn-novo-aviso">
            <i class="fa-solid fa-plus"></i> Novo aviso
          </button>
        </div>` : ''}

        <div id="avisos-lista">
          <div class="spinner-center"><div class="spinner spinner-lg"></div></div>
        </div>

      </div>`;
  },

  async init() {
    const gestao = Auth.temPapel('admin', 'coordenacao');

    Layout.configurar({
      logado   : true,
      titulo   : 'Avisos',
      rotaAtiva: 'avisos'
    });

    await _carregarAvisos();

    if (gestao) {
      document.getElementById('btn-novo-aviso')
        ?.addEventListener('click', () => _abrirFormAviso(null));
    }
  }
};


// ============================================================
// CARREGAR E RENDERIZAR AVISOS
// ============================================================

async function _carregarAvisos() {
  const el = document.getElementById('avisos-lista');
  if (!el) return;

  try {
    const res = await API.getAvisos();
    if (!res.success) {
      Components.vazio(el, 'Erro ao carregar avisos', res.error || '');
      return;
    }

    const avisos = res.data || [];
    const gestao = Auth.temPapel('admin', 'coordenacao');

    if (avisos.length === 0) {
      Components.vazio(el, 'Nenhum aviso publicado',
        gestao ? 'Clique em "Novo aviso" para publicar.' : 'Nenhum aviso no momento.',
        'fa-solid fa-bell-slash');
      return;
    }

    el.innerHTML = avisos.map(a => _avisoCardHTML(a, gestao)).join('');

    if (gestao) {
      el.querySelectorAll('.btn-aviso-editar').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const aviso = avisos.find(a => a.avisoId === id);
          if (aviso) _abrirFormAviso(aviso);
        });
      });

      el.querySelectorAll('.btn-aviso-toggle').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id    = btn.dataset.id;
          const ativo = btn.dataset.ativo === 'true';
          const res   = await API.toggleAviso(id, !ativo);
          if (res.success) {
            Components.toast(
              `Aviso ${!ativo ? 'ativado' : 'desativado'}.`,
              !ativo ? 'success' : 'info'
            );
            await _carregarAvisos();
          } else {
            Components.toast(res.error || 'Erro ao atualizar.', 'error');
          }
        });
      });

      el.querySelectorAll('.btn-aviso-excluir').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          Components.modal({
            titulo   : 'Excluir aviso',
            corpo    : 'Esta ação é permanente. Deseja excluir este aviso?',
            confirmar: 'Excluir',
            cancelar : 'Cancelar',
            tipo     : 'danger',
            onConfirm: async () => {
              const res = await API.excluirAviso(id);
              if (res.success) {
                Components.toast('Aviso excluído.', 'success');
                await _carregarAvisos();
              } else {
                Components.toast(res.error || 'Erro ao excluir.', 'error');
              }
            }
          });
        });
      });
    }

  } catch (_) {
    Components.vazio(el, 'Erro de conexão', 'Tente recarregar a página.',
      'fa-solid fa-triangle-exclamation');
  }
}


// ============================================================
// HTML DO CARD DE AVISO
// ============================================================

function _avisoCardHTML(aviso, gestao) {
  const periodo = aviso.dataFim
    ? `${aviso.dataInicio} – ${aviso.dataFim}`
    : `A partir de ${aviso.dataInicio}`;

  const badgeAtivo = Components.badgeHTML(
    aviso.ativo ? 'Publicado' : 'Rascunho',
    aviso.ativo ? 'success'   : 'neutral'
  );

  const acoesHTML = gestao ? `
    <div class="aviso-acoes">
      <button class="btn btn-sm btn-ghost btn-aviso-editar"
        data-id="${aviso.avisoId}" aria-label="Editar aviso">
        <i class="fa-solid fa-pen"></i>
      </button>
      <button class="btn btn-sm btn-ghost btn-aviso-toggle"
        data-id="${aviso.avisoId}" data-ativo="${aviso.ativo}"
        aria-label="${aviso.ativo ? 'Desativar' : 'Ativar'} aviso">
        <i class="fa-solid fa-${aviso.ativo ? 'eye-slash' : 'eye'}"></i>
      </button>
      <button class="btn btn-sm btn-ghost btn-aviso-excluir"
        data-id="${aviso.avisoId}" aria-label="Excluir aviso"
        style="color:var(--danger)">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>` : '';

  return `
    <div class="aviso-card ${aviso.ativo ? '' : 'aviso-inativo'} animate-fade-in">
      <div class="aviso-header">
        <div class="aviso-header-left">
          ${gestao ? badgeAtivo : ''}
          <span class="aviso-periodo">
            <i class="fa-solid fa-calendar-days"></i> ${periodo}
          </span>
        </div>
        ${acoesHTML}
      </div>
      <h3 class="aviso-titulo">${aviso.titulo}</h3>
      <div class="aviso-corpo">${_formatarCorpo(aviso.corpo)}</div>
      ${gestao ? `<div class="aviso-autor">Publicado por: ${aviso.autorId}</div>` : ''}
    </div>`;
}

// Converte quebras de linha em <br> e protege HTML
function _formatarCorpo(texto) {
  if (!texto) return '';
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}


// ============================================================
// FORMULÁRIO DE CRIAÇÃO / EDIÇÃO
// ============================================================

function _abrirFormAviso(aviso) {
  const editando = !!aviso;
  const hoje = _dataHoje();

  document.getElementById('modal-overlay')?.classList.remove('hidden');
  document.getElementById('modal-content').innerHTML = `
    <h3 class="modal-title">${editando ? 'Editar aviso' : 'Novo aviso'}</h3>

    <div style="display:flex;flex-direction:column;gap:var(--space-4);margin-bottom:var(--space-5)">

      <div class="form-group">
        <label class="form-label" for="form-aviso-titulo">Título</label>
        <input class="form-input" type="text" id="form-aviso-titulo"
          placeholder="Ex: Suspensão de aulas" maxlength="120"
          value="${aviso?.titulo || ''}" />
      </div>

      <div class="form-group">
        <label class="form-label" for="form-aviso-corpo">Mensagem</label>
        <textarea class="form-input" id="form-aviso-corpo"
          rows="5" placeholder="Texto do aviso..."
          style="resize:vertical">${aviso?.corpo || ''}</textarea>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
        <div class="form-group">
          <label class="form-label" for="form-aviso-inicio">Exibir a partir de</label>
          <input class="form-input" type="date" id="form-aviso-inicio"
            value="${_isoParaInput(aviso?.dataInicio) || hoje}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="form-aviso-fim">Exibir até (opcional)</label>
          <input class="form-input" type="date" id="form-aviso-fim"
            value="${_isoParaInput(aviso?.dataFim) || ''}" />
        </div>
      </div>

      ${editando ? `
      <label class="toggle-wrapper">
        <div class="toggle ${aviso.ativo ? 'active' : ''}" id="form-aviso-ativo"
          role="switch" aria-checked="${aviso.ativo}" tabindex="0"></div>
        <span class="toggle-label">Publicado (visível para alunos)</span>
      </label>` : ''}

      <span id="form-aviso-erro" class="form-error hidden">
        <i class="fa-solid fa-circle-xmark"></i>
        <span id="form-aviso-erro-msg"></span>
      </span>
    </div>

    <div class="modal-footer">
      <button class="btn btn-secondary" id="form-aviso-cancelar">Cancelar</button>
      <button class="btn btn-primary"   id="form-aviso-salvar">
        <i class="fa-solid fa-${editando ? 'floppy-disk' : 'paper-plane'}"></i>
        ${editando ? 'Salvar' : 'Publicar'}
      </button>
    </div>`;

  // Toggle de ativo (edição)
  if (editando) {
    const toggleAtivo = document.getElementById('form-aviso-ativo');
    toggleAtivo?.addEventListener('click', () => {
      const a = toggleAtivo.classList.toggle('active');
      toggleAtivo.setAttribute('aria-checked', a);
    });
    toggleAtivo?.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleAtivo.click(); }
    });
  }

  document.getElementById('form-aviso-cancelar')
    ?.addEventListener('click', Components.fecharModal);

  document.getElementById('form-aviso-salvar')
    ?.addEventListener('click', async () => {
      const btn    = document.getElementById('form-aviso-salvar');
      const titulo = document.getElementById('form-aviso-titulo').value.trim();
      const corpo  = document.getElementById('form-aviso-corpo').value.trim();
      const inicio = document.getElementById('form-aviso-inicio').value;
      const fim    = document.getElementById('form-aviso-fim').value;
      const erroBox= document.getElementById('form-aviso-erro');
      const erroMsg= document.getElementById('form-aviso-erro-msg');

      erroBox.classList.add('hidden');

      if (!titulo) { erroMsg.textContent = 'Título obrigatório.'; erroBox.classList.remove('hidden'); return; }
      if (!corpo)  { erroMsg.textContent = 'Mensagem obrigatória.'; erroBox.classList.remove('hidden'); return; }
      if (!inicio) { erroMsg.textContent = 'Data de início obrigatória.'; erroBox.classList.remove('hidden'); return; }

      const ativoToggle = document.getElementById('form-aviso-ativo');
      const ativo = editando
        ? ativoToggle?.classList.contains('active')
        : true; // novo aviso já nasce ativo

      const dados = {
        titulo,
        corpo,
        dataInicio: _inputParaBr(inicio),
        dataFim   : fim ? _inputParaBr(fim) : '',
        ativo,
        ...(editando ? { avisoId: aviso.avisoId } : {})
      };

      Components.btnLoading(btn, 'Salvando...');
      try {
        const res = await API.salvarAviso(dados);
        if (res.success) {
          Components.fecharModal();
          Components.toast(
            editando ? 'Aviso atualizado!' : 'Aviso publicado!',
            'success'
          );
          await _carregarAvisos();
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


// ── Utilitários de data para o formulário ────────────────────

function _dataHoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// "dd/mm/aaaa" → "aaaa-mm-dd" (valor do <input type="date">)
function _isoParaInput(str) {
  if (!str) return '';
  const p = str.split('/');
  if (p.length !== 3) return '';
  return `${p[2]}-${p[1]}-${p[0]}`;
}

// "aaaa-mm-dd" → "dd/mm/aaaa" (para o back-end)
function _inputParaBr(str) {
  if (!str) return '';
  const p = str.split('-');
  if (p.length !== 3) return str;
  return `${p[2]}/${p[1]}/${p[0]}`;
}
