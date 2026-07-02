const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');
if (toggle && nav) {
  toggle.addEventListener('click', () => nav.classList.toggle('open'));
}

// Interactive BearTrack inspection mockup
const inspectionData = [
  {name:'Property Information', done:14, total:14, items:[
    {n:'1.1', title:'Address / Owner Info', status:'Good', photos:0, observation:'Property information confirmed and attached to BearTrack profile.', cost:'—', impact:'0 points', trade:'Bear Home Management', next:'Keep records updated annually.'},
    {n:'1.2', title:'Year Built / Square Footage', status:'Good', photos:0, observation:'Home age and size recorded for complexity scoring.', cost:'—', impact:'0 points', trade:'Bear Home Management', next:'Use for annual plan review.'},
    {n:'1.3', title:'Special Systems', status:'Monitor', photos:1, observation:'Irrigation and smart devices present; add to maintenance profile.', cost:'TBD', impact:'-1 point', trade:'Bear Home Management', next:'Document controllers and shutoffs.'}
  ]},
  {name:'Exterior', done:28, total:32, items:[
    {n:'2.1', title:'Gutters', status:'Monitor', photos:3, observation:'Minor debris and staining observed at rear gutter runs.', cost:'$125 – $225', impact:'-2 points', trade:'Bear Home Management', next:'Clean gutters during next service visit.', meaning:'Restricted flow can overflow against fascia and exterior walls.', when:'Within 60 days.'},
    {n:'2.2', title:'Downspouts', status:'Good', photos:2, observation:'Downspouts are connected and discharging away from foundation.', cost:'—', impact:'0 points', trade:'Bear Home Management', next:'Monitor seasonally.'},
    {n:'2.3', title:'Gutter Guards', status:'Monitor', photos:1, observation:'Some panels lifted at the front elevation.', cost:'$100 – $180', impact:'-1 point', trade:'Bear Home Management', next:'Secure loose sections.'},
    {n:'2.4', title:'Splash Blocks', status:'Service Soon', photos:1, observation:'Several splash blocks are missing or misaligned.', cost:'$80 – $160', impact:'-3 points', trade:'Bear Home Management', next:'Install or realign splash blocks to direct water away.'},
    {n:'2.5', title:'Siding / Stucco Condition', status:'Good', photos:4, observation:'Exterior finish generally sound with no active displacement observed.', cost:'—', impact:'0 points', trade:'Bear Home Management', next:'Inspect annually.'},
    {n:'2.6', title:'Paint / Finish', status:'Service Soon', photos:2, observation:'Localized fading and minor finish breakdown at sun-exposed trim.', cost:'$250 – $600', impact:'-3 points', trade:'Bear Home Management / Painter Partner', next:'Touch up exposed trim before finish fails.'},
    {n:'2.7', title:'Brick / Stone', status:'Good', photos:2, observation:'Masonry appears stable with no significant cracking.', cost:'—', impact:'0 points', trade:'Bear Home Management', next:'Monitor annually.'},
    {n:'2.8', title:'Sealants / Caulking', status:'Needs Repair', photos:5, observation:'Deteriorated and cracked caulking around several windows and siding transitions.', cost:'$250 – $450', impact:'-6 points', trade:'Bear Home Management', next:'Schedule exterior caulking replacement to prevent water damage.', meaning:'Seal is no longer effective and water may penetrate behind surfaces.', when:'Within 3–6 months.'},
    {n:'2.9', title:'Windows', status:'Good', photos:3, observation:'Windows operate and show no obvious active distress.', cost:'—', impact:'0 points', trade:'Bear Home Management', next:'Monitor sealants and operation.'},
    {n:'2.10', title:'Window Seals & Caulking', status:'Monitor', photos:1, observation:'Early sealant shrinkage at two openings.', cost:'$125 – $250', impact:'-2 points', trade:'Bear Home Management', next:'Add to next caulking visit.'},
    {n:'2.11', title:'Exterior Doors', status:'Good', photos:2, observation:'Exterior doors latch and weatherstripping is serviceable.', cost:'—', impact:'0 points', trade:'Bear Home Management', next:'Lubricate and inspect annually.'},
    {n:'2.12', title:'Foundation Walls', status:'Good', photos:3, observation:'No visible displacement or active cracking observed at accessible foundation areas.', cost:'—', impact:'0 points', trade:'Bear Home Management', next:'Monitor annually.'},
    {n:'2.13', title:'Foundation Cracks', status:'Monitor', photos:2, observation:'Minor hairline cracks noted at garage stem wall.', cost:'$150 – $350', impact:'-2 points', trade:'Bear Home Management / Partner if movement noted', next:'Seal and monitor for movement.'}
  ]},
  {name:'Roof', done:9, total:12, items:[
    {n:'3.1', title:'Roof Covering', status:'Monitor', photos:4, observation:'Roof is serviceable but shows age-related granule loss.', cost:'TBD', impact:'-4 points', trade:'Roofing Partner', next:'Plan roof budget review.', meaning:'Aging roof materials increase leak risk over time.', when:'Review annually.'},
    {n:'3.2', title:'Pipe Boots', status:'Needs Repair', photos:2, observation:'Boots show cracking at two plumbing penetrations.', cost:'$250 – $500', impact:'-5 points', trade:'Roofing Partner', next:'Schedule licensed roofing partner repair.'},
    {n:'3.3', title:'Attic Ventilation', status:'Good', photos:1, observation:'Ventilation appears adequate from accessible areas.', cost:'—', impact:'0 points', trade:'Bear Home Management', next:'Monitor annually.'}
  ]},
  {name:'Plumbing', done:15, total:24, items:[
    {n:'4.1', title:'Water Heater', status:'Service Soon', photos:2, observation:'Water heater is 11 years old with no active leak observed.', cost:'$1,600 – $2,400 replacement forecast', impact:'-4 points', trade:'Plumbing Partner', next:'Create replacement budget plan.'},
    {n:'4.2', title:'Toilet Components', status:'Needs Repair', photos:1, observation:'Hall bath toilet runs intermittently; flapper appears worn.', cost:'$45 – $95', impact:'-2 points', trade:'Bear Home Management / Verify locally', next:'Replace flapper and test.'},
    {n:'4.3', title:'P-Traps / Sink Drains', status:'Monitor', photos:1, observation:'Minor corrosion at guest bath P-trap.', cost:'$75 – $150', impact:'-2 points', trade:'Bear Home Management / Verify locally', next:'Replace during next plumbing visit.'}
  ]},
  {name:'Electrical', done:12, total:20, items:[
    {n:'5.1', title:'Panel Condition', status:'Good', photos:2, observation:'Panel appears clean and labeled; no overheating observed from exterior view.', cost:'—', impact:'0 points', trade:'Electrical Partner for panel work', next:'Keep labels updated.'},
    {n:'5.2', title:'GFCI Protection', status:'Service Soon', photos:1, observation:'One exterior receptacle did not trip during test.', cost:'$125 – $225', impact:'-5 points', trade:'Verify locally / Electrical Partner', next:'Repair or replace GFCI protection.'},
    {n:'5.3', title:'Smoke Detectors', status:'Needs Repair', photos:1, observation:'Two smoke detectors are past recommended replacement age.', cost:'$80 – $180', impact:'-4 points', trade:'Bear Home Management', next:'Replace detectors.'}
  ]},
  {name:'HVAC', done:10, total:18, items:[
    {n:'6.1', title:'Filter / Airflow', status:'Good', photos:1, observation:'Filter replaced recently and airflow appears acceptable.', cost:'Included', impact:'0 points', trade:'Bear Home Management', next:'Replace on schedule.'},
    {n:'6.2', title:'Condensate Drain', status:'Monitor', photos:1, observation:'Drain line has light buildup at cleanout.', cost:'$95 – $175', impact:'-2 points', trade:'Bear Home Management', next:'Clean drain and treat line.'},
    {n:'6.3', title:'Contactor / Capacitor', status:'Service Soon', photos:2, observation:'Components are aging; replacement may require licensed HVAC partner depending on scope.', cost:'$180 – $350', impact:'-3 points', trade:'Verify / HVAC Partner', next:'Flag for HVAC partner or compliance review.'}
  ]},
  {name:'Interior', done:16, total:24, items:[
    {n:'7.1', title:'Walls / Ceilings', status:'Good', photos:2, observation:'No active staining or cracking observed in primary living areas.', cost:'—', impact:'0 points', trade:'Bear Home Management', next:'Monitor.'},
    {n:'7.2', title:'Doors / Hardware', status:'Service Soon', photos:1, observation:'Primary bedroom door rubs at latch side.', cost:'$75 – $125', impact:'-1 point', trade:'Bear Home Management', next:'Adjust door.'},
    {n:'7.3', title:'Cabinet Hardware', status:'Monitor', photos:0, observation:'Several kitchen hinges loose.', cost:'$50 – $125', impact:'-1 point', trade:'Bear Home Management', next:'Tighten and adjust hinges.'}
  ]},
  {name:'Safety', done:8, total:16, items:[
    {n:'8.1', title:'Handrails', status:'Good', photos:1, observation:'Handrails are secure at observed locations.', cost:'—', impact:'0 points', trade:'Bear Home Management', next:'Monitor.'},
    {n:'8.2', title:'Trip Hazards', status:'Monitor', photos:2, observation:'Slight sidewalk lift at front walk.', cost:'$150 – $500', impact:'-2 points', trade:'Bear Home Management / Concrete Partner', next:'Mark and plan repair.'},
    {n:'8.3', title:'Emergency Shutoffs', status:'Service Soon', photos:1, observation:'Main water shutoff not clearly labeled.', cost:'$25 – $75', impact:'-2 points', trade:'Bear Home Management', next:'Label shutoff and document location.'}
  ]},
  {name:'Garage / Laundry', done:6, total:10, items:[
    {n:'9.1', title:'Dryer Vent', status:'Needs Repair', photos:1, observation:'Dryer vent shows lint buildup at exterior termination.', cost:'$125 – $225', impact:'-4 points', trade:'Bear Home Management', next:'Clean dryer vent.'},
    {n:'9.2', title:'Garage Door', status:'Monitor', photos:1, observation:'Rollers are noisy and need lubrication.', cost:'$75 – $150', impact:'-1 point', trade:'Bear Home Management', next:'Lubricate and inspect rollers.'}
  ]},
  {name:'Attic / Crawlspace', done:6, total:12, items:[
    {n:'10.1', title:'Attic Access', status:'Good', photos:1, observation:'Access panel functional.', cost:'—', impact:'0 points', trade:'Bear Home Management', next:'Monitor.'},
    {n:'10.2', title:'Insulation', status:'Monitor', photos:2, observation:'Minor disturbed insulation around air handler platform.', cost:'$150 – $300', impact:'-2 points', trade:'Bear Home Management', next:'Reposition insulation.'}
  ]},
  {name:'Grounds / Landscaping', done:8, total:14, items:[
    {n:'11.1', title:'Drainage / Grading', status:'Monitor', photos:2, observation:'Low area noted at left side yard after rain.', cost:'TBD', impact:'-3 points', trade:'Bear Home Management / Drainage Partner', next:'Monitor after heavy rain.'},
    {n:'11.2', title:'Trees Near Roof', status:'Service Soon', photos:2, observation:'Branches within 3 feet of roof at rear elevation.', cost:'$200 – $600', impact:'-3 points', trade:'Tree Partner', next:'Trim branches away from roof.'}
  ]},
  {name:'Pool / Spa', done:0, total:10, items:[
    {n:'12.1', title:'Pool Equipment', status:'Monitor', photos:0, observation:'Pool section not applicable unless present; verify during property setup.', cost:'TBD', impact:'0 points', trade:'Pool Partner', next:'Enable if home has pool or spa.'}
  ]},
  {name:'Systems & Appliances', done:6, total:12, items:[
    {n:'13.1', title:'Appliance Age', status:'Monitor', photos:0, observation:'Appliance ages should be entered for replacement forecasting.', cost:'TBD', impact:'-1 point', trade:'Bear Home Management', next:'Collect model and serial numbers.'},
    {n:'13.2', title:'Garbage Disposal', status:'Good', photos:1, observation:'Disposal operates normally at time of inspection.', cost:'—', impact:'0 points', trade:'Verify locally', next:'Monitor.'}
  ]},
  {name:'Documentation & Photos', done:18, total:18, items:[
    {n:'14.1', title:'Warranty Documents', status:'Monitor', photos:0, observation:'Collect available warranties, manuals, and receipts from homeowner.', cost:'—', impact:'0 points', trade:'Bear Home Management', next:'Upload to BearTrack.'},
    {n:'14.2', title:'Photo Record', status:'Good', photos:18, observation:'Baseline photo record created for the home.', cost:'—', impact:'0 points', trade:'Bear Home Management', next:'Update with each service visit.'}
  ]}
];

let activeCategory = 1;
let activeFilter = 'All';
let activeItemIndex = 7;

const catsEl = document.getElementById('inspectionCategories');
const itemsEl = document.getElementById('inspectionItems');
const titleEl = document.getElementById('activeSectionTitle');
const subEl = document.getElementById('activeSectionSub');
const searchEl = document.getElementById('inspectionSearch');
const filtersEl = document.getElementById('statusFilters');

function statusClass(status){ return 'status-' + status.replace(/\s+/g,'-'); }
function getActiveItems(){
  const q = (searchEl?.value || '').toLowerCase();
  return inspectionData[activeCategory].items.filter(item => {
    const matchesFilter = activeFilter === 'All' || item.status === activeFilter;
    const matchesSearch = !q || item.title.toLowerCase().includes(q) || item.observation.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });
}
function renderCategories(){
  if(!catsEl) return;
  catsEl.innerHTML = inspectionData.map((cat, i) => `
    <button type="button" class="cat-button ${i===activeCategory?'active':''}" data-cat="${i}">
      <span class="cat-num">${i+1}</span>
      <span class="cat-name">${cat.name}</span>
      <span class="cat-count">${cat.done}/${cat.total}</span>
    </button>`).join('');
  catsEl.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
    activeCategory = Number(btn.dataset.cat);
    activeItemIndex = 0;
    activeFilter = 'All';
    if(searchEl) searchEl.value = '';
    document.querySelectorAll('#statusFilters button').forEach(b => b.classList.toggle('active', b.dataset.filter === 'All'));
    renderAll();
  }));
}
function renderItems(){
  if(!itemsEl) return;
  const cat = inspectionData[activeCategory];
  titleEl.textContent = `Section ${activeCategory+1}: ${cat.name}`;
  subEl.textContent = `${cat.done} of ${cat.total} items completed`;
  const filtered = getActiveItems();
  itemsEl.innerHTML = filtered.map((item, idx) => `
    <div class="item-row ${idx===activeItemIndex?'active':''}" data-idx="${idx}">
      <span class="item-num">${item.n}</span>
      <div><span class="item-title">${item.title}</span><div class="item-meta">${item.trade || 'Bear Home Management'}</div></div>
      <span class="status-pill ${statusClass(item.status)}">${item.status}</span>
      <span class="photo-count">📷 ${item.photos}</span>
    </div>`).join('') || '<div class="item-row"><div>No items match this filter.</div></div>';
  itemsEl.querySelectorAll('.item-row[data-idx]').forEach(row => row.addEventListener('click', () => {
    activeItemIndex = Number(row.dataset.idx);
    renderItems();
    renderDetail();
  }));
}
function renderDetail(){
  const items = getActiveItems();
  const item = items[activeItemIndex] || items[0] || inspectionData[activeCategory].items[0];
  if(!item) return;
  const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  set('detailNumber', item.n); set('detailTitle', item.title); set('detailObservation', item.observation);
  set('qObserved', item.observation); set('qMeaning', item.meaning || 'This condition should be monitored or addressed before it creates larger repairs.');
  set('qNext', item.next || 'Add to the maintenance roadmap.'); set('qWhen', item.when || (item.status === 'Critical' ? 'Immediately.' : item.status === 'Needs Repair' ? 'Within 30 days.' : item.status === 'Service Soon' ? 'Within 60–180 days.' : 'Review annually.'));
  set('qTrade', item.trade || 'Bear Home Management'); set('detailRecommendation', item.next || 'Monitor during the next scheduled visit.');
  set('detailCost', item.cost || 'TBD'); set('detailImpact', item.impact || '0 points');
  const status = document.getElementById('detailStatus');
  if(status){ status.textContent = item.status; status.className = 'status-pill ' + statusClass(item.status); }
  const note = document.getElementById('inspectionNote'); if(note) note.value = '';
}
function updateScores(){
  const totalDone = inspectionData.reduce((s,c)=>s+c.done,0), total = inspectionData.reduce((s,c)=>s+c.total,0);
  const pct = Math.round(totalDone/total*100);
  const txt=document.getElementById('inspectionProgressText'), bar=document.getElementById('inspectionProgressBar');
  if(txt) txt.textContent = pct + '%'; if(bar) bar.style.width = pct + '%';
}
function renderAll(){ renderCategories(); renderItems(); renderDetail(); updateScores(); }
function toast(msg){
  let el=document.querySelector('.toast');
  if(!el){ el=document.createElement('div'); el.className='toast'; document.body.appendChild(el); }
  el.textContent=msg; el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 2300);
}

if(catsEl){
  renderAll();
  searchEl?.addEventListener('input', () => {activeItemIndex=0; renderItems(); renderDetail();});
  filtersEl?.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    filtersEl.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
    activeItemIndex=0; renderItems(); renderDetail();
  }));
  document.getElementById('saveDraftBtn')?.addEventListener('click',()=>toast('Inspection draft saved.'));
  document.getElementById('completeSectionBtn')?.addEventListener('click',()=>toast('Section marked complete for review.'));
  document.getElementById('addNoteBtn')?.addEventListener('click',()=>toast('Technician note added to BearTrack™.'));
  document.getElementById('createWorkOrderBtn')?.addEventListener('click',()=>toast('Work order created from inspection finding.'));
  document.getElementById('markCompleteBtn')?.addEventListener('click',()=>toast('Inspection item marked complete.'));
}
