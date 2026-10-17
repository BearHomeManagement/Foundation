
 // BearTrack Memberships dashboard
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

    const count = status => memberships.filter(item =>
      String(item.status || '').toLowerCase() === status
    ).length;

    const tiers = [...new Set(
      memberships.map(item => item.plan_name).filter(Boolean)
    )].sort();

    target.innerHTML = `
      <div class="dashboard-stats">
        <div class="record-card">
          <h4>Active</h4>
          <h2>${count('active')}</h2>
        </div>
        <div class="record-card">
          <h4>Pending</h4>
          <h2>${count('pending')}</h2>
        </div>
        <div class="record-card">
          <h4>Cancelled</h4>
          <h2>${count('cancelled') + count('canceled')}</h2>
        </div>
      </div>

      <div class="record-card">
        <h3>Find a Membership</h3>

        <label for="membershipStatusFilter">View by Status</label>
        <select id="membershipStatusFilter">
          <option value="all">All Memberships</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <label for="membershipTierFilter">View by Service Tier</label>
        <select id="membershipTierFilter">
          <option value="all">All Service Tiers</option>
          ${tiers.map(tier => `
            <option value="${escapeHtml(tier)}">${escapeHtml(tier)}</option>
          `).join('')}
        </select>

        <label for="membershipSearch">Search Memberships</label>
        <input
          id="membershipSearch"
          type="search"
          placeholder="Search property, plan, or membership ID..."
        />
      </div>

      <div id="membershipResults"></div>
    `;

    const statusFilter = target.querySelector('#membershipStatusFilter');
    const tierFilter = target.querySelector('#membershipTierFilter');
    const search = target.querySelector('#membershipSearch');
    const results = target.querySelector('#membershipResults');

    function updateResults() {
      const status = statusFilter.value;
      const tier = tierFilter.value;
      const query = search.value.trim().toLowerCase();

      const properties = window.BearTrackProperties?.getAll?.() || [];

      const filtered = memberships.filter(item => {
        const itemStatus = String(item.status || '').toLowerCase();
        const normalizedStatus = itemStatus === 'canceled'
          ? 'cancelled'
          : itemStatus;

        const property = properties.find(p =>
          String(p.id) === String(item.property_id)
        );

        const searchText = [
          item.id,
          item.property_id,
          item.plan_name,
          item.status,
          property?.address,
          property?.street_address
        ].filter(Boolean).join(' ').toLowerCase();

        return (status === 'all' || normalizedStatus === status)
          && (tier === 'all' || item.plan_name === tier)
          && (!query || searchText.includes(query));
      });

      if (!filtered.length) {
        results.innerHTML =
          '<p class="muted">No matching memberships found.</p>';
        return;
      }

      results.innerHTML = filtered.map(item => {
        const property = properties.find(p =>
          String(p.id) === String(item.property_id)
        );

        const address = property?.address ||
          property?.street_address ||
          'Property not found';

        return `
          <div class="record-card">
            <h4>${escapeHtml(address)}</h4>
            <p><strong>Plan:</strong> ${escapeHtml(item.plan_name || 'Unassigned')}</p>
            <p><strong>Status:</strong> ${escapeHtml(item.status || 'Unknown')}</p>
            <p><strong>Monthly Price:</strong> $${escapeHtml(item.monthly_price ?? 0)}</p>
            <p><strong>Monthly Hours:</strong> ${escapeHtml(item.monthly_hours ?? 0)}</p>
            <p><strong>Membership ID:</strong> ${escapeHtml(item.id)}</p>
          </div>
        `;
      }).join('');
    }

    statusFilter.addEventListener('change', updateResults);
    tierFilter.addEventListener('change', updateResults);
    search.addEventListener('input', updateResults);

    updateResults();
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
