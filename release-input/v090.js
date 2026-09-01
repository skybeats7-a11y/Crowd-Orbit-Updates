'use strict';
(() => {
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  // v070 sets the published release version before this visual layer runs.
  // Keep that for user-facing versioning, while pinning the visual-theme selector
  // to 0.9.0 so all 0.9.x point releases inherit the same locked design system.
  const UI=document.documentElement.dataset.remoteUi||'0.9.0';
  document.documentElement.dataset.releaseUi=UI;
  document.documentElement.dataset.remoteUi='0.9.0';

  function engine(){try{return String(window.CrowdOrbitNative?.getShellVersion?.()||'0.5.1').replace(/^0\./,'')}catch{return'5.1'}}

  function applyBrand(){
    const app=$('#co70-app');if(!app)return;
    app.classList.add('co90-reset');
    const brand=$('.co70-brand',app);
    if(brand){
      brand.innerHTML=`<img src="crowd-orbit-mark.svg" alt="Crowd Orbit"><div><strong>CROWD <span>ORBIT</span></strong><em>FIND · CONNECT · BUILD</em><small>NETWORK INTELLIGENCE</small></div>`;
    }
    const version=$('#co70-version');if(version)version.textContent=`ENGINE ${engine()} · INTERFACE ${UI}`;
    const nav=$('.co70-nav');if(nav){
      const labels={orbit:['◉','Orbit'],radar:['⌖','Radar'],people:['◎','People'],campaigns:['↗','Campaigns'],collect:['＋','Collect'],settings:['⚙','Settings']};
      Object.entries(labels).forEach(([k,[icon,label]])=>{const b=nav.querySelector(`[data-nav="${k}"]`);if(b)b.innerHTML=`<b>${icon}</b><span>${label}</span>`});
    }
  }

  function addBrandFooter(){
    const app=$('#co70-app');if(!app||$('#co90-footer'))return;
    const f=document.createElement('footer');f.id='co90-footer';f.className='co90-footer';f.innerHTML='<span>POWERED BY <b>ORBIT IQ</b></span><i></i><span>DELIVERED BY <b>SBM</b></span>';
    app.querySelector('.co70-wrap')?.appendChild(f);
  }

  function polishOrbit(){
    const root=$('#co70-orbit');if(!root)return;
    const h=root.querySelector('.co70-headline h1');if(h)h.innerHTML='Your network.<br><span>In motion.</span>';
    const p=root.querySelector('.co70-headline p');if(p)p.textContent='See who matters, where they sit in your orbit, and what deserves your attention next.';
    const stage=root.querySelector('.co70-orbit-stage');if(stage&&!stage.querySelector('.co90-orbit-halo')){
      const halo=document.createElement('div');halo.className='co90-orbit-halo';halo.innerHTML='<i></i><i></i><i></i>';stage.prepend(halo);
    }
    const centre=root.querySelector('.co70-centre');if(centre&&!centre.querySelector('.co90-you')){
      const y=document.createElement('span');y.className='co90-you';y.textContent='YOU';centre.appendChild(y);
    }
  }

  function polishViews(){
    const map={
      radar:['RADAR','Find the right people, faster.','Filter your orbit, surface relevant people and only rank results when Crowd Orbit has enough evidence.'],
      people:['PEOPLE','Your relationship intelligence.','Every saved person, their evidence, contact routes and relationship history in one place.'],
      campaigns:['CAMPAIGNS','Turn intelligence into action.','Set the goal and let Orbit IQ prioritise the people most worth contacting.'],
      collect:['COLLECT','Bring people into your orbit.','Share, paste or add identifiable profiles and professional contact records. Crowd Orbit validates before it ranks.'],
      settings:['SYSTEM','Crowd Orbit under control.','Remote interface updates, local-first data, backup and recovery without reinstalling the app.']
    };
    Object.entries(map).forEach(([key,[ey,title,desc]])=>{
      const root=$(`#co70-${key}`);if(!root)return;const head=root.querySelector('.co70-headline');if(!head)return;
      const e=head.querySelector('.co70-eyebrow');if(e)e.textContent=ey;
      const h=head.querySelector('h1');if(h)h.innerHTML=title;
      const p=head.querySelector('p');if(p)p.textContent=desc;
    });
  }

  function enhanceSettings(){
    const root=$('#co70-settings');if(!root)return;
    const cards=$$('.co70-card',root);cards.forEach(c=>c.classList.add('co90-system-card'));
    const st=$('#co70-u-status');if(st)st.textContent=`Interface ${UI} active · remote update channel ready.`;
    const progress=root.querySelector('.co70-progress i');if(progress)progress.style.width='100%';
  }

  function enhancePeople(){
    const root=$('#co70-people');if(!root)return;
    $$('.co70-row',root).forEach(row=>row.classList.add('co90-person-row'));
  }

  function run(){applyBrand();addBrandFooter();polishOrbit();polishViews();enhanceSettings();enhancePeople()}
  let raf=0;new MutationObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(run)}).observe(document.documentElement,{subtree:true,childList:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,180),{once:true});else setTimeout(run,180);
})();
