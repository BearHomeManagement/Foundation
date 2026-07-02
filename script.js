const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const storageKey = 'bearTrackV2';
const today = new Date().toISOString().slice(0,10);
const defaultState = {
  customers: [],
  workOrders: [
    {id: crypto.randomUUID(), customer:'Sample Customer', property:'123 Bear Trail', jobType:'Bear Home Assessment', date:today, time:'09:00', tech:'Robert', status:'Scheduled', priority:'Normal', next:'Verify water shutoff and complete 45-minute assessment.', notes:'Demo work order. Edit or delete.'},
    {id: crypto.randomUUID(), customer:'Membership Client', property:'456 Pine Den Dr', jobType:'Honey-Do List', date:today, time:'13:00', tech:'Robert', status:'Follow-up Required', priority:'High', next:'Schedule return visit for parts.', notes:'Follow-ups stay active until resolved.'}
  ]
};
let state = JSON.parse(localStorage.getItem(storageKey) || 'null') || defaultState;

function save(){ localStorage.setItem(storageKey, JSON.stringify(state)); renderAll(); }
function byStatus(status){ return state.workOrders.filter(w => w.status === status); }
function activeOrders(){ return state.workOrders.filter(w => w.status !== 'Complete'); }
function completedOrders(){ return state.workOrders.filter(w => w.status === 'Complete'); }
function timeLabel(w){ return `${w.date || today} • ${w.time || 'Auto'} • ${w.tech || 'Unassigned'}`; }

$('.menu-toggle')?.addEventListener('click', () => $('.nav').classList.toggle('open'));

$$('.tab').forEach(tab => tab.addEventListener('click', () => {
  $$('.tab').forEach(t => t.classList.remove('active'));
  $$('.portal-view').forEach(v => v.classList.remove('active'));
  tab.classList.add('active');
  $(`#${tab.dataset.view}-view`).classList.add('active');
}));

$('#requestForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const customerData = Object.fromEntries(new FormData($('#customerForm')).entries());
  const req = Object.fromEntries(new FormData(e.currentTarget).entries());
  const slot = suggestSlot(req);
  const customer = customerData.name || 'New Customer';
  const property = customerData.address || 'Property address needed';
  if (customerData.name || customerData.address) state.customers.push({...customerData, id: crypto.randomUUID()});
  state.workOrders.push({
    id: crypto.randomUUID(), customer, property, jobType:req.jobType || req.type, date:req.date || slot.date,
    time:req.time && req.time !== 'Auto Schedule Best Slot' ? to24(req.time) : slot.time, tech:'Robert',
    status:'Scheduled', priority:req.priority || 'Normal', next:'Ops review / confirm appointment.', notes:req.description || ''
  });
  e.currentTarget.reset();
  alert('Request submitted to Bear Track Ops Schedule Board.');
  save();
});

function suggestSlot(req){
  const date = req.date || today;
  const used = state.workOrders.filter(w => w.date === date).map(w => w.time);
  const slots = req.priority === 'Urgent' ? ['08:00','10:00','13:00','15:00'] : ['10:00','13:00','15:00','08:00'];
  return {date, time: slots.find(s => !used.includes(s)) || '15:00'};
}
function to24(label){
  if (/^\d{2}:\d{2}$/.test(label)) return label;
  const m = label.match(/(\d+):?(\d+)?\s*(AM|PM)/i); if(!m) return '10:00';
  let h = Number(m[1]); const min = m[2] || '00'; const ap = m[3].toUpperCase();
  if(ap === 'PM' && h !== 12) h += 12; if(ap === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2,'0')}:${min}`;
}

$('#opsForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.currentTarget).entries());
  if(data.id){
    const index = state.workOrders.findIndex(w => w.id === data.id);
    if(index >= 0) state.workOrders[index] = {...state.workOrders[index], ...data};
  } else {
    state.workOrders.push({...data, id: crypto.randomUUID(), priority:'Normal'});
  }
  e.currentTarget.reset();
  save();
});
$('#clearOpsForm')?.addEventListener('click', () => $('#opsForm').reset());

function card(w){
  const div = document.createElement('article');
  div.className = 'work-card'; div.draggable = true; div.dataset.id = w.id;
  div.innerHTML = `<strong>${w.customer}</strong><small>${w.property}</small><small>${timeLabel(w)}</small><span class="status-pill">${w.status}</span><p>${w.jobType}</p><p class="muted">Next: ${w.next || 'Review'}</p><div class="work-actions"><button class="mini-btn edit-btn">Edit</button><button class="mini-btn complete-btn">Complete</button><button class="mini-btn delete-btn">Delete</button></div>`;
  div.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', w.id));
  $('.edit-btn', div).addEventListener('click', () => editWorkOrder(w.id));
  $('.complete-btn', div).addEventListener('click', () => { w.status = 'Complete'; save(); });
  $('.delete-btn', div).addEventListener('click', () => { state.workOrders = state.workOrders.filter(x => x.id !== w.id); save(); });
  return div;
}

function editWorkOrder(id){
  const w = state.workOrders.find(x => x.id === id); if(!w) return;
  const form = $('#opsForm'); Object.entries(w).forEach(([k,v]) => { if(form.elements[k]) form.elements[k].value = v; });
  $$('.tab').find(t => t.dataset.view === 'ops')?.click();
}

$$('.dropzone').forEach(zone => {
  zone.addEventListener('dragover', e => e.preventDefault());
  zone.addEventListener('drop', e => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const order = state.workOrders.find(w => w.id === id);
    const status = zone.closest('.board-column').dataset.status;
    if(order && status){ order.status = status; save(); }
  });
});

const sectionNames = ['Exterior / Grounds','Roofline / Gutters','Doors / Windows','Plumbing','Electrical','HVAC / Filters','Kitchen','Bathrooms','Garage / Laundry','Attic / Crawlspace','Water Shutoff','Safety / Smoke Detectors','Systems & Appliances','Documentation & Photos'];
function renderInspection(){
  const root = $('#inspectionSections'); if(!root) return;
  root.innerHTML = sectionNames.map((name,i) => `<div class="section-item"><div><h4>${i+1}. ${name}</h4><p>Add notes and take/upload photos for this section.</p><span class="status-pill">Major components only</span></div><input class="photo-input" type="file" accept="image/*" capture="environment" multiple /></div>`).join('');
}

function renderBoard(){
  const map = {'Scheduled':'#scheduledList','En Route':'#enRouteList','On Site':'#onSiteList','Follow-up Required':'#followList'};
  Object.values(map).forEach(sel => $(sel).innerHTML = '');
  Object.entries(map).forEach(([status, sel]) => byStatus(status).forEach(w => $(sel).appendChild(card(w))));
  $('#historyList').innerHTML = completedOrders().map(w => `<article class="work-card"><strong>${w.customer}</strong><small>${w.property}</small><small>${timeLabel(w)}</small><span class="status-pill">Complete</span><p>${w.jobType}</p><button class="mini-btn" onclick="reopenOrder('${w.id}')">Reopen</button></article>`).join('') || '<p class="muted">No completed jobs yet.</p>';
}
window.reopenOrder = function(id){ const w = state.workOrders.find(x => x.id === id); if(w){ w.status = 'Follow-up Required'; save(); }};

function renderTech(){
  const root = $('#techJobs'); if(!root) return;
  const jobs = activeOrders().filter(w => w.date === today || w.tech === 'Robert');
  root.innerHTML = jobs.map(w => `<article class="work-card"><strong>${w.jobType}</strong><small>${w.customer} • ${w.property}</small><small>${timeLabel(w)}</small><span class="status-pill">${w.status}</span><p>${w.next || ''}</p><button class="mini-btn" onclick="startJob('${w.id}')">Start / Continue</button></article>`).join('') || '<p class="muted">No active jobs assigned.</p>';
}
window.startJob = function(id){ const w = state.workOrders.find(x => x.id === id); if(w){ w.status = 'On Site'; save(); }};

function renderMetrics(){
  $('#metricScheduled').textContent = activeOrders().filter(w => w.status === 'Scheduled').length;
  $('#metricProgress').textContent = activeOrders().filter(w => ['En Route','On Site'].includes(w.status)).length;
  $('#metricFollow').textContent = activeOrders().filter(w => w.status === 'Follow-up Required').length;
  $('#metricComplete').textContent = completedOrders().filter(w => w.date === today).length;
  $('#adminCustomers').textContent = state.customers.length;
  $('#adminProperties').textContent = new Set(state.customers.map(c => c.address).filter(Boolean)).size;
}
function renderAll(){ renderBoard(); renderTech(); renderMetrics(); renderInspection(); }
renderAll();
