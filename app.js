const supabaseUrl = window.BEAROPS_SUPABASE_URL;
const supabaseKey = window.BEAROPS_SUPABASE_ANON_KEY;
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let customers = [];
let properties = [];
let assessments = [];
let workOrders = [];

const $ = id => document.getElementById(id);

function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1800); }
function row(title, body){ return `<div class="row"><h3>${title}</h3><div>${body}</div></div>`; }

async function checkSession(){
  const { data } = await db.auth.getSession();
  if(data.session){ showApp(); } else { showLogin(); }
}

function showLogin(){
  $('loginView').classList.remove('hidden');
  $('appView').classList.add('hidden');
  $('logoutBtn').classList.add('hidden');
}
async function showApp(){
  $('loginView').classList.add('hidden');
  $('appView').classList.remove('hidden');
  $('logoutBtn').classList.remove('hidden');
  await loadAll();
}

async function login(){
  const email=$('loginEmail').value;
  const password=$('loginPassword').value;
  const { error } = await db.auth.signInWithPassword({ email, password });
  if(error){ $('loginMsg').textContent=error.message; return; }
  await showApp();
}

async function logout(){
  await db.auth.signOut();
  showLogin();
}

async function loadAll(){
  const [c,p,a,w] = await Promise.all([
    db.from('customers').select('*').order('created_at',{ascending:false}),
    db.from('properties').select('*').order('created_at',{ascending:false}),
    db.from('assessments').select('*').order('created_at',{ascending:false}),
    db.from('work_orders').select('*').order('created_at',{ascending:false})
  ]);
  if(c.error||p.error||a.error||w.error){
    alert((c.error||p.error||a.error||w.error).message);
    return;
  }
  customers=c.data||[]; properties=p.data||[]; assessments=a.data||[]; workOrders=w.data||[];
  renderAll();
}

function renderAll(){
  renderCounts(); renderCustomers(); renderProperties(); renderAssessments(); renderWorkOrders(); fillSelects();
}
function renderCounts(){
  $('customerCount').textContent=customers.length;
  $('propertyCount').textContent=properties.length;
  $('assessmentCount').textContent=assessments.length;
  $('workOrderCount').textContent=workOrders.filter(w=>w.status!=='complete').length;
}
function fillSelects(){
  const customerOptions=customers.map(c=>`<option value="${c.id}">${c.full_name}</option>`).join('');
  $('propertyCustomer').innerHTML=customerOptions;
  const propertyOptions=properties.map(p=>`<option value="${p.id}">${p.address}</option>`).join('');
  $('assessmentProperty').innerHTML=propertyOptions;
  $('workOrderProperty').innerHTML=propertyOptions;
}
function renderCustomers(){
  $('customerList').innerHTML = customers.map(c=>row(c.full_name, `${c.email||''}<br>${c.phone||''}<br><span class="muted">${c.notes||''}</span>`)).join('') || '<p>No customers yet.</p>';
}
function renderProperties(){
  $('propertyList').innerHTML = properties.map(p=>{
    const c = customers.find(x=>x.id===p.customer_id);
    return row(p.address, `${p.city||''}, ${p.state||''} ${p.zip||''}<br>Owner: ${c?.full_name||'—'}<br><span class="muted">${p.notes||''}</span>`);
  }).join('') || '<p>No properties yet.</p>';
}
function renderAssessments(){
  $('assessmentList').innerHTML = assessments.map(a=>{
    const p = properties.find(x=>x.id===a.property_id);
    return row(`${a.assessment_type||'Home Health Assessment'} - ${a.assessment_date||''}`, `Property: ${p?.address||'—'}<br>Score: ${a.home_health_score||'—'} | Risk: ${a.risk_index||'—'} | Hours: ${a.estimated_hours||0}<br><span class="muted">${a.summary||''}</span>`);
  }).join('') || '<p>No assessments yet.</p>';
}
function renderWorkOrders(){
  $('workOrderList').innerHTML = workOrders.map(w=>{
    const p = properties.find(x=>x.id===w.property_id);
    return row(w.title, `Property: ${p?.address||'—'}<br>Status: ${w.status} | Priority: ${w.priority}<br>Hours: ${w.estimated_hours||0} | Cost: ${w.estimated_cost||'TBD'}<br><span class="muted">${w.description||''}</span>`);
  }).join('') || '<p>No work orders yet.</p>';
}

async function addCustomer(){
  const payload={ full_name:$('customerName').value, email:$('customerEmail').value, phone:$('customerPhone').value, notes:$('customerNotes').value };
  const { error } = await db.from('customers').insert(payload);
  if(error){ alert(error.message); return; }
  ['customerName','customerEmail','customerPhone','customerNotes'].forEach(id=>$(id).value='');
  toast('Customer saved'); await loadAll();
}
async function addProperty(){
  const payload={ customer_id:$('propertyCustomer').value||null, address:$('propertyAddress').value, city:$('propertyCity').value, state:$('propertyState').value, zip:$('propertyZip').value, year_built:Number($('propertyYear').value)||null, square_feet:Number($('propertySqft').value)||null, property_type:$('propertyType').value, notes:$('propertyNotes').value };
  const { error } = await db.from('properties').insert(payload);
  if(error){ alert(error.message); return; }
  ['propertyAddress','propertyCity','propertyZip','propertyYear','propertySqft','propertyType','propertyNotes'].forEach(id=>$(id).value='');
  toast('Property saved'); await loadAll();
}
async function addAssessment(){
  const payload={ property_id:$('assessmentProperty').value||null, technician:$('assessmentTech').value, assessment_date:$('assessmentDate').value||new Date().toISOString().slice(0,10), home_health_score:Number($('assessmentScore').value)||100, risk_index:$('assessmentRisk').value, estimated_hours:Number($('assessmentHours').value)||0, summary:$('assessmentSummary').value, status:'complete' };
  const { error } = await db.from('assessments').insert(payload);
  if(error){ alert(error.message); return; }
  ['assessmentTech','assessmentSummary'].forEach(id=>$(id).value='');
  toast('Assessment saved'); await loadAll();
}
async function addWorkOrder(){
  const payload={ property_id:$('workOrderProperty').value||null, title:$('workOrderTitle').value, description:$('workOrderDescription').value, status:$('workOrderStatus').value, priority:$('workOrderPriority').value, estimated_hours:Number($('workOrderHours').value)||null, estimated_cost:$('workOrderCost').value, assigned_to:$('workOrderAssigned').value, due_date:$('workOrderDue').value||null };
  const { error } = await db.from('work_orders').insert(payload);
  if(error){ alert(error.message); return; }
  ['workOrderTitle','workOrderDescription','workOrderHours','workOrderCost','workOrderAssigned','workOrderDue'].forEach(id=>$(id).value='');
  toast('Work order saved'); await loadAll();
}

document.querySelectorAll('.tabs button').forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  $(btn.dataset.tab).classList.add('active');
});
$('loginBtn').onclick=login;
$('logoutBtn').onclick=logout;
$('addCustomerBtn').onclick=addCustomer;
$('addPropertyBtn').onclick=addProperty;
$('addAssessmentBtn').onclick=addAssessment;
$('addWorkOrderBtn').onclick=addWorkOrder;
$('assessmentDate').value=new Date().toISOString().slice(0,10);

checkSession();
