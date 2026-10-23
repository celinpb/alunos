/* =============================================================================
   Portal do Aluno — CELINPB · app.js
   Identificação, chamada à função de consulta, cache no aparelho e telas.
   Todo texto vindo do servidor entra na página como TEXTO (textContent),
   nunca como HTML.
   ============================================================================= */
(function () {
  'use strict';

  var CFG = window.PORTAL_CONFIG || {};
  var CHAVE_DADOS = 'portal.dados';
  var CHAVE_CODIGO = 'portal.codigo';
  var CHAVE_INSTALAR = 'portal.instalar-dispensado';
  var CHAVE_INFO = 'portal.info';            // período da rematrícula e manuais (nada pessoal)
  var CHAVE_REMAT = 'portal.remat';          // sessão curta da rematrícula (só nesta aba)
  // Rematrícula: função vizinha da consulta (mesmo projeto Supabase).
  var REMAT_URL = CFG.rematriculaUrl || String(CFG.funcaoUrl || '').replace(/consulta-aluno\/?$/, 'rematricula');
  var TZ = 'America/Fortaleza';

  var $ = function (id) { return document.getElementById(id); };
  var estado = { dados: null, eventoInstalar: null, info: null, remat: null, rematAguardando: false };

  // ── Armazenamento (pode falhar em janela anônima: tudo protegido) ────────
  var guarda = {
    ler: function (area, chave) {
      try { return window[area].getItem(chave); } catch (e) { return null; }
    },
    gravar: function (area, chave, valor) {
      try { window[area].setItem(chave, valor); return true; } catch (e) { return false; }
    },
    apagar: function (chave) {
      ['localStorage', 'sessionStorage'].forEach(function (a) {
        try { window[a].removeItem(chave); } catch (e) { /* nada */ }
      });
    },
  };

  function salvarDados(dados, manter) {
    guarda.apagar(CHAVE_DADOS);
    guarda.apagar(CHAVE_CODIGO);
    var area = manter ? 'localStorage' : 'sessionStorage';
    guarda.gravar(area, CHAVE_DADOS, JSON.stringify(dados));
    guarda.gravar(area, CHAVE_CODIGO, dados.aluno.codigo);
  }

  function lerDadosSalvos() {
    var bruto = guarda.ler('sessionStorage', CHAVE_DADOS) || guarda.ler('localStorage', CHAVE_DADOS);
    if (!bruto) return null;
    try {
      var d = JSON.parse(bruto);
      return d && d.aluno && Array.isArray(d.turmas) ? normalizarDados(d) : null;
    } catch (e) { return null; }
  }
  function dadosNoAparelho() { return !!guarda.ler('localStorage', CHAVE_DADOS); }

  // Dados da versão 1 (antes de 23/10/2026) usavam REPROVADO para a média e
  // RETIDO para a frequência. A escola usa Retido / Retido por faltas (D-62).
  function normalizarDados(d) {
    if (!d || (d.versao || 1) >= 2) return d;
    (d.turmas || []).forEach(function (t) {
      if (t.resultado === 'RETIDO') t.resultado = 'RETIDO_FALTAS';
      else if (t.resultado === 'REPROVADO') t.resultado = 'RETIDO';
      (t.avaliacoes || []).forEach(function (a) { if (a.situacao === 'REPROVADO') a.situacao = 'ABAIXO'; });
    });
    d.versao = 2;
    return d;
  }

  // ── Construção de elementos (texto sempre como texto) ────────────────────
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    for (var i = 2; i < arguments.length; i++) anexar(el, arguments[i]);
    return el;
  }
  function anexar(el, filho) {
    if (filho === null || filho === undefined || filho === false) return;
    if (Array.isArray(filho)) { filho.forEach(function (f) { anexar(el, f); }); return; }
    el.appendChild(typeof filho === 'string' || typeof filho === 'number' ? document.createTextNode(String(filho)) : filho);
  }
  function linkSeguro(url) {
    var u = String(url || '').trim();
    return /^https:\/\/[^\s]+$/i.test(u) ? u : null;
  }
  function emailValido(e) { return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(String(e || '')); }

  // ── Datas e números ──────────────────────────────────────────────────────
  var DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  var DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  function dataPura(iso) { // 'AAAA-MM-DD' → Date ao meio-dia UTC (sem efeito de fuso)
    var p = String(iso || '').slice(0, 10).split('-');
    return p.length === 3 ? new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12)) : null;
  }
  function fmtData(iso, comAno) {
    var d = dataPura(iso); if (!d) return '';
    var s = String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0');
    return comAno === false ? s : s + '/' + d.getUTCFullYear();
  }
  function diaSemana(iso, curto) { var d = dataPura(iso); return d ? (curto ? DIAS_CURTOS : DIAS)[d.getUTCDay()] : ''; }
  function hojeIso() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
  function fmtMomento(ts) {
    var d = new Date(ts); if (isNaN(d)) return '';
    var dia = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit' }).format(d);
    var hora = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(d);
    return { dia: dia, hora: hora };
  }
  var fmtNum = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
  function nota(v) { return v === null || v === undefined || v === '' ? '—' : fmtNum.format(Number(v)); }
  function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }
  function fmtCodigo(c) { c = String(c || ''); return c.length === 9 ? c.slice(0, 3) + ' ' + c.slice(3, 7) + ' ' + c.slice(7) : c; }
  function capital(s) { s = String(s || '').toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); }

  // =========================================================================
  // TELA 1 — ENTRAR
  // =========================================================================
  function mostrarEntrar(motivo) {
    $('tela-painel').hidden = true;
    $('tela-remat').hidden = true;
    $('tela-entrar').hidden = false;
    desenharInfoEntrada();
    var cod = guarda.ler('sessionStorage', CHAVE_CODIGO) || guarda.ler('localStorage', CHAVE_CODIGO) || '';
    if (cod && !$('campo-codigo').value) $('campo-codigo').value = fmtCodigo(cod);
    $('campo-manter').checked = dadosNoAparelho();
    var m = $('entrar-motivo');
    m.hidden = !motivo; m.textContent = motivo || '';
    document.title = 'Portal do Aluno — CELINPB';
    ($('campo-codigo').value ? $('campo-nascimento') : $('campo-codigo')).focus({ preventScroll: true });
  }

  // Máscaras
  $('campo-codigo').addEventListener('input', function (e) {
    var d = e.target.value.replace(/\D/g, '').slice(0, 9);
    e.target.value = d.length > 7 ? d.slice(0, 3) + ' ' + d.slice(3, 7) + ' ' + d.slice(7)
                   : d.length > 3 ? d.slice(0, 3) + ' ' + d.slice(3) : d;
    limparErroCampo('codigo');
  });
  $('campo-nascimento').addEventListener('input', function (e) {
    var d = e.target.value.replace(/\D/g, '').slice(0, 8);
    e.target.value = d.length > 4 ? d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4)
                   : d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
    limparErroCampo('nascimento');
  });

  function erroCampo(campo, msg) {
    var input = $('campo-' + campo), p = $('erro-' + campo);
    input.setAttribute('aria-invalid', 'true');
    p.textContent = msg; p.hidden = false;
    input.focus();
  }
  function limparErroCampo(campo) {
    $('campo-' + campo).removeAttribute('aria-invalid');
    $('erro-' + campo).hidden = true;
    $('entrar-erro').hidden = true;
  }
  function erroGeral(msg) { var p = $('entrar-erro'); p.textContent = msg; p.hidden = false; }

  function dataValida(txt) {
    var m = String(txt).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return false;
    var d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
    return d.getUTCDate() === +m[1] && d.getUTCMonth() === +m[2] - 1 && +m[3] >= 1920 && d <= new Date();
  }

  $('form-entrar').addEventListener('submit', function (e) {
    e.preventDefault();
    var codigo = $('campo-codigo').value.replace(/\D/g, '');
    var nasc = $('campo-nascimento').value.trim();
    $('entrar-erro').hidden = true;
    if (codigo.length !== 9) return erroCampo('codigo', 'O código tem 9 números. Confira e digite de novo.');
    if (!dataValida(nasc)) return erroCampo('nascimento', 'Digite a data completa, no formato dia/mês/ano. Exemplo: 14/03/2008.');
    consultar(codigo, nasc, $('campo-manter').checked);
  });

  function consultar(codigo, nascimento, manter) {
    var botao = $('botao-entrar');
    botao.disabled = true; botao.classList.add('carregando');
    var fim = function () { botao.disabled = false; botao.classList.remove('carregando'); };

    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var tempo = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);

    fetch(CFG.funcaoUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: codigo, nascimento: nascimento }),
      signal: ctrl ? ctrl.signal : undefined,
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, j: j }; });
      })
      .then(function (res) {
        clearTimeout(tempo); fim();
        var j = res.j || {};
        if (res.status === 200 && j.ok && j.dados) {
          $('campo-nascimento').value = '';
          normalizarDados(j.dados);
          salvarDados(j.dados, manter);
          estado.dados = j.dados;
          mostrarPainel(j.dados);
          // Rematrícula aberta: já entra também nela, com os mesmos dados.
          rematEntrarAposConsulta(codigo, nascimento);
          return;
        }
        if (j.erro === 'FORMATO' && j.campo === 'nascimento') return erroCampo('nascimento', j.mensagem);
        if (j.erro === 'FORMATO') return erroCampo('codigo', j.mensagem || 'Confira o código.');
        if (j.erro === 'NAO_CONFERE') return erroGeral(j.mensagem + ' Se o erro continuar, procure a secretaria.');
        if (j.erro === 'BLOQUEADO') return erroGeral(j.mensagem + ' Isso protege seus dados contra tentativas de outras pessoas.');
        erroGeral(j.mensagem || 'Não foi possível consultar agora. Tente novamente em alguns minutos.');
      })
      .catch(function () {
        clearTimeout(tempo); fim();
        erroGeral(navigator.onLine === false
          ? 'Você está sem internet. Conecte-se e tente de novo.'
          : 'Não foi possível falar com o servidor. Verifique sua internet e tente de novo.');
      });
  }

  // =========================================================================
  // TELA 2 — PAINEL
  // =========================================================================
  function mostrarPainel(d) {
    $('tela-entrar').hidden = true;
    $('tela-remat').hidden = true;
    $('tela-painel').hidden = false;
    window.PORTAL_DADOS = d; // usado pelo boletim aberto em outra aba

    $('painel-ola').textContent = 'Olá, ' + (d.aluno.nome_exibicao || 'aluno(a)');
    $('painel-codigo').textContent = 'Código ' + fmtCodigo(d.aluno.codigo);
    var g = fmtMomento(d.gerado_em), p = fmtMomento(d.proxima_atualizacao);
    $('painel-atualizacao').textContent =
      (d.semestre && d.semestre.rotulo ? 'Semestre ' + d.semestre.rotulo + '. ' : '') +
      (g ? 'Informações de ' + g.dia + ' às ' + g.hora + '.' : '') +
      (p ? ' Próxima atualização às ' + p.hora + (p.dia !== g.dia ? ' de ' + p.dia : '') + '.' : '');
    document.title = 'Minhas turmas — Portal do Aluno';

    // Aluno inativo: até quando vai o acesso
    var aviso = $('aviso-acesso');
    if (d.aluno.ativo === false && d.aluno.acesso_ate) {
      aviso.textContent = 'Sua matrícula não está ativa. Você pode consultar este portal até ' + fmtData(d.aluno.acesso_ate) + '.';
      aviso.hidden = false;
    } else aviso.hidden = true;

    // Dados velhos
    var velho = d.proxima_atualizacao && Date.now() > new Date(d.proxima_atualizacao).getTime() + 5 * 60000;
    $('aviso-desatualizado').hidden = !velho;

    // Turmas
    var cont = $('turmas');
    cont.textContent = '';
    var atalhos = $('atalhos');
    atalhos.textContent = '';
    d.turmas.forEach(function (t, i) {
      cont.appendChild(t.detalhada ? cartaoTurma(t, i) : cartaoResumido(t, i));
      atalhos.appendChild(h('a', {
        class: 'atalho' + (t.detalhada ? '' : ' atalho-inativo'), href: '#turma-' + i,
        text: capital((t.turma && (t.turma.estagio || t.turma.sigla || t.turma.codigo)) || 'Turma ' + (i + 1)),
      }));
    });
    if (!d.turmas.length) {
      cont.appendChild(h('p', { class: 'aviso aviso-info', text: 'Nenhuma turma encontrada neste semestre. Se isso estiver errado, procure a secretaria.' }));
    }
    atalhos.hidden = d.turmas.length < 2;
    $('botao-boletim').hidden = !d.turmas.some(function (t) { return t.detalhada; });

    rodape(d);
    desenharManuais();
    desenharRemat();
    avisoInstalar();
    $('conteudo').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  // ── Cartão de turma completo ─────────────────────────────────────────────
  function emAndamento(t) {
    if (t.matricula && t.matricula.situacao === 'CONCLUIDA') return false;
    return (t.aulas || []).some(function (a) { return a.estado === 'PREVISTA'; });
  }

  function cabecalhoTurma(t, selo) {
    var tu = t.turma || {};
    var horario = [tu.dia_semana && capital(tu.dia_semana.replace(/,/g, ', ')), tu.horario].filter(Boolean).join(', ');
    var modo = [tu.modalidade && (tu.modalidade.length <= 3 ? tu.modalidade.toUpperCase() : capital(tu.modalidade)), tu.turno && 'turno ' + tu.turno.toLowerCase()].filter(Boolean).join(', ');
    return h('div', { class: 'turma-cab' },
      h('div', { class: 'turma-linha1' },
        h('span', { class: 'turma-idioma', text: tu.idioma || tu.curso || '' }),
        selo),
      h('h2', { class: 'turma-nome', text: capital(tu.estagio || tu.curso || tu.codigo || 'Turma') }),
      horario ? h('p', { class: 'turma-info', text: horario }) : null,
      modo ? h('p', { class: 'turma-info', text: modo }) : null,
      h('p', { class: 'turma-cod', text: 'Turma ' + (tu.codigo || '') }));
  }

  // Nomenclatura da escola (D-62).
  var RESULTADOS = {
    APROVADO: ['Aprovado(a)', 'selo-ok'],
    RETIDO: ['Retido(a)', 'selo-ruim'],
    RETIDO_FALTAS: ['Retido(a) por faltas', 'selo-ruim'],
    PENDENTE: ['Notas pendentes', 'selo-neutro'],
  };

  function cartaoTurma(t, i) {
    var andamento = emAndamento(t);
    var selo = andamento
      ? h('span', { class: 'selo selo-neutro', text: 'Em andamento' })
      : (RESULTADOS[t.resultado] ? h('span', { class: 'selo ' + RESULTADOS[t.resultado][1], text: RESULTADOS[t.resultado][0] }) : null);
    if (t.matricula && t.matricula.situacao === 'CONCLUIDA' && !selo) selo = h('span', { class: 'selo selo-neutro', text: 'Concluída' });

    var grupo = 'turma-' + i;
    var art = h('article', { class: 'turma', id: 'turma-' + i, 'aria-labelledby': 'titulo-turma-' + i },
      cabecalhoTurma(t, selo),
      secao(grupo, 'Frequência', resumoFrequencia(t), corpoFrequencia(t), true),
      secao(grupo, 'Notas', resumoNotas(t), corpoNotas(t)),
      (t.comentarios && t.comentarios.length)
        ? secao(grupo, 'Comentários do professor', plural(t.comentarios.length, 'comentário', 'comentários'), corpoComentarios(t)) : null,
      secao(grupo, 'Turma e professor', null, corpoTurma(t)));
    art.querySelector('.turma-nome').id = 'titulo-turma-' + i;
    return art;
  }

  function secao(grupo, titulo, resumo, corpo, aberta) {
    // name = acordeão exclusivo (abre uma de cada vez) nos navegadores que suportam
    return h('details', { class: 'secao', name: grupo, open: !!aberta },
      h('summary', null, h('span', { text: titulo }), resumo ? h('span', { class: 'secao-resumo', text: resumo }) : null),
      h('div', { class: 'secao-corpo' }, corpo));
  }

  // ── Frequência ───────────────────────────────────────────────────────────
  function resumoFrequencia(t) {
    var f = t.frequencia || {};
    return f.percentual === undefined || f.percentual === null ? 'sem registros' : f.percentual + '%';
  }

  var REGISTRO = { P: 'Presença', F: 'Falta', J: 'Falta justificada' };

  function corpoFrequencia(t) {
    var f = t.frequencia || {};
    var sit = f.situacao || 'SEM_REGISTRO';
    var pct = f.percentual;
    var bloco = h('div', { class: 'freq freq-' + sit });

    if (pct === undefined || pct === null) {
      bloco.appendChild(h('p', { class: 'freq-msg', text: 'O professor ainda não registrou nenhuma aula desta turma.' }));
      return [bloco, listaAulas(t)];
    }

    bloco.appendChild(h('div', { class: 'freq-numero' },
      h('span', { class: 'freq-pct' }, String(pct), h('small', { text: '%' })),
      h('span', { class: 'freq-legenda', text: 'de frequência. O mínimo é 75%.' })));

    var barra = h('div', { class: 'regua-barra' });
    barra.style.width = Math.max(0, Math.min(100, pct)) + '%';
    bloco.appendChild(h('div', { class: 'regua', role: 'img', 'aria-label': 'Frequência de ' + pct + '%. A linha marca o mínimo de 75%.' },
      barra, h('div', { class: 'regua-marca' }, h('span', { text: 'mínimo 75%' }))));

    // Mensagem de autonomia
    var msg;
    if (sit === 'ABAIXO') {
      msg = h('p', { class: 'freq-msg ruim' }, 'Sua frequência está abaixo do mínimo de 75%. Converse com seu professor ou com a secretaria.');
    } else if (f.faltas_restantes !== undefined && f.faltas_restantes !== null) {
      msg = f.faltas_restantes > 0
        ? h('p', { class: 'freq-msg' }, 'Você ainda pode faltar ', h('strong', { text: plural(f.faltas_restantes, 'aula', 'aulas') }), ' até o fim do semestre sem ficar abaixo de 75%.')
        : h('p', { class: 'freq-msg ruim' }, 'Você já usou todas as faltas permitidas. Uma nova falta deixa sua frequência abaixo de 75%.');
    }
    bloco.appendChild(msg || null);

    bloco.appendChild(pontosAulas(t));

    var reg = f.aulas_registradas || 0;
    bloco.appendChild(h('div', { class: 'contagens' },
      contagem(f.presencas || 0, 'presenças'),
      contagem(f.faltas || 0, 'faltas'),
      contagem(f.justificadas || 0, 'justificadas'),
      contagem(f.aulas_previstas ? reg + ' de ' + f.aulas_previstas : reg, f.aulas_previstas ? 'aulas já registradas' : 'aulas registradas')));

    return [bloco, listaAulas(t),
      h('p', { class: 'regra', text: 'Faltas justificadas contam como presença no cálculo da frequência.' })];
  }

  function contagem(valor, rotulo) { return h('div', { class: 'contagem' }, h('b', { text: String(valor) }), h('span', { text: rotulo })); }

  function pontosAulas(t) {
    var aulas = t.aulas || [];
    if (!aulas.length) return null;
    var lista = h('div', { class: 'pontos', 'aria-hidden': 'true' });
    aulas.forEach(function (a) {
      var tipo = a.estado === 'REGISTRADA' ? a.registro : a.estado;
      lista.appendChild(h('span', { class: 'ponto ponto-' + tipo, title: fmtData(a.data, false) + ': ' + (REGISTRO[a.registro] || (a.estado === 'PREVISTA' ? 'aula prevista' : 'sem registro')) }));
    });
    return h('div', null, lista,
      h('div', { class: 'pontos-legenda', 'aria-hidden': 'true' },
        legenda('P', 'presença'), legenda('F', 'falta'), legenda('J', 'justificada'),
        legenda('SEM_REGISTRO', 'sem registro'), legenda('PREVISTA', 'próximas aulas')));
  }
  function legenda(tipo, texto) { return h('span', null, h('i', { class: 'ponto ponto-' + tipo }), texto); }

  function listaAulas(t) {
    var aulas = t.aulas || [];
    var passadas = aulas.filter(function (a) { return a.estado !== 'PREVISTA'; }).reverse();
    var futuras = aulas.filter(function (a) { return a.estado === 'PREVISTA'; });
    if (!passadas.length && !futuras.length) return null;

    var ul = h('ul', { class: 'aulas-lista' });
    passadas.forEach(function (a) {
      var sel;
      if (a.estado === 'REGISTRADA') {
        var cls = a.registro === 'P' ? 'selo-ok' : a.registro === 'J' ? 'selo-atencao' : 'selo-ruim';
        sel = h('span', { class: 'selo aula-reg ' + cls, text: REGISTRO[a.registro] || a.registro });
      } else sel = h('span', { class: 'selo aula-reg selo-neutro', text: 'Sem registro' });
      ul.appendChild(h('li', { class: 'aula' },
        h('span', { class: 'aula-data' }, fmtData(a.data, false), h('span', { class: 'aula-dia', text: diaSemana(a.data) })),
        sel,
        h('p', { class: 'aula-conteudo' + (a.conteudo ? '' : ' vazio'), text: a.conteudo || 'Conteúdo da aula não registrado.' }),
        a.anotacao ? h('p', { class: 'aula-obs', text: 'Observação: ' + a.anotacao }) : null));
    });
    if (futuras.length) {
      ul.appendChild(h('li', { class: 'aulas-futuras' },
        h('b', { text: 'Próximas aulas (' + futuras.length + ')' }),
        futuras.map(function (a) { return diaSemana(a.data, true) + ' ' + fmtData(a.data, false); }).join(', ')));
    }
    return h('details', { class: 'aulas' },
      h('summary', { text: 'Aula por aula' + (passadas.length ? ' (' + passadas.length + ')' : '') }), ul);
  }

  // ── Notas ────────────────────────────────────────────────────────────────
  function resumoNotas(t) {
    var avs = t.avaliacoes || [];
    var lanc = 0, total = 0;
    avs.forEach(function (a) { (a.notas || []).forEach(function (n) { total++; if (n.valor !== undefined && n.valor !== null) lanc++; }); });
    return total ? lanc + ' de ' + total + ' lançadas' : null;
  }

  function corpoNotas(t) {
    var avs = t.avaliacoes || [];
    if (!avs.length) return h('p', { class: 'vazio', text: 'Esta turma ainda não tem avaliações cadastradas.' });
    var partes = avs.map(function (a) {
      var sit = a.situacao === 'APROVADO' ? ['Média atingida', 'selo-ok', 'ok']
              : a.situacao === 'ABAIXO' ? ['Abaixo da média', 'selo-ruim', 'ruim']
              : ['Aguardando notas', 'selo-neutro', ''];
      var notas = (a.notas || []).map(function (n) {
        return h('div', { class: 'nota' }, h('span', { text: n.rotulo }), h('b', { text: nota(n.valor) }));
      });
      notas.push(h('div', { class: 'nota nota-media ' + sit[2] }, h('span', { text: 'Média' }), h('b', { text: nota(a.media) })));
      return h('div', { class: 'comp' },
        h('div', { class: 'comp-cab' }, h('span', { class: 'comp-nome', text: a.componente }), h('span', { class: 'selo ' + sit[1], text: sit[0] })),
        h('div', { class: 'notas-linha' }, notas));
    });
    var a0 = avs[0];
    var iguais = avs.every(function (a) { return String(a.escala) === String(a0.escala) && a.aprovacao === a0.aprovacao; });
    if (iguais && a0.escala && a0.aprovacao !== undefined) {
      partes.push(h('p', { class: 'regra', text: 'Notas de ' + nota(a0.escala[0]) + ' a ' + nota(a0.escala[1]) +
        '. Para ser aprovado(a), é preciso média ' + nota(a0.aprovacao) + ' em cada componente.' }));
    }
    return partes;
  }

  // ── Comentários ──────────────────────────────────────────────────────────
  function corpoComentarios(t) {
    return t.comentarios.map(function (c) {
      return h('div', { class: 'comentario' }, h('span', { text: 'Etapa ' + c.etapa }), h('p', { text: c.texto }));
    });
  }

  // ── Turma e professor ────────────────────────────────────────────────────
  function corpoTurma(t) {
    var tu = t.turma || {}, pr = t.professor || {}, ln = tu.links || {}, al = estado.dados ? estado.dados.aluno : {};
    var links = [];
    if (emailValido(pr.email)) {
      var assunto = '[CELINPB] Turma ' + (tu.codigo || '') + ' — ' + (al.nome_exibicao || '') + ' (' + (al.codigo || '') + ')';
      links.push(linkBotao('mailto:' + pr.email + '?subject=' + encodeURIComponent(assunto), 'ic-email', '@', 'Enviar e-mail ao professor'));
    }
    if (linkSeguro(ln.meet)) links.push(linkBotao(linkSeguro(ln.meet), 'ic-meet', 'M', 'Entrar no Google Meet'));
    if (linkSeguro(ln.classroom)) links.push(linkBotao(linkSeguro(ln.classroom), 'ic-classroom', 'C', 'Abrir o Classroom'));
    if (linkSeguro(ln.whatsapp)) links.push(linkBotao(linkSeguro(ln.whatsapp), 'ic-whatsapp', 'W', 'Grupo de WhatsApp'));

    var datas = tu.data_inicio || tu.data_fim
      ? 'Período da turma: ' + (tu.data_inicio ? fmtData(tu.data_inicio) : '…') + ' a ' + (tu.data_fim ? fmtData(tu.data_fim) : '…') + '.' : null;
    return h('div', { class: 'prof' },
      pr.nome ? h('p', { class: 'prof-nome' }, h('span', { text: 'Professor(a)' }), pr.nome) : null,
      links.length ? h('div', { class: 'links' }, links) : h('p', { class: 'vazio', text: 'Nenhum link cadastrado para esta turma.' }),
      datas ? h('p', { class: 'datas-turma', text: datas }) : null);
  }
  function linkBotao(href, icone, letra, texto) {
    var externo = href.indexOf('mailto:') !== 0;
    return h('a', { class: 'link-botao', href: href, target: externo ? '_blank' : null, rel: externo ? 'noopener noreferrer' : null },
      h('i', { class: icone, 'aria-hidden': 'true', text: letra }), texto);
  }

  // ── Matrícula não ativa (resumo) ─────────────────────────────────────────
  function cartaoResumido(t, i) {
    var m = t.matricula || {};
    var rot = { TRANSFERIDA: 'Transferida', CANCELADA: 'Cancelada', TRANCADA: 'Trancada' }[m.situacao] || capital(m.situacao || '');
    var texto = m.situacao === 'TRANSFERIDA'
      ? 'Matrícula transferida' + (m.turma_destino ? ' para a turma ' + m.turma_destino : '') + '.'
      : m.situacao === 'CANCELADA'
        ? 'Matrícula cancelada' + (m.data_cancelamento ? ' em ' + fmtData(String(m.data_cancelamento).slice(0, 10)) : '') + '.'
        : 'Matrícula ' + rot.toLowerCase() + '.';
    var art = h('article', { class: 'turma turma-resumida', id: 'turma-' + i },
      cabecalhoTurma(t, h('span', { class: 'selo selo-neutro', text: rot })));
    art.querySelector('.turma-cab').appendChild(h('p', { class: 'turma-nota', text: texto }));
    return art;
  }

  // ── Rodapé ───────────────────────────────────────────────────────────────
  function rodape(d) {
    var hoje = hojeIso();
    var ev = (d.eventos || []).filter(function (e) { return String(e.data) >= hoje; }).slice(0, 6);
    var ul = $('lista-eventos'); ul.textContent = '';
    ev.forEach(function (e) {
      ul.appendChild(h('li', null, h('b', { text: fmtData(e.data, false) + ', ' + diaSemana(e.data, true) }), h('span', { text: e.descricao })));
    });
    $('bloco-eventos').hidden = !ev.length;

    var es = d.escola || {}, c = $('contato-escola'); c.textContent = '';
    if (emailValido(es.email)) c.appendChild(h('a', { href: 'mailto:' + es.email, text: es.email }));
    if (es.telefone) c.appendChild(h('a', { href: 'tel:' + String(es.telefone).replace(/[^\d+]/g, ''), text: es.telefone }));
    $('rodape-versao').textContent = 'Portal do Aluno ' + (es.sigla || 'CELINPB') + ' · versão ' + (CFG.versao || '');
  }

  // =========================================================================
  // REMATRÍCULA (Transição de semestre — Fase 5)
  // Dados ao vivo pela função "rematricula" (não pela fotografia de 6 h).
  // O aluno só vê as turmas do estágio para o qual está autorizado (D-69).
  // Sessão curta (30 min), guardada só nesta aba.
  // =========================================================================
  var REMAT_STATUS = {
    enviada: ['Enviada', 'selo-neutro'],
    aguardando_conclusao: ['Enviada', 'selo-neutro'],
    deferida: ['Deferida', 'selo-ok'],
    lista_espera: ['Lista de espera', 'selo-atencao'],
    indeferida: ['Indeferida', 'selo-ruim'],
    pendente: ['Pendente', 'selo-atencao'],
  };

  function chamarRemat(corpo) {
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var tempo = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
    return fetch(REMAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
      signal: ctrl ? ctrl.signal : undefined,
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    }).then(function (r) {
      clearTimeout(tempo);
      return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, j: j || {} }; });
    }, function (e) { clearTimeout(tempo); throw e; });
  }
  function erroRede() {
    return navigator.onLine === false
      ? 'Você está sem internet. Conecte-se e tente de novo.'
      : 'Não foi possível falar com o servidor. Verifique sua internet e tente de novo.';
  }

  function fmtDataHora(ts) {
    var d = new Date(ts); if (isNaN(d)) return '';
    return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(d) +
      ' às ' + new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(d);
  }
  function fmtDiaHora(ts) { var m = fmtMomento(ts); return m ? m.dia + ' às ' + m.hora : ''; }

  // ── Período e manuais (sem login) ───────────────────────────────────────
  function lerInfoGuardada() {
    try { var i = JSON.parse(guarda.ler('localStorage', CHAVE_INFO) || 'null'); return i && i.periodo ? i : null; }
    catch (e) { return null; }
  }
  function guardarInfo() { if (estado.info) guarda.gravar('localStorage', CHAVE_INFO, JSON.stringify(estado.info)); }
  function carregarInfo() {
    if (!REMAT_URL) return;
    chamarRemat({ acao: 'info' }).then(function (r) {
      if (r.status !== 200 || !r.j.ok) return;
      estado.info = { periodo: r.j.periodo || {}, manuais: r.j.manuais || [] };
      guardarInfo();
      if (!$('tela-entrar').hidden) desenharInfoEntrada();
      if (!$('tela-painel').hidden) { desenharManuais(); desenharRemat(); }
    }).catch(function () { /* sem internet: fica o que estava guardado */ });
  }
  function atualizarPeriodo(p) {
    if (!p) return;
    estado.info = estado.info || { manuais: [] };
    estado.info.periodo = p;
    guardarInfo();
  }
  function periodoAtual() { return (estado.remat && estado.remat.periodo) || (estado.info && estado.info.periodo) || null; }

  // Fase do período calculada pelo relógio do aparelho (os dados podem ter
  // sido guardados horas antes): 'antes' · 'rematricula' · 'retardatario' · 'fechado'
  function fasePeriodo(p) {
    if (!p || !p.ativo) return null;
    var agora = Date.now(), r = p.rematricula || {}, n = p.retardatarios || {};
    function dentro(x) {
      return x.inicio && new Date(x.inicio).getTime() <= agora && (!x.fim || new Date(x.fim).getTime() >= agora);
    }
    if (dentro(r)) return 'rematricula';
    if (dentro(n)) return 'retardatario';
    if (r.inicio && new Date(r.inicio).getTime() > agora) return 'antes';
    return r.inicio ? 'fechado' : null;
  }
  function textoPeriodo(p, curto) {
    var fase = fasePeriodo(p); if (!fase) return null;
    var rot = p.semestre && p.semestre.rotulo ? ' ' + p.semestre.rotulo : '';
    var r = p.rematricula || {}, n = p.retardatarios || {};
    var nome = curto ? '' : 'Rematrícula' + rot;
    if (fase === 'rematricula') return (curto ? 'Aberta' : nome + ' aberta') + (r.fim ? ' até ' + fmtDiaHora(r.fim) : '') + '.';
    if (fase === 'retardatario') return (curto ? 'Fora do prazo (retardatários): aberta' : 'Rematrícula fora do prazo (retardatários) aberta') + (n.fim ? ' até ' + fmtDiaHora(n.fim) : '') + ', sem reserva de vaga.';
    if (fase === 'antes') return (curto ? 'De ' : nome + ': de ') + fmtDiaHora(r.inicio) + (r.fim ? ' até ' + fmtDiaHora(r.fim) : '') + '.';
    return curto ? 'Período encerrado.' : 'O período de rematrícula' + rot + ' terminou.';
  }
  function periodoAberto(p) { var f = fasePeriodo(p); return f === 'rematricula' || f === 'retardatario'; }

  function desenharInfoEntrada() {
    desenharManuais();
    var p = estado.info && estado.info.periodo, aviso = $('entrar-remat');
    var fase = fasePeriodo(p);
    var txt = fase && fase !== 'fechado' ? textoPeriodo(p) : null;
    aviso.textContent = txt ? txt + (periodoAberto(p) ? ' Entre com seu código e sua data de nascimento para fazer a rematrícula.' : '') : '';
    aviso.hidden = !txt;
  }

  function desenharManuais() {
    var lista = ((estado.info && estado.info.manuais) || []).filter(function (m) { return m && m.nome && linkSeguro(m.url); });
    ['manuais-entrar', 'bloco-manuais'].forEach(function (id) {
      var sec = $(id); if (!sec) return;
      var alvo = sec.querySelector('.manuais-lista'); alvo.textContent = '';
      lista.forEach(function (m) {
        alvo.appendChild(h('a', { class: 'link-botao manual-link', href: linkSeguro(m.url), target: '_blank', rel: 'noopener noreferrer' },
          h('i', { class: 'ic-manual', 'aria-hidden': 'true', text: 'i' }), m.nome));
      });
      sec.hidden = !lista.length;
    });
  }

  // ── Sessão da rematrícula ───────────────────────────────────────────────
  function lerSessaoRemat() {
    try {
      var s = JSON.parse(guarda.ler('sessionStorage', CHAVE_REMAT) || 'null');
      var cod = estado.dados && estado.dados.aluno ? estado.dados.aluno.codigo : null;
      return s && s.token && s.codigo === cod && new Date(s.expira_em).getTime() > Date.now() + 20000 ? s : null;
    } catch (e) { return null; }
  }
  function gravarSessaoRemat(token, expira) {
    guarda.gravar('sessionStorage', CHAVE_REMAT, JSON.stringify({
      token: token, expira_em: expira, codigo: estado.dados && estado.dados.aluno ? estado.dados.aluno.codigo : null }));
  }
  function apagarSessaoRemat() { guarda.apagar(CHAVE_REMAT); }

  function rematEntrar(codigo, nascimento) {
    estado.rematAguardando = true; estado.rematErro = null;
    desenharRemat();
    return chamarRemat({ acao: 'entrar', codigo: codigo, nascimento: nascimento }).then(function (r) {
      estado.rematAguardando = false;
      if (r.status === 200 && r.j.ok) {
        gravarSessaoRemat(r.j.token, r.j.expira_em);
        estado.remat = r.j.situacao || null;
        atualizarPeriodo(estado.remat && estado.remat.periodo);
        desenharRemat();
        return true;
      }
      estado.rematErro = r.j.erro === 'NAO_CONFERE' ? 'A data de nascimento não confere. Confira e tente de novo.'
                       : (r.j.mensagem || 'Não foi possível abrir a rematrícula agora. Tente novamente em alguns minutos.');
      desenharRemat();
      return false;
    }, function () {
      estado.rematAguardando = false; estado.rematErro = erroRede();
      desenharRemat();
      return false;
    });
  }

  // Logo depois da consulta: se a rematrícula estiver valendo, entra também.
  function rematEntrarAposConsulta(codigo, nascimento) {
    var p = estado.info && estado.info.periodo;
    if (!REMAT_URL || !p || !p.ativo) return;
    var fase = fasePeriodo(p);
    if (fase === 'rematricula' || fase === 'retardatario' || fase === 'fechado') rematEntrar(codigo, nascimento);
  }

  function rematAcao(acao, extra) {
    var s = lerSessaoRemat();
    if (!s) { rematSessaoExpirada(); return Promise.resolve(null); }
    var corpo = { acao: acao, token: s.token };
    Object.keys(extra || {}).forEach(function (k) { corpo[k] = extra[k]; });
    return chamarRemat(corpo).then(function (r) {
      if (r.j && r.j.erro === 'SESSAO') { rematSessaoExpirada(r.j.mensagem); return null; }
      if (r.status === 200 && r.j.ok) {
        if (r.j.expira_em) gravarSessaoRemat(s.token, r.j.expira_em);
        if (r.j.situacao) { estado.remat = r.j.situacao; atualizarPeriodo(r.j.situacao.periodo); }
        return r.j;
      }
      throw new Error(r.j.mensagem || 'Não foi possível concluir agora. Tente de novo.');
    }, function () { throw new Error(erroRede()); });
  }
  function rematSessaoExpirada(msg) {
    apagarSessaoRemat();
    estado.remat = null;
    estado.rematErro = msg || 'Por segurança, confirme de novo a sua data de nascimento.';
    fecharTelaRemat();
  }
  function rematSair() {
    var s = lerSessaoRemat();
    if (s) chamarRemat({ acao: 'sair', token: s.token }).catch(function () {});
    apagarSessaoRemat();
    estado.remat = null; estado.rematErro = null;
  }

  // ── Quadro no painel ────────────────────────────────────────────────────
  function desenharRemat() {
    var box = $('bloco-remat'); if (!box) return;
    var p = periodoAtual();
    var fase = fasePeriodo(p);
    if (!estado.dados || !fase) { box.hidden = true; return; }
    var sessao = lerSessaoRemat();
    // Recarregou a página com a sessão ainda valendo: busca a situação de novo.
    if (sessao && !estado.remat && !estado.rematAguardando && !estado.rematAutoTentado) {
      estado.rematAutoTentado = true;
      estado.rematAguardando = true;
      rematAcao('situacao').then(function () { estado.rematAguardando = false; desenharRemat(); },
                                 function (e) { estado.rematAguardando = false; estado.rematErro = e.message; desenharRemat(); });
    }

    box.textContent = '';
    var rot = p.semestre && p.semestre.rotulo ? ' ' + p.semestre.rotulo : '';
    box.appendChild(h('div', { class: 'remat-cab' },
      h('h2', { text: 'Rematrícula' + rot }),
      h('p', { class: 'remat-periodo', text: textoPeriodo(p, true) })));

    if (fase === 'antes') { box.hidden = false; return; }

    if (estado.rematAguardando) {
      box.appendChild(h('p', { class: 'remat-carregando' }, h('span', { class: 'giro giro-escuro', 'aria-hidden': 'true' }), 'Abrindo a sua rematrícula…'));
      box.hidden = false; return;
    }
    if (!sessao || !estado.remat) {
      box.appendChild(formNascimento(periodoAberto(p) ? 'Fazer minha rematrícula' : 'Ver minha rematrícula'));
      box.hidden = false; return;
    }

    var origens = estado.remat.origens || [];
    if (!origens.length) {
      box.appendChild(h('p', { class: 'remat-msg', text: 'Você não tem turma neste semestre com direito a rematrícula. Em caso de dúvida, procure a secretaria.' }));
    }
    origens.forEach(function (o) { box.appendChild(cartaoOrigem(o, p)); });
    if (fase === 'retardatario') {
      box.appendChild(h('p', { class: 'regra', text: 'Fora do prazo, a solicitação entra como retardatário: sem reserva de vaga, disputando as vagas que sobraram junto com a matrícula de novatos.' }));
    }
    box.hidden = false;
  }

  function formNascimento(rotulo) {
    var input = h('input', { id: 'remat-nasc', type: 'text', inputmode: 'numeric', autocomplete: 'bday',
                             placeholder: 'dd/mm/aaaa', maxlength: '10', 'aria-describedby': 'remat-nasc-erro' });
    input.addEventListener('input', function (e) {
      var d = e.target.value.replace(/\D/g, '').slice(0, 8);
      e.target.value = d.length > 4 ? d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4)
                     : d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
      erro.hidden = true;
    });
    var erro = h('p', { class: 'campo-erro', id: 'remat-nasc-erro', role: 'alert', text: estado.rematErro || '' });
    erro.hidden = !estado.rematErro;
    var botao = h('button', { class: 'botao botao-principal', type: 'submit' },
      h('span', { class: 'botao-texto', text: rotulo }), h('span', { class: 'giro', 'aria-hidden': 'true' }));
    var form = h('form', { class: 'remat-form campo', novalidate: true },
      h('label', { for: 'remat-nasc', text: 'Para continuar, confirme a sua data de nascimento' }), input, erro, botao);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!dataValida(v)) { erro.textContent = 'Digite a data completa, no formato dia/mês/ano.'; erro.hidden = false; input.focus(); return; }
      botao.disabled = true; botao.classList.add('carregando');
      rematEntrar(estado.dados.aluno.codigo, v);
    });
    return form;
  }

  function descricaoTurma(t) {
    t = t || {};
    var dias = t.dia_semana ? capital(String(t.dia_semana).replace(/,/g, ', ')) : '';
    var mod = t.modalidade ? (t.modalidade.length <= 3 ? t.modalidade.toUpperCase() : capital(t.modalidade)) : '';
    return [[dias, t.horario].filter(Boolean).join(', '), [mod, t.turno && 'turno ' + String(t.turno).toLowerCase()].filter(Boolean).join(', ')]
      .filter(Boolean).join(' · ');
  }

  function textoSolicitacao(s, p) {
    var res = p && p.resultado && p.resultado.inicio && !p.resultado_publicado ? ' O resultado sai em ' + fmtData(String(new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(p.resultado.inicio)))) + '.' : '';
    var txt;
    switch (s.status) {
      case 'aguardando_conclusao': txt = 'Recebida. Ela é analisada assim que a coordenação fechar o resultado da sua turma.' + res; break;
      case 'deferida': txt = 'Sua vaga na turma ' + ((s.turma && s.turma.codigo) || '') + ' está garantida. Guarde o comprovante.'; break;
      case 'lista_espera': txt = 'A turma lotou. Se abrir vaga, a escola chama pela ordem da lista. A lista de espera não garante vaga.'; break;
      case 'indeferida': txt = s.motivo || 'Procure a secretaria.'; break;
      case 'pendente': txt = s.motivo || 'Em análise. Procure a secretaria.'; break;
      default: txt = 'Recebida em ' + fmtDataHora(s.enviada_em) + '.' + res;
    }
    if (s.tipo === 'retardatario' && s.status !== 'deferida') txt += ' Retardatário: sem reserva de vaga; o resultado sai junto com a matrícula de novatos.';
    return txt;
  }

  function cartaoOrigem(o, p) {
    var tu = o.turma || {}, d = o.destino || {}, s = o.solicitacao;
    var res = d.resultado && RESULTADOS[d.resultado];
    var selo = o.situacao === 'TRANCADA' ? h('span', { class: 'selo selo-neutro', text: 'Trancada' })
             : res && d.resultado !== 'PENDENTE' ? h('span', { class: 'selo ' + res[1], text: res[0] }) : null;
    var art = h('article', { class: 'remat-origem' },
      h('div', { class: 'turma-linha1' }, h('span', { class: 'turma-idioma', text: tu.idioma || '' }), selo),
      h('h3', { class: 'remat-titulo', text: capital(tu.estagio || tu.curso || tu.sigla || '') }),
      h('p', { class: 'turma-cod', text: 'Turma ' + (tu.codigo || '') }));
    if (d.estado === 'liberada' && d.curso) {
      art.appendChild(h('p', { class: 'remat-destino' }, 'Próximo estágio: ', h('strong', { text: d.curso.nome || d.curso.sigla })));
    }
    if (d.mensagem && !(s && s.status === 'deferida')) {
      art.appendChild(h('p', { class: 'remat-msg' + (d.estado !== 'liberada' ? ' remat-msg-forte' : ''), text: d.mensagem }));
    }
    if (s) {
      var st = REMAT_STATUS[s.status] || [s.status, 'selo-neutro'];
      var titulo = s.status === 'lista_espera' && s.posicao_espera ? 'Lista de espera: ' + s.posicao_espera + 'º lugar' : st[0];
      art.appendChild(h('div', { class: 'remat-sol' },
        h('div', { class: 'remat-sol-cab' }, h('span', { class: 'selo ' + st[1], text: titulo }), h('span', { class: 'remat-prot', text: 'Protocolo ' + s.protocolo })),
        h('p', { class: 'remat-sol-turma' }, h('strong', { text: 'Turma ' + ((s.turma && s.turma.codigo) || '') }), ' · ' + descricaoTurma(s.turma)),
        h('p', { class: 'remat-sol-txt', text: textoSolicitacao(s, p) })));
    }
    var acoes = h('div', { class: 'remat-acoes' });
    if (o.pode_escolher) acoes.appendChild(botaoAcao(s ? 'Trocar de turma' : 'Escolher turma', s ? 'botao-contorno' : 'botao-pequeno', function () { abrirEscolha(o); }));
    if (s) acoes.appendChild(botaoAcao('Comprovante', 'botao-contorno', function () { abrirComprovante(o.matricula_id, false); }));
    if (s && periodoAberto(p) && ['deferida', 'indeferida'].indexOf(s.status) === -1) {
      acoes.appendChild(botaoAcao('Cancelar', 'botao-fantasma', function () { cancelarRemat(o); }));
    }
    if (acoes.childNodes.length) art.appendChild(acoes);
    return art;
  }
  function botaoAcao(texto, classe, acao) {
    var b = h('button', { class: 'botao ' + classe, type: 'button', text: texto });
    b.addEventListener('click', acao);
    return b;
  }

  function cancelarRemat(o) {
    if (!window.confirm('Cancelar a sua solicitação de rematrícula? Enquanto o período estiver aberto, você pode enviar de novo (mas perde o lugar na ordem de envio).')) return;
    rematAcao('cancelar', { matricula_id: o.matricula_id }).then(function (j) {
      if (j) { desenharRemat(); toast('Solicitação cancelada.'); setTimeout(function () { $('toast').hidden = true; }, 4000); }
    }, function (e) { window.alert(e.message); });
  }

  // ── Tela 3: escolha da turma e comprovante ──────────────────────────────
  function abrirTelaRemat(titulo) {
    $('tela-painel').hidden = true;
    $('tela-entrar').hidden = true;
    $('tela-remat').hidden = false;
    $('remat-barra-titulo').textContent = titulo;
    var c = $('remat-corpo'); c.textContent = '';
    window.scrollTo(0, 0);
    return c;
  }
  function fecharTelaRemat() {
    if ($('tela-remat').hidden) { desenharRemat(); return; }
    $('tela-remat').hidden = true;
    if (estado.dados) { $('tela-painel').hidden = false; desenharRemat(); $('bloco-remat').scrollIntoView({ block: 'start' }); }
    else mostrarEntrar();
  }
  $('remat-voltar').addEventListener('click', fecharTelaRemat);

  function origemPorId(id) {
    return ((estado.remat && estado.remat.origens) || []).filter(function (o) { return o.matricula_id === id; })[0] || null;
  }

  function abrirEscolha(o) {
    var p = periodoAtual(), d = o.destino || {}, s = o.solicitacao, tu = o.turma || {};
    var rot = p && p.semestre && p.semestre.rotulo ? ' ' + p.semestre.rotulo : '';
    var c = abrirTelaRemat('Rematrícula' + rot);
    c.appendChild(h('h1', { class: 'remat-h1', text: 'Escolha a sua turma' }));
    c.appendChild(h('p', { class: 'remat-sub' }, (tu.idioma ? tu.idioma + ' · ' : '') + 'próximo estágio: ', h('strong', { text: (d.curso && (d.curso.nome || d.curso.sigla)) || '' })));
    if (d.provisorio && d.mensagem) c.appendChild(h('p', { class: 'aviso aviso-info', text: d.mensagem }));
    if (estado.remat.trava_modalidade && !o.modalidade_liberada && tu.modalidade) {
      c.appendChild(h('p', { class: 'aviso aviso-info', text: 'Só aparecem turmas na modalidade ' + (tu.modalidade.length <= 3 ? tu.modalidade.toUpperCase() : tu.modalidade.toLowerCase()) + ', a mesma deste semestre. Mudança de modalidade só no período de transferência.' }));
    }
    if (fasePeriodo(p) === 'retardatario') {
      c.appendChild(h('p', { class: 'aviso aviso-atencao', text: 'Fora do prazo da rematrícula: sua solicitação entra como retardatário, sem reserva de vaga.' }));
    }
    if (s && s.turma) {
      c.appendChild(h('p', { class: 'aviso aviso-atencao', text: 'Você já escolheu a turma ' + s.turma.codigo + '. Se enviar outra, a escolha anterior deixa de valer' +
        (s.status === 'lista_espera' ? ' e você perde o seu lugar na lista de espera' : '') + ' (vale o último envio).' }));
    }

    var ops = o.opcoes || [];
    if (!ops.length) {
      c.appendChild(h('p', { class: 'aviso aviso-info', text: 'Ainda não há turmas deste estágio para o próximo semestre. Procure a secretaria.' }));
      return;
    }
    var turnos = [];
    ops.forEach(function (op) { var tn = op.turno ? capital(op.turno) : 'Outros horários'; if (turnos.indexOf(tn) === -1) turnos.push(tn); });
    var form = h('form', { class: 'remat-escolha', novalidate: true });
    turnos.forEach(function (tn) {
      var grupo = h('fieldset', { class: 'opcoes' }, h('legend', { text: tn }));
      ops.filter(function (op) { return (op.turno ? capital(op.turno) : 'Outros horários') === tn; }).forEach(function (op) {
        var dias = op.dia_semana ? capital(String(op.dia_semana).replace(/,/g, ', ')) : 'Dia a definir';
        var mod = op.modalidade ? (op.modalidade.length <= 3 ? op.modalidade.toUpperCase() : capital(op.modalidade)) : '';
        var radio = h('input', { type: 'radio', name: 'turma', value: op.id, checked: !!(s && s.turma && s.turma.id === op.id) });
        grupo.appendChild(h('label', { class: 'opcao' + (op.lotada ? ' opcao-lotada' : '') }, radio,
          h('span', { class: 'opcao-txt' },
            h('span', { class: 'opcao-dias', text: dias }),
            h('span', { class: 'opcao-hora', text: [op.horario, mod].filter(Boolean).join(' · ') }),
            h('span', { class: 'turma-cod', text: 'Turma ' + op.codigo })),
          h('span', { class: 'selo ' + (op.lotada ? 'selo-atencao' : 'selo-ok'), text: op.lotada ? 'Lotada: lista de espera' : 'Com vagas' })));
      });
      form.appendChild(grupo);
    });
    var nota = h('p', { class: 'remat-nota', 'aria-live': 'polite' });
    var erro = h('p', { class: 'aviso aviso-erro', role: 'alert' }); erro.hidden = true;
    var botao = h('button', { class: 'botao botao-principal', type: 'submit' },
      h('span', { class: 'botao-texto', text: 'Enviar rematrícula' }), h('span', { class: 'giro', 'aria-hidden': 'true' }));
    form.appendChild(nota); form.appendChild(erro); form.appendChild(botao);
    form.appendChild(h('p', { class: 'regra', text: '"Com vagas" e "lotada" mostram a situação de agora. As vagas são distribuídas no cruzamento, depois do fechamento das turmas: primeiro o público prioritário, depois pela ordem de envio. A lista de espera não garante vaga.' }));
    form.addEventListener('change', function () {
      var sel = form.querySelector('input[name="turma"]:checked');
      var op = sel && ops.filter(function (x) { return x.id === sel.value; })[0];
      nota.textContent = op && op.lotada ? 'Esta turma está lotada agora: se continuar assim, você entra na lista de espera dela.' : '';
      erro.hidden = true;
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var sel = form.querySelector('input[name="turma"]:checked');
      if (!sel) { erro.textContent = 'Escolha uma turma.'; erro.hidden = false; return; }
      botao.disabled = true; botao.classList.add('carregando');
      rematAcao('enviar', { matricula_id: o.matricula_id, turma_id: sel.value }).then(function (j) {
        botao.disabled = false; botao.classList.remove('carregando');
        if (j) abrirComprovante(o.matricula_id, true);
      }, function (err) {
        botao.disabled = false; botao.classList.remove('carregando');
        erro.textContent = err.message; erro.hidden = false;
      });
    });
    c.appendChild(form);
    $('remat-corpo').focus({ preventScroll: true });
  }

  function abrirComprovante(matriculaId, novo) {
    var o = origemPorId(matriculaId); if (!o || !o.solicitacao) { fecharTelaRemat(); return; }
    var s = o.solicitacao, p = periodoAtual(), tu = o.turma || {}, al = estado.dados.aluno || {}, es = estado.dados.escola || {};
    var rot = p && p.semestre && p.semestre.rotulo ? p.semestre.rotulo : '';
    var c = abrirTelaRemat('Comprovante');
    if (novo) c.appendChild(h('p', { class: 'aviso aviso-ok remat-nao-imprimir', role: 'status', text: 'Rematrícula enviada! Guarde este comprovante.' }));
    var st = REMAT_STATUS[s.status] || [s.status];
    var situacao = s.status === 'lista_espera' && s.posicao_espera ? 'Lista de espera: ' + s.posicao_espera + 'º lugar' : st[0];
    function linha(rotulo, valor) { return valor ? [h('dt', { text: rotulo }), h('dd', { text: valor })] : null; }
    c.appendChild(h('section', { class: 'comprovante' },
      h('div', { class: 'comprovante-cab' },
        h('img', { src: 'icones/logo.png', alt: 'CELIN — Centro Estadual de Línguas', width: '720', height: '360' }),
        h('div', null,
          h('h1', { text: 'Comprovante de ' + (s.tipo === 'retardatario' ? 'rematrícula fora do prazo' : 'rematrícula') }),
          h('p', { text: (es.nome || 'CELINPB') + (rot ? ' · Semestre ' + rot : '') }))),
      h('p', { class: 'comprovante-prot' }, 'Protocolo ', h('strong', { text: s.protocolo })),
      h('dl', null,
        linha('Aluno(a)', (al.nome_exibicao || '') + ' · código ' + fmtCodigo(al.codigo)),
        linha('Turma deste semestre', (tu.codigo || '') + (tu.estagio ? ' · ' + capital(tu.estagio) : '')),
        linha('Próximo estágio', s.curso ? (s.curso.nome || s.curso.sigla) : ''),
        linha('Turma escolhida', s.turma ? s.turma.codigo : ''),
        linha('Dias e horário', descricaoTurma(s.turma)),
        linha('Enviada em', fmtDataHora(s.enviada_em) + (s.canal === 'secretaria' ? ' (registrada pela secretaria)' : '')),
        linha('Situação', situacao)),
      h('p', { class: 'comprovante-nota', text: textoSolicitacao(s, p) }),
      h('p', { class: 'comprovante-nota', text: 'Vale o último envio: se você trocar de turma ou cancelar, este comprovante deixa de valer. Comprovante gerado pelo próprio aluno no Portal do Aluno em ' + fmtDataHora(new Date().toISOString()) + '.' })));
    var bImp = h('button', { class: 'botao botao-principal', type: 'button', text: 'Imprimir ou salvar em PDF' });
    bImp.addEventListener('click', function () { window.print(); });
    var bVolta = h('button', { class: 'botao botao-contorno', type: 'button', text: 'Voltar ao painel' });
    bVolta.addEventListener('click', fecharTelaRemat);
    c.appendChild(h('div', { class: 'remat-acoes remat-nao-imprimir' }, bImp, bVolta));
    c.appendChild(h('p', { class: 'regra remat-nao-imprimir', text: 'Para salvar em PDF, toque em Imprimir e escolha "Salvar como PDF" como impressora.' }));
    $('remat-corpo').focus({ preventScroll: true });
  }

  // ── Ações do topo ────────────────────────────────────────────────────────
  $('botao-sair').addEventListener('click', function () {
    rematSair();
    guarda.apagar(CHAVE_DADOS);
    guarda.apagar(CHAVE_CODIGO);
    estado.dados = null; window.PORTAL_DADOS = null;
    $('turmas').textContent = '';
    $('campo-codigo').value = '';
    $('campo-nascimento').value = '';
    mostrarEntrar('Você saiu. Seus dados foram apagados deste aparelho.');
  });

  $('botao-atualizar').addEventListener('click', function () {
    mostrarEntrar('Digite sua data de nascimento para buscar as informações mais recentes.');
  });

  function modoApp() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }
  $('botao-boletim').addEventListener('click', function () {
    // No app instalado não há abas: abre na mesma tela (com botão Voltar).
    if (modoApp()) { window.location.href = 'boletim.html'; return; }
    var w = window.open('boletim.html', '_blank');
    if (!w) window.location.href = 'boletim.html';
  });

  // ── Instalação (PWA) ─────────────────────────────────────────────────────
  function ehIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    estado.eventoInstalar = e;
    avisoInstalar();
  });
  window.addEventListener('appinstalled', function () { $('aviso-instalar').hidden = true; estado.eventoInstalar = null; });

  function avisoInstalar() {
    var caixa = $('aviso-instalar');
    if (modoApp() || guarda.ler('localStorage', CHAVE_INSTALAR) || $('tela-painel').hidden) { caixa.hidden = true; return; }
    if (estado.eventoInstalar) {
      $('aviso-instalar-texto').textContent = 'Instale o portal no seu celular para abrir com um toque.';
      $('botao-instalar').hidden = false; caixa.hidden = false;
    } else if (ehIOS()) {
      $('aviso-instalar-texto').textContent = 'Para ter o portal na tela do iPhone: toque em Compartilhar e depois em "Adicionar à Tela de Início".';
      $('botao-instalar').hidden = true; caixa.hidden = false;
    } else caixa.hidden = true;
  }
  $('botao-instalar').addEventListener('click', function () {
    var e = estado.eventoInstalar; if (!e) return;
    e.prompt();
    (e.userChoice || Promise.resolve()).then(function () { estado.eventoInstalar = null; $('aviso-instalar').hidden = true; });
  });
  $('botao-instalar-fechar').addEventListener('click', function () {
    guarda.gravar('localStorage', CHAVE_INSTALAR, '1');
    $('aviso-instalar').hidden = true;
  });

  // ── Atualização do app (service worker) ──────────────────────────────────
  function toast(texto, botaoTexto, acao) {
    var t = $('toast'); t.textContent = '';
    t.appendChild(h('span', { text: texto }));
    if (botaoTexto) {
      var b = h('button', { class: 'botao', type: 'button', text: botaoTexto });
      b.addEventListener('click', acao); t.appendChild(b);
    }
    t.hidden = false;
  }

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    {
      // Só recarrega quando o aluno pediu a versão nova. Na primeira visita o
      // service worker também assume a página (controllerchange), e recarregar
      // ali apagaria o que estava sendo digitado.
      var pediuAtualizacao = false, recarregando = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (!pediuAtualizacao || recarregando) return;
        recarregando = true; window.location.reload();
      });
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        function oferecer(sw) {
          toast('Há uma nova versão do portal.', 'Atualizar', function () {
            pediuAtualizacao = true; sw.postMessage({ tipo: 'ATUALIZAR' });
          });
        }
        if (reg.waiting && navigator.serviceWorker.controller) oferecer(reg.waiting);
        reg.addEventListener('updatefound', function () {
          var novo = reg.installing; if (!novo) return;
          novo.addEventListener('statechange', function () {
            if (novo.state === 'installed' && navigator.serviceWorker.controller) oferecer(novo);
          });
        });
      }).catch(function () { /* sem PWA: o portal funciona normalmente */ });
    }
  }

  // ── Início ───────────────────────────────────────────────────────────────
  estado.info = lerInfoGuardada();
  var salvos = lerDadosSalvos();
  if (salvos) { estado.dados = salvos; mostrarPainel(salvos); }
  else mostrarEntrar();
  carregarInfo();
})();
