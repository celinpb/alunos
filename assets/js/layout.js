// ============================================================
// layout.js — Shell da aplicação (header, nav, loading, tema)
// Portal do Aluno — CELINPB
// ============================================================

const Layout = (() => {

  const NAV = {
    aluno: [
      { id: 'home',     icone: 'fa-solid fa-house',            label: 'Início',   rota: 'home'     },
      { id: 'turmas',   icone: 'fa-solid fa-book-open',        label: 'Turmas',   rota: 'turmas'   },
      { id: 'avisos',   icone: 'fa-solid fa-bell',             label: 'Avisos',   rota: 'avisos'   },
      { id: 'perfil',   icone: 'fa-solid fa-user-circle',      label: 'Perfil',   rota: 'perfil'   },
    ],
    admin: [
      { id: 'home',     icone: 'fa-solid fa-house',            label: 'Início',   rota: 'home'     },
      { id: 'avisos',   icone: 'fa-solid fa-bell',             label: 'Avisos',   rota: 'avisos'   },
      { id: 'admin',    icone: 'fa-solid fa-sliders',          label: 'Gestão',   rota: 'admin'    },
      { id: 'perfil',   icone: 'fa-solid fa-user-circle',      label: 'Perfil',   rota: 'perfil'   },
    ],
    secretaria: [
      { id: 'home',     icone: 'fa-solid fa-house',            label: 'Início',   rota: 'home'     },
      { id: 'chamados', icone: 'fa-solid fa-headset',          label: 'Chamados', rota: 'chamados' },
      { id: 'avisos',   icone: 'fa-solid fa-bell',             label: 'Avisos',   rota: 'avisos'   },
      { id: 'perfil',   icone: 'fa-solid fa-user-circle',      label: 'Perfil',   rota: 'perfil'   },
    ],
    coordenacao: [
      { id: 'home',     icone: 'fa-solid fa-house',            label: 'Início',   rota: 'home'     },
      { id: 'turmas',   icone: 'fa-solid fa-book-open',        label: 'Turmas',   rota: 'turmas'   },
      { id: 'avisos',   icone: 'fa-solid fa-bell',             label: 'Avisos',   rota: 'avisos'   },
      { id: 'perfil',   icone: 'fa-solid fa-user-circle',      label: 'Perfil',   rota: 'perfil'   },
    ],
    professor: [
      { id: 'home',     icone: 'fa-solid fa-house',            label: 'Início',   rota: 'home'     },
      { id: 'turmas',   icone: 'fa-solid fa-book-open',        label: 'Turmas',   rota: 'turmas'   },
      { id: 'avisos',   icone: 'fa-solid fa-bell',             label: 'Avisos',   rota: 'avisos'   },
      { id: 'perfil',   icone: 'fa-solid fa-user-circle',      label: 'Perfil',   rota: 'perfil'   },
    ]
  };


  // ══════════════════════════════════════════════════════════
  // TEMA CLARO / ESCURO
  // ══════════════════════════════════════════════════════════

  const TEMA_KEY = 'portal_tema'; // localStorage

  /** Retorna true se o tema claro está ativo. */
  function temaClaro() {
    return document.documentElement.classList.contains('tema-claro');
  }

  /** Aplica o tema salvo (chamado na inicialização, antes do loading sumir). */
  function aplicarTemaSalvo() {
    const salvo = localStorage.getItem(TEMA_KEY);
    // Padrão: escuro. Aplica claro só se explicitamente salvo.
    if (salvo === 'claro') {
      document.documentElement.classList.add('tema-claro');
    }
  }

  /** Alterna entre tema claro e escuro e salva a preferência. */
  function alternarTema() {
    const claro = document.documentElement.classList.toggle('tema-claro');
    localStorage.setItem(TEMA_KEY, claro ? 'claro' : 'escuro');
    // Atualiza o ícone do botão em todos os headers visíveis
    document.querySelectorAll('#btn-tema i').forEach(i => {
      i.className = claro ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    });
    document.querySelectorAll('#btn-tema').forEach(btn => {
      btn.setAttribute('aria-label', claro ? 'Mudar para tema escuro' : 'Mudar para tema claro');
    });
  }

  /** Gera o botão de tema com o ícone correto para o estado atual. */
  function _btnTemaHTML() {
    const claro = temaClaro();
    return `<button class="header-action" id="btn-tema"
      aria-label="${claro ? 'Mudar para tema escuro' : 'Mudar para tema claro'}">
      <i class="${claro ? 'fa-solid fa-moon' : 'fa-solid fa-sun'}"></i>
    </button>`;
  }


  // ══════════════════════════════════════════════════════════
  // LOADING
  // ══════════════════════════════════════════════════════════

  function esconderLoading() {
    const loading = document.getElementById('app-loading');
    const app     = document.getElementById('app');
    if (loading) { loading.classList.add('fade-out'); setTimeout(() => loading.classList.add('hidden'), 420); }
    if (app) app.classList.remove('hidden');
  }


  // ══════════════════════════════════════════════════════════
  // HEADER
  // ══════════════════════════════════════════════════════════

  function configurarHeader({ mostrar = true, titulo = '', voltar = false, rotaVoltar, acao } = {}) {
    const h = document.getElementById('app-header');
    if (!h) return;
    if (!mostrar) { h.classList.add('hidden'); return; }
    h.classList.remove('hidden');

    h.innerHTML = `
      ${voltar ? `<button class="header-back" id="hdr-back" aria-label="Voltar">
        <i class="fa-solid fa-arrow-left"></i></button>` : ''}
      <h1 class="header-title">${titulo}</h1>
      ${acao ? `<button class="header-action" id="hdr-acao" aria-label="${acao.label || 'Ação'}">
        <i class="${acao.icone}"></i></button>` : ''}
      ${_btnTemaHTML()}`;

    document.getElementById('hdr-back')?.addEventListener('click', () =>
      rotaVoltar ? Router.ir(rotaVoltar) : history.back());
    if (acao?.onClick)
      document.getElementById('hdr-acao')?.addEventListener('click', acao.onClick);
    document.getElementById('btn-tema')?.addEventListener('click', alternarTema);
  }


  // ══════════════════════════════════════════════════════════
  // NAV
  // ══════════════════════════════════════════════════════════

  function montarNav(papel, rotaAtiva) {
    const nav = document.getElementById('app-nav');
    if (!nav) return;
    const itens = NAV[papel] || NAV.aluno;
    nav.innerHTML = itens.map(i => `
      <div class="nav-item ${i.rota === rotaAtiva ? 'active' : ''}"
           data-rota="${i.rota}" role="button" tabindex="0" aria-label="${i.label}">
        <span class="nav-icon"><i class="${i.icone}"></i></span>
        <span class="nav-label">${i.label}</span>
      </div>`).join('');
    nav.classList.remove('hidden');
    nav.querySelectorAll('.nav-item').forEach(el => {
      const go = () => Router.ir(el.dataset.rota);
      el.addEventListener('click', go);
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
      });
    });
  }

  function atualizarNavAtiva(rotaAtiva) {
    document.querySelectorAll('#app-nav .nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.rota === rotaAtiva);
    });
  }

  function esconderNav() { document.getElementById('app-nav')?.classList.add('hidden'); }


  // ══════════════════════════════════════════════════════════
  // CONFIGURAR (chamado pelo router em cada troca de página)
  // ══════════════════════════════════════════════════════════

  function configurar({ logado = true, titulo, voltar, rotaVoltar, acao, rotaAtiva } = {}) {
    const content = document.getElementById('app-content');
    if (!logado) {
      configurarHeader({ mostrar: false });
      esconderNav();
      content?.classList.add('no-nav');
      return;
    }
    content?.classList.remove('no-nav');
    configurarHeader({ mostrar: true, titulo, voltar, rotaVoltar, acao });
    montarNav(Auth.getPapel() || 'aluno', rotaAtiva || '');
  }


  // ══════════════════════════════════════════════════════════
  // EXPORTAÇÃO
  // ══════════════════════════════════════════════════════════

  return {
    esconderLoading,
    aplicarTemaSalvo,
    alternarTema,
    temaClaro,
    configurarHeader,
    montarNav,
    atualizarNavAtiva,
    esconderNav,
    configurar
  };
})();
