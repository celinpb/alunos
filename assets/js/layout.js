// ============================================================
// layout.js — Shell da aplicação (header, nav, loading)
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

  // ── Loading ───────────────────────────────────────────────
  function esconderLoading() {
    const loading = document.getElementById('app-loading');
    const app     = document.getElementById('app');
    if (loading) { loading.classList.add('fade-out'); setTimeout(() => loading.classList.add('hidden'), 420); }
    if (app) app.classList.remove('hidden');
  }

  // ── Header ────────────────────────────────────────────────
  function configurarHeader({ mostrar = true, titulo = '', voltar = false, rotaVoltar, acao } = {}) {
    const h = document.getElementById('app-header');
    if (!h) return;
    if (!mostrar) { h.classList.add('hidden'); return; }
    h.classList.remove('hidden');
    h.innerHTML = `
      ${voltar ? `<button class="header-back" id="hdr-back" aria-label="Voltar"><i class="fa-solid fa-arrow-left"></i></button>` : ''}
      <h1 class="header-title">${titulo}</h1>
      ${acao   ? `<button class="header-action" id="hdr-acao" aria-label="${acao.label||'Ação'}"><i class="${acao.icone}"></i></button>` : ''}`;
    document.getElementById('hdr-back')?.addEventListener('click', () => rotaVoltar ? Router.ir(rotaVoltar) : history.back());
    if (acao?.onClick) document.getElementById('hdr-acao')?.addEventListener('click', acao.onClick);
  }

  // ── Nav ───────────────────────────────────────────────────
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
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }});
    });
  }

  function atualizarNavAtiva(rotaAtiva) {
    document.querySelectorAll('#app-nav .nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.rota === rotaAtiva);
    });
  }

  function esconderNav() { document.getElementById('app-nav')?.classList.add('hidden'); }

  // ── Configurar (chamado pelo router) ──────────────────────
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

  return { esconderLoading, configurarHeader, montarNav, atualizarNavAtiva, esconderNav, configurar };
})();
