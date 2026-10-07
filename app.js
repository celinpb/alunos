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
  var TZ = 'America/Fortaleza';

  var $ = function (id) { return document.getElementById(id); };
  var estado = { dados: null, eventoInstalar: null };

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
      return d && d.aluno && Array.isArray(d.turmas) ? d : null;
    } catch (e) { return null; }
  }
  function dadosNoAparelho() { return !!guarda.ler('localStorage', CHAVE_DADOS); }

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
    $('tela-entrar').hidden = false;
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
          salvarDados(j.dados, manter);
          estado.dados = j.dados;
          mostrarPainel(j.dados);
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
    avisoInstalar();
    $('conteudo').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  // ── Cartão de turma completo ─────────────────────────────────────────────
  function emAndamento(t) {
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

  var RESULTADOS = {
    APROVADO: ['Aprovado(a)', 'selo-ok'],
    REPROVADO: ['Reprovado(a)', 'selo-ruim'],
    RETIDO: ['Retido(a) por falta', 'selo-ruim'],
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
              : a.situacao === 'REPROVADO' ? ['Abaixo da média', 'selo-ruim', 'ruim']
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

  // ── Ações do topo ────────────────────────────────────────────────────────
  $('botao-sair').addEventListener('click', function () {
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
  var salvos = lerDadosSalvos();
  if (salvos) { estado.dados = salvos; mostrarPainel(salvos); }
  else mostrarEntrar();
})();
