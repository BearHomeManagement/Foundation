
const BHM_STORE_KEY = 'beartrackRecords';
const cfg = window.BHM_SUPABASE || {};
let supabaseClient = null;

async function getSupabase() {
  if (!cfg.url || !cfg.anonKey || cfg.url.includes('YOUR_')) return null;
  if (supabaseClient) return supabaseClient;
  const mod = await import('https://esm.sh/@supabase/supabase-js@2');
  supabaseClient = mod.createClient(cfg.url, cfg.anonKey);
  return supabaseClient;
}

function getLocalRecords() {
  return JSON.parse(localStorage.getItem(BHM_STORE_KEY) || '{"profiles":[],"workorders":[],"memberships":[]}');
}
function setLocalRecords(records) { localStorage.setItem(BHM_STORE_KEY, JSON.stringify(records)); }
function formToObject(form) {
  const data = new FormData(form);
  const obj = {};
  for (const [key, value] of data.entries()) {
    if (value instanceof File) continue;
    obj[key] = value;
  }
  obj.id = obj.id || `BHM-${Date.now()}`;
  obj.created_at = new Date().toISOString();
  obj.status = obj.status || 'New Request';
  return obj;
}
async function uploadPhotos(files, workorderId) {
  const supabase = await getSupabase();
  if (!supabase || !files || !files.length) return [];
  const uploaded = [];
  for (const file of files) {
    const path = `${workorderId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(cfg.storageBucket || 'beartrack-photos').upload(path, file, { upsert: true });
    if (!error) uploaded.push(path);
  }
  return uploaded;
}
async function saveRecord(type, record, files) {
  const records = getLocalRecords();
  const key = type + 's';
  if (type === 'workorder') record.photo_paths = await uploadPhotos(files, record.id);
  records[key].unshift(record);
  setLocalRecords(records);
  const supabase = await getSupabase();
  if (supabase) {
    const table = type === 'workorder' ? 'workorders' : type === 'profile' ? 'profiles' : 'memberships';
    await supabase.from(table).insert(record);
  }
  return record;
}
async function updateWorkorder(id, updates) {
  const records = getLocalRecords();
  records.workorders = records.workorders.map(w => w.id === id ? { ...w, ...updates, updated_at: new Date().toISOString() } : w);
  setLocalRecords(records);
  const supabase = await getSupabase();
  if (supabase) await supabase.from('workorders').update(updates).eq('id', id);
}
async function loadRecords() {
  const local = getLocalRecords();
  const supabase = await getSupabase();
  if (!supabase) return local;
  const [profiles, workorders, memberships] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending:false }),
    supabase.from('workorders').select('*').order('created_at', { ascending:false }),
    supabase.from('memberships').select('*').order('created_at', { ascending:false })
  ]);
  return {
    profiles: profiles.data || local.profiles,
    workorders: workorders.data || local.workorders,
    memberships: memberships.data || local.memberships
  };
}
window.BearTrackCloud = { formToObject, saveRecord, loadRecords, updateWorkorder, getLocalRecords };
