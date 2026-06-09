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

  // Todas as requisições usam GET para evitar o preflight CORS do navegador.
  // O Apps Script só suporta CORS sem configuração adicional via GET (doGet).
  // Os dados trafegam via query string sobre HTTPS, o que é seguro.
  async function _get(params, autenticado = true) {
    const p = { ...params };
    if (autenticado) { const t = Auth.getToken(); if (t) p.token = t; }
    const res  = await fetch(`${App.SCRIPT_URL}?${new URLSearchParams(p)}`);
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
    login        : (login, senha)         => _get({ action: 'login', login, senha }, false),
    trocarSenha  : (login, atual, nova)   => _get({ action: 'trocarSenha', login, senhaAtual: atual, senhaNova: nova }, false),
    verifyDoc    : (codigo)               => _get({ action: 'verifyDocument', codigo }, false),
    // Autenticados
    logout           : ()                 => _get({ action: 'logout' }),
    getPerfil        : ()                 => _get({ action: 'getPerfil' }),
    getModulos       : ()                 => _get({ action: 'getModulos' }),
    getSemestreAtual : ()                 => _get({ action: 'getSemestreAtual' }),
    // Admin
    toggleModulo  : (modulo, status)      => _get({ action: 'toggleModulo',  modulo,    status }),
    setRematricula: (semestreId, status)  => _get({ action: 'setRematricula',semestreId,status }),
    listarUsuarios: ()                    => _get({ action: 'listarUsuarios' }),
    toggleUsuario : (login, status)       => _get({ action: 'toggleUsuario', login,     status }),
    redefinirSenha: (login)               => _get({ action: 'redefinirSenha',login }),
    // Avisos
    getAvisos    : ()                         => _get({ action: 'getAvisos' }),
    salvarAviso  : (dados)                    => _get({ action: 'salvarAviso',  ...dados }),
    toggleAviso  : (avisoId, ativo)           => _get({ action: 'toggleAviso',  avisoId, ativo }),
    excluirAviso : (avisoId)                  => _get({ action: 'excluirAviso', avisoId }),
    // Calendário
    getCalendario: ()                         => _get({ action: 'getCalendario' }),
    salvarEvento : (dados)                    => _get({ action: 'salvarEvento',  ...dados }),
    excluirEvento: (eventoId)                 => _get({ action: 'excluirEvento', eventoId }),
    // Turmas
    getTurmasAluno      : ()                  => _get({ action: 'getTurmasAluno' }),
    salvarMensagemTurma : (dados)             => _get({ action: 'salvarMensagemTurma',  ...dados }),
    excluirMensagemTurma: (mensagemId)        => _get({ action: 'excluirMensagemTurma', mensagemId }),
    // Documentos
    gerarDocumento: (tipo, matriculaId)       => _get({ action: 'gerarDocumento', tipo, matriculaId: matriculaId || '' }),
  };
})();
