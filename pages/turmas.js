// ============================================================
// pages/turmas.js — Turmas Atuais
// Portal do Aluno — CELINPB
// ============================================================

Pages.turmas = {

  render() {
    return `
      <div class="page-section" id="turmas-page">
        <div id="turmas-lista">
          <div class="spinner-center"><div class="spinner spinner-lg"></div></div>
        </div>
      </div>`;
  },

  async init() {
    Layout.configurar({
      logado   : true,
      titulo   : 'Turmas Atuais',
      rotaAtiva: 'turmas'
    });

    const el = document.getElementById('turmas-lista');
    if (!el) return;

    try {
      const res = await API.getTurmasAluno();

      if (!res.success) {
        Components.vazio(el, 'Erro ao carregar turmas', res.error || '');
        return;
      }

      const turmas = res.data || [];

      if (turmas.length === 0) {
        Components.vazio(el, 'Nenhuma turma ativa',
          'Você não está matriculado em nenhuma turma no semestre atual.',
          'fa-solid fa-book-open');
        return;
      }

      el.innerHTML = turmas.map((t, i) => _turmaCardHTML(t, i)).join('');

      // Expande/colapsa seções
      el.querySelectorAll('.turma-secao-header').forEach(header => {
        header.addEventListener('click', () => {
          const secao = header.closest('.turma-secao');
          secao.classList.toggle('aberta');
        });
      });

      // Formulário de mensagem (professor/admin/coord)
      const podeMensagem = Auth.temPapel('admin', 'coordenacao', 'professor');
      if (podeMensagem) {
        el.querySelectorAll('.btn-nova-msg').forEach(btn => {
          btn.addEventListener('click', () => {
            const turmaId = btn.dataset.turmaId;
            _abrirFormMensagem(turmaId, null, async () => {
              // Recarrega a página de turmas
              Pages.turmas.init();
            });
          });
        });

        el.querySelectorAll('.btn-excluir-msg').forEach(btn => {
          btn.addEventListener('click', () => {
            Components.modal({
              titulo   : 'Excluir mensagem',
              corpo    : 'Deseja excluir esta mensagem?',
              confirmar: 'Excluir',
              cancelar : 'Cancelar',
              tipo     : 'danger',
              onConfirm: async () => {
                const res = await API.excluirMensagemTurma(btn.dataset.id);
                if (res.success) {
                  Components.toast('Mensagem excluída.', 'success');
                  Pages.turmas.init();
                } else {
                  Components.toast(res.error || 'Erro ao excluir.', 'error');
                }
              }
            });
          });
        });
      }

    } catch (_) {
      Components.vazio(el, 'Erro de conexão', 'Tente recarregar a página.',
        'fa-solid fa-triangle-exclamation');
    }
  }
};


// ============================================================
// HTML DO CARD DE TURMA
// ============================================================

function _turmaCardHTML(t, idx) {
  const turma      = t.turma;
  const freq       = t.frequencia;
  const notas      = t.notas;
  const podeMensagem = Auth.temPapel('admin', 'coordenacao', 'professor');

  // Delay de animação escalonado
  const delay = `animation-delay:${idx * 0.08}s`;

  return `
    <div class="turma-card animate-fade-in" style="${delay}">

      <!-- Cabeçalho da turma -->
      <div class="turma-header">
        <div class="turma-header-left">
          <div class="turma-idioma-badge">${_inicialIdioma(turma.idioma)}</div>
          <div>
            <div class="turma-nome">${turma.idioma} — ${turma.estagio || turma.nomeCurso}</div>
            <div class="turma-sub">${turma.diaSemana} · ${turma.horario} · ${turma.modalidade}</div>
          </div>
        </div>
        ${_badgeSituacao(notas.situacaoGeral)}
      </div>

      <!-- Links rápidos -->
      ${_linksHTML(turma)}

      <!-- Frequência (resumo sempre visível) -->
      ${_freqResumoHTML(freq)}

      <!-- Seções expansíveis -->
      ${_secaoHTML('notas',      'fa-solid fa-chart-line',       'Notas',                _notasHTML(notas))}
      ${_secaoHTML('frequencia', 'fa-solid fa-calendar-check',   'Frequência detalhada', _freqDetalheHTML(freq, t.matriculaId))}
      ${_secaoHTML('conteudo',   'fa-solid fa-book',             'Conteúdo ministrado',  _conteudoHTML(t.conteudo))}
      ${_secaoHTML('comentarios','fa-solid fa-comment-dots',     'Comentários pedagógicos', _comentariosHTML(t.comentarios))}
      ${_secaoHTML('mensagens',  'fa-solid fa-message',          'Mensagens do professor',
        _mensagensHTML(t.mensagens, turma.turmaId, podeMensagem))}

    </div>`;
}


// ── Cabeçalho e links ─────────────────────────────────────────

function _inicialIdioma(idioma) {
  const map = {
    'English' : 'EN', 'Español': 'ES', 'Français': 'FR',
    'Deutsch' : 'DE', 'Português': 'PT'
  };
  return map[idioma] || (idioma || '?').slice(0, 2).toUpperCase();
}

function _badgeSituacao(sit) {
  const cfg = {
    aprovado  : { label: 'Aprovado',   tipo: 'success' },
    reprovado : { label: 'Reprovado',  tipo: 'danger'  },
    aguardando: { label: 'Em curso',   tipo: 'neutral' }
  };
  const c = cfg[sit] || cfg.aguardando;
  return Components.badgeHTML(c.label, c.tipo);
}

function _linksHTML(turma) {
  const links = [];
  if (turma.grupoWhats) links.push(`<a class="turma-link" href="${turma.grupoWhats}" target="_blank" rel="noopener">
    <i class="fa-brands fa-whatsapp"></i> WhatsApp</a>`);
  if (turma.linkMeet) links.push(`<a class="turma-link" href="${turma.linkMeet}" target="_blank" rel="noopener">
    <i class="fa-solid fa-video"></i> Meet</a>`);
  if (turma.linkClass) links.push(`<a class="turma-link" href="${turma.linkClass}" target="_blank" rel="noopener">
    <i class="fa-solid fa-graduation-cap"></i> Classroom</a>`);
  if (links.length === 0) return '';
  return `<div class="turma-links">${links.join('')}</div>`;
}


// ── Frequência resumo (barra de progresso) ────────────────────

function _freqResumoHTML(freq) {
  if (freq.percentual === null) {
    return `<div class="freq-resumo">
      <span class="freq-label">Frequência</span>
      <span class="freq-valor text-muted">Nenhuma aula registrada</span>
    </div>`;
  }

  const cor = freq.emRisco ? 'var(--danger)'
    : freq.percentual >= 85 ? 'var(--success)'
    : 'var(--warning)';

  return `
    <div class="freq-resumo">
      <div class="freq-resumo-topo">
        <span class="freq-label">Frequência</span>
        <span class="freq-valor" style="color:${cor}">${freq.percentual}%</span>
      </div>
      <div class="freq-barra">
        <div class="freq-barra-fill" style="width:${freq.percentual}%;background:${cor}"></div>
        <div class="freq-barra-limite"></div>
      </div>
      ${freq.emRisco ? `
      <div class="freq-alerta">
        <i class="fa-solid fa-triangle-exclamation"></i>
        Risco de reprovação por falta! Você ultrapassou o limite de ${freq.faltasPermitidas} falta(s).
      </div>` : ''}
    </div>`;
}


// ── Seção expansível ──────────────────────────────────────────

function _secaoHTML(id, icone, titulo, conteudo) {
  return `
    <div class="turma-secao" id="secao-${id}">
      <div class="turma-secao-header" role="button" tabindex="0" aria-expanded="false">
        <span class="turma-secao-titulo">
          <i class="${icone}"></i> ${titulo}
        </span>
        <i class="fa-solid fa-chevron-down turma-secao-chevron"></i>
      </div>
      <div class="turma-secao-corpo">
        ${conteudo}
      </div>
    </div>`;
}


// ── Notas ─────────────────────────────────────────────────────

function _notasHTML(notas) {
  const comps = notas.componentes;
  if (Object.keys(comps).length === 0) {
    return `<p class="text-muted" style="font-size:var(--text-sm)">Nenhuma nota lançada ainda.</p>`;
  }

  return Object.keys(comps).map(comp => {
    const c    = comps[comp];
    const subs = c.subcomponentes;
    const cor  = c.situacao === 'aprovado' ? 'var(--success)'
               : c.situacao === 'reprovado'? 'var(--danger)'
               : 'var(--text-muted)';

    return `
      <div class="nota-componente">
        <div class="nota-comp-header">
          <span class="nota-comp-nome">${comp}</span>
          <span class="nota-comp-media" style="color:${cor}">
            ${c.media !== null ? c.media : '—'}
            ${c.situacao !== 'aguardando' ? Components.badgeHTML(
                c.situacao === 'aprovado' ? 'Aprovado' : 'Reprovado',
                c.situacao === 'aprovado' ? 'success'  : 'danger'
              ) : ''}
          </span>
        </div>
        <div class="nota-subcomps">
          ${Object.keys(subs).map(sub => `
            <div class="nota-subcomp">
              <span class="nota-sub-nome">${sub}</span>
              <span class="nota-sub-valor">${subs[sub]}</span>
            </div>`).join('')}
        </div>
      </div>`;
  }).join('');
}


// ── Frequência detalhada ──────────────────────────────────────

function _freqDetalheHTML(freq) {
  return `
    <div class="info-list">
      <div class="info-item">
        <span class="info-label">Aulas registradas</span>
        <span class="info-value">${freq.totalAulas}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Presenças</span>
        <span class="info-value text-success">${freq.presencas}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Faltas</span>
        <span class="info-value ${freq.faltas > 0 ? 'text-danger' : ''}">${freq.faltas}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Justificadas</span>
        <span class="info-value text-warning">${freq.justificadas}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Faltas permitidas</span>
        <span class="info-value">${freq.faltasPermitidas}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Aulas restantes</span>
        <span class="info-value">${freq.aulasRestantes}</span>
      </div>
    </div>`;
}


// ── Conteúdo ministrado ───────────────────────────────────────

function _conteudoHTML(conteudo) {
  if (!conteudo || conteudo.length === 0) {
    return `<p class="text-muted" style="font-size:var(--text-sm)">Nenhum conteúdo registrado ainda.</p>`;
  }
  return `
    <div class="conteudo-lista">
      ${conteudo.map(c => `
        <div class="conteudo-item">
          <span class="conteudo-data">${c.data}</span>
          <span class="conteudo-texto">${c.conteudo}</span>
        </div>`).join('')}
    </div>`;
}


// ── Comentários pedagógicos ───────────────────────────────────

function _comentariosHTML(comentarios) {
  if (!comentarios || comentarios.length === 0) {
    return `<p class="text-muted" style="font-size:var(--text-sm)">Nenhum comentário registrado ainda.</p>`;
  }
  return comentarios.map(c => `
    <div class="comentario-item">
      <div class="comentario-meta">
        ${c.etapa ? `<span class="badge badge-info">${c.etapa}</span>` : ''}
        <span class="comentario-data">${c.data}</span>
      </div>
      <p class="comentario-texto">${c.comentario}</p>
    </div>`).join('');
}


// ── Mensagens do professor ────────────────────────────────────

function _mensagensHTML(mensagens, turmaId, podeMensagem) {
  const btnNova = podeMensagem ? `
    <div style="margin-bottom:var(--space-3)">
      <button class="btn btn-sm btn-secondary btn-nova-msg" data-turma-id="${turmaId}">
        <i class="fa-solid fa-plus"></i> Nova mensagem
      </button>
    </div>` : '';

  if (!mensagens || mensagens.length === 0) {
    return btnNova + `<p class="text-muted" style="font-size:var(--text-sm)">Nenhuma mensagem ainda.</p>`;
  }

  return btnNova + mensagens.map(m => `
    <div class="mensagem-item">
      <div class="mensagem-meta">
        ${Components.badgeHTML(m.tipo === 'turma' ? 'Para todos' : 'Para você',
            m.tipo === 'turma' ? 'info' : 'accent')}
        <span class="mensagem-autor">${m.autorId}</span>
        <span class="mensagem-data">${m.data}</span>
        ${podeMensagem ? `
        <button class="btn btn-sm btn-ghost btn-excluir-msg" data-id="${m.mensagemId}"
          style="color:var(--danger);margin-left:auto">
          <i class="fa-solid fa-trash"></i>
        </button>` : ''}
      </div>
      <p class="mensagem-texto">${m.mensagem}</p>
    </div>`).join('');
}


// ============================================================
// FORMULÁRIO DE MENSAGEM
// ============================================================

function _abrirFormMensagem(turmaId, alunoId, onSalvo) {
  document.getElementById('modal-overlay')?.classList.remove('hidden');
  document.getElementById('modal-content').innerHTML = `
    <h3 class="modal-title">Nova mensagem</h3>
    <div style="display:flex;flex-direction:column;gap:var(--space-4);margin-bottom:var(--space-5)">

      <div class="form-group">
        <label class="form-label" for="fmsg-tipo">Destinatário</label>
        <select class="form-input" id="fmsg-tipo">
          <option value="turma">Todos da turma</option>
          <option value="individual" ${alunoId ? 'selected' : ''}>Aluno específico</option>
        </select>
      </div>

      <div class="form-group" id="fmsg-aluno-grupo" ${!alunoId ? 'style="display:none"' : ''}>
        <label class="form-label" for="fmsg-alunoid">Matrícula do aluno</label>
        <input class="form-input form-input-mono" type="text" id="fmsg-alunoid"
          placeholder="Ex: A261.0001" value="${alunoId || ''}" />
      </div>

      <div class="form-group">
        <label class="form-label" for="fmsg-texto">Mensagem</label>
        <textarea class="form-input" id="fmsg-texto" rows="4"
          placeholder="Escreva sua mensagem..." style="resize:vertical"></textarea>
      </div>

      <span id="fmsg-erro" class="form-error hidden">
        <i class="fa-solid fa-circle-xmark"></i>
        <span id="fmsg-erro-msg"></span>
      </span>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="fmsg-cancelar">Cancelar</button>
      <button class="btn btn-primary"   id="fmsg-salvar">
        <i class="fa-solid fa-paper-plane"></i> Enviar
      </button>
    </div>`;

  // Mostrar/ocultar campo de AlunoID
  document.getElementById('fmsg-tipo')?.addEventListener('change', e => {
    const grupo = document.getElementById('fmsg-aluno-grupo');
    if (grupo) grupo.style.display = e.target.value === 'individual' ? '' : 'none';
  });

  document.getElementById('fmsg-cancelar')?.addEventListener('click', Components.fecharModal);

  document.getElementById('fmsg-salvar')?.addEventListener('click', async () => {
    const btn      = document.getElementById('fmsg-salvar');
    const tipo     = document.getElementById('fmsg-tipo').value;
    const alunoVal = document.getElementById('fmsg-alunoid')?.value.trim() || '';
    const texto    = document.getElementById('fmsg-texto').value.trim();
    const erroBox  = document.getElementById('fmsg-erro');
    const erroMsg  = document.getElementById('fmsg-erro-msg');

    erroBox.classList.add('hidden');
    if (!texto) {
      erroMsg.textContent = 'Escreva uma mensagem.';
      erroBox.classList.remove('hidden');
      return;
    }
    if (tipo === 'individual' && !alunoVal) {
      erroMsg.textContent = 'Informe a matrícula do aluno.';
      erroBox.classList.remove('hidden');
      return;
    }

    Components.btnLoading(btn, 'Enviando...');
    try {
      const res = await API.salvarMensagemTurma({
        turmaId,
        alunoId  : tipo === 'individual' ? alunoVal : '',
        tipo,
        mensagem : texto
      });
      if (res.success) {
        Components.fecharModal();
        Components.toast('Mensagem enviada!', 'success');
        onSalvo?.();
      } else {
        erroMsg.textContent = res.error || 'Erro ao enviar.';
        erroBox.classList.remove('hidden');
      }
    } catch (_) {
      erroMsg.textContent = 'Erro de conexão.';
      erroBox.classList.remove('hidden');
    } finally {
      Components.btnPronto(btn);
    }
  });
}
