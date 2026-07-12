// BearTrack Assessments Module - repaired setup workflow
(() => {
  'use strict';

  let assessments = [];
  const escapeHtml = value => String(value ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  function normalize(a) {
    return {
      id:a.id, property_id:a.property_id||null, technician:a.technician||'',
      assessment_date:a.assessment_date||null,
      assessment_type:a.assessment_type||'Initial',
      status:a.status||'draft', home_health_score:a.home_health_score??100,
      risk_index:a.risk_index||'Low', estimated_hours:a.estimated_hours??0,
      summary:a.summary||'', created_at:a.created_at||null, properties:a.properties||null
    };
  }

  const getById = id => assessments.find(a => String(a.id) === String(id)) || null;
  const getByPropertyId = id => assessments.filter(a => String(a.property_id) === String(id));

  async function load() {
    const rows = await window.BearTrackDB.select('assessments', {
      columns:'*, properties(*, customers(*))', orderBy:'created_at', ascending:false
    });
    assessments = (rows || []).map(normalize);
    render();
    document.dispatchEvent(new CustomEvent('beartrack:assessments-loaded', {
      detail:{assessments:[...assessments]}
    }));
    return assessments;
  }

  async function create(propertyId, assessmentType='Initial', technician='') {
    if (!propertyId) throw new Error('Property is required to start an assessment.');
    if (!['Initial','Renewal'].includes(assessmentType)) throw new Error('Choose Initial or Renewal.');

    const record = {
      property_id:propertyId,
      technician:technician||null,
      assessment_date:new Date().toISOString().slice(0,10),
      assessment_type:assessmentType,
      status:'draft',
      home_health_score:100,
      risk_index:'Low',
      estimated_hours:0
    };
    const saved = await window.BearTrackDB.insert('assessments',[record],{
      single:true, columns:'*, properties(*, customers(*))'
    });
    assessments.unshift(normalize(saved));
    render();
    document.dispatchEvent(new CustomEvent('beartrack:assessment-created',{detail:{assessment:saved}}));
    return saved;
  }

  async function update(id,payload) {
    const saved = await window.BearTrackDB.update('assessments',id,{...payload});
    const i = assessments.findIndex(a => String(a.id) === String(id));
    if (i >= 0) assessments[i] = normalize({...assessments[i],...saved});
    render();
    document.dispatchEvent(new CustomEvent('beartrack:assessment-updated',{detail:{assessment:saved}}));
    return saved;
  }

  const complete = (id,summary='') => update(id,{status:'complete',summary:summary||null});

  async function remove(id) {
    await window.BearTrackDB.remove('assessments',id);
    assessments = assessments.filter(a => String(a.id) !== String(id));
    render();
    document.dispatchEvent(new CustomEvent('beartrack:assessment-deleted',{detail:{assessmentId:id}}));
  }

  function ensureSetup() {
    const page = document.getElementById('assessments');
    if (!page || document.getElementById('assessmentSetupPanel')) return;

    page.insertAdjacentHTML('afterbegin', `
      <div class="panel panel-pad" id="assessmentSetupPanel" style="margin-bottom:16px">
        <h3>Start Assessment</h3>
        <div class="form-grid">
          <div class="field"><label>Property</label><select id="assessmentProperty"></select></div>
          <div class="field"><label>Assessment Type</label>
            <select id="assessmentType"><option value="Initial">Initial</option><option value="Renewal">Renewal</option></select>
          </div>
          <div class="field"><label>Technician</label><input id="assessmentTech" placeholder="Optional"></div>
        </div>
        <div class="actions"><button class="btn gold" id="startAssessmentBtn" type="button">Start Assessment</button></div>
      </div>
    `);
    populatePropertySelect();
    bindStartButtons();
  }

  function render() {
    ensureSetup();
    const list = document.getElementById('assessmentList');
    if (!list) return;
    list.innerHTML = assessments.length ? assessments.map(a => `
      <div class="assessment-row" data-assessment-id="${a.id}">
        <h3>${escapeHtml(a.properties?.address || 'No address')}</h3>
        <p>${escapeHtml(a.properties?.customers?.full_name || 'No customer')} • ${escapeHtml(a.assessment_date || '')}</p>
        <p class="muted">Type: ${escapeHtml(a.assessment_type)} | Score: ${escapeHtml(a.home_health_score ?? '—')} | Risk: ${escapeHtml(a.risk_index ?? '—')} | Status: ${escapeHtml(formatStatus(a.status))}</p>
        <div class="actions">
          <button type="button" class="btn open-assessment" data-id="${a.id}">Open / Review</button>
          <button type="button" class="btn red delete-assessment" data-id="${a.id}">Delete</button>
        </div>
      </div>`).join('') : '<p>No assessments yet.</p>';

    list.querySelectorAll('.open-assessment').forEach(btn => {
      btn.onclick = () => document.dispatchEvent(new CustomEvent('beartrack:open-assessment',{
        detail:{assessmentId:btn.dataset.id,assessment:getById(btn.dataset.id)}
      }));
    });
    list.querySelectorAll('.delete-assessment').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Delete this assessment?')) return;
        try { await remove(btn.dataset.id); } catch (e) { alert(e.message || String(e)); }
      };
    });
  }

  function populatePropertySelect() {
    const select = document.getElementById('assessmentProperty');
    if (!select || !window.BearTrackProperties) return;
    const props = window.BearTrackProperties.getAll();
    select.innerHTML = props.length
      ? '<option value="">Select a property</option>' + props.map(p =>
          `<option value="${p.id}">${escapeHtml(p.address)}${p.customers?.full_name ? ' — '+escapeHtml(p.customers.full_name) : ''}</option>`
        ).join('')
      : '<option value="">No properties available</option>';
  }

  function bindStartButtons() {
    const btn = document.getElementById('startAssessmentBtn');
    if (!btn || btn.dataset.boundAssessments) return;
    btn.dataset.boundAssessments='true';
    btn.onclick = async () => {
      try {
        const propertyId = document.getElementById('assessmentProperty')?.value || '';
        const type = document.getElementById('assessmentType')?.value || '';
        const tech = document.getElementById('assessmentTech')?.value || '';
        const assessment = await create(propertyId,type,tech);
        document.dispatchEvent(new CustomEvent('beartrack:open-assessment',{
          detail:{assessmentId:assessment.id,assessment}
        }));
      } catch (e) { alert(e.message || String(e)); }
    };
  }

  function calculateSummary(items=[]) {
    const risk=items.reduce((t,i)=>t+(Number(i.risk_points)||0),0);
    const estimatedHours=items.reduce((t,i)=>t+(Number(i.estimated_hours)||0),0);
    return {
      risk, estimatedHours, score:Math.max(0,100-risk),
      riskIndex:risk<=8?'Low':risk<=20?'Moderate':'High',
      workOrdersRecommended:items.filter(i=>i.work_order_needed).length
    };
  }

  function generateReportText(assessment,items=[],propertyAddress='') {
    const s=calculateSummary(items);
    let text=`BearTrack™ Home Health Assessment
Prepared by Bear Home Management

Property: ${propertyAddress||assessment?.properties?.address||''}
Assessment Type: ${assessment?.assessment_type||''}

Home Health Score: ${s.score}
Risk Index: ${s.riskIndex}
Estimated Home Care Hours: ${s.estimatedHours.toFixed(1)}
Work Orders Recommended: ${s.workOrdersRecommended}

Findings:
`;
    items.filter(i=>String(i.status||'').toLowerCase()!=='good').forEach(i=>{
      text+=`
[${i.status||'Finding'}] ${i.title||''}
Observation: ${i.observation||'No observation entered.'}
Why it matters: ${i.homeowner_education||''}
Recommendation: ${i.recommendation||''}
Cost range: ${i.cost_range||'TBD'}
`;
    });
    return text;
  }

  function formatStatus(v){return String(v||'').replaceAll('_',' ').replace(/\b\w/g,l=>l.toUpperCase());}

  document.addEventListener('beartrack:properties-loaded',()=>{ensureSetup();populatePropertySelect();});
  document.addEventListener('beartrack:new-assessment',()=>{
    ensureSetup();
    document.querySelector('#nav [data-page="assessments"]')?.click();
    setTimeout(()=>document.getElementById('assessmentProperty')?.focus(),50);
  });

  window.BearTrackAssessments = {
    load,create,update,complete,remove,render,bindStartButtons,populatePropertySelect,
    calculateSummary,generateReportText,getById,getByPropertyId,getAll:()=>[...assessments]
  };
})();
