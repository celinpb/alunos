// ============================================================
// router.js — Sistema de rotas SPA
// Portal do Aluno — CELINPB
// ============================================================
//
// Depende de pages.js, que deve ser carregado antes no index.html.
//
// PARA ADICIONAR UMA NOVA ROTA:
//   1. Implemente Pages.nome em /pages/nome.js (ou em pages.js)
//   2. Adicione o <script> no index.html ANTES de router.js
//   3. Adicione a entrada em _rotas() abaixo
// ============================================================

const Router = (() => {

  // Função — não objeto literal — para que Pages só seja
  // acessado no momento da chamada, quando já estará definido.
  function _rotas() {
    return {
      'login'      : { logado: false, render: Pages.login.render,        init: Pages.login.init        },
      'trocar-senha': { logado: false, render: Pages.trocarSenha.render,  init: Pages.trocarSenha.init  },
      'home'       : { logado: true,  render: Pages.home.render,         init: Pages.home.init         },
      'perfil'     : { logado: true,  render: Pages.perfil.render,       init: Pages.perfil.init       },

      // Rotas futuras — descomentadas conforme implementadas:
      // 'turmas'      : { logado: true, render: Pages.turmas.render,      init: Pages.turmas.init      },
      // 'avisos'      : { logado: true, render: Pages.avisos.render,      init: Pages.avisos.init      },
      // 'calendario'  : { logado: true, render: Pages.calendario.render,  init: Pages.calendario.init  },
      // 'documentos'  : { logado: true, render: Pages.documentos.render,  init: Pages.documentos.init  },
      // 'rematricula' : { logado: true, render: Pages.rematricula.render, init: Pages.rematricula.init },
      // 'historico'   : { logado: true, render: Pages.historico.render,   init: Pages.historico.init   },
      // 'chamados'    : { logado: true, render: Pages.chamados.render,    init: Pages.chamados.init    },
      // 'admin'       : { logado: true, guard: ['admin'], render: Pages.admin.render, init: Pages.admin.init },
    };
  }

  let _rotaAtual = null;

  function ir(rota, params = {}) {
    const def = _rotas()[rota];

    if (!def) {
      console.warn(`[Router] Rota '${rota}' não encontrada.`);
      return ir(Auth.estaLogado() ? 'home' : 'login');
    }

    if (def.logado !== false) {
      if (!Auth.estaLogado()) return ir('login');
      if (def.guard && !Auth.temPapel(...def.guard)) {
        Components.toast('Acesso não permitido.', 'error');
        return ir('home');
      }
    }

    if (_rotaAtual === rota) return;
    _rotaAtual = rota;

    Layout.configurar({
      logado   : def.logado !== false,
      rotaAtiva: rota,
      ...(def.layoutOpts || {})
    });

    const content = document.getElementById('app-content');
    if (content) {
      content.innerHTML = def.render(params);
      def.init?.(params);
    }

    Layout.atualizarNavAtiva(rota);
  }

  async function init() {
    try {
      const res = await API.getConfig();
      if (res.success) window._escolaConfig = res.data;
    } catch (_) {}

    Layout.esconderLoading();
    ir(Auth.estaLogado() ? 'home' : 'login');
  }

  return { ir, init };
})();

// Ponto de partida
document.addEventListener('DOMContentLoaded', () => Router.init());
