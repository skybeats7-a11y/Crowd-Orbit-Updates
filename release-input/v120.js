'use strict';
(() => {
  const PENDING_KEY='crowd_orbit_auto_scan_pending_v1';
  const supported=/^https:\/\/(?:[^/]+\.)?(?:instagram\.com|tiktok\.com|x\.com|twitter\.com|youtube\.com|youtu\.be|soundcloud\.com|linkedin\.com|spotify\.com)(?:\/|$)/i;
  const pending=new Map();
  let installed=false;

  const text=v=>String(v??'').trim();
  function normalise(raw){
    let value=raw;
    if(typeof value==='string'){
      try{const parsed=JSON.parse(value);value=parsed&&typeof parsed==='object'?parsed:{text:value}}catch{value={text:value}}
    }
    value=value&&typeof value==='object'?value:{};
    return {text:text(value.text||value.share||value.share_url||value.url),title:text(value.title||value.subject)};
  }
  function profileUrl(payload){
    const all=[payload.text,payload.title].filter(Boolean).join('\n');
    for(const match of all.match(/https:\/\/[^\s<>"']+/ig)||[]){
      const clean=match.replace(/[),.;!?\]}]+$/,'');
      if(supported.test(clean))return clean;
    }
    return '';
  }
  function cleanShareText(payload){
    const lines=[payload.title,payload.text].filter(Boolean).join('\n').split(/\r?\n/).map(text).filter(Boolean);
    return lines.filter(line=>{
      if(/^(?:instagram|tiktok|twitter|x|youtube|linkedin|soundcloud|spotify)\s+share$/i.test(line))return false;
      if(/^share(?:d)?\s+(?:a\s+)?profile$/i.test(line))return false;
      return true;
    }).join('\n');
  }
  function goCollect(message){
    const nav=document.querySelector('#co70-app .co70-nav [data-nav="collect"]');
    if(nav&&!nav.classList.contains('active'))nav.click();
    setTimeout(()=>{
      const status=document.querySelector('#co70-collect-result');
      if(status){status.className='co70-status';status.textContent=message}
      const preview=document.querySelector('#co110-preview');
      if(preview&&!preview.children.length)preview.innerHTML='<div class="co110-empty"><strong>Scanning public profile…</strong><p>Crowd Orbit is checking visible profile text, public metadata, audience and other evidence before analysis.</p></div>';
    },120);
  }
  function savePending(item){try{localStorage.setItem(PENDING_KEY,JSON.stringify(item))}catch{}}
  function clearPending(){try{localStorage.removeItem(PENDING_KEY)}catch{}}
  function startScan(payload,original){
    const url=profileUrl(payload);
    if(!url||!window.CrowdOrbitNative?.scanPublicProfile)return original.receive(payload);
    const id='scan-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
    const item={id,url,payload,at:Date.now()};pending.set(id,{...item,original});savePending(item);
    goCollect('Scanning the shared public profile automatically…');
    try{window.CrowdOrbitNative.scanPublicProfile(url,id);return true}catch(e){pending.delete(id);clearPending();return original.receive(payload)}
  }
  function receiveScan(id,raw){
    let result={};try{result=typeof raw==='string'?JSON.parse(raw):raw||{}}catch{}
    let job=pending.get(id);
    if(!job){
      try{const saved=JSON.parse(localStorage.getItem(PENDING_KEY)||'null');if(saved&&saved.id===id)job={...saved,original:window.__CrowdOrbitShareOriginal}}catch{}
    }
    if(!job||!job.original)return false;
    pending.delete(id);clearPending();
    const base=cleanShareText(job.payload);
    if(result.ok&&text(result.scanText)){
      const enriched=['VISIBLE / PUBLIC PROFILE EVIDENCE',text(result.scanText),base,'SOURCE SHARE ROUTE',job.url].filter(Boolean).join('\n');
      goCollect(`Public ${text(result.platform)||'profile'} scan complete. Analysing the evidence…`);
      return job.original.receive({text:enriched,title:''});
    }
    const fallback={text:[base,job.url].filter(Boolean).join('\n'),title:''};
    const ok=job.original.receive(fallback);
    setTimeout(()=>{
      const status=document.querySelector('#co70-collect-result');
      if(status){status.className='co70-status error';status.textContent='The profile was shared successfully, but Crowd Orbit could not read enough visible or public profile evidence. The profile route has been kept for review.'}
    },250);
    return ok;
  }
  function install(){
    if(installed)return;
    const original=window.CrowdOrbitShare;
    if(!original||typeof original.receive!=='function'){setTimeout(install,80);return}
    installed=true;window.__CrowdOrbitShareOriginal=original;
    window.CrowdOrbitShare={...original,receive(raw){return startScan(normalise(raw),original)}};
    try{
      const saved=JSON.parse(localStorage.getItem(PENDING_KEY)||'null');
      if(saved&&saved.url&&Date.now()-Number(saved.at||0)<120000&&window.CrowdOrbitNative?.scanPublicProfile){
        pending.set(saved.id,{...saved,original});goCollect('Resuming automatic public profile scan…');window.CrowdOrbitNative.scanPublicProfile(saved.url,saved.id);
      }else if(saved)clearPending();
    }catch{clearPending()}
  }
  window.CrowdOrbitProfileScan={receive:receiveScan};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
