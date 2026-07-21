// BearTrack application shell - resilient bootstrap
(() => {
  'use strict';

  const navItems = [
    ['dashboard','🏠','Dashboard'],
    ['customers','👥','Customers'],
    ['properties','🏡','Homes'],
    ['workorders','🛠️','Work Orders'],
    ['schedule','📅','Schedule'],
    ['assessments','🛡️','Assessments'],
    ['memberships','🧩','Memberships'],
    ['employees','👷','Employees'],
    ['technicians','👷','Technicians'],
    ['reports','📊','Reports'],
    ['documents','📄','Documents'],
    ['messages','✉️','Messages'],
    ['invoices','💵','Invoices'],
    ['settings','⚙️','Settings']
  ];

  const titles = {
    dashboard:['Good Morning, Harley! 👋',"Here's what's happening with your operations today."],
    customers:['Customers','Manage Bear Home Management customers.'],
    properties:['Homes','Each home has its own BearTrack record.'],
    workorders:['Work Orders','Manage active and completed work.'],
    schedule:['Schedule','Day, week, and month scheduling.'],
    assessments:['Assessments','BearTrack Home Health Assessment workflow.'],
    memberships:['Memberships','Home Care Hours, family accounts, and Recovery.'],
    employees:['Employees','Hire, manage, deactivate, and retain employee history.'],
    technicians:['Technicians','Team status and capacity.'],
    reports:['Reports','Company health and performance.'],
    documents:['Documents','Photos, warranties, reports, and files.'],
    messages:['Messages','Customer calls, emails, and follow-ups.'],
    invoices:['Invoices','Invoice and payment tracking.'],
    settings:['Settings','Company and system settings.']
  };

  let currentPage = 'dashboard';

  function renderNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;

    nav.innerHTML = navItems.map(([id, ico, label]) => `
      <button class="${id === currentPage ? 'active' : ''}" data-page="${id}">
        <span class="ico">${ico}</span>${label}
      </button>
    `).join('');

    nav.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', () => showPage(button.dataset.page));
    });
  }

  function showPage(page) {
    currentPage = page;

    document.querySelectorAll('.page').forEach(el => {
      el.classList.toggle('active', el.id === page);
    });

    const [title, sub] = titles[page] || [page, ''];
    const titleEl = document.getElementById('pageTitle');
    const subEl = document.getElementById('pageSub');

    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = sub;

    renderNav();

    const renderers = {
      dashboard: window.BearTrackDashboard,
      customers: window.BearTrackCustomers,
      properties: window.BearTrackProperties,
      workorders: window.BearTrackWorkOrders,
      assessments: window.BearTrackAssessments,
      memberships: window.BearTrackMemberships,
      employees: window.BearTrackEmployees,
      technicians: window.BearTrackTechnician,
    };

    renderers[page]?.render?.();
  }

  function setClock() {
    const d = new Date();
    const today = document.getElementById('todayText');
    const time = document.getElementById('timeText');

    if (today) {
      today.textContent = d.toLocaleDateString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }

    if (time) {
      time.textContent = d.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit'
      });
    }
  }

  async function safeLoad(name, moduleObject) {
    if (!moduleObject?.load) {
      console.warn(`${name} module is not available.`);
      return;
    }

    try {
      await moduleObject.load();
    } catch (error) {
      console.warn(`${name} module did not load:`, error);
    }
  }

  async function loadCore() {
    await safeLoad('Customers', window.BearTrackCustomers);
    await safeLoad('Properties', window.BearTrackProperties);
    await safeLoad('Work Orders', window.BearTrackWorkOrders);
    await safeLoad('Assessments', window.BearTrackAssessments);
    await safeLoad('Memberships', window.BearTrackMemberships);
    await safeLoad('Employees', window.BearTrackEmployees);

    try {
      if (window.BearTrackDashboard?.refresh) {
        await window.BearTrackDashboard.refresh();
      } else {
        console.warn('Dashboard module is not available.');
      }
    } catch (error) {
      console.error('Dashboard failed to render:', error);
      window.BearTrackDashboard?.render?.();
    }
  }

  function bindRefresh() {
    document.getElementById('refreshBtn')?.addEventListener('click', async () => {
      await loadCore();
      window.BearTrackUI?.toast?.('BearTrack refreshed', 'success');
    });
  }

  document.addEventListener('beartrack:auth', async event => {
    if (event.detail?.state === 'signed-in') {
      await loadCore();
      showPage('dashboard');
    }
  });

  async function init() {
    renderNav();
    setClock();
    setInterval(setClock, 30000);
    bindRefresh();
    showPage('dashboard');

    if (!window.BearTrackAuth) {
      console.error('Auth module is not available.');
      document.getElementById('appView')?.classList.remove('hidden');
      await loadCore();
      return;
    }

    window.BearTrackAuth.bind?.();
    const session = await window.BearTrackAuth.checkSession();

    if (session) {
      await loadCore();
      showPage('dashboard');
    }
  }

  init();
})();
