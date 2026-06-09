// ============================================================
// pages/documentos.js — Documentos e Declarações
// Portal do Aluno — CELINPB
// ============================================================

Pages.documentos = {

  render() {
    const gestao = Auth.temPapel('admin', 'coordenacao', 'secretaria');
    return `
      <div class="page-section" id="docs-page">

        ${gestao ? _renderBuscaAluno() : _renderListaDocs(null)}

      </div>`;
  },

  init() {
    Layout.configurar({
      logado   : true,
      titulo   : 'Documentos',
      rotaAtiva: 'documentos'
    });

    const gestao = Auth.temPapel('admin', 'coordenacao', 'secretaria');

    if (gestao) {
      _initBuscaAluno();
    } else {
      _initBotoesDocs(null); // aluno gera para si mesmo
    }
  }
};


// ============================================================
// VISÃO DO ALUNO — lista de documentos simples
// ============================================================

function _renderListaDocs(alunoSelecionado) {
  const info = alunoSelecionado
    ? `<div class="doc-aluno-selecionado">
        <i class="fa-solid fa-user-check"></i>
        <span>Gerando para: <strong>${alunoSelecionado.nome}</strong>
          <span class="mono" style="font-size:var(--text-xs)">(${alunoSelecionado.alunoId})</span>
        </span>
        <button class="btn btn-sm btn-ghost" id="btn-trocar-aluno">Trocar</button>
       </div>`
    : `<div class="card" style="margin-bottom:var(--space-3)">
        <p style="font-size:var(--text-sm);color:var(--text-secondary);line-height:var(--leading-loose)">
          Selecione o documento desejado. Ele será gerado automaticamente e aberto
          em uma nova janela, pronto para impressão.
        </p>
       </div>`;

  return `
    ${info}
    <div class="home-section-label">Documentos disponíveis</div>
    <div class="docs-lista" id="docs-lista">
      ${_docItemHTML('declaracao_matricula', 'fa-solid fa-file-lines',
          'Declaração de Matrícula', 'Comprova sua matrícula ativa no semestre atual', 0)}
      ${_docItemHTML('atestado_frequencia', 'fa-solid fa-calendar-check',
          'Atestado de Frequência', 'Informa seu percentual de presença até hoje', 1)}
      ${_docItemHTML('historico_semestral', 'fa-solid fa-graduation-cap',
          'Histórico Escolar', 'Resultado parcial ou final do semestre atual', 2)}
    </div>
    <div class="card" style="margin-top:var(--space-5)">
      <div style="display:flex;align-items:center;gap:var(--space-3)">
        <i class="fa-solid fa-shield-halved" style="color:var(--red-light);font-size:1.2rem;flex-shrink:0"></i>
        <div>
          <div style="font-size:var(--text-sm);font-weight:var(--weight-semibold);color:var(--text-primary)">
            Verificação de autenticidade
          </div>
          <div style="font-size:var(--text-sm);color:var(--text-muted);margin-top:2px">
            Cada documento possui um código único. Qualquer pessoa pode verificar
            sua autenticidade em
            <a href="verify.html" target="_blank">verify.html</a>.
          </div>
        </div>
      </div>
    </div>`;
}

function _docItemHTML(tipo, icone, nome, desc, idx) {
  return `
    <div class="doc-item animate-fade-in" style="animation-delay:${idx * 0.06}s">
      <div class="doc-item-icon"><i class="${icone}"></i></div>
      <div class="doc-item-info">
        <div class="doc-item-nome">${nome}</div>
        <div class="doc-item-desc">${desc}</div>
      </div>
      <button class="btn btn-primary btn-sm btn-gerar-doc"
        data-tipo="${tipo}" aria-label="Gerar ${nome}">
        <i class="fa-solid fa-download"></i> Gerar
      </button>
    </div>`;
}

function _initBotoesDocs(alunoSelecionado) {
  document.querySelectorAll('.btn-gerar-doc').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tipo       = btn.dataset.tipo;
      const alunoIdAlvo= alunoSelecionado?.alunoId || '';
      Components.btnLoading(btn, 'Gerando...');
      try {
        const res = await API.gerarDocumento(tipo, alunoIdAlvo);
        if (!res.success) {
          Components.toast(res.error || 'Erro ao gerar documento.', 'error');
          return;
        }
        _abrirDocumento(res.data.html);
        Components.toast(`Documento gerado! Código: ${res.data.codigo}`, 'success', 5000);
      } catch (_) {
        Components.toast('Erro de conexão. Tente novamente.', 'error');
      } finally {
        Components.btnPronto(btn);
      }
    });
  });

  // Botão "Trocar aluno" (gestão)
  document.getElementById('btn-trocar-aluno')?.addEventListener('click', () => {
    const el = document.getElementById('docs-page');
    if (el) {
      el.innerHTML = _renderBuscaAluno();
      _initBuscaAluno();
    }
  });
}


// ============================================================
// VISÃO DA GESTÃO — busca de aluno
// ============================================================

function _renderBuscaAluno() {
  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Selecionar aluno</span>
      </div>
      <div class="form-group">
        <label class="form-label" for="doc-busca">Nome ou matrícula</label>
        <div class="input-wrapper">
          <i class="input-icon fa-solid fa-magnifying-glass"></i>
          <input class="form-input" type="text" id="doc-busca"
            placeholder="Ex: Maria ou A261.0001"
            autocomplete="off" autocapitalize="off" />
        </div>
      </div>
      <div id="doc-busca-resultados" style="margin-top:var(--space-3)"></div>
    </div>`;
}

function _initBuscaAluno() {
  const input    = document.getElementById('doc-busca');
  const resultEl = document.getElementById('doc-busca-resultados');
  if (!input || !resultEl) return;

  let _timer = null;

  input.addEventListener('input', () => {
    clearTimeout(_timer);
    const q = input.value.trim();
    if (q.length < 2) { resultEl.innerHTML = ''; return; }

    _timer = setTimeout(async () => {
      resultEl.innerHTML = '<div class="spinner-center" style="padding:var(--space-4)"><div class="spinner"></div></div>';
      try {
        const res = await API.buscarAlunos(q);
        if (!res.success || !res.data?.length) {
          resultEl.innerHTML = `<p style="font-size:var(--text-sm);color:var(--text-muted);padding:var(--space-2) 0">
            Nenhum aluno encontrado.</p>`;
          return;
        }
        resultEl.innerHTML = `<div class="doc-busca-lista">${
          res.data.map(a => `
            <div class="doc-busca-item" data-id="${a.alunoId}" data-nome="${a.nome}" role="button" tabindex="0">
              <span class="doc-busca-nome">${a.nome}</span>
              <span class="doc-busca-id mono">${a.alunoId}</span>
            </div>`).join('')
        }</div>`;

        resultEl.querySelectorAll('.doc-busca-item').forEach(item => {
          const selecionar = () => {
            const aluno = { alunoId: item.dataset.id, nome: item.dataset.nome };
            const el = document.getElementById('docs-page');
            if (el) {
              el.innerHTML = _renderListaDocs(aluno);
              _initBotoesDocs(aluno);
            }
          };
          item.addEventListener('click', selecionar);
          item.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selecionar(); }
          });
        });

      } catch (_) {
        resultEl.innerHTML = `<p style="font-size:var(--text-sm);color:var(--danger)">Erro de conexão.</p>`;
      }
    }, 350);
  });

  input.focus();
}


// ============================================================
// ABRIR DOCUMENTO EM NOVA JANELA
// ============================================================

function _abrirDocumento(html) {
  const janela = window.open('', '_blank');
  if (!janela) {
    Components.toast('Pop-up bloqueado. Permita pop-ups para este site.', 'warning', 5000);
    return;
  }
  janela.document.write(html);
  janela.document.close();
  janela.onload = () => janela.print();
}
