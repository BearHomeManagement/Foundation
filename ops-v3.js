const STORE='bearops_v3';
const template=[
{name:'Property & Safety',items:[
{title:'Customer / Property Info',status:'Good',risk:0,hours:.1,education:'Accurate records keep the home profile useful year after year.',next:'Confirm contact, address, year built, size, and special systems.'},
{title:'Main Water Shutoff',status:'Service Soon',risk:3,hours:.25,education:'Every homeowner should know how to shut water off quickly during a leak.',next:'Locate, test accessibility, label, and photograph the shutoff.'},
{title:'Smoke / CO Detectors',status:'Monitor',risk:2,hours:.25,education:'Detectors have a service life and should be replaced when expired.',next:'Check age, placement, and function.'}]},
{name:'Exterior',items:[
{title:'Gutters & Downspouts',status:'Monitor',risk:2,hours:1,education:'Poor drainage can damage fascia, siding, and foundation areas.',next:'Check debris, discharge locations, and splash blocks.'},
{title:'Sealants / Caulking',status:'Needs Repair',risk:6,hours:2,education:'Failed sealants allow water behind exterior surfaces.',next:'Photograph failed joints and recommend replacement.'},
{title:'Paint / Exterior Finish',status:'Service Soon',risk:3,hours:1,education:'Paint protects trim and siding from moisture and UV damage.',next:'Identify exposed or deteriorated areas.'}]},
{name:'Roof',items:[
{title:'Roof Covering - Ground View',status:'Monitor',risk:4,hours:0,education:'Aging roof materials increase water intrusion risk.',next:'Document visible wear, missing shingles, debris, and penetrations.'},
{title:'Pipe Boots / Roof Penetrations',status:'Needs Repair',risk:5,hours:0,education:'Cracked boots are a common roof leak source.',next:'Flag for roofing partner if deterioration is visible.'}]},
{name:'Plumbing',items:[
{title:'Water Heater',status:'Service Soon',risk:4,hours:0,education:'Older water heaters should be budgeted before failure.',next:'Record age, condition, shutoff, pan, and drain path.'},
{title:'Toilets / Visible Leaks',status:'Monitor',risk:2,hours:.75,education:'Small toilet leaks can waste water and damage flooring.',next:'Check loose toilets, running tanks, and supply lines.'},
{title:'Visible Sink Drains / P-Traps',status:'Monitor',risk:2,hours:.5,education:'Small drain leaks can damage cabinets and flooring.',next:'Check accessible drains and note corrosion or seepage.'}]},
{name:'Electrical',items:[
{title:'Panel Exterior Review',status:'Good',risk:0,hours:0,education:'Panel labeling and visible condition help future service work.',next:'Photograph panel and note visible concerns only.'},
{title:'GFCI Protection',status:'Service Soon',risk:5,hours:0,education:'GFCI protection reduces shock risk in wet locations.',next:'Test accessible GFCI devices and refer as needed.'}]},
{name:'HVAC',items:[
{title:'Filter / Return Air',status:'Good',risk:0,hours:.1,education:'Clean filters protect comfort, efficiency, and equipment life.',next:'Verify filter size and replacement schedule.'},
{title:'Condensate Drain',status:'Monitor',risk:2,hours:.5,education:'Clogged condensate drains can cause interior water damage.',next:'Check visible drain condition and cleanout access.'}]}
];

let state={inspections:[],active:null};
let activeCat=0;

function freshInspection(){
 const today=new Date().toISOString().slice(0,10);
 return {id:Date.now().toString(),created:today,customer:{name:'',email:'',phone:'',address:'',membership:'Startup Assessment',tech:'',date:today},sections:JSON.parse(JSON.stringify(template)),workOrders:[],report:''};
}
function saveState(){localStorage.setItem(STORE,JSON.stringify(state));toast('Saved');renderSaved();}
function loadState(){const raw=localStorage.getItem(STORE);state=raw?JSON.parse(raw):{inspections:[],active:null};if(!state.active){const ins=freshInspection();state.inspections.push(ins);state.active=ins.id;}}
function activeInspection(){return state.inspections.find(i=>i.id===state.active);}
function setView(v){document.querySelectorAll('.view').forEach(e=>e.classList.remove('active'));document.getElementById(v).classList.add('active');document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===v));}
function bindCustomer(){
 const ins=activeInspection(), c=ins.customer;
 ['customerName:name','customerEmail:email','customerPhone:phone','propertyAddress:address','membership:membership','technician:tech','inspectionDate:date'].forEach(pair=>{
  const [id,key]=pair.split(':');const el=document.getElementById(id);el.value=c[key]||'';el.oninput=()=>{c[key]=el.value;renderSaved();updateScores();};
 });
}
function renderCategories(){
 const cats=document.getElementById('categories'), ins=activeInspection();
 cats.innerHTML=ins.sections.map((s,i)=>`<button class="cat ${i===activeCat?'active':''}" onclick="activeCat=${i};renderInspection()">${s.name}</button>`).join('');
}
function slug(s){return s.replace(/\s+/g,'-')}
function renderInspection(){
 const ins=activeInspection(); renderCategories();
 document.getElementById('items').innerHTML=ins.sections[activeCat].items.map((it,idx)=>`
 <article class="item">
  <div class="item-head"><h3>${it.title}</h3><span class="status ${slug(it.status)}">${it.status}</span></div>
  <div class="item-grid">
   <label>Status<select onchange="updateItem(${activeCat},${idx},'status',this.value)">${['Good','Monitor','Service Soon','Needs Repair'].map(s=>`<option ${s===it.status?'selected':''}>${s}</option>`).join('')}</select></label>
   <label>Risk Points<input type="number" value="${it.risk}" onchange="updateItem(${activeCat},${idx},'risk',Number(this.value))"></label>
   <label>Estimated Hours<input type="number" step=".25" value="${it.hours}" onchange="updateItem(${activeCat},${idx},'hours',Number(this.value))"></label>
   <label>Cost Range<input value="${it.cost||''}" placeholder="$100 - $300" onchange="updateItem(${activeCat},${idx},'cost',this.value)"></label>
   <label>Observation<textarea placeholder="What was found..." onchange="updateItem(${activeCat},${idx},'observation',this.value)">${it.observation||''}</textarea></label>
   <label>Recommended Next Step<textarea onchange="updateItem(${activeCat},${idx},'next',this.value)">${it.next||''}</textarea></label>
  </div>
  <p><strong>Homeowner education:</strong> ${it.education}</p>
  <div class="item-actions">
   <button onclick="createWO(${activeCat},${idx})">Create Work Order</button>
   <button onclick="markGood(${activeCat},${idx})">Mark Good</button>
  </div>
 </article>`).join('');
 updateScores(); renderWorkOrders();
}
function updateItem(c,i,key,val){activeInspection().sections[c].items[i][key]=val;updateScores();}
function markGood(c,i){const it=activeInspection().sections[c].items[i];it.status='Good';it.risk=0;renderInspection();}
function createWO(c,i){
 const ins=activeInspection(), it=ins.sections[c].items[i];
 if(!ins.workOrders.find(w=>w.title===it.title)){
  ins.workOrders.push({id:Date.now().toString(),title:it.title,status:'Open',hours:it.hours||0,cost:it.cost||'TBD',next:it.next||'',section:ins.sections[c].name});
 }
 renderWorkOrders();updateScores();toast('Work order created');
}
function renderWorkOrders(){
 const ins=activeInspection(), list=document.getElementById('workOrderList');
 list.innerHTML=ins.workOrders.length?ins.workOrders.map((w,i)=>`<div class="workorder"><h3>${w.title}</h3><p><b>Section:</b> ${w.section}</p><p><b>Next:</b> ${w.next}</p><p><b>Hours:</b> ${w.hours} | <b>Cost:</b> ${w.cost}</p><label>Status<select onchange="activeInspection().workOrders[${i}].status=this.value;updateScores();renderWorkOrders()"><option ${w.status==='Open'?'selected':''}>Open</option><option ${w.status==='Scheduled'?'selected':''}>Scheduled</option><option ${w.status==='Complete'?'selected':''}>Complete</option></select></label></div>`).join(''):'<p>No work orders yet.</p>';
}
function updateScores(){
 const ins=activeInspection(), all=ins.sections.flatMap(s=>s.items);
 const totalRisk=all.reduce((s,i)=>s+(Number(i.risk)||0),0);
 const hours=all.filter(i=>i.status!=='Good').reduce((s,i)=>s+(Number(i.hours)||0),0);
 document.getElementById('score').textContent=Math.max(0,100-totalRisk);
 document.getElementById('risk').textContent=totalRisk<=8?'Low':totalRisk<=20?'Moderate':'High';
 document.getElementById('hours').textContent=hours.toFixed(1);
 document.getElementById('woCount').textContent=ins.workOrders.filter(w=>w.status!=='Complete').length;
}
function generateReport(){
 const ins=activeInspection(), c=ins.customer, all=ins.sections.flatMap(s=>s.items.map(i=>({...i,section:s.name})));
 const findings=all.filter(i=>i.status!=='Good');
 let text=`Bear Home Management - Home Health Assessment\n\nCustomer: ${c.name}\nEmail: ${c.email}\nPhone: ${c.phone}\nProperty: ${c.address}\nMembership: ${c.membership}\nTechnician: ${c.tech}\nDate: ${c.date}\n\nHome Health Score: ${document.getElementById('score').textContent}\nRisk Index: ${document.getElementById('risk').textContent}\nEstimated Home Care Hours: ${document.getElementById('hours').textContent}\nOpen Work Orders: ${document.getElementById('woCount').textContent}\n\nPriority Findings:\n`;
 findings.forEach(f=>{text+=`\n[${f.status}] ${f.section} - ${f.title}\nObservation: ${f.observation||'No observation entered.'}\nWhy it matters: ${f.education}\nNext step: ${f.next}\nEstimated hours: ${f.hours}\nCost range: ${f.cost||'TBD'}\n`;});
 ins.report=text; document.getElementById('reportText').value=text; setView('report');
}
function renderSaved(){
 const list=document.getElementById('savedList');
 list.innerHTML=state.inspections.map(i=>`<div class="saved"><button onclick="state.active='${i.id}';activeCat=0;renderAll()">${i.customer.name||'Unnamed'}<br><small>${i.customer.address||i.created}</small></button></div>`).join('');
}
function newInspection(){const ins=freshInspection();state.inspections.unshift(ins);state.active=ins.id;activeCat=0;renderAll();saveState();}
function exportData(){document.getElementById('dataBox').value=JSON.stringify(state,null,2);}
function importData(){try{state=JSON.parse(document.getElementById('dataBox').value);saveState();renderAll();toast('Imported');}catch(e){alert('Invalid JSON');}}
function clearData(){if(confirm('Clear all local BearOps data?')){localStorage.removeItem(STORE);loadState();renderAll();}}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800);}
function renderAll(){bindCustomer();renderSaved();renderInspection();renderWorkOrders();document.getElementById('reportText').value=activeInspection().report||'';}

document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>setView(b.dataset.view));
document.getElementById('newInspectionBtn').onclick=newInspection;
document.getElementById('saveBtn').onclick=saveState;
document.getElementById('printBtn').onclick=()=>{generateReport();setTimeout(()=>window.print(),100)};
document.getElementById('generateReportBtn').onclick=generateReport;
document.getElementById('exportDataBtn').onclick=exportData;
document.getElementById('importDataBtn').onclick=importData;
document.getElementById('clearDataBtn').onclick=clearData;

loadState();renderAll();
