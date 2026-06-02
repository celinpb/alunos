// ============================================================
// api.js — Camada de comunicação com o back-end
// Portal do Aluno — CELINPB
// ============================================================

const API = (() => {

  const CODES = {
    NAO_AUTORIZADO  : 401,
    PROIBIDO        : 403,
    NAO_ENCONTRADO  : 404,
    PRIMEIRO_ACESSO : 461,
    ACESSO_BLOQUEADO: 462,
    TOKEN_EXPIRADO  : 463,
    ACAO_INVALIDA   : 400,
    ERRO_INTERNO    : 500
  };

  async function _get(params, autenticado = true) {
    const p = { ...params };
    if (autenticado) { const t = Auth.getToken(); if (t) p.token = t; }
    const res  = await fetch(`${App.SCRIPT_URL}?${new URLSearchParams(p)}`);
    const json = await res.json();
    _global(json);
    return json;
  }

  async function _post(body, autenticado = true) {
    const b = { ...body };
    if (autenticado) { const t = Auth.getToken(); if (t) b.token = t; }
    const res  = await fetch(App.SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(b)
    });
    const json = await res.json();
    _global(json);
    return json;
  }

  function _global(json) {
    if (!json.success && json.codigo === CODES.TOKEN_EXPIRADO) {
      Auth.limparSessao();
      Router.ir('login');
      Components.toast('Sua sessão expirou. Faça login novamente.', 'warning');
    }
  }

  return {
    CODES,
    // Públicos
    getConfig    : ()                     => _get({ action: 'getConfig' }, false),
    login        : (login, senha)         => _post({ action: 'login', login, senha }, false),
    trocarSenha  : (login, atual, nova)   => _post({ action: 'trocarSenha', login, senhaAtual: atual, senhaNova: nova }, false),
    verifyDoc    : (codigo)               => _get({ action: 'verifyDocument', codigo }, false),
    // Autenticados
    logout           : ()                 => _post({ action: 'logout' }),
    getPerfil        : ()                 => _get({ action: 'getPerfil' }),
    getModulos       : ()                 => _get({ action: 'getModulos' }),
    getSemestreAtual : ()                 => _get({ action: 'getSemestreAtual' }),
    // Admin
    toggleModulo  : (modulo, status)      => _post({ action: 'toggleModulo',  modulo,    status }),
    setRematricula: (semestreId, status)  => _post({ action: 'setRematricula',semestreId,status }),
    listarUsuarios: ()                    => _get({ action: 'listarUsuarios' }),
    toggleUsuario : (login, status)       => _post({ action: 'toggleUsuario', login,     status }),
    redefinirSenha: (login)               => _post({ action: 'redefinirSenha',login }),
  };
})();
