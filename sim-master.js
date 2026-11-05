import {installBackGuard} from "./back-guard.js";
import {watchForUpdate} from "./update-check.js";
import {SIM_SCENARIOS,getSimScenario,LEVELS,LEVEL_LABEL,SIM_REVIEW_STATUS} from "./sim-scenarios.js";
import * as S from "./sim-engine.js";
import {createLocalSync} from "./sim-sync.js";

// Sim Master 2.0 — the facilitator's command center. Progressive disclosure by default:
// primary (always visible): clock, vitals, current state, next-state choices, critical observations
// secondary (collapsed): more options, optional observations, injects, notes, event log
// reference (hidden until asked): scripts, rationale, rubrics, teaching notes
// Only one secondary section is open at a time unless pinned. Longer content uses a bottom sheet.

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const KEY="ob-sim-master.v2",UIKEY="ob-sim-master.ui";
const sm=$("#sm");
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=ms=>{ms=Math.max(0,Math.round(ms||0));const t=Math.floor(ms/1000),s=t%60,m=Math.floor(t/60);return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;};
const ICON={pph:"icon-pph",htn:"icon-htn",eclampsia:"icon-eclampsia",arrest:"icon-arrest",trauma:"icon-trauma",shoulder:"icon-shoulder"};
const icon=(e,size=56)=>`<picture class="sm-icon"><source type="image/webp" srcset="img/${ICON[e]}.webp"><img src="img/${ICON[e]}.png" alt="" width="${size}" height="${size}"></picture>`;
const VLABEL={BP:"BP",HR:"HR",SpO2:"SpO₂",RR:"RR",QBL:"QBL",FHR:"FHR",Rhythm:"Rhythm"};
const KIND={lab:"Labs",vitals:"Vitals",confederate:"Confederate",complication:"Complication",custom:"Custom"};
const FOR={learner:"Learner",confederate:"Confederate",monitor:"Monitor",instructor:"Instructor"};
const NOTE_CHIPS=["Closed-loop communication","Clear role assignment","Speaks up / CUS","Shared mental model","Situational awareness","Delayed escalation","Task fixation"];
const QUALITY=["Good","Adequate","Needs work"];

let ui=loadUI();
let run=load();
if(run)ui.phase=run.phase==="prebrief"?"prebrief":run.phase==="debrief"?"debrief":"run";else ui.phase="library";
let tick=null,lastSuggest="",lastState="",lastPrompts="",updateReady=null;
const sync=createLocalSync("master");

function loadUI(){try{const u=JSON.parse(sessionStorage.getItem(UIKEY)||"null");if(u)return {...u,pinned:new Set(u.pinned||[]),pick:u.pick||{}};}catch{}return {phase:"library",pick:{},open:null,pinned:new Set(innerWidth>=1280?["sent","log"]:[]),sheet:null};}
function saveUI(){try{sessionStorage.setItem(UIKEY,JSON.stringify({...ui,pinned:[...ui.pinned],sheet:null}));}catch{}}
function load(){try{const r=JSON.parse(localStorage.getItem(KEY)||"null");return r?.v===2&&getSimScenario(r.scenarioId)?r:null;}catch{return null;}}
function save(){try{run?localStorage.setItem(KEY,JSON.stringify(run)):localStorage.removeItem(KEY);}catch{}}
const scn=()=>run&&getSimScenario(run.scenarioId);
const res=()=>run&&S.resolve(scn(),run.level);
const now=()=>run?S.simNow(run):0;
function toast(t){const el=$("#smToast");el.textContent=t;el.classList.add("on");clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove("on"),t.length>60?6000:2200);}

// ---------- progressive disclosure ----------
const isOpen=id=>ui.printAll||ui.open===id||ui.pinned.has(id);
function sec(id,title,count,body,{pin=false,cls=""}={}){
  const o=isOpen(id),p=ui.pinned.has(id);
  return `<section class="ds ${cls}${o?" open":""}" data-sec="${id}">
    <div class="ds-h"><button class="ds-t" data-toggle="${id}" aria-expanded="${o}"><i class="chev" aria-hidden="true"></i><span>${title}</span>${count!=null&&count!==""?`<b>${count}</b>`:""}</button>${pin?`<button class="ds-pin${p?" on":""}" data-pin="${id}" aria-pressed="${p}" title="${p?"Unpin":"Keep open"}" aria-label="${p?"Unpin":"Keep open"} ${title}">${p?"Pinned":"Pin"}</button>`:""}</div>
    ${o?`<div class="ds-b">${body}</div>`:""}</section>`;
}
function toggle(id){if(ui.pinned.has(id)){ui.pinned.delete(id);if(ui.open===id)ui.open=null;}else ui.open=ui.open===id?null:id;saveUI();render();}
function pin(id){ui.pinned.has(id)?ui.pinned.delete(id):ui.pinned.add(id);if(ui.open===id&&!ui.pinned.has(id))ui.open=null;saveUI();render();}

// ---------- monitor / learner display (same device) ----------
function broadcast(){
  if(!run){sync.publish({idle:true});return;}
  const r=res(),v=S.vitalsAt(run,r,now());
  sync.publish({title:scn().title,level:LEVEL_LABEL[run.level],monitor:r.monitor,v,stage:r.stage==="cmqcc"?S.pphStage(v.qbl,v):null,
    shown:run.shown.slice(-3),stopped:run.phase==="stopped",ended:run.phase==="debrief",paused:!run.clock.running});
}
function showMonitorView(){
  const host=document.createElement("div");host.id="smMonView";host.setAttribute("role","dialog");host.setAttribute("aria-label","Learner monitor");
  const paint=()=>{if(!run){host.remove();return;}const r=res(),v=S.vitalsAt(run,r,now());
    host.innerHTML=`<div class="mv-top"><span>SIMULATION</span><b>${fmt(now())}</b></div><div class="mv-grid">${r.monitor.map(k=>`<div class="mv-v ${k}"><small>${VLABEL[k]}</small><strong>${esc(monVal(k,v))}</strong></div>`).join("")}</div>
      ${run.shown.length?`<p class="mv-shown">${esc(run.shown.at(-1).text)}</p>`:""}<p class="mv-hint">Tap anywhere to return to Sim Master</p>`;};
  paint();const t=setInterval(paint,1000);host.addEventListener("click",()=>{clearInterval(t);host.remove();});document.body.appendChild(host);
}
const monVal=(k,v)=>({BP:v.sbp?`${v.sbp}/${v.dbp}`:"—",HR:v.hr||"—",SpO2:v.spo2?`${v.spo2}%`:"—",RR:v.rr||"—",QBL:v.qbl.toLocaleString(),FHR:v.fhr||"—",Rhythm:v.rhythm||"—"}[k]);
function openMonitor(){window.open("sim-monitor.html","obsimmonitor","width=1100,height=700");setTimeout(broadcast,600);}

// ---------- render ----------
function render(){
  document.body.dataset.phase=ui.phase;
  $("#smTopRight").innerHTML=(updateReady&&ui.phase!=="run"?`<button class="sm-btn primary" data-a="reload">Update ready · Reload</button>`:"")+(run&&ui.phase!=="library"?`<button class="sm-btn ghost" data-a="${ui.phase==="run"?"ask-leave":"library"}">Scenarios</button>`:"");
  if(ui.phase==="library")renderLibrary();
  else if(ui.phase==="prebrief")renderPrebrief();
  else if(ui.phase==="run")renderRun();
  else if(ui.phase==="debrief")renderDebrief();
  renderSheet();
  broadcast();
}

function renderLibrary(){
  const resume=run&&run.phase!=="debrief"?`<section class="sm-resume"><div><strong>Scenario in progress</strong><span>${esc(scn().title)} · ${LEVEL_LABEL[run.level]} · ${fmt(now())}</span></div><button class="sm-btn primary" data-a="resume-run">Resume</button><button class="sm-btn ghost" data-a="ask-discard">Discard</button></section>`:"";
  sm.innerHTML=`${resume}
    <div class="sm-lib-head"><h1>Choose a scenario</h1><p>${esc(SIM_REVIEW_STATUS)}</p></div>
    <p class="sm-team-link">Team members can follow along on their phones: <a href="index.html?practice=1">open Assist in practice mode ›</a></p>
    <section class="sm-lib">${SIM_SCENARIOS.map(s=>{const lvl=ui.pick[s.id]||"basic";return `<article class="sm-card">
      <div class="sm-card-top">${icon(s.emergency)}<div><h2>${esc(s.title)}</h2><p>${esc(s.summary)}</p></div></div>
      <div class="sm-levels" role="radiogroup" aria-label="Level">${LEVELS.map(l=>`<button role="radio" aria-checked="${l===lvl}" class="${l===lvl?"on":""}" data-level="${l}" data-sid="${s.id}">${LEVEL_LABEL[l]}</button>`).join("")}</div>
      <p class="sm-level-note">${esc(s.levels[lvl]?.note||"")}</p>
      <button class="sm-btn primary full" data-a="prebrief" data-sid="${s.id}">Prebrief ›</button>
    </article>`;}).join("")}</section>`;
}

function renderPrebrief(){
  const s=scn(),r=res(),pr=run.prep||(run.prep={roles:[],ready:[],seen:[]});
  const crit=r.actions.filter(a=>a.critical),items=[...s.patient.history.map(t=>({t,k:"h"})),...s.equipment.map(t=>({t,k:"e"}))];
  const open=ui.prep??"brief",seen=new Set(pr.seen);
  const card=(id,title,meta,body)=>{const o=open===id;return `<article class="pc${o?" open":""}${seen.has(id)?" seen":""}">
    <button class="pc-h" data-prep="${id}" aria-expanded="${o}"><span class="pc-t">${title}</span><span class="pc-m">${seen.has(id)&&!o?"✓ ":""}${meta}</span><i class="chev" aria-hidden="true"></i></button>
    ${o?`<div class="pc-b">${body}</div>`:""}</article>`;};
  const mon=monitorStatus();
  sm.innerHTML=`<section class="sm-pre">
    <header class="pre-top"><button class="sm-link" data-a="library">‹ Scenarios</button><span class="pre-lvl">${LEVEL_LABEL[run.level]}</span></header>
    <h1 class="pre-title">${esc(s.title.replace(/^Postpartum hemorrhage · /,"PPH · "))}</h1>
    <p class="pre-meta">v${esc(s.version)} · ${s.reviewed?`reviewed ${esc(s.reviewed)}`:"not yet reviewed"} · ${esc(r.note)}</p>
    <article class="pre-handoff"><p class="sm-eyebrow">PATIENT HANDOFF</p><p class="lead">${esc(s.patient.oneLiner)}</p><p class="muted">${esc(s.patient.setting)}</p></article>
    <div class="pre-cards">
      ${card("brief","Learner briefing",`${s.prebrief.length} points`,`<p class="say-who">Read aloud</p><blockquote class="pre-script">${s.prebrief.map(esc).join(" ")}</blockquote>`)}
      ${card("roles","Assign roles",`${pr.roles.length||0} of ${s.roles.length}`,`<p class="muted small">Tap roles that are filled. Names are optional and never saved.</p><div class="chips">${s.roles.map((x,i)=>`<button class="sm-chip${pr.roles.includes(i)?" on":""}" data-role="${i}" aria-pressed="${pr.roles.includes(i)}">${esc(x)}</button>`).join("")}</div>`)}
      ${card("room","Room setup",`${pr.ready.length} of ${items.length} ready`,`<h3 class="sm-cat">History</h3>${items.filter(x=>x.k==="h").map(x=>chk(x,items,pr)).join("")}<h3 class="sm-cat">Equipment</h3>${items.filter(x=>x.k==="e").map(x=>chk(x,items,pr)).join("")}`)}
      ${card("obj","Objectives",`${crit.length} critical actions`,`<ul class="pre-obj">${crit.map(a=>`<li>${esc(a.label)}${a.target!=null?` <span class="muted">· ${a.target} min${a.from?` after ${esc(r.states[a.from]?.name||a.from)}`:""}</span>`:""}</li>`).join("")}</ul>`)}
    </div>
    <p class="pre-mon">Monitor: <b class="${mon.on?"on":""}">${mon.on?"Connected":"Not connected"}</b> · <button class="sm-link" data-a="monitor-setup">${mon.on?"Options":"Set up"}</button></p>
    <div class="pre-go"><button class="sm-btn primary big" data-a="start">▶ Start scenario</button></div>
  </section>`;
}
function chk(x,items,pr){const i=items.indexOf(x),on=pr.ready.includes(i);return `<button class="pre-chk${on?" on":""}" data-ready="${i}" aria-pressed="${on}"><span class="box" aria-hidden="true">${on?"✓":""}</span>${esc(x.t)}</button>`;}
function monitorStatus(){const t=sync.status().monitorAt;return {on:!!t&&Date.now()-t<15000};}

function vitalCell(k,v){
  const t=v.trend||{},arrow=x=>x>0?"▲":x<0?"▼":"";
  const val={BP:v.sbp?`${v.sbp}/${v.dbp}`:"—",HR:v.hr||"—",SpO2:v.spo2?`${v.spo2}%`:"—",RR:v.rr||"—",QBL:v.qbl.toLocaleString(),FHR:v.fhr||"—",Rhythm:v.rhythm||"—"}[k];
  const tr={BP:t.sbp,HR:t.hr,SpO2:t.spo2,RR:t.rr,FHR:t.fhr}[k];
  const warn=(k==="BP"&&v.sbp&&v.sbp<90)||(k==="HR"&&v.hr>=120)||(k==="SpO2"&&v.spo2&&v.spo2<92)||(k==="FHR"&&v.fhr&&(v.fhr<110||v.fhr>160));
  return `<button class="vs${warn?" warn":""}${k==="Rhythm"?" rhythm":""}" data-a="patient" aria-label="${VLABEL[k]} ${esc(val)}${warn?" (abnormal)":""}"><small>${VLABEL[k]}</small><strong data-live="${k}">${esc(val)}</strong><i data-live-trend="${k}" aria-hidden="true">${arrow(tr)}</i></button>`;
}

// Emergency-specific status tiles shown before the vitals (live-updated).
const MANEUVERS=["a-mcroberts","a-suprapubic","a-posterior","a-rotate","a-allfours"];
function metrics(s,r,t){
  const st=r.states[run.state],since=x=>Math.max(0,t-x),out=[];
  if(s.emergency==="pph"){const q=st.qblRate||0;out.push({k:"bleed",label:"Bleeding",val:q>=80?"Heavy":q>=20?"Ongoing":q>=5?"Slowing":"Minimal",cls:q>=80?"warn":q>=20?"amber":"ok"});}
  if(s.emergency==="htn"){const sz=["seizure","recurrent"].includes(run.state),n=run.log.filter(e=>!e.undone&&e.kind==="state"&&["seizure","recurrent"].includes(e.to)).length;
    out.push({k:"seiz",label:sz?"Seizure":"Seizures",val:sz?fmt(since(run.stateAt)):n?`${n} so far`:"None",cls:sz?"warn":n?"amber":"ok"});
    const mg=run.obs["a-mag"]?.status==="observed";out.push({k:"mg",label:"Magnesium",val:mg?"Given":"Not yet",cls:mg?"ok":"amber"});}
  if(s.emergency==="shoulder"){const ec=S.eventClock(run,r,t,r.start),tried=MANEUVERS.filter(id=>run.obs[id]?.status).map(id=>r.actions.find(a=>a.id===id)).filter(Boolean);
    out.push({k:"h2b",label:"Head → body",val:ec?fmt(ec.ms):"—",cls:ec&&ec.ms>=240000?"warn":ec&&ec.ms>=120000?"amber":""});
    out.push({k:"man",label:`Maneuvers · ${tried.length}`,val:tried.length?tried.at(-1).label.split(/[ (]/)[0]:"None yet",cls:tried.length?"":"amber"});}
  if(s.emergency==="arrest"){const done=run.log.some(e=>!e.undone&&e.kind==="state"&&e.to==="delivered")||run.state==="delivered",left=300000-t;
    out.push({k:"del",label:"Delivery by 5 min",val:done?"Delivered":left>0?`${fmt(left)} left`:`${fmt(-left)} over`,cls:done?"ok":left<60000?"warn":"amber"});}
  return out;
}
const metricCell=m=>`<button class="vs metric ${m.cls||""}" data-a="patient"><small>${esc(m.label)}</small><strong data-live-metric="${m.k}">${esc(m.val)}</strong></button>`;
function obsRow(a){
  const o=run.obs[a.id],st=o?.status;
  return `<div class="ob ${st||""}">
    <button class="ob-main" data-obs="${a.id}" aria-pressed="${st==="observed"}"><span class="box" aria-hidden="true">${st==="observed"?"✓":st==="partial"?"½":st==="missed"?"✕":st==="na"?"–":""}</span><span class="lbl">${esc(a.label)}${a.surfaced?` <em class="now-tag">Now relevant</em>`:""}</span><span class="when">${st?`${st==="observed"?"":({partial:"Partial",missed:"Not done",na:"N/A"}[st])+" · "}${fmt(o.at)}`:""}${o?.quality?` · ${esc(o.quality)}`:""}</span></button>
    <button class="ob-more" data-obs-more="${a.id}" aria-label="Details for ${esc(a.label)}">•••</button></div>`;
}

function renderRun(){
  const s=scn(),r=res(),t=now(),st=r.states[run.state],v=S.vitalsAt(run,r,t),sug=S.suggestion(run,r,t),ec=S.eventClock(run,r,t,r.start);
  lastSuggest=JSON.stringify(sug);lastState=run.state;
  const stage=r.stage==="cmqcc"?S.pphStage(v.qbl,v):null,mets=metrics(s,r,t);
  const moves=st.next.filter(n=>n.kind!=="same"),hold=st.next.find(n=>n.kind==="same");
  const primaryMoves=moves.slice(0,3),extraMoves=moves.slice(3);
  const {primary,optional}=S.checklist(run,r);
  const recorded=primary.filter(a=>run.obs[a.id]?.status==="observed").length;
  const sent=run.log.filter(e=>!e.undone&&e.kind==="inject");
  const showEv=ec&&(s.eventClock.from!=="start"||s.eventClock.stopAt);
  const moveCard=n=>{const isSug=sug&&sug.kind===n.kind&&sug.to===n.to;return `<button class="mv ${n.kind}${isSug?" suggested":""}" data-next="${n.kind}" data-to="${n.to}" data-label="${esc(n.label)}"><span class="mv-k">${n.kind==="worsen"?"▼ Deteriorate":"▲ Improve"}</span><strong>${esc(n.label)}</strong><span class="mv-to">→ ${esc(r.states[n.to].name)}</span>${isSug?`<em>Suggested · ${esc(sug.why)}</em>`:""}</button>`;};
  sm.innerHTML=`
    <header class="ck-head">
      <div class="ck-row1">
        <span class="sim-tag">SIM</span>
        <div class="ck-title"><strong>${esc(s.title.replace(/^Postpartum hemorrhage/,"PPH"))}</strong><span>${LEVEL_LABEL[run.level]}</span></div>
        <div class="ck-clock${showEv&&s.eventClock.stopAt?" ev-first":""}"><strong id="simClock" aria-label="Scenario clock">${fmt(t)}</strong>${showEv?`<span class="ev"><small>${esc(ec.label)}</small><b id="evClock">${fmt(ec.ms)}</b></span>`:""}</div>
        <button class="run-pill ${run.clock.running?"on":"off"}" data-a="pause" aria-label="${run.clock.running?"Pause":"Resume"} the scenario clock">${run.clock.running?"❚❚ RUNNING":"▶ PAUSED"}</button>
        <button class="sm-stop" data-a="stop" aria-label="Stop the simulation: real emergency">STOP</button>
      </div>
      <div class="ck-vitals" style="grid-template-columns:${mets.map(()=>"1.35fr").join(" ")} ${r.monitor.map(k=>({BP:"1.55fr",QBL:"1.2fr",Rhythm:"1.7fr",SpO2:"1.1fr"}[k]||"1fr")).join(" ")}${stage?" auto":""}">${mets.map(metricCell).join("")}${r.monitor.map(k=>vitalCell(k,v)).join("")}${stage?`<span class="stage s${stage}">Stage ${stage}</span>`:""}</div>
    </header>
    <div class="ck-grid">
      <nav class="ck-col ck-flowcol" aria-label="Scenario flow">${flowHTML(r,moves)}</nav>
      <div class="ck-col ck-control">
        ${promptCard(r,st,t)}
        <p class="ck-next-h">What happens next?</p>
        <section class="ck-moves">${primaryMoves.map(moveCard).join("")}</section>
        ${sec("more","More options",null,`<div class="more-grid">
          ${hold?`<button class="sm-btn${run.hold?" primary":""}" data-next="same" data-to="${hold.to}">${run.hold?"Release hold":"Hold patient state"}</button>`:""}
          ${extraMoves.map(n=>`<button class="sm-btn" data-next="${n.kind}" data-to="${n.to}" data-label="${esc(n.label)}">${esc(n.label)}</button>`).join("")}
          <label class="more-jump">Jump to <select data-a="jump"><option value="">state…</option>${Object.values(r.states).filter(x=>x.id!==run.state).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select></label>
          <button class="sm-btn" data-a="vitals">Set vitals…</button>
          <button class="sm-btn" data-a="adv" data-m="5">+5 min</button>
          <button class="sm-btn" data-a="advanced-time">Advance by…</button>
          <button class="sm-btn" data-a="monitor">Monitor window ↗</button>
        </div>`)}
        ${sec("ref","Instructor reference",null,refHTML(s,r))}
      </div>
      <div class="ck-col ck-obs">
        <section class="ck-crit"><div class="ck-crit-h"><h3>Watch for</h3><b>${recorded} of ${primary.length} recorded</b></div>${primary.map(obsRow).join("")}</section>
        ${optional.length?sec("opt","More observations",optional.length,optional.map(obsRow).join("")):""}
        ${sec("notes","Team notes",run.notes.length||"",`<div class="sm-notes">${NOTE_CHIPS.map(n=>`<button class="sm-chip" data-note="${esc(n)}">${esc(n)}</button>`).join("")}</div><div class="sm-note-row"><input id="smNote" placeholder="Note (no names or identifiers)" autocomplete="off"><button class="sm-btn" data-a="note">Add</button></div>${run.notes.length?`<ul class="mini-log">${[...run.notes].reverse().slice(0,5).map(n=>`<li><time>${fmt(n.at)}</time>${esc(n.text)}</li>`).join("")}</ul>`:""}`)}
      </div>
      <div class="ck-col ck-side">
        ${sec("sent","Injects sent",(run.queue||[]).length?`${sent.length} · ${(run.queue||[]).length} queued`:sent.length,sentHTML(r,sent))}
        ${sec("log","Event log",run.log.filter(e=>!e.undone).length,logHTML(r))}
      </div>
    </div>
    <p class="ck-foot muted small">Unchecked means not documented — not failed. Suggestions only highlight; nothing changes until you tap. v${esc(s.version)} · ${s.reviewed?`reviewed ${esc(s.reviewed)}`:"draft, not yet reviewed"}</p>
    <nav class="sm-dock" aria-label="Simulation controls">
      <button data-a="inject"><b>＋</b>Inject</button>
      <button data-a="adv" data-m="1"><b>⏩</b>+1 min</button>
      <button data-a="pause" class="${run.clock.running?"":"on"}"><b>${run.clock.running?"❚❚":"▶"}</b>${run.clock.running?"Pause":"Resume"}</button>
      <button data-a="undo"><b>↶</b>Undo</button>
      <button data-a="ask-end" class="end"><b>■</b>Debrief</button>
    </nav>
    ${run.phase==="stopped"?stoppedHTML():""}`;
}
function promptCard(r,st,t){
  const P=S.prompts(run,r,t),p=P[0];lastPrompts=P.map(x=>x.id).join();
  const due=S.checklist(run,r).primary.filter(a=>!run.obs[a.id]?.status);
  const reveal=(st.injects||[]).map(id=>r.injects.find(i=>i.id===id)).filter(i=>i&&(i.kind==="lab"||i.kind==="vitals"));
  return `<section class="ck-say${p?.kind==="nudge"?" nudge":""}">
    <p class="say-now">NOW${run.hold?` · <b class="holding">HOLDING</b>`:""}<strong>${esc(st.name)}</strong></p>
    ${p?`<p class="say-who">${p.kind==="nudge"?"Prompt if needed":"Say"} · ${esc(p.who)}</p><blockquote>“${esc(p.line)}”</blockquote>${p.why?`<p class="say-why">${esc(p.why)}</p>`:""}
      <div class="say-acts"><button class="sm-btn primary" data-prompt="${esc(p.id)}" data-pst="delivered">✓ Delivered</button><button class="sm-btn ghost" data-prompt="${esc(p.id)}" data-pst="skipped">Skip</button>${P.length>1?`<span class="say-more">+${P.length-1} more</span>`:""}</div>`
     :`<p class="say-idle">Nothing to say right now — watch the team.</p>`}
    <details class="say-info"${ui.info?" open":""}><summary data-a="info">More information</summary>
      <p><b>Findings on request:</b> ${esc(st.findings||st.text)}</p>
      ${reveal.length?`<p><b>Results if asked:</b></p><ul>${reveal.map(i=>`<li>${esc(i.label)} — ${esc(i.text)}</li>`).join("")}</ul>`:""}
      ${due.length?`<p><b>Expected, not yet recorded:</b></p><ul>${due.map(a=>`<li>${esc(a.label)}</li>`).join("")}</ul>`:""}
    </details>
  </section>`;
}
function flowHTML(r,moves){
  const order=S.flowOrder(r),next=new Map(moves.map(n=>[n.to,n]));
  const seen=new Set([r.start,...run.log.filter(e=>!e.undone&&e.kind==="state").map(e=>e.to)]);
  return `<p class="flow-h">Scenario flow</p><ol class="ck-flow">${order.map(id=>{const x=r.states[id],n=next.get(id),now=id===run.state;
    const cls=now?"now":n?`next ${n.kind}`:seen.has(id)?"done":"";const tag=now?"Now":n?(n.kind==="worsen"?"▼":"▲"):seen.has(id)?"✓":"";
    const inner=`<span class="fdot" aria-hidden="true">${tag}</span><span class="fname">${esc(x.name)}</span>`;
    return `<li class="${cls}">${n?`<button data-next="${n.kind}" data-to="${n.to}" data-label="${esc(n.label)}" aria-label="Go to ${esc(x.name)}">${inner}</button>`:`<div${now?' aria-current="step"':""}>${inner}</div>`}</li>`;}).join("")}</ol>`;
}
function refHTML(s,r){
  return `<div class="ref">
    <p class="lead">${esc(s.patient.oneLiner)}</p><p class="muted">${esc(r.note)}</p>
    <details><summary>Say to the team</summary><ul>${s.prebrief.map(p=>`<li>${esc(p)}</li>`).join("")}</ul></details>
    <details><summary>Confederate scripts</summary><ul>${r.injects.filter(i=>i.kind==="confederate").map(i=>`<li><b>${esc(i.label)}</b> — ${esc(i.text)}</li>`).join("")||"<li>None in this scenario.</li>"}</ul></details>
    <details><summary>Expected actions and targets</summary><ul>${r.actions.map(a=>`<li>${esc(a.label)} <span class="muted">· ${esc(a.cat)}${a.target!=null?` · ${a.target} min${a.from?` after ${esc(r.states[a.from]?.name||a.from)}`:""}`:""}</span></li>`).join("")}</ul></details>
    <details><summary>Teaching points / debrief questions</summary><ul>${[...new Set([...r.actions.flatMap(a=>a.prompts||[]),...(s.debrief||[])])].map(p=>`<li>${esc(p)}</li>`).join("")}</ul></details>
    <details><summary>History and equipment</summary><ul>${s.patient.history.map(h=>`<li>${esc(h)}</li>`).join("")}${s.equipment.map(h=>`<li>${esc(h)}</li>`).join("")}</ul></details>
  </div>`;
}
function sentHTML(r,sent){
  const q=(run.queue||[]).map(x=>{const i=r.injects.find(y=>y.id===x.id);return `<li class="queued"><time>${fmt(x.dueAt)}</time><span>${esc(i?.label||x.id)} <em>queued</em></span><button class="sm-link" data-cancel="${x.qid}">Cancel</button></li>`;}).join("");
  const s=[...sent].reverse().map(e=>{const d=run.delivery?.[e.seq]||"delivered";return `<li><time>${fmt(e.at)}</time><span>${esc(e.label||e.text)} <small>${FOR[e.for]||""}</small> <em class="${d}">${d}</em></span>${d==="delivered"&&["confederate","learner"].includes(e.for)?`<button class="sm-link" data-ack="${e.seq}">Mark acknowledged</button>`:""}</li>`;}).join("");
  return q||s?`<ul class="mini-log">${q}${s}</ul>`:`<p class="muted small">Nothing sent yet. Use Inject in the dock.</p>`;
}
function logHTML(r){
  return `<ul class="mini-log">${[...run.log].reverse().slice(0,40).map(e=>`<li class="${e.undone?"undone":""}"><time>${fmt(e.at)}</time><span>${esc(logText(e,r))}</span></li>`).join("")}</ul>`;
}
function logText(e,r){
  const lbl=id=>r.actions.find(a=>a.id===id)?.label||id;
  if(e.kind==="state")return `→ ${r.states[e.to]?.name||e.to}`;
  if(e.kind==="obs")return e.status?`${e.status==="observed"?"Recorded":e.status==="missed"?"Missed":"Not applicable"}: ${lbl(e.action)}`:`Cleared: ${lbl(e.action)}`;
  if(e.kind==="obsdetail")return `${lbl(e.action)}${e.quality?` · ${e.quality}`:""}${e.comment?` · “${e.comment}”`:""}`;
  if(e.kind==="prompt")return e.text;
  if(e.kind==="schedule")return `Queued ${r.injects.find(i=>i.id===e.id)?.label||e.id} for ${fmt(e.dueAt)}`;
  return e.text;
}
function stoppedHTML(){
  return `<div class="sm-stopped" role="alertdialog" aria-labelledby="stopT"><div>
    <p class="sm-eyebrow">SIMULATION STOPPED</p><h1 id="stopT">Real emergency</h1><p>The scenario clock is paused and the log is kept.</p>
    <a class="sm-btn danger big" href="./">Open Clinical Assist</a>
    <button class="sm-btn big" data-a="unstop">Resume simulation</button><button class="sm-btn ghost" data-a="end">End and debrief</button></div></div>`;
}

// ---------- bottom sheets ----------
function renderSheet(){
  $("#smSheet")?.remove();
  if(!ui.sheet||!run)return;
  const host=document.createElement("div");host.id="smSheet";
  host.innerHTML=`<div class="sm-sheet-bg" data-a="close-sheet"></div><div class="sm-sheet" role="dialog" aria-modal="true" aria-label="${esc(ui.sheet.title||"")}"><button class="sheet-x" data-a="close-sheet" aria-label="Close">×</button>${sheetBody()}</div>`;
  document.body.appendChild(host);
}
function openSheet(kind,extra={}){ui.sheet={kind,...extra};renderSheet();}
function closeSheet(){ui.sheet=null;renderSheet();}
function sheetBody(){
  const k=ui.sheet.kind,r=res();
  if(k==="inject"){
    const st=r.states[run.state],suggested=(st.injects||[]).map(id=>r.injects.find(i=>i.id===id)).filter(Boolean);
    const rest=r.injects.filter(i=>!suggested.includes(i));
    const row=i=>{const n=run.log.filter(e=>!e.undone&&e.kind==="inject"&&e.id===i.id).length,op=ui.sheet.script===i.id;return `<div class="ij">
      <div class="ij-main"><strong>${esc(i.label)}${n?` <em>✓${n>1?`×${n}`:""}</em>`:""}</strong><span class="ij-meta">${KIND[i.kind]} · to ${FOR[i.for]}${i.to?" · changes patient":""}${i.qbl?` · +${i.qbl} mL`:""}</span>
        <button class="sm-link" data-script="${i.id}" aria-expanded="${op}">${op?"Hide script":"Script"}</button>${op?`<p class="ij-text">${esc(i.text)}</p>`:""}</div>
      <div class="ij-go"><button class="sm-btn primary" data-inject="${i.id}">Now</button><select data-later="${i.id}" aria-label="Send ${esc(i.label)} later"><option value="">Later…</option><option value="1">in 1 min</option><option value="2">in 2 min</option><option value="5">in 5 min</option></select></div></div>`;};
    const cats=[...new Set(rest.map(i=>i.kind))];
    const openCat=ui.sheet.cat;
    return `<h2>Inject</h2>
      ${suggested.length?`<p class="sm-eyebrow">SUGGESTED NOW · ${esc(st.name.toUpperCase())}</p>${suggested.map(row).join("")}`:""}
      ${cats.map(c=>{const list=rest.filter(i=>i.kind===c),o=openCat===c;return `<div class="ds${o?" open":""}"><div class="ds-h"><button class="ds-t" data-cat="${c}" aria-expanded="${o}"><i class="chev"></i><span>${KIND[c]}</span><b>${list.length}</b></button></div>${o?`<div class="ds-b">${list.map(row).join("")}</div>`:""}</div>`;}).join("")}
      <div class="ds${openCat==="custom"?" open":""}"><div class="ds-h"><button class="ds-t" data-cat="custom" aria-expanded="${openCat==="custom"}"><i class="chev"></i><span>Custom event</span></button></div>${openCat==="custom"?`<div class="ds-b custom">
        <input id="cuTitle" placeholder="Title (e.g. Pharmacy call)" autocomplete="off"><textarea id="cuText" rows="2" placeholder="What is said or shown (no identifiers)"></textarea>
        <label>To <select id="cuFor">${Object.entries(FOR).map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select></label>
        <button class="sm-btn primary" data-a="send-custom">Send now</button></div>`:""}</div>`;
  }
  if(k==="obs"){
    const a=r.actions.find(x=>x.id===ui.sheet.id),o=run.obs[a.id]||{};
    return `<h2>${esc(a.label)}</h2><p class="muted">${esc(a.cat)}${a.target!=null?` · target ${a.target} min${a.from?` after ${esc(r.states[a.from]?.name||a.from)}`:""} (teaching reference, not a clinical deadline)`:""}</p>
      <div class="seg">${[["observed","Done"],["partial","Partially done"],["missed","Not performed"],["na","Not applicable"],["","Clear"]].map(([v,l])=>`<button class="sm-btn${(o.status||"")===v&&v?" primary":""}" data-obs-set="${v}" data-id="${a.id}">${l}</button>`).join("")}</div>
      <p class="sm-eyebrow">QUALITY</p><div class="seg">${QUALITY.map(q=>`<button class="sm-chip${o.quality===q?" on":""}" data-quality="${q}" data-id="${a.id}">${q}</button>`).join("")}</div>
      <div class="sm-note-row"><input id="obsComment" value="${esc(o.comment||"")}" placeholder="Comment (no names)" autocomplete="off"><button class="sm-btn" data-a="save-comment" data-id="${a.id}">Save</button></div>
      ${(a.prompts||[]).length?`<details><summary>Debrief questions</summary><ul>${a.prompts.map(p=>`<li>${esc(p)}</li>`).join("")}</ul></details>`:""}`;
  }
  if(k==="patient"){
    const st=r.states[run.state],v=S.vitalsAt(run,r,now());
    return `<h2>${esc(st.name)}</h2><p>${esc(st.text)}</p>${st.findings?`<p class="muted">${esc(st.findings)}</p>`:""}
      ${run.shown.length?`<p class="sm-eyebrow">ON MONITOR</p><ul>${[...run.shown].reverse().map(x=>`<li><time>${fmt(x.at)}</time> ${esc(x.text)}</li>`).join("")}</ul>`:""}
      <p class="sm-eyebrow">BLEEDING / TRENDS</p><p class="muted">${st.qblRate?`${st.qblRate} mL/min in this state`:"No ongoing bleeding in this state"} · vitals move toward this state's values over about a minute.</p>
      <div class="sm-pre-actions"><button class="sm-btn" data-a="vitals">Set vitals…</button></div>`;
  }
  if(k==="vitals"){
    const v=S.vitalsAt(run,r,now()),keys=r.monitor;
    const f=(k,l,val)=>`<label><span>${l}</span><input type="${k==="rhythm"?"text":"number"}" inputmode="${k==="rhythm"?"text":"numeric"}" data-vk="${k}" value="${val??""}"></label>`;
    return `<h2>Set vitals</h2><p class="muted">Held at these values until the next state.</p><div class="sm-vgrid">
      ${keys.includes("BP")?f("sbp","Systolic",v.sbp)+f("dbp","Diastolic",v.dbp):""}${keys.includes("HR")?f("hr","HR",v.hr):""}${keys.includes("SpO2")?f("spo2","SpO₂",v.spo2):""}${keys.includes("RR")?f("rr","RR",v.rr):""}${keys.includes("FHR")?f("fhr","FHR",v.fhr):""}${keys.includes("Rhythm")?f("rhythm","Rhythm",v.rhythm):""}${keys.includes("QBL")?f("qblRate","Bleeding mL/min",""):""}
      </div><div class="sm-pre-actions"><button class="sm-btn ghost" data-a="close-sheet">Cancel</button><button class="sm-btn primary" data-a="set-vitals">Set</button></div>`;
  }
  if(k==="leave")return `<h2>Leave the scenario?</h2><p class="muted">Nothing is lost — the log and clock are saved on this device.</p>
    <div class="leave-opts"><button class="sm-btn primary big" data-a="close-sheet">Resume scenario</button><button class="sm-btn big" data-a="pause-leave">Pause and leave</button><button class="sm-btn ghost big" data-a="ask-end">End and debrief</button></div>`;
  if(k==="monitor"){const m=monitorStatus();return `<h2>Learner monitor</h2><p class="muted">Shows vitals and the clock only — no prompts, actions or branches. The scenario runs fine without it.</p>
    <div class="mon-opts"><button class="sm-btn big" data-a="monitor-view">On this device<small>Full-screen view; tap to return</small></button>${window.__GAS?"":`<button class="sm-btn big" data-a="monitor">Separate window<small>Drag to a second screen or TV</small></button>`}</div>
    <p class="muted small">Status: ${m.on?"a monitor window is connected":"no separate monitor connected"}.</p>`;}
  if(k==="time")return `<h2>Advance time</h2><p class="muted">Simulation time only. Every event keeps its simulation and wall-clock time.</p><div class="seg">${[2,3,10,15].map(m=>`<button class="sm-btn" data-a="adv" data-m="${m}">+${m} min</button>`).join("")}</div>`;
  if(k==="end")return `<h2>End the scenario?</h2><p class="muted">The clock stops and the debrief opens. The log is kept.</p><div class="sm-pre-actions"><button class="sm-btn ghost" data-a="close-sheet">Keep running</button><button class="sm-btn primary big" data-a="end">End and debrief</button></div>`;
  if(k==="discard")return `<h2>Discard this scenario?</h2><p class="muted">Its log and observations are deleted from this device.</p><div class="sm-pre-actions"><button class="sm-btn ghost" data-a="close-sheet">Keep</button><button class="sm-btn danger" data-a="discard">Discard</button></div>`;
  if(k==="new")return `<h2>Start a new scenario?</h2><p class="muted">Export first if you need this debrief — it is replaced on this device.</p><div class="sm-pre-actions"><button class="sm-btn ghost" data-a="close-sheet">Cancel</button><button class="sm-btn primary" data-a="new">New scenario</button></div>`;
  return "";
}

// ---------- debrief ----------
function renderDebrief(){
  const s=scn(),d=S.debrief(run,s);
  const statusSel=a=>`<select data-confirm="${a.id}" class="st-${a.status.replace(" ","-")}" aria-label="Status for ${esc(a.label)}">${Object.entries(S.STATUS).map(([k,l])=>`<option value="${k}"${k===a.status?" selected":""}>${l}</option>`).join("")}</select>`;
  const li=a=>`<li>${esc(a.label)}${a.fromTrigger!=null?` <span class="muted">· ${fmt(a.fromTrigger)}${a.from?` after ${esc(res().states[a.from]?.name||a.from)}`:""}${a.target!=null?` (target ${a.target} min)`:""}</span>`:""}</li>`;
  sm.innerHTML=`<section class="sm-debrief">
    <header class="sm-pre-head">${icon(s.emergency,56)}<div><p class="sm-eyebrow">SIMULATION DEBRIEF · ${LEVEL_LABEL[run.level].toUpperCase()} · v${esc(run.scenarioVersion||s.version)}</p><h1>${esc(s.title)}</h1><p>${fmt(d.elapsed)} simulation time · ${new Date(run.createdAt).toLocaleDateString()}</p></div></header>
    <div class="sm-counts">${["observed","late","partial","missed","na","not documented"].map(k=>`<span class="c-${k.replace(" ","-")}"><b>${d.counts[k]||0}</b>${S.STATUS[k]}</span>`).join("")}</div>
    <div class="db-grid">
      <article class="sm-panel"><h2>Strengths</h2>${d.strengths.length?`<ul>${d.strengths.map(li).join("")}</ul>`:`<p class="muted">None recorded on time.</p>`}</article>
      <article class="sm-panel"><h2>Opportunities</h2>${d.opportunities.length?`<ul>${d.opportunities.map(a=>`<li>${esc(a.label)} <span class="muted">· ${a.status==="late"?`${fmt(a.fromTrigger)} — after target ${a.target} min`:"missed"}</span></li>`).join("")}</ul>`:`<p class="muted">No late or missed actions recorded.</p>`}
        ${d.undocumented.length?`<p class="sm-eyebrow" style="margin-top:10px">NOT DOCUMENTED — CONFIRM</p><ul>${d.undocumented.map(a=>`<li>${esc(a.label)} ${statusSel(a)}</li>`).join("")}</ul>`:""}</article>
      <article class="sm-panel"><h2>Critical timeline</h2><ol class="sm-tl">${d.keyTimeline.map(e=>`<li class="k-${e.kind}"><time>${fmt(e.at)}</time><span>${esc(e.text)}</span></li>`).join("")||"<li>No patient changes or critical actions recorded.</li>"}</ol></article>
      <article class="sm-panel"><h2>Discussion prompts</h2><ol>${d.suggested.map(p=>`<li>${esc(p)}</li>`).join("")}</ol></article>
      <article class="sm-panel span2"><h2>Instructor summary</h2><div class="sum-grid">
        <label>Strengths<textarea data-sum="strengths" rows="3" placeholder="${esc(d.strengths.slice(0,2).map(a=>a.label).join("; "))}">${esc(run.summary?.strengths||"")}</textarea></label>
        <label>Opportunities for improvement<textarea data-sum="opportunities" rows="3" placeholder="${esc(d.opportunities.slice(0,2).map(a=>a.label).join("; "))}">${esc(run.summary?.opportunities||"")}</textarea></label>
        <label>Teaching points<textarea data-sum="teaching" rows="3">${esc(run.summary?.teaching||"")}</textarea></label></div></article>
    </div>
    <div class="sm-stack">
      ${sec("db-actions","All actions — status, timing, quality",d.actions.length,`<table class="sm-table"><thead><tr><th>Action</th><th>Category</th><th>Time from trigger</th><th>Target</th><th>Status</th></tr></thead><tbody>
        ${d.actions.map(a=>`<tr class="${a.critical?"crit":""}"><td>${esc(a.label)}${a.quality?` <span class="muted">· ${esc(a.quality)}</span>`:""}${a.comment?`<br><small class="muted">${esc(a.comment)}</small>`:""}</td><td>${esc(a.cat)}</td><td>${a.fromTrigger!=null?fmt(a.fromTrigger):"—"}</td><td>${a.target!=null?`${a.target} min`:"—"}</td><td>${statusSel(a)}</td></tr>`).join("")}</tbody></table>`)}
      ${sec("db-team","Team performance",d.team.length+d.notes.length,`<ul>${d.team.map(a=>`<li>${esc(a.label)} — <b>${S.STATUS[a.status]}</b></li>`).join("")}${d.notes.map(n=>`<li><time>${fmt(n.at)}</time> ${esc(n.text)}</li>`).join("")}</ul>`)}
      ${sec("db-more","More discussion questions",Math.max(0,d.prompts.length-3),`<ul>${d.prompts.slice(3).map(p=>`<li>${esc(p)}</li>`).join("")}</ul>`)}
      ${sec("db-log","Full event log",d.timeline.length,`<table class="sm-table"><thead><tr><th>Sim time</th><th>Wall clock</th><th>Event</th></tr></thead><tbody>${d.timeline.map(e=>`<tr><td>${fmt(e.at)}</td><td>${e.wallAt?new Date(e.wallAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"}):""}</td><td>${esc(e.text)}</td></tr>`).join("")}</tbody></table>`)}
    </div>
    <div class="sm-pre-actions noprint"><button class="sm-btn" data-a="copy">Copy summary</button><button class="sm-btn" data-a="csv">CSV</button><button class="sm-btn" data-a="json">JSON</button><button class="sm-btn" data-a="print">Print / save PDF</button><button class="sm-btn primary" data-a="ask-new">New scenario</button></div>
    <p class="muted small">Observations are the facilitator's record, not a competency grade. “Not documented” never means “not performed”. Exports contain no names.</p>
  </section>`;
}
function summaryText(){
  const s=scn(),d=S.debrief(run,s);
  return [`${s.title} — ${LEVEL_LABEL[run.level]} — ${fmt(d.elapsed)} simulation time (v${run.scenarioVersion||s.version})`,"",
    "Strengths:",...d.strengths.map(a=>`  • ${a.label}`),"","Opportunities:",...d.opportunities.map(a=>`  • ${a.label} (${S.STATUS[a.status]})`),"",
    "Critical timeline:",...d.keyTimeline.map(e=>`  ${fmt(e.at)}  ${e.text}`),"","Discussion prompts:",...d.suggested.map(p=>`  • ${p}`),
    ...(run.summary?.strengths||run.summary?.opportunities||run.summary?.teaching?["","Instructor summary:",run.summary.strengths&&`  Strengths: ${run.summary.strengths}`,run.summary.opportunities&&`  Opportunities: ${run.summary.opportunities}`,run.summary.teaching&&`  Teaching points: ${run.summary.teaching}`].filter(Boolean):[])].join("\n");
}
function download(name,text,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove();}

// ---------- live updates ----------
function liveUpdate(){
  if(!run||ui.phase!=="run")return;
  const r=res(),t=now();
  if((run.queue||[]).some(q=>q.dueAt<=t)){const fired=S.processDue(run,r,t);save();fired.forEach(q=>toast(`Sent: ${r.injects.find(i=>i.id===q.id)?.label}`));safeRender();return;}
  const v=S.vitalsAt(run,r,t);
  const c=$("#simClock");if(c)c.textContent=fmt(t);
  for(const m of metrics(scn(),r,t)){const el=$(`[data-live-metric="${m.k}"]`);if(el&&el.textContent!==m.val){el.textContent=m.val;el.parentElement.className=`vs metric ${m.cls||""}`;}}
  const ec=S.eventClock(run,r,t,r.start),e=$("#evClock");if(e&&ec)e.textContent=fmt(ec.ms);
  for(const k of r.monitor){const el=$(`[data-live="${k}"]`);if(!el)continue;el.textContent={BP:v.sbp?`${v.sbp}/${v.dbp}`:"—",HR:v.hr||"—",SpO2:v.spo2?`${v.spo2}%`:"—",RR:v.rr||"—",QBL:v.qbl.toLocaleString(),FHR:v.fhr||"—",Rhythm:v.rhythm||"—"}[k];
    const tr={BP:v.trend.sbp,HR:v.trend.hr,SpO2:v.trend.spo2,RR:v.trend.rr,FHR:v.trend.fhr}[k],ti=$(`[data-live-trend="${k}"]`);if(ti)ti.textContent=tr>0?"▲":tr<0?"▼":"";}
  if(JSON.stringify(S.suggestion(run,r,t))!==lastSuggest||S.prompts(run,r,t).map(x=>x.id).join()!==lastPrompts)safeRender();
}
// Re-render without disturbing what the instructor is doing (typing, an open sheet).
function safeRender(){if(document.activeElement?.matches("input,select,textarea")||ui.sheet&&ui.sheet.kind!=="inject")return;const y=window.scrollY;render();window.scrollTo(0,y);}
function startTick(){clearInterval(tick);let n=0;tick=setInterval(()=>{liveUpdate();if(++n%4===0)broadcast();},250);}

// ---------- actions ----------
function act(fn,msg){fn();save();const y=window.scrollY;render();window.scrollTo(0,y);if(msg)toast(msg);}
document.addEventListener("click",e=>{
  const b=e.target.closest("button,[data-a]");if(!b)return;
  const a=b.dataset.a;
  if(b.dataset.level){ui.pick[b.dataset.sid]=b.dataset.level;saveUI();renderLibrary();return;}
  if(b.dataset.toggle){toggle(b.dataset.toggle);return;}
  if(b.dataset.pin){pin(b.dataset.pin);return;}
  if(a==="prebrief"){const s=getSimScenario(b.dataset.sid);run=S.createRun(s,ui.pick[s.id]||"basic");ui.phase="prebrief";ui.open=null;save();saveUI();render();return;}
  if(a==="library"){ui.phase="library";saveUI();render();return;}
  if(b.dataset.prep){const id=b.dataset.prep;ui.prep=(ui.prep??"brief")===id?"":id;const pr=run.prep;if(pr&&!pr.seen.includes(id))pr.seen.push(id);save();saveUI();render();return;}
  if(b.dataset.role!=null&&run?.prep){const i=+b.dataset.role,l=run.prep.roles;l.includes(i)?l.splice(l.indexOf(i),1):l.push(i);save();render();return;}
  if(b.dataset.ready!=null&&run?.prep){const i=+b.dataset.ready,l=run.prep.ready;l.includes(i)?l.splice(l.indexOf(i),1):l.push(i);save();render();return;}
  if(a==="monitor-setup"){openSheet("monitor");return;}
  if(a==="ask-leave"){openSheet("leave");return;}
  if(a==="pause-leave"){S.pause(run);save();ui.sheet=null;ui.phase="library";saveUI();render();window.scrollTo(0,0);toast("Paused — resume from the scenario list");return;}
  if(a==="reload"){save();location.reload();return;}
  if(b.dataset.prompt){const id=b.dataset.prompt,st=b.dataset.pst;act(()=>S.markPrompt(run,res(),id,st,now()),st==="delivered"?"Logged as said":"Skipped");return;}
  if(a==="info"){e.preventDefault();ui.info=!ui.info;saveUI();const y=window.scrollY;render();window.scrollTo(0,y);return;}
  if(a==="monitor-view"){ui.sheet=null;renderSheet();showMonitorView();return;}
  if(a==="resume-run"){ui.phase=run.phase==="prebrief"?"prebrief":run.phase==="debrief"?"debrief":"run";saveUI();render();return;}
  if(a==="ask-discard"){openSheet("discard",{title:"Discard"});return;}
  if(a==="discard"){run=null;ui.sheet=null;save();render();return;}
  if(a==="monitor"){openMonitor();return;}
  if(a==="close-sheet"){closeSheet();return;}
  if(a==="start"){S.startRun(run);ui.phase="run";ui.open=null;save();saveUI();render();window.scrollTo(0,0);return;}
  if(!run)return;
  const t=now();
  if(a==="pause")act(()=>run.clock.running?S.pause(run):S.resume(run));
  if(a==="adv"){const m=Number(b.dataset.m);ui.sheet=null;act(()=>{S.advance(run,m*60000);S.processDue(run,res(),now());},`+${m} min`);}
  if(a==="advanced-time")openSheet("time",{title:"Advance time"});
  if(a==="stop")act(()=>S.stopForEmergency(run));
  if(a==="unstop")act(()=>S.resumeAfterStop(run));
  if(a==="undo"){const u=S.undo(run);save();act(()=>{},u?`Undone: ${u.kind==="state"?"state change":u.text}`:"Nothing to undo");}
  if(a==="ask-end")openSheet("end",{title:"End scenario"});
  if(a==="end"){ui.sheet=null;S.endRun(run);ui.phase="debrief";ui.open=null;save();saveUI();render();window.scrollTo(0,0);}
  if(a==="inject")openSheet("inject",{title:"Inject"});
  if(a==="patient")openSheet("patient",{title:"Patient"});
  if(a==="vitals")openSheet("vitals",{title:"Set vitals"});
  if(b.dataset.next){const k=b.dataset.next;ui.sheet=null;if(k==="same")act(()=>S.setHold(run,res(),!run.hold,t),run.hold?"Hold released":"Holding");else act(()=>S.goTo(run,res(),b.dataset.to,t,b.dataset.label),b.dataset.label);}
  if(b.dataset.inject){const i=res().injects.find(x=>x.id===b.dataset.inject);ui.sheet=null;act(()=>S.inject(run,res(),i.id,t),`${i.label} · to ${FOR[i.for]}`);}
  if(b.dataset.script){ui.sheet.script=ui.sheet.script===b.dataset.script?null:b.dataset.script;renderSheet();}
  if(b.dataset.cat){ui.sheet.cat=ui.sheet.cat===b.dataset.cat?null:b.dataset.cat;renderSheet();}
  if(a==="send-custom"){const title=$("#cuTitle")?.value.trim(),text=$("#cuText")?.value.trim(),rec=$("#cuFor")?.value;if(!title){toast("Add a title");return;}ui.sheet=null;act(()=>S.injectCustom(run,{title,text,recipient:rec},t),`${title} · to ${FOR[rec]}`);}
  if(b.dataset.cancel)act(()=>S.cancelScheduled(run,b.dataset.cancel,t),"Cancelled");
  if(b.dataset.ack)act(()=>S.acknowledge(run,Number(b.dataset.ack),t),"Acknowledged");
  if(b.dataset.obs){const id=b.dataset.obs,cur=run.obs[id]?.status;act(()=>S.observe(run,id,cur==="observed"?null:"observed",t));}
  if(b.dataset.obsMore)openSheet("obs",{id:b.dataset.obsMore,title:"Observation"});
  if(b.dataset.obsSet!=null){const id=b.dataset.id;act(()=>S.observe(run,id,b.dataset.obsSet||null,t));closeSheet();}
  if(b.dataset.quality){const id=b.dataset.id,q=run.obs[id]?.quality===b.dataset.quality?null:b.dataset.quality;S.observeDetail(run,id,{quality:q},t);save();renderSheet();render();}
  if(a==="save-comment"){S.observeDetail(run,b.dataset.id,{comment:$("#obsComment")?.value.trim()||""},t);save();closeSheet();render();toast("Saved");}
  if(b.dataset.note)act(()=>S.note(run,b.dataset.note,t),"Noted");
  if(a==="note"){const i=$("#smNote");if(i?.value.trim())act(()=>S.note(run,i.value.trim(),t),"Noted");}
  if(a==="set-vitals"){const vals={};$$("[data-vk]").forEach(i=>{if(i.value!=="")vals[i.dataset.vk]=i.value;});ui.sheet=null;act(()=>S.override(run,res(),vals,t),"Vitals set");}
  if(a==="copy")navigator.clipboard?.writeText(summaryText()).then(()=>toast("Summary copied"),()=>toast("Copy failed"));
  if(a==="csv")download(`sim-debrief-${run.scenarioId}.csv`,S.exportCSV(run,scn()),"text/csv");
  if(a==="json")download(`sim-debrief-${run.scenarioId}.json`,S.exportJSON(run,scn()),"application/json");
  if(a==="print"){ui.printAll=true;render();setTimeout(()=>{window.print();ui.printAll=false;render();},50);}
  if(a==="ask-new")openSheet("new",{title:"New scenario"});
  if(a==="new"){run=null;ui.sheet=null;ui.phase="library";save();saveUI();render();}
});
// Long-press an observation for the other statuses (partial, not performed, N/A); a tap records "done".
let lpT=null,lpFired=false;
document.addEventListener("pointerdown",e=>{const b=e.target.closest("[data-obs]");if(!b)return;lpFired=false;clearTimeout(lpT);lpT=setTimeout(()=>{lpFired=true;openSheet("obs",{id:b.dataset.obs,title:"Observation"});},550);});
["pointerup","pointercancel","pointerleave"].forEach(k=>document.addEventListener(k,()=>clearTimeout(lpT)));
document.addEventListener("click",e=>{if(lpFired&&e.target.closest("[data-obs]")){e.stopImmediatePropagation();e.preventDefault();lpFired=false;}},true);
document.addEventListener("contextmenu",e=>{if(e.target.closest("[data-obs]"))e.preventDefault();});
document.addEventListener("change",e=>{
  if(!run)return;
  if(e.target.dataset.a==="jump"&&e.target.value){const to=e.target.value;act(()=>S.goTo(run,res(),to,now(),`Jump to ${res().states[to].name}`),"State changed");}
  if(e.target.dataset.later&&e.target.value){const id=e.target.dataset.later,m=Number(e.target.value),i=res().injects.find(x=>x.id===id);ui.sheet=null;act(()=>S.schedule(run,res(),id,now()+m*60000,now()),`${i.label} queued for ${m} min`);}
  if(e.target.dataset.confirm){run.confirm[e.target.dataset.confirm]=e.target.value;save();const y=window.scrollY;renderDebrief();window.scrollTo(0,y);}
});
document.addEventListener("input",e=>{if(!run)return;if(e.target.dataset.sum){run.summary={...(run.summary||{}),[e.target.dataset.sum]:e.target.value};save();}});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&ui.sheet){closeSheet();return;}
  if(ui.phase!=="run"||e.target.matches?.("input,textarea,select")||e.metaKey||e.ctrlKey||ui.sheet)return;
  if(e.key===" "){e.preventDefault();act(()=>run.clock.running?S.pause(run):S.resume(run));}
  if(e.key.toLowerCase()==="u")$('[data-a="undo"]')?.click();
  if(e.key.toLowerCase()==="i")openSheet("inject",{title:"Inject"});
  const n=Number(e.key);if(n>=1&&n<=3)$$(".mv")[n-1]?.click();
});
$("#smText")?.addEventListener("click",()=>{const on=!document.documentElement.classList.contains("text-lg");document.documentElement.classList.toggle("text-lg",on);$("#smText").setAttribute("aria-pressed",String(on));try{const k="ob-emergency-assist.settings.v1",s=JSON.parse(localStorage.getItem(k)||"{}");s.largeText=on;localStorage.setItem(k,JSON.stringify(s));}catch{}});
// Phone back button: close the sheet, then step back a screen. During a running scenario it never leaves.
installBackGuard(()=>{
  if(ui.sheet){closeSheet();return true;}
  if(ui.phase==="run"){openSheet("leave");return true;}
  if(ui.phase==="prebrief"||ui.phase==="debrief"){ui.phase="library";saveUI();render();window.scrollTo(0,0);return true;}
  return false;
});
document.querySelector(".sm-brand")?.addEventListener("click",e=>{if(ui.phase==="run"&&run?.clock.running){e.preventDefault();openSheet("leave");}});
watchForUpdate(v=>{updateReady=v;if(ui.phase!=="run")render();});
window.addEventListener("beforeunload",save);
// Auto-pause when the facilitator leaves the app (screen off, switched apps/tabs) for over a minute.
function away(){if(run){S.markAway(run);save();}}
function back(){if(!run)return;const r=S.returnFromAway(run);save();if(r){render();toast(`Auto-paused — you were away ${Math.round(r.awayMs/60000)} min. Tap Pause to resume.`);}}
document.addEventListener("visibilitychange",()=>document.hidden?away():back());
window.addEventListener("pagehide",away);
if(run?.clock?.hiddenAt!=null)back();

render();startTick();
