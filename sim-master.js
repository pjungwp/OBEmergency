import {SCENARIOS,FOCUS_AREAS,SCENARIO_REVIEW_STATUS} from "./scenarios.js";
import {EMERGENCIES} from "./data.js";

// Sim Master: facilitator-only runner for scripted simulation scenarios.
// Runs on the facilitator's laptop. Team phones run the normal Simulation
// cockpit independently (no sync in this release).

const $=(s,r=document)=>r.querySelector(s);
const KEY="ob-sim-master.v1";
const sm=$("#sm");
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=ms=>{ms=Math.max(0,ms);const t=Math.floor(ms/1000),s=t%60,m=Math.floor(t/60);return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;};
const fmtMin=min=>min==null?"—":fmt(min*60000);
const VITAL_ORDER=["HR","BP","SpO2","RR","QBL","Fundus","Other"];
const VITAL_LABEL={HR:"HR",BP:"BP",SpO2:"SpO₂",RR:"RR",QBL:"QBL",Fundus:"Fundus",Other:"Other"};

let ui={phase:"library",focus:[],level:"",emergency:"pph"};
let run=load();
let tick=null,audio=null;

function load(){try{return JSON.parse(localStorage.getItem(KEY)||"null");}catch{return null;}}
function save(){try{run?localStorage.setItem(KEY,JSON.stringify(run)):localStorage.removeItem(KEY);}catch{}}
function scenario(){return SCENARIOS.find(s=>s.id===run?.scenarioId);}
function elapsed(){if(!run)return 0;return run.elapsedBase+(run.running?Date.now()-run.lastTickAt:0);}
function minute(){return elapsed()/60000;}

function newRun(id){
  const s=SCENARIOS.find(x=>x.id===id);
  return {scenarioId:id,phase:"brief",elapsedBase:0,running:false,started:false,lastTickAt:Date.now(),fired:{},checked:{},vitals:{...s.start},changed:{},shown:null,log:[],notes:"",roleNames:{},sound:true};
}

// ---------- rendering ----------
function render(){
  const phase=run?.phase||"library";
  document.body.dataset.phase=phase;
  if(phase==="library")renderLibrary();
  if(phase==="brief")renderBrief();
  if(phase==="run")renderRun();
  if(phase==="debrief")renderDebrief();
  renderTop();
}
function renderTop(){
  const r=$("#smTopRight");
  if(!run){r.innerHTML=`<span class="sm-review">${esc(SCENARIO_REVIEW_STATUS)}</span>`;return;}
  const s=scenario();
  r.innerHTML=`<span class="sm-scn">${esc(s.title)}</span>${run.phase==="run"?"":`<button class="sm-btn ghost" data-a="library">Scenario library</button>`}`;
}

function matchScore(s){return ui.focus.filter(f=>s.focus.includes(f)).length;}
function renderLibrary(){
  let list=SCENARIOS.filter(s=>s.emergency===ui.emergency&&(!ui.level||s.level===ui.level));
  const scored=list.map(s=>({s,score:matchScore(s)}));
  if(ui.focus.length)scored.sort((a,b)=>b.score-a.score);
  const best=ui.focus.length&&scored[0]?.score>0?scored[0].s.id:null;
  sm.innerHTML=`
  <section class="sm-hero">
    <h1>Choose a scenario</h1>
    <p>Mixed-team scenarios with timed events, facilitator prompts, an expected-actions checklist and debrief points. Pick what you want the team to practice and the best match is suggested.</p>
  </section>
  <section class="sm-filters">
    <div class="sm-filter-row"><span>Emergency</span>${Object.values(EMERGENCIES).map(e=>{const n=SCENARIOS.filter(s=>s.emergency===e.id).length;return `<button class="chip ${ui.emergency===e.id?"on":""}" data-emerg="${e.id}" ${n?"":"disabled"}>${esc(e.short)}${n?` (${n})`:" · coming"}</button>`;}).join("")}</div>
    <div class="sm-filter-row"><span>Practice focus</span>${FOCUS_AREAS.map(f=>`<button class="chip ${ui.focus.includes(f)?"on":""}" data-focus="${esc(f)}">${esc(f)}</button>`).join("")}</div>
    <div class="sm-filter-row"><span>Level</span>${["","Core","Intermediate","Advanced"].map(l=>`<button class="chip ${ui.level===l?"on":""}" data-level="${l}">${l||"Any"}</button>`).join("")}</div>
  </section>
  <section class="sm-grid">
    ${scored.length?scored.map(({s})=>`
      <article class="sm-card ${best===s.id?"best":""}">
        ${best===s.id?`<span class="sm-badge">Suggested</span>`:""}
        <div class="sm-card-meta"><span>${esc(s.level)}</span><span>${s.duration} min</span><span>${esc(s.audience)}</span></div>
        <h2>${esc(s.title)}</h2>
        <p>${esc(s.summary)}</p>
        <div class="sm-trap"><strong>Teaching trap</strong>${esc(s.trap)}</div>
        <div class="sm-tags">${s.focus.map(f=>`<span class="${ui.focus.includes(f)?"hit":""}">${esc(f)}</span>`).join("")}</div>
        <button class="sm-btn primary" data-pick="${s.id}">Open briefing</button>
      </article>`).join(""):`<p class="sm-empty">No scenarios match those filters yet.</p>`}
  </section>`;
}

function vitalsTable(v,changed={}){
  return `<dl class="sm-vitals">${VITAL_ORDER.filter(k=>v[k]).map(k=>`<div class="${changed[k]?"changed":""}"><dt>${VITAL_LABEL[k]}</dt><dd>${esc(v[k])}</dd></div>`).join("")}</dl>`;
}

function renderBrief(){
  const s=scenario();
  sm.innerHTML=`
  <section class="sm-brief">
    <div class="sm-col">
      <p class="sm-eyebrow">${esc(s.level)} · ${s.duration} min · ${esc(s.audience)}</p>
      <h1>${esc(s.title)}</h1>
      <div class="sm-panel"><h3>Patient</h3><p class="sm-big">${esc(s.patient.oneLiner)}</p><ul>${s.patient.history.map(h=>`<li>${esc(h)}</li>`).join("")}</ul><p class="sm-muted">Setting: ${esc(s.patient.setting)}</p></div>
      <div class="sm-panel"><h3>Starting vitals</h3>${vitalsTable(s.start)}</div>
      <div class="sm-panel trap"><h3>Teaching trap (facilitator only)</h3><p>${esc(s.trap)}</p></div>
      <div class="sm-panel"><h3>Learning objectives</h3><ol>${s.objectives.map(o=>`<li>${esc(o)}</li>`).join("")}</ol></div>
    </div>
    <div class="sm-col">
      <div class="sm-panel"><h3>Assign roles</h3><p class="sm-muted">Optional — names appear in the debrief.</p>
        <div class="sm-roles">${s.roles.map(r=>`<label><span>${esc(r)}</span><input data-role="${esc(r)}" value="${esc(run.roleNames[r]||"")}" placeholder="Name or initials" autocomplete="off"></label>`).join("")}</div>
      </div>
      <div class="sm-panel"><h3>Pre-brief script</h3><ol>${s.prebrief.map(p=>`<li>${esc(p)}</li>`).join("")}</ol></div>
      <div class="sm-panel"><h3>Equipment</h3><ul>${s.equipment.map(e=>`<li>${esc(e)}</li>`).join("")}</ul></div>
      <div class="sm-panel phones"><h3>Team phones</h3><p>Ask the team to open <strong>OB Emergency Assist → ${esc(EMERGENCIES[s.emergency].short)} → Start Simulation</strong> at the same moment you press Start. Phones and this laptop run separate clocks; use <em>Sim time</em> on the phones to match if you jump ahead here.</p></div>
      <div class="sm-start-row"><button class="sm-btn ghost" data-a="library">Back</button><button class="sm-btn primary big" data-a="start">Start scenario</button></div>
    </div>
  </section>`;
}

function upcoming(){
  const s=scenario();
  // Times of 0 are valid, so test for null rather than falsiness.
  const ev=s.events.filter(e=>run.fired[e.id]==null).map(e=>({...e,kind:"event",when:e.at}));
  const cond=s.conditional.filter(c=>run.fired[c.id]==null&&run.checked[c.ifNot]==null).map(c=>({...c,kind:"conditional",when:c.by}));
  return [...ev,...cond].sort((a,b)=>a.when-b.when);
}
function actionStatus(a){
  const at=run.checked[a.id];
  if(at!=null){if(a.target==null)return["done","Observed"];return at<=a.target+0.001?["done","On time"]:["late",`Late (+${fmt((at-a.target)*60000)})`];}
  if(a.target!=null&&minute()>a.target)return["overdue","Not yet — past target"];
  return["pending",""];
}

function renderRun(){
  const s=scenario();
  run.log.sort((a,b)=>b.at-a.at); // newest first; stable for same-time entries
  const fired=run.log.filter(l=>l.kind==="event"||l.kind==="conditional");
  const latest=fired[0];
  sm.innerHTML=`
  <section class="sm-runbar">
    <div class="sm-clock"><strong id="smClock">${fmt(elapsed())}</strong><small>${run.running?"elapsed":run.started?"paused":"ready"}</small></div>
    <div class="sm-runbtns">
      <button class="sm-btn ${run.running?"ghost":"primary"} big" data-a="toggle">${run.running?"Pause":run.started?"Resume":"Start clock"}</button>
      <button class="sm-btn ghost" data-adv="1">+1 min</button>
      <button class="sm-btn ghost" data-adv="5">+5 min</button>
      <button class="sm-btn ghost" data-a="next">Jump to next event</button>
      <button class="sm-btn ghost icon" data-a="sound" aria-label="Toggle sound">${run.sound?"🔊":"🔇"}</button>
      <button class="sm-btn danger" data-a="end">End &amp; debrief</button>
    </div>
  </section>
  <section class="sm-run">
    <div class="sm-col narrow">
      <div class="sm-panel"><h3>Current vitals <small>give when the team checks</small></h3>${vitalsTable(run.vitals,run.changed)}</div>
      ${run.shown?`<div class="sm-panel show"><h3>Reveal on request</h3><p class="sm-big">${esc(run.shown)}</p></div>`:""}
      <div class="sm-panel"><h3>If the team asks…</h3>${s.hints.map(h=>`<details><summary>${esc(h.q)}</summary><p>${esc(h.a)}</p></details>`).join("")}</div>
      <div class="sm-panel trap"><h3>Teaching trap</h3><p>${esc(s.trap)}</p></div>
    </div>
    <div class="sm-col">
      ${latest?`<div class="sm-now ${latest.kind}"><p class="sm-eyebrow">${latest.kind==="conditional"?"TRIGGERED":"NOW"} · ${fmt(latest.at*60000)}</p><h2>${esc(latest.title)}</h2><p class="sm-say">${esc(latest.say)}</p>${latest.confederate?`<span class="sm-conf">Confederate line</span>`:""}</div>`:`<div class="sm-now idle"><h2>${run.started?"Waiting for next event":"Press Start clock to begin"}</h2><p class="sm-say">${esc(s.events[0]?.say||"")}</p></div>`}
      <div class="sm-panel"><h3>Coming up</h3><div class="sm-queue">${upcoming().map(x=>`<article class="${x.kind}"><time>${fmtMin(x.when)}</time><div><strong>${esc(x.title)}</strong><small>${x.kind==="conditional"?`Only if not done: ${esc(s.actions.find(a=>a.id===x.ifNot)?.label||"")}`:esc(x.say)}</small></div><button class="sm-btn ghost small" data-fire="${x.id}">Fire now</button></article>`).join("")||`<p class="sm-muted">All scripted events have fired.</p>`}</div></div>
      <div class="sm-panel"><h3>Event log</h3><div class="sm-log">${run.log.map(l=>`<div><time>${fmt(l.at*60000)}</time><span class="${l.kind}">${esc(l.text)}</span></div>`).join("")||`<p class="sm-muted">Nothing yet.</p>`}</div></div>
    </div>
    <div class="sm-col">
      <div class="sm-panel"><h3>Expected actions <small>tap when you see it</small></h3>
        <div class="sm-actions">${s.actions.map(a=>{const[st,label]=actionStatus(a);return `<button class="sm-action ${st}${a.critical?" critical":""}" data-check="${a.id}" aria-pressed="${run.checked[a.id]!=null}"><span class="box" aria-hidden="true">${run.checked[a.id]!=null?"✓":""}</span><span class="txt"><strong>${esc(a.label)}</strong><small>${a.target!=null?`Target ${fmtMin(a.target)}`:"Throughout"}${run.checked[a.id]!=null?` · seen ${fmt(run.checked[a.id]*60000)}`:""}${label?` · ${label}`:""}</small></span></button>`;}).join("")}</div>
      </div>
      <div class="sm-panel"><h3>Facilitator notes</h3><textarea id="smNotes" rows="5" placeholder="Observations for the debrief (no patient identifiers)">${esc(run.notes)}</textarea></div>
    </div>
  </section>`;
}

function renderDebrief(){
  const s=scenario();
  const rows=s.actions.map(a=>{const at=run.checked[a.id];let st=at==null?"Not observed":a.target==null?"Observed":at<=a.target+0.001?"On time":"Late";return {a,at,st};});
  const triggered=s.conditional.filter(c=>run.fired[c.id]!=null);
  const averted=s.conditional.filter(c=>run.fired[c.id]==null);
  const roles=Object.entries(run.roleNames).filter(([,v])=>v);
  sm.innerHTML=`
  <section class="sm-debrief">
    <div class="sm-col">
      <p class="sm-eyebrow">DEBRIEF · ${fmt(elapsed())} total</p>
      <h1>${esc(s.title)}</h1>
      ${roles.length?`<p class="sm-muted">Team: ${roles.map(([r,n])=>`${esc(r)} — ${esc(n)}`).join(" · ")}</p>`:""}
      <div class="sm-panel"><h3>Expected actions</h3>
        <table class="sm-table"><thead><tr><th>Action</th><th>Target</th><th>Seen</th><th>Result</th></tr></thead><tbody>
        ${rows.map(({a,at,st})=>`<tr class="${st.replace(/\s/g,"-").toLowerCase()}${a.critical?" critical":""}"><td>${esc(a.label)}${a.critical?" <b>★</b>":""}</td><td>${fmtMin(a.target)}</td><td>${at==null?"—":fmt(at*60000)}</td><td>${st}</td></tr>`).join("")}
        </tbody></table><p class="sm-muted">★ critical action</p>
      </div>
      <div class="sm-panel"><h3>What the scenario did</h3>
        ${triggered.length?`<p><strong>Triggered by a missed or late action:</strong></p><ul>${triggered.map(c=>`<li>${esc(c.title)} at ${fmt(run.fired[c.id]*60000)}</li>`).join("")}</ul>`:""}
        ${averted.length?`<p><strong>Averted by the team:</strong></p><ul>${averted.map(c=>`<li>${esc(c.title)}</li>`).join("")}</ul>`:""}
      </div>
    </div>
    <div class="sm-col">
      <div class="sm-panel"><h3>Debrief questions</h3><ol>${s.debrief.map(d=>`<li>${esc(d)}</li>`).join("")}</ol></div>
      <div class="sm-panel"><h3>Team process (TeamSTEPPS)</h3><ul>
        <li>Brief: were roles clear in the first two minutes?</li>
        <li>Call-out and check-back: were orders repeated and confirmed?</li>
        <li>Situation monitoring: who tracked time and what had been given?</li>
        <li>Mutual support: did anyone use CUS or the two-challenge rule?</li>
      </ul></div>
      <div class="sm-panel"><h3>Plus / Delta</h3><textarea id="smNotes" rows="7" placeholder="What went well / what to change">${esc(run.notes)}</textarea></div>
      <div class="sm-start-row"><button class="sm-btn ghost" data-a="print">Print / save PDF</button><button class="sm-btn ghost" data-a="rerun">Run again</button><button class="sm-btn primary" data-a="finish">New scenario</button></div>
      <p class="sm-muted">Stored only in this browser. Not a learner assessment record.</p>
    </div>
  </section>`;
}

// ---------- engine ----------
function log(text,kind="note",extra={}){run.log.unshift({at:minute(),text,kind,...extra});}
function applyVitals(v){if(!v)return;run.changed={};Object.entries(v).forEach(([k,val])=>{run.vitals[k]=val;run.changed[k]=true;});}
function fire(item,kind,at=minute()){
  if(run.fired[item.id]!=null)return;
  run.fired[item.id]=at;
  applyVitals(item.vitals);
  if(item.show)run.shown=item.show;
  run.log.unshift({at,text:item.title,kind,title:item.title,say:item.say,confederate:!!item.confederate});
  beep();
}
function processTime(){
  const s=scenario(),now=minute();let changed=false;
  const due=[...s.events.filter(e=>e.at<=now&&run.fired[e.id]==null).map(e=>({e,kind:"event",t:e.at})),
             ...s.conditional.filter(c=>c.by<=now&&run.fired[c.id]==null&&run.checked[c.ifNot]==null).map(e=>({e,kind:"conditional",t:e.by}))].sort((a,b)=>a.t-b.t);
  due.forEach(({e,kind,t})=>{fire(e,kind,t);changed=true;});
  return changed;
}
function setRunning(on){
  if(on&&!run.running){run.running=true;run.started=true;run.lastTickAt=Date.now();if(!run.log.length)log("Scenario started","session");}
  else if(!on&&run.running){run.elapsedBase=elapsed();run.running=false;}
}
function advance(min){
  if(run.running){run.elapsedBase=elapsed();run.lastTickAt=Date.now();}
  run.started=true;run.elapsedBase+=min*60000;log(`Sim time +${Math.round(min*10)/10} min`,"time");processTime();
}
function nextWhen(){const u=upcoming().filter(x=>x.when>minute());return u[0]?.when;}
function startTick(){clearInterval(tick);tick=setInterval(()=>{if(!run||run.phase!=="run")return;const c=$("#smClock");if(c)c.textContent=fmt(elapsed());if(processTime()){save();render();}},500);}
function beep(){
  if(!run?.sound)return;
  try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();if(audio.state==="suspended")audio.resume();
    const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=660;g.gain.setValueAtTime(.0001,audio.currentTime);g.gain.exponentialRampToValueAtTime(.15,audio.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.25);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.26);}catch{}
}
function toast(msg){const t=document.createElement("div");t.textContent=msg;$("#smToast").replaceChildren(t);setTimeout(()=>t.remove(),2600);}

// ---------- events ----------
document.addEventListener("click",ev=>{
  const b=ev.target.closest("button");if(!b)return;
  if(b.dataset.emerg){ui.emergency=b.dataset.emerg;render();}
  if(b.dataset.focus){const f=b.dataset.focus;ui.focus=ui.focus.includes(f)?ui.focus.filter(x=>x!==f):[...ui.focus,f];render();}
  if(b.dataset.level!=null&&b.classList.contains("chip")&&!b.dataset.focus&&!b.dataset.emerg){ui.level=b.dataset.level;render();}
  if(b.dataset.pick){run=newRun(b.dataset.pick);save();render();scrollTo(0,0);}
  if(b.dataset.check&&run){const id=b.dataset.check;if(run.checked[id]!=null){delete run.checked[id];log(`Unchecked: ${scenario().actions.find(a=>a.id===id).label}`,"action");}else{run.checked[id]=minute();log(`Seen: ${scenario().actions.find(a=>a.id===id).label}`,"action");}save();render();}
  if(b.dataset.fire&&run){const s=scenario();const it=s.events.find(e=>e.id===b.dataset.fire)||s.conditional.find(c=>c.id===b.dataset.fire);if(it){fire(it,s.events.includes(it)?"event":"conditional");save();render();}}
  if(b.dataset.adv&&run){advance(Number(b.dataset.adv));save();render();}
  const a=b.dataset.a;if(!a)return;
  if(a==="library"){if(run?.phase==="run"&&!confirm("Leave this scenario? Its progress will be cleared."))return;run=null;save();render();}
  if(a==="start"){$$roles();run.phase="run";setRunning(true);processTime();save();render();startTick();}
  if(a==="toggle"){setRunning(!run.running);processTime();save();render();}
  if(a==="next"){const w=nextWhen();if(w==null){toast("No more scripted events");}else{advance(Math.max(0,w-minute()));save();render();}}
  if(a==="sound"){run.sound=!run.sound;save();render();}
  if(a==="end"){if(!confirm("End the scenario and open the debrief?"))return;setRunning(false);log("Scenario ended","session");run.phase="debrief";save();render();scrollTo(0,0);}
  if(a==="print")window.print();
  if(a==="rerun"){const id=run.scenarioId,names=run.roleNames;run=newRun(id);run.roleNames=names;save();render();}
  if(a==="finish"){if(!confirm("Clear this debrief and return to the library?"))return;run=null;save();render();}
});
function $$roles(){document.querySelectorAll("[data-role]").forEach(i=>{run.roleNames[i.dataset.role]=i.value.trim();});}
document.addEventListener("input",ev=>{
  if(ev.target.id==="smNotes"&&run){run.notes=ev.target.value;save();}
  if(ev.target.dataset.role&&run){run.roleNames[ev.target.dataset.role]=ev.target.value.trim();save();}
});
window.addEventListener("beforeunload",()=>{if(run?.running){run.elapsedBase=elapsed();run.lastTickAt=Date.now();save();}});

// Larger text shares the main app's setting.
const SETTINGS_KEY="ob-emergency-assist.settings.v1";
function textSetting(){try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}");}catch{return {};}}
function syncText(){const on=!!textSetting().largeText;document.documentElement.classList.toggle("text-lg",on);$("#smText").setAttribute("aria-pressed",String(on));}
$("#smText").addEventListener("click",()=>{const s=textSetting();s.largeText=!s.largeText;try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(s));}catch{}syncText();});
syncText();

// A running scenario keeps its clock across a page reload (elapsed is derived from wall time).
render();startTick();
