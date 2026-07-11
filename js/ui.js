// ============================================
// BearTrack UI Module
// Shared UI helpers
// ============================================

(() => {
'use strict';

function toast(message,type='info',timeout=3000){
  let host=document.getElementById('toastHost');
  if(!host){
    host=document.createElement('div');
    host.id='toastHost';
    host.style.cssText='position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(host);
  }
  const t=document.createElement('div');
  t.textContent=message;
  t.style.cssText='padding:10px 14px;border-radius:8px;background:#222;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.3);';
  if(type==='error') t.style.background='#b3261e';
  if(type==='success') t.style.background='#146c2e';
  host.appendChild(t);
  setTimeout(()=>t.remove(),timeout);
}

function show(id){document.getElementById(id)?.classList.remove('hidden');}
function hide(id){document.getElementById(id)?.classList.add('hidden');}
function toggle(id){document.getElementById(id)?.classList.toggle('hidden');}

function openTab(name){
  document.querySelectorAll('[data-page]').forEach(e=>e.classList.add('hidden'));
  document.querySelector(`[data-page="${name}"]`)?.classList.remove('hidden');
  document.dispatchEvent(new CustomEvent('beartrack:page-changed',{detail:{page:name}}));
}

function confirmAction(msg){
  return Promise.resolve(window.confirm(msg));
}

document.addEventListener('beartrack:toast',e=>{
  toast(e.detail?.message||'Done','success');
});
document.addEventListener('beartrack:error',e=>{
  toast(e.detail?.message||'An error occurred','error',5000);
});

window.BearTrackUI={
 toast,
 show,
 hide,
 toggle,
 openTab,
 confirmAction
};

})();
