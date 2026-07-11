// ============================================
// BearTrack App Bootstrap
// ============================================

(() => {
  'use strict';

  const titles = {
    dashboard: ['Dashboard', 'BearTrack home base.'],
    customers: ['Customers', 'Manage customer records.'],
    properties: ['Homes', 'Manage permanent property records.'],
    workorders: ['Work Orders', 'Create, schedule, and complete work.'],
    assessments: ['Assessments', 'Home Health Assessment workflow.'],
    memberships: ['Memberships', 'Plans, Home Care Hours, families, and Recovery.'],
    settings: ['Settings', 'BearTrack system status.']
  };

  function setView(view) {
    document.querySelectorAll('.page').forEach(page => {
      page.classList.toggle('active', page.id === view);
    });

    document.querySelectorAll('#nav [data-view]').forEach(button => {
      button.classList.toggle('active', button.dataset.view === view);
    });

    const [title, subtitle] = titles[view] || [view, ''];
    document.getElementById('pageTitle').textContent = title;
    document.getElementById('pageSub').textContent = subtitle;
  }

  function bindNavigation() {
    document.querySelectorAll('#nav [data-view]').forEach(button => {
      button.addEventListener('click', () => setView(button.dataset.view));
    });
  }

  function bindCustomers() {
    const save = document.getElementById('saveCustomerBtn');
    const clear = document.getElementById('clearCustomerBtn');

    save?.addEventListener('click', async () => {
      try {
        const id = document.getElementById('customerId').value;
        const payload = {
          full_name: document.getElementById('customerName').value,
          email: document.getElementById('customerEmail').value,
          phone: document.getElementById('customerPhone').value,
          preferred_contact: document.getElementById('customerPreferred').value,
          status: document.getElementById('customerStatus').value,
          notes: document.getElementById('customerNotes').value
        };

        if (id) await BearTrackCustomers.update(id, payload);
        else await BearTrackCustomers.create(payload);

        clearCustomerForm();
        BearTrackUI.toast('Customer saved', 'success');
        await BearTrackProperties.load();
        BearTrackDashboard.render();
      } catch (error) {
        BearTrackUI.toast(error.message || String(error), 'error', 5000);
      }
    });

    clear?.addEventListener('click', clearCustomerForm);

    document.addEventListener('beartrack:edit-customer', event => {
      const c = event.detail.customer;
      if (!c) return;

      document.getElementById('customerId').value = c.id || '';
      document.getElementById('customerName').value = c.full_name || '';
      document.getElementById('customerEmail').value = c.email || '';
      document.getElementById('customerPhone').value = c.phone || '';
      document.getElementById('customerPreferred').value = c.preferred_contact || 'Text';
      document.getElementById('customerStatus').value = c.status || 'Lead';
      document.getElementById('customerNotes').value = c.notes || '';
      setView('customers');
    });
  }

  function clearCustomerForm() {
    ['customerId','customerName','customerEmail','customerPhone','customerNotes']
      .forEach(id => document.getElementById(id).value = '');
    document.getElementById('customerPreferred').value = 'Text';
    document.getElementById('customerStatus').value = 'Lead';
  }

  async function loadCore() {
    await BearTrackCustomers.load();
    BearTrackProperties.bindForm();
    await BearTrackProperties.load();
    BearTrackWorkOrders.bindForm();
    await BearTrackWorkOrders.load();
    BearTrackAssessments.bindStartButtons();
    await BearTrackAssessments.load();

    try {
      await BearTrackMemberships.load();
    } catch (error) {
      console.warn('Membership module not loaded:', error);
    }

    await BearTrackDashboard.refresh();
  }

  function bindRefresh() {
    document.getElementById('refreshBtn')?.addEventListener('click', async () => {
      try {
        await loadCore();
        BearTrackUI.toast('BearTrack refreshed', 'success');
      } catch (error) {
        BearTrackUI.toast(error.message || String(error), 'error', 5000);
      }
    });
  }

  document.addEventListener('beartrack:auth', async event => {
    if (event.detail.state === 'signed-in') {
      try {
        await loadCore();
      } catch (error) {
        BearTrackUI.toast(error.message || String(error), 'error', 5000);
      }
    }
  });

  document.addEventListener('beartrack:open-assessment', event => {
    BearTrackUI.toast(
      `Assessment ${event.detail.assessmentId} is ready to open in the full inspection editor.`,
      'success',
      4000
    );
  });

  document.addEventListener('beartrack:open-property-file', event => {
    const property = event.detail.property;
    if (!property) return;
    BearTrackUI.toast(`${property.address} selected`, 'success');
  });

  async function init() {
    bindNavigation();
    bindCustomers();
    bindRefresh();
    BearTrackAuth.bind();
    setView('dashboard');

    const session = await BearTrackAuth.checkSession();

    if (session) {
      try {
        await loadCore();
      } catch (error) {
        BearTrackUI.toast(error.message || String(error), 'error', 5000);
      }
    }
  }

  init();
})();
