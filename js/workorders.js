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
      columns: '*, properties(*)',
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

    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal" id="workOrderModal">
        <div class="modal-box">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
            <h3 id="workOrderModalTitle">Edit Work Order</h3>
            <button class="btn" id="closeWorkOrderModal" type="button">Close</button>
          </div>

          <input type="hidden" id="modalWorkOrderId">

          <div class="form-grid">
            <div class="field">
              <label>Property</label>
              <select id="modalWorkOrderProperty"></select>
            </div>

            <div class="field">
              <label>Title</label>
              <input id="modalWorkOrderTitle">
            </div>

            <div class="field">
              <label>Priority</label>
              <select id="modalWorkOrderPriority">
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>

            <div class="field">
              <label>Status</label>
              <select id="modalWorkOrderStatus">
                <option value="open">Open</option>
                <option value="scheduled">Scheduled</option>
                <option value="complete">Complete</option>
              </select>
            </div>

            <div class="field">
              <label>Estimated Hours</label>
              <input id="modalWorkOrderHours" type="number" step="0.25">
            </div>

            <div class="field">
              <label>Estimated Cost</label>
              <input id="modalWorkOrderCost">
            </div>

            <div class="field">
              <label>Scheduled Date</label>
              <input id="modalWorkOrderDate" type="date">
            </div>

            <div class="field">
              <label>Scheduled Time</label>
              <input id="modalWorkOrderTime" type="time">
            </div>

            <div class="field" style="grid-column:1/-1">
              <label>Assigned To</label>
              <input id="modalWorkOrderAssigned">
            </div>

            <div class="field" style="grid-column:1/-1">
              <label>Description</label>
              <textarea id="modalWorkOrderDescription"></textarea>
            </div>
          </div>

          <div class="actions">
            <button class="btn gold" id="saveWorkOrderModal" type="button">Save Changes</button>
            <button class="btn red" id="deleteWorkOrderModal" type="button">Delete Work Order</button>
          </div>
        </div>
      </div>
    `);

    const modal = document.getElementById('workOrderModal');

    document.getElementById('closeWorkOrderModal').onclick = () => {
      modal.classList.remove('show');
    };

    modal.addEventListener('click', event => {
      if (event.target === modal) modal.classList.remove('show');
    });

    document.getElementById('saveWorkOrderModal').onclick = async () => {
      const id = document.getElementById('modalWorkOrderId').value;

      const payload = {
        property_id: document.getElementById('modalWorkOrderProperty').value,
        title: document.getElementById('modalWorkOrderTitle').value,
        description: document.getElementById('modalWorkOrderDescription').value,
        priority: document.getElementById('modalWorkOrderPriority').value,
        status: document.getElementById('modalWorkOrderStatus').value,
        estimated_hours: document.getElementById('modalWorkOrderHours').value,
        estimated_cost: document.getElementById('modalWorkOrderCost').value,
        scheduled_date: document.getElementById('modalWorkOrderDate').value,
        scheduled_time: document.getElementById('modalWorkOrderTime').value,
        assigned_to: document.getElementById('modalWorkOrderAssigned').value
      };

      try {
        await update(id, payload);
        modal.classList.remove('show');

        document.dispatchEvent(new CustomEvent('beartrack:toast', {
          detail: { message: 'Work order updated' }
        }));
      } catch (error) {
        alert(error.message || String(error));
      }
    };

    document.getElementById('deleteWorkOrderModal').onclick = async () => {
      const id = document.getElementById('modalWorkOrderId').value;
      if (!confirm('Delete this work order?')) return;

      try {
        await remove(id);
        modal.classList.remove('show');

        document.dispatchEvent(new CustomEvent('beartrack:toast', {
          detail: { message: 'Work order deleted' }
        }));
      } catch (error) {
        alert(error.message || String(error));
      }
    };
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

  function openWorkOrderModal(workOrder) {
    if (!workOrder) return;

    ensureWorkOrderModal();
    populateModalPropertySelect();

    setValue('modalWorkOrderId', workOrder.id);
    setValue('modalWorkOrderProperty', workOrder.property_id || '');
    setValue('modalWorkOrderTitle', workOrder.title || '');
    setValue('modalWorkOrderDescription', workOrder.description || '');
    setValue('modalWorkOrderPriority', workOrder.priority || 'normal');
    setValue('modalWorkOrderStatus', workOrder.status || 'open');
    setValue('modalWorkOrderHours', workOrder.estimated_hours || 0);
    setValue('modalWorkOrderCost', workOrder.estimated_cost || '');
    setValue('modalWorkOrderDate', workOrder.scheduled_date || '');
    setValue('modalWorkOrderTime', workOrder.scheduled_time || '');
    setValue('modalWorkOrderAssigned', workOrder.assigned_to || '');

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
          <button type="button" class="wo-status" data-id="${workOrder.id}" data-status="scheduled">
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

  document.addEventListener('beartrack:properties-loaded', () => {
    populatePropertySelect();
    ensureWorkOrderModal();
    populateModalPropertySelect();
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
