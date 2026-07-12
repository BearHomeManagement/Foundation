// BearTrack application shell
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
    technicians:['Technicians','Team status and capacity.'],
    reports:['Reports','Company health and performance.'],
    documents:['Documents','Photos, warranties, reports, and files.'],
    messages:['Messages','Customer calls, emails, and follow-ups.'],
    invoices:['Invoices','Invoice and payment tracking.'],
    settings:['Settings','Company and system settings.']
  };

  let currentPage='dashboard';

  function renderNav(){
    const nav=document.getElementById('nav');
    nav.innerHTML=navItems.map(([id,ico,label]) =>
      `<button class="${id===currentPage?'active':''}" data-page="${id}">
        <span class="ico">${ico}</span>${label}
      </button>`).join('');
    nav.querySelectorAll('button').forEach(button=>{
      button.addEventListener('click',()=>showPage(button.dataset.page));
    });
  }

  function showPage(page){
    currentPage=page;
    document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active',el.id===page));
    const [title,sub]=titles[page]||[page,''];
    document.getElementById('pageTitle').textContent=title;
    document.getElementById('pageSub').textContent=sub;
    renderNav();

    if(page==='dashboard') window.BearTrackDashboard?.render?.();
    if(page==='customers') window.BearTrackCustomers?.render?.();
    if(page==='properties') window.BearTrackProperties?.render?.();
    if(page==='workorders') window.BearTrackWorkOrders?.render?.();
    if(page==='assessments') window.BearTrackAssessments?.render?.();
    if(page==='memberships') window.BearTrackMemberships?.render?.();
  }

  function setClock(){
    const d=new Date();
    document.getElementById('todayText').textContent=d.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric',year:'numeric'});
    document.getElementById('timeText').textContent=d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  }

  async function loadCore(){
    await window.BearTrackCustomers.load();
    await window.BearTrackProperties.load();
    await window.BearTrackWorkOrders.load();
    await window.BearTrackAssessments.load();
    try{await window.BearTrackMemberships.load();}catch(error){console.warn(error);}
    await window.BearTrackDashboard.refresh();
  }

  function bindRefresh(){
    document.getElementById('refreshBtn')?.addEventListener('click',async()=>{
      try{
        await loadCore();
        window.BearTrackUI?.toast?.('BearTrack refreshed','success');
      }catch(error){
        window.BearTrackUI?.toast?.(error.message||String(error),'error',5000);
      }
    });
  }

  document.addEventListener('beartrack:auth',async event=>{
    if(event.detail.state==='signed-in'){
      try{await loadCore();}catch(error){
        window.BearTrackUI?.toast?.(error.message||String(error),'error',5000);
      }
    }
  });

  async function init(){
    renderNav();
    setClock();
    setInterval(setClock,30000);
    bindRefresh();
    window.BearTrackAuth.bind();
    showPage('dashboard');
    const session=await window.BearTrackAuth.checkSession();
    if(session){
      try{await loadCore();}catch(error){
        window.BearTrackUI?.toast?.(error.message||String(error),'error',5000);
      }
    }
  }

  init();
})();
