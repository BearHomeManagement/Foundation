const assessment=[
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
{title:'Toilets / Visible Leaks',status:'Monitor',risk:2,hours:.75,education:'Small toilet leaks can waste water and damage flooring.',next:'Check loose toilets, running tanks, and supply lines.'}]},
{name:'Electrical',items:[
{title:'Panel Exterior Review',status:'Good',risk:0,hours:0,education:'Panel labeling and visible condition help future service work.',next:'Photograph panel and note visible concerns only.'},
{title:'GFCI Protection',status:'Service Soon',risk:5,hours:0,education:'GFCI protection reduces shock risk in wet locations.',next:'Test accessible GFCI devices and refer as needed.'}]},
{name:'HVAC',items:[
{title:'Filter / Return Air',status:'Good',risk:0,hours:.1,education:'Clean filters protect comfort, efficiency, and equipment life.',next:'Verify filter size and replacement schedule.'},
{title:'Condensate Drain',status:'Monitor',risk:2,hours:.5,education:'Clogged condensate drains can cause interior water damage.',next:'Check visible drain condition and cleanout access.'}]}
];
let activeCat=0;
function slug(s){return s.replace(/\s+/g,'-')}
function render(){
 const cats=document.getElementById('categories');
 cats.innerHTML=assessment.map((c,i)=>`<button class="cat ${i===activeCat?'active':''}" onclick="activeCat=${i};render()">${c.name}</button>`).join('');
 const items=document.getElementById('items');
 items.innerHTML=assessment[activeCat].items.map((it,idx)=>`<article class="item"><div class="item-head"><h3>${it.title}</h3><span class="status ${slug(it.status)}">${it.status}</span></div><div class="item-grid"><label>Status<select onchange="updateItem(${activeCat},${idx},'status',this.value)">${['Good','Monitor','Service Soon','Needs Repair'].map(s=>`<option ${s===it.status?'selected':''}>${s}</option>`).join('')}</select></label><label>Risk Points<input type="number" value="${it.risk}" onchange="updateItem(${activeCat},${idx},'risk',Number(this.value))"></label><label>Estimated Hours<input type="number" step=".25" value="${it.hours}" onchange="updateItem(${activeCat},${idx},'hours',Number(this.value))"></label><label>Observation<textarea onchange="updateItem(${activeCat},${idx},'observation',this.value)" placeholder="What was found...">${it.observation||''}</textarea></label><label>Recommended Next Step<textarea onchange="updateItem(${activeCat},${idx},'next',this.value)">${it.next||''}</textarea></label><label>Work Order Flag<select onchange="updateItem(${activeCat},${idx},'workOrder',this.value)"><option>No</option><option ${it.workOrder==='Yes'?'selected':''}>Yes</option></select></label></div><p><strong>Homeowner education:</strong> ${it.education}</p></article>`).join('');
 updateScores();
}
function updateItem(c,i,key,val){assessment[c].items[i][key]=val;render();}
function updateScores(){
 const all=assessment.flatMap(c=>c.items);
 const totalRisk=all.reduce((s,i)=>s+(Number(i.risk)||0),0);
 const hours=all.reduce((s,i)=>s+(Number(i.hours)||0),0);
 document.getElementById('healthScore').textContent=Math.max(0,100-totalRisk);
 document.getElementById('riskIndex').textContent=totalRisk<=8?'Low':totalRisk<=20?'Moderate':'High';
 document.getElementById('hoursEstimate').textContent=hours.toFixed(1);
}
function generateSummary(){
 const name=document.getElementById('customerName').value||'Customer';
 const address=document.getElementById('propertyAddress').value||'Property';
 const tier=document.getElementById('tier').value;
 const all=assessment.flatMap(c=>c.items.map(i=>({...i,cat:c.name})));
 const findings=all.filter(i=>i.status!=='Good');
 let text=`Bear Home Management - Home Health Assessment\nCustomer: ${name}\nProperty: ${address}\nTier: ${tier}\nHome Health Score: ${document.getElementById('healthScore').textContent}\nRisk Index: ${document.getElementById('riskIndex').textContent}\nEstimated Home Care Hours: ${document.getElementById('hoursEstimate').textContent}\n\nPriority Findings:\n`;
 findings.forEach(f=>{text+=`- [${f.status}] ${f.cat}: ${f.title}\n  Observation: ${f.observation||'No observation entered.'}\n  Next Step: ${f.next}\n  Education: ${f.education}\n  Est. Hours: ${f.hours}\n  Work Order: ${f.workOrder||'No'}\n\n`;});
 document.getElementById('summaryOutput').value=text;
}
document.getElementById('exportBtn').addEventListener('click',generateSummary);
render();
