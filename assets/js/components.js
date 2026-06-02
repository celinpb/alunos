// ============================================================
// components.js — Componentes reutilizáveis de UI
// Portal do Aluno — CELINPB
// ============================================================

const Components = (() => {

  // ── Toast ─────────────────────────────────────────────────
  const TOAST_ICONS = {
    success: 'fa-solid fa-circle-check',
    error  : 'fa-solid fa-circle-xmark',
    warning: 'fa-solid fa-triangle-exclamation',
    info   : 'fa-solid fa-circle-info'
  };

  function toast(msg, tipo = 'info', dur = 3500) {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const el = document.createElement('div');
    el.className = `toast toast-${tipo}`;
    el.innerHTML = `<i class="toast-icon ${TOAST_ICONS[tipo] || TOAST_ICONS.info}"></i><span>${msg}</span>`;
    c.appendChild(el);
    setTimeout(() => {
      el.classList.add('toast-out');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, dur);
  }

  // ── Modal ─────────────────────────────────────────────────
  function modal({ titulo, corpo, confirmar = 'Confirmar', cancelar = 'Cancelar', onConfirm, tipo }) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    if (!overlay || !content) return;
    const btnCls = tipo === 'danger' ? 'btn-danger' : 'btn-primary';
    content.innerHTML = `
      <h3 class="modal-title">${titulo}</h3>
      <p  class="modal-body">${corpo}</p>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-cancelar">${cancelar}</button>
        <button class="btn ${btnCls}"     id="modal-confirmar">${confirmar}</button>
      </div>`;
    overlay.classList.remove('hidden');
    const fechar = () => overlay.classList.add('hidden');
    document.getElementById('modal-cancelar') .addEventListener('click', fechar, { once: true });
    document.getElementById('modal-confirmar').addEventListener('click', () => { fechar(); onConfirm?.(); }, { once: true });
    overlay.addEventListener('click', e => { if (e.target === overlay) fechar(); }, { once: true });
  }

  function fecharModal() { document.getElementById('modal-overlay')?.classList.add('hidden'); }

  // ── Botão loading ─────────────────────────────────────────
  function btnLoading(btn, txt = '') {
    btn.disabled = true;
    btn.dataset.orig = btn.innerHTML;
    btn.classList.add('loading');
    if (txt) btn.innerHTML = `<span>${txt}</span>`;
  }
  function btnPronto(btn) {
    btn.disabled = false;
    btn.classList.remove('loading');
    if (btn.dataset.orig) { btn.innerHTML = btn.dataset.orig; delete btn.dataset.orig; }
  }

  // ── Spinner de conteúdo ───────────────────────────────────
  function spinner(el) {
    el.innerHTML = '<div class="spinner-center"><div class="spinner spinner-lg"></div></div>';
  }

  function vazio(el, titulo = 'Nada por aqui', desc = '', icone = 'fa-solid fa-inbox') {
    el.innerHTML = `
      <div class="empty-state">
        <i class="empty-state-icon ${icone}"></i>
        <p class="empty-state-title">${titulo}</p>
        ${desc ? `<p class="empty-state-desc">${desc}</p>` : ''}
      </div>`;
  }

  // ── Module card ───────────────────────────────────────────
  function moduleCardHTML({ nome, icone, rota, desc }) {
    return `
      <div class="module-card" data-rota="${rota}" role="button" tabindex="0" aria-label="${nome}">
        <div class="module-card-icon"><i class="${icone}"></i></div>
        <div class="module-card-info">
          <div class="module-card-name">${nome}</div>
          ${desc ? `<div class="module-card-desc">${desc}</div>` : ''}
        </div>
        <div class="module-card-arrow"><i class="fa-solid fa-chevron-right"></i></div>
      </div>`;
  }

  // ── Badge ─────────────────────────────────────────────────
  function badgeHTML(texto, tipo = 'neutral') {
    return `<span class="badge badge-${tipo}">${texto}</span>`;
  }

  // ── Toggle ────────────────────────────────────────────────
  function toggleHTML(id, label, ativo) {
    return `
      <label class="toggle-wrapper" for="toggle-${id}">
        <div class="toggle ${ativo ? 'active' : ''}" id="toggle-${id}" role="switch" aria-checked="${ativo}" tabindex="0"></div>
        <span class="toggle-label">${label}</span>
      </label>`;
  }

  function inicializarToggles(container, onChange) {
    container.querySelectorAll('.toggle').forEach(t => {
      const fn = () => {
        const ativo = t.classList.toggle('active');
        t.setAttribute('aria-checked', ativo);
        onChange(t.id.replace('toggle-', ''), ativo);
      };
      t.addEventListener('click', fn);
      t.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); fn(); }});
    });
  }

  // ── Info list ─────────────────────────────────────────────
  function infoListHTML(itens) {
    return `<div class="info-list">${
      itens.filter(i => i.valor).map(i => `
        <div class="info-item">
          <span class="info-label">${i.label}</span>
          <span class="info-value">${i.valor}</span>
        </div>`).join('')
    }</div>`;
  }

  return { toast, modal, fecharModal, btnLoading, btnPronto, spinner, vazio,
           moduleCardHTML, badgeHTML, toggleHTML, inicializarToggles, infoListHTML };
})();
