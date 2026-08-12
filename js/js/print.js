(() => {
  'use strict';

  function renderHeader(title = '', subtitle = '') {
    return `
      <div class="bhm-print-header">
        <div class="bhm-print-brand">
          <img
            src="../assets/bear-head-hero.png"
            alt="Bear Home Management"
            class="bhm-print-logo"
          />

          <div>
            <div class="bhm-print-company">BEAR HOME MANAGEMENT</div>
            <div class="bhm-print-tagline">
              Protecting Your Home. Preserving Your Investment.
            </div>
          </div>
        </div>

        <div class="bhm-print-contact">
          <div>bearhomemanagement.com</div>
          <div>service@bearhomemanagement.com</div>
          <div>(904) 424-9092</div>
        </div>

        <div class="bhm-print-divider"></div>

        <div class="bhm-print-title">
          <h1>${escapeHtml(title)}</h1>
          ${
            subtitle
              ? `<p>${escapeHtml(subtitle)}</p>`
              : ''
          }
        </div>
      </div>
    `;
  }

  function renderFooter() {
    return `
      <div class="bhm-print-footer">
        <strong>Bear Home Management</strong><br>
        Protecting Your Home. Preserving Your Investment.<br>
        bearhomemanagement.com
      </div>
    `;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  window.BearTrackPrint = {
    renderHeader,
    renderFooter
  };
})();
