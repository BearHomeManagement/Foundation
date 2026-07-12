// BearTrack Customers Module - repaired customer creation and ecosystem
(() => {
  'use strict';

  let customers = [];

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

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
    return customers.find(customer => String(customer.id) === String(id)) || null;
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
    if (!record.full_name) throw new Error('Customer name is required.');

    const saved = await window.BearTrackDB.insert('customers', [record], { single: true });
    customers.unshift(normalize(saved));
    render();
    document.dispatchEvent(new CustomEvent('beartrack:customer-changed'));
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
    if (!record.full_name) throw new Error('Customer name is required.');

    const saved = await window.BearTrackDB.update('customers', id, record);
    const index = customers.findIndex(customer => String(customer.id) === String(id));
    if (index >= 0) customers[index] = normalize(saved);
    render();
    document.dispatchEvent(new CustomEvent('beartrack:customer-changed'));
    return saved;
  }

  async function remove(id) {
    await window.BearTrackDB.remove('customers', id);
    customers = customers.filter(customer => String(customer.id) !== String(id));
    render();
    document.dispatchEvent(new CustomEvent('beartrack:customer-changed'));
  }

  function ensureCustomerModal() {
    if (document.getElementById('customerModal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal" id="customerModal">
        <div class="modal-box">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
            <h3 id="customerModalTitle">Add Customer</h3>
            <button class="btn" id="closeCustomerModal" type="button">Close</button>
          </div>
          <input type="hidden" id="modalCustomerId">
          <div class="form-grid">
            <div class="field"><label>Full Name</label><input id="modalCustomerName"></div>
            <div class="field"><label>Email</label><input id="modalCustomerEmail" type="email"></div>
            <div class="field"><label>Phone</label><input id="modalCustomerPhone"></div>
            <div class="field"><label>Preferred Contact</label>
              <select id="modalCustomerPreferred"><option>Text</option><option>Call</option><option>Email</option></select>
            </div>
            <div class="field"><label>Status</label>
              <select id="modalCustomerStatus"><option>Lead</option><option>Active</option><option>Inactive</option></select>
            </div>
            <div class="field" style="grid-column:1/-1"><label>Notes</label><textarea id="modalCustomerNotes"></textarea></div>
          </div>
          <div class="actions">
            <button class="btn gold" id="saveModalCustomer" type="button">Save Customer</button>
          </div>
        </div>
      </div>

      <div class="modal" id="customerEcosystemModal">
        <div class="modal-box" style="width:min(1000px,calc(100% - 28px))">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
            <div><small style="color:var(--gold2);font-weight:900">CUSTOMER ECOSYSTEM</small><h3 id="ecoCustomerName" style="margin-bottom:4px"></h3><p id="ecoCustomerContact" class="muted" style="margin-top:0"></p></div>
            <button class="btn" id="closeCustomerEcosystem" type="button">Close</button>
          </div>
          <div class="grid stats" style="grid-template-columns:repeat(3,1fr)">
            <div class="panel stat"><strong id="ecoHomeCount">0</strong><span>Homes</span></div>
            <div class="panel stat"><strong id="ecoAssessmentCount">0</strong><span>Assessments</span></div>
            <div class="panel stat"><strong id="ecoWorkCount">0</strong><span>Work Orders</span></div>
          </div>
          <div class="two-col">
            <div class="panel panel-pad"><h3>Home Information</h3><div id="ecoHomes"></div></div>
            <div class="panel panel-pad"><h3>Assessments</h3><div id="ecoAssessments"></div></div>
          </div>
          <div class="panel panel-pad" style="margin-top:16px"><h3>Work Orders & Reports</h3><div id="ecoWorkOrders"></div></div>
        </div>
      </div>
    `);

    const modal = document.getElementById('customerModal');
    const eco = document.getElementById('customerEcosystemModal');
    document.getElementById('closeCustomerModal').onclick = () => modal.classList.remove('show');
    document.getElementById('closeCustomerEcosystem').onclick = () => eco.classList.remove('show');
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
    eco.addEventListener('click', e => { if (e.target === eco) eco.classList.remove('show'); });

    document.getElementById('saveModalCustomer').onclick = async () => {
      try {
        const id = document.getElementById('modalCustomerId').value;
        const payload = {
          full_name: document.getElementById('modalCustomerName').value,
          email: document.getElementById('modalCustomerEmail').value,
          phone: document.getElementById('modalCustomerPhone').value,
          preferred_contact: document.getElementById('modalCustomerPreferred').value,
          status: document.getElementById('modalCustomerStatus').value,
          notes: document.getElementById('modalCustomerNotes').value
        };
        if (id) await update(id, payload); else await create(payload);
        modal.classList.remove('show');
      } catch (error) {
        alert(error.message || String(error));
      }
    };
  }

  function openCustomerForm(customer = null) {
    ensureCustomerModal();
    document.getElementById('customerModalTitle').textContent = customer ? 'Edit Customer' : 'Add Customer';
    document.getElementById('modalCustomerId').value = customer?.id || '';
    document.getElementById('modalCustomerName').value = customer?.full_name || '';
    document.getElementById('modalCustomerEmail').value = customer?.email || '';
    document.getElementById('modalCustomerPhone').value = customer?.phone || '';
    document.getElementById('modalCustomerPreferred').value = customer?.preferred_contact || 'Text';
    document.getElementById('modalCustomerStatus').value = customer?.status || 'Lead';
    document.getElementById('modalCustomerNotes').value = customer?.notes || '';
    document.getElementById('customerModal').classList.add('show');
  }

  function openEcosystem(customer) {
    if (!customer) return;
    ensureCustomerModal();

    const properties = window.BearTrackProperties?.getByCustomerId?.(customer.id) || [];
    const propertyIds = new Set(properties.map(p => String(p.id)));
    const assessments = (window.BearTrackAssessments?.getAll?.() || [])
      .filter(a => propertyIds.has(String(a.property_id)));
    const workOrders = (window.BearTrackWorkOrders?.getAll?.() || [])
      .filter(w => propertyIds.has(String(w.property_id)));

    document.getElementById('ecoCustomerName').textContent = customer.full_name;
    document.getElementById('ecoCustomerContact').textContent =
      [customer.email, customer.phone, customer.preferred_contact].filter(Boolean).join(' • ');
    document.getElementById('ecoHomeCount').textContent = properties.length;
    document.getElementById('ecoAssessmentCount').textContent = assessments.length;
    document.getElementById('ecoWorkCount').textContent = workOrders.length;

    document.getElementById('ecoHomes').innerHTML = properties.length
      ? properties.map(p => `<div class="row"><strong>${escapeHtml(p.address)}</strong><p class="muted">${escapeHtml([p.city,p.state,p.zip].filter(Boolean).join(', '))}</p><button class="btn open-eco-property" data-id="${p.id}">Open Home</button></div>`).join('')
      : '<p class="muted">No home information yet.</p>';

    document.getElementById('ecoAssessments').innerHTML = assessments.length
      ? assessments.map(a => `<div class="assessment-row"><strong>${escapeHtml(a.assessment_type)}</strong><p>${escapeHtml(a.assessment_date || '')} • ${escapeHtml(a.status || '')}</p><button class="btn open-eco-assessment" data-id="${a.id}">Open Assessment</button></div>`).join('')
      : '<p class="muted">No assessments yet.</p>';

    document.getElementById('ecoWorkOrders').innerHTML = workOrders.length
      ? workOrders.map(w => `<div class="row"><strong>${escapeHtml(w.title || w.service || 'Work Order')}</strong><p>${escapeHtml(w.status || '')} • ${escapeHtml(w.scheduled_date || w.preferred || '')}</p></div>`).join('')
      : '<p class="muted">No work orders or reports yet.</p>';

    document.querySelectorAll('.open-eco-property').forEach(btn => {
      btn.onclick = () => document.dispatchEvent(new CustomEvent('beartrack:open-property-file', {
        detail: { property: window.BearTrackProperties?.getById?.(btn.dataset.id) }
      }));
    });
    document.querySelectorAll('.open-eco-assessment').forEach(btn => {
      btn.onclick = () => document.dispatchEvent(new CustomEvent('beartrack:open-assessment', {
        detail: { assessmentId: btn.dataset.id, assessment: window.BearTrackAssessments?.getById?.(btn.dataset.id) }
      }));
    });

    document.getElementById('customerEcosystemModal').classList.add('show');
  }

  function render() {
    const list = document.getElementById('customerList');
    if (!list) return;
    ensureCustomerModal();

    const parentPanel = list.closest('.panel');
    if (parentPanel && !parentPanel.querySelector('#addCustomerBtn')) {
      const heading = parentPanel.querySelector('h3');
      if (heading) {
        heading.insertAdjacentHTML('afterend', '<button id="addCustomerBtn" class="btn gold" type="button" style="margin:0 0 14px">+ Add Customer</button>');
        document.getElementById('addCustomerBtn').onclick = () => openCustomerForm();
      }
    }

    list.innerHTML = customers.length
      ? customers.map(customer => `
          <div class="row customer-row" data-customer-id="${customer.id}">
            <h3>${escapeHtml(customer.full_name)}</h3>
            <div>${escapeHtml(customer.email)}<br>${escapeHtml(customer.phone)}<br>
              <span class="muted">${escapeHtml(customer.notes)}</span></div>
            <div class="actions">
              <button type="button" class="btn gold open-customer" data-id="${customer.id}">Open Ecosystem</button>
              <button type="button" class="btn edit-customer" data-id="${customer.id}">Edit</button>
            </div>
          </div>`).join('')
      : '<p>No customers yet.</p>';

    list.querySelectorAll('.open-customer').forEach(button => {
      button.onclick = () => openEcosystem(getById(button.dataset.id));
    });
    list.querySelectorAll('.edit-customer').forEach(button => {
      button.onclick = () => openCustomerForm(getById(button.dataset.id));
    });
    list.querySelectorAll('.customer-row').forEach(row => {
      row.style.cursor = 'pointer';
      row.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        openEcosystem(getById(row.dataset.customerId));
      });
    });
  }

  document.addEventListener('beartrack:new-customer', () => openCustomerForm());

  window.BearTrackCustomers = {
    load, create, update, remove, getById,
    getAll: () => [...customers],
    render, openCustomerForm, openEcosystem
  };
})();
