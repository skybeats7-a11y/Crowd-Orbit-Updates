'use strict';
(() => {
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const api=(u,o={})=>window.CrowdOrbitLocalAPI.api(u,o);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const score=p=>p?.opportunity_score==null?'—':String(p.opportunity_score);
  let busy=false;

  async function fixSemantics(){
    const root=$('#co70-orbit');if(!root)return;
    const d=await api('/api/dashboard'),i=d.intelligence||{},total=Number(i.total||0),analysed=Number(i.analysed||0),required=Math.max(3,Math.ceil(total*.4));
    const stat=[...root.querySelectorAll('.co70-stat')].find(x=>x.querySelector('small')?.textContent.includes('SIGNAL SCORE'));
    if(stat&&!(total>=5&&analysed>=required)){stat.querySelector('strong').textContent='—';stat.querySelector('span').textContent=`Building · ${analysed}/${required} evidence-ready`}
    root.querySelector('.co70-card-head .co70-eyebrow')?.replaceChildren(document.createTextNode('ACTION CENTRE'));
    $$('.co70-score,.co70-node em',root).forEach(el=>{if(el.textContent.trim()==='0')el.textContent='—'});
  }

  async function enhanceRadar(){
    const bar=$('#co70-radar .co70-toolbar');if(!bar||bar.dataset.v100)return;bar.dataset.v100='1';
    bar.insertAdjacentHTML('beforeend','<select id="co100-contact" class="co70-select"><option value="">Any contact status</option><option value="1">Contact route available</option></select><select id="co100-evidence" class="co70-select"><option value="">Any evidence level</option><option value="Scored">Evidence scored</option><option value="Needs evidence">Needs evidence</option></select><input id="co100-location" class="co70-input" placeholder="Location"><input id="co100-followers" class="co70-input" type="number" min="0" placeholder="Min. audience">');
    const old=$('#co70-r-run');old.onclick=async()=>{const out=await api('/api/discover',{method:'POST',body:JSON.stringify({role:$('#co70-r-role').value||undefined,relationship:$('#co70-r-rel').value||undefined,hasContact:$('#co100-contact').value==='1',location:$('#co100-location').value||undefined,minFollowers:Number($('#co100-followers').value||0),analysisStatus:$('#co100-evidence').value||undefined})});let rows=out.people||[];if($('#co100-evidence').value==='Needs evidence')rows=rows.filter(p=>p.opportunity_score==null);const box=$('#co70-r-results');box.innerHTML=rows.length?rows.slice(0,30).map(p=>`<article class="co70-campaign-card" data-person="${p.id}"><div class="co70-card-head"><span class="co70-avatar">${esc((p.name||'?').slice(0,2).toUpperCase())}</span><span class="co70-score">${score(p)}</span></div><h3>${esc(p.name||p.handle)}</h3><small>${esc([p.role,p.location].filter(Boolean).join(' · '))}</small><p class="co70-sub">${p.has_contact?'Contact route available':'Needs contact evidence'}</p><button class="co70-btn ghost" data-person="${p.id}">Open person</button></article>`).join(''):'<div class="co70-empty">No people match all of those filters.</div>'};
  }

  function enhanceCollect(){
    const root=$('#co70-collect');if(!root||$('#co100-import'))return;
    const actions=root.querySelector('.co70-actions');actions?.insertAdjacentHTML('beforeend','<button id="co100-import" class="co70-btn ghost">Import CSV / TXT / JSON</button><input id="co100-file" type="file" accept=".csv,.txt,.json,text/csv,text/plain,application/json" hidden>');
    $('#co100-import').onclick=()=>$('#co100-file').click();
    $('#co100-file').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;const st=$('#co70-collect-result');try{let text=await f.text();if(f.name.toLowerCase().endsWith('.json')){const j=JSON.parse(text);const rows=Array.isArray(j)?j:(j.people||[]);text=rows.map(p=>[p.name,p.handle,p.role,p.location,p.contact_email||p.email,p.phone_number||p.phone,p.source_url].filter(Boolean).join(', ')).join('\n')}$('#co70-paste').value=text;st.className='co70-status ok';st.textContent=`${f.name} loaded. Review it, then press Analyse & add crowd.`}catch(err){st.className='co70-status error';st.textContent='Could not read that file: '+err.message}};
  }

  async function enhanceCampaigns(){
    const root=$('#co70-campaigns');if(!root||root.dataset.v100)return;root.dataset.v100='1';
    const out=await api('/api/campaigns'),campaigns=out.campaigns||[];if(!campaigns.length)return;
    const host=document.createElement('article');host.className='co70-card co70-panel co100-queue';host.innerHTML='<div class="co70-card-head"><div><span class="co70-eyebrow">CONTACT QUEUE</span><h2>Who to contact next</h2></div><select id="co100-campaign" class="co70-select">'+campaigns.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')+'</select></div><div id="co100-queue-list" class="co70-list"></div>';root.appendChild(host);
    const load=async()=>{const id=$('#co100-campaign').value,r=await api(`/api/campaigns/${id}/people`),q=r.queue||[];$('#co100-queue-list').innerHTML=q.length?q.map(x=>`<div class="co70-row"><button class="co70-avatar" data-person="${x.person.id}">${esc((x.person.name||'?').slice(0,2).toUpperCase())}</button><span class="co70-copy"><strong>${esc(x.person.name)}</strong><small>${esc(x.reason||'Evidence-ranked campaign match')}</small></span><span class="co70-score">${x.score==null?'—':x.score}</span><select class="co70-select co100-status" data-campaign="${id}" data-id="${x.person.id}">${['Ready','Contacted','Replied','Follow-up','Complete','Skipped'].map(s=>`<option ${x.contact_status===s?'selected':''}>${s}</option>`).join('')}</select></div>`).join(''):'<div class="co70-empty">This campaign has no evidence-qualified queue yet.</div>';$$('.co100-status').forEach(s=>s.onchange=()=>api(`/api/campaigns/${s.dataset.campaign}/people/${s.dataset.id}`,{method:'PATCH',body:JSON.stringify({contact_status:s.value,last_contacted:s.value==='Contacted'?new Date().toISOString():''})}))};
    $('#co100-campaign').onchange=load;load();
  }

  async function run(){if(busy)return;busy=true;try{document.documentElement.dataset.remoteUi='0.9.0';await fixSemantics();await enhanceRadar();enhanceCollect();await enhanceCampaigns();$$('#co70-people .co70-row .co70-score').forEach(x=>{if(x.textContent.trim()==='0')x.textContent='—'})}catch(e){console.error('Crowd Orbit 0.10 enhancement',e)}finally{busy=false}}
  let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(run,80)}).observe(document.documentElement,{subtree:true,childList:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,250),{once:true});else setTimeout(run,250);
})();
