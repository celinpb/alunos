// ============================================================
// pages/admin.js — Painel de Administração
// Portal do Aluno — CELINPB
// ============================================================
//
// Seções:
//   1. Módulos    — toggle de visibilidade para alunos
//   2. Semestres  — controle de abertura de rematrícula
//   3. Usuários   — ativar, bloquear, redefinir senha
//
// Disponível apenas para o papel "admin".
// ============================================================

Pages.admin = {

  render() {
    return `
      <div class="page-section" id="admin-page">

        <!-- Abas de navegação interna -->
        <div class="admin-tabs" role="tablist">
          <button class="admin-tab active" data-tab="modulos"   role="tab" aria-selected="true">
            <i class="fa-solid fa-puzzle-piece"></i> Módulos
          </button>
          <button class="admin-tab"         data-tab="semestres" role="tab" aria-selected="false">
            <i class="fa-solid fa-rotate"></i> Rematrícula
          </button>
          <button class="admin-tab"         data-tab="cfg-rem"   role="tab" aria-selected="false">
            <i class="fa-solid fa-gear"></i> Config. Rem.
          </button>
          <button class="admin-tab"         data-tab="usuarios"  role="tab" aria-selected="false">
            <i class="fa-solid fa-users"></i> Usuários
          </button>
        </div>

        <!-- Painel: Módulos -->
        <div class="admin-panel" id="tab-modulos">
          <div class="card">
            <div class="card-header">
              <span class="card-title">Visibilidade dos módulos</span>
            </div>
            <p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-4)">
              Ative ou desative quais módulos ficam visíveis para os alunos.
            </p>
            <div id="admin-modulos-list">
              <div class="spinner-center"><div class="spinner"></div></div>
            </div>
          </div>
        </div>

        <!-- Painel: Semestres / Rematrícula -->
        <div class="admin-panel hidden" id="tab-semestres">
          <div class="card">
            <div class="card-header">
              <span class="card-title">Controle de rematrícula</span>
            </div>
            <p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-4)">
              Abra ou feche o período de rematrícula por semestre.
              O módulo de Rematrícula também precisa estar ativo na aba Módulos.
            </p>
            <div id="admin-semestres-list">
              <div class="spinner-center"><div class="spinner"></div></div>
            </div>
          </div>
        </div>

        <!-- Painel: Config. Rematrícula -->
        <div class="admin-panel hidden" id="tab-cfg-rem">
          <div class="card" style="margin-bottom:var(--space-3)">
            <div class="card-header">
              <span class="card-title">Links e entry IDs do Forms</span>
            </div>
            <div id="admin-cfg-rem-links">
              <div class="spinner-center"><div class="spinner"></div></div>
            </div>
          </div>
          <div class="card" style="margin-bottom:var(--space-3)">
            <div class="card-header">
              <span class="card-title">Documentos exigidos</span>
              <button class="btn btn-sm btn-primary" id="btn-novo-doc-rem">
                <i class="fa-solid fa-plus"></i> Adicionar
              </button>
            </div>
            <div id="admin-docs-rem-list">
              <div class="spinner-center"><div class="spinner"></div></div>
            </div>
          </div>
          <div class="card">
            <div class="card-header">
              <span class="card-title">Justificativas de invalidação</span>
              <button class="btn btn-sm btn-primary" id="btn-nova-just">
                <i class="fa-solid fa-plus"></i> Adicionar
              </button>
            </div>
            <div id="admin-justs-list">
              <div class="spinner-center"><div class="spinner"></div></div>
            </div>
          </div>
        </div>

        <!-- Painel: Usuários -->
        <div class="admin-panel hidden" id="tab-usuarios">
          <div class="card" style="margin-bottom:var(--space-3)">
            <div class="card-header">
              <span class="card-title">Gestão de usuários</span>
            </div>
            <p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-4)">
              Ative, bloqueie ou redefina a senha de qualquer usuário.
            </p>
            <!-- Busca -->
            <div class="input-wrapper" style="margin-bottom:var(--space-3)">
              <i class="input-icon fa-solid fa-magnifying-glass"></i>
              <input class="form-input" type="text" id="admin-usuarios-busca"
                placeholder="Buscar por login ou papel..." autocomplete="off" />
            </div>
            <div id="admin-usuarios-list">
              <div class="spinner-center"><div class="spinner"></div></div>
            </div>
          </div>
        </div>

      </div>`;
  },

  async init() {
    if (!Auth.verificarAcesso(['admin'])) return;

    Layout.configurar({
      logado   : true,
      titulo   : 'Gestão do Sistema',
      rotaAtiva: 'admin'
    });

    _initTabs();
    await _carregarModulos();
  }
};


// ============================================================
// NAVEGAÇÃO POR ABAS
// ============================================================

function _initTabs() {
  const tabs   = document.querySelectorAll('.admin-tab');
  const panels = document.querySelectorAll('.admin-panel');

  // Guarda quais painéis já foram carregados
  const carregados = { modulos: true }; // módulos carregam no init

  tabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      const alvo = tab.dataset.tab;

      // Atualiza abas
      tabs.forEach(t => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', t === tab);
      });

      // Mostra painel correto
      panels.forEach(p => p.classList.toggle('hidden', p.id !== `tab-${alvo}`));

      // Carrega dados do painel se ainda não foram carregados
      if (!carregados[alvo]) {
        carregados[alvo] = true;
        if (alvo === 'semestres') await _carregarSemestres();
        if (alvo === 'usuarios')  await _carregarUsuarios();
        if (alvo === 'cfg-rem')   await _carregarCfgRem();
      }
    });
  });
}


// ============================================================
// SEÇÃO 1 — MÓDULOS
// ============================================================

// Nomes amigáveis para exibição
const _NOMES_MODULOS = {
  turmas      : 'Turmas Atuais',
  avisos      : 'Avisos e Comunicados',
  calendario  : 'Calendário e Eventos',
  documentos  : 'Documentos e Declarações',
  rematricula : 'Rematrícula',
  historico   : 'Histórico do Aluno',
  chamados    : 'Central de Chamados',
  perfil      : 'Perfil',
  admin       : 'Gestão (Admin)'
};

const _ICONES_MODULOS = {
  turmas      : 'fa-solid fa-book-open',
  avisos      : 'fa-solid fa-bell',
  calendario  : 'fa-solid fa-calendar-days',
  documentos  : 'fa-solid fa-file-lines',
  rematricula : 'fa-solid fa-rotate',
  historico   : 'fa-solid fa-clock-rotate-left',
  chamados    : 'fa-solid fa-headset',
  perfil      : 'fa-solid fa-user-circle',
  admin       : 'fa-solid fa-sliders'
};

async function _carregarModulos() {
  const el = document.getElementById('admin-modulos-list');
  if (!el) return;

  try {
    const res = await API.getModulos();
    if (!res.success) {
      Components.vazio(el, 'Erro ao carregar módulos', res.error || '');
      return;
    }

    const modulos = res.data;
    if (!modulos || modulos.length === 0) {
      Components.vazio(el, 'Nenhum módulo cadastrado');
      return;
    }

    el.innerHTML = `<div class="admin-toggle-list">${
      modulos.map(m => {
        const id    = String(m.modulo).toLowerCase();
        const nome  = _NOMES_MODULOS[id]  || m.modulo;
        const icone = _ICONES_MODULOS[id] || 'fa-solid fa-puzzle-piece';
        const ativo = m.status === true;
        return `
          <div class="admin-toggle-item">
            <div class="admin-toggle-info">
              <span class="admin-toggle-icon"><i class="${icone}"></i></span>
              <span class="admin-toggle-nome">${nome}</span>
            </div>
            ${Components.toggleHTML(id, '', ativo)}
          </div>`;
      }).join('')
    }</div>`;

    Components.inicializarToggles(el, async (id, novoStatus) => {
      const item = el.querySelector(`#toggle-${id}`)?.closest('.admin-toggle-item');
      try {
        const res = await API.toggleModulo(id, novoStatus);
        if (!res.success) {
          Components.toast(res.error || 'Erro ao atualizar módulo.', 'error');
          // Reverte o toggle visualmente
          const toggle = document.getElementById(`toggle-${id}`);
          if (toggle) {
            toggle.classList.toggle('active', !novoStatus);
            toggle.setAttribute('aria-checked', !novoStatus);
          }
        } else {
          const nome = _NOMES_MODULOS[id] || id;
          Components.toast(
            `"${nome}" ${novoStatus ? 'ativado' : 'desativado'} com sucesso.`,
            novoStatus ? 'success' : 'info'
          );
        }
      } catch (_) {
        Components.toast('Erro de conexão.', 'error');
      }
    });

  } catch (_) {
    Components.vazio(el, 'Erro ao carregar módulos', 'Tente recarregar a página.');
  }
}


// ============================================================
// SEÇÃO 2 — SEMESTRES / REMATRÍCULA
// ============================================================

async function _carregarSemestres() {
  const el = document.getElementById('admin-semestres-list');
  if (!el) return;

  try {
    const res = await API.getSemestreAtual();
    if (!res.success) {
      Components.vazio(el, 'Erro ao carregar semestres', res.error || '');
      return;
    }

    const s     = res.data;
    const id    = String(s.semestreId);
    const ativo = s.rematricula === true;

    el.innerHTML = `
      <div class="admin-toggle-list">
        <div class="admin-toggle-item">
          <div class="admin-toggle-info">
            <span class="admin-toggle-icon"><i class="fa-solid fa-calendar-days"></i></span>
            <div>
              <span class="admin-toggle-nome">Semestre ${s.semestre}</span>
              <span class="admin-toggle-sub">
                ${Components.badgeHTML(
                  s.visualizacaoAtiva ? 'Visualização ativa' : 'Visualização inativa',
                  s.visualizacaoAtiva ? 'success' : 'neutral'
                )}
              </span>
            </div>
          </div>
          ${Components.toggleHTML('rem-' + id, 'Rematrícula aberta', ativo)}
        </div>
      </div>
      <p class="admin-info-hint">
        <i class="fa-solid fa-circle-info"></i>
        Ativar a rematrícula aqui abre o período de solicitações.
        O módulo "Rematrícula" também precisa estar visível na aba Módulos.
      </p>`;

    Components.inicializarToggles(el, async (toggleId, novoStatus) => {
      const semestreId = toggleId.replace('rem-', '');
      try {
        const res = await API.setRematricula(semestreId, novoStatus);
        if (!res.success) {
          Components.toast(res.error || 'Erro ao atualizar rematrícula.', 'error');
          const toggle = document.getElementById(`toggle-${toggleId}`);
          if (toggle) {
            toggle.classList.toggle('active', !novoStatus);
            toggle.setAttribute('aria-checked', !novoStatus);
          }
        } else {
          Components.toast(
            `Rematrícula do semestre ${s.semestre} ${novoStatus ? 'aberta' : 'fechada'}.`,
            novoStatus ? 'success' : 'info'
          );
        }
      } catch (_) {
        Components.toast('Erro de conexão.', 'error');
      }
    });

  } catch (_) {
    Components.vazio(el, 'Erro ao carregar semestres', 'Tente recarregar a página.');
  }
}


// ============================================================
// SEÇÃO 3 — USUÁRIOS
// ============================================================

let _todosUsuarios = [];

async function _carregarUsuarios() {
  const el = document.getElementById('admin-usuarios-list');
  if (!el) return;

  try {
    const res = await API.listarUsuarios();
    if (!res.success) {
      Components.vazio(el, 'Erro ao carregar usuários', res.error || '');
      return;
    }

    _todosUsuarios = res.data || [];
    _renderizarUsuarios(_todosUsuarios);

    // Busca em tempo real
    document.getElementById('admin-usuarios-busca')?.addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      const filtrados = q
        ? _todosUsuarios.filter(u =>
            u.login.toLowerCase().includes(q) ||
            u.papel.toLowerCase().includes(q))
        : _todosUsuarios;
      _renderizarUsuarios(filtrados);
    });

  } catch (_) {
    Components.vazio(el, 'Erro ao carregar usuários', 'Tente recarregar a página.');
  }
}

function _renderizarUsuarios(lista) {
  const el = document.getElementById('admin-usuarios-list');
  if (!el) return;

  if (!lista || lista.length === 0) {
    Components.vazio(el, 'Nenhum usuário encontrado');
    return;
  }

  const _PAPEL_LABEL = {
    admin      : 'Admin',
    coordenacao: 'Coord.',
    secretaria : 'Secretaria',
    professor  : 'Professor',
    aluno      : 'Aluno'
  };
  const _PAPEL_TIPO = {
    admin      : 'red',
    coordenacao: 'info',
    secretaria : 'warning',
    professor  : 'success',
    aluno      : 'neutral'
  };

  el.innerHTML = `<div class="admin-usuarios-lista">${
    lista.map(u => `
      <div class="admin-usuario-item ${u.acessoSituacao ? '' : 'bloqueado'}" data-login="${u.login}">
        <div class="admin-usuario-info">
          <span class="admin-usuario-login mono">${u.login}</span>
          <div class="admin-usuario-meta">
            ${Components.badgeHTML(_PAPEL_LABEL[u.papel] || u.papel, _PAPEL_TIPO[u.papel] || 'neutral')}
            ${Components.badgeHTML(
              u.acessoSituacao ? 'Ativo' : 'Bloqueado',
              u.acessoSituacao ? 'success' : 'danger'
            )}
            ${!u.temSenha ? Components.badgeHTML('Sem senha', 'warning') : ''}
          </div>
        </div>
        <div class="admin-usuario-acoes">
          <button class="btn btn-sm btn-ghost btn-usuario-menu"
            data-login="${u.login}"
            data-ativo="${u.acessoSituacao}"
            aria-label="Ações para ${u.login}">
            <i class="fa-solid fa-ellipsis-vertical"></i>
          </button>
        </div>
      </div>`).join('')
  }</div>`;

  // Menu de ações por usuário
  el.querySelectorAll('.btn-usuario-menu').forEach(btn => {
    btn.addEventListener('click', () => {
      const login = btn.dataset.login;
      const ativo = btn.dataset.ativo === 'true';
      _menuUsuario(login, ativo);
    });
  });
}

function _menuUsuario(login, ativo) {
  const meuLogin = Auth.getLogin();

  Components.modal({
    titulo: login,
    corpo : `
      <div style="display:flex;flex-direction:column;gap:var(--space-2);margin-top:var(--space-2)">
        <button class="btn btn-secondary btn-full" id="mu-toggle">
          <i class="fa-solid fa-${ativo ? 'ban' : 'check'}"></i>
          ${ativo ? 'Bloquear acesso' : 'Ativar acesso'}
        </button>
        <button class="btn btn-secondary btn-full" id="mu-senha">
          <i class="fa-solid fa-key"></i>
          Redefinir senha
        </button>
      </div>`,
    cancelar : 'Fechar',
    confirmar: '',  // sem botão de confirmar padrão — usamos os botões internos
  });

  // Remove o botão Confirmar vazio que o modal gera quando confirmar=''
  setTimeout(() => {
    document.querySelector('#modal-confirmar')?.remove();

    document.getElementById('mu-toggle')?.addEventListener('click', async () => {
      Components.fecharModal();
      if (login === meuLogin) {
        Components.toast('Você não pode alterar seu próprio acesso.', 'error');
        return;
      }
      const novoStatus = !ativo;
      const res = await API.toggleUsuario(login, novoStatus);
      if (res.success) {
        Components.toast(
          `Usuário "${login}" ${novoStatus ? 'ativado' : 'bloqueado'}.`,
          novoStatus ? 'success' : 'info'
        );
        // Atualiza localmente sem recarregar tudo
        _todosUsuarios = _todosUsuarios.map(u =>
          u.login === login ? { ...u, acessoSituacao: novoStatus } : u);
        _renderizarUsuarios(_todosUsuarios);
      } else {
        Components.toast(res.error || 'Erro ao atualizar usuário.', 'error');
      }
    });

    document.getElementById('mu-senha')?.addEventListener('click', () => {
      Components.fecharModal();
      Components.modal({
        titulo   : 'Redefinir senha',
        corpo    : `Isso vai apagar a senha atual de <strong>${login}</strong> e restaurar a senha inicial do sistema. O usuário precisará criar uma nova senha no próximo acesso.`,
        confirmar: 'Redefinir',
        cancelar : 'Cancelar',
        tipo     : 'danger',
        onConfirm: async () => {
          const res = await API.redefinirSenha(login);
          if (res.success) {
            Components.toast(`Senha de "${login}" redefinida.`, 'success');
            // Atualiza badge "Sem senha"
            _todosUsuarios = _todosUsuarios.map(u =>
              u.login === login ? { ...u, temSenha: false } : u);
            _renderizarUsuarios(_todosUsuarios);
          } else {
            Components.toast(res.error || 'Erro ao redefinir senha.', 'error');
          }
        }
      });
    });
  }, 50);
}


// ============================================================
// SEÇÃO: CONFIG. REMATRÍCULA
// ============================================================

async function _carregarCfgRem() {
  try {
    const res = await API.getConfigRematricula();
    if (!res.success) return;
    const { documentos, justificativas, semestres, formLink, sheetId, entryAlunoId } = res.data;

    _renderCfgLinks({ formLink, sheetId, entryAlunoId }, semestres);
    _renderDocsRem(documentos);
    _renderJusts(justificativas);

    document.getElementById('btn-novo-doc-rem')
      ?.addEventListener('click', () => _abrirFormDoc(null, documentos));
    document.getElementById('btn-nova-just')
      ?.addEventListener('click', () => _abrirFormJust(null, justificativas));

  } catch (_) {
    Components.toast('Erro ao carregar configurações de rematrícula.', 'error');
  }
}


// ── Links e entry IDs ─────────────────────────────────────────

function _renderCfgLinks({ formLink, sheetId, entryAlunoId }, semestres) {
  const el = document.getElementById('admin-cfg-rem-links');
  if (!el) return;

  // Semestre seguinte para data limite
  const proxSem = semestres?.find(s => !s.rematricula && s.semestreId > (semestres.find(x => x.rematricula)?.semestreId || ''));

  el.innerHTML = `
    <div class="admin-cfg-fields">
      ${_cfgField('form_rematricula', 'Link de incorporação do Forms (iframe)', formLink,
          'https://docs.google.com/forms/d/e/.../viewform?embedded=true')}
      ${_cfgField('sheet_rematricula', 'ID da planilha de respostas do Forms', sheetId,
          'ID do Google Sheets')}
      ${_cfgField('entry_alunoid_forms', 'Entry ID do campo Matrícula no Forms', entryAlunoId,
          'Ex: 123456789')}
    </div>
    <div style="margin-top:var(--space-4)">
      <div class="admin-toggle-nome" style="margin-bottom:var(--space-3)">Data limite por semestre</div>
      ${semestres?.filter(s => s.rematricula || true).map(s => `
        <div class="admin-toggle-item">
          <div class="admin-toggle-info">
            <div>
              <span class="admin-toggle-nome">${s.semestre}</span>
              <span style="font-size:var(--text-xs);color:var(--text-muted)">
                ${s.rematricula ? '· Rematrícula aberta' : ''}
              </span>
            </div>
          </div>
          <div class="input-wrapper" style="max-width:160px">
            <input class="form-input form-input-sm" type="date"
              id="datalimite-${s.semestreId}"
              value="${s.dataLimite ? _brParaInput(s.dataLimite) : ''}" />
          </div>
          <button class="btn btn-sm btn-secondary btn-salvar-datalimite"
            data-sem="${s.semestreId}">
            <i class="fa-solid fa-floppy-disk"></i>
          </button>
        </div>`).join('')}
    </div>`;

  // Salvar campos de config
  el.querySelectorAll('.btn-salvar-cfg').forEach(btn => {
    btn.addEventListener('click', async () => {
      const chave = btn.dataset.chave;
      const valor = document.getElementById(`cfg-${chave}`)?.value.trim() || '';
      Components.btnLoading(btn);
      const res = await API.salvarEntryConfig(chave, valor);
      Components.btnPronto(btn);
      Components.toast(res.success ? 'Salvo!' : (res.error || 'Erro.'), res.success ? 'success' : 'error');
    });
  });

  // Salvar data limite
  el.querySelectorAll('.btn-salvar-datalimite').forEach(btn => {
    btn.addEventListener('click', async () => {
      const semestreId = btn.dataset.sem;
      const input = document.getElementById(`datalimite-${semestreId}`);
      const dataLimite = _inputParaBr(input?.value || '');
      if (!dataLimite) { Components.toast('Informe uma data.', 'warning'); return; }
      Components.btnLoading(btn);
      const res = await API.setDataLimiteRematricula({ semestreId, dataLimite });
      Components.btnPronto(btn);
      Components.toast(res.success ? 'Data limite salva!' : (res.error || 'Erro.'), res.success ? 'success' : 'error');
    });
  });
}

function _cfgField(chave, label, valor, placeholder) {
  return `
    <div class="form-group" style="margin-bottom:var(--space-3)">
      <label class="form-label">${label}</label>
      <div style="display:flex;gap:var(--space-2)">
        <input class="form-input" type="text" id="cfg-${chave}"
          placeholder="${placeholder}" value="${valor || ''}" />
        <button class="btn btn-secondary btn-sm btn-salvar-cfg" data-chave="${chave}"
          style="flex-shrink:0">
          <i class="fa-solid fa-floppy-disk"></i>
        </button>
      </div>
    </div>`;
}


// ── Documentos exigidos ───────────────────────────────────────

function _renderDocsRem(documentos) {
  const el = document.getElementById('admin-docs-rem-list');
  if (!el) return;

  if (!documentos?.length) {
    Components.vazio(el, 'Nenhum documento cadastrado', 'Clique em "Adicionar" para criar.');
    return;
  }

  el.innerHTML = `<div class="admin-toggle-list">${
    documentos.map(d => `
      <div class="admin-toggle-item">
        <div class="admin-toggle-info" style="flex-direction:column;align-items:flex-start;gap:4px">
          <span class="admin-toggle-nome">${d.nome}</span>
          <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
            ${d.obrigatorio  ? Components.badgeHTML('Obrigatório',  'warning') : Components.badgeHTML('Opcional', 'neutral')}
            ${d.eliminatorio ? Components.badgeHTML('Eliminatório', 'danger')  : ''}
            ${d.entryId ? `<span class="badge badge-neutral">entry: ${d.entryId}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:var(--space-1)">
          <button class="btn btn-sm btn-ghost btn-editar-doc" data-id="${d.docId}"
            aria-label="Editar">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-sm btn-ghost btn-excluir-doc" data-id="${d.docId}"
            aria-label="Excluir" style="color:var(--danger)">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>`).join('')
  }</div>`;

  el.querySelectorAll('.btn-editar-doc').forEach(btn => {
    btn.addEventListener('click', () => {
      const doc = documentos.find(d => d.docId === btn.dataset.id);
      if (doc) _abrirFormDoc(doc, documentos);
    });
  });

  el.querySelectorAll('.btn-excluir-doc').forEach(btn => {
    btn.addEventListener('click', () => {
      Components.modal({
        titulo: 'Excluir documento', tipo: 'danger',
        corpo : 'Deseja remover este documento da lista?',
        confirmar: 'Excluir', cancelar: 'Cancelar',
        onConfirm: async () => {
          const res = await API.excluirDocRematricula(btn.dataset.id);
          if (res.success) { Components.toast('Removido.', 'success'); await _carregarCfgRem(); }
          else Components.toast(res.error || 'Erro.', 'error');
        }
      });
    });
  });
}

function _abrirFormDoc(doc, lista) {
  const editando = !!doc;
  document.getElementById('modal-overlay')?.classList.remove('hidden');
  document.getElementById('modal-content').innerHTML = `
    <h3 class="modal-title">${editando ? 'Editar documento' : 'Novo documento'}</h3>
    <div style="display:flex;flex-direction:column;gap:var(--space-4);margin-bottom:var(--space-5)">
      <div class="form-group">
        <label class="form-label">Nome</label>
        <input class="form-input" type="text" id="fdoc-nome"
          placeholder="Ex: RG ou CNH" value="${doc?.nome || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Descrição</label>
        <input class="form-input" type="text" id="fdoc-desc"
          placeholder="Instruções para o aluno" value="${doc?.descricao || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Entry ID no Forms</label>
        <input class="form-input form-input-mono" type="text" id="fdoc-entry"
          placeholder="Ex: 123456789" value="${doc?.entryId || ''}" />
        <span class="form-hint">Execute a função de recuperação de IDs no Apps Script para obter este valor.</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--space-3)">
        ${Components.toggleHTML('fdoc-sol', 'Solicitado (aparece no formulário)', doc?.solicitado ?? true)}
        ${Components.toggleHTML('fdoc-obr', 'Obrigatório',  doc?.obrigatorio  ?? false)}
        ${Components.toggleHTML('fdoc-eli', 'Eliminatório', doc?.eliminatorio ?? false)}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="fdoc-cancelar">Cancelar</button>
      <button class="btn btn-primary"   id="fdoc-salvar">
        <i class="fa-solid fa-floppy-disk"></i> ${editando ? 'Salvar' : 'Criar'}
      </button>
    </div>`;

  Components.inicializarToggles(
    document.getElementById('modal-content'),
    () => {}
  );

  document.getElementById('fdoc-cancelar')?.addEventListener('click', Components.fecharModal);
  document.getElementById('fdoc-salvar')?.addEventListener('click', async () => {
    const btn = document.getElementById('fdoc-salvar');
    const dados = {
      nome       : document.getElementById('fdoc-nome').value.trim(),
      descricao  : document.getElementById('fdoc-desc').value.trim(),
      entryId    : document.getElementById('fdoc-entry').value.trim(),
      solicitado : document.getElementById('toggle-fdoc-sol')?.classList.contains('active') ?? true,
      obrigatorio: document.getElementById('toggle-fdoc-obr')?.classList.contains('active') ?? false,
      eliminatorio:document.getElementById('toggle-fdoc-eli')?.classList.contains('active') ?? false,
      ...(editando ? { docId: doc.docId } : {})
    };
    if (!dados.nome) { Components.toast('Nome obrigatório.', 'warning'); return; }
    Components.btnLoading(btn, 'Salvando...');
    const res = await API.salvarDocRematricula(dados);
    Components.btnPronto(btn);
    if (res.success) {
      Components.fecharModal();
      Components.toast(editando ? 'Documento atualizado.' : 'Documento criado.', 'success');
      await _carregarCfgRem();
    } else {
      Components.toast(res.error || 'Erro.', 'error');
    }
  });
}


// ── Justificativas ────────────────────────────────────────────

function _renderJusts(justificativas) {
  const el = document.getElementById('admin-justs-list');
  if (!el) return;

  if (!justificativas?.length) {
    Components.vazio(el, 'Nenhuma justificativa cadastrada');
    return;
  }

  el.innerHTML = `<div class="admin-toggle-list">${
    justificativas.map(j => `
      <div class="admin-toggle-item">
        <span class="admin-toggle-nome">${j.texto}</span>
        <div style="display:flex;gap:var(--space-1)">
          <button class="btn btn-sm btn-ghost btn-editar-just" data-id="${j.justId}"
            aria-label="Editar"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-sm btn-ghost btn-excluir-just" data-id="${j.justId}"
            aria-label="Excluir" style="color:var(--danger)">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>`).join('')
  }</div>`;

  el.querySelectorAll('.btn-editar-just').forEach(btn => {
    btn.addEventListener('click', () => {
      const j = justificativas.find(x => x.justId === btn.dataset.id);
      if (j) _abrirFormJust(j, justificativas);
    });
  });

  el.querySelectorAll('.btn-excluir-just').forEach(btn => {
    btn.addEventListener('click', () => {
      Components.modal({
        titulo: 'Excluir justificativa', tipo: 'danger',
        corpo : 'Deseja remover esta justificativa?',
        confirmar: 'Excluir', cancelar: 'Cancelar',
        onConfirm: async () => {
          const res = await API.excluirJustificativa(btn.dataset.id);
          if (res.success) { Components.toast('Removida.', 'success'); await _carregarCfgRem(); }
          else Components.toast(res.error || 'Erro.', 'error');
        }
      });
    });
  });
}

function _abrirFormJust(just, lista) {
  const editando = !!just;
  document.getElementById('modal-overlay')?.classList.remove('hidden');
  document.getElementById('modal-content').innerHTML = `
    <h3 class="modal-title">${editando ? 'Editar justificativa' : 'Nova justificativa'}</h3>
    <div style="margin-bottom:var(--space-5)">
      <div class="form-group">
        <label class="form-label">Texto</label>
        <input class="form-input" type="text" id="fjust-texto"
          placeholder="Ex: Documento ilegível" value="${just?.texto || ''}" />
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="fjust-cancelar">Cancelar</button>
      <button class="btn btn-primary"   id="fjust-salvar">
        <i class="fa-solid fa-floppy-disk"></i> ${editando ? 'Salvar' : 'Criar'}
      </button>
    </div>`;

  document.getElementById('fjust-cancelar')?.addEventListener('click', Components.fecharModal);
  document.getElementById('fjust-salvar')?.addEventListener('click', async () => {
    const btn   = document.getElementById('fjust-salvar');
    const texto = document.getElementById('fjust-texto').value.trim();
    if (!texto) { Components.toast('Texto obrigatório.', 'warning'); return; }
    Components.btnLoading(btn, 'Salvando...');
    const res = await API.salvarJustificativa({ texto, ...(editando ? { justId: just.justId } : {}) });
    Components.btnPronto(btn);
    if (res.success) {
      Components.fecharModal();
      Components.toast(editando ? 'Justificativa atualizada.' : 'Justificativa criada.', 'success');
      await _carregarCfgRem();
    } else {
      Components.toast(res.error || 'Erro.', 'error');
    }
  });
}


// ── Utilitários de data ───────────────────────────────────────

function _brParaInput(str) {
  if (!str) return '';
  const p = str.split('/');
  if (p.length !== 3) return '';
  return `${p[2]}-${p[1]}-${p[0]}`;
}

function _inputParaBr(str) {
  if (!str) return '';
  const p = str.split('-');
  if (p.length !== 3) return str;
  return `${p[2]}/${p[1]}/${p[0]}`;
}
