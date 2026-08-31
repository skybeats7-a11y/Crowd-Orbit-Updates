'use strict';
(() => {
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const api=(u,o={})=>window.CrowdOrbitLocalAPI?.api(u,o);
  const fmt=n=>Number(n||0).toLocaleString('en-GB');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const UPDATE_URL='https://raw.githubusercontent.com/skybeats7-a11y/Crowd-Orbit-Updates/main/latest.json';
  const UI_VERSION='0.6.1';
  document.documentElement.dataset.remoteUi=UI_VERSION;

  const css=document.createElement('link');
  css.rel='stylesheet';css.href='v061.css';css.dataset.co61='1';
  if(!document.querySelector('link[data-co61]'))document.head.appendChild(css);

  function engineLabel(){
    let v='0.5.1';
    try{v=window.CrowdOrbitNative?.getShellVersion?.()||v}catch{}
    return String(v).replace(/^0\./,'');
  }
  function logo(){return '<span class="co61-logo" aria-hidden="true"><i class="co61-c">C</i><i class="co61-orbit o1"></i><i class="co61-dot d1"></i><i class="co61-dot d2"></i><i class="co61-dot d3"></i></span>'}
  function initials(p){const n=String(p?.name||p?.handle||'?').trim();return n.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase().slice(0,2)||'?'}
  function scoreClass(p){const s=Number(p?.opportunity_score??p?.network_score??0);return s>=78?'priority':s>=60?'ready':'new'}
  function openPersonFromOrbit(p){
    try{window.route?.('network')}catch{try{window.route?.('people')}catch{}}
    setTimeout(()=>{
      const q=$('#network-search');if(q){q.value=p.name||p.handle||'';q.dispatchEvent(new Event('input',{bubbles:true}))}
      try{window.loadNetwork?.()}catch{}
    },60);
  }

  function ensureOrbitSurface(){
    const home=$('#view-home')||$('#home');
    if(!home||$('#co61-intelligence'))return;
    const section=document.createElement('section');
    section.id='co61-intelligence';
    section.className='co61-intelligence';
    section.innerHTML=`
      <div class="co61-hero-head">
        <div class="co61-title-wrap">${logo()}<div><span class="eyebrow">ORBIT INTELLIGENCE</span><h1>Your network in motion.</h1><p>See who matters, how close they are and where your next useful connection sits.</p></div></div>
        <button id="co61-refresh" class="co61-icon-button" type="button" aria-label="Refresh Orbit intelligence">↻</button>
      </div>
      <div class="co61-layout">
        <article class="co61-signal glass">
          <span class="co61-kicker">SIGNAL SCORE</span>
          <div class="co61-score-line"><strong id="co61-signal-score">0</strong><small>/100</small></div>
          <div class="co61-spark"><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <b id="co61-signal-label">Build your orbit</b>
          <p id="co61-signal-copy">Collect people and Orbit IQ will rank the useful connections.</p>
        </article>
        <article class="co61-orbit-card glass">
          <div class="co61-orbit-stage" id="co61-orbit-stage">
            <div class="co61-ring r1"></div><div class="co61-ring r2"></div><div class="co61-ring r3"></div><div class="co61-ring r4"></div>
            <div class="co61-cross x1"></div><div class="co61-cross x2"></div>
            <div class="co61-centre">${logo()}<small>YOU</small></div>
            <div id="co61-nodes"></div>
          </div>
          <div class="co61-legend"><span><i class="priority"></i>Priority</span><span><i class="ready"></i>Contact ready</span><span><i class="new"></i>New / missing details</span></div>
        </article>
        <article class="co61-matches glass">
          <div class="co61-card-head"><div><span class="co61-kicker">SMART MATCHES</span><h3>Best people now</h3></div><button id="co61-open-people" type="button">View all</button></div>
          <div id="co61-match-list" class="co61-match-list"><div class="co61-empty">Collect people to start matching.</div></div>
        </article>
      </div>
      <div class="co61-metrics">
        <div class="glass"><small>PEOPLE IN ORBIT</small><strong id="co61-total">0</strong><span>Stored on this device</span></div>
        <div class="glass"><small>CONTACT READY</small><strong id="co61-ready">0</strong><span>Direct or profile route</span></div>
        <div class="glass"><small>PRIORITY</small><strong id="co61-priority">0</strong><span>Highest Orbit IQ</span></div>
        <div class="glass"><small>RELATIONSHIPS</small><strong id="co61-relationships">0</strong><span>Warm + extended orbit</span></div>
      </div>
      <article class="co61-signals glass">
        <div class="co61-card-head"><div><span class="co61-kicker">TOP SIGNALS</span><h3>What deserves attention</h3></div><button id="co61-collect" type="button">Collect people</button></div>
        <div id="co61-signals-list" class="co61-signals-list"><div class="co61-empty">Your next moves will appear here.</div></div>
      </article>`;
    const intro=home.querySelector('.page-intro,.hero,.section-head');
    if(intro&&intro.parentNode===home)intro.after(section);else home.prepend(section);
    $('#co61-refresh')?.addEventListener('click',loadOrbit);
    $('#co61-open-people')?.addEventListener('click',()=>{try{window.route?.('network')}catch{}});
    $('#co61-collect')?.addEventListener('click',()=>{try{window.route?.('capture')}catch{}});
  }

  async function loadOrbit(){
    if(!api)return;
    try{
      const [d,pout]=await Promise.all([api('/api/dashboard'),api('/api/people')]);
      const intel=d.intelligence||{},people=(pout?.people||[]).slice().sort((a,b)=>Number(b.opportunity_score||0)-Number(a.opportunity_score||0));
      const total=Number(intel.total||people.length||0),ready=Number(intel.contactReady||0),priority=Array.isArray(intel.priority)?intel.priority.length:0,relationships=Number(d.warm||0)+Number(d.second||0);
      const signal=total?Math.round(Math.min(100,28+(ready/total)*32+(priority/total)*24+(relationships/total)*16)):0;
      const set=(id,val)=>{const e=$(id);if(e)e.textContent=val};
      set('#co61-signal-score',signal);set('#co61-total',fmt(total));set('#co61-ready',fmt(ready));set('#co61-priority',fmt(priority));set('#co61-relationships',fmt(relationships));
      set('#co61-signal-label',signal>=80?'Strong orbit':signal>=60?'Growing signal':signal>=35?'Orbit forming':'Build your orbit');
      set('#co61-signal-copy',total?`${ready} contact-ready · ${priority} priority · ${relationships} relationship connections.`:'Collect or share people into Crowd Orbit to start building intelligence.');

      const nodes=$('#co61-nodes');if(nodes){nodes.innerHTML='';people.slice(0,18).forEach((p,i)=>{
        const score=Number(p.opportunity_score??p.network_score??0),radius=score>=78?31:score>=60?40:47,angle=((Number(p.id||i+1)*137.508)+(i*17))*(Math.PI/180),x=50+Math.cos(angle)*radius,y=50+Math.sin(angle)*radius;
        const b=document.createElement('button');b.type='button';b.className=`co61-node ${scoreClass(p)}`;b.style.left=`${x}%`;b.style.top=`${y}%`;b.title=`${p.name||p.handle||'Person'} · Orbit IQ ${score}`;b.innerHTML=`<span>${esc(initials(p))}</span><em>${score}</em>`;b.addEventListener('click',()=>openPersonFromOrbit(p));nodes.appendChild(b);
      })}

      const matches=$('#co61-match-list');if(matches)matches.innerHTML=people.length?people.slice(0,4).map(p=>`<button type="button" class="co61-match" data-co61-person="${Number(p.id)}"><span class="co61-avatar ${scoreClass(p)}">${esc(initials(p))}</span><span class="co61-match-copy"><strong>${esc(p.name||p.handle||'Person')}</strong><small>${esc([p.role&&p.role!=='Unknown'?p.role:'Unclassified',p.location].filter(Boolean).join(' · '))}</small></span><b>${Number(p.opportunity_score??p.network_score??0)}</b></button>`).join(''):'<div class="co61-empty">Collect people to start matching.</div>';
      $$('[data-co61-person]').forEach(b=>b.addEventListener('click',()=>{const p=people.find(x=>Number(x.id)===Number(b.dataset.co61Person));if(p)openPersonFromOrbit(p)}));

      const signals=$('#co61-signals-list'),moves=d.next_moves||[];
      if(signals)signals.innerHTML=moves.length?moves.slice(0,5).map((m,i)=>`<button type="button" class="co61-signal-row" data-co61-move="${Number(m.person_id||0)}"><span>${String(i+1).padStart(2,'0')}</span><span><strong>${esc(m.name||m.type||'Opportunity')}</strong><small>${esc(m.type||'Next move')} · ${esc(m.detail||'')}</small></span><b>${Number(m.priority||0)}</b></button>`).join(''):'<div class="co61-empty">No urgent moves yet. Keep collecting and analysing people.</div>';
      $$('[data-co61-move]').forEach(b=>b.addEventListener('click',()=>{const p=people.find(x=>Number(x.id)===Number(b.dataset.co61Move));if(p)openPersonFromOrbit(p)}));
    }catch(e){const c=$('#co61-signal-copy');if(c)c.textContent='Orbit intelligence could not refresh: '+String(e?.message||e)}
  }

  function readBackupMeta(){try{return JSON.parse(localStorage.getItem('crowd_orbit_backup_meta_v1')||'{}')}catch{return {}}}
  function saveBackupMeta(meta){try{localStorage.setItem('crowd_orbit_backup_meta_v1',JSON.stringify(meta))}catch{}}
  function bytesText(n){n=Number(n||0);if(n<1024)return `${n} B`;if(n<1048576)return `${(n/1024).toFixed(1)} KB`;return `${(n/1048576).toFixed(1)} MB`}
  function updateBackupStatus(){
    const m=readBackupMeta(),line=$('#co61-backup-last');if(!line)return;
    if(!m.at){line.innerHTML='<strong>No backup created yet</strong><small>Create one and save it to Drive or another location through Android.</small>';return}
    const when=new Date(m.at);line.innerHTML=`<strong>${esc(when.toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}))}</strong><small>${fmt(m.people)} people · ${esc(bytesText(m.bytes))} · last verified backup</small>`;
  }
  function setSystemStatus(text,state=''){const e=$('#co61-update-status');if(e){e.textContent=text;e.dataset.state=state}}

  function ensureSystemCentre(){
    const settings=$('#view-settings')||$('#settings');if(!settings||$('#co61-system-centre'))return;
    const block=document.createElement('section');block.id='co61-system-centre';block.className='co61-system-centre';block.innerHTML=`
      <div class="co61-system-head">${logo()}<div><span class="eyebrow">SYSTEM CONTROL</span><h2>Crowd Orbit on this device</h2><p>Fast interface updates, local data and recovery in one place.</p></div></div>
      <div class="co61-system-grid">
        <article class="co61-update glass">
          <div class="co61-card-head"><div><span class="co61-kicker">UPDATE CENTRE</span><h3>Interface ${UI_VERSION}</h3></div><span class="co61-live">REMOTE</span></div>
          <div class="co61-version-row"><span><small>ENGINE</small><strong>${esc(engineLabel())}</strong></span><i></i><span><small>INTERFACE</small><strong>${UI_VERSION}</strong></span></div>
          <div class="co61-update-track"><i></i></div>
          <p id="co61-update-status" class="co61-status" data-state="ok">Interface ${UI_VERSION} active. Automatic remote updates remain available.</p>
          <div class="co61-actions"><button id="co61-check-update" class="co61-primary" type="button">Check now</button><button id="co61-rollback" type="button">Roll back interface</button></div>
        </article>
        <article class="co61-backup glass">
          <div class="co61-card-head"><div><span class="co61-kicker">BACKUP VAULT</span><h3>Your Crowd Orbit data</h3></div><span class="co61-local">LOCAL</span></div>
          <div id="co61-backup-last" class="co61-backup-last"></div>
          <div class="co61-actions"><button id="co61-create-backup" class="co61-gold" type="button">Create backup</button><button id="co61-restore-backup" type="button">Restore backup</button></div>
          <input id="co61-backup-file" type="file" accept="application/json,.json" hidden>
          <p id="co61-backup-status" class="co61-status">Backups contain People, campaigns, interactions and Orbit IQ data stored by Crowd Orbit.</p>
        </article>
      </div>`;
    const intro=settings.querySelector('.page-intro,.section-head');if(intro&&intro.parentNode===settings)intro.after(block);else settings.prepend(block);
    updateBackupStatus();

    $('#co61-check-update')?.addEventListener('click',()=>{
      setSystemStatus('Checking the Crowd Orbit update channel…','busy');
      try{window.CrowdOrbitNative?.checkUiUpdate?.(UPDATE_URL)}catch(e){setSystemStatus('Could not start update check: '+String(e?.message||e),'error')}
    });
    $('#co61-rollback')?.addEventListener('click',()=>{setSystemStatus('Opening previous verified interface…','busy');try{window.CrowdOrbitNative?.rollbackUi?.()}catch(e){setSystemStatus('Rollback is not available on this engine.','error')}});
    $('#co61-create-backup')?.addEventListener('click',()=>{
      const st=$('#co61-backup-status');
      try{
        const payload=window.CrowdOrbitLocalAPI?.exportBackup?.();if(!payload)throw new Error('Backup data is unavailable');
        const counts=window.CrowdOrbitLocalAPI?.counts?.()||{},at=new Date().toISOString(),filename=`crowd-orbit-backup-${at.slice(0,10)}.json`;
        if(window.CrowdOrbitNative?.exportText)window.CrowdOrbitNative.exportText(filename,'application/json',payload);else{
          const blob=new Blob([payload],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
        }
        saveBackupMeta({at,people:Number(counts.people||0),bytes:new Blob([payload]).size});updateBackupStatus();if(st)st.textContent='Backup prepared and handed to Android. Choose where you want to save it.';
      }catch(e){if(st)st.textContent='Backup failed: '+String(e?.message||e)}
    });
    $('#co61-restore-backup')?.addEventListener('click',()=>$('#co61-backup-file')?.click());
    $('#co61-backup-file')?.addEventListener('change',async e=>{
      const file=e.target.files?.[0],st=$('#co61-backup-status');if(!file)return;
      try{
        const payload=await file.text();const preview=JSON.parse(payload);const n=Array.isArray(preview.people)?preview.people.length:0;
        if(!confirm(`Restore this Crowd Orbit backup with ${n} people? Current local Crowd Orbit data will be replaced.`)){e.target.value='';return}
        const r=window.CrowdOrbitLocalAPI?.importBackup?.(payload);if(!r)throw new Error('Restore service is unavailable');
        if(st)st.textContent=`Restored ${r.people} people and ${r.campaigns} campaigns. Orbit IQ is refreshing.`;
        saveBackupMeta({at:new Date().toISOString(),people:Number(r.people||0),bytes:file.size,restored:true});updateBackupStatus();
        try{await api('/api/analyse',{method:'POST',body:'{}'})}catch{};
        try{window.loadDashboard?.();window.loadNetwork?.()}catch{};loadOrbit();
      }catch(err){if(st)st.textContent='Restore failed: '+String(err?.message||err)}finally{e.target.value=''}
    });

    const existing=$('#update-status');if(existing){
      const sync=()=>{const t=existing.textContent?.trim();if(t)setSystemStatus(t,/fail|error|could not/i.test(t)?'error':/check|download|install/i.test(t)?'busy':'ok')};
      sync();new MutationObserver(sync).observe(existing,{subtree:true,childList:true,characterData:true});
    }
  }

  function tuneExistingInterface(){
    const ui=$('#ui-version');if(ui)ui.textContent=UI_VERSION;
    $$('.v060-release').forEach(e=>e.textContent=`REMOTE UPDATE ACTIVE · INTERFACE v${UI_VERSION}`);
    const old=$('#update-status');if(old&&!/0\.6\.1/.test(old.textContent||''))old.textContent=`Interface v${UI_VERSION} active. Update status will remain visible here.`;
    const brand=$('#view-settings .brand-card .fineprint');if(brand)brand.textContent=`Engine ${engineLabel()} · Remote Interface ${UI_VERSION} · Powered by Orbit IQ · Delivered by SBM`;
    const flow=$('.v060-flow');if(flow)flow.classList.add('co61-pipeline');
  }

  function boot(){
    ensureOrbitSurface();ensureSystemCentre();tuneExistingInterface();loadOrbit();
    let tries=0;const timer=setInterval(()=>{ensureOrbitSurface();ensureSystemCentre();tuneExistingInterface();if(++tries>12)clearInterval(timer)},300);
    window.addEventListener('focus',()=>{loadOrbit();updateBackupStatus()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,40),{once:true});else setTimeout(boot,40);
})();
