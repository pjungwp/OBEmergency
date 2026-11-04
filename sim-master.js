import {SIM_SCENARIOS,getSimScenario,LEVELS,LEVEL_LABEL,SIM_REVIEW_STATUS} from "./sim-scenarios.js";
import * as S from "./sim-engine.js";

// Sim Master: the facilitator's control center. One device, mostly one-tap controls.
// Trainees use the normal Simulation cockpit (or just the mannequin); nothing here syncs to their phones.

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const KEY="ob-sim-master.v2";
const sm=$("#sm");
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=ms=>{ms=Math.max(0,Math.round(ms||0));const t=Math.floor(ms/1000),s=t%60,m=Math.floor(t/60);return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;};
const ICON={pph:"icon-pph",htn:"icon-htn",eclampsia:"icon-eclampsia",arrest:"icon-arrest",trauma:"icon-trauma",shoulder:"icon-shoulder"};
const icon=(e,size=56)=>`<picture class="sm-icon"><source type="image/webp" srcset="img/${ICON[e]}.webp"><img src="img/${ICON[e]}.png" alt="" width="${size}" height="${size}"></picture>`;
const VLABEL={BP:"BP",HR:"HR",SpO2:"SpO₂",RR:"RR",QBL:"QBL",FHR:"FHR",Rhythm:"Rhythm"};
const KIND_LABEL={lab:"Lab",vitals:"Vitals",confederate:"Confederate",complication:"Complication"};
const STATUS_LABEL={observed:"Observed",late:"Observed late",missed:"Missed",na:"Not assessed","not documented":"Not documented"};
const NOTE_CHIPS=["Closed-loop communication","Clear role assignment","Speaks up / CUS","Shared mental model","Delayed escalation","Task fixation"];

let ui={phase:"library",pick:{}};   // UI only
let run=load();
if(run?.phase&&run.phase!=="ended")ui.phase=run.phase==="prebrief"?"prebrief":run.phase==="debrief"?"debrief":"run";
let tick=null,lastSuggest="",bc=null;
try{bc=new BroadcastChannel("ob-sim-monitor");bc.onmessage=e=>{if(e.data?.type==="hello")broadcast();};}catch{}

function load(){try{const r=JSON.parse(localStorage.getItem(KEY)||"null");return r?.v===2&&getSimScenario(r.scenarioId)?r:null;}catch{return null;}}
function save(){try{run?localStorage.setItem(KEY,JSON.stringify(run)):localStorage.removeItem(KEY);}catch{}}
function scn(){return run&&getSimScenario(run.scenarioId);}
function res(){return run&&S.resolve(scn(),run.level);}
function now(){return run?S.simNow(run):0;}
function toast(t){const el=$("#smToast");el.textContent=t;el.classList.add("on");clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove("on"),2200);}

// ---------- monitor window (same device, no server) ----------
function monitorPayload(){
  if(!run)return {type:"state",idle:true};
  const r=res(),v=S.vitalsAt(run,r,now());
  return {type:"state",title:scn().title,level:LEVEL_LABEL[run.level],monitor:r.monitor,v,stage:r.stage==="cmqcc"?S.pphStage(v.qbl,v):null,
    shown:run.shown.slice(-3),stopped:run.phase==="stopped",ended:run.phase==="debrief",paused:!run.clock.running};
}
function broadcast(){const p=monitorPayload();try{bc?.postMessage(p);}catch{}try{localStorage.setItem("ob-sim-monitor.last",JSON.stringify(p));}catch{}}
function openMonitor(){window.open("sim-monitor.html","obsimmonitor","width=1100,height=700");setTimeout(broadcast,600);}

// ---------- render ----------
function render(){
  document.body.dataset.phase=ui.phase;
  $("#smTopRight").innerHTML=run&&ui.phase!=="library"?`<button class="sm-btn ghost" data-a="library">Scenarios</button>`:"";
  if(ui.phase==="library")renderLibrary();
  else if(ui.phase==="prebrief")renderPrebrief();
  else if(ui.phase==="run")renderRun();
  else if(ui.phase==="debrief")renderDebrief();
  broadcast();
}

function renderLibrary(){
  const resume=run&&run.phase!=="debrief"?`<section class="sm-resume"><div><strong>Scenario in progress</strong><span>${esc(scn().title)} · ${LEVEL_LABEL[run.level]} · ${fmt(now())}</span></div><button class="sm-btn primary" data-a="resume-run">Resume</button><button class="sm-btn ghost" data-a="discard">Discard</button></section>`:"";
  sm.innerHTML=`${resume}
    <div class="sm-lib-head"><h1>Choose a scenario</h1><p>${esc(SIM_REVIEW_STATUS)}</p></div>
    <section class="sm-lib">${SIM_SCENARIOS.map(s=>{const lvl=ui.pick[s.id]||"basic";return `<article class="sm-card">
      <div class="sm-card-top">${icon(s.emergency)}<div><h2>${esc(s.title)}</h2><p>${esc(s.summary)}</p></div></div>
      <div class="sm-tags">${s.focus.map(f=>`<span>${esc(f)}</span>`).join("")}</div>
      <div class="sm-levels" role="radiogroup" aria-label="Level">${LEVELS.map(l=>`<button role="radio" aria-checked="${l===lvl}" class="${l===lvl?"on":""}" data-level="${l}" data-sid="${s.id}">${LEVEL_LABEL[l]}</button>`).join("")}</div>
      <p class="sm-level-note">${esc(s.levels[lvl]?.note||"")}</p>
      <button class="sm-btn primary full" data-a="prebrief" data-sid="${s.id}">Prebrief ›</button>
    </article>`;}).join("")}</section>`;
}

function renderPrebrief(){
  const s=scn(),r=res();
  sm.innerHTML=`<section class="sm-pre">
    <header class="sm-pre-head">${icon(s.emergency,64)}<div><p class="sm-eyebrow">PREBRIEF · ${LEVEL_LABEL[run.level].toUpperCase()}</p><h1>${esc(s.title)}</h1><p>${esc(r.note)}</p></div></header>
    <div class="sm-pre-grid">
      <article class="sm-panel"><h2>Patient</h2><p class="lead">${esc(s.patient.oneLiner)}</p><ul>${s.patient.history.map(h=>`<li>${esc(h)}</li>`).join("")}</ul><p class="muted">${esc(s.patient.setting)}</p></article>
      <article class="sm-panel"><h2>Critical actions</h2><ul>${r.actions.filter(a=>a.critical).map(a=>`<li>${esc(a.label)}${a.target!=null?` <span class="muted">by ${a.target} min</span>`:""}</li>`).join("")}</ul></article>
      <article class="sm-panel"><h2>Say to the team</h2><ul>${s.prebrief.map(p=>`<li>${esc(p)}</li>`).join("")}</ul></article>
      <article class="sm-panel"><h2>Roles</h2><ul>${s.roles.map(p=>`<li>${esc(p)}</li>`).join("")}</ul><h2>Equipment</h2><ul>${s.equipment.map(p=>`<li>${esc(p)}</li>`).join("")}</ul></article>
    </div>
    <div class="sm-pre-actions"><button class="sm-btn ghost" data-a="library">‹ Scenarios</button><button class="sm-btn" data-a="monitor">Open monitor window</button><button class="sm-btn primary big" data-a="start">Start scenario</button></div>
  </section>`;
}

function vitalTile(k,v,r){
  const t=v.trend||{},arrow=x=>x>0?"↑":x<0?"↓":"";
  const val={BP:v.sbp?`${v.sbp}/${v.dbp}`:"—",HR:v.hr?v.hr:"—",SpO2:v.spo2?`${v.spo2}%`:"—",RR:v.rr||"—",QBL:`${v.qbl.toLocaleString()}`,FHR:v.fhr||"—",Rhythm:v.rhythm||"—"}[k];
  const tr={BP:t.sbp,HR:t.hr,SpO2:t.spo2,RR:t.rr,FHR:t.fhr}[k];
  const warn=(k==="BP"&&v.sbp&&v.sbp<90)||(k==="HR"&&v.hr>=120)||(k==="SpO2"&&v.spo2&&v.spo2<92)||(k==="FHR"&&v.fhr&&(v.fhr<110||v.fhr>160));
  return `<button class="sm-vital${warn?" warn":""}${k==="Rhythm"?" wide":""}" data-a="vitals" data-k="${k}"><small>${VLABEL[k]}${k==="QBL"?" mL":""}</small><strong data-live="${k}">${esc(val)}</strong><i data-live-trend="${k}">${arrow(tr)}</i></button>`;
}

function renderRun(){
  const s=scn(),r=res(),t=now(),st=r.states[run.state],v=S.vitalsAt(run,r,t),sug=S.suggestion(run,r,t),ec=S.eventClock(run,r,t,r.start);
  lastSuggest=JSON.stringify(sug);
  const stage=r.stage==="cmqcc"?S.pphStage(v.qbl,v):null;
  const fired=id=>run.log.filter(e=>!e.undone&&e.kind==="inject"&&e.id===id).length;
  const crit=r.actions.filter(a=>a.critical),other=r.actions.filter(a=>!a.critical);
  const obsCount=crit.filter(a=>run.obs[a.id]?.status==="observed").length;
  const cats=[...new Set(r.actions.map(a=>a.cat))];
  const actionRow=a=>{const o=run.obs[a.id];return `<div class="sm-obs ${o?o.status:""}">
    <button class="sm-obs-main" data-obs="${a.id}" aria-pressed="${o?.status==="observed"}"><span class="box">${o?.status==="observed"?"✓":o?.status==="missed"?"✕":o?.status==="na"?"–":""}</span><span class="lbl">${esc(a.label)}</span><span class="when">${o?`${o.status==="observed"?"":STATUS_LABEL[o.status]+" · "}${fmt(o.at)}`:a.target!=null?`by ${a.target} min`:""}</span></button>
    <button class="sm-obs-alt" data-obs-alt="${a.id}" aria-label="Mark ${esc(a.label)} missed or not assessed">⋯</button></div>`;};
  sm.innerHTML=`
    <section class="sm-runhead">
      <div class="sm-rh-id">${icon(s.emergency,40)}<div><p class="sm-eyebrow">SIMULATION MASTER · ${LEVEL_LABEL[run.level].toUpperCase()}</p><h1>${esc(s.title)}</h1><p class="sm-rh-state">${esc(st.name)}${stage?` · <b class="stage s${stage}">Stage ${stage}</b>`:""}${run.hold?` · <b class="holding">HOLDING</b>`:""}</p></div></div>
      <div class="sm-clocks${s.eventClock?.stopAt?" primary-ev":""}"><div class="sm-clock"><small>Scenario clock</small><strong id="simClock">${fmt(t)}</strong></div>${ec&&(s.eventClock.from!=="start"||s.eventClock.stopAt)?`<div class="sm-clock ev"><small>${esc(ec.label)}${ec.stopped?" · stopped":""}</small><strong id="evClock">${fmt(ec.ms)}</strong></div>`:""}</div>
      <div class="sm-timebtns"><button class="sm-btn ${run.clock.running?"":"primary"}" data-a="pause">${run.clock.running?"Pause":"Resume"}</button><button class="sm-btn" data-a="adv" data-m="1">+1 min</button><button class="sm-btn" data-a="adv" data-m="5">+5 min</button></div>
      <button class="sm-stop" data-a="stop" aria-label="Stop the simulation: real emergency">STOP<span> · real emergency</span></button>
    </section>
    <div class="sm-run">
      <div class="sm-col">
        <section class="sm-panel sm-state p-state">
          <p class="sm-eyebrow">CURRENT STATE</p><h2>${esc(st.name)}</h2><p class="lead">${esc(st.text)}</p>${st.findings?`<p class="muted">${esc(st.findings)}</p>`:""}
        </section>
        <section class="sm-panel p-next">
          <p class="sm-eyebrow">WHAT HAPPENS NEXT?</p>
          <div class="sm-next">${st.next.map(n=>{const isSug=sug&&sug.kind===n.kind&&sug.to===n.to;const hold=n.kind==="same";return `<button class="sm-next-btn ${n.kind}${isSug?" suggested":""}${hold&&run.hold?" on":""}" data-next="${n.kind}" data-to="${n.to}" data-label="${esc(n.label)}">
            <strong>${esc(hold?(run.hold?"Release hold":n.label):n.label)}</strong><span>${hold?(run.hold?"Patient is frozen — tap to resume":"Keep the patient unchanged"):`→ ${esc(r.states[n.to].name)}`}</span>${isSug?`<em>Suggested · ${esc(sug.why)}</em>`:""}</button>`;}).join("")}</div>
          <div class="sm-jump"><label>Jump to <select data-a="jump"><option value="">state…</option>${Object.values(r.states).filter(x=>x.id!==run.state).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select></label></div>
        </section>
        <section class="sm-panel p-inject">
          <p class="sm-eyebrow">QUICK INJECT</p>
          <div class="sm-injects">${r.injects.map(i=>`<button class="sm-inj ${i.kind}" data-inject="${i.id}" title="${esc(i.text)}"><small>${KIND_LABEL[i.kind]}</small><strong>${esc(i.label)}</strong>${fired(i.id)?`<em>✓${fired(i.id)>1?` ×${fired(i.id)}`:""}</em>`:""}</button>`).join("")}</div>
        </section>
      </div>
      <div class="sm-col">
        <section class="sm-panel p-vitals">
          <div class="sm-ph"><p class="sm-eyebrow">PATIENT STATUS</p><button class="sm-link" data-a="monitor">Monitor window ↗</button></div>
          <div class="sm-vitals">${r.monitor.map(k=>vitalTile(k,v,r)).join("")}</div>
          ${run.shown.length?`<div class="sm-shown"><small>On monitor</small>${run.shown.slice(-3).reverse().map(x=>`<p>${esc(x.text)}</p>`).join("")}</div>`:""}
        </section>
        <section class="sm-panel p-obs">
          <div class="sm-ph"><p class="sm-eyebrow">OBSERVATIONS</p><b class="sm-count">${obsCount}/${crit.length} critical</b></div>
          ${cats.map(c=>{const list=crit.filter(a=>a.cat===c);return list.length?`<h3 class="sm-cat">${esc(c)}</h3>${list.map(actionRow).join("")}`:"";}).join("")}
          ${other.length?`<details class="sm-other"><summary>Other actions (${other.length})</summary>${other.map(actionRow).join("")}</details>`:""}
          <div class="sm-notes">${NOTE_CHIPS.map(n=>`<button class="sm-chip" data-note="${esc(n)}">${esc(n)}</button>`).join("")}</div>
          <div class="sm-note-row"><input id="smNote" placeholder="Optional note (no names or identifiers)" autocomplete="off"><button class="sm-btn" data-a="note">Add</button></div>
          <p class="muted small">Unchecked means not documented — not failed. You confirm everything in the debrief.</p>
        </section>
      </div>
    </div>
    <nav class="sm-bar"><button class="sm-btn" data-a="undo">↶ Undo</button><button class="sm-btn" data-a="pause">${run.clock.running?"Pause":"Resume"}</button><button class="sm-btn bar-adv" data-a="adv" data-m="1">+1 min</button><button class="sm-btn primary" data-a="end">End · debrief</button></nav>
    ${run.phase==="stopped"?stoppedHTML():""}`;
}
function stoppedHTML(){
  return `<div class="sm-stopped" role="alertdialog" aria-labelledby="stopT"><div>
    <p class="sm-eyebrow">SIMULATION STOPPED</p><h1 id="stopT">Real emergency</h1><p>The scenario clock is paused and the log is kept.</p>
    <a class="sm-btn danger big" href="./">Open Clinical Assist</a>
    <button class="sm-btn big" data-a="unstop">Resume simulation</button><button class="sm-btn ghost" data-a="end">End and debrief</button></div></div>`;
}

function renderDebrief(){
  const s=scn(),d=S.debrief(run,s),r=res();
  const statusSel=a=>`<select data-confirm="${a.id}" class="st-${a.status.replace(" ","-")}">${Object.entries(STATUS_LABEL).map(([k,l])=>`<option value="${k}"${k===a.status?" selected":""}>${l}</option>`).join("")}</select>`;
  sm.innerHTML=`<section class="sm-debrief">
    <header class="sm-pre-head">${icon(s.emergency,56)}<div><p class="sm-eyebrow">SIMULATION DEBRIEF · ${LEVEL_LABEL[run.level].toUpperCase()}</p><h1>${esc(s.title)}</h1><p>${fmt(d.elapsed)} elapsed · ${new Date(run.createdAt).toLocaleDateString()}</p></div></header>
    <div class="sm-counts">${["observed","late","missed","na","not documented"].map(k=>`<span class="c-${k.replace(" ","-")}"><b>${d.counts[k]||0}</b>${STATUS_LABEL[k]}</span>`).join("")}</div>
    <div class="sm-pre-grid">
      <article class="sm-panel span2"><h2>Critical actions <span class="muted">— confirm or change each one</span></h2>
        <table class="sm-table"><thead><tr><th>Action</th><th>Category</th><th>Time${s.eventClock&&s.eventClock.from!=="start"?" (from event)":""}</th><th>Target</th><th>Status</th></tr></thead><tbody>
        ${d.actions.map(a=>`<tr class="${a.critical?"crit":""}"><td>${esc(a.label)}${a.critical?"":` <span class="muted">(other)</span>`}</td><td>${esc(a.cat)}</td><td>${a.fromEvent!=null?fmt(a.fromEvent):"—"}</td><td>${a.target!=null?`${a.target} min`:"—"}</td><td>${statusSel(a)}</td></tr>`).join("")}
        </tbody></table></article>
      <article class="sm-panel"><h2>Suggested debrief questions</h2><ol>${d.suggested.map(p=>`<li>${esc(p)}</li>`).join("")}</ol>${d.prompts.length>3?`<details><summary>More questions (${d.prompts.length-3})</summary><ul>${d.prompts.slice(3).map(p=>`<li>${esc(p)}</li>`).join("")}</ul></details>`:""}</article>
      <article class="sm-panel"><h2>Narrative feedback</h2><textarea id="smNarr" rows="7" placeholder="What went well · what to change · system issues (no names)">${esc(run.narrative||"")}</textarea></article>
      <article class="sm-panel span2"><h2>Timeline</h2><ol class="sm-tl">${d.timeline.map(e=>`<li class="k-${e.kind}${e.status!==undefined?` s-${e.status}`:""}"><time>${fmt(e.at)}</time><span>${esc(e.text)}</span></li>`).join("")}</ol></article>
    </div>
    <div class="sm-pre-actions noprint"><button class="sm-btn" data-a="copy">Copy summary</button><button class="sm-btn" data-a="print">Print / save PDF</button><button class="sm-btn primary" data-a="new">New scenario</button></div>
    <p class="muted small">Observations are the facilitator's record, not a competency grade. Exports contain no names.</p>
  </section>`;
}
function summaryText(){
  const s=scn(),d=S.debrief(run,s);
  return [`${s.title} — ${LEVEL_LABEL[run.level]} — ${fmt(d.elapsed)} elapsed`,"",
    "Critical actions:",...d.actions.filter(a=>a.critical).map(a=>`  ${STATUS_LABEL[a.status]}${a.fromEvent!=null?` at ${fmt(a.fromEvent)}`:""} — ${a.label}`),"",
    "Timeline:",...d.timeline.map(e=>`  ${fmt(e.at)}  ${e.text}`),"",
    "Debrief questions:",...d.suggested.map(p=>`  • ${p}`),
    ...(run.narrative?["","Feedback:",run.narrative]:[])].join("\n");
}

// ---------- vitals sheet ----------
function vitalsSheet(){
  const r=res(),v=S.vitalsAt(run,r,now());
  const f=(k,l,val)=>`<label><span>${l}</span><input type="${k==="rhythm"?"text":"number"}" inputmode="${k==="rhythm"?"text":"numeric"}" data-vk="${k}" value="${val??""}"></label>`;
  const keys=r.monitor;
  const html=`<div class="sm-sheet-bg" data-a="close-sheet"></div><div class="sm-sheet" role="dialog" aria-label="Set vitals"><h2>Set vitals</h2><p class="muted">Held at these values until the next state.</p><div class="sm-vgrid">
    ${keys.includes("BP")?f("sbp","Systolic",v.sbp)+f("dbp","Diastolic",v.dbp):""}${keys.includes("HR")?f("hr","HR",v.hr):""}${keys.includes("SpO2")?f("spo2","SpO₂",v.spo2):""}${keys.includes("RR")?f("rr","RR",v.rr):""}${keys.includes("FHR")?f("fhr","FHR",v.fhr):""}${keys.includes("Rhythm")?f("rhythm","Rhythm",v.rhythm):""}${keys.includes("QBL")?f("qblRate","Bleeding mL/min",""):""}
  </div><div class="sm-pre-actions"><button class="sm-btn ghost" data-a="close-sheet">Cancel</button><button class="sm-btn primary" data-a="set-vitals">Set</button></div></div>`;
  const host=document.createElement("div");host.id="smSheet";host.innerHTML=html;document.body.appendChild(host);host.querySelector("input")?.focus();
}
function altSheet(id){
  const a=res().actions.find(x=>x.id===id);if(!a)return;
  const host=document.createElement("div");host.id="smSheet";
  host.innerHTML=`<div class="sm-sheet-bg" data-a="close-sheet"></div><div class="sm-sheet" role="dialog" aria-label="Observation"><h2>${esc(a.label)}</h2><div class="sm-alt">
    <button class="sm-btn primary big" data-obs-set="observed" data-id="${id}">Observed now</button><button class="sm-btn big" data-obs-set="missed" data-id="${id}">Missed</button><button class="sm-btn big" data-obs-set="na" data-id="${id}">Not assessed</button><button class="sm-btn ghost" data-obs-set="" data-id="${id}">Clear</button></div></div>`;
  document.body.appendChild(host);
}
function closeSheet(){$("#smSheet")?.remove();}

// ---------- live updates ----------
function liveUpdate(){
  if(!run||ui.phase!=="run")return;
  const r=res(),t=now(),v=S.vitalsAt(run,r,t);
  const c=$("#simClock");if(c)c.textContent=fmt(t);
  const ec=S.eventClock(run,r,t,r.start),e=$("#evClock");if(e&&ec)e.textContent=fmt(ec.ms);
  for(const k of r.monitor){const el=$(`[data-live="${k}"]`);if(!el)continue;el.textContent={BP:v.sbp?`${v.sbp}/${v.dbp}`:"—",HR:v.hr||"—",SpO2:v.spo2?`${v.spo2}%`:"—",RR:v.rr||"—",QBL:v.qbl.toLocaleString(),FHR:v.fhr||"—",Rhythm:v.rhythm||"—"}[k];
    const tr={BP:v.trend.sbp,HR:v.trend.hr,SpO2:v.trend.spo2,RR:v.trend.rr,FHR:v.trend.fhr}[k],ti=$(`[data-live-trend="${k}"]`);if(ti)ti.textContent=tr>0?"↑":tr<0?"↓":"";}
  const sug=JSON.stringify(S.suggestion(run,r,t));
  if(sug!==lastSuggest&&!$("#smSheet")&&!document.activeElement?.matches("input,select,textarea"))render();
}
function startTick(){clearInterval(tick);let n=0;tick=setInterval(()=>{liveUpdate();if(++n%4===0)broadcast();},250);}

// ---------- actions ----------
function act(fn,msg){fn();save();render();if(msg)toast(msg);}
document.addEventListener("click",e=>{
  const b=e.target.closest("button,[data-a]");if(!b)return;
  const a=b.dataset.a;
  if(b.dataset.level){ui.pick[b.dataset.sid]=b.dataset.level;renderLibrary();return;}
  if(a==="prebrief"){const s=getSimScenario(b.dataset.sid);run=S.createRun(s,ui.pick[s.id]||"basic");ui.phase="prebrief";save();render();return;}
  if(a==="library"){ui.phase="library";render();return;}
  if(a==="resume-run"){ui.phase=run.phase==="prebrief"?"prebrief":run.phase==="debrief"?"debrief":"run";render();return;}
  if(a==="discard"){if(confirm("Discard the scenario in progress?")){run=null;save();render();}return;}
  if(a==="monitor"){openMonitor();return;}
  if(a==="start"){act(()=>S.startRun(run));ui.phase="run";render();return;}
  if(!run)return;
  const t=now();
  if(a==="pause")act(()=>run.clock.running?S.pause(run):S.resume(run));
  if(a==="adv")act(()=>S.advance(run,Number(b.dataset.m)*60000),`+${b.dataset.m} min`);
  if(a==="stop")act(()=>S.stopForEmergency(run));
  if(a==="unstop")act(()=>S.resumeAfterStop(run));
  if(a==="undo"){const u=S.undo(run);save();render();toast(u?`Undone: ${u.text}`:"Nothing to undo");}
  if(a==="end"){act(()=>S.endRun(run));ui.phase="debrief";render();window.scrollTo(0,0);}
  if(b.dataset.next){const k=b.dataset.next;if(k==="same")act(()=>S.setHold(run,res(),!run.hold,t),run.hold?"Hold released":"Holding");else act(()=>S.goTo(run,res(),b.dataset.to,t,b.dataset.label),b.dataset.label);}
  if(b.dataset.inject){const i=res().injects.find(x=>x.id===b.dataset.inject);act(()=>S.inject(run,res(),i.id,t),`${i.label}${i.show?" · on monitor":""}`);}
  if(b.dataset.obs){const id=b.dataset.obs,cur=run.obs[id]?.status;act(()=>S.observe(run,id,cur==="observed"?null:"observed",t));}
  if(b.dataset.obsAlt)altSheet(b.dataset.obsAlt);
  if(b.dataset.obsSet!=null){closeSheet();act(()=>S.observe(run,b.dataset.id,b.dataset.obsSet||null,t));}
  if(b.dataset.note)act(()=>S.note(run,b.dataset.note,t),"Noted");
  if(a==="note"){const i=$("#smNote");if(i?.value.trim())act(()=>S.note(run,i.value.trim(),t),"Noted");}
  if(a==="vitals")vitalsSheet();
  if(a==="close-sheet")closeSheet();
  if(a==="set-vitals"){const vals={};$$("[data-vk]").forEach(i=>{if(i.value!=="")vals[i.dataset.vk]=i.value;});closeSheet();act(()=>S.override(run,res(),vals,t),"Vitals set");}
  if(a==="copy"){navigator.clipboard?.writeText(summaryText()).then(()=>toast("Summary copied"),()=>toast("Copy failed"));}
  if(a==="print")window.print();
  if(a==="new"){run=null;save();ui.phase="library";render();}
});
document.addEventListener("change",e=>{
  if(e.target.dataset.a==="jump"&&e.target.value&&run){const to=e.target.value;act(()=>S.goTo(run,res(),to,now(),`Jump to ${res().states[to].name}`),"State changed");}
  if(e.target.dataset.confirm&&run){run.confirm[e.target.dataset.confirm]=e.target.value;save();renderDebrief();}
});
document.addEventListener("input",e=>{if(e.target.id==="smNarr"&&run){run.narrative=e.target.value;save();}});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape")closeSheet();
  if(ui.phase!=="run"||e.target.matches?.("input,textarea,select")||e.metaKey||e.ctrlKey)return;
  if(e.key===" "){e.preventDefault();act(()=>run.clock.running?S.pause(run):S.resume(run));}
  if(e.key.toLowerCase()==="u"){const u=S.undo(run);save();render();toast(u?`Undone: ${u.text}`:"Nothing to undo");}
  const n=Number(e.key);if(n>=1&&n<=4)$$(".sm-next-btn")[n-1]?.click();
});
$("#smText")?.addEventListener("click",()=>{const on=!document.documentElement.classList.contains("text-lg");document.documentElement.classList.toggle("text-lg",on);$("#smText").setAttribute("aria-pressed",String(on));try{const k="ob-emergency-assist.settings.v1",s=JSON.parse(localStorage.getItem(k)||"{}");s.largeText=on;localStorage.setItem(k,JSON.stringify(s));}catch{}});
window.addEventListener("beforeprint",()=>{if(run&&ui.phase==="debrief"){run.narrative=$("#smNarr")?.value||run.narrative;save();}});

render();startTick();
