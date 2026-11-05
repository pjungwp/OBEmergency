// Announce a new deployed version instead of replacing anything mid-session.
// Netlify only (Apps Script deployments are versioned and announced by the pipeline).
export function watchForUpdate(onUpdate,{everyMs=600000}={}){
  if(window.__GAS||!("fetch" in window))return;
  let base=null,told=false;
  const check=()=>fetch("./package.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(p=>{
    if(!p?.version)return;if(base==null){base=p.version;return;}
    if(p.version!==base&&!told){told=true;onUpdate(p.version);}
  }).catch(()=>{});
  check();setInterval(check,everyMs);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)check();});
}
