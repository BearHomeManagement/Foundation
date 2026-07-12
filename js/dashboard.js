// BearTrack full operations dashboard
(() => {
  'use strict';

  let assessments=[];

  const customers=()=>window.BearTrackCustomers?.getAll?.()||[];
  const properties=()=>window.BearTrackProperties?.getAll?.()||[];
  const workOrders=()=>window.BearTrackWorkOrders?.getAll?.()||[];

  async function loadAssessments(){
    assessments=await window.BearTrackDB.select('assessments',{
      columns:'*, properties(*, customers(*))',
      orderBy:'created_at',
      ascending:false
    })||[];
    return assessments;
  }

  function render(){
    const c=customers(), p=properties(), w=workOrders();
    const today=new Date().toISOString().slice(0,10);
    const scheduledToday=w.filter(x=>x.scheduled_date===today);
    const emergency=w.filter(x=>String(x.priority||'').toLowerCase()==='emergency' && String(x.status||'').toLowerCase()!=='complete');
    const open=w.filter(x=>String(x.status||'').toLowerCase()!=='complete');
    const completed=w.filter(x=>String(x.status||'').toLowerCase()==='complete');

    const el=document.getElementById('dashboard');
    if(!el) return;

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
          <div class="panel">
            <div class="panel-head"><h3>Attention Required</h3></div>
            <div class="list">
              ${attentionRow('Unassigned work orders',w.filter(x=>!x.assigned_to && String(x.status||'').toLowerCase()!=='complete').length,'red')}
              ${attentionRow('Emergency work orders',emergency.length,'red')}
              ${attentionRow('Open assessments',assessments.filter(a=>String(a.status||'').toLowerCase()!=='complete').length,'orange')}
              ${attentionRow('Customers needing home profiles',Math.max(0,c.length-p.length),'orange')}
            </div>
          </div>

          <div class="panel" style="margin-top:14px">
            <div class="panel-head"><h3>Today's Call List</h3></div>
            <div class="list">
              ${open.slice(0,3).map(x=>`
                <div class="list-row">
                  <div class="mini-face">${initials(x.properties?.customers?.full_name||'Customer')}</div>
                  <div class="row-main"><strong>${escapeHtml(x.properties?.customers?.full_name||'Customer')}</strong><small>${escapeHtml(x.title||'Follow up')}</small></div>
                  <button class="btn ghost">📞</button>
                </div>`).join('')||'<div class="dashboard-empty">No calls queued.</div>'}
            </div>
          </div>
        </div>

        <div>
          <div class="panel schedule-card">
            <div class="panel-head"><h3>Schedule Board</h3><button class="btn ghost">⚙</button></div>
            <div class="schedule-toolbar">
              <div class="tabs"><button class="active">Day</button><button>Week</button><button>Month</button></div>
              <div class="date-control"><strong>${new Date().toLocaleDateString([],{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</strong></div>
            </div>
            <div class="content-list" style="padding:14px">
              ${scheduledToday.slice(0,8).map(x=>`
                <div class="job ${jobClass(x)}">
                  <strong>${escapeHtml(x.title||'Work Order')}</strong>
                  <small>${escapeHtml(x.scheduled_time||'')} · ${escapeHtml(x.properties?.address||'No address')} · ${escapeHtml(x.assigned_to||'Unassigned')}</small>
                </div>`).join('')||'<div class="dashboard-empty">Nothing scheduled today.</div>'}
            </div>
            <div class="legend"><span class="assessment">Assessment</span><span>Repair</span><span class="follow">Follow-up</span><span class="inspection">Inspection</span><span class="emergency">Emergency</span></div>
          </div>

          <div class="panel ai panel-pad">
            <div>
              <h3 style="margin:0;color:var(--gold2)">🐾 AI Operations Assistant</h3>
              <p>Live operational recommendations:</p>
              <ul>
                <li>${emergency.length} emergency item(s) need review</li>
                <li>${w.filter(x=>!x.assigned_to && String(x.status||'').toLowerCase()!=='complete').length} work order(s) need assignment</li>
                <li>${assessments.filter(a=>String(a.status||'').toLowerCase()!=='complete').length} assessment(s) remain open</li>
                <li>${Math.max(0,c.length-p.length)} customer(s) still need a home profile</li>
              </ul>
            </div>
            <div><button class="btn gold">Plan My Day</button><br><br><button class="btn">View Recommendations</button></div>
          </div>
        </div>

        <div>
          <div class="panel">
            <div class="panel-head"><h3>Technician Status</h3></div>
            <div class="list">
              <div class="list-row"><div class="mini-face green">R</div><div class="row-main"><strong>Robert</strong><small>Management / Field</small></div></div>
              <div class="list-row"><div class="mini-face gold">H</div><div class="row-main"><strong>Harley</strong><small>Operations Manager</small></div></div>
              <div class="list-row"><div class="mini-face gray">—</div><div class="row-main"><strong>Unassigned</strong><small>${w.filter(x=>!x.assigned_to && String(x.status||'').toLowerCase()!=='complete').length} jobs need dispatch</small></div></div>
            </div>
          </div>

          <div class="panel" style="margin-top:14px">
            <div class="panel-head"><h3>Quick Actions</h3></div>
            <div class="quick-grid">
              <button data-open="customers"><span>👤+</span>New Customer</button>
              <button data-open="assessments"><span>🏠</span>New Assessment</button>
              <button data-open="workorders"><span>🛠️</span>New Work Order</button>
              <button data-open="schedule"><span>📅</span>Schedule Job</button>
              <button data-open="documents"><span>📸</span>Upload Photos</button>
              <button data-open="messages"><span>💬</span>Send Message</button>
            </div>
          </div>

          <div class="panel" style="margin-top:14px">
            <div class="panel-head"><h3>Company Health</h3></div>
            <div class="health-grid">
              ${health(c.filter(x=>String(x.status||'').toLowerCase()==='active').length,'Active Customers','👥')}
              ${health(p.length,'Homes Managed','🏡')}
              ${health(open.length,'Open Work Orders','🛠️')}
              ${health(completed.length,'Completed Work Orders','✅')}
              ${health(assessments.length,'Assessments','⭐')}
              ${health(emergency.length,'Emergency Items','⚠️')}
            </div>
          </div>
        </div>
      </div>`;

    el.querySelectorAll('[data-open]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        document.querySelector(`#nav [data-page="${btn.dataset.open}"]`)?.click();
      });
    });
  }

  function stat(icon,value,label,small,bg){
    return `<div class="stat"><div class="icon" style="background:${bg}">${icon}</div><div><strong>${value}</strong><span>${label}</span><small>${small}</small></div></div>`;
  }
  function attentionRow(label,count,color){
    return `<div class="list-row"><div class="alert-ico ${color==='orange'?'orange':''}">⚠</div><div class="row-main"><strong>${label}</strong></div><span class="badge">${count}</span></div>`;
  }
  function health(value,label,icon){
    return `<div class="health-item"><div class="icon">${icon}</div><div><strong>${value}</strong><small>${label}</small></div></div>`;
  }
  function initials(name){return String(name).split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();}
  function jobClass(w){
    const p=String(w.priority||'').toLowerCase();
    const t=String(w.title||'').toLowerCase();
    if(p==='emergency')return'emergency';
    if(t.includes('assessment'))return'assessment';
    if(t.includes('follow'))return'follow-up';
    if(t.includes('inspection'))return'inspection';
    return'';
  }
  function escapeHtml(value){
    return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }

  async function refresh(){await loadAssessments();render();}

  ['beartrack:customers-loaded','beartrack:properties-loaded','beartrack:workorders-loaded','beartrack:workorder-changed','beartrack:assessments-loaded']
    .forEach(name=>document.addEventListener(name,render));

  window.BearTrackDashboard={refresh,render,loadAssessments,getAssessments:()=>[...assessments]};
})();
