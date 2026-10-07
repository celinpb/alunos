/* =============================================================================
   Portal do Aluno — CELINPB · boletim.js
   Monta o boletim a partir dos dados já consultados (nenhuma chamada nova ao
   servidor). Procura os dados: na sessão desta aba → no aparelho → na aba
   do portal que abriu esta.
   ============================================================================= */
(function () {
  'use strict';
  var TZ = 'America/Fortaleza';
  var folha = document.getElementById('folha');

  function ler(area) { try { return window[area].getItem('portal.dados'); } catch (e) { return null; } }
  function obterDados() {
    var bruto = ler('sessionStorage') || ler('localStorage');
    if (bruto) { try { return JSON.parse(bruto); } catch (e) { /* segue */ } }
    try { if (window.opener && window.opener.PORTAL_DADOS) return window.opener.PORTAL_DADOS; } catch (e) { /* outra origem */ }
    return null;
  }

  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k]; if (v === null || v === undefined) return;
      if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v; else el.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var f = arguments[i];
      if (f === null || f === undefined) continue;
      (Array.isArray(f) ? f : [f]).forEach(function (x) {
        if (x !== null && x !== undefined) el.appendChild(typeof x === 'string' ? document.createTextNode(x) : x);
      });
    }
    return el;
  }
  var fmtNum = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
  function nota(v) { return v === null || v === undefined ? '—' : fmtNum.format(Number(v)); }
  function capital(s) { s = String(s || '').toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); }
  function fmtCodigo(c) { c = String(c || ''); return c.length === 9 ? c.slice(0, 3) + ' ' + c.slice(3, 7) + ' ' + c.slice(7) : c; }
  function momento(ts) {
    var d = new Date(ts); if (isNaN(d)) return '';
    return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(d) +
      ' às ' + new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(d);
  }

  var RES = {
    APROVADO: ['Aprovado(a)', 'res-ok'], REPROVADO: ['Reprovado(a)', 'res-ruim'],
    RETIDO: ['Retido(a) por falta', 'res-ruim'], PENDENTE: ['Notas pendentes', ''],
  };

  function voltar() {
    if (window.opener) { window.close(); return; }
    if (history.length > 1) history.back(); else location.href = './';
  }
  document.getElementById('b-voltar').addEventListener('click', voltar);
  document.getElementById('b-imprimir').addEventListener('click', function () { window.print(); });

  var d = obterDados();
  if (!d || !d.aluno || !Array.isArray(d.turmas)) {
    document.getElementById('b-imprimir').hidden = true;
    document.getElementById('b-dica').hidden = true;
    var b = h('button', { class: 'b-botao', type: 'button', text: 'Ir para o portal' });
    b.addEventListener('click', function () { location.href = './'; });
    folha.appendChild(h('div', { class: 'vazio' },
      h('p', { text: 'Para ver o boletim, faça a consulta no portal primeiro.' }), b));
    return;
  }

  var esc = d.escola || {};
  document.title = 'Boletim ' + (d.semestre && d.semestre.rotulo ? d.semestre.rotulo + ' ' : '') + '— ' + (d.aluno.nome_exibicao || '');

  folha.appendChild(h('header', { class: 'cab' },
    h('img', { src: 'icones/logo.png', alt: 'CELIN — Centro Estadual de Línguas' }),
    h('div', { class: 'cab-txt' },
      h('h1', { text: 'Boletim escolar' }),
      h('p', { text: esc.nome || 'CELINPB' }),
      d.semestre && d.semestre.rotulo ? h('p', { text: 'Semestre ' + d.semestre.rotulo }) : null)));

  folha.appendChild(h('div', { class: 'aluno' },
    h('b', { text: d.aluno.nome_exibicao || '' }),
    h('span', { text: 'Código ' + fmtCodigo(d.aluno.codigo) })));

  var detalhadas = d.turmas.filter(function (t) { return t.detalhada; });
  if (!detalhadas.length) folha.appendChild(h('p', { class: 'vazio', text: 'Nenhuma turma com notas ou frequência neste semestre.' }));

  detalhadas.forEach(function (t) {
    var tu = t.turma || {}, f = t.frequencia || {};
    var andamento = (t.aulas || []).some(function (a) { return a.estado === 'PREVISTA'; });
    var r = andamento ? ['Em andamento', ''] : (RES[t.resultado] || null);

    var info = [tu.codigo ? 'Turma ' + tu.codigo : null,
      [tu.dia_semana && capital(tu.dia_semana.replace(/,/g, ', ')), tu.horario].filter(Boolean).join(', ') || null,
      t.professor && t.professor.nome ? 'Prof. ' + t.professor.nome : null].filter(Boolean).join(' — ');

    var bloco = h('section', { class: 'bt' },
      h('div', { class: 'bt-cab' },
        h('h2', { text: (tu.idioma ? tu.idioma + ': ' : '') + capital(tu.estagio || tu.curso || '') }),
        r ? h('span', { class: 'res ' + r[1], text: r[0] }) : null,
        info ? h('p', { text: info }) : null));

    var avs = t.avaliacoes || [];
    if (avs.length) {
      var maxNotas = Math.max.apply(null, avs.map(function (a) { return (a.notas || []).length; }));
      var cab = [h('th', { text: 'Componente' })];
      for (var i = 1; i <= maxNotas; i++) cab.push(h('th', { text: 'Nota ' + i }));
      cab.push(h('th', { text: 'Média' }), h('th', { text: 'Situação' }));
      var linhas = avs.map(function (a) {
        var tds = [h('td', { text: a.componente })];
        for (var k = 0; k < maxNotas; k++) tds.push(h('td', { text: a.notas && a.notas[k] ? nota(a.notas[k].valor) : '' }));
        var cls = a.situacao === 'APROVADO' ? 'ok' : a.situacao === 'REPROVADO' ? 'ruim' : '';
        tds.push(h('td', { class: 'media ' + cls, text: nota(a.media) }));
        tds.push(h('td', { class: cls, text: a.situacao === 'APROVADO' ? 'Média atingida' : a.situacao === 'REPROVADO' ? 'Abaixo da média' : 'Aguardando' }));
        return h('tr', null, tds);
      });
      bloco.appendChild(h('div', { class: 'tabela-rolagem' },
        h('table', null, h('thead', null, h('tr', null, cab)), h('tbody', null, linhas))));
    }

    var pct = f.percentual;
    bloco.appendChild(h('div', { class: 'freq' },
      h('span', null, 'Frequência: ', h('b', { class: pct !== undefined && pct < 75 ? 'ruim' : null, text: pct === undefined || pct === null ? '—' : pct + '%' }), ' (mínimo 75%)'),
      h('span', { text: 'Presenças: ' + (f.presencas || 0) }),
      h('span', { text: 'Faltas: ' + (f.faltas || 0) }),
      h('span', { text: 'Justificadas: ' + (f.justificadas || 0) }),
      h('span', { text: 'Aulas registradas: ' + (f.aulas_registradas || 0) + (f.aulas_previstas ? ' de ' + f.aulas_previstas : '') })));

    if (t.comentarios && t.comentarios.length) {
      bloco.appendChild(h('div', { class: 'coms' }, t.comentarios.map(function (c) {
        return h('p', null, h('span', { text: 'Comentário do professor, etapa ' + c.etapa }), c.texto);
      })));
    }
    folha.appendChild(bloco);
  });

  folha.appendChild(h('footer', { class: 'rodape' },
    h('span', { text: 'Informações de ' + momento(d.gerado_em) + '. Faltas justificadas contam como presença no cálculo da frequência.' }),
    h('span', { text: 'Documento informativo, gerado pelo próprio aluno no Portal do Aluno. Não substitui declaração emitida pela secretaria.' })));
})();
