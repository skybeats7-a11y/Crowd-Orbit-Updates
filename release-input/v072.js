'use strict';
(() => {
  const $=s=>document.querySelector(s);
  const native=window.CrowdOrbitNative;
  const manifest='https://raw.githubusercontent.com/skybeats7-a11y/Crowd-Orbit-Updates/main/latest.json';

  function setStatus(text,state=''){
    const el=$('#co70-u-status');
    if(!el)return;
    el.textContent=text;
    el.className='co70-status'+(state?' '+state:'');
    const btn=$('#co70-u-check');
    if(btn)btn.disabled=state==='busy';
  }

  const prior=window.CrowdOrbitUpdater||{};
  window.CrowdOrbitUpdater={...prior,
    onCheckResult(raw){
      let r;
      try{r=JSON.parse(raw)}catch{
        setStatus('Could not read the update response.','error');
        try{prior.onCheckResult?.(raw)}catch{}
        return;
      }
      if(!r.ok){setStatus(`Update check failed: ${r.error||'Unknown error'}`,'error');return}
      if(r.uiVersion===r.installedVersion){setStatus(`Crowd Orbit ${r.installedVersion} is current.`,'ok');return}
      setStatus(`Installing Interface ${r.uiVersion}…`,'busy');
      try{native?.installUiUpdate?.(r.bundleUrl,r.sha256,r.uiVersion)}catch(e){setStatus(`Could not start update install: ${e?.message||e}`,'error')}
    },
    onInstallResult(raw){
      let r;
      try{r=JSON.parse(raw)}catch{setStatus('Update response could not be read.','error');return}
      if(!r.ok){setStatus(`Update failed: ${r.error||'Unknown error'}`,'error');return}
      setStatus(`Updated to ${r.version}. Reloading…`,'ok');
      setTimeout(()=>{try{native?.reloadCrowdOrbit?.()}catch{}},350);
    }
  };

  function wire(){
    const b=$('#co70-u-check');
    if(b&&!b.dataset.co72){
      b.dataset.co72='1';
      const clone=b.cloneNode(true);b.replaceWith(clone);
      clone.addEventListener('click',()=>{
        setStatus('Checking update channel…','busy');
        try{native?.checkUiUpdate?.(manifest)}catch(e){setStatus(`Update check unavailable: ${e?.message||e}`,'error')}
      });
    }
    const app=$('#co70-app');
    if(app){
      [...document.body.children].forEach(el=>{if(el!==app&&el.tagName!=='SCRIPT')el.setAttribute('aria-hidden','true')});
    }
  }

  const obs=new MutationObserver(()=>wire());
  if(document.body)obs.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(wire,120),{once:true});else setTimeout(wire,120);
})();
