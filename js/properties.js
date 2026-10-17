// ============================================
// BearTrack Properties Module
// Property CRUD, property list, and property-file helpers
// ============================================

(() => {
  'use strict';

  let properties = [];

  let homesSearchTerm = '';
  let activePropertyId = null;
  let activeHomeTab = 'details';

  function normalize(property) {
    return {
      id: property.id,
      customer_id: property.customer_id || null,
      address: property.address || '',
      city: property.city || '',
      state: property.state || '',
      zip: property.zip || '',
      year_built: property.year_built ?? null,
      square_feet: property.square_feet ?? null,
      property_type: property.property_type || '',
      notes: property.notes || '',
      customers: property.customers || null,
      created_at: property.created_at || null
    };
  }

  function getById(id) {
    return properties.find(property => property.id === id) || null;
  }

  function getByCustomerId(customerId) {
    return properties.filter(property => property.customer_id === customerId);
  }

  async function load() {
    const rows = await window.BearTrackDB.select('properties', {
      columns: '*, customers(*)',
      orderBy: 'created_at',
      ascending: false
    });

    properties = (rows || []).map(normalize);
    render();
    populateAssessmentSelect();

    document.dispatchEvent(new CustomEvent('beartrack:properties-loaded', {
      detail: { properties: [...properties] }
    }));

    return properties;
  }

  async function create(payload) {
    const record = buildPayload(payload);

    if (!record.address) {
      throw new Error('Property address is required.');
    }

    const saved = await window.BearTrackDB.insert('properties', [record], {
      single: true,
      columns: '*, customers(*)'
    });

    properties.unshift(normalize(saved));
    render();
    populateAssessmentSelect();
    return saved;
  }

  async function update(id, payload) {
    const record = buildPayload(payload);

    if (!record.address) {
      throw new Error('Property address is required.');
    }

    const saved = await window.BearTrackDB.update('properties', id, record);
    const index = properties.findIndex(property => property.id === id);

    if (index >= 0) {
      properties[index] = normalize({
        ...properties[index],
        ...saved
      });
    }

    render();
    populateAssessmentSelect();
    return saved;
  }

  async function remove(id) {
    await window.BearTrackDB.remove('properties', id);
    properties = properties.filter(property => property.id !== id);
    render();
    populateAssessmentSelect();
  }

  function buildPayload(payload) {
    return {
      customer_id: payload.customer_id || null,
      address: String(payload.address || '').trim(),
      city: String(payload.city || '').trim() || null,
      state: String(payload.state || '').trim() || null,
      zip: String(payload.zip || '').trim() || null,
      year_built: toNumberOrNull(payload.year_built),
      square_feet: toNumberOrNull(payload.square_feet),
      property_type: String(payload.property_type || '').trim() || null,
      notes: String(payload.notes || '').trim() || null
    };
  }

  
  function render() {
    const list = document.getElementById('propertyList');
    const dashboard = document.getElementById('homesDashboard');
    const propertyFile = document.getElementById('homePropertyFile');
    const search = document.getElementById('homesSearch');

    if (!list || !dashboard || !propertyFile) return;

    const workOrders = window.BearTrackWorkOrders?.getAll?.() || [];
    const assessments = window.BearTrackAssessments?.getAll?.() || [];

    const setCount = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };

    setCount('homesTotal', properties.length);
    setCount('homesOpenWorkOrders',
      workOrders.filter(item =>
        String(item.status || '').toLowerCase() !== 'complete'
      ).length
    );
    setCount('homesInspections', assessments.length);

    // Membership-to-property association is not yet verified.
    setCount('homesMemberships', '—');

    if (search && !search.dataset.boundHomes) {
      search.dataset.boundHomes = 'true';
      search.addEventListener('input', () => {
        homesSearchTerm = search.value.trim().toLowerCase();
        render();
      });
    }

    const filtered = properties.filter(property => {
      const searchable = [
        property.id,
        property.address,
        property.city,
        property.state,
        property.zip,
        property.customers?.full_name
      ].join(' ').toLowerCase();

      return searchable.includes(homesSearchTerm);
    });

    list.innerHTML = filtered.length
      ? filtered.map(property => {
          const propertyWorkOrders = workOrders.filter(
            item => item.property_id === property.id
          );

          const propertyInspections = assessments.filter(
            item => item.property_id === property.id
          );

          return `
            <div class="row" data-property-id="${escapeHtml(property.id)}">
              <h3>${escapeHtml(property.address)}</h3>
              <div>
                ${escapeHtml(formatLocation(property))}<br>
                Owner: ${escapeHtml(property.customers?.full_name || '—')}<br>
                Work Orders: ${propertyWorkOrders.length}
                | Inspections: ${propertyInspections.length}
              </div>
              <div class="actions">
                <button type="button" class="open-property-file"
                  data-id="${escapeHtml(property.id)}">
                  Open Property File
                </button>
              </div>
            </div>
          `;
        }).join('')
      : '<p class="muted">No matching homes found.</p>';

    list.querySelectorAll('.open-property-file').forEach(button => {
      button.addEventListener('click', () => {
        activePropertyId = button.dataset.id;
        activeHomeTab = 'details';
        render();
      });
    });

    const backButton = document.getElementById('backToHomes');
    if (backButton) {
      backButton.onclick = () => {
        activePropertyId = null;
        render();
      };
    }

    if (!activePropertyId) {
      dashboard.classList.remove('hidden');
      propertyFile.classList.add('hidden');
      return;
    }

    const property = getById(activePropertyId);

    if (!property) {
      activePropertyId = null;
      dashboard.classList.remove('hidden');
      propertyFile.classList.add('hidden');
      return;
    }

    dashboard.classList.add('hidden');
    propertyFile.classList.remove('hidden');

    const header = document.getElementById('homePropertyHeader');

    if (header) {
      header.innerHTML = `
        <h2>${escapeHtml(property.address)}</h2>
        <p>${escapeHtml(formatLocation(property))}</p>
        <p><strong>Owner:</strong>
          ${escapeHtml(property.customers?.full_name || 'Unassigned')}
        </p>
        <p class="muted">
          Property ID: ${escapeHtml(property.id)}
        </p>
      `;
    }

    const details = document.getElementById('homeDetailsContent');

    if (details) {
      details.innerHTML = `
        <h3>Home Details</h3>
        <div class="form-grid">
          <div class="field">
            <label>Street Address</label>
            <input id="homeEditAddress"
              value="${escapeHtml(property.address)}">
          </div>
          <div class="field">
            <label>City</label>
            <input id="homeEditCity"
              value="${escapeHtml(property.city)}">
          </div>
          <div class="field">
            <label>State</label>
            <input id="homeEditState"
              value="${escapeHtml(property.state)}">
          </div>
          <div class="field">
            <label>ZIP Code</label>
            <input id="homeEditZip"
              value="${escapeHtml(property.zip)}">
          </div>
          <div class="field">
            <label>Year Built</label>
            <input id="homeEditYear" type="number"
              value="${escapeHtml(property.year_built ?? '')}">
          </div>
          <div class="field">
            <label>Square Footage</label>
            <input id="homeEditSqft" type="number"
              value="${escapeHtml(property.square_feet ?? '')}">
          </div>
          <div class="field">
            <label>Property Type</label>
            <input id="homeEditType"
              value="${escapeHtml(property.property_type)}">
          </div>
          <div class="field" style="grid-column:1/-1">
            <label>Property Notes</label>
            <textarea id="homeEditNotes" rows="4">${escapeHtml(property.notes)}</textarea>
          </div>
        </div>
        <button type="button" class="btn gold" id="saveHomeDetails"
          style="margin-top:16px">
          Save Home Details
        </button>
      `;

      const saveButton = document.getElementById('saveHomeDetails');

      saveButton.onclick = async () => {
        const field = id => document.getElementById(id)?.value || '';

        try {
          await update(property.id, {
            customer_id: property.customer_id,
            address: field('homeEditAddress'),
            city: field('homeEditCity'),
            state: field('homeEditState'),
            zip: field('homeEditZip'),
            year_built: field('homeEditYear'),
            square_feet: field('homeEditSqft'),
            property_type: field('homeEditType'),
            notes: field('homeEditNotes')
          });

          document.dispatchEvent(new CustomEvent('beartrack:toast', {
            detail: { message: 'Home details saved' }
          }));
        } catch (error) {
          alert(error.message || String(error));
        }
      };
    }

    const propertyWorkOrders = workOrders.filter(
      item => item.property_id === property.id
    );

    const workOrdersContent =
      document.getElementById('homeWorkOrdersContent');

    if (workOrdersContent) {
      workOrdersContent.innerHTML = `
        <h3>Work Orders (${propertyWorkOrders.length})</h3>
        ${propertyWorkOrders.length
          ? propertyWorkOrders.map(item => `
              <div class="row">
                <h3>${escapeHtml(item.title)}</h3>
                <p>
                  Status: ${escapeHtml(item.status)}
                  | Priority: ${escapeHtml(item.priority)}
                </p>
                <p class="muted">
                  ${escapeHtml(item.description)}
                </p>
                <button type="button" class="home-open-workorder"
                  data-id="${escapeHtml(item.id)}">
                  Open Work Order
                </button>
              </div>
            `).join('')
          : '<p class="muted">No work orders for this home.</p>'}
      `;

      workOrdersContent.querySelectorAll('.home-open-workorder')
        .forEach(button => {
          button.onclick = () => {
            const workOrder =
              window.BearTrackWorkOrders?.getById?.(button.dataset.id);

            if (workOrder) {
              window.BearTrackWorkOrders.openWorkOrderModal(workOrder);
            }
          };
        });
    }

    const propertyInspections = assessments.filter(
      item => item.property_id === property.id
    );

    const inspectionsContent =
      document.getElementById('homeInspectionsContent');

    if (inspectionsContent) {
      inspectionsContent.innerHTML = `
        <h3>Inspection History (${propertyInspections.length})</h3>
        ${propertyInspections.length
          ? propertyInspections.map(item => `
              <div class="row">
                <h3>${escapeHtml(item.assessment_type)}</h3>
                <p>
                  Date: ${escapeHtml(item.assessment_date || '—')}
                  | Status: ${escapeHtml(item.status)}
                </p>
                <p>
                  Home Health Score:
                  ${escapeHtml(item.home_health_score ?? '—')}
                  | Risk: ${escapeHtml(item.risk_index)}
                </p>
                <button type="button" class="home-open-inspection"
                  data-id="${escapeHtml(item.id)}">
                  Open Inspection
                </button>
              </div>
            `).join('')
          : '<p class="muted">No inspections for this home.</p>'}
      `;

      inspectionsContent.querySelectorAll('.home-open-inspection')
        .forEach(button => {
          button.onclick = () => {
            const assessment =
              window.BearTrackAssessments?.getById?.(button.dataset.id);

            if (assessment) {
              document.dispatchEvent(
                new CustomEvent('beartrack:open-assessment', {
                  detail: {
                    assessmentId: assessment.id,
                    assessment
                  }
                })
              );
            }
          };
        });
    }

    const membershipContent =
      document.getElementById('homeMembershipContent');

    if (membershipContent) {
      const memberships =
        window.BearTrackMemberships?.getAll?.() || [];

      const linked = memberships.filter(item =>
        item.property_id === property.id
      );

      membershipContent.innerHTML = `
        <h3>Service Tier</h3>
        ${linked.length
          ? linked.map(item => `
              <div class="row">
                <h3>${escapeHtml(
                  item.name || item.membership_interest || 'Membership'
                )}</h3>
                <p>Status: ${escapeHtml(item.status || 'Not specified')}</p>
              </div>
            `).join('')
          : `<p class="muted">
              No property-linked membership found.
              Membership association requires verification.
            </p>`}
      `;
    }

    const tabContents = {
      details: 'homeDetailsContent',
      workorders: 'homeWorkOrdersContent',
      inspections: 'homeInspectionsContent',
      membership: 'homeMembershipContent'
    };

    const showHomeTab = tab => {
      activeHomeTab = tab;

      Object.entries(tabContents).forEach(([name, id]) => {
        const element = document.getElementById(id);
        if (element) {
          element.classList.toggle('hidden', name !== tab);
        }
      });

      document.querySelectorAll('#homeFileTabs [data-home-tab]')
        .forEach(button => {
          button.classList.toggle(
            'active',
            button.dataset.homeTab === tab
          );
        });
    };

    document.querySelectorAll('#homeFileTabs [data-home-tab]')
      .forEach(button => {
        button.onclick = () => showHomeTab(button.dataset.homeTab);
      });

    showHomeTab(activeHomeTab);
  }

  function populateCustomerSelect() {
    const select = document.getElementById('propertyCustomer');
    if (!select || !window.BearTrackCustomers) return;

    const customers = window.BearTrackCustomers.getAll();

    select.innerHTML = customers
      .map(customer => `
        <option value="${customer.id}">
          ${escapeHtml(customer.full_name)}
        </option>
      `)
      .join('');
  }

  function populateAssessmentSelect() {
    const select = document.getElementById('assessmentProperty');
    if (!select) return;

    select.innerHTML = properties
      .map(property => `
        <option value="${property.id}">
          ${escapeHtml(property.address)}
        </option>
      `)
      .join('');
  }

  function fillForm(property) {
    if (!property) return;

    setValue('propertyId', property.id);
    setValue('propertyCustomer', property.customer_id || '');
    setValue('propertyAddress', property.address || '');
    setValue('propertyCity', property.city || '');
    setValue('propertyState', property.state || '');
    setValue('propertyZip', property.zip || '');
    setValue('propertyYear', property.year_built || '');
    setValue('propertySqft', property.square_feet || '');
    setValue('propertyType', property.property_type || '');
    setValue('propertyNotes', property.notes || '');
  }

  function clearForm() {
    [
      'propertyId',
      'propertyAddress',
      'propertyCity',
      'propertyZip',
      'propertyYear',
      'propertySqft',
      'propertyType',
      'propertyNotes'
    ].forEach(id => setValue(id, ''));

    setValue('propertyState', 'FL');
  }

  function readForm() {
    return {
      customer_id: valueOf('propertyCustomer'),
      address: valueOf('propertyAddress'),
      city: valueOf('propertyCity'),
      state: valueOf('propertyState'),
      zip: valueOf('propertyZip'),
      year_built: valueOf('propertyYear'),
      square_feet: valueOf('propertySqft'),
      property_type: valueOf('propertyType'),
      notes: valueOf('propertyNotes')
    };
  }

  function bindForm() {
    const saveButton = document.getElementById('savePropertyBtn');
    const clearButton = document.getElementById('clearPropertyBtn');

    if (saveButton && !saveButton.dataset.boundProperties) {
      saveButton.dataset.boundProperties = 'true';

      saveButton.addEventListener('click', async () => {
        try {
          const id = valueOf('propertyId');
          const payload = readForm();

          if (id) {
            await update(id, payload);
          } else {
            await create(payload);
          }

          clearForm();
          document.dispatchEvent(new CustomEvent('beartrack:toast', {
            detail: { message: 'Property saved' }
          }));
        } catch (error) {
          alert(error.message || String(error));
        }
      });
    }

    if (clearButton && !clearButton.dataset.boundProperties) {
      clearButton.dataset.boundProperties = 'true';
      clearButton.addEventListener('click', clearForm);
    }
  }

  function formatLocation(property) {
    return [property.city, property.state, property.zip]
      .filter(Boolean)
      .join(', ');
  }

  function valueOf(id) {
    return document.getElementById(id)?.value || '';
  }

  function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value ?? '';
  }

  function toNumberOrNull(value) {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  document.addEventListener('beartrack:customers-loaded', () => {
    populateCustomerSelect();
  });

  document.addEventListener('beartrack:edit-property', event => {
    fillForm(event.detail.property);
  });

  window.BearTrackProperties = {
    load,
    create,
    update,
    remove,
    render,
    bindForm,
    fillForm,
    clearForm,
    readForm,
    populateCustomerSelect,
    populateAssessmentSelect,
    getById,
    getByCustomerId,
    getAll: () => [...properties]
  };
})();

