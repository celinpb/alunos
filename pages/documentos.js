// ============================================================
// pages/documentos.js — Documentos e Declarações
// Portal do Aluno — CELINPB
// ============================================================

Pages.documentos = {

  render() {
    return `
      <div class="page-section" id="docs-page">

        <div class="card" style="margin-bottom:var(--space-3)">
          <p style="font-size:var(--text-sm);color:var(--text-secondary);line-height:var(--leading-loose)">
            Selecione o documento desejado. Ele será gerado automaticamente e aberto
            em uma nova janela, pronto para impressão.
          </p>
        </div>

        <div class="home-section-label">Documentos disponíveis</div>

        <div class="docs-lista">

          <div class="doc-item animate-fade-in" style="animation-delay:0s">
            <div class="doc-item-icon"><i class="fa-solid fa-file-lines"></i></div>
            <div class="doc-item-info">
              <div class="doc-item-nome">Declaração de Matrícula</div>
              <div class="doc-item-desc">Comprova sua matrícula ativa no semestre atual</div>
            </div>
            <button class="btn btn-primary btn-sm btn-gerar-doc"
              data-tipo="declaracao_matricula" aria-label="Gerar declaração de matrícula">
              <i class="fa-solid fa-download"></i> Gerar
            </button>
          </div>

          <div class="doc-item animate-fade-in" style="animation-delay:0.06s">
            <div class="doc-item-icon"><i class="fa-solid fa-calendar-check"></i></div>
            <div class="doc-item-info">
              <div class="doc-item-nome">Atestado de Frequência</div>
              <div class="doc-item-desc">Informa seu percentual de presença até hoje</div>
            </div>
            <button class="btn btn-primary btn-sm btn-gerar-doc"
              data-tipo="atestado_frequencia" aria-label="Gerar atestado de frequência">
              <i class="fa-solid fa-download"></i> Gerar
            </button>
          </div>

          <div class="doc-item animate-fade-in" style="animation-delay:0.12s">
            <div class="doc-item-icon"><i class="fa-solid fa-graduation-cap"></i></div>
            <div class="doc-item-info">
              <div class="doc-item-nome">Histórico Escolar</div>
              <div class="doc-item-desc">Resultado parcial ou final do semestre atual</div>
            </div>
            <button class="btn btn-primary btn-sm btn-gerar-doc"
              data-tipo="historico_semestral" aria-label="Gerar histórico escolar">
              <i class="fa-solid fa-download"></i> Gerar
            </button>
          </div>

        </div>

        <div class="card" style="margin-top:var(--space-5)">
          <div style="display:flex;align-items:center;gap:var(--space-3)">
            <i class="fa-solid fa-shield-halved" style="color:var(--red-light);font-size:1.2rem;flex-shrink:0"></i>
            <div>
              <div style="font-size:var(--text-sm);font-weight:var(--weight-semibold);color:var(--text-primary)">
                Verificação de autenticidade
              </div>
              <div style="font-size:var(--text-sm);color:var(--text-muted);margin-top:2px">
                Cada documento gerado possui um código único. Qualquer pessoa pode
                verificar sua autenticidade em
                <a href="verify.html" target="_blank">celinpb.github.io/alunos/verify.html</a>.
              </div>
            </div>
          </div>
        </div>

      </div>`;
  },

  init() {
    Layout.configurar({
      logado   : true,
      titulo   : 'Documentos',
      rotaAtiva: 'documentos'
    });

    document.querySelectorAll('.btn-gerar-doc').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tipo = btn.dataset.tipo;
        Components.btnLoading(btn, 'Gerando...');

        try {
          const res = await API.gerarDocumento(tipo);

          if (!res.success) {
            Components.toast(res.error || 'Erro ao gerar documento.', 'error');
            return;
          }

          // Abre o HTML em nova janela para impressão
          const janela = window.open('', '_blank');
          if (!janela) {
            Components.toast(
              'Pop-up bloqueado. Permita pop-ups para este site e tente novamente.',
              'warning',
              5000
            );
            return;
          }

          janela.document.write(res.data.html);
          janela.document.close();

          // Dispara o print automaticamente após carregar
          janela.onload = () => janela.print();

          Components.toast(
            `Documento gerado! Código: ${res.data.codigo}`,
            'success',
            5000
          );

        } catch (_) {
          Components.toast('Erro de conexão. Tente novamente.', 'error');
        } finally {
          Components.btnPronto(btn);
        }
      });
    });
  }
};
