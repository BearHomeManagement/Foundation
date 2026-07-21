// ============================================
// BearTrack Schedule Module
// Dispatch board, scheduling, and assignments
// ============================================

(() => {
  'use strict';

  let currentView = 'day';
  let selectedDate = todayIso();
  let workOrders = [];
  let technicians = [];
  let properties = [];

  function refreshData() {
    workOrders = window.BearTrackWorkOrders?.getAll?.() || [];

    technicians = (window.BearTrackEmployees?.getActive?.() || [])
      .filter(employee =>
        ['lead_technician', 'technician'].includes(employee.role)
      );

    properties = window.BearTrackProperties?.getAll?.() || [];
  }

  function render() {
    const target = document.getElementById('scheduleModule');
    if (!target) return;

    refreshData();
    injectStyles();

    target.innerHTML = `
      <section class="bt-dispatch">
        <header class="bt-dispatch-header">
          <div>
            <p class="bt-dispatch-eyebrow">BearTrack Operations</p>
            <h2>Dispatch Center</h2>
            <p class="bt-dispatch-subtitle">
              Schedule work orders and assign technicians.
            </p>
          </div>

          <div class="bt-dispatch-controls">
            <button
              type="button"
              class="btn bt-date-nav"
              data-direction="-1"
              aria-label="Previous date"
            >
              ←
            </button>

            <button type="button" class="btn" id="btTodayBtn">
              Today
            </button>

            <button
              type="button"
              class="btn bt-date-nav"
              data-direction="1"
              aria-label="Next date"
            >
              →
            </button>

            <input
              type="date"
              id="btScheduleDate"
              value="${escapeHtml(selectedDate)}"
            >
          </div>
        </header>

        <div class="bt-view-tabs">
          ${renderViewButton('day', 'Day')}
          ${renderViewButton('week', 'Week')}
          ${renderViewButton('month', 'Month')}
        </div>

        <div class="bt-dispatch-summary">
          ${renderSummaryCard(
            'Unscheduled',
            getUnscheduledWorkOrders().length,
            'Jobs waiting for assignment'
          )}

          ${renderSummaryCard(
            'Scheduled',
            getScheduledForSelectedDate().length,
            formatLongDate(selectedDate)
          )}

          ${renderSummaryCard(
            'Technicians',
            technicians.length,
            'Active field staff'
          )}

          ${renderSummaryCard(
            'Emergency',
            getOpenEmergencyWorkOrders().length,
            'Open emergency jobs'
          )}
        </div>

        <div class="bt-dispatch-layout">
          <aside class="bt-unscheduled-panel">
            <div class="bt-panel-heading">
              <div>
                <h3>Unscheduled Work Orders</h3>
                <p>Assign these jobs to the schedule.</p>
              </div>

              <span class="bt-count-badge">
                ${getUnscheduledWorkOrders().length}
              </span>
            </div>

            <div class="bt-unscheduled-list" id="btUnscheduledList">
              ${renderUnscheduledWorkOrders()}
            </div>
          </aside>

          <main class="bt-schedule-panel">
            <div class="bt-panel-heading">
              <div>
                <h3>${viewTitle()}</h3>
                <p>${formatLongDate(selectedDate)}</p>
              </div>
            </div>

            <div id="btScheduleBoard">
              ${renderCurrentView()}
            </div>
          </main>
        </div>
      </section>
    `;
    
     bindActions();
  }
  
  function ensureAssignmentModal() {
    if (document.getElementById('btAssignmentModal')) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal" id="btAssignmentModal">
        <div class="modal-box" style="width:min(520px,calc(100vw - 24px))">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
            <div>
              <h3 style="margin:0">Assign Work Order</h3>
              <p id="btAssignmentTitle" style="margin:4px 0 0;color:var(--muted)"></p>
            </div>

            <button type="button" class="btn" id="btCloseAssignmentModal">
              Close
            </button>
          </div>

          <input type="hidden" id="btAssignmentWorkOrderId">

          <div class="form-grid" style="margin-top:18px">
            <div class="field" style="grid-column:1/-1">
              <label>Technician</label>
              <select id="btAssignmentTechnician">
                <option value="">Select technician</option>
              </select>
            </div>

            <div class="field">
              <label>Scheduled Date</label>
              <input id="btAssignmentDate" type="date">
            </div>

            <div class="field">
              <label>Scheduled Time</label>
              <input id="btAssignmentTime" type="time">
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px">
            <button type="button" class="btn" id="btCancelAssignment">
              Cancel
            </button>

            <button type="button" class="btn gold" id="btSaveAssignment">
              Save Assignment
            </button>
          </div>
        </div>
      </div>
    `);

    const modal = document.getElementById('btAssignmentModal');
    const close = () => modal.classList.remove('show');

    document.getElementById('btCloseAssignmentModal').onclick = close;
    document.getElementById('btCancelAssignment').onclick = close;

    modal.addEventListener('click', event => {
      if (event.target === modal) close();
    });

    document.getElementById('btSaveAssignment').onclick = saveAssignment;
  }

    async function openAssignmentModal(workOrder) {
    if (!workOrder) return;

    try {
      if (window.BearTrackEmployees?.load) {
        await window.BearTrackEmployees.load();
      }
    } catch (error) {
      console.warn('Technicians could not be refreshed:', error);
    }

    refreshData();
    ensureAssignmentModal();

    const technicianSelect =
      document.getElementById('btAssignmentTechnician');

    technicianSelect.innerHTML = `
      <option value="">Select technician</option>
      ${technicians.map(technician => `
        <option value="${escapeHtml(technician.id)}">
          ${escapeHtml(employeeName(technician))}
        </option>
      `).join('')}
    `;

    document.getElementById('btAssignmentWorkOrderId').value =
      workOrder.id || '';

    document.getElementById('btAssignmentTitle').textContent =
      workOrder.title || 'Untitled Work Order';

    document.getElementById('btAssignmentTechnician').value =
      workOrder.technician_id || '';

    document.getElementById('btAssignmentDate').value =
      workOrder.scheduled_date || selectedDate;

    document.getElementById('btAssignmentTime').value =
      workOrder.scheduled_time || '08:00';

    document.getElementById('btAssignmentModal').classList.add('show');
  }
  
async function saveAssignment() {
    const workOrderId =
      document.getElementById('btAssignmentWorkOrderId').value;

    const technicianId =
      document.getElementById('btAssignmentTechnician').value;

    const date =
      document.getElementById('btAssignmentDate').value;

    const time =
      document.getElementById('btAssignmentTime').value;

    if (!technicianId) {
      alert('Select a technician.');
      return;
    }

    if (!date) {
      alert('Select a scheduled date.');
      return;
    }

    if (!time) {
      alert('Select a scheduled time.');
      return;
    }

    const technician = technicians.find(item =>
      item.id === technicianId
    );

    if (!technician) {
      alert('The selected technician could not be found.');
      return;
    }

    const workOrder =
      window.BearTrackWorkOrders?.getById?.(workOrderId);

    if (!workOrder) {
      alert('The work order could not be found.');
      return;
    }

    const saveButton = document.getElementById('btSaveAssignment');
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';

    try {
      await window.BearTrackWorkOrders.update(workOrderId, {
        property_id: workOrder.property_id,
        assessment_item_id: workOrder.assessment_item_id,
        title: workOrder.title,
        description: workOrder.description,
        priority: workOrder.priority,
        status: 'scheduled',
        estimated_hours: workOrder.estimated_hours,
        estimated_cost: workOrder.estimated_cost,
        scheduled_date: date,
        scheduled_time: time,
        technician_id: technicianId,
        assigned_to: employeeName(technician)
      });

      document.getElementById('btAssignmentModal').classList.remove('show');

      selectedDate = date;
      render();
      
window.BearTrackDashboard?.render?.();
      
      window.BearTrackUI?.toast?.(
        `Assigned to ${employeeName(technician)}`,
        'success'
      );

      document.dispatchEvent(new CustomEvent('beartrack:toast', {
        detail: {
          message: `Assigned to ${employeeName(technician)}`
        }
      }));
    } catch (error) {
      alert(error.message || String(error));
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = 'Save Assignment';
    }
  }
  
  function renderViewButton(view, label) {
    const activeClass = currentView === view ? ' active' : '';

    return `
      <button
        type="button"
        class="bt-view-button${activeClass}"
        data-view="${view}"
      >
        ${label}
      </button>
    `;
  }

  function renderSummaryCard(label, value, detail) {
    return `
      <article class="bt-summary-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(detail)}</small>
      </article>
    `;
  }

  function renderCurrentView() {
    if (currentView === 'week') {
      return renderWeekPlaceholder();
    }

    if (currentView === 'month') {
      return renderMonthPlaceholder();
    }

    return renderDayView();
  }

  function renderDayView() {
    if (!technicians.length) {
      return `
        <div class="bt-empty-state">
          No active technicians are available.
        </div>
      `;
    }

    return `
      <div class="bt-day-board">
        ${technicians.map(renderTechnicianLane).join('')}
      </div>
    `;
  }

  function renderTechnicianLane(technician) {
    const jobs = getTechnicianJobsForDate(technician.id, selectedDate);
    const name = employeeName(technician);

    return `
      <section
        class="bt-tech-lane"
        data-technician-id="${escapeHtml(technician.id)}"
      >
        <header class="bt-tech-header">
          <div class="bt-tech-avatar">
            ${escapeHtml(initials(name))}
          </div>

          <div>
            <h4>${escapeHtml(name)}</h4>
            <p>${escapeHtml(formatRole(technician.role))}</p>
          </div>

          <span class="bt-count-badge">
            ${jobs.length}
          </span>
        </header>

        <div class="bt-tech-jobs">
          ${jobs.length
            ? jobs.map(renderScheduledCard).join('')
            : `
              <div class="bt-lane-empty">
                No work scheduled
              </div>
            `
          }
        </div>
      </section>
    `;
  }

  function renderScheduledCard(workOrder) {
    const property = getPropertyForWorkOrder(workOrder);

    return `
      <article
        class="bt-job-card scheduled"
        data-workorder-id="${escapeHtml(workOrder.id)}"
      >
        <div class="bt-job-card-top">
          <span class="bt-priority ${priorityClass(workOrder.priority)}">
            ${escapeHtml(formatStatus(workOrder.priority))}
          </span>

          <time>
            ${escapeHtml(formatTime(workOrder.scheduled_time))}
          </time>
        </div>

        <h4>${escapeHtml(workOrder.title || 'Untitled Work Order')}</h4>

        <p>
          ${escapeHtml(property?.address || 'Property not assigned')}
        </p>

        <div class="bt-job-meta">
          <span>
            ${escapeHtml(formatStatus(workOrder.status))}
          </span>

          <span>
            ${escapeHtml(formatHours(workOrder.estimated_hours))}
          </span>
        </div>
      </article>
    `;
  }

  function renderUnscheduledWorkOrders() {
    const unscheduled = getUnscheduledWorkOrders();

    if (!unscheduled.length) {
      return `
        <div class="bt-empty-state">
          All open work orders are scheduled.
        </div>
      `;
    }

    return unscheduled.map(workOrder => {
      const property = getPropertyForWorkOrder(workOrder);

      return `
        <article
          class="bt-job-card unscheduled"
          data-workorder-id="${escapeHtml(workOrder.id)}"
        >
          <div class="bt-job-card-top">
            <span class="bt-priority ${priorityClass(workOrder.priority)}">
              ${escapeHtml(formatStatus(workOrder.priority))}
            </span>

            <span>
              ${escapeHtml(formatHours(workOrder.estimated_hours))}
            </span>
          </div>

          <h4>${escapeHtml(workOrder.title || 'Untitled Work Order')}</h4>

          <p>
            ${escapeHtml(property?.address || 'Property not assigned')}
          </p>

                  <div class="bt-job-actions">
            <button
              type="button"
              class="btn bt-assign-workorder"
              data-id="${escapeHtml(workOrder.id)}"
            >
              Assign
            </button>

            <button
              type="button"
              class="btn bt-open-workorder"
              data-id="${escapeHtml(workOrder.id)}"
            >
              Open
            </button>
          </div>
        </article>
      `;
    }).join('');
  }

   function renderWeekPlaceholder() {
    const weekDates = getWeekDates(selectedDate);

    return `
      <div class="bt-week-board">
        <div class="bt-week-header-row">
          <div class="bt-week-tech-label">Technician</div>

          ${weekDates.map(date => `
            <div class="bt-week-day-label">
              <strong>${escapeHtml(formatShortDay(date))}</strong>
              <span>${escapeHtml(formatShortDate(date))}</span>
            </div>
          `).join('')}
        </div>

        ${technicians.length
          ? technicians.map(technician =>
              renderWeekTechnicianRow(technician, weekDates)
            ).join('')
          : `
            <div class="bt-empty-state">
              No active technicians are available.
            </div>
          `
        }
      </div>
    `;
  }

  function renderWeekTechnicianRow(technician, weekDates) {
    const name = employeeName(technician);

    return `
      <div class="bt-week-row">
        <div class="bt-week-tech-cell">
          <div class="bt-tech-avatar">
            ${escapeHtml(initials(name))}
          </div>

          <div>
            <strong>${escapeHtml(name)}</strong>
            <span>${escapeHtml(formatRole(technician.role))}</span>
          </div>
        </div>

        ${weekDates.map(date => {
          const jobs = getTechnicianJobsForDate(technician.id, date);

          return `
            <div class="bt-week-day-cell">
              ${jobs.length
                ? jobs.map(renderWeekJobCard).join('')
                : '<div class="bt-week-empty">—</div>'
              }
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderWeekJobCard(workOrder) {
    return `
      <article
        class="bt-week-job"
        data-workorder-id="${escapeHtml(workOrder.id)}"
      >
        <strong>${escapeHtml(formatTime(workOrder.scheduled_time))}</strong>
        <span>${escapeHtml(workOrder.title || 'Untitled Work Order')}</span>
      </article>
    `;
  }

  function getWeekDates(value) {
    const date = parseIsoDate(value);
    const day = date.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;

    date.setDate(date.getDate() + mondayOffset);

    return Array.from({ length: 7 }, (_, index) => {
      const current = new Date(date);
      current.setDate(date.getDate() + index);

      const offset = current.getTimezoneOffset();

      return new Date(current.getTime() - offset * 60000)
        .toISOString()
        .slice(0, 10);
    });
  }

  function formatShortDay(value) {
    return parseIsoDate(value).toLocaleDateString(undefined, {
      weekday: 'short'
    });
  }

  function formatShortDate(value) {
    return parseIsoDate(value).toLocaleDateString(undefined, {
      month: 'numeric',
      day: 'numeric'
    });
  }

    function renderMonthPlaceholder() {
    const monthData = getMonthData(selectedDate);

    return `
      <div class="bt-month-board">
        <div class="bt-month-weekdays">
          ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            .map(day => `<div>${day}</div>`)
            .join('')}
        </div>

        <div class="bt-month-grid">
          ${monthData.days.map(day => renderMonthDay(day)).join('')}
        </div>
      </div>
    `;
  }

  function renderMonthDay(day) {
    const jobs = workOrders
      .filter(workOrder =>
        workOrder.scheduled_date === day.iso &&
        !isComplete(workOrder.status)
      )
      .sort((a, b) =>
        String(a.scheduled_time || '').localeCompare(
          String(b.scheduled_time || '')
        )
      );

    const outsideClass = day.inCurrentMonth ? '' : ' outside-month';
    const todayClass = day.iso === todayIso() ? ' today' : '';

    return `
      <section class="bt-month-day${outsideClass}${todayClass}">
        <header>
          <span>${day.dayNumber}</span>
          ${jobs.length
            ? `<small>${jobs.length} job${jobs.length === 1 ? '' : 's'}</small>`
            : ''
          }
        </header>

        <div class="bt-month-jobs">
          ${jobs.length
            ? jobs.map(renderMonthJobCard).join('')
            : ''
          }
        </div>
      </section>
    `;
  }

  function renderMonthJobCard(workOrder) {
    const technician =
      technicians.find(item => item.id === workOrder.technician_id);

    return `
      <article
        class="bt-month-job ${priorityClass(workOrder.priority)}"
        data-workorder-id="${escapeHtml(workOrder.id)}"
      >
        <strong>${escapeHtml(formatTime(workOrder.scheduled_time))}</strong>
        <span>${escapeHtml(workOrder.title || 'Untitled Work Order')}</span>
        <small>
          ${escapeHtml(
            technician
              ? employeeName(technician)
              : workOrder.assigned_to || 'Unassigned'
          )}
        </small>
      </article>
    `;
  }

  function getMonthData(value) {
    const selected = parseIsoDate(value);
    const year = selected.getFullYear();
    const month = selected.getMonth();

    const firstDay = new Date(year, month, 1);
    const gridStart = new Date(year, month, 1 - firstDay.getDay());

    const days = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);

      return {
        iso: dateToIso(date),
        dayNumber: date.getDate(),
        inCurrentMonth: date.getMonth() === month
      };
    });

    return { days };
  }

  function dateToIso(date) {
    const offset = date.getTimezoneOffset();

    return new Date(date.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 10);
  }

  function getUnscheduledWorkOrders() {
    return workOrders.filter(workOrder =>
      !isComplete(workOrder.status) &&
      (!workOrder.scheduled_date || !workOrder.technician_id)
    );
  }

  function getScheduledForSelectedDate() {
    return workOrders.filter(workOrder =>
      !isComplete(workOrder.status) &&
      workOrder.scheduled_date === selectedDate
    );
  }

  function getOpenEmergencyWorkOrders() {
    return workOrders.filter(workOrder =>
      !isComplete(workOrder.status) &&
      String(workOrder.priority || '').toLowerCase() === 'emergency'
    );
  }

  function getTechnicianJobsForDate(technicianId, date) {
    return workOrders
      .filter(workOrder =>
        workOrder.technician_id === technicianId &&
        workOrder.scheduled_date === date &&
        !isComplete(workOrder.status)
      )
      .sort((a, b) =>
        String(a.scheduled_time || '').localeCompare(
          String(b.scheduled_time || '')
        )
      );
  }

  function getPropertyForWorkOrder(workOrder) {
    if (workOrder.properties) {
      return workOrder.properties;
    }

    return properties.find(property =>
      property.id === workOrder.property_id
    ) || null;
  }

  function bindActions() {
    document.querySelectorAll('.bt-view-button').forEach(button => {
      button.onclick = () => {
        currentView = button.dataset.view || 'day';
        render();
      };
    });

    document.querySelectorAll('.bt-date-nav').forEach(button => {
      button.onclick = () => {
        const direction = Number(button.dataset.direction || 0);
        selectedDate = addDays(selectedDate, direction);
        render();
      };
    });

    const todayButton = document.getElementById('btTodayBtn');

    if (todayButton) {
      todayButton.onclick = () => {
        selectedDate = todayIso();
        render();
      };
    }

    const dateInput = document.getElementById('btScheduleDate');

    if (dateInput) {
      dateInput.onchange = () => {
        selectedDate = dateInput.value || todayIso();
        render();
      };
    }
    
    document.querySelectorAll('.bt-assign-workorder').forEach(button => {
      button.onclick = () => {
        const workOrder =
          window.BearTrackWorkOrders?.getById?.(button.dataset.id);

        openAssignmentModal(workOrder);
      };
    });
    
    document.querySelectorAll('.bt-open-workorder').forEach(button => {
      button.onclick = () => {
        const workOrder =
          window.BearTrackWorkOrders?.getById?.(button.dataset.id);

        if (workOrder) {
          window.BearTrackWorkOrders.openWorkOrderModal(workOrder);
        }
      };
    });

    document.querySelectorAll('.bt-job-card.scheduled').forEach(card => {
      card.ondblclick = () => {
        const workOrder =
          window.BearTrackWorkOrders?.getById?.(
            card.dataset.workorderId
          );

        if (workOrder) {
          window.BearTrackWorkOrders.openWorkOrderModal(workOrder);
        }
      };
    });

      document.querySelectorAll('.bt-week-job').forEach(card => {
      const openWorkOrder = () => {
        const workOrder =
          window.BearTrackWorkOrders?.getById?.(
            card.dataset.workorderId
          );

        if (workOrder) {
          window.BearTrackWorkOrders.openWorkOrderModal(workOrder);
        }
      };

      card.onclick = openWorkOrder;

card.ondblclick = () => {
  openWorkOrder();
};
    });

        document.querySelectorAll('.bt-month-job').forEach(card => {
      const openWorkOrder = () => {
        const workOrder =
          window.BearTrackWorkOrders?.getById?.(
            card.dataset.workorderId
          );

        if (workOrder) {
          window.BearTrackWorkOrders.openWorkOrderModal(workOrder);
        }
      };

      card.onclick = openWorkOrder;
      card.ondblclick = openWorkOrder;
    });
    
    }
  function viewTitle() {
    if (currentView === 'week') return 'Weekly Schedule';
    if (currentView === 'month') return 'Monthly Schedule';
    return 'Daily Technician Schedule';
  }

  function employeeName(employee) {
    return `${employee.first_name || ''} ${employee.last_name || ''}`.trim()
      || 'Unnamed Technician';
  }

  function initials(name) {
    return String(name)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  }

  function formatRole(role) {
    return String(role || '')
      .replaceAll('_', ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function formatStatus(value) {
    return String(value || '')
      .replaceAll('_', ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function formatHours(value) {
    const hours = Number(value || 0);

    if (!hours) return 'No estimate';
    if (hours === 1) return '1 hour';

    return `${hours} hours`;
  }

  function formatTime(value) {
    if (!value) return 'Time TBD';

    const [hourValue, minuteValue] = String(value).split(':');
    const hour = Number(hourValue);
    const minute = minuteValue || '00';

    if (!Number.isFinite(hour)) return value;

    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${minute} ${suffix}`;
  }

  function formatLongDate(value) {
    const date = parseIsoDate(value);

    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function priorityClass(priority) {
    const value = String(priority || 'normal').toLowerCase();

    if (value === 'emergency') return 'emergency';
    if (value === 'high') return 'high';
    if (value === 'low') return 'low';

    return 'normal';
  }

  function isComplete(status) {
    return String(status || '').toLowerCase() === 'complete';
  }

  function todayIso() {
    const date = new Date();
    const offset = date.getTimezoneOffset();

    return new Date(date.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 10);
  }

  function parseIsoDate(value) {
    const [year, month, day] = String(value).split('-').map(Number);

    return new Date(year, month - 1, day);
  }

  function addDays(value, amount) {
    const date = parseIsoDate(value);
    date.setDate(date.getDate() + amount);

    const offset = date.getTimezoneOffset();

    return new Date(date.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 10);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function injectStyles() {
    if (document.getElementById('btDispatchStyles')) return;

    const style = document.createElement('style');
    style.id = 'btDispatchStyles';

    style.textContent = `
      .bt-dispatch {
        display: grid;
        gap: 18px;
      }

      .bt-dispatch-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        flex-wrap: wrap;
      }

      .bt-dispatch-header h2 {
        margin: 2px 0 4px;
      }

      .bt-dispatch-eyebrow {
        margin: 0;
        color: #a77c28;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      .bt-dispatch-subtitle {
        margin: 0;
        color: var(--muted);
      }

      .bt-dispatch-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .bt-dispatch-controls input {
        min-height: 40px;
      }

      .bt-view-tabs {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .bt-view-button {
        border: 1px solid #d8dfd5;
        border-radius: 999px;
        padding: 9px 18px;
        background: white;
        color: #163f32;
        font-weight: 800;
        cursor: pointer;
      }

      .bt-view-button.active {
        background: #163f32;
        border-color: #163f32;
        color: white;
      }

      .bt-dispatch-summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }

      .bt-summary-card {
        display: grid;
        gap: 4px;
        padding: 16px;
        border: 1px solid #dfe7dd;
        border-radius: 14px;
        background: white;
        box-shadow: 0 7px 22px rgba(22, 63, 50, .06);
      }

      .bt-summary-card span,
      .bt-summary-card small {
        color: var(--muted);
      }

      .bt-summary-card strong {
        color: #163f32;
        font-size: 26px;
      }

      .bt-dispatch-layout {
        display: grid;
        grid-template-columns: minmax(260px, 330px) minmax(0, 1fr);
        gap: 16px;
        align-items: start;
      }

      .bt-unscheduled-panel,
      .bt-schedule-panel {
        border: 1px solid #dfe7dd;
        border-radius: 16px;
        background: #f7f9f6;
        overflow: hidden;
      }

      .bt-panel-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        padding: 16px;
        border-bottom: 1px solid #dfe7dd;
        background: white;
      }

      .bt-panel-heading h3,
      .bt-panel-heading p {
        margin: 0;
      }

      .bt-panel-heading p {
        margin-top: 4px;
        color: var(--muted);
        font-size: 13px;
      }

      .bt-count-badge {
        display: inline-grid;
        min-width: 28px;
        height: 28px;
        padding: 0 8px;
        place-items: center;
        border-radius: 999px;
        background: #e9efe7;
        color: #163f32;
        font-size: 12px;
        font-weight: 900;
      }

      .bt-unscheduled-list,
      .bt-day-board {
        display: grid;
        gap: 12px;
        padding: 14px;
      }

      .bt-day-board {
        grid-template-columns: repeat(
          auto-fit,
          minmax(240px, 1fr)
        );
      }

      .bt-tech-lane {
        overflow: hidden;
        border: 1px solid #dfe7dd;
        border-radius: 14px;
        background: white;
      }

      .bt-tech-header {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 10px;
        align-items: center;
        padding: 13px;
        border-bottom: 1px solid #e4e9e2;
        background: #eef3ec;
      }

      .bt-tech-header h4,
      .bt-tech-header p {
        margin: 0;
      }

      .bt-tech-header p {
        margin-top: 2px;
        color: var(--muted);
        font-size: 12px;
      }

      .bt-tech-avatar {
        display: grid;
        width: 40px;
        height: 40px;
        place-items: center;
        border-radius: 50%;
        background: #163f32;
        color: white;
        font-weight: 900;
      }

      .bt-tech-jobs {
        display: grid;
        gap: 10px;
        min-height: 150px;
        padding: 12px;
      }

      .bt-job-card {
        display: grid;
        gap: 8px;
        padding: 13px;
        border: 1px solid #dfe7dd;
        border-radius: 12px;
        background: white;
        box-shadow: 0 5px 14px rgba(22, 63, 50, .06);
      }

      .bt-job-card.scheduled {
        cursor: pointer;
      }

      .bt-job-card h4,
      .bt-job-card p {
        margin: 0;
      }

      .bt-job-card p {
        color: var(--muted);
        font-size: 13px;
      }

      .bt-job-card-top,
      .bt-job-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .bt-job-card-top time,
      .bt-job-meta {
        color: var(--muted);
        font-size: 12px;
      }

      .bt-priority {
        display: inline-flex;
        width: fit-content;
        border-radius: 999px;
        padding: 4px 8px;
        font-size: 11px;
        font-weight: 900;
      }

      .bt-priority.emergency {
        background: #fce2e2;
        color: #9b1c1c;
      }

      .bt-priority.high {
        background: #ffecd3;
        color: #945012;
      }

      .bt-priority.normal {
        background: #e2efe5;
        color: #24613d;
      }

      .bt-priority.low {
        background: #e9edf2;
        color: #4d5e70;
      }

      .bt-empty-state,
      .bt-lane-empty {
        display: grid;
        min-height: 120px;
        place-items: center;
        padding: 20px;
        color: var(--muted);
        text-align: center;
      }

      @media (max-width: 1000px) {
        .bt-dispatch-summary {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .bt-dispatch-layout {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 600px) {
        .bt-dispatch-summary {
          grid-template-columns: 1fr;
        }

        .bt-dispatch-controls {
          width: 100%;
        }

        .bt-dispatch-controls input {
          flex: 1;
        }

        .bt-day-board {
          grid-template-columns: 1fr;
        }
      }
         /* BearTrack Schedule compatibility fixes */
      .bt-dispatch,
      .bt-dispatch * {
        box-sizing: border-box;
      }

      .bt-dispatch {
        color: #163f32;
      }

      .bt-dispatch-header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        padding: 0;
      }

      .bt-dispatch-header h2,
      .bt-panel-heading h3,
      .bt-tech-header h4,
      .bt-job-card h4 {
        color: #163f32 !important;
      }

      .bt-dispatch-subtitle,
      .bt-panel-heading p,
      .bt-tech-header p,
      .bt-job-card p,
      .bt-job-meta,
      .bt-job-card-top time,
      .bt-summary-card span,
      .bt-summary-card small {
        color: #657b72 !important;
      }

      .bt-dispatch-controls {
        justify-content: flex-end;
      }

      .bt-dispatch-controls .btn {
        min-width: 54px;
        min-height: 46px;
        color: #ffffff !important;
        background: #17344a !important;
        border: 1px solid #294b62 !important;
      }

      .bt-dispatch-controls .btn:hover {
        background: #21475f !important;
      }

      #btScheduleDate {
        min-height: 46px;
        padding: 0 12px;
        border: 1px solid #cbd6cf;
        border-radius: 8px;
        background: #ffffff;
        color: #163f32 !important;
        font-weight: 700;
      }

      .bt-view-tabs {
        margin-top: 2px;
      }

      .bt-view-button {
        color: #163f32 !important;
        background: #ffffff !important;
      }

      .bt-view-button.active {
        color: #ffffff !important;
        background: #164c39 !important;
      }

      .bt-summary-card {
        min-height: 122px;
      }

      .bt-summary-card strong {
        color: #164c39 !important;
      }

      .bt-unscheduled-panel,
      .bt-schedule-panel {
        background: #f4f7f3;
      }

      .bt-panel-heading {
        min-height: 84px;
        background: #ffffff;
      }

      .bt-count-badge {
        color: #164c39 !important;
        background: #e7efe9 !important;
      }

      .bt-job-card {
        color: #163f32 !important;
        background: #ffffff !important;
      }

      .bt-job-card.unscheduled {
        border-left: 5px solid #d5a84d;
      }

      .bt-job-card.scheduled {
        border-left: 5px solid #3f8065;
      }

      .bt-job-card .btn,
      .bt-open-workorder {
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        width: auto !important;
        min-height: 38px;
        margin-top: 4px;
        padding: 8px 14px !important;
        border: 1px solid #164c39 !important;
        border-radius: 8px;
        background: #164c39 !important;
        color: #ffffff !important;
        font-weight: 800 !important;
        line-height: 1 !important;
        opacity: 1 !important;
        cursor: pointer;
      }

      .bt-job-card .btn:hover,
      .bt-open-workorder:hover {
        background: #206248 !important;
      }

      .bt-tech-header {
        color: #163f32 !important;
        background: #eaf1e9 !important;
      }

      .bt-tech-avatar {
        background: #164c39 !important;
        color: #ffffff !important;
      }

      .bt-lane-empty,
      .bt-empty-state {
        color: #657b72 !important;
      }
      .bt-job-actions {
        display: grid !important;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        width: 100%;
        margin-top: 4px;
      }

      .bt-job-actions .btn {
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        width: 100% !important;
        min-width: 0 !important;
        margin: 0 !important;
      }

      .bt-assign-workorder {
        background: #d5a84d !important;
        border-color: #d5a84d !important;
        color: #163f32 !important;
      }

      .bt-assign-workorder:hover {
        background: #e0b85e !important;
        border-color: #e0b85e !important;
      }

      .bt-open-workorder {
        background: #164c39 !important;
        border-color: #164c39 !important;
        color: #ffffff !important;
      }
            .bt-week-board {
        display: grid;
        min-width: 980px;
        overflow-x: auto;
      }

      .bt-week-header-row,
      .bt-week-row {
        display: grid;
        grid-template-columns: 220px repeat(7, minmax(130px, 1fr));
      }

      .bt-week-header-row {
        position: sticky;
        top: 0;
        z-index: 2;
        background: #eef3ec;
        border-bottom: 1px solid #dfe7dd;
      }

      .bt-week-tech-label,
      .bt-week-day-label,
      .bt-week-tech-cell,
      .bt-week-day-cell {
        padding: 12px;
        border-right: 1px solid #dfe7dd;
        border-bottom: 1px solid #dfe7dd;
      }

      .bt-week-day-label {
        display: grid;
        gap: 2px;
        text-align: center;
      }

      .bt-week-day-label span {
        color: #657b72;
        font-size: 12px;
      }

      .bt-week-tech-cell {
        display: flex;
        align-items: center;
        gap: 10px;
        background: #f7f9f6;
      }

      .bt-week-tech-cell strong,
      .bt-week-tech-cell span {
        display: block;
      }

      .bt-week-tech-cell span {
        color: #657b72;
        font-size: 12px;
      }

      .bt-week-day-cell {
        min-height: 110px;
        background: #ffffff;
      }

      .bt-week-job {
        display: grid;
        gap: 4px;
        margin-bottom: 8px;
        padding: 8px;
        border-left: 4px solid #3f8065;
        border-radius: 8px;
        background: #eef5ef;
        cursor: pointer;
      }

      .bt-week-job strong {
        font-size: 12px;
        color: #164c39;
      }

      .bt-week-job span {
        font-size: 12px;
        color: #163f32;
      }

      .bt-week-empty {
        display: grid;
        min-height: 70px;
        place-items: center;
        color: #9aaaa3;
      }

      #btScheduleBoard {
        overflow-x: auto;
      }

            /* ===========================
         MONTH VIEW
      =========================== */

      .bt-month-board {
        min-width: 980px;
        background: #ffffff;
      }

      .bt-month-weekdays,
      .bt-month-grid {
        display: grid;
        grid-template-columns: repeat(7, minmax(130px, 1fr));
      }

      .bt-month-weekdays {
        background: #eef3ec;
        border-bottom: 1px solid #dfe7dd;
      }

      .bt-month-weekdays > div {
        padding: 12px;
        border-right: 1px solid #dfe7dd;
        color: #164c39;
        font-size: 12px;
        font-weight: 900;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: .05em;
      }

      .bt-month-day {
        min-height: 150px;
        padding: 9px;
        border-right: 1px solid #dfe7dd;
        border-bottom: 1px solid #dfe7dd;
        background: #ffffff;
      }

      .bt-month-day.outside-month {
        background: #f5f7f4;
      }

      .bt-month-day.outside-month > header,
      .bt-month-day.outside-month .bt-month-job {
        opacity: .48;
      }

      .bt-month-day.today {
        box-shadow: inset 0 0 0 3px #d5a84d;
        background: #fffaf0;
      }

      .bt-month-day > header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }

      .bt-month-day > header span {
        display: grid;
        width: 28px;
        height: 28px;
        place-items: center;
        border-radius: 50%;
        color: #163f32;
        font-weight: 900;
      }

      .bt-month-day.today > header span {
        background: #d5a84d;
      }

      .bt-month-day > header small {
        color: #657b72;
        font-size: 11px;
      }

      .bt-month-jobs {
        display: grid;
        gap: 6px;
      }

      .bt-month-job {
        display: grid;
        gap: 2px;
        padding: 7px 8px;
        border-left: 4px solid #3f8065;
        border-radius: 7px;
        background: #eef5ef;
        cursor: pointer;
        transition:
          transform .12s ease,
          box-shadow .12s ease;
      }

      .bt-month-job:hover {
        transform: translateY(-1px);
        box-shadow: 0 5px 12px rgba(22, 63, 50, .12);
      }

      .bt-month-job.emergency {
        border-left-color: #b42318;
        background: #fff0ef;
      }

      .bt-month-job.high {
        border-left-color: #d58a24;
        background: #fff6e8;
      }

      .bt-month-job.low {
        border-left-color: #718096;
        background: #f1f4f7;
      }

      .bt-month-job strong {
        color: #164c39;
        font-size: 11px;
      }

      .bt-month-job span {
        overflow: hidden;
        color: #163f32;
        font-size: 12px;
        font-weight: 800;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .bt-month-job small {
        overflow: hidden;
        color: #657b72;
        font-size: 10px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      @media (max-width: 760px) {
        .bt-dispatch-header {
          grid-template-columns: 1fr;
        }

        .bt-dispatch-controls {
          justify-content: flex-start;
        }
      }
    `;

    document.head.appendChild(style);
  }

  document.addEventListener('beartrack:workorders-loaded', render);
  document.addEventListener('beartrack:properties-loaded', render);
  document.addEventListener('beartrack:employees-loaded', render);
  document.addEventListener('beartrack:workorder-changed', render);

  window.BearTrackSchedule = {
    render,
    refresh: render,
    setView(view) {
      currentView = view;
      render();
    },
    setDate(date) {
      selectedDate = date || todayIso();
      render();
    }
  };
})();
