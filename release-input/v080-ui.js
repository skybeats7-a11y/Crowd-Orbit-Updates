'use strict';
(() => {
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const api=(u,o={})=>window.CrowdOrbitLocalAPI.api(u,o);
  let openId=0;

  function scoreText(p){return p?.opportunity_score==null?'—':String(p.opportunity_score)}
  function scoreState(p){return p?.opportunity_score==null?'NEEDS EVIDENCE':`${p.score_confidence||0}% EVIDENCE CONFIDENCE`}

  function ensureDrawer(){
    if($('#co80-person'))return;
    const d=document.createElement('aside');d.id='co80-person';d.className='co80-person';d.setAttribute('aria-hidden','true');d.innerHTML='<button class="co80-backdrop" aria-label="Close profile"></button><section class="co80-sheet"><button class="co80-close" aria-label="Close profile">×</button><div id="co80-person-body"></div></section>';
    document.body.appendChild(d);
    d.querySelectorAll('.co80-backdrop,.co80-close').forEach(b=>b.addEventListener('click',closePerson));
  }
  function closePerson(){const d=$('#co80-person');if(d){d.classList.remove('open');d.setAttribute('aria-hidden','true')}openId=0;history.replaceState({coView:document.querySelector('.co70-nav .active')?.dataset.nav||'orbit'},'')}

  async function openPerson(id){
    ensureDrawer();openId=Number(id);const d=$('#co80-person'),body=$('#co80-person-body');d.classList.add('open');d.setAttribute('aria-hidden','false');body.innerHTML='<div class="co80-loading">Loading profile intelligence…</div>';
    const out=await api('/api/people');const p=(out.people||[]).find(x=>Number(x.id)===openId);
    if(!p){body.innerHTML='<div class="co80-loading">Profile could not be found.</div>';return}
    const ints=(await api(`/api/people/${p.id}/interactions`)).interactions||[];
    const evidence=(p.score_reasons||[]);
    body.innerHTML=`
      <header class="co80-profile-head"><span class="co80-avatar">${esc(String(p.name||p.handle||'?').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase())}</span><div><span class="co80-kicker">PERSON INTELLIGENCE</span><h2>${esc(p.name||p.handle||'Person')}</h2><p>${esc([p.role&&p.role!=='Unknown'?p.role:'Role unverified',p.location].filter(Boolean).join(' · '))}</p></div></header>
      <div class="co80-scorecard ${p.opportunity_score==null?'unverified':''}"><div><small>ORBIT IQ</small><strong>${scoreText(p)}</strong><span>${scoreState(p)}</span></div><div><small>ZONE</small><b>${esc(p.orbit_zone||'Unverified')}</b><span>${p.opportunity_score==null?'Add real evidence before ranking.':'Placement is evidence-based.'}</span></div></div>
      <section class="co80-profile-section"><span class="co80-kicker">WHY THIS RESULT</span><div class="co80-evidence">${evidence.map(x=>`<span>✓ ${esc(x)}</span>`).join('')||'<span>Needs a recognised profile, handle, contact record or role.</span>'}</div></section>
      <section class="co80-profile-section"><span class="co80-kicker">KNOWN DETAILS</span><div class="co80-detail-grid">
        <label>Name<input id="co80-name" value="${esc(p.name||'')}"></label><label>Handle<input id="co80-handle" value="${esc(p.handle||'')}"></label>
        <label>Role<input id="co80-role" value="${esc(p.role==='Unknown'?'':p.role||'')}"></label><label>Secondary roles<input id="co80-secondary" value="${esc((p.secondary_roles||[]).join(', '))}"></label>
        <label>Location<input id="co80-location" value="${esc(p.location||'')}"></label><label>Followers / audience<input id="co80-followers" type="number" min="0" value="${Number(p.followers||0)}"></label>
        <label>Email<input id="co80-email" value="${esc(p.contact_email||'')}"></label><label>Phone<input id="co80-phone" value="${esc(p.phone_number||'')}"></label>
        <label class="wide">Website<input id="co80-website" value="${esc(p.website||'')}"></label>
        <label class="wide">Profile / source URL<input id="co80-source" value="${esc(p.source_url||'')}"></label>
        <label class="wide">Notes<textarea id="co80-notes">${esc(p.notes||'')}</textarea></label>
      </div><div class="co80-actions"><button id="co80-save" class="co70-btn">Save & re-analyse</button>${p.source_url?'<button id="co80-open-source" class="co70-btn ghost">Open source profile</button>':''}<button id="co80-delete" data-delete-id="${Number(p.id)}" class="co80-danger">Delete</button></div><div id="co80-person-status" class="co70-status"></div></section>
      <section class="co80-profile-section"><span class="co80-kicker">RELATIONSHIP HISTORY</span><div class="co80-history">${ints.length?ints.map(i=>`<div><strong>${esc(i.type||'Interaction')}</strong><span>${esc(i.note||'')}</span><small>${esc(String(i.at||'').slice(0,16).replace('T',' '))}</small></div>`).join(''):'<div class="co80-empty">No interactions logged yet.</div>'}</div><div class="co80-add-interaction"><input id="co80-interaction-note" placeholder="Add a note about a call, DM, meeting…"><button id="co80-interaction" class="co70-btn ghost">Log interaction</button></div></section>`;
    $('#co80-save').onclick=async()=>{const st=$('#co80-person-status');try{const r=await api(`/api/people/${p.id}`,{method:'PATCH',body:JSON.stringify({name:$('#co80-name').value,handle:$('#co80-handle').value,role:$('#co80-role').value||'Unknown',secondary_roles:$('#co80-secondary').value.split(',').map(x=>x.trim()).filter(Boolean),location:$('#co80-location').value,followers:Number($('#co80-followers').value||0),contact_email:$('#co80-email').value,phone_number:$('#co80-phone').value,website:$('#co80-website').value,source_url:$('#co80-source').value,notes:$('#co80-notes').value})});st.textContent=r.person.opportunity_score==null?'Saved. Still needs more evidence before Orbit IQ will score it.':`Saved. Orbit IQ ${r.person.opportunity_score} from ${r.person.score_confidence}% evidence confidence.`;st.className='co70-status ok';setTimeout(()=>openPerson(p.id),400)}catch(e){st.textContent=String(e.message||e);st.className='co70-status error'}};
    $('#co80-open-source')?.addEventListener('click',()=>{try{location.href=p.source_url}catch{}});
    $('#co80-delete').onclick=()=>{if(confirm(`Delete ${p.name||p.handle||'this person'} from Crowd Orbit?`)){window.CrowdOrbitLocalAPI.removePerson(p.id);closePerson();document.querySelector('#co70-refresh')?.click()}};
    $('#co80-interaction').onclick=async()=>{const note=$('#co80-interaction-note').value.trim();if(!note)return;await api(`/api/people/${p.id}/interactions`,{method:'POST',body:JSON.stringify({type:'Interaction',note})});openPerson(p.id)};
    history.pushState({coPerson:p.id},'');
  }

  function interceptPeople(){document.addEventListener('click',e=>{const el=e.target.closest?.('[data-person]');if(!el||!$('#co70-app')?.contains(el))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openPerson(el.dataset.person)},true)}

  function improveCollect(){
    if(String(document.documentElement.dataset.releaseUi||'').startsWith('0.11.'))return;
    const root=$('#co70-collect');if(!root)return;
    const intro=root.querySelector('.co70-headline p');if(intro)intro.textContent='Paste recognised social profile links, @handles, or structured contact records. Crowd Orbit validates the input first and only scores people when there is enough evidence.';
    const ta=$('#co70-paste');if(ta)ta.placeholder='Examples:\nhttps://instagram.com/exampleartist\n@beatmaker\nJade Stone, Artist, London, jade@example.com\n\nRandom text will be rejected.';
  }

  function rebuildZones(){
    const s=$('#co70-app .co70-orbit-stage');if(!s)return;
    s.querySelectorAll('.co73-zone-labels,.co74-zones').forEach(x=>x.remove());
    if(s.querySelector('.co80-zones'))return;
    const z=document.createElement('div');z.className='co80-zones';z.innerHTML=`<div class="co80-zone outer"><span><b>DISCOVERY</b><small>new / unproven</small></span></div><div class="co80-zone active"><span><b>ACTIVE SIGNAL</b><small>useful opportunity</small></span></div><div class="co80-zone inner"><span><b>INNER ORBIT</b><small>strong relationship</small></span></div>`;s.prepend(z);
  }

  function refreshScoreLabels(){
    $$('#co70-app .co70-score').forEach(el=>{if(el.textContent.trim()==='0'&&el.closest('[data-person]')){const id=el.closest('[data-person]').dataset.person;api('/api/people').then(r=>{const p=(r.people||[]).find(x=>Number(x.id)===Number(id));if(p&&p.opportunity_score==null){el.textContent='—';el.title='Needs evidence'}})}});
  }

  function enhance(){ensureDrawer();improveCollect();rebuildZones();refreshScoreLabels();const a=$('#co70-app');if(a)a.classList.add('co80-active')}
  interceptPeople();
  let raf=0;new MutationObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(enhance)}).observe(document.documentElement,{subtree:true,childList:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(enhance,180),{once:true});else setTimeout(enhance,180);
  window.addEventListener('popstate',()=>{if(openId)closePerson()});
  window.CrowdOrbit080={openPerson,closePerson};
})();
