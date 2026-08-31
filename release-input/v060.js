'use strict';
(() => {
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const api=(u,o={})=>window.CrowdOrbitLocalAPI.api(u,o);const fmt=n=>Number(n||0).toLocaleString('en-GB');
  document.documentElement.dataset.remoteUi='0.6.0';
  const css=document.createElement('link');css.rel='stylesheet';css.href='v060.css';document.head.appendChild(css);

  // Product language: make the workflow obvious.
  const capNav=$('[data-route="capture"] em');if(capNav)capNav.textContent='Collect';
  $$('.bottom-nav [data-route="capture"] small').forEach(x=>x.textContent='Collect');
  const capH=$('#view-capture .page-intro h1');if(capH)capH.textContent='Collect a crowd. Sort it in seconds.';
  const capP=$('#view-capture .page-intro p');if(capP)capP.textContent='Paste or share what you already have. Crowd Orbit merges duplicates, extracts visible contact data, detects likely roles and ranks the useful people.';

  // Main pipeline: this is now the core mental model of the app.
  const home=$('#view-home');
  const flow=document.createElement('section');flow.className='v060-flow';flow.innerHTML=`
    <div class="v060-flow-head"><div><span class="eyebrow">YOUR ORBIT PIPELINE</span><h2>From list to useful contact.</h2><p>One simple flow instead of dozens of disconnected tools.</p></div><div class="v060-flow-actions"><button class="button primary compact" type="button" data-v060-route="capture">＋ Collect people</button><button class="button ghost compact" id="v060-run-all" type="button">Analyse saved people</button></div></div>
    <div class="v060-flow-grid">
      <div class="v060-step" style="--step:#6f45f5"><small>01 · Import</small><strong id="v060-total">0</strong><b>People collected</b><em>Share or paste lists.</em></div>
      <div class="v060-step" style="--step:#2d6fde"><small>02 · Analyse</small><strong id="v060-analysed">0</strong><b>Profiles analysed</b><em>Roles and useful clues.</em></div>
      <div class="v060-step" style="--step:#23855d"><small>03 · Contact ready</small><strong id="v060-ready">0</strong><b>Reachable people</b><em>Email, phone or profile route.</em></div>
      <div class="v060-step" style="--step:#b98a2f"><small>04 · Priority</small><strong id="v060-priority">0</strong><b>Best opportunities</b><em>Ranked by Orbit IQ.</em></div>
      <div class="v060-step" style="--step:#d38328"><small>05 · Move</small><strong id="v060-moves">0</strong><b>Next actions</b><em>Contact, reconnect, follow up.</em></div>
    </div>`;
  if(home){const anchor=home.querySelector('.metrics-row');anchor?.before(flow)}
  flow.querySelector('[data-v060-route]')?.addEventListener('click',()=>window.route?.('capture'));

  async function refreshFlow(){
    try{const d=await api('/api/dashboard'),i=d.intelligence||{};$('#v060-total')&&( $('#v060-total').textContent=fmt(i.total) );$('#v060-analysed')&&( $('#v060-analysed').textContent=fmt(i.analysed) );$('#v060-ready')&&( $('#v060-ready').textContent=fmt(i.contactReady) );$('#v060-priority')&&( $('#v060-priority').textContent=fmt(i.priority?.length||0) );$('#v060-moves')&&( $('#v060-moves').textContent=fmt(d.next_moves?.length||0) );return i}catch{return null}
  }
  $('#v060-run-all')?.addEventListener('click',async e=>{const b=e.currentTarget,before=b.textContent;b.disabled=true;b.textContent='Analysing…';try{const r=await api('/api/analyse',{method:'POST',body:'{}'});window.toast?.(`${r.total} people analysed`);await refreshFlow();window.loadDashboard?.();window.loadNetwork?.()}catch(err){window.toast?.(err.message)}finally{b.disabled=false;b.textContent=before}});

  // Batch capture: replace old one-record-per-line importer with real on-device analysis.
  const ingest=$('#view-capture .quick-ingest');
  if(ingest){ingest.classList.add('v060-batch');ingest.innerHTML=`
    <div class="section-heading"><div><span class="eyebrow">BATCH COLLECT</span><h2>Paste whatever you have.</h2></div></div>
    <p class="muted">One profile per line works best. Links, handles, names, bios, emails and phone numbers can all be mixed together.</p>
    <div class="v060-capture-intro"><span><i>1</i>Paste / share</span><span><i>2</i>Analyse</span><span><i>3</i>Review</span><span><i>4</i>Sort & act</span></div>
    <textarea id="bulk-paste" rows="8" placeholder="Jade Stone, @jadestone, Artist, London, jade@example.com, +44 7700 900123\nhttps://instagram.com/exampleartist\nProducer / engineer @beatmaker — Manchester — producer@example.com"></textarea>
    <div class="v060-hint"><span>DE-DUPLICATES</span><span>EMAILS</span><span>PHONE NUMBERS</span><span>ROLE DETECTION</span><span>OPPORTUNITY SCORE</span></div>
    <div class="capture-actions"><button id="bulk-import" class="button primary" type="button">Analyse & add crowd</button><button id="v060-analyse-existing" class="button ghost" type="button">Analyse people already saved</button><span id="bulk-status" class="fineprint"></span></div>
    <div id="v060-result" class="v060-result"><strong id="v060-result-title">Analysis complete</strong><div class="v060-result-grid"><div><b id="v060-r-people">0</b><small>people</small></div><div><b id="v060-r-email">0</b><small>emails</small></div><div><b id="v060-r-phone">0</b><small>phones</small></div><div><b id="v060-r-role">0</b><small>roles found</small></div><div><b id="v060-r-priority">0</b><small>priority</small></div></div></div>`;
    const showResult=r=>{const box=$('#v060-result');box?.classList.add('show');$('#v060-r-people').textContent=fmt(r.total);$('#v060-r-email').textContent=fmt(r.emails);$('#v060-r-phone').textContent=fmt(r.phones);$('#v060-r-role').textContent=fmt(r.roles);$('#v060-r-priority').textContent=fmt(r.priority||0)};
    $('#bulk-import')?.addEventListener('click',async()=>{const area=$('#bulk-paste'),st=$('#bulk-status'),btn=$('#bulk-import');if(!area.value.trim()){st.textContent='Paste at least one person, profile link or contact line.';return}btn.disabled=true;btn.textContent='Analysing…';st.textContent='';try{const r=await api('/api/analyse',{method:'POST',body:JSON.stringify({text:area.value})});showResult(r);st.textContent=`${r.created} new · ${r.updated} merged${r.skipped?` · ${r.skipped} skipped`:''}`;area.value='';window.toast?.(`${r.total} people processed`);window.refreshLocalCount?.();await refreshFlow();window.loadDashboard?.()}catch(e){st.textContent=e.message}finally{btn.disabled=false;btn.textContent='Analyse & add crowd'}});
    $('#v060-analyse-existing')?.addEventListener('click',async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Analysing…';try{const r=await api('/api/analyse',{method:'POST',body:'{}'});showResult(r);$('#bulk-status').textContent=`${r.total} saved people refreshed.`;await refreshFlow();window.loadNetwork?.();window.loadDashboard?.()}catch(err){$('#bulk-status').textContent=err.message}finally{b.disabled=false;b.textContent='Analyse people already saved'}});
  }

  // Add phone to manual capture without making the form feel heavier.
  const emailField=$('#person-email')?.closest('label');if(emailField&&!$('#person-phone')){const lab=document.createElement('label');lab.className='field v060-phone-field';lab.innerHTML='<span>Public / professional phone</span><input id="person-phone" type="tel" placeholder="+44 …">';emailField.after(lab)}

  // Better People sorting/status tabs.
  const toolbar=$('#view-network .network-toolbar');let statusFilter='';
  const tabs=document.createElement('div');tabs.className='v060-status-tabs';tabs.innerHTML='<button class="active" data-v060-status="">All <span id="v060-count-all">0</span></button><button data-v060-status="Priority">Priority <span id="v060-count-priority">0</span></button><button data-v060-status="Contact Ready">Contact Ready <span id="v060-count-ready">0</span></button><button data-v060-status="Missing Details">Missing Details <span id="v060-count-missing">0</span></button>';
  toolbar?.after(tabs);
  const oldNetwork=window.loadNetwork;
  window.loadNetwork=async function(){
    const params=new URLSearchParams(),q=$('#network-search')?.value.trim()||'',role=$('#network-role')?.value||'All roles',rel=$('#network-relation')?.value||'Any relationship',orb=$('[data-network-orbit].active')?.dataset.networkOrbit||'all';if(q)params.set('search',q);if(role!=='All roles')params.set('role',role);if(rel!=='Any relationship')params.set('relationship',rel);if(orb!=='all')params.set('relationship',orb);if(statusFilter)params.set('analysisStatus',statusFilter);
    try{const out=await api('/api/people?'+params);$('#network-results').innerHTML=out.people.length?out.people.map(p=>window.personCard(p)).join(''):'<div class="surface" style="padding:22px"><strong>No matching people.</strong><p class="fineprint">Try another filter or collect more profiles.</p></div>';await refreshPeopleCounts()}catch(e){window.toast?.(e.message)}
  };
  async function refreshPeopleCounts(){try{const i=await api('/api/intelligence');$('#v060-count-all').textContent=fmt(i.total);$('#v060-count-priority').textContent=fmt(i.priority.length);$('#v060-count-ready').textContent=fmt(i.contactReady);$('#v060-count-missing').textContent=fmt(i.missing)}catch{}}
  tabs.addEventListener('click',e=>{const b=e.target.closest('[data-v060-status]');if(!b)return;$$('[data-v060-status]',tabs).forEach(x=>x.classList.toggle('active',x===b));statusFilter=b.dataset.v060Status||'';window.loadNetwork()});
  ['#network-search','#network-role','#network-relation'].forEach(s=>$(s)?.addEventListener(s.includes('search')?'input':'change',()=>window.loadNetwork()));
  $$('[data-network-orbit]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>window.loadNetwork(),0)));

  // Decorate cards with actionable contact/status intelligence.
  const baseCard=window.personCard;
  if(typeof baseCard==='function')window.personCard=function(p,opts={}){let h=baseCard(p,opts);const status=p.analysis_status||'Imported',klass=status==='Priority'?'priority':status==='Missing Details'?'missing':'ready';const strip=`<div class="v060-contact-strip"><span class="${klass}">${status}</span>${p.contact_email?'<span class="email">✉ Email</span>':''}${p.phone_number?'<span class="phone">☎ Phone</span>':''}</div>`;h=h.replace('</div><div class="score-badge">',strip+'</div><div class="score-badge">');h=h.replace(/<div class="score-badge">[^<]*<\/div>/,`<div class="score-badge">${Number(p.opportunity_score??p.match_score??p.network_score??0)}</div>`);return h};

  // Show current analysis state above People.
  const analysisCard=document.createElement('div');analysisCard.className='v060-analysis-card';analysisCard.innerHTML='<span><strong>Orbit IQ analysis</strong><small id="v060-analysis-line">Your saved people can be rescored at any time without uploading them anywhere.</small></span><button id="v060-people-analyse" class="button primary compact" type="button">Analyse all</button>';
  tabs.after(analysisCard);$('#v060-people-analyse')?.addEventListener('click',async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Analysing…';try{const r=await api('/api/analyse',{method:'POST',body:'{}'});$('#v060-analysis-line').textContent=`${r.total} analysed · ${r.emails} emails · ${r.phones} phones · ${r.priority} priority.`;await window.loadNetwork();await refreshFlow()}catch(err){window.toast?.(err.message)}finally{b.disabled=false;b.textContent='Analyse all'}});

  // Release/update messaging.
  const updateCard=$('#view-settings .update-card');if(updateCard){updateCard.querySelector('.v051-remote-badge')?.remove();const badge=document.createElement('div');badge.className='v060-release';badge.textContent='REMOTE UPDATE ACTIVE · INTERFACE v0.6.0';updateCard.querySelector('.version-line')?.after(badge);const ui=$('#ui-version');if(ui)ui.textContent='0.6.0';const st=$('#update-status');if(st)st.textContent='v0.6.0 adds batch analysis, contact extraction, smart deduplication and opportunity sorting.'}
  const brand=$('#view-settings .brand-card .fineprint');if(brand)brand.textContent='Android Engine v0.5 · Remote Interface v0.6.0';

  // Old saved data gets upgraded in-place on first v0.6 load.
  setTimeout(async()=>{try{await api('/api/analyse',{method:'POST',body:'{}'});await refreshFlow();await refreshPeopleCounts();window.loadDashboard?.()}catch{}},120);
})();
