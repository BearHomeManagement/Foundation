// BearTrack Memberships compatibility module
(() => {
  'use strict';

  let memberships = [];

  async function load() {
    try {
      if (window.BearTrackDB?.select) {
        memberships = await window.BearTrackDB.select('memberships', {
          columns: '*',
          orderBy: 'created_at',
          ascending: false
        }) || [];
      } else {
        memberships = [];
      }
    } catch (error) {
      console.warn('Memberships could not be loaded:', error);
      memberships = [];
    }

    render();

    document.dispatchEvent(new CustomEvent('beartrack:memberships-loaded', {
      detail: { memberships: [...memberships] }
    }));

    return memberships;
  }

  function render() {
    const target = document.getElementById('membershipList');
    if (!target) return;

    if (!memberships.length) {
      target.innerHTML = '<p class="muted">No memberships yet.</p>';
      return;
    }

    target.innerHTML = memberships.map(item => `
      <div class="record-card">
        <h4>${escapeHtml(item.name || item.membership_interest || 'Membership')}</h4>
        <p>${escapeHtml(item.email || '')}</p>
        <p>${escapeHtml(item.status || 'Active')}</p>
      </div>
    `).join('');
  }

  function getAll() {
    return [...memberships];
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  window.BearTrackMemberships = {
    load,
    render,
    getAll
  };
})();
