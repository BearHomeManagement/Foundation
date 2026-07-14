// ============================================
// BearTrack Employees Module
// Cloud-backed employee management
// ============================================

(() => {
  'use strict';

  let employees = [];
  let currentEmployee = null;

  const ROLE_LABELS = {
    owner_admin: 'Owner / Administrator',
    operations_manager: 'Operations Manager',
    operations_staff: 'Operations Staff',
    lead_technician: 'Lead Technician',
    technician: 'Technician'
  };

  const STATUS_LABELS = {
    active: 'Active',
    inactive: 'Inactive',
    on_leave: 'On Leave',
    terminated: 'Terminated'
  };

  function normalize(row) {
    return {
      id: row.id,
      auth_user_id: row.auth_user_id || null,
      first_name: row.first_name || '',
      last_name: row.last_name || '',
      email: row.email || '',
      phone: row.phone || '',
      role: row.role || 'technician',
      employment_status: row.employment_status || 'active',
      hire_date: row.hire_date || null,
      termination_date: row.termination_date || null,
      pay_type: row.pay_type || '',
      pay_rate: row.pay_rate ?? null,
      emergency_contact_name: row.emergency_contact_name || '',
      emergency_contact_phone: row.emergency_contact_phone || '',
      notes: row.notes || '',
      created_at: row.created_at || null,
      updated_at: row.updated_at || null
    };
  }

  async function load() {
    const rows = await window.BearTrackDB.select('employees', {
      columns: '*',
      orderBy: 'last_name',
      ascending: true
    });

    employees = (rows || []).map(normalize);
    render();

    document.dispatchEvent(new CustomEvent('beartrack:employees-loaded', {
      detail: { employees: [...employees] }
    }));

    return employees;
  }

  function render() {
    const host = document.getElementById('employeeList');
    if (!host) return;

    if (!employees.length) {
      host.innerHTML = `
        <div class="dashboard-empty">
          No employees have been added yet.
        </div>
      `;
      bindPageActions();
      return;
    }

    host.innerHTML = `
      <div style="display:grid;gap:12px">
        ${employees.map(employee => `
          <article class="record-card" data-employee-id="${escapeHtml(employee.id)}">
            <div style="display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap">
              <div>
                <h4>${escapeHtml(fullName(employee))}</h4>
                <p>${escapeHtml(ROLE_LABELS[employee.role] || employee.role)}</p>
              </div>
              <span class="status ${statusClass(employee.employment_status)}">
                ${escapeHtml(STATUS_LABELS[employee.employment_status] || employee.employment_status)}
              </span>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;color:var(--muted)">
              <span>${escapeHtml(employee.email || 'No email')}</span>
              <span>${escapeHtml(employee.phone || 'No phone')}</span>
              <span>Hired: ${escapeHtml(formatDate(employee.hire_date) || '—')}</span>
            </div>

            <div class="actions" style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn edit-employee" type="button" data-id="${escapeHtml(employee.id)}">Edit</button>
              ${employee.employment_status === 'active'
                ? `<button class="btn deactivate-employee" type="button" data-id="${escapeHtml(employee.id)}">Deactivate</button>`
                : `<button class="btn reactivate-employee" type="button" data-id="${escapeHtml(employee.id)}">Reactivate</button>`
              }
              ${employee.employment_status !== 'terminated'
                ? `<button class="btn red terminate-employee" type="button" data-id="${escapeHtml(employee.id)}">Terminate</button>`
                : ''
              }
            </div>
          </article>
        `).join('')}
      </div>
    `;

    bindPageActions();
  }

  function bindPageActions() {
    const addButton = document.getElementById('addEmployeeBtn');
    if (addButton && !addButton.dataset.boundEmployees) {
      addButton.dataset.boundEmployees = 'true';
      addButton.addEventListener('click', () => openModal());
    }

    document.querySelectorAll('.edit-employee').forEach(button => {
      button.onclick = () => {
        const employee = employees.find(item => item.id === button.dataset.id);
        openModal(employee);
      };
    });

    document.querySelectorAll('.deactivate-employee').forEach(button => {
      button.onclick = () => changeStatus(button.dataset.id, 'inactive');
    });

    document.querySelectorAll('.reactivate-employee').forEach(button => {
      button.onclick = () => changeStatus(button.dataset.id, 'active');
    });

    document.querySelectorAll('.terminate-employee').forEach(button => {
      button.onclick = () => terminateEmployee(button.dataset.id);
    });
  }

  function ensureModal() {
    if (document.getElementById('employeeModal')) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal" id="employeeModal">
        <div class="modal-box">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
            <div>
              <h3 id="employeeModalTitle">Hire Employee</h3>
              <p style="margin:-6px 0 16px;color:var(--muted)">Permanent BearTrack employee record</p>
            </div>
            <button class="btn" id="closeEmployeeModal" type="button">Close</button>
          </div>

          <input type="hidden" id="employeeId">

          <div class="form-grid">
            <div class="field">
              <label>First Name</label>
              <input id="employeeFirstName" autocomplete="given-name">
            </div>

            <div class="field">
              <label>Last Name</label>
              <input id="employeeLastName" autocomplete="family-name">
            </div>

            <div class="field">
              <label>Email</label>
              <input id="employeeEmail" type="email" autocomplete="email">
            </div>

            <div class="field">
              <label>Phone</label>
              <input id="employeePhone" type="tel" autocomplete="tel">
            </div>

            <div class="field">
              <label>Role</label>
              <select id="employeeRole">
                <option value="owner_admin">Owner / Administrator</option>
                <option value="operations_manager">Operations Manager</option>
                <option value="operations_staff">Operations Staff</option>
                <option value="lead_technician">Lead Technician</option>
                <option value="technician">Technician</option>
              </select>
            </div>

            <div class="field">
              <label>Employment Status</label>
              <select id="employeeStatus">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>

            <div class="field">
              <label>Hire Date</label>
              <input id="employeeHireDate" type="date">
            </div>

            <div class="field">
              <label>Termination Date</label>
              <input id="employeeTerminationDate" type="date">
            </div>

            <div class="field">
              <label>Pay Type</label>
              <select id="employeePayType">
                <option value="">Not entered</option>
                <option value="hourly">Hourly</option>
                <option value="salary">Salary</option>
                <option value="contract">Contract</option>
              </select>
            </div>

            <div class="field">
              <label>Pay Rate</label>
              <input id="employeePayRate" type="number" min="0" step="0.01">
            </div>

            <div class="field">
              <label>Emergency Contact</label>
              <input id="employeeEmergencyName">
            </div>

            <div class="field">
              <label>Emergency Contact Phone</label>
              <input id="employeeEmergencyPhone" type="tel">
            </div>

            <div class="field" style="grid-column:1/-1">
              <label>Notes</label>
              <textarea id="employeeNotes"></textarea>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">
            <button class="btn" id="cancelEmployeeModal" type="button">Cancel</button>
            <button class="btn gold" id="saveEmployeeBtn" type="button">Save Employee</button>
          </div>
        </div>
      </div>
    `);

    const modal = document.getElementById('employeeModal');
    const close = () => modal.classList.remove('show');

    document.getElementById('closeEmployeeModal').onclick = close;
    document.getElementById('cancelEmployeeModal').onclick = close;
    modal.addEventListener('click', event => {
      if (event.target === modal) close();
    });

    document.getElementById('saveEmployeeBtn').onclick = saveEmployee;
  }

  function openModal(employee = null) {
    ensureModal();
    currentEmployee = employee;

    setValue('employeeId', employee?.id || '');
    setValue('employeeFirstName', employee?.first_name || '');
    setValue('employeeLastName', employee?.last_name || '');
    setValue('employeeEmail', employee?.email || '');
    setValue('employeePhone', employee?.phone || '');
    setValue('employeeRole', employee?.role || 'technician');
    setValue('employeeStatus', employee?.employment_status || 'active');
    setValue('employeeHireDate', employee?.hire_date || todayIso());
    setValue('employeeTerminationDate', employee?.termination_date || '');
    setValue('employeePayType', employee?.pay_type || '');
    setValue('employeePayRate', employee?.pay_rate ?? '');
    setValue('employeeEmergencyName', employee?.emergency_contact_name || '');
    setValue('employeeEmergencyPhone', employee?.emergency_contact_phone || '');
    setValue('employeeNotes', employee?.notes || '');

    document.getElementById('employeeModalTitle').textContent =
      employee ? `Edit ${fullName(employee)}` : 'Hire Employee';

    document.getElementById('employeeModal').classList.add('show');
  }

  async function saveEmployee() {
    const id = valueOf('employeeId');
    const payload = {
      first_name: valueOf('employeeFirstName').trim(),
      last_name: valueOf('employeeLastName').trim(),
      email: valueOf('employeeEmail').trim().toLowerCase() || null,
      phone: valueOf('employeePhone').trim() || null,
      role: valueOf('employeeRole'),
      employment_status: valueOf('employeeStatus'),
      hire_date: valueOf('employeeHireDate') || null,
      termination_date: valueOf('employeeTerminationDate') || null,
      pay_type: valueOf('employeePayType') || null,
      pay_rate: numberOrNull(valueOf('employeePayRate')),
      emergency_contact_name: valueOf('employeeEmergencyName').trim() || null,
      emergency_contact_phone: valueOf('employeeEmergencyPhone').trim() || null,
      notes: valueOf('employeeNotes').trim() || null
    };

    if (!payload.first_name || !payload.last_name) {
      alert('First and last name are required.');
      return;
    }

    if (payload.employment_status === 'terminated' && !payload.termination_date) {
      alert('Enter a termination date.');
      return;
    }

    try {
      if (id) {
        await window.BearTrackDB.update('employees', id, payload);
      } else {
        await window.BearTrackDB.insert('employees', [payload], {
          single: true
        });
      }

      document.getElementById('employeeModal').classList.remove('show');
      await load();
      window.BearTrackUI?.toast?.(id ? 'Employee updated' : 'Employee hired', 'success');
    } catch (error) {
      alert(error.message || String(error));
    }
  }

  async function changeStatus(id, status) {
    const employee = employees.find(item => item.id === id);
    if (!employee) return;

    const action = status === 'active' ? 'reactivate' : 'deactivate';
    if (!window.confirm(`${capitalize(action)} ${fullName(employee)}?`)) return;

    try {
      await window.BearTrackDB.update('employees', id, {
        employment_status: status,
        termination_date: status === 'active' ? null : employee.termination_date
      });
      await load();
      window.BearTrackUI?.toast?.(`Employee ${status}`, 'success');
    } catch (error) {
      alert(error.message || String(error));
    }
  }

  async function terminateEmployee(id) {
    const employee = employees.find(item => item.id === id);
    if (!employee) return;

    if (!window.confirm(`Terminate ${fullName(employee)}? Their work history will be preserved.`)) return;

    try {
      await window.BearTrackDB.update('employees', id, {
        employment_status: 'terminated',
        termination_date: todayIso()
      });
      await load();
      window.BearTrackUI?.toast?.('Employee terminated; history preserved', 'success');
    } catch (error) {
      alert(error.message || String(error));
    }
  }

  function fullName(employee) {
    return `${employee.first_name} ${employee.last_name}`.trim();
  }

  function statusClass(status) {
    if (status === 'active') return 'InProgress';
    if (status === 'terminated') return 'Complete';
    if (status === 'on_leave') return 'FollowupRequired';
    return 'Unassigned';
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function numberOrNull(value) {
    if (value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function valueOf(id) {
    return document.getElementById(id)?.value || '';
  }

  function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value ?? '';
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  window.BearTrackEmployees = {
    load,
    render,
    openModal,
    getAll: () => [...employees],
    getActive: () => employees.filter(employee => employee.employment_status === 'active'),
    getById: id => employees.find(employee => employee.id === id) || null
  };
})();
