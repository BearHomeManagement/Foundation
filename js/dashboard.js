// BearTrack full operations dashboard - repaired schedule controls and quick actions
(() => {
  'use strict';
  let assessments=[];
  let scheduleView='day';
  let selectedDate=new Date();

  const customers=()=>window.BearTrackCustomers?.getAll?.()||[];
  const properties=()=>window.BearTrackProperties?.getAll?.()||[];
  const workOrders=()=>window.BearTrackWorkOrders?.getAll?.()||[];
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

  async function loadAssessments(){
    assessments=await window.BearTrackDB.select('assessments',{
      columns:'*, properties(*, customers(*))',orderBy:'created_at',ascending:false
    })||[];
    return assessments;
  }

  function cloneDate(date){
    return new Date(date.getFullYear(),date.getMonth(),date.getDate());
  }

  function mondayOf(date){
    const d=cloneDate(date);
    const day=(d.getDay()+6)%7;
    d.setDate(d.getDate()-day);
    return d;
  }

  function localIso(date){
    const d=cloneDate(date);
    const year=d.getFullYear();
    const month=String(d.getMonth()+1).padStart(2,'0');
    const day=String(d.getDate()).padStart(2,'0');
    return `${year}-${month}-${day}`;
  }

  function parseLocalDate(value){
    if(value instanceof Date)return cloneDate(value);
    const [year,month,day]=String(value||'').split('-').map(Number);
    return new Date(year,month-1,day);
  }

  function dateLabel(value){
    const d=value instanceof Date?value:parseLocalDate(value);
    return d.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});
  }

  function scheduleHeading(){
    if(scheduleView==='day'){
      return selectedDate.toLocaleDateString([],{
        weekday:'long',month:'long',day:'numeric',year:'numeric'
      });
    }

    if(scheduleView==='week'){
      const start=mondayOf(selectedDate);
      const end=cloneDate(start);
      end.setDate(end.getDate()+6);

      if(start.getFullYear()!==end.getFullYear()){
        return `${start.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'})} – ${end.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'})}`;
      }

      if(start.getMonth()!==end.getMonth()){
        return `${start.toLocaleDateString([],{month:'short',day:'numeric'})} – ${end.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'})}`;
      }

      return `${start.toLocaleDateString([],{month:'long',day:'numeric'})} – ${end.toLocaleDateString([],{day:'numeric',year:'numeric'})}`;
    }

    return selectedDate.toLocaleDateString([],{month:'long',year:'numeric'});
  }

  function moveSchedule(direction){
    const next=cloneDate(selectedDate);

    if(scheduleView==='day')next.setDate(next.getDate()+direction);
    if(scheduleView==='week')next.setDate(next.getDate()+(7*direction));
    if(scheduleView==='month')next.setMonth(next.getMonth()+direction);

    selectedDate=next;
    render();
  }

  function scheduleContent(w){
    if(scheduleView==='day'){
      const key=localIso(selectedDate);
      const jobs=w.filter(x=>String(x.scheduled_date||'').slice(0,10)===key);

      return jobs.slice(0,12).map(jobCard).join('')
        || `<div class="dashboard-empty">Nothing scheduled for ${esc(dateLabel(selectedDate))}.</div>`;
    }

    if(scheduleView==='week'){
      const start=mondayOf(selectedDate);

      return `<div class="week-grid active">${Array.from({length:7},(_,i)=>{
        const d=cloneDate(start);
        d.setDate(start.getDate()+i);

        const key=localIso(d);
        const jobs=w.filter(x=>String(x.scheduled_date||'').slice(0,10)===key);

        return `
          <div class="week-day">
            <h4>${esc(dateLabel(d))}</h4>
            ${jobs.map(jobCard).join('')||'<small class="muted">No jobs</small>'}
          </div>
        `;
      }).join('')}</div>`;
    }

    const year=selectedDate.getFullYear();
    const month=selectedDate.getMonth();
    const first=new Date(year,month,1);
    const last=new Date(year,month+1,0);
    const offset=(first.getDay()+6)%7;
    const cells=[];

    for(let i=0;i<offset;i++){
      cells.push('<div class="day-cell"></div>');
    }

    for(let day=1;day<=last.getDate();day++){
      const d=new Date(year,month,day);
      const key=localIso(d);
      const jobs=w.filter(x=>String(x.scheduled_date||'').slice(0,10)===key);

      cells.push(`
        <div class="day-cell" data-dashboard-date="${key}">
          <div class="num">${day}</div>
          ${jobs.slice(0,4).map(x=>`
            <div class="month-job ${jobClass(x)}">${esc(x.title||'Work Order')}</div>
          `).join('')}
          ${jobs.length>4?`<small class="muted">+${jobs.length-4} more</small>`:''}
        </div>
      `);
    }

    return `
      <div class="month-grid active">
        <div class="dow">Mon</div>
        <div class="dow">Tue</div>
        <div class="dow">Wed</div>
        <div class="dow">Thu</div>
        <div class="dow">Fri</div>
        <div class="dow">Sat</div>
        <div class="dow">Sun</div>
        ${cells.join('')}
      </div>
    `;
  }

  function jobCard(x){
    return `<div class="job ${jobClass(x)}"><strong>${esc(x.title||x.service||'Work Order')}</strong><small>${esc(x.scheduled_time||'')} · ${esc(x.properties?.address||x.address||'No address')} · ${esc(x.assigned_to||x.assigned||'Unassigned')}</small></div>`;
  }

  function render(){
    const c=customers(),p=properties(),w=workOrders();
    const today=localIso(new Date());
    const emergency=w.filter(x=>String(x.priority||'').toLowerCase()==='emergency'&&String(x.status||'').toLowerCase()!=='complete');
    const open=w.filter(x=>String(x.status||'').toLowerCase()!=='complete');
    const completed=w.filter(x=>String(x.status||'').toLowerCase()==='complete');
    const scheduledToday=w.filter(x=>x.scheduled_date===today);
    const el=document.getElementById('dashboard'); if(!el)return;

    el.innerHTML=`
      <div class="grid stats">
        ${stat('🏠',assessments.filter(a=>a.assessment_date===today).length,'Assessments','Today','rgba(66,211,110,.22)')}
        ${stat('🛠️',scheduledToday.length,'Work Orders','Today','rgba(61,140,255,.2)')}
        ${stat('📞',open.filter(x=>String(x.status||'').toLowerCase().includes('follow')).length,'Follow-Ups','Open','rgba(242,156,43,.2)')}
        ${stat('⚠️',emergency.length,'Emergency','Open','rgba(239,77,67,.2)')}
        ${stat('👥',c.length,'Customers','Live','rgba(155,108,255,.2)')}
        ${stat('🏡',p.length,'Homes','Protected','rgba(66,211,110,.2)')}
      </div>
      <div class="dashboard-grid">
        <div>
          <div class="panel"><div class="panel-head"><h3>Attention Required</h3></div><div class="list">
            ${attentionRow('Unassigned work orders',w.filter(x=>!x.assigned_to&&!x.assigned&&String(x.status||'').toLowerCase()!=='complete').length,'red')}
            ${attentionRow('Emergency work orders',emergency.length,'red')}
            ${attentionRow('Open assessments',assessments.filter(a=>String(a.status||'').toLowerCase()!=='complete').length,'orange')}
            ${attentionRow('Customers needing home profiles',Math.max(0,c.length-p.length),'orange')}
          </div></div>
        </div>
        <div>
          <div class="panel schedule-card">
            <div class="panel-head"><h3>Schedule Board</h3></div>
            <div class="schedule-toolbar">
              <div class="tabs">
                <button data-schedule-view="day" class="${scheduleView==='day'?'active':''}">Day</button>
                <button data-schedule-view="week" class="${scheduleView==='week'?'active':''}">Week</button>
                <button data-schedule-view="month" class="${scheduleView==='month'?'active':''}">Month</button>
              </div>
              <div class="date-control">
                <button type="button" data-schedule-nav="-1" aria-label="Previous">‹</button>
                <button type="button" data-schedule-today style="width:auto;padding:0 10px">Today</button>
                <strong>${esc(scheduleHeading())}</strong>
                <button type="button" data-schedule-nav="1" aria-label="Next">›</button>
              </div>
            </div>
            <div id="scheduleViewContent" class="content-list" style="padding:14px">${scheduleContent(w)}</div>
            <div class="legend"><span class="assessment">Assessment</span><span>Repair</span><span class="follow">Follow-up</span><span class="inspection">Inspection</span><span class="emergency">Emergency</span></div>
          </div>
        </div>
        <div>
          <div class="panel"><div class="panel-head"><h3>Quick Actions</h3></div>
            <div class="quick-grid">
              <button data-action="new-customer"><span>👤+</span>New Customer</button>
              <button data-action="new-assessment"><span>🏠</span>New Assessment</button>
              <button data-open="workorders"><span>🛠️</span>New Work Order</button>
              <button data-open="schedule"><span>📅</span>Schedule Job</button>
              <button data-open="documents"><span>📸</span>Upload Photos</button>
              <button data-open="messages"><span>💬</span>Send Message</button>
            </div>
          </div>
          <div class="panel" style="margin-top:14px"><div class="panel-head"><h3>Company Health</h3></div><div class="health-grid">
            ${health(c.filter(x=>String(x.status||'').toLowerCase()==='active').length,'Active Customers','👥')}
            ${health(p.length,'Homes Managed','🏡')}
            ${health(open.length,'Open Work Orders','🛠️')}
            ${health(completed.length,'Completed Work Orders','✅')}
            ${health(assessments.length,'Assessments','⭐')}
            ${health(emergency.length,'Emergency Items','⚠️')}
          </div></div>
        </div>
      </div>`;

    el.querySelectorAll('[data-schedule-view]').forEach(btn=>{
      btn.onclick=()=>{
        scheduleView=btn.dataset.scheduleView;
        render();
      };
    });

    el.querySelectorAll('[data-schedule-nav]').forEach(btn=>{
      btn.onclick=()=>moveSchedule(Number(btn.dataset.scheduleNav));
    });

    el.querySelector('[data-schedule-today]')?.addEventListener('click',()=>{
      selectedDate=new Date();
      render();
    });

    el.querySelectorAll('[data-dashboard-date]').forEach(cell=>{
      cell.addEventListener('click',event=>{
        if(event.target.closest('.month-job'))return;
        selectedDate=parseLocalDate(cell.dataset.dashboardDate);
        scheduleView='day';
        render();
      });
    });
    el.querySelector('[data-action="new-customer"]')?.addEventListener('click',()=>{
      document.querySelector('#nav [data-page="customers"]')?.click();
      document.dispatchEvent(new CustomEvent('beartrack:new-customer'));
    });
    el.querySelector('[data-action="new-assessment"]')?.addEventListener('click',()=>{
      document.querySelector('#nav [data-page="assessments"]')?.click();
      document.dispatchEvent(new CustomEvent('beartrack:new-assessment'));
    });
    el.querySelectorAll('[data-open]').forEach(btn=>btn.onclick=()=>document.querySelector(`#nav [data-page="${btn.dataset.open}"]`)?.click());
  }

  function stat(icon,value,label,small,bg){return `<div class="stat"><div class="icon" style="background:${bg}">${icon}</div><div><strong>${value}</strong><span>${label}</span><small>${small}</small></div></div>`;}
  function attentionRow(label,count,color){return `<div class="list-row"><div class="alert-ico ${color==='orange'?'orange':''}">⚠</div><div class="row-main"><strong>${label}</strong></div><span class="badge">${count}</span></div>`;}
  function health(value,label,icon){return `<div class="health-item"><div class="icon">${icon}</div><div><strong>${value}</strong><small>${label}</small></div></div>`;}
  function jobClass(w){const p=String(w.priority||'').toLowerCase(),t=String(w.title||w.service||'').toLowerCase();if(p==='emergency')return'emergency';if(t.includes('assessment'))return'assessment';if(t.includes('follow'))return'follow-up';if(t.includes('inspection'))return'inspection';return'';}
  async function refresh(){await loadAssessments();render();}

  ['beartrack:customers-loaded','beartrack:customer-changed','beartrack:properties-loaded','beartrack:workorders-loaded','beartrack:workorder-changed','beartrack:assessments-loaded','beartrack:assessment-created']
    .forEach(name=>document.addEventListener(name,render));

  window.BearTrackDashboard={refresh,render,loadAssessments,getAssessments:()=>[...assessments]};
})();
