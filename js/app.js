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

    const rolePermissions = {
    owner_admin: navItems.map(([id]) => id),

    operations_manager: [
      'dashboard', 'customers', 'properties',
      'workorders', 'schedule', 'assessments',
      'memberships', 'employees', 'technicians',
      'reports', 'documents', 'messages', 'invoices'
    ],

    operations_staff: [
      'dashboard', 'customers', 'properties',
      'workorders', 'schedule', 'assessments',
      'documents', 'messages'
    ],

    lead_technician: [
      'technicians', 'workorders', 'schedule',
      'assessments', 'documents'
    ],

    technician: [
      'technicians', 'workorders', 'schedule',
      'assessments', 'documents'
    ]
  };
  const titles = {
    dashboard:['Dashboard',"Here's what's happening with your operations today."],
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
  let signedInProfile = null;
  
 async function loadSignedInProfile() {
    signedInProfile = null;

    const session = window.BearTrackAuth?.getSession?.();
    if (!session?.user?.id) return null;

    const db = await window.BearTrackDB.getClient();
    const { data, error } = await db.rpc('beartrack_my_profile');

    if (error) throw error;

    const profile = Array.isArray(data) ? data[0] : data;

    if (!profile || profile.employment_status !== 'active') {
      return null;
    }

    signedInProfile = {
      id: profile.employee_id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      role: profile.role,
      employment_status: profile.employment_status
    };

    return signedInProfile;
  }
    function renderNav() {
        let signedInProfile = null;

    const nav = document.getElementById('nav');
    if (!nav) return;

    const employee = getSignedInEmployee();
    const allowedPages = rolePermissions[employee?.role] || [];

    nav.innerHTML = navItems
      .filter(([id]) => allowedPages.includes(id))
      .map(([id, ico, label]) => `
        <button class="${id === currentPage ? 'active' : ''}" data-page="${id}">
          <span class="ico">${ico}</span>${label}
        </button>
      `).join('');

    nav.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', () => showPage(button.dataset.page));
    });
  }

  function showPage(page) {
        const employee = getSignedInEmployee();
    const allowedPages = rolePermissions[employee?.role] || [];

    if (!allowedPages.includes(page)) {
      console.warn(`Access denied to page: ${page}`);
      return;
    }
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
      invoices: window.BearTrackInvoices,
      reports: window.BearTrackReports,
      documents: window.BearTrackDocuments,
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
    window.BearTrackAssessments?.bindTemplateManager?.();
    await safeLoad('Memberships', window.BearTrackMemberships);
   if (['owner_admin', 'operations_manager'].includes(getSignedInEmployee()?.role)) {
  await safeLoad('Employees', window.BearTrackEmployees);
}
    await safeLoad('Technician', window.BearTrackTechnician);
    
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
    
 function getSignedInEmployee() {
  return signedInProfile;
}

function getLandingPage() {
  const employee = getSignedInEmployee();

  return ['technician', 'lead_technician'].includes(employee?.role)
    ? 'technicians'
    : 'dashboard';
}
    
    function updateSignedInProfile() {
  const employee = getSignedInEmployee();
  if (!employee) return;

 const fullName =
  `${employee.first_name || ''} ${employee.last_name || ''}`.trim();

  const roleLabels = {
    owner_admin: 'Owner / Administrator',
    operations_manager: 'Operations Manager',
    operations_staff: 'Operations Staff',
    lead_technician: 'Lead Technician',
    technician: 'Technician'
  };

  const avatar = document.querySelector('.avatar');
  if (avatar) {
    avatar.textContent = (employee.first_name || '?')
      .charAt(0)
      .toUpperCase();
  }

  const profile = document.querySelector('.profile');

  if (profile) {
    profile.innerHTML = `
      <div class="avatar">${(employee.first_name || '?').charAt(0).toUpperCase()}</div>
      <div>
        <strong>${fullName}</strong><br>
        <small style="color:var(--muted)">
          ${roleLabels[employee.role] || employee.role}
        </small>
      </div>
    `;
  }
}
 document.addEventListener('beartrack:auth', async event => {
  if (event.detail?.state === 'signed-in') {
    await loadSignedInProfile();
    await loadCore();
    renderNav();
    updateSignedInProfile();
    showPage(getLandingPage());
  }
});
  async function init() {
    setClock();
    setInterval(setClock, 30000);
    bindRefresh();

    if (!window.BearTrackAuth) {
      console.error('Auth module is not available.');
      window.BearTrackUI?.toast?.('Login system unavailable.', 'error');
      return;
    }

    window.BearTrackAuth.bind?.();
    const session = await window.BearTrackAuth.checkSession();

    if (session) {
      await loadSignedInProfile();
      await loadCore();
      renderNav();
      updateSignedInProfile();
      showPage(getLandingPage());
    }
  }
    
init();
})();
