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

          <button
            type="button"
            class="btn bt-open-workorder"
            data-id="${escapeHtml(workOrder.id)}"
          >
            Open
          </button>
        </article>
      `;
    }).join('');
  }

  function renderWeekPlaceholder() {
    return `
      <div class="bt-empty-state">
        Week view is ready for the next step.
      </div>
    `;
  }

  function renderMonthPlaceholder() {
    return `
      <div class="bt-empty-state">
        Month view is ready for the next step.
      </div>
    `;
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
