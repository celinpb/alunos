// ============================================================
// Codigo.gs — Roteador central (doGet e doPost)
// Portal do Aluno — CELINPB
// ============================================================
//
// RESPONSABILIDADE:
//   Ponto de entrada único de todas as requisições HTTP.
//   Recebe a chamada, identifica a "action" e despacha para
//   o handler correto. Nenhuma lógica de negócio fica aqui.
//
// AÇÕES PÚBLICAS (sem token):
//   getConfig         → dados públicos da escola (tela de login)
//   login             → autenticação
//   trocarSenha       → troca de senha (1º acesso ou voluntária)
//   verifyDocument    → verificação pública de documento
//
// AÇÕES AUTENTICADAS (exigem token):
//   logout            → encerra sessão
//   getPerfil         → dados do aluno logado
//   getModulos        → lista de módulos ativos para o papel
//   [demais actions serão adicionadas em etapas futuras]
//
// COMO ADICIONAR UMA NOVA ACTION:
//   1. Adicione a entrada no objeto ROTAS abaixo
//   2. Indique se é pública (publico: true) ou protegida
//   3. Indique os papéis permitidos (null = todos autenticados)
//   4. Implemente o handler no arquivo .gs correspondente
// ============================================================


// ============================================================
// TABELA DE ROTAS
// ============================================================

var ROTAS = {

  // ── Públicas (sem token) ──────────────────────────────────
  "getConfig": {
    publico  : true,
    handler  : function (params) {
      return Response.ok(Config.getDadosPublicos());
    }
  },

  "login": {
    publico  : true,
    handler  : function (params) {
      return Auth.login(params.login, params.senha);
    }
  },

  "trocarSenha": {
    publico  : true, // validação interna por senha atual, não por token
    handler  : function (params) {
      return Auth.trocarSenha(params.login, params.senhaAtual, params.senhaNova);
    }
  },



  // ── Autenticadas (exigem token) ───────────────────────────

  "logout": {
    publico  : false,
    papeis   : null, // qualquer papel autenticado
    handler  : function (params, auth) {
      return Auth.logout(params.token, auth.login, auth.papel);
    }
  },

  "getPerfil": {
    publico  : false,
    papeis   : null,
    handler  : function (params, auth) {
      return Handlers.getPerfil(auth);
    }
  },

  "getModulos": {
    publico  : false,
    papeis   : null,
    handler  : function (params, auth) {
      return Handlers.getModulos(auth);
    }
  },

  "getSemestreAtual": {
    publico  : false,
    papeis   : null,
    handler  : function (params, auth) {
      return Handlers.getSemestreAtual(auth);
    }
  },

  // ── Admin ────────────────────────────────────────────────

  "toggleModulo": {
    publico  : false,
    papeis   : ["admin"],
    handler  : function (params, auth) {
      return Handlers.toggleModulo(params, auth);
    }
  },

  "setRematricula": {
    publico  : false,
    papeis   : ["admin"],
    handler  : function (params, auth) {
      return Handlers.setRematricula(params, auth);
    }
  },

  "listarUsuarios": {
    publico  : false,
    papeis   : ["admin"],
    handler  : function (params, auth) {
      return Handlers.listarUsuarios(auth);
    }
  },

  "toggleUsuario": {
    publico  : false,
    papeis   : ["admin"],
    handler  : function (params, auth) {
      return Handlers.toggleUsuario(params, auth);
    }
  },

  "redefinirSenha": {
    publico  : false,
    papeis   : ["admin"],
    handler  : function (params, auth) {
      return Handlers.redefinirSenha(params, auth);
    }
  },

  // ── Avisos ───────────────────────────────────────────────

  "getAvisos": {
    publico  : false,
    papeis   : null, // todos os papéis autenticados
    handler  : function (params, auth) {
      return Handlers.getAvisos(params, auth);
    }
  },

  "salvarAviso": {
    publico  : false,
    papeis   : ["admin", "coordenacao"],
    handler  : function (params, auth) {
      return Handlers.salvarAviso(params, auth);
    }
  },

  "toggleAviso": {
    publico  : false,
    papeis   : ["admin", "coordenacao"],
    handler  : function (params, auth) {
      return Handlers.toggleAviso(params, auth);
    }
  },

  "excluirAviso": {
    publico  : false,
    papeis   : ["admin", "coordenacao"],
    handler  : function (params, auth) {
      return Handlers.excluirAviso(params, auth);
    }
  },

  // ── Calendário ───────────────────────────────────────────

  "getCalendario": {
    publico  : false,
    papeis   : null,
    handler  : function (params, auth) {
      return Handlers.getCalendario(params, auth);
    }
  },

  "salvarEvento": {
    publico  : false,
    papeis   : ["admin", "coordenacao", "secretaria"],
    handler  : function (params, auth) {
      return Handlers.salvarEvento(params, auth);
    }
  },

  "excluirEvento": {
    publico  : false,
    papeis   : ["admin", "coordenacao", "secretaria"],
    handler  : function (params, auth) {
      return Handlers.excluirEvento(params, auth);
    }
  },

  // ── Turmas ───────────────────────────────────────────────

  "getTurmasAluno": {
    publico  : false,
    papeis   : null,
    handler  : function (params, auth) {
      return Handlers.getTurmasAluno(params, auth);
    }
  },

  "salvarMensagemTurma": {
    publico  : false,
    papeis   : ["admin", "coordenacao", "professor"],
    handler  : function (params, auth) {
      return Handlers.salvarMensagemTurma(params, auth);
    }
  },

  "excluirMensagemTurma": {
    publico  : false,
    papeis   : ["admin", "coordenacao", "professor"],
    handler  : function (params, auth) {
      return Handlers.excluirMensagemTurma(params, auth);
    }
  },

  // ── Documentos ───────────────────────────────────────────

  "buscarAlunos": {
    publico  : false,
    papeis   : ["admin", "coordenacao", "secretaria"],
    handler  : function (params, auth) {
      return Handlers.buscarAlunos(params, auth);
    }
  },

  "gerarDocumento": {
    publico  : false,
    papeis   : null,
    handler  : function (params, auth) {
      return Handlers.gerarDocumento(params, auth);
    }
  },

  "verifyDocument": {
    publico  : true,
    handler  : function (params) {
      return Handlers.verifyDocument(params);
    }
  },

  // ── Rematrícula ──────────────────────────────────────────

  "getTurmasRematricula": {
    publico  : false,
    papeis   : null,
    handler  : function (params, auth) {
      return Handlers.getTurmasRematricula(params, auth);
    }
  },

  "solicitarRematricula": {
    publico  : false,
    papeis   : ["aluno"],
    handler  : function (params, auth) {
      return Handlers.solicitarRematricula(params, auth);
    }
  },

  "getRematriculas": {
    publico  : false,
    papeis   : ["admin", "coordenacao", "secretaria"],
    handler  : function (params, auth) {
      return Handlers.getRematriculas(params, auth);
    }
  },

  "atualizarStatusRematricula": {
    publico  : false,
    papeis   : ["admin", "coordenacao", "secretaria"],
    handler  : function (params, auth) {
      return Handlers.atualizarStatusRematricula(params, auth);
    }
  },

  // ── Rematrícula expandida ────────────────────────────────

  "getConfigRematricula": {
    publico  : false,
    papeis   : null,
    handler  : function (params, auth) { return Handlers.getConfigRematricula(params, auth); }
  },
  "salvarDocRematricula": {
    publico  : false,
    papeis   : ["admin"],
    handler  : function (params, auth) { return Handlers.salvarDocRematricula(params, auth); }
  },
  "excluirDocRematricula": {
    publico  : false,
    papeis   : ["admin"],
    handler  : function (params, auth) { return Handlers.excluirDocRematricula(params, auth); }
  },
  "salvarJustificativa": {
    publico  : false,
    papeis   : ["admin"],
    handler  : function (params, auth) { return Handlers.salvarJustificativa(params, auth); }
  },
  "excluirJustificativa": {
    publico  : false,
    papeis   : ["admin"],
    handler  : function (params, auth) { return Handlers.excluirJustificativa(params, auth); }
  },
  "salvarEntryConfig": {
    publico  : false,
    papeis   : ["admin"],
    handler  : function (params, auth) { return Handlers.salvarEntryConfig(params, auth); }
  },
  "getDocsAluno": {
    publico  : false,
    papeis   : ["admin", "coordenacao", "secretaria"],
    handler  : function (params, auth) { return Handlers.getDocsAluno(params, auth); }
  },
  "validarDocs": {
    publico  : false,
    papeis   : ["admin", "coordenacao", "secretaria"],
    handler  : function (params, auth) { return Handlers.validarDocs(params, auth); }
  },
  "getPosicaoFila": {
    publico  : false,
    papeis   : null,
    handler  : function (params, auth) { return Handlers.getPosicaoFila(params, auth); }
  },
  "setDataLimiteRematricula": {
    publico  : false,
    papeis   : ["admin"],
    handler  : function (params, auth) { return Handlers.setDataLimiteRematricula(params, auth); }
  },

  // ── Avaliações (Provas) ──────────────────────────────────

  "getProvasAluno": {
    publico  : false,
    papeis   : null,
    handler  : function (params, auth) { return Handlers.getProvasAluno(params, auth); }
  },
  "getProvasGestao": {
    publico  : false,
    papeis   : ["admin", "coordenacao", "professor"],
    handler  : function (params, auth) { return Handlers.getProvasGestao(params, auth); }
  },
  "salvarProva": {
    publico  : false,
    papeis   : ["admin", "coordenacao", "professor"],
    handler  : function (params, auth) { return Handlers.salvarProva(params, auth); }
  },
  "excluirProva": {
    publico  : false,
    papeis   : ["admin", "coordenacao", "professor"],
    handler  : function (params, auth) { return Handlers.excluirProva(params, auth); }
  }

};


// ============================================================
// ROTEADOR INTERNO
// ============================================================

/**
 * Query string trafega tudo como string.
 * Esta função converte "true"/"false" para boolean
 * e strings numéricas para number, para que os handlers
 * recebam os tipos corretos independente da origem da chamada.
 * @param {Object} params
 * @returns {Object}
 */
function _normalizarParams(params) {
  var result = {};
  Object.keys(params).forEach(function (k) {
    var v = params[k];
    if (v === "true")       result[k] = true;
    else if (v === "false") result[k] = false;
    else                    result[k] = v;
  });
  return result;
}

/**
 * Processa qualquer requisição.
 * @param {Object} params - Parâmetros já normalizados.
 * @returns {TextOutput}
 */
function _rotear(params) {
  var action = String(params.action || "").trim();

  if (!action) {
    return Response.erro("Parâmetro 'action' ausente.", Response.CODES.ACAO_INVALIDA);
  }

  var rota = ROTAS[action];

  if (!rota) {
    return Response.erro("Ação '" + action + "' não reconhecida.", Response.CODES.ACAO_INVALIDA);
  }

  if (rota.publico) {
    return rota.handler(params);
  }

  var auth = Auth.verificar(params.token, rota.papeis || null);
  if (!auth.ok) return auth.resposta;

  return rota.handler(params, auth);
}


// ============================================================
// ENTRY POINTS DO APPS SCRIPT
// ============================================================

/**
 * Único entry point — todas as chamadas do front-end usam GET.
 * O doPost é mantido como fallback mas não é mais necessário.
 */
function doGet(e) {
  try {
    var raw    = (e && e.parameter) ? e.parameter : {};
    var params = _normalizarParams(raw);
    return _rotear(params);
  } catch (err) {
    console.error("[doGet] Erro não tratado: " + err.message);
    return Response.erro("Erro interno do servidor.", Response.CODES.ERRO_INTERNO);
  }
}

function doPost(e) {
  try {
    var params = {};
    if (e && e.postData && e.postData.contents) {
      try { params = JSON.parse(e.postData.contents); } catch (_) {}
    }
    if (e && e.parameter) {
      Object.keys(e.parameter).forEach(function (k) { if (!params[k]) params[k] = e.parameter[k]; });
    }
    return _rotear(_normalizarParams(params));
  } catch (err) {
    console.error("[doPost] Erro não tratado: " + err.message);
    return Response.erro("Erro interno do servidor.", Response.CODES.ERRO_INTERNO);
  }
}
