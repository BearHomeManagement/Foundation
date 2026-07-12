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

        document.dispatchEvent(new CustomEvent('beartrack:edit-workorder', {
          detail: { workOrder }
        }));
      });
    });

    container.querySelectorAll('.schedule-workorder').forEach(button => {
      button.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('beartrack:open-scheduler', {
          detail: {
            itemType: 'workorder',
            itemId: button.dataset.id
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

  document.addEventListener('beartrack:properties-loaded', () => {
    populatePropertySelect();
  });

  document.addEventListener('beartrack:edit-workorder', event => {
    fillForm(event.detail.workOrder);
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
    getAll: () => [...workOrders]
  };
})();