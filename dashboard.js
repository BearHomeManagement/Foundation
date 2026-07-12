// BearTrack full operations dashboard - interactive scheduler
(() => {
  'use strict';

  let assessments = [];
  let scheduleView = 'day';

  const customers = () => window.BearTrackCustomers?.getAll?.() || [];
  const properties = () => window.BearTrackProperties?.getAll?.() || [];
  const workOrders = () => window.BearTrackWorkOrders?.getAll?.() || [];

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  async function loadAssessments() {
    assessments = await window.BearTrackDB.select('assessments', {
      columns: '*, properties(*, customers(*))',
      orderBy: 'created_at',
      ascending: false
    }) || [];
    return assessments;
  }

  function mondayOf(date) {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function iso(date) {
    const d = new Date(date);
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
  }

  function dateLabel(date) {
    return new Date(date + 'T12:00:00').toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  function hourLabel(hour) {
    return new Date(2000, 0, 1, hour, 0).toLocaleTimeString([], {
      hour: 'numeric'
    });
  }

  function assessmentCard(a) {
    return `
      <div class="job assessment">
        <strong>${esc(a.assessment_type || 'Assessment')}</strong>
        <small>${esc(a.properties?.address || 'No address')} · ${esc(a.technician || 'Unassigned')}</small>
      </div>`;
  }

  function workOrderCard(w) {
    return `
      <div class="job ${jobClass(w)}">
        <strong>${esc(w.title || w.service || 'Work Order')}</strong>
        <small>${esc(w.scheduled_time || '')} · ${esc(w.properties?.address || w.address || 'No address')} · ${esc(w.assigned_to || w.assigned || 'Unassigned')}</small>
      </div>`;
  }

  function itemsForDate(date) {
    return {
      work: workOrders().filter(w => w.scheduled_date === date),
      assessments: assessments.filter(a => a.assessment_date === date)
    };
  }

  function scheduleContent(today) {
    if (scheduleView === 'day') {
      const items = itemsForDate(today);
      const slots = [];

      for (let hour = 8; hour <= 17; hour++) {
        const time = `${String(hour).padStart(2, '0')}:00`;
        const jobs = items.work.filter(w => String(w.scheduled_time || '').slice(0, 5) === time);
        const dayAssessments = hour === 8 ? items.assessments : [];

        slots.push(`
          <div class="list-row scheduler-slot" data-date="${today}" data-time="${time}" style="align-items:flex-start;cursor:pointer">
            <div style="width:72px;color:var(--gold2);font-weight:900">${hourLabel(hour)}</div>
            <div class="row-main">
              ${jobs.map(workOrderCard).join('')}
              ${dayAssessments.map(assessmentCard).join('')}
              ${!jobs.length && !dayAssessments.length ? '<small class="muted">Click to schedule</small>' : ''}
            </div>
          </div>`);
      }

      return slots.join('');
    }

    if (scheduleView === 'week') {
      const start = mondayOf(new Date());

      return `<div class="week-grid active">${Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const key = iso(d);
        const items = itemsForDate(key);

        return `
          <div class="week-day">
            <h4>${dateLabel(key)}</h4>
            ${Array.from({ length: 10 }, (_, h) => {
              const hour = h + 8;
              const time = `${String(hour).padStart(2, '0')}:00`;
              const jobs = items.work.filter(w => String(w.scheduled_time || '').slice(0, 5) === time);
              return `
                <div class="scheduler-slot" data-date="${key}" data-time="${time}" style="border-top:1px solid rgba(255,255,255,.07);padding:7px 0;cursor:pointer">
                  <small style="color:var(--gold2)">${hourLabel(hour)}</small>
                  ${jobs.map(workOrderCard).join('')}
                  ${hour === 8 ? items.assessments.map(assessmentCard).join('') : ''}
                </div>`;
            }).join('')}
          </div>`;
      }).join('')}</div>`;
    }

    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const offset = (first.getDay() + 6) % 7;
    const cells = [];

    for (let i = 0; i < offset; i++) {
      cells.push('<div class="day-cell"></div>');
    }

    for (let day = 1; day <= last.getDate(); day++) {
      const d = new Date(now.getFullYear(), now.getMonth(), day);
      const key = iso(d);
      const items = itemsForDate(key);

      cells.push(`
        <div class="day-cell scheduler-slot" data-date="${key}" data-time="" style="cursor:pointer">
          <div class="num">${day}</div>
          ${items.work.slice(0, 4).map(w => `<div class="month-job ${jobClass(w)}">${esc(w.title || 'Work Order')}</div>`).join('')}
          ${items.assessments.slice(0, 3).map(a => `<div class="month-job assessment">${esc(a.assessment_type || 'Assessment')}</div>`).join('')}
          ${!items.work.length && !items.assessments.length ? '<small class="muted">Click to schedule</small>' : ''}
        </div>`);
    }

    return `
      <div class="month-grid active">
        <div class="dow">Mon</div><div class="dow">Tue</div><div class="dow">Wed</div>
        <div class="dow">Thu</div><div class="dow">Fri</div><div class="dow">Sat</div><div class="dow">Sun</div>
        ${cells.join('')}
      </div>`;
  }

  function ensureSchedulerModal() {
    if (document.getElementById('scheduleModal')) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal" id="scheduleModal">
        <div class="modal-box">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
            <h3>Schedule Work or Assessment</h3>
            <button class="btn" id="closeScheduleModal" type="button">Close</button>
          </div>

          <div class="form-grid">
            <div class="field">
              <label>Schedule Type</label>
              <select id="schedulerType">
                <option value="workorder">Work Order</option>
                <option value="assessment">Assessment</option>
              </select>
            </div>

            <div class="field">
              <label>Item</label>
              <select id="schedulerItem"></select>
            </div>

            <div class="field">
              <label>Date</label>
              <input id="schedulerDate" type="date">
            </div>

            <div class="field" id="schedulerTimeField">
              <label>Time</label>
              <input id="schedulerTime" type="time">
            </div>

            <div class="field" style="grid-column:1/-1">
              <label>Assigned To / Technician</label>
              <input id="schedulerAssigned" placeholder="Robert, Harley, technician name">
            </div>
          </div>

          <div class="actions">
            <button class="btn gold" id="saveScheduleBtn" type="button">Save Schedule</button>
          </div>
        </div>
      </div>`);

    const modal = document.getElementById('scheduleModal');

    document.getElementById('closeScheduleModal').onclick = () => {
      modal.classList.remove('show');
    };

    modal.addEventListener('click', event => {
      if (event.target === modal) modal.classList.remove('show');
    });

    document.getElementById('schedulerType').onchange = populateSchedulerItems;

    document.getElementById('saveScheduleBtn').onclick = async () => {
      const type = document.getElementById('schedulerType').value;
      const id = document.getElementById('schedulerItem').value;
      const date = document.getElementById('schedulerDate').value;
      const time = document.getElementById('schedulerTime').value;
      const assigned = document.getElementById('schedulerAssigned').value.trim();

      if (!id) return alert('Choose a work order or assessment.');
      if (!date) return alert('Choose a date.');

      try {
        if (type === 'workorder') {
          await window.BearTrackWorkOrders.schedule(id, date, time, assigned);
        } else {
          await window.BearTrackAssessments.update(id, {
            assessment_date: date,
            technician: assigned || null
          });
          await loadAssessments();
        }

        modal.classList.remove('show');
        render();

        document.dispatchEvent(new CustomEvent('beartrack:toast', {
          detail: { message: 'Schedule saved' }
        }));
      } catch (error) {
        alert(error.message || String(error));
      }
    };
  }

  function populateSchedulerItems() {
    const type = document.getElementById('schedulerType').value;
    const select = document.getElementById('schedulerItem');
    const timeField = document.getElementById('schedulerTimeField');

    if (type === 'workorder') {
      const options = workOrders()
        .filter(w => String(w.status || '').toLowerCase() !== 'complete')
        .map(w => `<option value="${w.id}">${esc(w.title || 'Work Order')} — ${esc(w.properties?.address || 'No address')}</option>`)
        .join('');

      select.innerHTML = options || '<option value="">No open work orders</option>';
      timeField.style.display = '';
    } else {
      const options = assessments
        .filter(a => String(a.status || '').toLowerCase() !== 'complete')
        .map(a => `<option value="${a.id}">${esc(a.assessment_type || 'Assessment')} — ${esc(a.properties?.address || 'No address')}</option>`)
        .join('');

      select.innerHTML = options || '<option value="">No open assessments</option>';
      timeField.style.display = 'none';
    }
  }

  function openScheduler(detail = {}) {
    ensureSchedulerModal();

    const type = detail.itemType === 'assessment' ? 'assessment' : 'workorder';
    document.getElementById('schedulerType').value = type;
    document.getElementById('schedulerDate').value = detail.date || iso(new Date());
    document.getElementById('schedulerTime').value = detail.time || '';
    document.getElementById('schedulerAssigned').value = detail.assigned || '';

    populateSchedulerItems();

    if (detail.itemId) {
      document.getElementById('schedulerItem').value = String(detail.itemId);
    }

    document.getElementById('scheduleModal').classList.add('show');
  }

  function render() {
    const c = customers();
    const p = properties();
    const w = workOrders();
    const today = iso(new Date());

    const emergency = w.filter(x =>
      String(x.priority || '').toLowerCase() === 'emergency' &&
      String(x.status || '').toLowerCase() !== 'complete'
    );

    const open = w.filter(x => String(x.status || '').toLowerCase() !== 'complete');
    const completed = w.filter(x => String(x.status || '').toLowerCase() === 'complete');
    const scheduledToday = w.filter(x => x.scheduled_date === today);
    const el = document.getElementById('dashboard');

    if (!el) return;

    ensureSchedulerModal();

    el.innerHTML = `
      <div class="grid stats">
        ${stat('🏠', assessments.filter(a => a.assessment_date === today).length, 'Assessments', 'Today', 'rgba(66,211,110,.22)')}
        ${stat('🛠️', scheduledToday.length, 'Work Orders', 'Today', 'rgba(61,140,255,.2)')}
        ${stat('📞', open.filter(x => String(x.status || '').toLowerCase().includes('follow')).length, 'Follow-Ups', 'Open', 'rgba(242,156,43,.2)')}
        ${stat('⚠️', emergency.length, 'Emergency', 'Open', 'rgba(239,77,67,.2)')}
        ${stat('👥', c.length, 'Customers', 'Live', 'rgba(155,108,255,.2)')}
        ${stat('🏡', p.length, 'Homes', 'Protected', 'rgba(66,211,110,.2)')}
      </div>

      <div class="dashboard-grid">
        <div>
          <div class="panel">
            <div class="panel-head"><h3>Attention Required</h3></div>
            <div class="list">
              ${attentionRow('Unassigned work orders', w.filter(x => !x.assigned_to && String(x.status || '').toLowerCase() !== 'complete').length, 'red')}
              ${attentionRow('Emergency work orders', emergency.length, 'red')}
              ${attentionRow('Open assessments', assessments.filter(a => String(a.status || '').toLowerCase() !== 'complete').length, 'orange')}
              ${attentionRow('Customers needing home profiles', Math.max(0, c.length - p.length), 'orange')}
            </div>
          </div>
        </div>

        <div>
          <div class="panel schedule-card">
            <div class="panel-head">
              <h3>Schedule Board</h3>
              <button class="btn gold" id="openSchedulerBtn" type="button">+ Schedule</button>
            </div>

            <div class="schedule-toolbar">
              <div class="tabs">
                <button data-schedule-view="day" class="${scheduleView === 'day' ? 'active' : ''}">Day</button>
                <button data-schedule-view="week" class="${scheduleView === 'week' ? 'active' : ''}">Week</button>
                <button data-schedule-view="month" class="${scheduleView === 'month' ? 'active' : ''}">Month</button>
              </div>
              <div class="date-control">
                <strong>${new Date().toLocaleDateString([], { month: 'long', year: 'numeric' })}</strong>
              </div>
            </div>

            <div id="scheduleViewContent" class="content-list" style="padding:14px">
              ${scheduleContent(today)}
            </div>

            <div class="legend">
              <span class="assessment">Assessment</span>
              <span>Repair</span>
              <span class="follow">Follow-up</span>
              <span class="inspection">Inspection</span>
              <span class="emergency">Emergency</span>
            </div>
          </div>
        </div>

        <div>
          <div class="panel">
            <div class="panel-head"><h3>Quick Actions</h3></div>
            <div class="quick-grid">
              <button data-action="new-customer"><span>👤+</span>New Customer</button>
              <button data-action="new-assessment"><span>🏠</span>New Assessment</button>
              <button data-open="workorders"><span>🛠️</span>New Work Order</button>
              <button data-action="schedule"><span>📅</span>Schedule Job</button>
              <button data-open="documents"><span>📸</span>Upload Photos</button>
              <button data-open="messages"><span>💬</span>Send Message</button>
            </div>
          </div>

          <div class="panel" style="margin-top:14px">
            <div class="panel-head"><h3>Company Health</h3></div>
            <div class="health-grid">
              ${health(c.filter(x => String(x.status || '').toLowerCase() === 'active').length, 'Active Customers', '👥')}
              ${health(p.length, 'Homes Managed', '🏡')}
              ${health(open.length, 'Open Work Orders', '🛠️')}
              ${health(completed.length, 'Completed Work Orders', '✅')}
              ${health(assessments.length, 'Assessments', '⭐')}
              ${health(emergency.length, 'Emergency Items', '⚠️')}
            </div>
          </div>
        </div>
      </div>`;

    el.querySelectorAll('[data-schedule-view]').forEach(button => {
      button.onclick = () => {
        scheduleView = button.dataset.scheduleView;
        render();
      };
    });

    el.querySelectorAll('.scheduler-slot').forEach(slot => {
      slot.onclick = event => {
        if (event.target.closest('.job, .month-job')) return;
        openScheduler({
          date: slot.dataset.date,
          time: slot.dataset.time || ''
        });
      };
    });

    document.getElementById('openSchedulerBtn').onclick = () => openScheduler();

    el.querySelector('[data-action="schedule"]')?.addEventListener('click', () => openScheduler());

    el.querySelector('[data-action="new-customer"]')?.addEventListener('click', () => {
      document.querySelector('#nav [data-page="customers"]')?.click();
      document.dispatchEvent(new CustomEvent('beartrack:new-customer'));
    });

    el.querySelector('[data-action="new-assessment"]')?.addEventListener('click', () => {
      document.querySelector('#nav [data-page="assessments"]')?.click();
      document.dispatchEvent(new CustomEvent('beartrack:new-assessment'));
    });

    el.querySelectorAll('[data-open]').forEach(button => {
      button.onclick = () => {
        document.querySelector(`#nav [data-page="${button.dataset.open}"]`)?.click();
      };
    });
  }

  function stat(icon, value, label, small, bg) {
    return `<div class="stat"><div class="icon" style="background:${bg}">${icon}</div><div><strong>${value}</strong><span>${label}</span><small>${small}</small></div></div>`;
  }

  function attentionRow(label, count, color) {
    return `<div class="list-row"><div class="alert-ico ${color === 'orange' ? 'orange' : ''}">⚠</div><div class="row-main"><strong>${label}</strong></div><span class="badge">${count}</span></div>`;
  }

  function health(value, label, icon) {
    return `<div class="health-item"><div class="icon">${icon}</div><div><strong>${value}</strong><small>${label}</small></div></div>`;
  }

  function jobClass(workOrder) {
    const priority = String(workOrder.priority || '').toLowerCase();
    const title = String(workOrder.title || workOrder.service || '').toLowerCase();

    if (priority === 'emergency') return 'emergency';
    if (title.includes('assessment')) return 'assessment';
    if (title.includes('follow')) return 'follow-up';
    if (title.includes('inspection')) return 'inspection';
    return '';
  }

  async function refresh() {
    await loadAssessments();
    render();
  }

  document.addEventListener('beartrack:open-scheduler', event => {
    openScheduler(event.detail || {});
  });

  [
    'beartrack:customers-loaded',
    'beartrack:customer-changed',
    'beartrack:properties-loaded',
    'beartrack:workorders-loaded',
    'beartrack:workorder-changed',
    'beartrack:assessments-loaded',
    'beartrack:assessment-created',
    'beartrack:assessment-updated'
  ].forEach(name => document.addEventListener(name, render));

  window.BearTrackDashboard = {
    refresh,
    render,
    loadAssessments,
    openScheduler,
    getAssessments: () => [...assessments]
  };
})();
