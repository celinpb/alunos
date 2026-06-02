// ============================================================
// auth.js — Gerenciador de sessão
// Portal do Aluno — CELINPB
// ============================================================

const Auth = (() => {
  const K = { TOKEN: 'portal_token', PAPEL: 'portal_papel', LOGIN: 'portal_login', NOME: 'portal_nome' };

  const getToken = () => sessionStorage.getItem(K.TOKEN);
  const getPapel = () => sessionStorage.getItem(K.PAPEL);
  const getLogin = () => sessionStorage.getItem(K.LOGIN);
  const getNome  = () => sessionStorage.getItem(K.NOME);
  const estaLogado = () => !!getToken();
  const temPapel = (...p) => p.includes(getPapel());

  function getUsuario() {
    if (!estaLogado()) return null;
    return { token: getToken(), papel: getPapel(), login: getLogin(), nome: getNome() };
  }

  function salvarSessao({ token, papel, login, nome }) {
    sessionStorage.setItem(K.TOKEN, token);
    sessionStorage.setItem(K.PAPEL, papel);
    sessionStorage.setItem(K.LOGIN, login);
    sessionStorage.setItem(K.NOME,  nome || login);
  }

  function atualizarNome(nome) { if (nome) sessionStorage.setItem(K.NOME, nome); }

  function limparSessao() { Object.values(K).forEach(k => sessionStorage.removeItem(k)); }

  async function logout() {
    try { await API.logout(); } catch (_) {}
    limparSessao();
    Router.ir('login');
  }

  function verificarAcesso(papeisPermitidos = null) {
    if (!estaLogado()) { Router.ir('login'); return false; }
    if (papeisPermitidos && !temPapel(...papeisPermitidos)) {
      Components.toast('Você não tem acesso a esta área.', 'error');
      Router.ir('home');
      return false;
    }
    return true;
  }

  return { getToken, getPapel, getLogin, getNome, getUsuario, estaLogado, temPapel,
           salvarSessao, atualizarNome, limparSessao, logout, verificarAcesso };
})();
