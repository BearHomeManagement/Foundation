// ============================================
// BearTrack Dashboard Module
// Live metrics and dashboard summaries
// ============================================

(() => {
  'use strict';

  let assessments = [];

  function getCustomers() {
    return window.BearTrackCustomers?.getAll?.() || [];
  }

  function getProperties() {
    return window.BearTrackProperties?.getAll?.() || [];
  }

  function getWorkOrders() {
    return window.BearTrackWorkOrders?.getAll?.() || [];
  }

  async function loadAssessments() {
    if (!window.BearTrackDB) return [];

    const rows = await window.BearTrackDB.select('assessments', {
      columns: '*, properties(*, customers(*))',
      orderBy: 'created_at',
      ascending: false
    });

    assessments = rows || [];
    render();
    return assessments;
  }

  function render() {
    const customers = getCustomers();
    const properties = getProperties();
    const workOrders = getWorkOrders();

    setText('metricCustomers', customers.length);
    setText('metricProperties', properties.length);
    setText('metricAssessments', assessments.length);
    setText(
      'metricOpenWO',
      workOrders.filter(workOrder => !isComplete(workOrder.status)).length
    );

    renderAssessmentSummary();
    renderWorkOrderSummary();
    renderOperationalSummary();
  }

  function renderAssessmentSummary() {
    const target = document.getElementById('dashboardAssessments');
    if (!target) return;

    const recent = assessments.slice(0, 5);

    target.innerHTML = recent.length
      ? recent.map(assessment => `
          <div class="assessment-row">
            <h3>${escapeHtml(assessment.properties?.address || 'No address')}</h3>
            <p>
              ${escapeHtml(assessment.properties?.customers?.full_name || 'No customer')}
              • ${escapeHtml(assessment.assessment_date || '')}
            </p>
            <p class="muted">
              Score: ${escapeHtml(assessment.home_health_score ?? '—')}
              | Risk: ${escapeHtml(assessment.risk_index ?? '—')}
              | Status: ${escapeHtml(formatStatus(assessment.status || 'draft'))}
            </p>
            <div class="actions">
              <button
                type="button"
                class="dashboard-open-assessment"
                data-id="${assessment.id}">
                Open / Review
              </button>
            </div>
          </div>
        `).join('')
      : '<p>No assessments yet.</p>';

    target.querySelectorAll('.dashboard-open-assessment').forEach(button => {
      button.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('beartrack:open-assessment', {
          detail: { assessmentId: button.dataset.id }
        }));
      });
    });
  }

  function renderWorkOrderSummary() {
    const target = document.getElementById('dashboardWorkOrders');
    if (!target) return;

    const workOrders = getWorkOrders();
    const open = workOrders
      .filter(workOrder => !isComplete(workOrder.status))
      .slice(0, 6);

    target.innerHTML = open.length
      ? open.map(workOrder => `
          <div class="row" data-workorder-id="${workOrder.id}">
            <h3>${escapeHtml(workOrder.title || 'Work Order')}</h3>
            <div>
              Property: ${escapeHtml(workOrder.properties?.address || '—')}<br>
              Status: ${escapeHtml(formatStatus(workOrder.status))}
              | Priority: ${escapeHtml(formatStatus(workOrder.priority))}<br>
              <span class="muted">${escapeHtml(workOrder.description || '')}</span>
            </div>
            <div class="actions">
              <button
                type="button"
                class="dashboard-open-workorder"
                data-id="${workOrder.id}">
                Open
              </button>
            </div>
          </div>
        `).join('')
      : '<p>No open work orders.</p>';

    target.querySelectorAll('.dashboard-open-workorder').forEach(button => {
      button.addEventListener('click', () => {
        const workOrder = window.BearTrackWorkOrders?.getById?.(button.dataset.id);

        document.dispatchEvent(new CustomEvent('beartrack:edit-workorder', {
          detail: { workOrder }
        }));
      });
    });
  }

  function renderOperationalSummary() {
    const target = document.getElementById('dashboardOperationalSummary');
    if (!target) return;

    const workOrders = getWorkOrders();
    const today = new Date().toISOString().slice(0, 10);

    const scheduledToday = workOrders.filter(workOrder =>
      workOrder.scheduled_date === today &&
      !isComplete(workOrder.status)
    ).length;

    const emergencies = workOrders.filter(workOrder =>
      String(workOrder.priority || '').toLowerCase() === 'emergency' &&
      !isComplete(workOrder.status)
    ).length;

    const completed = workOrders.filter(workOrder =>
      isComplete(workOrder.status)
    ).length;

    target.innerHTML = `
      <div class="row">
        <h3>Operations Snapshot</h3>
        <div>
          Scheduled today: <strong>${scheduledToday}</strong><br>
          Emergency items: <strong>${emergencies}</strong><br>
          Completed work orders: <strong>${completed}</strong>
        </div>
      </div>
    `;
  }

  async function refresh() {
    try {
      await loadAssessments();
      render();

      document.dispatchEvent(new CustomEvent('beartrack:dashboard-refreshed'));
    } catch (error) {
      console.error('Dashboard refresh failed:', error);

      document.dispatchEvent(new CustomEvent('beartrack:error', {
        detail: {
          message: error.message || 'Dashboard refresh failed.'
        }
      }));
    }
  }

  function getAssessmentById(id) {
    return assessments.find(assessment => assessment.id === id) || null;
  }

  function isComplete(status) {
    return String(status || '').toLowerCase() === 'complete';
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function formatStatus(value) {
    return String(value || '')
      .replaceAll('_', ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  [
    'beartrack:customers-loaded',
    'beartrack:properties-loaded',
    'beartrack:workorders-loaded',
    'beartrack:workorder-changed'
  ].forEach(eventName => {
    document.addEventListener(eventName, render);
  });

  window.BearTrackDashboard = {
    refresh,
    render,
    loadAssessments,
    getAssessmentById,
    getAssessments: () => [...assessments]
  };
})();

