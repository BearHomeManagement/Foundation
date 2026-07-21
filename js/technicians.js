// ============================================
// BearTrack Technician Module
// Assigned jobs, technician workflow, and status updates
// ============================================

(() => {
  'use strict';

  let currentTechnician = null;
  let technicianJobs = [];
  let currentFilter = 'today';
  let selectedTechnicianId = null;
  
  async function load() {
    try {
      currentTechnician = await resolveCurrentTechnician();

if (canManageTeam()) {
  const activeTechs = getActiveTechnicians();

  selectedTechnicianId =
    selectedTechnicianId ||
    activeTechs[0]?.id ||
    currentTechnician.id;
} else {
  selectedTechnicianId = currentTechnician.id;
}

refreshJobs();
render();

      document.dispatchEvent(new CustomEvent('beartrack:technician-loaded', {
        detail: {
          technician: currentTechnician,
          jobs: [...technicianJobs]
        }
      }));

      return {
        technician: currentTechnician,
        jobs: [...technicianJobs]
      };
    } catch (error) {
      console.error('Technician module could not load:', error);
      renderError(error);
      return null;
    }
  }

  function canManageTeam() {
  return [
    'owner_admin',
    'operations_manager',
    'operations_staff'
  ].includes(currentTechnician?.role);
}

function getActiveTechnicians() {
  return (window.BearTrackEmployees?.getActive?.() || [])
    .filter(employee =>
      ['lead_technician', 'technician'].includes(employee.role)
    );
}

function getViewedTechnician() {
  if (!canManageTeam()) return currentTechnician;

  return (
    getActiveTechnicians().find(employee =>
      employee.id === selectedTechnicianId
    ) || currentTechnician
  );
}
  function refreshJobs() {
    const allJobs = window.BearTrackWorkOrders?.getAll?.() || [];

    if (!currentTechnician?.id) {
      technicianJobs = [];
      return;
    }

    const viewedTech = getViewedTechnician();
    
  technicianJobs = allJobs
    .filter(job => viewedTech && job.technician_id === viewedTech.id)
      .sort(sortJobs);
  }

  async function resolveCurrentTechnician() {
    const session = await window.BearTrackDB?.getSession?.();

    if (!session?.user) {
      throw new Error('No signed-in employee session was found.');
    }

    let employees = window.BearTrackEmployees?.getAll?.() || [];

    if (!employees.length && window.BearTrackEmployees?.load) {
      await window.BearTrackEmployees.load();
      employees = window.BearTrackEmployees.getAll();
    }

    const byAuthId = employees.find(employee =>
      employee.auth_user_id === session.user.id
    );

    if (byAuthId) return byAuthId;

    const sessionEmail = String(session.user.email || '').toLowerCase();

    const byEmail = employees.find(employee =>
      String(employee.email || '').toLowerCase() === sessionEmail
    );

    if (byEmail) return byEmail;

    throw new Error(
      'This login is not connected to an employee record. Add the employee auth user ID or matching email.'
    );
  }

  function render() {
    const target =
      document.getElementById('technicianModule') ||
      document.getElementById('technicianJobs') ||
      document.getElementById('techModule');

    if (!target) return;

    injectStyles();

    if (!currentTechnician) {
      target.innerHTML = `
        <div class="bt-tech-empty">
          No technician profile is connected to this login.
        </div>
      `;
      return;
    }

    target.innerHTML = `
      <section class="bt-tech-app">
        <header class="bt-tech-app-header">
          <div>
            <p class="bt-tech-eyebrow">BearTrack Field Operations</p>
            <h2>My Jobs</h2>
            <p>
              ${escapeHtml(employeeName(currentTechnician))}
              · ${escapeHtml(formatRole(currentTechnician.role))}
            </p>
          </div>

          <button type="button" class="btn" id="btTechRefreshBtn">
            Refresh
          </button>
        </header>

        <div class="bt-tech-summary">
          ${summaryCard('Today', getTodayJobs().length)}
          ${summaryCard('Upcoming', getUpcomingJobs().length)}
          ${summaryCard('In Progress', getInProgressJobs().length)}
          ${summaryCard('Completed', getCompletedJobs().length)}
        </div>

        <div class="bt-tech-tabs">
          ${filterButton('today', 'Today')}
          ${filterButton('upcoming', 'Upcoming')}
          ${filterButton('in_progress', 'In Progress')}
          ${filterButton('completed', 'Completed')}
        </div>

        <div class="bt-tech-job-list">
          ${renderFilteredJobs()}
        </div>
      </section>
    `;

    bindActions();
  }

  function renderFilteredJobs() {
    const jobs = getFilteredJobs();

    if (!jobs.length) {
      return `
        <div class="bt-tech-empty">
          No ${escapeHtml(filterLabel(currentFilter).toLowerCase())} jobs.
        </div>
      `;
    }

    return jobs.map(renderJobCard).join('');
  }

  function renderJobCard(job) {
    const property = getProperty(job);

    return `
      <article
        class="bt-tech-job-card ${priorityClass(job.priority)}"
        data-workorder-id="${escapeHtml(job.id)}"
      >
        <div class="bt-tech-job-top">
          <span class="bt-tech-priority ${priorityClass(job.priority)}">
            ${escapeHtml(formatStatus(job.priority))}
          </span>

          <span class="bt-tech-status">
            ${escapeHtml(formatStatus(job.status))}
          </span>
        </div>

        <h3>${escapeHtml(job.title || 'Untitled Work Order')}</h3>

        <div class="bt-tech-job-details">
          <p>
            <strong>When:</strong>
            ${escapeHtml(formatScheduledDate(job))}
          </p>

          <p>
            <strong>Property:</strong>
            ${escapeHtml(property?.address || 'Property not assigned')}
          </p>

          <p>
            <strong>Estimated:</strong>
            ${escapeHtml(formatHours(job.estimated_hours))}
          </p>
        </div>

        ${job.description
          ? `
            <p class="bt-tech-description">
              ${escapeHtml(job.description)}
            </p>
          `
          : ''
        }

        <div class="bt-tech-job-actions">
          <button
            type="button"
            class="btn bt-tech-open"
            data-id="${escapeHtml(job.id)}"
          >
            Open Job
          </button>

          ${renderStatusActions(job)}
        </div>
      </article>
    `;
  }

  function renderStatusActions(job) {
    const status = String(job.status || '').toLowerCase();

    if (status === 'complete') return '';

    if (status === 'in_progress') {
      return `
        <button
          type="button"
          class="btn bt-tech-waiting"
          data-status-id="${escapeHtml(job.id)}"
          data-status="waiting_parts"
        >
          Waiting on Parts
        </button>

        <button
          type="button"
          class="btn bt-tech-complete"
          data-status-id="${escapeHtml(job.id)}"
          data-status="complete"
        >
          Complete
        </button>
      `;
    }

    if (status === 'waiting_parts') {
      return `
        <button
          type="button"
          class="btn bt-tech-start"
          data-status-id="${escapeHtml(job.id)}"
          data-status="in_progress"
        >
          Resume Job
        </button>

        <button
          type="button"
          class="btn bt-tech-complete"
          data-status-id="${escapeHtml(job.id)}"
          data-status="complete"
        >
          Complete
        </button>
      `;
    }

    return `
      <button
        type="button"
        class="btn bt-tech-start"
        data-status-id="${escapeHtml(job.id)}"
        data-status="in_progress"
      >
        Start Job
      </button>
    `;
  }

  async function updateJobStatus(id, status) {
    const job = window.BearTrackWorkOrders?.getById?.(id);

    if (!job) {
      alert('The work order could not be found.');
      return;
    }

    const label = formatStatus(status);

    if (
      status === 'complete' &&
      !window.confirm(`Mark "${job.title}" complete?`)
    ) {
      return;
    }

    try {
      await window.BearTrackWorkOrders.updateStatus(id, status);

      refreshJobs();
      render();

      window.BearTrackDashboard?.render?.();
      window.BearTrackSchedule?.render?.();

      document.dispatchEvent(new CustomEvent('beartrack:toast', {
        detail: {
          message: `Work order updated to ${label}`
        }
      }));
    } catch (error) {
      alert(error.message || String(error));
    }
  }

  function bindActions() {
    document.querySelectorAll('.bt-tech-filter').forEach(button => {
      button.onclick = () => {
        currentFilter = button.dataset.filter || 'today';
        render();
      };
    });

    const refreshButton = document.getElementById('btTechRefreshBtn');

    if (refreshButton) {
      refreshButton.onclick = async () => {
        if (window.BearTrackWorkOrders?.load) {
          await window.BearTrackWorkOrders.load();
        }

        refreshJobs();
        render();
      };
    }

    document.querySelectorAll('.bt-tech-open').forEach(button => {
      button.onclick = () => {
        const job =
          window.BearTrackWorkOrders?.getById?.(button.dataset.id);

        if (job) {
          window.BearTrackWorkOrders.openWorkOrderModal(job);
        }
      };
    });

    document.querySelectorAll('[data-status-id]').forEach(button => {
      button.onclick = () =>
        updateJobStatus(
          button.dataset.statusId,
          button.dataset.status
        );
    });
  }

  function getFilteredJobs() {
    if (currentFilter === 'upcoming') return getUpcomingJobs();
    if (currentFilter === 'in_progress') return getInProgressJobs();
    if (currentFilter === 'completed') return getCompletedJobs();

    return getTodayJobs();
  }

  function getTodayJobs() {
    const today = todayIso();

    return technicianJobs.filter(job =>
      job.scheduled_date === today &&
      String(job.status || '').toLowerCase() !== 'complete'
    );
  }

  function getUpcomingJobs() {
    const today = todayIso();

    return technicianJobs.filter(job =>
      job.scheduled_date &&
      job.scheduled_date > today &&
      String(job.status || '').toLowerCase() !== 'complete'
    );
  }

  function getInProgressJobs() {
    return technicianJobs.filter(job =>
      ['in_progress', 'waiting_parts'].includes(
        String(job.status || '').toLowerCase()
      )
    );
  }

  function getCompletedJobs() {
    return technicianJobs.filter(job =>
      String(job.status || '').toLowerCase() === 'complete'
    );
  }

  function getProperty(job) {
    if (job.properties) return job.properties;

    return window.BearTrackProperties?.getById?.(job.property_id) || null;
  }

  function summaryCard(label, value) {
    return `
      <article class="bt-tech-summary-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `;
  }

  function filterButton(filter, label) {
    const active = currentFilter === filter ? ' active' : '';

    return `
      <button
        type="button"
        class="bt-tech-filter${active}"
        data-filter="${filter}"
      >
        ${escapeHtml(label)}
      </button>
    `;
  }

  function filterLabel(filter) {
    if (filter === 'upcoming') return 'Upcoming';
    if (filter === 'in_progress') return 'In Progress';
    if (filter === 'completed') return 'Completed';

    return 'Today';
  }

  function sortJobs(a, b) {
    const dateCompare = String(a.scheduled_date || '')
      .localeCompare(String(b.scheduled_date || ''));

    if (dateCompare !== 0) return dateCompare;

    return String(a.scheduled_time || '')
      .localeCompare(String(b.scheduled_time || ''));
  }

  function formatScheduledDate(job) {
    if (!job.scheduled_date) return 'Not scheduled';

    const date = parseIsoDate(job.scheduled_date);

    const dateText = date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    return job.scheduled_time
      ? `${dateText} at ${formatTime(job.scheduled_time)}`
      : dateText;
  }

  function formatTime(value) {
    if (!value) return '';

    const [hourValue, minuteValue] = String(value).split(':');
    const hour = Number(hourValue);
    const minute = minuteValue || '00';

    if (!Number.isFinite(hour)) return value;

    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${minute} ${suffix}`;
  }

  function formatHours(value) {
    const hours = Number(value || 0);

    if (!hours) return 'No estimate';
    if (hours === 1) return '1 hour';

    return `${hours} hours`;
  }

  function employeeName(employee) {
    return `${employee.first_name || ''} ${employee.last_name || ''}`.trim()
      || 'Unnamed Technician';
  }

  function formatRole(role) {
    return formatStatus(role);
  }

  function formatStatus(value) {
    return String(value || '')
      .replaceAll('_', ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function priorityClass(priority) {
    const value = String(priority || 'normal').toLowerCase();

    if (value === 'emergency') return 'emergency';
    if (value === 'high') return 'high';
    if (value === 'low') return 'low';

    return 'normal';
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

  function renderError(error) {
    const target =
      document.getElementById('technicianModule') ||
      document.getElementById('technicianJobs') ||
      document.getElementById('techModule');

    if (!target) return;

    injectStyles();

    target.innerHTML = `
      <div class="bt-tech-empty error">
        <strong>Technician Portal could not load.</strong>
        <span>${escapeHtml(error.message || String(error))}</span>
      </div>
    `;
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
    if (document.getElementById('btTechnicianStyles')) return;

    const style = document.createElement('style');
    style.id = 'btTechnicianStyles';

    style.textContent = `
      .bt-tech-app {
        display: grid;
        gap: 16px;
      }

      .bt-tech-app-header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: center;
        flex-wrap: wrap;
      }

      .bt-tech-app-header h2,
      .bt-tech-app-header p {
        margin: 0;
      }

      .bt-tech-app-header p {
        color: var(--muted);
      }

      .bt-tech-eyebrow {
        color: #d5a84d !important;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      .bt-tech-summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }

      .bt-tech-summary-card {
        display: grid;
        gap: 4px;
        padding: 14px;
        border: 1px solid #dfe7dd;
        border-radius: 12px;
        background: #ffffff;
      }

      .bt-tech-summary-card span {
        color: #657b72;
      }

      .bt-tech-summary-card strong {
        color: #164c39;
        font-size: 24px;
      }

      .bt-tech-tabs {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .bt-tech-filter {
        padding: 9px 16px;
        border: 1px solid #d8dfd5;
        border-radius: 999px;
        background: #ffffff;
        color: #163f32;
        font-weight: 900;
        cursor: pointer;
      }

      .bt-tech-filter.active {
        background: #164c39;
        border-color: #164c39;
        color: #ffffff;
      }

      .bt-tech-job-list {
        display: grid;
        gap: 12px;
      }

      .bt-tech-job-card {
        display: grid;
        gap: 12px;
        padding: 16px;
        border: 1px solid #dfe7dd;
        border-left: 6px solid #3f8065;
        border-radius: 14px;
        background: #ffffff;
      }

      .bt-tech-job-card.high {
        border-left-color: #d58a24;
      }

      .bt-tech-job-card.emergency {
        border-left-color: #b42318;
      }

      .bt-tech-job-card.low {
        border-left-color: #718096;
      }

      .bt-tech-job-card h3,
      .bt-tech-job-card p {
        margin: 0;
      }

      .bt-tech-job-top {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
      }

      .bt-tech-priority,
      .bt-tech-status {
        padding: 4px 8px;
        border-radius: 999px;
        background: #e8efe8;
        color: #164c39;
        font-size: 11px;
        font-weight: 900;
      }

      .bt-tech-priority.high {
        background: #fff0d7;
        color: #945012;
      }

      .bt-tech-priority.emergency {
        background: #ffe4e1;
        color: #9b1c1c;
      }

      .bt-tech-job-details {
        display: grid;
        gap: 5px;
        color: #657b72;
      }

      .bt-tech-description {
        padding: 12px;
        border-radius: 10px;
        background: #f4f7f3;
        color: #435b51;
      }

      .bt-tech-job-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .bt-tech-job-actions .btn {
        min-height: 40px;
      }

      .bt-tech-start {
        background: #164c39 !important;
        color: #ffffff !important;
      }

      .bt-tech-waiting {
        background: #d5a84d !important;
        color: #163f32 !important;
      }

      .bt-tech-complete {
        background: #2f7d4a !important;
        color: #ffffff !important;
      }

      .bt-tech-empty {
        display: grid;
        gap: 8px;
        min-height: 180px;
        place-items: center;
        padding: 24px;
        border: 1px solid #dfe7dd;
        border-radius: 14px;
        background: #ffffff;
        color: #657b72;
        text-align: center;
      }

      .bt-tech-empty.error {
        color: #9b1c1c;
      }

      @media (max-width: 720px) {
        .bt-tech-summary {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .bt-tech-job-actions {
          display: grid;
        }

        .bt-tech-job-actions .btn {
          width: 100%;
        }
      }

      @media (max-width: 440px) {
        .bt-tech-summary {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  document.addEventListener('beartrack:workorders-loaded', () => {
    refreshJobs();
    render();
  });

  document.addEventListener('beartrack:workorder-changed', () => {
    refreshJobs();
    render();
  });

  document.addEventListener('beartrack:employees-loaded', () => {
    if (!currentTechnician) load();
  });

  window.BearTrackTechnician = {
    load,
    render,
    refresh() {
      refreshJobs();
      render();
    },
    getCurrentTechnician: () => currentTechnician,
    getJobs: () => [...technicianJobs],
    setFilter(filter) {
      currentFilter = filter || 'today';
      render();
    }
  };
})();
