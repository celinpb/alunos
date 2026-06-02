// ============================================================
// pages.js — Páginas da aplicação (Login, Troca de Senha, Home, Perfil)
// Portal do Aluno — CELINPB
// ============================================================
//
// Este arquivo deve ser carregado ANTES do router.js no index.html.
// Novas páginas de módulos (Turmas, Avisos, etc.) serão adicionadas
// em arquivos separados em /pages/, também carregados antes do router.
// ============================================================

const Pages = {};


// ── LOGIN ─────────────────────────────────────────────────────

Pages.login = {

  render() {
    const escola = window._escolaConfig || {};
    return `
      <div class="page-login">
        <div class="login-container">

          <div class="login-brand">
            <div class="login-logo">
              <span class="login-logo-text">${(escola.sigla || 'C')[0]}</span>
            </div>
            <div class="login-school-name">${escola.sigla || 'CELINPB'}</div>
            <div class="login-school-full">${escola.nomeEscola || 'Portal do Aluno'}</div>
          </div>

          <div class="login-card">
            <div>
              <h2 class="login-heading">Bem-vindo</h2>
              <p class="login-subheading">Acesse com sua matrícula e senha</p>
            </div>

            <div class="form-group">
              <label class="form-label" for="login-matricula">Matrícula</label>
              <div class="input-wrapper">
                <i class="input-icon fa-solid fa-id-card"></i>
                <input class="form-input form-input-mono" type="text"
                  id="login-matricula" placeholder="Ex: A261.0001"
                  autocomplete="username" autocapitalize="off" spellcheck="false" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="login-senha">Senha</label>
              <div class="input-wrapper">
                <i class="input-icon fa-solid fa-lock"></i>
                <input class="form-input" type="password"
                  id="login-senha" placeholder="Sua senha"
                  autocomplete="current-password" />
                <span class="input-toggle" id="login-toggle-senha" aria-label="Mostrar senha">
                  <i class="fa-solid fa-eye"></i>
                </span>
              </div>
              <span id="login-erro" class="form-error hidden">
                <i class="fa-solid fa-circle-xmark"></i>
                <span id="login-erro-msg"></span>
              </span>
            </div>

            <button class="btn btn-primary btn-full btn-lg" id="login-btn">
              Entrar
            </button>
          </div>

          <div class="login-footer">
            Problemas com o acesso? Procure a secretaria.
          </div>

        </div>
      </div>`;
  },

  init() {
    const btnLogin    = document.getElementById('login-btn');
    const inputMat    = document.getElementById('login-matricula');
    const inputSenha  = document.getElementById('login-senha');
    const toggleSenha = document.getElementById('login-toggle-senha');
    const erroBox     = document.getElementById('login-erro');
    const erroMsg     = document.getElementById('login-erro-msg');

    toggleSenha?.addEventListener('click', () => {
      const visible = inputSenha.type === 'text';
      inputSenha.type = visible ? 'password' : 'text';
      toggleSenha.querySelector('i').className = visible ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
    });

    [inputMat, inputSenha].forEach(el => {
      el.addEventListener('keydown', e => { if (e.key === 'Enter') btnLogin.click(); });
    });

    btnLogin.addEventListener('click', async () => {
      const login = inputMat.value.trim();
      const senha = inputSenha.value;

      erroBox.classList.add('hidden');
      inputMat.classList.remove('error');
      inputSenha.classList.remove('error');

      if (!login || !senha) {
        mostrarErro('Preencha a matrícula e a senha.');
        if (!login) inputMat.classList.add('error');
        if (!senha) inputSenha.classList.add('error');
        return;
      }

      Components.btnLoading(btnLogin, 'Entrando...');

      try {
        const res = await API.login(login, senha);

        if (!res.success) {
          mostrarErro(res.error || 'Credenciais inválidas.');
          inputSenha.value = '';
          inputSenha.focus();
          return;
        }

        if (res.data?.primeiroAcesso) {
          sessionStorage.setItem('portal_login_temp', login);
          Router.ir('trocar-senha');
          return;
        }

        Auth.salvarSessao({ token: res.data.token, papel: res.data.papel, login });
        Router.ir('home');

      } catch (e) {
        mostrarErro('Erro de conexão. Verifique sua internet e tente novamente.');
      } finally {
        Components.btnPronto(btnLogin);
      }
    });

    function mostrarErro(msg) {
      erroMsg.textContent = msg;
      erroBox.classList.remove('hidden');
    }

    setTimeout(() => inputMat.focus(), 100);
  }
};


// ── TROCA DE SENHA (1º acesso) ────────────────────────────────

Pages.trocarSenha = {

  render() {
    return `
      <div class="page-login">
        <div class="login-container">

          <div class="login-brand">
            <div class="login-logo">
              <span class="login-logo-text" style="font-size:1.5rem">
                <i class="fa-solid fa-key" style="color:var(--red-light)"></i>
              </span>
            </div>
            <div class="login-school-name">Crie sua senha</div>
            <div class="login-school-full">Primeiro acesso — defina uma senha segura</div>
          </div>

          <div class="login-card">
            <div>
              <h2 class="login-heading">Nova senha</h2>
              <p class="login-subheading">Sua senha inicial foi gerada pelo sistema. Você precisa criar uma senha pessoal antes de continuar.</p>
            </div>

            <div class="form-group">
              <label class="form-label" for="ts-atual">Senha inicial (do sistema)</label>
              <div class="input-wrapper">
                <i class="input-icon fa-solid fa-lock"></i>
                <input class="form-input" type="password" id="ts-atual"
                  placeholder="Senha enviada pelo sistema" autocomplete="current-password" />
                <span class="input-toggle" data-alvo="ts-atual"><i class="fa-solid fa-eye"></i></span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="ts-nova">Nova senha</label>
              <div class="input-wrapper">
                <i class="input-icon fa-solid fa-lock-open"></i>
                <input class="form-input" type="password" id="ts-nova"
                  placeholder="Mínimo 6 caracteres" autocomplete="new-password" />
                <span class="input-toggle" data-alvo="ts-nova"><i class="fa-solid fa-eye"></i></span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="ts-confirmar">Confirmar nova senha</label>
              <div class="input-wrapper">
                <i class="input-icon fa-solid fa-check"></i>
                <input class="form-input" type="password" id="ts-confirmar"
                  placeholder="Repita a nova senha" autocomplete="new-password" />
              </div>
            </div>

            <span id="ts-erro" class="form-error hidden">
              <i class="fa-solid fa-circle-xmark"></i>
              <span id="ts-erro-msg"></span>
            </span>

            <button class="btn btn-primary btn-full btn-lg" id="ts-btn">Salvar senha</button>
          </div>

        </div>
      </div>`;
  },

  init() {
    document.querySelectorAll('.input-toggle[data-alvo]').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const input = document.getElementById(toggle.dataset.alvo);
        if (!input) return;
        const visible = input.type === 'text';
        input.type = visible ? 'password' : 'text';
        toggle.querySelector('i').className = visible ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
      });
    });

    const btn     = document.getElementById('ts-btn');
    const erroBox = document.getElementById('ts-erro');
    const erroMsg = document.getElementById('ts-erro-msg');

    btn.addEventListener('click', async () => {
      const login     = sessionStorage.getItem('portal_login_temp') || '';
      const atual     = document.getElementById('ts-atual').value;
      const nova      = document.getElementById('ts-nova').value;
      const confirmar = document.getElementById('ts-confirmar').value;

      erroBox.classList.add('hidden');

      if (!atual || !nova || !confirmar) return mostrarErro('Preencha todos os campos.');
      if (nova.length < 6)              return mostrarErro('A nova senha deve ter pelo menos 6 caracteres.');
      if (nova !== confirmar)           return mostrarErro('As senhas não coincidem.');
      if (!login)                       return Router.ir('login');

      Components.btnLoading(btn, 'Salvando...');

      try {
        const res = await API.trocarSenha(login, atual, nova);

        if (!res.success) {
          mostrarErro(res.error || 'Erro ao salvar a senha.');
          return;
        }

        sessionStorage.removeItem('portal_login_temp');
        Auth.salvarSessao({ token: res.data.token, papel: res.data.papel, login });
        Components.toast('Senha definida com sucesso! Bem-vindo.', 'success');
        Router.ir('home');

      } catch (_) {
        mostrarErro('Erro de conexão. Tente novamente.');
      } finally {
        Components.btnPronto(btn);
      }
    });

    function mostrarErro(msg) {
      erroMsg.textContent = msg;
      erroBox.classList.remove('hidden');
    }
  }
};


// ── HOME ──────────────────────────────────────────────────────

Pages.home = {

  render() {
    return `
      <div class="home-header">
        <div class="home-greeting-label">Portal do Aluno</div>
        <div class="home-greeting-name" id="home-nome">Carregando<span>...</span></div>
        <div class="home-semestre-tag" id="home-semestre">
          <i class="fa-solid fa-calendar-days"></i>
          <span>Semestre atual</span>
        </div>
      </div>
      <div class="home-section-label">Módulos disponíveis</div>
      <div class="home-modules-list" id="home-modules">
        <div class="spinner-center"><div class="spinner"></div></div>
      </div>`;
  },

  async init() {
    Layout.configurar({ logado: true, rotaAtiva: 'home' });

    const [perfilRes, semestreRes, modulosRes] = await Promise.allSettled([
      API.getPerfil(),
      API.getSemestreAtual(),
      API.getModulos()
    ]);

    const nomeEl = document.getElementById('home-nome');
    if (perfilRes.status === 'fulfilled' && perfilRes.value?.success) {
      const nome = perfilRes.value.data.nome || Auth.getLogin();
      Auth.atualizarNome(nome);
      if (nomeEl) nomeEl.innerHTML = `Olá, <span>${nome.split(' ')[0]}</span>`;
    } else {
      if (nomeEl) nomeEl.innerHTML = `Olá, <span>${Auth.getLogin()}</span>`;
    }

    const semEl = document.getElementById('home-semestre');
    if (semestreRes.status === 'fulfilled' && semestreRes.value?.success) {
      const s = semestreRes.value.data;
      if (semEl) semEl.innerHTML = `<i class="fa-solid fa-calendar-days"></i><span>${s.semestre}</span>`;
    }

    const listEl = document.getElementById('home-modules');
    if (!listEl) return;

    if (modulosRes.status === 'fulfilled' && modulosRes.value?.success) {
      const modulos = modulosRes.value.data;

      if (!modulos || modulos.length === 0) {
        Components.vazio(listEl, 'Nenhum módulo disponível', 'Aguarde a liberação pela escola.');
        return;
      }

      listEl.innerHTML = modulos.map((m, i) => {
        const cfg = App.MODULOS[m.modulo.toLowerCase()] || {
          nome : m.modulo,
          icone: 'fa-solid fa-puzzle-piece',
          rota : m.modulo.toLowerCase(),
          desc : ''
        };
        return `<div style="animation-delay:${i * 0.05}s">${Components.moduleCardHTML(cfg)}</div>`;
      }).join('');

      listEl.querySelectorAll('.module-card').forEach(card => {
        card.addEventListener('click', () => Router.ir(card.dataset.rota));
        card.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); Router.ir(card.dataset.rota); }
        });
      });

    } else {
      Components.vazio(listEl, 'Erro ao carregar módulos', 'Tente recarregar a página.', 'fa-solid fa-triangle-exclamation');
    }
  }
};


// ── PERFIL ────────────────────────────────────────────────────

Pages.perfil = {

  render() {
    return `
      <div class="page-section">
        <div id="perfil-content">
          <div class="spinner-center"><div class="spinner spinner-lg"></div></div>
        </div>
      </div>`;
  },

  async init() {
    Layout.configurar({ logado: true, titulo: 'Meu Perfil', rotaAtiva: 'perfil' });

    const el = document.getElementById('perfil-content');
    if (!el) return;

    const res = await API.getPerfil();

    if (!res.success) {
      Components.vazio(el, 'Erro ao carregar perfil', res.error || '', 'fa-solid fa-triangle-exclamation');
      return;
    }

    const d = res.data;
    const itens = [
      { label: 'Matrícula',  valor: d.alunoId    || Auth.getLogin() },
      { label: 'Nome',       valor: d.nome        || '' },
      { label: 'Nascimento', valor: d.nascimento  || '' },
      { label: 'Telefone',   valor: d.telefone    || '' },
      { label: 'E-mail',     valor: d.email       || '' },
      { label: 'Situação',   valor: d.situacao    || '' },
    ];

    const responsavelHTML = d.responsavel ? `
      <div class="card" style="margin-top:var(--space-4)">
        <div class="card-header"><span class="card-title">Responsável</span></div>
        ${Components.infoListHTML([
          { label: 'Nome',       valor: d.responsavel.nome       },
          { label: 'Parentesco', valor: d.responsavel.parentesco },
          { label: 'Telefone',   valor: d.responsavel.telefone   },
          { label: 'E-mail',     valor: d.responsavel.email      },
        ])}
      </div>` : '';

    el.innerHTML = `
      <div class="card animate-fade-in">
        <div class="card-header"><span class="card-title">Dados Cadastrais</span></div>
        ${Components.infoListHTML(itens)}
      </div>
      ${responsavelHTML}
      <div style="margin-top:var(--space-4)">
        <button class="btn btn-secondary btn-full" id="perfil-btn-chamado">
          <i class="fa-solid fa-pen-to-square"></i> Solicitar alteração de dados
        </button>
      </div>
      <div style="margin-top:var(--space-2)">
        <button class="btn btn-ghost btn-full" id="perfil-btn-logout">
          <i class="fa-solid fa-right-from-bracket"></i> Sair da conta
        </button>
      </div>`;

    document.getElementById('perfil-btn-chamado')?.addEventListener('click', () => {
      Components.toast('Em breve: solicitação de alteração de dados.', 'info');
    });

    document.getElementById('perfil-btn-logout')?.addEventListener('click', () => {
      Components.modal({
        titulo   : 'Sair da conta',
        corpo    : 'Tem certeza que deseja encerrar sua sessão?',
        confirmar: 'Sim, sair',
        cancelar : 'Cancelar',
        tipo     : 'danger',
        onConfirm: () => Auth.logout()
      });
    });
  }
};
