// ============================================
// BearTrack Work Orders Module
// Work order CRUD, status updates, and rendering
// ============================================

(() => {
  'use strict';

  let workOrders = [];

  function normalize(workOrder) {
    return {
      id: workOrder.id,
      property_id: workOrder.property_id || null,
      assessment_item_id: workOrder.assessment_item_id || null,
      title: workOrder.title || '',
      description: workOrder.description || '',
      priority: workOrder.priority || 'normal',
      status: workOrder.status || 'open',
      estimated_hours: workOrder.estimated_hours ?? 0,
      estimated_cost: workOrder.estimated_cost || '',
      scheduled_date: workOrder.scheduled_date || null,
      scheduled_time: workOrder.scheduled_time || null,
      technician_id: workOrder.technician_id || null,
      assigned_to: workOrder.assigned_to || '',
      employees: workOrder.employees || null,
      created_at: workOrder.created_at || null,
      completed_at: workOrder.completed_at || null,
      properties: workOrder.properties || null
    };
  }

  function getById(id) {
    return workOrders.find(workOrder => workOrder.id === id) || null;
  }

  function getByPropertyId(propertyId) {
    return workOrders.filter(workOrder => workOrder.property_id === propertyId);
  }

  function getOpen() {
    return workOrders.filter(workOrder => !isComplete(workOrder.status));
  }

  function isComplete(status) {
    return String(status || '').toLowerCase() === 'complete';
  }

  async function load() {
    const rows = await window.BearTrackDB.select('work_orders', {
      columns: '*, properties(*), employees:technician_id(id, first_name, last_name, role, employment_status)',
      orderBy: 'created_at',
      ascending: false
    });

    workOrders = (rows || []).map(normalize);
    render();

    document.dispatchEvent(new CustomEvent('beartrack:workorders-loaded', {
      detail: { workOrders: [...workOrders] }
    }));

    return workOrders;
  }

  async function create(payload) {
    const record = buildPayload(payload);

    if (!record.title) {
      throw new Error('Work order title is required.');
    }

    const saved = await window.BearTrackDB.insert('work_orders', [record], {
      single: true,
      columns: '*, properties(*)'
    });

    workOrders.unshift(normalize(saved));
    render();
    dispatchChanged('created', saved);
    return saved;
  }

  async function update(id, payload) {
    const record = buildPayload(payload);

    if (!record.title) {
      throw new Error('Work order title is required.');
    }

    const saved = await window.BearTrackDB.update('work_orders', id, record);

    const index = workOrders.findIndex(workOrder => workOrder.id === id);

    if (index >= 0) {
      workOrders[index] = normalize({
        ...workOrders[index],
        ...saved
      });
    }

    render();
    dispatchChanged('updated', saved);
    return saved;
  }

  async function updateStatus(id, status) {
    const updates = {
      status,
      completed_at: isComplete(status) ? new Date().toISOString() : null
    };

    const saved = await window.BearTrackDB.update('work_orders', id, updates);
    const index = workOrders.findIndex(workOrder => workOrder.id === id);

    if (index >= 0) {
      workOrders[index] = normalize({
        ...workOrders[index],
        ...saved
      });
    }

    render();
    dispatchChanged('status', saved);
    return saved;
  }

  async function schedule(id, date, time, assignedTo = '') {
    const updates = {
      status: 'scheduled',
      scheduled_date: date || null,
      scheduled_time: time || null,
      assigned_to: assignedTo || null
    };

    const saved = await window.BearTrackDB.update('work_orders', id, updates);
    const index = workOrders.findIndex(workOrder => workOrder.id === id);

    if (index >= 0) {
      workOrders[index] = normalize({
        ...workOrders[index],
        ...saved
      });
    }

    render();
    dispatchChanged('scheduled', saved);
    return saved;
  }

  async function remove(id) {
    await window.BearTrackDB.remove('work_orders', id);
    workOrders = workOrders.filter(workOrder => workOrder.id !== id);
    render();
    dispatchChanged('deleted', { id });
  }

  function buildPayload(payload) {
    return {
      property_id: payload.property_id || null,
      assessment_item_id: payload.assessment_item_id || null,
      title: String(payload.title || '').trim(),
      description: String(payload.description || '').trim() || null,
      priority: String(payload.priority || 'normal').toLowerCase(),
      status: String(payload.status || 'open').toLowerCase(),
      estimated_hours: toNumberOrZero(payload.estimated_hours),
      estimated_cost: String(payload.estimated_cost || '').trim() || null,
      scheduled_date: payload.scheduled_date || null,
      scheduled_time: payload.scheduled_time || null,
      technician_id: payload.technician_id || null,
      assigned_to: String(payload.assigned_to || '').trim() || null
    };
  }


  function ensureWorkOrderModal() {
    if (document.getElementById('workOrderModal')) return;

    injectWorkOrderStyles();

    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal bhm-wo-modal" id="workOrderModal" role="dialog" aria-modal="true">
        <div class="modal-box bhm-wo-shell">
          <header class="bhm-wo-header">
            <div class="bhm-wo-brand">
              <div class="bhm-wo-mark">BHM</div>
              <div>
                <p>Bear Home Management</p>
                <span>Powered by BearTrack™</span>
              </div>
            </div>
            <div class="bhm-wo-heading">
              <span class="bhm-wo-label">WORK ORDER</span>
              <strong id="workOrderNumber">New Work Order</strong>
            </div>
            <button class="btn bhm-wo-close" id="closeWorkOrderModal" type="button">Close</button>
          </header>

          <input type="hidden" id="modalWorkOrderId">

          <section class="bhm-wo-statusbar">
            <div class="field">
              <label>Status</label>
              <select id="modalWorkOrderStatus">
                <option value="open">Open</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_parts">Waiting on Parts</option>
                <option value="complete">Complete</option>
              </select>
            </div>

            <div class="field">
              <label>Priority</label>
              <select id="modalWorkOrderPriority">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>

            <div class="field">
              <label>Scheduled Date</label>
              <input id="modalWorkOrderDate" type="date">
            </div>

            <div class="field">
              <label>Scheduled Time</label>
              <input id="modalWorkOrderTime" type="time">
            </div>
          </section>

          <div class="bhm-wo-grid">
            <section class="bhm-wo-card">
              <h3>Property & Assignment</h3>
              <div class="form-grid">
                <div class="field" style="grid-column:1/-1">
                  <label>Property</label>
                  <select id="modalWorkOrderProperty"></select>
                </div>

                <div class="field" style="grid-column:1/-1">
                  <label>Assigned Technician</label>
                  <select id="modalWorkOrderTechnician">
                    <option value="">Unassigned</option>
                  </select>
                </div>
              </div>
            </section>

            <section class="bhm-wo-card">
              <h3>Service Request</h3>
              <div class="form-grid">
                <div class="field" style="grid-column:1/-1">
                  <label>Work Order Title</label>
                  <input id="modalWorkOrderTitle" placeholder="Example: Repair leaking kitchen faucet">
                </div>

                <div class="field" style="grid-column:1/-1">
                  <label>Customer Complaint / Requested Work</label>
                  <textarea id="modalWorkOrderDescription" rows="7"
                    placeholder="Describe the issue, affected area, access notes, and requested service."></textarea>
                </div>
              </div>
            </section>

            <section class="bhm-wo-card">
              <h3>Estimated Service</h3>
              <div class="form-grid">
                <div class="field">
                  <label>Estimated Hours</label>
                  <input id="modalWorkOrderHours" type="number" min="0" step="0.25">
                </div>

                <div class="field">
                  <label>Estimated Cost</label>
                  <input id="modalWorkOrderCost" inputmode="decimal" placeholder="$0.00">
                </div>
              </div>
              <p class="bhm-wo-note">
                Technician findings, materials, labor, photos, signatures, and completion details
                will be added in the next database-backed work order phase.
              </p>
            </section>
          </div>

          <footer class="bhm-wo-actions">
            <button class="btn red" id="deleteWorkOrderModal" type="button">Delete Work Order</button>
            <div>
              <button class="btn" id="cancelWorkOrderModal" type="button">Cancel</button>
              <button class="btn gold" id="saveWorkOrderModal" type="button">Save Work Order</button>
            </div>
          </footer>
        </div>
      </div>
    `);

    const modal = document.getElementById('workOrderModal');
    const closeModal = () => modal.classList.remove('show');

    document.getElementById('closeWorkOrderModal').onclick = closeModal;
    document.getElementById('cancelWorkOrderModal').onclick = closeModal;

    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal();
    });

    document.getElementById('saveWorkOrderModal').onclick = async () => {
      const id = valueOf('modalWorkOrderId');

      const payload = {
        property_id: valueOf('modalWorkOrderProperty'),
        title: valueOf('modalWorkOrderTitle'),
        description: valueOf('modalWorkOrderDescription'),
        priority: valueOf('modalWorkOrderPriority'),
        status: valueOf('modalWorkOrderStatus'),
        estimated_hours: valueOf('modalWorkOrderHours'),
        estimated_cost: valueOf('modalWorkOrderCost'),
        scheduled_date: valueOf('modalWorkOrderDate'),
        scheduled_time: valueOf('modalWorkOrderTime'),
        technician_id: valueOf('modalWorkOrderTechnician') || null,
        assigned_to: selectedTechnicianName() || null
      };

      if (!payload.property_id) {
        alert('Select a property before saving this work order.');
        return;
      }

      if (!payload.title.trim()) {
        alert('Enter a work order title.');
        return;
      }

      if (payload.status === 'scheduled' && !payload.scheduled_date) {
        alert('A scheduled work order must have a scheduled date.');
        return;
      }

      try {
        if (id) {
          await update(id, payload);
        } else {
          await create(payload);
        }

        closeModal();

        document.dispatchEvent(new CustomEvent('beartrack:toast', {
          detail: { message: id ? 'Work order updated' : 'Work order created' }
        }));
      } catch (error) {
        alert(error.message || String(error));
      }
    };

    document.getElementById('deleteWorkOrderModal').onclick = async () => {
      const id = valueOf('modalWorkOrderId');

      if (!id) {
        closeModal();
        return;
      }

      if (!confirm('Delete this work order?')) return;

      try {
        await remove(id);
        closeModal();

        document.dispatchEvent(new CustomEvent('beartrack:toast', {
          detail: { message: 'Work order deleted' }
        }));
      } catch (error) {
        alert(error.message || String(error));
      }
    };
  }

  function injectWorkOrderStyles() {
    if (document.getElementById('bhmWorkOrderStyles')) return;

    const style = document.createElement('style');
    style.id = 'bhmWorkOrderStyles';
    style.textContent = `
      .bhm-wo-modal .bhm-wo-shell {
        width: min(1040px, calc(100vw - 24px));
        max-height: calc(100vh - 24px);
        overflow: auto;
        padding: 0;
        border-radius: 18px;
        background: #f4f7f2;
      }
      .bhm-wo-header {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 18px;
        align-items: center;
        padding: 20px 22px;
        background: linear-gradient(135deg, #163f32, #245a47);
        color: white;
        position: sticky;
        top: 0;
        z-index: 3;
      }
      .bhm-wo-brand { display:flex; gap:12px; align-items:center; }
      .bhm-wo-mark {
        width:46px; height:46px; display:grid; place-items:center;
        border-radius:50%; background:#d5a84d; color:#163f32;
        font-weight:900; letter-spacing:.04em;
      }
      .bhm-wo-brand p,.bhm-wo-brand span { display:block; margin:0; }
      .bhm-wo-brand p { font-weight:800; }
      .bhm-wo-brand span { font-size:12px; opacity:.82; }
      .bhm-wo-heading { text-align:center; }
      .bhm-wo-label { display:block; font-size:12px; letter-spacing:.18em; opacity:.8; }
      .bhm-wo-heading strong { display:block; margin-top:3px; font-size:18px; }
      .bhm-wo-close { justify-self:end; }
      .bhm-wo-statusbar {
        display:grid; grid-template-columns:repeat(4,minmax(0,1fr));
        gap:12px; padding:18px 22px; background:white;
        border-bottom:1px solid #dfe7dd;
      }
      .bhm-wo-grid { display:grid; gap:16px; padding:18px 22px; }
      .bhm-wo-card {
        padding:18px; border:1px solid #dfe7dd; border-radius:14px;
        background:white; box-shadow:0 6px 20px rgba(22,63,50,.06);
      }
      .bhm-wo-card h3 { margin:0 0 14px; color:#163f32; font-size:17px; }
      .bhm-wo-note {
        margin:14px 0 0; padding:12px; border-radius:10px;
        background:#f3efe3; color:#64562f; font-size:13px;
      }
      .bhm-wo-actions {
        display:flex; justify-content:space-between; gap:12px;
        padding:18px 22px 22px;
      }
      .bhm-wo-actions > div { display:flex; gap:10px; }

      @media (max-width:760px) {
        .bhm-wo-header { grid-template-columns:1fr auto; }
        .bhm-wo-heading { grid-column:1/-1; grid-row:2; text-align:left; }
        .bhm-wo-statusbar { grid-template-columns:1fr 1fr; }
        .bhm-wo-actions { flex-direction:column-reverse; }
        .bhm-wo-actions > div,.bhm-wo-actions button { width:100%; }
      }
      @media (max-width:480px) {
        .bhm-wo-statusbar { grid-template-columns:1fr; }
        .bhm-wo-header,.bhm-wo-statusbar,.bhm-wo-grid,.bhm-wo-actions {
          padding-left:14px; padding-right:14px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function populateTechnicianSelect() {
    const select = document.getElementById('modalWorkOrderTechnician');
    if (!select) return;

    const employees = window.BearTrackEmployees?.getActive?.() || [];
    const technicians = employees.filter(employee =>
      ['lead_technician', 'technician'].includes(employee.role)
    );

    select.innerHTML = `
      <option value="">Unassigned</option>
      ${technicians.map(employee => `
        <option value="${escapeHtml(employee.id)}">
          ${escapeHtml(`${employee.first_name} ${employee.last_name}`.trim())}
          — ${employee.role === 'lead_technician' ? 'Lead Technician' : 'Technician'}
        </option>
      `).join('')}
    `;
  }

  function selectedTechnicianName() {
    const select = document.getElementById('modalWorkOrderTechnician');
    if (!select || !select.value) return '';
    return select.options[select.selectedIndex]?.text
      ?.replace(/\s+—\s+(Lead Technician|Technician)$/, '')
      ?.trim() || '';
  }

  function populateModalPropertySelect() {
    const select = document.getElementById('modalWorkOrderProperty');
    if (!select || !window.BearTrackProperties) return;

    const properties = window.BearTrackProperties.getAll();

    select.innerHTML = properties
      .map(property => `
        <option value="${property.id}">
          ${escapeHtml(property.address)}
        </option>
      `)
      .join('');
  }

  function openWorkOrderModal(workOrder = null) {
    ensureWorkOrderModal();
    populateModalPropertySelect();

    const isNew = !workOrder;
    const current = workOrder || {
      id: '',
      property_id: '',
      title: '',
      description: '',
      priority: 'normal',
      status: 'open',
      estimated_hours: 0,
      estimated_cost: '',
      scheduled_date: '',
      scheduled_time: '',
      assigned_to: '',
      employees: null
    };

    setValue('modalWorkOrderId', current.id || '');
    setValue('modalWorkOrderProperty', current.property_id || '');
    setValue('modalWorkOrderTitle', current.title || '');
    setValue('modalWorkOrderDescription', current.description || '');
    setValue('modalWorkOrderPriority', current.priority || 'normal');
    setValue('modalWorkOrderStatus', current.status || 'open');
    setValue('modalWorkOrderHours', current.estimated_hours || 0);
    setValue('modalWorkOrderCost', current.estimated_cost || '');
    setValue('modalWorkOrderDate', current.scheduled_date || '');
    setValue('modalWorkOrderTime', current.scheduled_time || '');
    populateTechnicianSelect();
    setValue('modalWorkOrderTechnician', current.technician_id || '');

    const number = document.getElementById('workOrderNumber');
    if (number) {
      number.textContent = isNew
        ? 'New Work Order'
        : `WO-${String(current.id).slice(0, 8).toUpperCase()}`;
    }

    const deleteButton = document.getElementById('deleteWorkOrderModal');
    if (deleteButton) deleteButton.style.display = isNew ? 'none' : '';

    document.getElementById('workOrderModal').classList.add('show');
  }

  function render() {
    const list = document.getElementById('workOrderList');
    const dashboard = document.getElementById('dashboardWorkOrders');
    const html = renderRows();

    if (list) list.innerHTML = html;
    if (dashboard) dashboard.innerHTML = html;

    bindRowActions(list);
    bindRowActions(dashboard);
  }

  function renderRows() {
    if (!workOrders.length) return '<p>No work orders yet.</p>';

    return workOrders.map(workOrder => `
      <div class="row" data-workorder-id="${workOrder.id}">
        <h3>${escapeHtml(workOrder.title)}</h3>
        <div>
          Property: ${escapeHtml(workOrder.properties?.address || '—')}<br>
          Status: ${escapeHtml(formatStatus(workOrder.status))}
          | Priority: ${escapeHtml(formatStatus(workOrder.priority))}<br>
          Hours: ${escapeHtml(workOrder.estimated_hours)}
          | Cost: ${escapeHtml(workOrder.estimated_cost || 'TBD')}<br>
          ${workOrder.scheduled_date
            ? `Scheduled: ${escapeHtml(workOrder.scheduled_date)} ${escapeHtml(workOrder.scheduled_time || '')}<br>`
            : ''}
          <span class="muted">${escapeHtml(workOrder.description)}</span>
        </div>
        <div class="actions">
          <button type="button" class="edit-workorder" data-id="${workOrder.id}">
            Edit
          </button>
          <button type="button" class="schedule-workorder" data-id="${workOrder.id}">
            Schedule
          </button>
          <button type="button" class="wo-status" data-id="${workOrder.id}" data-status="complete">
            Complete
          </button>
        </div>
      </div>
    `).join('');
  }

  function bindRowActions(container) {
    if (!container) return;

    container.querySelectorAll('.edit-workorder').forEach(button => {
      button.addEventListener('click', () => {
        const workOrder = getById(button.dataset.id);
        openWorkOrderModal(workOrder);
      });
    });

    container.querySelectorAll('.schedule-workorder').forEach(button => {
  button.addEventListener('click', () => {
    const workOrder = getById(button.dataset.id);
    if (!workOrder) return;

    document.dispatchEvent(new CustomEvent('beartrack:open-scheduler', {
      detail: {
        itemType: 'workorder',
        itemId: workOrder.id,
        propertyId: workOrder.property_id,
        date: workOrder.scheduled_date || '',
        time: workOrder.scheduled_time || '',
        assigned: workOrder.assigned_to || ''
      }
    }));
  });
});

    container.querySelectorAll('.wo-status').forEach(button => {
      button.addEventListener('click', async () => {
        try {
          await updateStatus(button.dataset.id, button.dataset.status);

          document.dispatchEvent(new CustomEvent('beartrack:toast', {
            detail: { message: 'Work order updated' }
          }));
        } catch (error) {
          alert(error.message || String(error));
        }
      });
    });
  }

  function populatePropertySelect() {
    const select = document.getElementById('workOrderProperty');
    if (!select || !window.BearTrackProperties) return;

    const properties = window.BearTrackProperties.getAll();

    select.innerHTML = properties
      .map(property => `
        <option value="${property.id}">
          ${escapeHtml(property.address)}
        </option>
      `)
      .join('');
  }

  function fillForm(workOrder) {
    if (!workOrder) return;

    setValue('workOrderId', workOrder.id);
    setValue('workOrderProperty', workOrder.property_id || '');
    setValue('workOrderTitle', workOrder.title || '');
    setValue('workOrderDescription', workOrder.description || '');
    setValue('workOrderPriority', workOrder.priority || 'normal');
    setValue('workOrderStatus', workOrder.status || 'open');
    setValue('workOrderHours', workOrder.estimated_hours || 0);
    setValue('workOrderCost', workOrder.estimated_cost || '');
    setValue('workOrderDate', workOrder.scheduled_date || '');
    setValue('workOrderTime', workOrder.scheduled_time || '');
    setValue('workOrderAssigned', workOrder.assigned_to || '');
  }

  function clearForm() {
    [
      'workOrderId',
      'workOrderTitle',
      'workOrderDescription',
      'workOrderHours',
      'workOrderCost',
      'workOrderDate',
      'workOrderTime',
      'workOrderAssigned'
    ].forEach(id => setValue(id, ''));

    setValue('workOrderPriority', 'normal');
    setValue('workOrderStatus', 'open');
  }

  function readForm() {
    return {
      property_id: valueOf('workOrderProperty'),
      title: valueOf('workOrderTitle'),
      description: valueOf('workOrderDescription'),
      priority: valueOf('workOrderPriority'),
      status: valueOf('workOrderStatus'),
      estimated_hours: valueOf('workOrderHours'),
      estimated_cost: valueOf('workOrderCost'),
      scheduled_date: valueOf('workOrderDate'),
      scheduled_time: valueOf('workOrderTime'),
      assigned_to: valueOf('workOrderAssigned')
    };
  }

  function bindForm() {
    const saveButton = document.getElementById('saveWorkOrderBtn');
    const clearButton = document.getElementById('clearWorkOrderBtn');

    if (saveButton && !saveButton.dataset.boundWorkorders) {
      saveButton.dataset.boundWorkorders = 'true';

      saveButton.addEventListener('click', async () => {
        try {
          const id = valueOf('workOrderId');
          const payload = readForm();

          if (id) {
            await update(id, payload);
          } else {
            await create(payload);
          }

          clearForm();

          document.dispatchEvent(new CustomEvent('beartrack:toast', {
            detail: { message: 'Work order saved' }
          }));
        } catch (error) {
          alert(error.message || String(error));
        }
      });
    }

    if (clearButton && !clearButton.dataset.boundWorkorders) {
      clearButton.dataset.boundWorkorders = 'true';
      clearButton.addEventListener('click', clearForm);
    }
  }

  function dispatchChanged(action, workOrder) {
    document.dispatchEvent(new CustomEvent('beartrack:workorder-changed', {
      detail: { action, workOrder }
    }));
  }

  function formatStatus(value) {
    return String(value || '')
      .replaceAll('_', ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function valueOf(id) {
    return document.getElementById(id)?.value || '';
  }

  function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value ?? '';
  }

  function toNumberOrZero(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  document.addEventListener('beartrack:employees-loaded', () => {
    populateTechnicianSelect();
  });

  document.addEventListener('beartrack:properties-loaded', () => {
    populatePropertySelect();
    ensureWorkOrderModal();
    populateModalPropertySelect();
  });

  document.addEventListener('beartrack:new-workorder', event => {
    openWorkOrderModal(event.detail?.defaults || null);
  });

  document.addEventListener('beartrack:edit-workorder', event => {
    openWorkOrderModal(event.detail.workOrder);
  });

  window.BearTrackWorkOrders = {
    load,
    create,
    update,
    updateStatus,
    schedule,
    remove,
    render,
    bindForm,
    fillForm,
    clearForm,
    readForm,
    populatePropertySelect,
    getById,
    getByPropertyId,
    getOpen,
    openWorkOrderModal,
    getAll: () => [...workOrders]
  };
})();
