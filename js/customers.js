// ============================================
// BearTrack Customers Module
// Customer CRUD and customer list rendering
// ============================================

(() => {
  'use strict';

  let customers = [];

  function normalize(customer) {
    return {
      id: customer.id,
      full_name: customer.full_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      preferred_contact: customer.preferred_contact || 'Text',
      status: customer.status || 'Lead',
      notes: customer.notes || '',
      created_at: customer.created_at || null
    };
  }

  function getById(id) {
    return customers.find(customer => customer.id === id) || null;
  }

  async function load() {
    const rows = await window.BearTrackDB.select('customers', {
      columns: '*',
      orderBy: 'created_at',
      ascending: false
    });

    customers = (rows || []).map(normalize);
    render();

    document.dispatchEvent(new CustomEvent('beartrack:customers-loaded', {
      detail: { customers: [...customers] }
    }));

    return customers;
  }

  async function create(payload) {
    const record = {
      full_name: String(payload.full_name || '').trim(),
      email: String(payload.email || '').trim() || null,
      phone: String(payload.phone || '').trim() || null,
      preferred_contact: payload.preferred_contact || 'Text',
      status: payload.status || 'Lead',
      notes: String(payload.notes || '').trim() || null
    };

    if (!record.full_name) {
      throw new Error('Customer name is required.');
    }

    const saved = await window.BearTrackDB.insert('customers', [record], {
      single: true
    });

    customers.unshift(normalize(saved));
    render();
    return saved;
  }

  async function update(id, payload) {
    const record = {
      full_name: String(payload.full_name || '').trim(),
      email: String(payload.email || '').trim() || null,
      phone: String(payload.phone || '').trim() || null,
      preferred_contact: payload.preferred_contact || 'Text',
      status: payload.status || 'Lead',
      notes: String(payload.notes || '').trim() || null
    };

    if (!record.full_name) {
      throw new Error('Customer name is required.');
    }

    const saved = await window.BearTrackDB.update('customers', id, record);
    const index = customers.findIndex(customer => customer.id === id);

    if (index >= 0) customers[index] = normalize(saved);
    render();
    return saved;
  }

  async function remove(id) {
    await window.BearTrackDB.remove('customers', id);
    customers = customers.filter(customer => customer.id !== id);
    render();
  }

  function render() {
    const list = document.getElementById('customerList');
    if (!list) return;

    list.innerHTML = customers.length
      ? customers.map(customer => `
          <div class="row" data-customer-id="${customer.id}">
            <h3>${escapeHtml(customer.full_name)}</h3>
            <div>
              ${escapeHtml(customer.email)}<br>
              ${escapeHtml(customer.phone)}<br>
              <span class="muted">${escapeHtml(customer.notes)}</span>
            </div>
            <div class="actions">
              <button type="button" class="edit-customer" data-id="${customer.id}">
                Edit
              </button>
            </div>
          </div>
        `).join('')
      : '<p>No customers yet.</p>';

    list.querySelectorAll('.edit-customer').forEach(button => {
      button.addEventListener('click', () => {
        const customer = getById(button.dataset.id);

        document.dispatchEvent(new CustomEvent('beartrack:edit-customer', {
          detail: { customer }
        }));
      });
    });
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  window.BearTrackCustomers = {
    load,
    create,
    update,
    remove,
    getById,
    getAll: () => [...customers],
    render
  };
})();

