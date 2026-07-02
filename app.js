const db=window.supabase.createClient(window.BEAROPS_SUPABASE_URL,window.BEAROPS_SUPABASE_ANON_KEY),$=id=>document.getElementById(id);
const checklist=[
{cat:'Property & Safety',items:[['Customer / Property Info','Accurate records keep the home profile useful year after year.','Confirm contact, address, year built, size, and special systems.'],['Main Water Shutoff','Every homeowner should know how to shut water off quickly during a leak.','Locate, test accessibility, label, and photograph the shutoff.'],['Smoke / CO Detectors','Detectors have a service life and should be replaced when expired.','Check age, placement, and function.'],['Trip / Fall Hazards','Small trip hazards can create liability and injury risk.','Document uneven walking surfaces and loose handrails.']]},
{cat:'Exterior',items:[['Gutters & Downspouts','Poor drainage can damage fascia, siding, and foundation areas.','Check debris, discharge locations, and splash blocks.'],['Sealants / Caulking','Failed sealants allow water behind exterior surfaces.','Photograph failed joints and recommend replacement.'],['Paint / Exterior Finish','Paint protects trim and siding from moisture and UV damage.','Identify exposed or deteriorated areas.'],['Windows / Doors Exterior','Failed seals and gaps can allow air and water entry.','Check visible sealants, weatherstripping, and operation.']]},
{cat:'Roof',items:[['Roof Covering - Ground View','Aging roof materials increase water intrusion risk.','Document visible wear, missing shingles, debris, and penetrations.'],['Pipe Boots / Roof Penetrations','Cracked boots are a common roof leak source.','Flag for roofing partner if deterioration is visible.'],['Fascia / Soffit','Deteriorated fascia and soffit can indicate roof edge or ventilation problems.','Document rot, staining, pest openings, or displacement.']]},
{cat:'Plumbing',items:[['Water Heater','Older water heaters should be budgeted before failure.','Record age, condition, shutoff, pan, and drain path.'],['Toilets / Visible Leaks','Small toilet leaks can waste water and damage flooring.','Check loose toilets, running tanks, and supply lines.'],['Visible Sink Drains / P-Traps','Small drain leaks can damage cabinets and flooring.','Check accessible drains and note corrosion or seepage.'],['Supply Shutoffs','Accessible fixture shutoffs reduce damage during leaks.','Confirm accessible shutoffs where visible.']]},
{cat:'Electrical',items:[['Panel Exterior Review','Panel labeling and visible condition help future service work.','Photograph panel and note visible concerns only.'],['GFCI Protection','GFCI protection reduces shock risk in wet locations.','Test accessible GFCI devices and refer as needed.'],['Smoke / CO Power','Hardwired detectors should remain powered and current.','Check visible age and operation where accessible.']]},
{cat:'HVAC',items:[['Filter / Return Air','Clean filters protect comfort, efficiency, and equipment life.','Verify filter size and replacement schedule.'],['Condensate Drain','Clogged condensate drains can cause interior water damage.','Check visible drain condition and cleanout access.'],['Air Handler / Closet','Condensation, rust, or staining can warn of service needs.','Document visible condition and access.']]},
{cat:'Interior',items:[['Walls / Ceilings','Staining, cracking, or blistering can indicate leaks or movement.','Document visible stains, cracks, or soft areas.'],['Doors / Hardware','Poor operation can indicate settling, wear, or maintenance needs.','Check representative doors and hardware.']]},
{cat:'Garage / Laundry',items:[['Dryer Vent','Lint buildup can reduce performance and increase fire risk.','Document buildup and recommend cleaning.'],['Garage Door Safety','Garage doors are heavy moving systems and should operate safely.','Check basic operation and visible safety concerns.']]}
];
const flat=checklist.flatMap((s,si)=>s.items.map((it,ii)=>({cat:s.cat,title:it[0],education:it[1],defaultRec:it[2],sort:flatIndex(si,ii)})));
function flatIndex(si,ii){let n=0;for(let i=0;i<si;i++)n+=checklist[i].items.length;return n+ii}
let customers=[],properties=[],assessments=[],workOrders=[],inspection=null,propertyId=null,customerId=null,categoryIds={},savedItems={},current=0;

function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function setView(v){document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));$(v).classList.add('active');
function openPropertyFile(id){
 const p=properties.find(x=>x.id===id);
 if(!p){alert('Property not found');return}
 const propAssessments=assessments.filter(a=>a.property_id===id);
 const propWO=workOrders.filter(w=>w.property_id===id);
 const openWO=propWO.filter(w=>w.status!=='complete');
 const completedWO=propWO.filter(w=>w.status==='complete');
 const latest=propAssessments[0];

 $('propertyFileTitle').textContent=p.address||'Property File';
 $('propertyFileSub').textContent=`${p.city||''}, ${p.state||''} ${p.zip||''} • Owner: ${p.customers?.full_name||'—'}`;
 $('pfScore').textContent=latest?.home_health_score??'—';
 $('pfOpenWO').textContent=openWO.length;
 $('pfCompletedWO').textContent=completedWO.length;
 $('pfAssessments').textContent=propAssessments.length;

 $('pfOpenWorkOrders').innerHTML=openWO.map(w=>row(w.title,`Status: ${w.status}<br>Priority: ${w.priority}<br>Hours: ${w.estimated_hours||0} | Cost: ${w.estimated_cost||'TBD'}<br><span class="muted">${w.description||''}</span>`,`<button data-id="${w.id}" data-status="complete" class="pf-wo-complete">Mark Complete</button>`)).join('')||'<p>No open work orders.</p>';

 $('pfCompletedWorkOrders').innerHTML=completedWO.map(w=>row(w.title,`Completed: ${w.completed_at?new Date(w.completed_at).toLocaleDateString():'—'}<br>Hours: ${w.estimated_hours||0} | Cost: ${w.estimated_cost||'TBD'}<br><span class="muted">${w.description||''}</span>`)).join('')||'<p>No completed work orders yet.</p>';

 $('pfAssessmentHistory').innerHTML=propAssessments.map(a=>row(`${a.assessment_type||'Home Health Assessment'} - ${a.assessment_date||''}`,`Score: ${a.home_health_score??'—'} | Risk: ${a.risk_index??'—'} | Hours: ${a.estimated_hours||0}<br>Status: ${a.status||'draft'}`,`<button data-id="${a.id}" class="pf-open-assessment">Open Inspection</button>`)).join('')||'<p>No inspections yet.</p>';

 document.querySelectorAll('.pf-wo-complete').forEach(b=>b.onclick=async()=>{await updateWOStatus(b.dataset.id,'complete');openPropertyFile(id)});
 document.querySelectorAll('.pf-open-assessment').forEach(b=>b.onclick=()=>openAssessment(b.dataset.id));
 setView('propertyfile');
}

document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===v))}
async function checkSession(){const {data}=await db.auth.getSession();data.session?showApp():showLogin()}
function showLogin(){$('loginView').classList.remove('hidden');$('appView').classList.add('hidden');$('logoutBtn').classList.add('hidden');$('refreshBtn').classList.add('hidden')}
async function showApp(){$('loginView').classList.add('hidden');$('appView').classList.remove('hidden');$('logoutBtn').classList.remove('hidden');$('refreshBtn').classList.remove('hidden');await loadAll()}
async function login(){const {error}=await db.auth.signInWithPassword({email:$('loginEmail').value,password:$('loginPassword').value});if(error){$('loginMsg').textContent=error.message;return}await showApp()}
async function logout(){await db.auth.signOut();location.reload()}

async function loadAll(){
 const [c,p,a,w]=await Promise.all([
  db.from('customers').select('*').order('created_at',{ascending:false}),
  db.from('properties').select('*, customers(*)').order('created_at',{ascending:false}),
  db.from('assessments').select('*, properties(*, customers(*))').order('created_at',{ascending:false}),
  db.from('work_orders').select('*, properties(*)').order('created_at',{ascending:false})
 ]);
 if(c.error||p.error||a.error||w.error){alert((c.error||p.error||a.error||w.error).message);return}
 customers=c.data||[];properties=p.data||[];assessments=a.data||[];workOrders=w.data||[];
 renderAll()
}
function renderAll(){renderCounts();renderSelects();renderCustomers();renderProperties();renderAssessments();renderWorkOrders()}
function renderCounts(){$('metricCustomers').textContent=customers.length;$('metricProperties').textContent=properties.length;$('metricAssessments').textContent=assessments.length;$('metricOpenWO').textContent=workOrders.filter(w=>w.status!=='complete').length}
function renderSelects(){const co=customers.map(c=>`<option value="${c.id}">${c.full_name}</option>`).join('');$('propertyCustomer').innerHTML=co;const po=properties.map(p=>`<option value="${p.id}">${p.address}</option>`).join('');$('assessmentProperty').innerHTML=po}
function row(title,body,actions=''){return`<div class="row"><h3>${title}</h3><div>${body}</div><div class="actions">${actions}</div></div>`}

function renderCustomers(){$('customerList').innerHTML=customers.map(c=>row(c.full_name,`${c.email||''}<br>${c.phone||''}<br><span class="muted">${c.notes||''}</span>`,`<button data-id="${c.id}" class="edit-customer">Edit</button>`)).join('')||'<p>No customers yet.</p>';document.querySelectorAll('.edit-customer').forEach(b=>b.onclick=()=>editCustomer(b.dataset.id))}
function renderProperties(){$('propertyList').innerHTML=properties.map(p=>row(p.address,`${p.city||''}, ${p.state||''} ${p.zip||''}<br>Owner: ${p.customers?.full_name||'—'}<br><span class="muted">${p.notes||''}</span>`,`<button data-id="${p.id}" class="open-property-file">Open Property File</button><button data-id="${p.id}" class="edit-property">Edit</button>`)).join('')||'<p>No properties yet.</p>';document.querySelectorAll('.edit-property').forEach(b=>b.onclick=()=>editProperty(b.dataset.id));document.querySelectorAll('.open-property-file').forEach(b=>b.onclick=()=>openPropertyFile(b.dataset.id))}
function renderAssessments(){const html=assessments.map(a=>`<div class="assessment-row"><h3>${a.properties?.address||'No address'}</h3><p>${a.properties?.customers?.full_name||'No customer'} • ${a.assessment_date||''}</p><p class="muted">Score: ${a.home_health_score??'—'} | Risk: ${a.risk_index??'—'} | Status: ${a.status||'draft'}</p><div class="actions"><button class="open-assessment" data-id="${a.id}">Open / Review</button><button class="delete-assessment danger" data-id="${a.id}">Delete</button></div></div>`).join('')||'<p>No assessments yet.</p>';$('assessmentList').innerHTML=html;$('dashboardAssessments').innerHTML=html;document.querySelectorAll('.open-assessment').forEach(b=>b.onclick=()=>openAssessment(b.dataset.id));document.querySelectorAll('.delete-assessment').forEach(b=>b.onclick=()=>deleteAssessment(b.dataset.id))}
function renderWorkOrders(){const html=workOrders.map(w=>row(w.title,`Property: ${w.properties?.address||'—'}<br>Status: ${w.status} | Priority: ${w.priority}<br>Hours: ${w.estimated_hours||0} | Cost: ${w.estimated_cost||'TBD'}<br><span class="muted">${w.description||''}</span>`,`<button data-id="${w.id}" data-status="scheduled" class="wo-status">Schedule</button><button data-id="${w.id}" data-status="complete" class="wo-status">Complete</button>`)).join('')||'<p>No work orders yet.</p>';$('workOrderList').innerHTML=html;$('dashboardWorkOrders').innerHTML=html;document.querySelectorAll('.wo-status').forEach(b=>b.onclick=()=>updateWOStatus(b.dataset.id,b.dataset.status))}

async function saveCustomer(){const payload={full_name:$('customerName').value,email:$('customerEmail').value,phone:$('customerPhone').value,notes:$('customerNotes').value};let error;if($('customerId').value)({error}=await db.from('customers').update(payload).eq('id',$('customerId').value));else({error}=await db.from('customers').insert(payload));if(error){alert(error.message);return}clearCustomer();toast('Customer saved');await loadAll()}
function editCustomer(id){const c=customers.find(x=>x.id===id);$('customerId').value=c.id;$('customerName').value=c.full_name||'';$('customerEmail').value=c.email||'';$('customerPhone').value=c.phone||'';$('customerNotes').value=c.notes||'';setView('customers')}
function clearCustomer(){['customerId','customerName','customerEmail','customerPhone','customerNotes'].forEach(id=>$(id).value='')}

async function saveProperty(){const payload={customer_id:$('propertyCustomer').value||null,address:$('propertyAddress').value,city:$('propertyCity').value,state:$('propertyState').value,zip:$('propertyZip').value,year_built:Number($('propertyYear').value)||null,square_feet:Number($('propertySqft').value)||null,property_type:$('propertyType').value,notes:$('propertyNotes').value};let error;if($('propertyId').value)({error}=await db.from('properties').update(payload).eq('id',$('propertyId').value));else({error}=await db.from('properties').insert(payload));if(error){alert(error.message);return}clearProperty();toast('Property saved');await loadAll()}
function editProperty(id){const p=properties.find(x=>x.id===id);$('propertyId').value=p.id;$('propertyCustomer').value=p.customer_id||'';$('propertyAddress').value=p.address||'';$('propertyCity').value=p.city||'';$('propertyState').value=p.state||'';$('propertyZip').value=p.zip||'';$('propertyYear').value=p.year_built||'';$('propertySqft').value=p.square_feet||'';$('propertyType').value=p.property_type||'';$('propertyNotes').value=p.notes||'';setView('properties')}
function clearProperty(){['propertyId','propertyAddress','propertyCity','propertyZip','propertyYear','propertySqft','propertyType','propertyNotes'].forEach(id=>$(id).value='')}

async function startExistingAssessment(){const pid=$('assessmentProperty').value;if(!pid){alert('Create a property first.');return}await createAssessment(pid,$('assessmentTech').value)}
async function quickStartAssessment(){if(!$('quickCustomer').value||!$('quickAddress').value){alert('Customer and address required.');return}const {data:c,error:ce}=await db.from('customers').insert({full_name:$('quickCustomer').value,email:$('quickEmail').value,phone:$('quickPhone').value}).select().single();if(ce){alert(ce.message);return}const {data:p,error:pe}=await db.from('properties').insert({customer_id:c.id,address:$('quickAddress').value,city:$('quickCity').value,state:$('quickState').value,zip:$('quickZip').value}).select().single();if(pe){alert(pe.message);return}await createAssessment(p.id,$('quickTech').value)}
async function createAssessment(pid,tech){const {data:a,error}=await db.from('assessments').insert({property_id:pid,technician:tech,assessment_date:new Date().toISOString().slice(0,10),assessment_type:'Home Health Assessment',status:'draft',home_health_score:100,risk_index:'Low',estimated_hours:0}).select().single();if(error){alert(error.message);return}await ensureCategories(a.id);await loadAll();await openAssessment(a.id);toast('Assessment started')}
async function ensureCategories(assessmentId){const {data:existing}=await db.from('assessment_categories').select('*').eq('assessment_id',assessmentId).order('sort_order');if(existing&&existing.length){return existing}for(let i=0;i<checklist.length;i++){await db.from('assessment_categories').insert({assessment_id:assessmentId,name:checklist[i].cat,sort_order:i})}const {data}=await db.from('assessment_categories').select('*').eq('assessment_id',assessmentId).order('sort_order');return data||[]}
async function openAssessment(id){const {data:a,error}=await db.from('assessments').select('*, properties(*, customers(*))').eq('id',id).single();if(error){alert(error.message);return}inspection=a;propertyId=a.property_id;customerId=a.properties?.customer_id;categoryIds={};savedItems={};current=0;const cats=await ensureCategories(id);cats.forEach(c=>categoryIds[c.name]=c.id);const {data:items,error:ie}=await db.from('assessment_items').select('*').in('category_id',cats.map(c=>c.id)).order('sort_order');if(ie){alert(ie.message);return}items.forEach(i=>savedItems[i.sort_order]=i);$('editCustomerName').value=a.properties?.customers?.full_name||'';$('editCustomerEmail').value=a.properties?.customers?.email||'';$('editCustomerPhone').value=a.properties?.customers?.phone||'';$('editPropertyAddress').value=a.properties?.address||'';$('editPropertyCity').value=a.properties?.city||'';$('editPropertyState').value=a.properties?.state||'';$('editPropertyZip').value=a.properties?.zip||'';$('editTechnician').value=a.technician||'';$('inspectionTitle').textContent=a.properties?.address||'Inspection Editor';$('inspectionSub').textContent=(a.properties?.customers?.full_name||'')+' • '+(a.assessment_date||'');$('inspectionEditor').classList.remove('hidden');renderSectionButtons();setView('assessments');renderItem();summary();$('reportText').value=a.summary||''}
async function saveInspectionMeta(){await db.from('customers').update({full_name:$('editCustomerName').value,email:$('editCustomerEmail').value,phone:$('editCustomerPhone').value}).eq('id',customerId);await db.from('properties').update({address:$('editPropertyAddress').value,city:$('editPropertyCity').value,state:$('editPropertyState').value,zip:$('editPropertyZip').value}).eq('id',propertyId);await db.from('assessments').update({technician:$('editTechnician').value}).eq('id',inspection.id);toast('Info saved');await loadAll()}
async function deleteAssessment(id){if(!confirm('Delete this inspection and related work orders?'))return;const cats=await ensureCategories(id);const catIds=cats.map(c=>c.id);if(catIds.length){const {data:items}=await db.from('assessment_items').select('id').in('category_id',catIds);const ids=(items||[]).map(i=>i.id);if(ids.length)await db.from('work_orders').delete().in('assessment_item_id',ids);await db.from('assessment_items').delete().in('category_id',catIds)}await db.from('assessment_categories').delete().eq('assessment_id',id);await db.from('assessments').delete().eq('id',id);$('inspectionEditor').classList.add('hidden');toast('Inspection deleted');await loadAll()}

function renderSectionButtons(){let start=0;$('sectionButtons').innerHTML=checklist.map((s,idx)=>{const myStart=start;start+=s.items.length;return`<button class="section-btn" data-start="${myStart}">${s.cat}</button>`}).join('');document.querySelectorAll('.section-btn').forEach(b=>b.onclick=()=>{current=Number(b.dataset.start);renderItem()})}
function statusDefaults(s){return s==='Good'?{risk:0,hours:0}:s==='Monitor'?{risk:2,hours:.25}:s==='Service Soon'?{risk:4,hours:.75}:{risk:7,hours:1.5}}
function renderItem(){const item=flat[current],ex=savedItems[current]||{};$('sectionTitle').textContent=item.cat;$('categoryLabel').textContent=item.cat;$('itemTitle').textContent=item.title;$('educationText').textContent=item.education;$('itemCounter').textContent=`Item ${current+1} of ${flat.length}`;$('barFill').style.width=(current/flat.length*100)+'%';document.querySelectorAll('.choice').forEach(b=>b.classList.toggle('active',b.dataset.status===(ex.status||'')));document.querySelectorAll('.section-btn').forEach(b=>b.classList.toggle('active',b.textContent===item.cat));$('riskPoints').value=ex.risk_points??0;$('estimatedHours').value=ex.estimated_hours??0;$('costRange').value=ex.cost_range||'';$('workOrderNeeded').value=ex.work_order_needed?'Yes':'No';$('observation').value=ex.observation||'';$('recommendation').value=ex.recommendation||item.defaultRec;previewScore()}
function chooseStatus(s){const d=statusDefaults(s);$('riskPoints').value=d.risk;$('estimatedHours').value=d.hours;$('workOrderNeeded').value=s==='Needs Repair'?'Yes':'No';document.querySelectorAll('.choice').forEach(b=>b.classList.toggle('active',b.dataset.status===s));previewScore()}
async function saveItem(){const item=flat[current],active=document.querySelector('.choice.active'),status=active?active.dataset.status:'Good',payload={category_id:categoryIds[item.cat],title:item.title,status,risk_points:Number($('riskPoints').value)||0,estimated_hours:Number($('estimatedHours').value)||0,observation:$('observation').value,homeowner_education:item.education,recommendation:$('recommendation').value,cost_range:$('costRange').value,work_order_needed:$('workOrderNeeded').value==='Yes',sort_order:current};let data,error;if(savedItems[current]?.id)({data,error}=await db.from('assessment_items').update(payload).eq('id',savedItems[current].id).select().single());else({data,error}=await db.from('assessment_items').insert(payload).select().single());if(error){alert(error.message);return false}savedItems[current]=data;await updateTotals();toast('Item saved');return true}
async function nextItem(){if(await saveItem()){if(current<flat.length-1){current++;renderItem()}else{$('barFill').style.width='100%';summary()}}}
function prevItem(){if(current>0){current--;renderItem()}}
function calc(){const items=Object.values(savedItems),risk=items.reduce((s,i)=>s+(Number(i.risk_points)||0),0),hours=items.reduce((s,i)=>s+(Number(i.estimated_hours)||0),0),score=Math.max(0,100-risk),riskIndex=risk<=8?'Low':risk<=20?'Moderate':'High';return{items,risk,hours,score,riskIndex,wo:items.filter(i=>i.work_order_needed).length}}
function previewScore(){$('liveScore').textContent=calc().score}
async function updateTotals(){const t=calc();$('liveScore').textContent=t.score;await db.from('assessments').update({home_health_score:t.score,risk_index:t.riskIndex,estimated_hours:t.hours}).eq('id',inspection.id);summary();await loadAll()}
function summary(){const t=calc();$('finalScore').textContent=t.score;$('finalRisk').textContent=t.riskIndex;$('finalHours').textContent=t.hours.toFixed(1);$('finalWO').textContent=t.wo}
function generateReport(){const t=calc();let txt=`Bear Home Management - Home Health Assessment\n\nCustomer: ${$('editCustomerName').value}\nProperty: ${$('editPropertyAddress').value}\nTechnician: ${$('editTechnician').value}\n\nHome Health Score: ${t.score}\nRisk Index: ${t.riskIndex}\nEstimated Home Care Hours: ${t.hours.toFixed(1)}\nWork Orders Recommended: ${t.wo}\n\nFindings:\n`;t.items.filter(i=>i.status!=='Good').forEach(i=>{txt+=`\n[${i.status}] ${i.title}\nObservation: ${i.observation||'No observation entered.'}\nWhy it matters: ${i.homeowner_education}\nRecommendation: ${i.recommendation}\nCost range: ${i.cost_range||'TBD'}\n`});$('reportText').value=txt;db.from('assessments').update({summary:txt,status:'complete'}).eq('id',inspection.id);setView('report');toast('Report updated')}
async function createWorkOrders(){const t=calc();for(const i of t.items.filter(x=>x.work_order_needed)){const {data:existing}=await db.from('work_orders').select('id').eq('assessment_item_id',i.id);if(!existing?.length)await db.from('work_orders').insert({property_id:propertyId,assessment_item_id:i.id,title:i.title,description:i.observation,priority:i.risk_points>=7?'high':'normal',status:'open',estimated_hours:i.estimated_hours,estimated_cost:i.cost_range})}toast('Work orders created');await loadAll();setView('workorders')}
async function updateWOStatus(id,status){await db.from('work_orders').update({status,completed_at:status==='complete'?new Date().toISOString():null}).eq('id',id);toast('Work order updated');await loadAll()}


function openPropertyFile(id){
 const p=properties.find(x=>x.id===id);
 if(!p){alert('Property not found');return}
 const propAssessments=assessments.filter(a=>a.property_id===id);
 const propWO=workOrders.filter(w=>w.property_id===id);
 const openWO=propWO.filter(w=>w.status!=='complete');
 const completedWO=propWO.filter(w=>w.status==='complete');
 const latest=propAssessments[0];

 $('propertyFileTitle').textContent=p.address||'Property File';
 $('propertyFileSub').textContent=`${p.city||''}, ${p.state||''} ${p.zip||''} • Owner: ${p.customers?.full_name||'—'}`;
 $('pfScore').textContent=latest?.home_health_score??'—';
 $('pfOpenWO').textContent=openWO.length;
 $('pfCompletedWO').textContent=completedWO.length;
 $('pfAssessments').textContent=propAssessments.length;

 $('pfOpenWorkOrders').innerHTML=openWO.map(w=>row(w.title,`Status: ${w.status}<br>Priority: ${w.priority}<br>Hours: ${w.estimated_hours||0} | Cost: ${w.estimated_cost||'TBD'}<br><span class="muted">${w.description||''}</span>`,`<button data-id="${w.id}" data-status="complete" class="pf-wo-complete">Mark Complete</button>`)).join('')||'<p>No open work orders.</p>';

 $('pfCompletedWorkOrders').innerHTML=completedWO.map(w=>row(w.title,`Completed: ${w.completed_at?new Date(w.completed_at).toLocaleDateString():'—'}<br>Hours: ${w.estimated_hours||0} | Cost: ${w.estimated_cost||'TBD'}<br><span class="muted">${w.description||''}</span>`)).join('')||'<p>No completed work orders yet.</p>';

 $('pfAssessmentHistory').innerHTML=propAssessments.map(a=>row(`${a.assessment_type||'Home Health Assessment'} - ${a.assessment_date||''}`,`Score: ${a.home_health_score??'—'} | Risk: ${a.risk_index??'—'} | Hours: ${a.estimated_hours||0}<br>Status: ${a.status||'draft'}`,`<button data-id="${a.id}" class="pf-open-assessment">Open Inspection</button>`)).join('')||'<p>No inspections yet.</p>';

 document.querySelectorAll('.pf-wo-complete').forEach(b=>b.onclick=async()=>{await updateWOStatus(b.dataset.id,'complete');openPropertyFile(id)});
 document.querySelectorAll('.pf-open-assessment').forEach(b=>b.onclick=()=>openAssessment(b.dataset.id));
 setView('propertyfile');
}

document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>setView(b.dataset.view));
document.querySelectorAll('.choice').forEach(b=>b.onclick=()=>chooseStatus(b.dataset.status));
$('loginBtn').onclick=login;$('logoutBtn').onclick=logout;$('refreshBtn').onclick=loadAll;
$('dashNewInspection').onclick=()=>setView('assessments');$('propertyFileBackBtn').onclick=()=>setView('properties');$('dashNewCustomer').onclick=()=>setView('customers');$('dashWorkOrders').onclick=()=>setView('workorders');
$('saveCustomerBtn').onclick=saveCustomer;$('clearCustomerBtn').onclick=clearCustomer;
$('savePropertyBtn').onclick=saveProperty;$('clearPropertyBtn').onclick=clearProperty;
$('startAssessmentBtn').onclick=startExistingAssessment;$('quickStartAssessmentBtn').onclick=quickStartAssessment;
$('saveInspectionMetaBtn').onclick=saveInspectionMeta;$('deleteAssessmentBtn').onclick=()=>deleteAssessment(inspection.id);
$('prevItemBtn').onclick=prevItem;$('saveItemBtn').onclick=saveItem;$('nextItemBtn').onclick=nextItem;
$('generateReportBtn').onclick=generateReport;$('createWorkOrdersBtn').onclick=createWorkOrders;
checkSession();
