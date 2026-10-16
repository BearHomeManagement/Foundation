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

    const searchInput = document.getElementById('customerSearchInput');

if (searchInput && !searchInput.dataset.connected) {
  searchInput.dataset.connected = 'true';

  searchInput.addEventListener('input', () => {
    render();
  });
}

const searchTerm = (searchInput?.value || '').trim().toLowerCase();

const filteredCustomers = searchTerm
  ? customers.filter(customer =>
      [
        customer.full_name,
        customer.email,
        customer.phone
      ].some(value =>
        String(value || '').toLowerCase().includes(searchTerm)
      )
    )
  : [];

   list.innerHTML = filteredCustomers.length
  ? filteredCustomers.map(customer => `
          <div class="row" data-customer-id="${customer.id}">
            <h3>${escapeHtml(customer.full_name)}</h3>
            <div>
              ${escapeHtml(customer.email)}<br>
              ${escapeHtml(customer.phone)}<br>
              <span class="muted">${escapeHtml(customer.notes)}</span>
            </div>
            <div class="actions">
             <button type="button" class="edit-customer" data-id="${customer.id}">
             Open Account
             </button>
            </div>
          </div>
        `).join('')
     : searchTerm
  ? '<p>No matching customers found.</p>'
  : '<p>Search for a customer to get started.</p>';

   list.querySelectorAll('.edit-customer').forEach(button => {
  button.addEventListener('click', () => {
    const customer = getById(button.dataset.id);
    if (!customer) return;

    const searchView = document.getElementById('customerSearchView');
    const accountView = document.getElementById('customerAccountView');
    const accountContent = document.getElementById('customerAccountContent');

    if (!searchView || !accountView || !accountContent) return;

    accountContent.innerHTML = `
      <h2>${escapeHtml(customer.full_name)}</h2>
      <p><strong>Email:</strong> ${escapeHtml(customer.email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(customer.phone)}</p>
      <p><strong>Preferred Contact:</strong> ${escapeHtml(customer.preferred_contact)}</p>
      <p><strong>Status:</strong> ${escapeHtml(customer.status)}</p>
      <p><strong>Notes:</strong> ${escapeHtml(customer.notes)}</p>
      <button type="button" id="editCustomerAccount" class="btn">
  Edit Customer
</button>
    `;
 const editButton = accountContent;

editButton.addEventListener('click', (event) => {
  if (event.target.id !== 'editCustomerAccount') return;
  const content = document.getElementById('customerAccountContent');
  if (!content) return;

  content.innerHTML = `
    <h2>Edit Customer</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-top:24px;">

<div style="display:flex;flex-direction:column;gap:8px;">
  <label for="editName">Customer Name</label>
  <input
    id="editName"
    value="${escapeHtml(customer.full_name)}"
    style="width:100%;box-sizing:border-box;padding:12px;"
  >
</div>
    <div style="display:flex;flex-direction:column;gap:8px;">
  <label for="editEmail">Email Address</label>
  <input
    type="email"
    id="editEmail"
    value="${escapeHtml(customer.email)}"
    style="width:100%;box-sizing:border-box;padding:12px;"
  >
</div>

    <div style="display:flex;flex-direction:column;gap:8px;">
  <label for="editPhone">Phone Number</label>
  <input
    type="tel"
    id="editPhone"
    value="${escapeHtml(customer.phone)}"
    style="width:100%;box-sizing:border-box;padding:12px;"
  >
</div>

    <div style="display:flex;flex-direction:column;gap:8px;">
  <label for="editContact">Preferred Contact Method</label>
  <select
    id="editContact"
    style="width:100%;box-sizing:border-box;padding:12px;"
  >
    <option value="Text">Text</option>
    <option value="Call">Call</option>
    <option value="Email">Email</option>
  </select>
</div>

  <div style="display:flex;flex-direction:column;gap:8px;">
  <label for="editStatus">Customer Status</label>
  <select
    id="editStatus"
    style="width:100%;box-sizing:border-box;padding:12px;"
  >
    <option value="Lead">Lead</option>
    <option value="Active">Active</option>
    <option value="Inactive">Inactive</option>
  </select>
</div>
   </div>

<div style="margin-top:28px;display:flex;flex-direction:column;gap:10px;">
  <label for="editNotes" style="font-weight:600;">Customer Notes</label>
  <textarea
    id="editNotes"
    rows="5"
    placeholder="Enter customer notes, service preferences, or important account information..."
    style="width:100%;box-sizing:border-box;padding:14px;resize:vertical;min-height:120px;"
  >${escapeHtml(customer.notes)}</textarea>
</div>

    <div class="actions">
      <button type="button" id="saveCustomerEdit" class="btn">Save Changes</button>
      <button type="button" id="cancelCustomerEdit" class="btn">Cancel</button>
    </div>
  `;

  content.querySelector('#editContact').value = customer.preferred_contact;
  content.querySelector('#editStatus').value = customer.status;
  content.querySelector('#saveCustomerEdit').addEventListener('click', async () => {
  const saveButton = content.querySelector('#saveCustomerEdit');

  const payload = {
    full_name: content.querySelector('#editName').value.trim(),
    email: content.querySelector('#editEmail').value.trim(),
    phone: content.querySelector('#editPhone').value.trim(),
    preferred_contact: content.querySelector('#editContact').value,
    status: content.querySelector('#editStatus').value,
    notes: content.querySelector('#editNotes').value.trim()
  };

  if (!payload.full_name) {
    alert('Customer name is required.');
    return;
  }

  saveButton.disabled = true;

  try {
    await update(customer.id, payload);
    alert('Customer updated successfully.');

    accountContent.innerHTML = `
      <h2>${escapeHtml(payload.full_name)}</h2>
      <p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(payload.phone)}</p>
      <p><strong>Preferred Contact:</strong> ${escapeHtml(payload.preferred_contact)}</p>
      <p><strong>Status:</strong> ${escapeHtml(payload.status)}</p>
      <p><strong>Notes:</strong> ${escapeHtml(payload.notes)}</p>
    `;
  } catch (error) {
    alert('Unable to save customer: ' + error.message);
    saveButton.disabled = false;
  }
});
  content.querySelector('#cancelCustomerEdit').addEventListener('click', () => {
  accountContent.innerHTML = `
    <h2>${escapeHtml(customer.full_name)}</h2>
    <p><strong>Email:</strong> ${escapeHtml(customer.email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(customer.phone)}</p>
    <p><strong>Preferred Contact:</strong> ${escapeHtml(customer.preferred_contact)}</p>
    <p><strong>Status:</strong> ${escapeHtml(customer.status)}</p>
    <p><strong>Notes:</strong> ${escapeHtml(customer.notes)}</p>
    <button type="button" id="editCustomerAccount" class="btn">
      Edit Customer
    </button>
  `;
});
});
    searchView.style.display = 'none';
    accountView.style.display = 'block';
  });
});

const backButton = document.getElementById('backToCustomerSearch');

if (backButton && !backButton.dataset.connected) {
  backButton.dataset.connected = 'true';

  backButton.addEventListener('click', () => {
    document.getElementById('customerAccountView').style.display = 'none';
    document.getElementById('customerSearchView').style.display = 'block';
  });
}
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

