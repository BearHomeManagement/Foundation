// ============================================
// BearTrack Properties Module
// Property CRUD, property list, and property-file helpers
// ============================================

(() => {
  'use strict';

  let properties = [];

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
    if (!list) return;

    list.innerHTML = properties.length
      ? properties.map(property => `
          <div class="row" data-property-id="${property.id}">
            <h3>${escapeHtml(property.address)}</h3>
            <div>
              ${escapeHtml(formatLocation(property))}<br>
              Owner: ${escapeHtml(property.customers?.full_name || '—')}<br>
              <span class="muted">${escapeHtml(property.notes)}</span>
            </div>
            <div class="actions">
              <button type="button" class="open-property-file" data-id="${property.id}">
                Open Property File
              </button>
              <button type="button" class="edit-property" data-id="${property.id}">
                Edit
              </button>
            </div>
          </div>
        `).join('')
      : '<p>No properties yet.</p>';

    list.querySelectorAll('.edit-property').forEach(button => {
      button.addEventListener('click', () => {
        const property = getById(button.dataset.id);

        document.dispatchEvent(new CustomEvent('beartrack:edit-property', {
          detail: { property }
        }));
      });
    });

    list.querySelectorAll('.open-property-file').forEach(button => {
      button.addEventListener('click', () => {
        const property = getById(button.dataset.id);

        document.dispatchEvent(new CustomEvent('beartrack:open-property-file', {
          detail: { property }
        }));
      });
    });
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

