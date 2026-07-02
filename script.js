const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
if (menuToggle && nav) menuToggle.addEventListener('click', () => nav.classList.toggle('open'));

const storageKey = 'bearTrackWorkOrdersV2';
const initialOrders = [
  {id:'WO-1001', customer:'Sample Customer', property:'123 Oak Ridge Dr', jobType:'Bear Home Assessment', date:'2026-07-03', time:'09:00', tech:'Robert', status:'Scheduled', next:'Confirm access notes', notes:'Website intake request.'},
  {id:'WO-1002', customer:'Member Home', property:'88 River Bend', jobType:'Follow-up', date:'2026-07-03', time:'13:00', tech:'Robert', status:'Follow-up Required', next:'Verify water shutoff label', notes:'Keep active until resolved.'}
];
let orders = JSON.parse(localStorage.getItem(storageKey) || 'null') || initialOrders;
const saveOrders = () => localStorage.setItem(storageKey, JSON.stringify(orders));
const $ = id => document.getElementById(id);

const lists = {
  'Scheduled': $('scheduledList'),
  'En Route': $('enRouteList'),
  'On Site': $('onSiteList'),
  'Follow-up Required': $('followList')
};

function orderCard(order) {
  const card = document.createElement('article');
  card.className = 'work-card';
  card.draggable = true;
  card.dataset.id = order.id;
  card.innerHTML = `
    <strong>${order.customer}</strong>
    <small>${order.property}</small>
    <small>${order.jobType} • ${order.date} ${order.time} • ${order.tech}</small>
    <small><b>Next:</b> ${order.next || 'Review'}</small>
    <div class="work-actions">
      <button class="mini-btn" data-edit="${order.id}">Edit</button>
      <button class="mini-btn complete-btn" data-complete="${order.id}">Complete</button>
      <button class="mini-btn delete-btn" data-delete="${order.id}">Delete</button>
    </div>`;
  card.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', order.id));
  return card;
}

function renderOrders() {
  if (!$('scheduledList')) return;
  Object.values(lists).forEach(list => { if (list) list.innerHTML = ''; });
  const history = $('historyList');
  if (history) history.innerHTML = '';
  orders.forEach(order => {
    if (order.status === 'Complete') {
      if (history) history.appendChild(orderCard(order));
    } else if (lists[order.status]) {
      lists[order.status].appendChild(orderCard(order));
    } else if (lists.Scheduled) {
      lists.Scheduled.appendChild(orderCard(order));
    }
  });
  updateMetrics();
  renderTechJobs();
}

function updateMetrics() {
  const set = (id, val) => { if ($(id)) $(id).textContent = val; };
  set('metricScheduled', orders.filter(o => o.status === 'Scheduled').length);
  set('metricProgress', orders.filter(o => ['En Route','On Site'].includes(o.status)).length);
  set('metricFollow', orders.filter(o => o.status === 'Follow-up Required').length);
  set('metricComplete', orders.filter(o => o.status === 'Complete').length);
}

function renderTechJobs() {
  const box = $('techJobs');
  if (!box) return;
  box.innerHTML = '';
  orders.filter(o => o.status !== 'Complete').forEach(o => {
    const div = document.createElement('div');
    div.className = 'work-card';
    div.innerHTML = `<strong>${o.time} • ${o.customer}</strong><small>${o.property}</small><small>${o.jobType} • ${o.status}</small>`;
    box.appendChild(div);
  });
}

function fillForm(order) {
  const form = $('opsForm');
  if (!form) return;
  Object.keys(order).forEach(k => { if (form.elements[k]) form.elements[k].value = order[k]; });
}

function setupOps() {
  const form = $('opsForm');
  if (!form) return;
  document.querySelectorAll('.dropzone').forEach(zone => {
    zone.addEventListener('dragover', e => e.preventDefault());
    zone.addEventListener('drop', e => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain');
      const col = zone.closest('.board-column');
      const order = orders.find(o => o.id === id);
      if (order && col) { order.status = col.dataset.status; saveOrders(); renderOrders(); }
    });
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.id) data.id = `WO-${Date.now().toString().slice(-6)}`;
    const index = orders.findIndex(o => o.id === data.id);
    if (index >= 0) orders[index] = data; else orders.push(data);
    saveOrders(); form.reset(); renderOrders();
  });
  $('clearOpsForm')?.addEventListener('click', () => form.reset());
  document.addEventListener('click', e => {
    const edit = e.target.dataset.edit, complete = e.target.dataset.complete, del = e.target.dataset.delete;
    if (edit) fillForm(orders.find(o => o.id === edit));
    if (complete) { const o = orders.find(x => x.id === complete); if (o) o.status = 'Complete'; saveOrders(); renderOrders(); }
    if (del) { orders = orders.filter(o => o.id !== del); saveOrders(); renderOrders(); }
  });
}

function renderInspectionSections() {
  const box = $('inspectionSections');
  if (!box) return;
  ['Exterior / Roofline','Interior Rooms','Plumbing / Water Shutoff','Electrical / Safety','HVAC / Filters','Garage / Laundry','Attic / Crawlspace','Grounds / Drainage','Photos & Documents'].forEach((name, i) => {
    const item = document.createElement('div');
    item.className = 'section-item';
    item.innerHTML = `<div><h4>${i+1}. ${name}</h4><p>Add notes and take/upload photos for this section.</p></div><input class="photo-input" type="file" accept="image/*" capture="environment" multiple />`;
    box.appendChild(item);
  });
}

setupOps();
renderOrders();
renderInspectionSections();
