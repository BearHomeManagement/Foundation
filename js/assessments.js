// ============================================
// BearTrack Assessments Module
// Assessment loading, creation, review, and summary helpers
// ============================================

(() => {
  'use strict';

  let assessments = [];

  function normalize(assessment) {
    return {
      id: assessment.id,
      property_id: assessment.property_id || null,
      technician: assessment.technician || '',
      assessment_date: assessment.assessment_date || null,
      assessment_type: assessment.assessment_type || 'Home Health Assessment',
      status: assessment.status || 'draft',
      home_health_score: assessment.home_health_score ?? 100,
      risk_index: assessment.risk_index || 'Low',
      estimated_hours: assessment.estimated_hours ?? 0,
      summary: assessment.summary || '',
      created_at: assessment.created_at || null,
      properties: assessment.properties || null
    };
  }

  function getById(id) {
    return assessments.find(assessment => assessment.id === id) || null;
  }

  function getByPropertyId(propertyId) {
    return assessments.filter(assessment => assessment.property_id === propertyId);
  }

  async function load() {
    const rows = await window.BearTrackDB.select('assessments', {
      columns: '*, properties(*, customers(*))',
      orderBy: 'created_at',
      ascending: false
    });

    assessments = (rows || []).map(normalize);
    render();

    document.dispatchEvent(new CustomEvent('beartrack:assessments-loaded', {
      detail: { assessments: [...assessments] }
    }));

    return assessments;
  }

  async function create(propertyId, technician = '') {
    if (!propertyId) {
      throw new Error('Property is required to start an assessment.');
    }

    const record = {
      property_id: propertyId,
      technician: technician || null,
      assessment_date: new Date().toISOString().slice(0, 10),
      assessment_type: 'Home Health Assessment',
      status: 'draft',
      home_health_score: 100,
      risk_index: 'Low',
      estimated_hours: 0
    };

    const saved = await window.BearTrackDB.insert('assessments', [record], {
      single: true,
      columns: '*, properties(*, customers(*))'
    });

    assessments.unshift(normalize(saved));
    render();

    document.dispatchEvent(new CustomEvent('beartrack:assessment-created', {
      detail: { assessment: saved }
    }));

    return saved;
  }

  async function update(id, payload) {
    const saved = await window.BearTrackDB.update('assessments', id, {
      ...payload
    });

    const index = assessments.findIndex(assessment => assessment.id === id);

    if (index >= 0) {
      assessments[index] = normalize({
        ...assessments[index],
        ...saved
      });
    }

    render();

    document.dispatchEvent(new CustomEvent('beartrack:assessment-updated', {
      detail: { assessment: saved }
    }));

    return saved;
  }

  async function complete(id, summary = '') {
    return update(id, {
      status: 'complete',
      summary: summary || null
    });
  }

  async function remove(id) {
    await window.BearTrackDB.remove('assessments', id);
    assessments = assessments.filter(assessment => assessment.id !== id);
    render();

    document.dispatchEvent(new CustomEvent('beartrack:assessment-deleted', {
      detail: { assessmentId: id }
    }));
  }

  function render() {
    const list = document.getElementById('assessmentList');
    const dashboard = document.getElementById('dashboardAssessments');
    const html = renderRows();

    if (list) list.innerHTML = html;
    if (dashboard) dashboard.innerHTML = html;

    bindActions(list);
    bindActions(dashboard);
  }

  function renderRows() {
    if (!assessments.length) return '<p>No assessments yet.</p>';

    return assessments.map(assessment => `
      <div class="assessment-row" data-assessment-id="${assessment.id}">
        <h3>${escapeHtml(assessment.properties?.address || 'No address')}</h3>
        <p>
          ${escapeHtml(assessment.properties?.customers?.full_name || 'No customer')}
          • ${escapeHtml(assessment.assessment_date || '')}
        </p>
        <p class="muted">
          Score: ${escapeHtml(assessment.home_health_score ?? '—')}
          | Risk: ${escapeHtml(assessment.risk_index ?? '—')}
          | Status: ${escapeHtml(formatStatus(assessment.status))}
        </p>
        <div class="actions">
          <button
            type="button"
            class="open-assessment"
            data-id="${assessment.id}">
            Open / Review
          </button>
          <button
            type="button"
            class="delete-assessment danger"
            data-id="${assessment.id}">
            Delete
          </button>
        </div>
      </div>
    `).join('');
  }

  function bindActions(container) {
    if (!container) return;

    container.querySelectorAll('.open-assessment').forEach(button => {
      button.addEventListener('click', () => {
        const assessment = getById(button.dataset.id);

        document.dispatchEvent(new CustomEvent('beartrack:open-assessment', {
          detail: {
            assessmentId: button.dataset.id,
            assessment
          }
        }));
      });
    });

    container.querySelectorAll('.delete-assessment').forEach(button => {
      button.addEventListener('click', async () => {
        if (!confirm('Delete this assessment?')) return;

        try {
          await remove(button.dataset.id);

          document.dispatchEvent(new CustomEvent('beartrack:toast', {
            detail: { message: 'Assessment deleted' }
          }));
        } catch (error) {
          alert(error.message || String(error));
        }
      });
    });
  }

  function populatePropertySelect() {
    const select = document.getElementById('assessmentProperty');
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

  function bindStartButtons() {
    const startButton = document.getElementById('startAssessmentBtn');

    if (startButton && !startButton.dataset.boundAssessments) {
      startButton.dataset.boundAssessments = 'true';

      startButton.addEventListener('click', async () => {
        try {
          const propertyId =
            document.getElementById('assessmentProperty')?.value || '';
          const technician =
            document.getElementById('assessmentTech')?.value || '';

          const assessment = await create(propertyId, technician);

          document.dispatchEvent(new CustomEvent('beartrack:open-assessment', {
            detail: {
              assessmentId: assessment.id,
              assessment
            }
          }));

          document.dispatchEvent(new CustomEvent('beartrack:toast', {
            detail: { message: 'Assessment started' }
          }));
        } catch (error) {
          alert(error.message || String(error));
        }
      });
    }
  }

  function calculateSummary(items = []) {
    const risk = items.reduce(
      (total, item) => total + (Number(item.risk_points) || 0),
      0
    );

    const estimatedHours = items.reduce(
      (total, item) => total + (Number(item.estimated_hours) || 0),
      0
    );

    const score = Math.max(0, 100 - risk);
    const riskIndex =
      risk <= 8 ? 'Low' :
      risk <= 20 ? 'Moderate' :
      'High';

    const workOrdersRecommended = items.filter(
      item => item.work_order_needed
    ).length;

    return {
      risk,
      estimatedHours,
      score,
      riskIndex,
      workOrdersRecommended
    };
  }

  function generateReportText(assessment, items = [], propertyAddress = '') {
    const summary = calculateSummary(items);

    let text = `BearTrack™ Home Health Assessment
Prepared by Bear Home Management

Property: ${propertyAddress || assessment?.properties?.address || ''}

Home Health Score: ${summary.score}
Risk Index: ${summary.riskIndex}
Estimated Home Care Hours: ${summary.estimatedHours.toFixed(1)}
Work Orders Recommended: ${summary.workOrdersRecommended}

Findings:
`;

    items
      .filter(item => String(item.status || '').toLowerCase() !== 'good')
      .forEach(item => {
        text += `
[${item.status || 'Finding'}] ${item.title || ''}
Observation: ${item.observation || 'No observation entered.'}
Why it matters: ${item.homeowner_education || ''}
Recommendation: ${item.recommendation || ''}
Cost range: ${item.cost_range || 'TBD'}
`;
      });

    return text;
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

  async function loadActiveTemplate() {
  const templates = await window.BearTrackDB.select('assessment_templates', {
    columns: '*',
    orderBy: 'version',
    ascending: false
  });

  const activeTemplate = (templates || []).find(
    template => template.status === 'active'
  );

  if (!activeTemplate) {
    throw new Error('No active assessment template found.');
  }

  const categories = await window.BearTrackDB.select(
    'assessment_template_categories',
    {
      columns: '*',
      orderBy: 'sort_order',
      ascending: true,
      filters: {
        template_id: activeTemplate.id
      }
    }
  );

  const items = await window.BearTrackDB.select(
    'assessment_template_items',
    {
      columns: '*',
      orderBy: 'sort_order',
      ascending: true
    }
  );

  const categoryIds = new Set(
    (categories || []).map(category => category.id)
  );

  return {
    template: activeTemplate,
    categories: categories || [],
    items: (items || []).filter(
      item => categoryIds.has(item.category_id)
    )
  };
}

function renderAssessmentTemplate(data) {
  const target =
    document.getElementById('assessmentTemplateContent');

  if (!target) return;

  const { template, categories, items } = data;

  target.innerHTML = `
  ${window.BearTrackPrint?.renderHeader?.(
    'Bear Home Health Assessment',
    `Version ${template.version} • ${template.status === 'active' ? 'Active Template' : template.status}`
  ) || ''}

  <div class="bhm-template-meta">
    <strong>${escapeHtml(template.name)}</strong>
    <span class="muted">
      — Version ${escapeHtml(template.version)}
    </span>
  </div>

    ${categories.map(category => {
      const categoryItems = items
        .filter(item => item.category_id === category.id)
        .sort((a, b) =>
          (Number(a.sort_order) || 0) -
          (Number(b.sort_order) || 0)
        );

      return `
        <div
          class="panel"
          style="margin-bottom:14px;padding:16px;">

          <h3 style="margin-top:0;">
            ${escapeHtml(category.name)}
          </h3>

          ${categoryItems.map(item => `
            <div
              style="
                padding:12px 0;
                border-top:1px solid rgba(255,255,255,.08);
              ">

              <strong>${escapeHtml(item.title)}</strong>

              ${
                item.technician_instruction
                  ? `
                    <p class="muted">
                      <strong>Technician:</strong>
                      ${escapeHtml(item.technician_instruction)}
                    </p>
                  `
                  : ''
              }

              ${
                item.homeowner_education
                  ? `
                    <p>
                      <strong>Why it matters:</strong>
                      ${escapeHtml(item.homeowner_education)}
                    </p>
                  `
                  : ''
              }

              ${
                item.default_recommendation
                  ? `
                    <p>
                      <strong>Recommendation:</strong>
                      ${escapeHtml(item.default_recommendation)}
                    </p>
                  `
                  : ''
              }

              <p class="muted">
                ${
                  item.require_photo_if_deficient
                    ? 'Photo required when deficient'
                    : 'Photo optional'
                }
                •
                ${
                  item.allow_notes
                    ? 'Notes allowed'
                    : 'Notes disabled'
                }
              </p>

            </div>
          `).join('')}
          
        </div>
      `
    }).join('')}
    
  ${window.BearTrackPrint?.renderFooter?.() || ''}
`;
}

async function openAssessmentTemplateManager() {
  const manager =
    document.getElementById('assessmentTemplateManager');

  const target =
    document.getElementById('assessmentTemplateContent');

  if (!manager || !target) return;

  manager.style.display = 'block';

  target.innerHTML =
    '<p class="muted">Loading assessment template...</p>';

  try {
    const data = await loadActiveTemplate();
    renderAssessmentTemplate(data);
  } catch (error) {
    target.innerHTML = `
      <div class="error-box">
        ${escapeHtml(error.message || String(error))}
      </div>
    `;
  }
}

function bindTemplateManager() {
  const viewButton =
    document.getElementById('viewAssessmentTemplateBtn');

  if (viewButton && !viewButton.dataset.boundTemplateManager) {
    viewButton.dataset.boundTemplateManager = 'true';

    viewButton.addEventListener(
      'click',
      openAssessmentTemplateManager
    );
  }

  const printButton =
    document.getElementById('printAssessmentTemplateBtn');

  if (printButton && !printButton.dataset.boundTemplatePrint) {
    printButton.dataset.boundTemplatePrint = 'true';

    printButton.addEventListener('click', () => {
      window.print();
    });
  }
}
  
  document.addEventListener('beartrack:properties-loaded', () => {
    populatePropertySelect();
  });

  window.BearTrackAssessments = {
    load,
    create,
    update,
    complete,
    remove,
    render,
    bindStartButtons,
    populatePropertySelect,
    calculateSummary,
    generateReportText,
    getById,
    getByPropertyId,
    bindTemplateManager,
    loadActiveTemplate,
    renderAssessmentTemplate,
    getAll: () => [...assessments]
  };
})();

