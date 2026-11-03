import {APP_VERSION,CONTENT_REVIEW_DATE,EMERGENCIES,MEDICATIONS,EDUCATION,REFERENCES,getMedication,getReference} from "./data.js";
import {createLocalSessionStore} from "./local-session-store.js";

const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>[...root.querySelectorAll(s)];
const main = $("#main");
const STORAGE_KEY = "ob-emergency-assist.session.v1";
const SETTINGS_KEY = "ob-emergency-assist.settings.v1";
const store = createLocalSessionStore({key:STORAGE_KEY});
const SHORT_TASKS = {
  "pph-help":"Call hemorrhage response.","pph-assess":"Check bleeding, tone + vitals.","pph-massage":"Massage uterus. Start bimanual compression.","pph-access":"Get IV access, labs + blood.","pph-oxytocin":"Give oxytocin. Add uterotonics.","pph-cause":"Check 4 Ts.","pph-txa":"Consider TXA now.","pph-escalate":"Escalate ongoing bleeding.",
  "htn-help":"Call OB. Activate severe-BP response.","htn-bp":"Repeat BP within 15 minutes.","htn-symptoms":"Check severe symptoms.","htn-labs":"Get preeclampsia labs.","htn-treat":"Give first-line BP medication.","htn-mag":"Start magnesium if indicated.","htn-monitor":"Recheck BP after every dose.","htn-escalate":"Escalate persistent severe BP.",
  "ec-help":"Call for help.","ec-safety":"Protect. Left lateral. Support airway.","ec-mag":"Give magnesium.","ec-vitals":"Check BP, oxygen + neurologic status.","ec-recur":"Treat persistent/recurrent seizure.","ec-tox":"Watch for magnesium toxicity.","ec-neuro":"Do neurologic exam. Consider head CT.","ec-delivery":"Plan delivery after stabilization."
};
const SHORT_SUMMARIES = {
  pph:"Bleeding · resuscitation · 4 Ts",
  hypertension:"Confirm · treat · reassess",
  eclampsia:"Protect · magnesium · airway"
};

let route = "emergency";
let selectedEmergency = null;
let flowEmergency = "pph";
let session = hydrateSession(store.loadSession());
let clockHandle = null;
let audioContext = null;
let settings = loadSettings();
let suppressStoreNotification = false;

function loadSettings(){
  try{return {...{noticeDismissed:false,sound:true},...JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}")};}catch{return {noticeDismissed:false,sound:true};}
}
function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}
function hydrateSession(s){
  if(!s) return null;
  if(s.status==="active" && s.mode==="clinical" && s.running) s.elapsedBase += Math.max(0,Date.now()-s.lastSavedAt);
  s.lastSavedAt=Date.now();
  return s;
}
function saveSession(action={}){
  if(!session){store.clear();return true;}
  const now=Date.now();
  const next=JSON.parse(JSON.stringify(session));
  if(next.running){next.elapsedBase=currentElapsed();next.lastTickAt=now;}
  next.lastSavedAt=now;
  const expectedRevision=session.revision||0;
  suppressStoreNotification=true;
  const result=store.recordAction({
    expectedRevision,nextState:next,
    event:{
      eventId:action.eventId||uid(),sessionId:session.id,taskId:action.taskId||null,
      type:action.type||"STATE_SAVED",status:action.status||null,
      actor:action.actor||"local-device",occurredAt:new Date().toISOString(),
      schemaVersion:"1.0",revision:expectedRevision+1,
      simulationTimeMs:session.mode==="simulation"?currentElapsed():null,
      payload:action.payload||{}
    }
  });
  suppressStoreNotification=false;
  if(result.conflict){session=hydrateSession(result.session);toast("Session changed; latest state restored","alert");return false;}
  if(result.session)session=result.session;
  return !!result.applied;
}
function uid(){return Math.random().toString(36).slice(2,8);}
function taskLabel(task){return SHORT_TASKS[task.id]||task.title;}
function esc(value){return String(value??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function fmt(ms,includeHours=false){
  ms=Math.max(0,ms); const total=Math.floor(ms/1000),s=total%60,m=Math.floor(total/60)%60,h=Math.floor(total/3600);
  return (includeHours||h?`${String(h).padStart(2,"0")}:`:"")+`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function currentElapsed(){
  if(!session) return 0;
  return session.elapsedBase + (session.running ? Date.now()-session.lastTickAt : 0);
}
function sessionMinute(){return currentElapsed()/60000;}
function refTags(ids=[]){return `<div class="ref-tags">${ids.map(id=>{const r=getReference(id);return r?`<span>${esc(r.short)}</span>`:"";}).join("")}</div>`;}

function navigate(next,opts={}){
  route=next;
  if(opts.emergency) selectedEmergency=opts.emergency;
  $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.nav===route));
  render();
  main.focus({preventScroll:true});
  window.scrollTo({top:0,behavior:"instant"});
}

function render(){
  const cockpit=route==="emergency"&&session?.status==="active";
  document.body.classList.toggle("in-cockpit",cockpit);
  $("#clinicalNotice").hidden=settings.noticeDismissed||cockpit;
  if(route==="emergency") renderEmergency();
  if(route==="flowcharts") renderFlowcharts();
  if(route==="medications") renderMedications();
  if(route==="education") renderEducation();
  updateHeader();
}

function updateHeader(){
  const sub=$("#headerSubtitle");
  sub.textContent=session?.status==="active"?`${session.mode==="simulation"?"Simulation":"Clinical"} · ${EMERGENCIES[session.emergencyId].short}`:"Immediate guidance";
}

function renderEmergency(){
  if(session?.status==="active") return renderActiveSession();
  if(selectedEmergency) return renderEmergencyPreview(selectedEmergency);
  main.innerHTML=`
    <section class="hero">
      <p class="eyebrow">I'M IN AN EMERGENCY—WHAT DO I DO?</p>
      <h1>Choose an emergency</h1>
      <p>Tap once. See what to do now.</p>
    </section>
    <section class="emergency-grid" aria-label="Emergency choices">
      ${Object.values(EMERGENCIES).map(e=>`
        <button class="emergency-card ${e.accent}" data-emergency="${e.id}">
          <span class="emergency-icon" aria-hidden="true">${e.icon}</span>
          <span><strong>${esc(e.name)}</strong><small>${esc(SHORT_SUMMARIES[e.id]||e.summary)}</small></span>
          <span class="chevron" aria-hidden="true">›</span>
        </button>`).join("")}
    </section>
    <section class="quick-strip">
      <button data-nav-jump="medications"><span>Rx</span><strong>Medications</strong><small>Dose · caution · timer</small></button>
      <button data-education="teamstepps"><span>◎</span><strong>TeamSTEPPS</strong><small>Roles · huddle · check-back</small></button>
    </section>
    <section class="home-foot">
      <div><strong>Works offline after first load</strong><small>This prototype stores sessions only on this device.</small></div>
      <button class="text-button" data-action="show-about">About & sources</button>
    </section>`;
}

function renderEmergencyPreview(id){
  const e=EMERGENCIES[id];
  main.innerHTML=`
    <section class="preview-head ${e.accent}">
      <button class="back-button" data-action="back-home">‹ Emergencies</button>
      <div class="preview-title"><span class="emergency-icon">${e.icon}</span><div><p class="eyebrow">EMERGENCY GUIDE</p><h1>${esc(e.name)}</h1><p>${esc(SHORT_SUMMARIES[e.id]||e.summary)}</p></div></div>
    </section>
    <section class="preview-actions">
      <button class="button primary large" data-action="start-session" data-mode="clinical">Start Clinical Assist</button>
      <button class="button simulation large" data-action="start-session" data-mode="simulation">Start Simulation</button>
      <button class="button ghost full" data-action="open-flow" data-id="${e.id}">View full flowchart</button>
    </section>
    <section class="preview-list">
      <div class="section-heading"><p class="eyebrow">IMMEDIATE OVERVIEW</p><h2>Actions are visible before the clock starts</h2></div>
      ${e.tasks.slice(0,4).map(t=>`<article class="preview-task"><span>${esc(t.group)}</span><strong>${esc(taskLabel(t))}</strong><button class="info-dot" data-task-info="${t.id}" data-emergency-id="${e.id}" aria-label="More information">i</button></article>`).join("")}
    </section>
    <div class="source-band"><span>Content basis</span>${refTags(e.source)}<small>Local activation language, medication preparation and timer defaults require institutional approval.</small></div>`;
}

function newSession(emergencyId,mode){
  const now=Date.now();
  return {id:uid(),schemaVersion:"1.0",revision:0,emergencyId,mode,status:"active",startedAt:new Date().toISOString(),elapsedBase:0,simulationTimeMs:mode==="simulation"?0:null,lastTickAt:now,lastSavedAt:now,running:true,sound:settings.sound,tasks:{},timers:[],events:[{id:uid(),at:0,type:"session",text:`${mode==="simulation"?"Simulation":"Clinical"} assist started`}],firedMilestones:[],doseCounts:{}};
}

function startSession(id,mode){
  ensureAudio(); session=store.createSession(newSession(id,mode)); selectedEmergency=id; startClock(); render(); toast(`${mode==="simulation"?"Simulation":"Clinical"} clock started`);
}

// Active session = clinical cockpit. Global rule (see DESIGN-RULES.md):
// nonclinical chrome is minimized, clinical text is never shrunk to fit.
function renderActiveSession(){
  const e=EMERGENCIES[session.emergencyId];
  const sim=session.mode==="simulation";
  const timerCount=session.timers.filter(t=>!t.cancelled&&!t.ack).length;
  main.innerHTML=`
    <section class="cockpit-head ${session.mode} ${e.accent}" aria-label="Session status">
      <div class="cockpit-row">
        <div class="cockpit-id"><span class="mode-tag">${sim?"SIMULATION":"CLINICAL"}</span><strong>${esc(e.short)}</strong></div>
        <div class="cockpit-clock" aria-live="off"><strong id="elapsedClock">${fmt(currentElapsed())}</strong><small>elapsed${sim&&!session.running?" · paused":""}</small></div>
        <button class="cockpit-icon ${session.sound?"on":""}" data-action="toggle-sound" aria-label="${session.sound?"Sound on — tap to mute":"Sound off — tap to unmute"}">${session.sound?"🔊":"🔇"}</button>
        <button class="cockpit-end" data-action="end-session">End</button>
      </div>
      <div id="nextDue" class="cockpit-status">${statusLineHTML()}</div>
    </section>
    ${sim?renderSimulationControls():""}
    ${renderAlertStrip()}
    <nav class="cockpit-tabs" aria-label="Session tools">
      <button class="tab-flow" data-action="open-flow" data-id="${e.id}">Flowchart</button>
      <button data-nav-jump="medications">Meds</button>
      <button data-action="show-timers">Timers${timerCount?` <span>${timerCount}</span>`:""}</button>
      <button data-action="show-timeline">Timeline</button>
    </nav>
    <div class="cockpit-body">
      <section class="task-workspace">
        ${renderDueGroup(e)}
        ${renderTaskGroups(e)}
        <section class="completed-panel">
          <button data-action="toggle-completed"><strong>Completed</strong><span>${completedCount(e)} ›</span></button>
          <div id="completedList" hidden>${renderCompleted(e)}</div>
        </section>
      </section>
      <aside class="cockpit-side" aria-label="Flowchart and recent events">
        ${flowHTML(e,true)}
        <section class="side-timeline"><h2>Recent events <small>(elapsed time)</small></h2>${session.events.slice(0,6).map(ev=>`<article><time>${formatEventTime(ev.at)}</time><span>${esc(ev.text)}</span></article>`).join("")}</section>
      </aside>
    </div>`;
  requestAnimationFrame(updateClockDom);
}

function renderSimulationControls(){
  return `<section class="sim-controls" aria-label="Simulation clock controls"><button data-sim="pause">${session.running?"Pause":"Resume"}</button><button data-sim="1">+1 min</button><button data-sim="5">+5 min</button><button data-sim="next">Next event</button></section>`;
}

// Overdue items are never hidden behind a tap. Task-linked reminders show on
// their own card (DUE NOW group); unlinked reminders (milestones, post-dose
// reassessment) show here, most overdue first.
function renderAlertStrip(){
  const due=getDueTimers().filter(t=>!t.taskId).sort((a,b)=>a.dueAt-b.dueAt);
  if(!due.length)return "";
  const first=due[0];
  return `<section class="alert-strip" role="alert">
    <button class="alert-main" data-action="open-due" data-timer-id="${first.id}"><strong>${esc(first.label)}</strong><span>${overdueSpan(first)}</span></button>
    ${due.length>1?`<button class="alert-more" data-action="show-timers">+${due.length-1}</button>`:""}
  </section>`;
}

function statusLineHTML(){
  const due=getDueTimers().length;
  const next=getFutureEvents()[0];
  const nextTxt=next?`Next: ${esc(next.label)} in <span class="live-countdown" data-due-at="${next.at}">${fmt((next.at-sessionMinute())*60000)}</span>`:"No upcoming reminders";
  return `${due?`<b class="overdue-count">${due} overdue</b>`:""}<span class="next-up">${nextTxt}</span>`;
}

function taskState(id){return session.tasks[id]||{status:"todo"};}
function overdueTimerFor(taskId){return getDueTimers().find(x=>x.taskId===taskId);}
function renderDueGroup(e){
  const items=e.tasks.filter(t=>taskState(t.id).status!=="done"&&overdueTimerFor(t.id));
  if(!items.length)return "";
  return `<div class="task-group due-group"><h2>DUE NOW</h2>${items.map(renderTaskCard).join("")}</div>`;
}
function renderTaskGroups(e){
  const groups=[...new Set(e.tasks.map(t=>t.group))];
  return groups.map(group=>{
    const items=e.tasks.filter(t=>t.group===group && taskState(t.id).status!=="done" && !overdueTimerFor(t.id));
    if(!items.length)return "";
    return `<div class="task-group"><h2>${esc(group)}</h2>${items.map(renderTaskCard).join("")}</div>`;
  }).join("");
}

function overdueSpan(t){return `<span class="live-overdue" data-due-at="${t.dueAt}">overdue ${fmt((sessionMinute()-t.dueAt)*60000)}</span> · due at ${fmt(t.dueAt*60000)}`;}
function taskStatusHTML(t,st){
  const overdue=overdueTimerFor(t.id);
  if(overdue)return `<div class="task-status overdue">${overdueSpan(overdue)}</div>`;
  const next=session.timers.find(x=>x.taskId===t.id&&!x.cancelled&&!x.ack);
  const parts=[];
  if(st.status==="progress")parts.push("In progress");
  if(st.status==="ongoing")parts.push("Ongoing");
  if(next)parts.push(`Next in <span class="live-countdown" data-due-at="${next.dueAt}">${formatCountdown(next)}</span>`);
  return parts.length?`<div class="task-status">${parts.join(" · ")}</div>`:"";
}

function renderTaskCard(t){
  const st=taskState(t.id);
  const overdue=!!overdueTimerFor(t.id);
  return `<article class="task-card ${t.priority} ${st.status}${overdue?" is-overdue":""}">
    <div class="task-copy">${taskStatusHTML(t,st)}<h3>${esc(taskLabel(t))}</h3></div>
    <button class="info-dot" data-task-info="${t.id}" data-emergency-id="${session.emergencyId}" aria-label="More information">i</button>
    <div class="task-actions">
      ${st.status==="todo"?`<button class="button compact secondary" data-task-action="start" data-task-id="${t.id}">Start</button>`:""}
      ${t.type==="ongoing"&&st.status==="todo"?`<button class="button compact primary" data-task-action="ongoing" data-task-id="${t.id}">Ongoing</button>`:""}
      ${st.status==="progress"||st.status==="ongoing"?`<button class="button compact primary" data-task-action="done" data-task-id="${t.id}">${t.type==="repeat"?"Assessed":t.type==="med"?"Meds":"Done ✓"}</button>`:""}
      ${st.status==="todo"&&t.type!=="ongoing"?`<button class="button compact primary" data-task-action="done" data-task-id="${t.id}">${t.type==="repeat"?"Assessed":t.type==="med"?"Meds":"Done ✓"}</button>`:""}
    </div>
  </article>`;
}

function completedCount(e){return e.tasks.filter(t=>taskState(t.id).status==="done").length;}
function renderCompleted(e){
  const done=e.tasks.filter(t=>taskState(t.id).status==="done");
  if(!done.length)return `<p class="empty">No completed tasks yet.</p>`;
  return done.map(t=>`<div class="completed-item"><div><strong>${esc(taskLabel(t))}</strong><small>${formatEventTime(taskState(t.id).completedAt)}</small></div><button data-task-action="reopen" data-task-id="${t.id}">Reopen</button></div>`).join("");
}

function handleTask(taskId,action){
  const e=EMERGENCIES[session.emergencyId],t=e.tasks.find(x=>x.id===taskId); if(!t)return;
  const at=currentElapsed();
  if(action==="start"){session.tasks[taskId]={status:"progress",startedAt:at};logEvent(`Started: ${t.title}`,"task");}
  if(action==="ongoing"){session.tasks[taskId]={status:"ongoing",startedAt:at};logEvent(`Ongoing: ${t.title}`,"task");}
  if(action==="done"&&t.type==="med"){openMedicationChooser(t);return;}
  if(action==="done"){
    session.tasks[taskId]={...taskState(taskId),status:t.type==="ongoing"?"ongoing":"done",completedAt:at};
    logEvent(`${t.type==="repeat"?"Assessed":"Completed"}: ${t.title}`,"task");
    cancelTaskTimers(taskId);
    if(t.type==="repeat"&&t.repeatMin) addTimer({taskId,label:t.title,dueAt:sessionMinute()+t.repeatMin,kind:"repeat"});
  }
  if(action==="reopen"){session.tasks[taskId]={status:"todo"};cancelTaskTimers(taskId);logEvent(`Reopened: ${t.title}`,"task");}
  const type={start:"TASK_STARTED",ongoing:"TASK_MARKED_ONGOING",done:t.type==="repeat"?"ASSESSMENT_RECORDED":"TASK_COMPLETED",reopen:"TASK_REOPENED"}[action]||"TASK_UPDATED";
  saveSession({type,taskId,status:session.tasks[taskId]?.status||null});render();
}

function cancelTaskTimers(taskId){session.timers.forEach(t=>{if(t.taskId===taskId)t.cancelled=true;});}
function addTimer(timer){session.timers.push({id:uid(),createdAt:sessionMinute(),createdAtWall:new Date().toISOString(),dueAtElapsedMs:timer.dueAt*60000,ack:false,cancelled:false,...timer});}
function logEvent(text,type="note"){session.events.unshift({id:uid(),at:currentElapsed(),type,text});}
function formatEventTime(ms){return fmt(ms,true);}
function formatCountdown(t){return fmt(Math.max(0,(t.dueAt-sessionMinute())*60000));}
// Every time shown in a session is on the elapsed-time clock. Labels say which
// is which: "due at" = elapsed time it fell due; "overdue"/"in" = distance from now.
function formatDue(t){return t.dueAt<=sessionMinute()?`Due at ${fmt(t.dueAt*60000)} elapsed · overdue ${fmt((sessionMinute()-t.dueAt)*60000)}`:`Due at ${fmt(t.dueAt*60000)} elapsed · in ${formatCountdown(t)}`;}

function getDueTimers(){return session?session.timers.filter(t=>!t.cancelled&&!t.ack&&t.dueAt<=sessionMinute()):[];}
function getFutureEvents(){
  if(!session)return[];
  const e=EMERGENCIES[session.emergencyId];
  const timerEvents=session.timers.filter(t=>!t.cancelled&&!t.ack&&t.dueAt>sessionMinute()).map(t=>({at:t.dueAt,label:t.label}));
  const milestones=e.milestones.filter(m=>!session.firedMilestones.includes(m.min)&&m.min>sessionMinute()).map(m=>({at:m.min,label:m.label}));
  return [...timerEvents,...milestones].sort((a,b)=>a.at-b.at);
}
function nextDueLabel(){return statusLineHTML();}

function startClock(){
  clearInterval(clockHandle); if(!session||session.status!=="active")return;
  session.lastTickAt=Date.now();
  clockHandle=setInterval(()=>{updateClockDom();checkMilestones();checkDueTransitions();},500);
}
function updateClockDom(){
  if(!session)return;
  const now=sessionMinute();
  const c=$("#elapsedClock"); if(c)c.textContent=fmt(currentElapsed());
  $$(".live-overdue").forEach(el=>{el.textContent=`overdue ${fmt((now-Number(el.dataset.dueAt))*60000)}`;});
  $$(".live-countdown").forEach(el=>{el.textContent=fmt((Number(el.dataset.dueAt)-now)*60000);});
}
function freezeClock(){
  if(session?.running){session.elapsedBase=currentElapsed();session.running=false;session.lastTickAt=Date.now();session.simulationTimeMs=session.mode==="simulation"?session.elapsedBase:null;saveSession({type:"SESSION_PAUSED",status:"active"});}
}
function resumeClock(){if(session&&!session.running){session.running=true;session.lastTickAt=Date.now();saveSession({type:"SESSION_RESUMED",status:"active"});}}
function advanceSimulation(min){
  if(session.mode!=="simulation")return;
  if(session.running){session.elapsedBase=currentElapsed();session.lastTickAt=Date.now();}
  session.elapsedBase+=min*60000;session.simulationTimeMs=session.elapsedBase;logEvent(`Simulation time advanced +${Number(min).toFixed(min%1?1:0)} min`,"simulation");saveSession({type:"SIMULATION_TIME_ADVANCED",status:"active",payload:{minutes:min,simulationTimeMs:session.simulationTimeMs}});checkMilestones();render();
}
function jumpNext(){
  const next=getFutureEvents()[0];
  if(!next){toast("No future timer or milestone");return;}
  const delta=Math.max(0,next.at-sessionMinute());advanceSimulation(delta);
}
function checkMilestones(){
  if(!session)return; const e=EMERGENCIES[session.emergencyId],now=sessionMinute();
  let latest=null;
  e.milestones.forEach(m=>{
    if(now>=m.min&&!session.firedMilestones.includes(m.min)){
      session.firedMilestones.push(m.min);addTimer({label:m.label,dueAt:m.min,kind:"milestone",message:m.message});logEvent(`${m.label}: ${m.message}`,"milestone");latest=m;
    }
  });
  // The alert strip already shows the milestone; the toast only names it.
  if(latest){playAlert();toast(`${latest.label} due`,"alert");lastDueCount=getDueTimers().length;saveSession({type:"MILESTONE_FIRED",status:"pending",payload:{minute:latest.min,label:latest.label}});}
}
let lastDueCount=0;
function checkDueTransitions(){
  const due=getDueTimers();let changed=false;
  due.forEach(t=>{
    if(t.kind==="repeat"&&t.taskId&&!t.reactivated){t.reactivated=true;session.tasks[t.taskId]={status:"todo",dueAt:currentElapsed()};logEvent(`Reassessment due: ${t.label}`,"timer");changed=true;}
  });
  if(due.length>lastDueCount){playAlert();changed=true;}
  if(changed){saveSession({type:"TIMER_DUE",status:"pending",payload:{timerIds:due.map(t=>t.id)}});render();}
  lastDueCount=due.length;
}

function ensureAudio(){
  try{audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)(); if(audioContext.state==="suspended")audioContext.resume();}catch{}
}
function playAlert(){
  if(!session?.sound)return;ensureAudio();if(!audioContext)return;
  [0,.18].forEach((delay,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain();o.type="sine";o.frequency.value=i?740:620;g.gain.setValueAtTime(.0001,audioContext.currentTime+delay);g.gain.exponentialRampToValueAtTime(.16,audioContext.currentTime+delay+.02);g.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+delay+.16);o.connect(g).connect(audioContext.destination);o.start(audioContext.currentTime+delay);o.stop(audioContext.currentTime+delay+.18);});
  if(navigator.vibrate)navigator.vibrate([180,80,180]);
}

function renderFlowcharts(){
  const e=EMERGENCIES[flowEmergency];
  main.innerHTML=`<section class="page-head"><p class="eyebrow">ONE-TAP OVERVIEW</p><h1>Clinical flowcharts</h1><p>Use the flowchart to orient the team. Return to Actions for task controls and timers.</p></section>
    <div class="segmented emergency-tabs">${Object.values(EMERGENCIES).map(x=>`<button class="${x.id===e.id?"active":""}" data-flow-select="${x.id}">${esc(x.short)}</button>`).join("")}</div>
    ${flowHTML(e)}
    <div class="source-band"><span>Content basis</span>${refTags(e.source)}<small>This is a concise implementation view, not a replacement for the complete source or local protocol.</small></div>`;
}
function flowHTML(e,embedded=false){
  return `<section class="flowchart ${e.accent}"><div class="flowchart-head"><span>${e.icon}</span><div><small>FULL PATHWAY</small><h2>${esc(e.name)}</h2></div>${!embedded&&session?.status==="active"&&session.emergencyId===e.id?`<button data-nav-jump="emergency">Return to Actions</button>`:""}</div>
    <div class="flow-track">${e.flow.map((n,i)=>`<article class="flow-node ${n.tone}"><span>${i+1}</span><div><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p></div></article>${i<e.flow.length-1?`<div class="flow-arrow">↓</div>`:""}`).join("")}</div></section>`;
}

function renderMedications(query=""){
  const q=query.toLowerCase();const meds=MEDICATIONS.filter(m=>!q||`${m.name} ${m.context} ${m.dose} ${m.avoid}`.toLowerCase().includes(q));
  main.innerHTML=`<section class="page-head"><p class="eyebrow">DIRECT LOOKUP</p><h1>Medication reference</h1><p>Opening a card never records a dose. Confirm actual administration to start any medication-specific timer.</p></section>
    <label class="search-box"><span>⌕</span><input id="medSearch" type="search" placeholder="Search medication or contraindication" value="${esc(query)}"></label>
    <div class="filter-chips"><button class="active" data-med-filter="">All</button><button data-med-filter="PPH">PPH</button><button data-med-filter="hypertension">Severe BP</button><button data-med-filter="eclampsia">Eclampsia</button></div>
    <section class="med-list">${meds.map(m=>medCard(m)).join("")||`<p class="empty">No medication matched that search.</p>`}</section>`;
}
function updateMedicationList(query){
  const q=query.toLowerCase();
  const meds=MEDICATIONS.filter(m=>!q||`${m.name} ${m.context} ${m.dose} ${m.avoid}`.toLowerCase().includes(q));
  const list=$(".med-list");if(list)list.innerHTML=meds.map(m=>medCard(m)).join("")||`<p class="empty">No medication matched that search.</p>`;
}
function medCard(m){return `<button class="med-card ${m.accent}" data-med-id="${m.id}"><div><small>${esc(m.context)}</small><strong>${esc(m.name)}</strong><p>${esc(m.dose)}</p></div><span>›</span></button>`;}

function renderEducation(){
  main.innerHTML=`<section class="page-head"><p class="eyebrow">INFORMATION & EDUCATION</p><h1>Understand the response</h1><p>Operational detail lives here so the emergency workspace stays concise.</p></section>
    <section class="education-grid">${EDUCATION.map(x=>`<button class="education-card ${x.accent}" data-education="${x.id}"><small>${esc(x.kicker)}</small><strong>${esc(x.title)}</strong><p>${esc(x.summary)}</p><span>Open ›</span></button>`).join("")}</section>
    <section class="references"><div class="section-heading"><p class="eyebrow">CONTENT GOVERNANCE</p><h2>Sources and review status</h2></div>
      <div class="reference-list">${REFERENCES.map(r=>`<article><div><strong>${esc(r.title)}</strong><small>${r.year} · ${esc(r.short)}</small><p>${esc(r.note)}</p></div>${r.url?`<a href="${r.url}" target="_blank" rel="noopener">Open source ↗</a>`:"<span>Supplied PDF</span>"}</article>`).join("")}</div>
      <div class="version-card"><strong>Prototype ${APP_VERSION}</strong><span>Content review: ${CONTENT_REVIEW_DATE}</span><p>Before clinical release: pharmacy, nursing, obstetric, anesthesia, blood bank, risk/compliance and informatics review; replace all institutional placeholders.</p></div>
    </section>`;
}

function openTaskInfo(emergencyId,taskId){
  const e=EMERGENCIES[emergencyId],t=e.tasks.find(x=>x.id===taskId);if(!t)return;
  openSheet({eyebrow:t.group,title:t.title,html:`<p class="lead">${esc(t.detail)}</p>${t.review?`<div class="warning-box"><strong>Requires local decision</strong><p>${esc(t.review)}</p></div>`:""}${t.meds?`<h3>Related medications</h3><div class="sheet-link-list">${t.meds.map(id=>{const m=getMedication(id);return `<button data-med-id="${id}"><span>Rx</span><div><strong>${esc(m.name)}</strong><small>${esc(m.context)}</small></div><b>›</b></button>`;}).join("")}</div>`:""}<h3>Evidence basis</h3>${refTags(e.source)}`});
}
function openMedication(id,recordable=!!session){
  const m=getMedication(id),r=getReference(m.source);if(!m)return;
  openSheet({eyebrow:m.context,title:m.name,html:`<div class="dose-callout ${m.accent}"><small>DOSE / SEQUENCE</small><strong>${esc(m.dose)}</strong></div>
    <dl class="med-detail"><div><dt>Administration</dt><dd>${esc(m.administration)}</dd></div><div><dt>Repeat / reassessment</dt><dd>${esc(m.repeat)}</dd></div><div class="avoid"><dt>Avoid / use caution</dt><dd>${esc(m.avoid)}</dd></div><div><dt>Monitor</dt><dd>${esc(m.watch)}</dd></div></dl>
    ${recordable&&session.status==="active"?`<button class="button primary full" data-action="record-med" data-med-id="${m.id}">Confirm medication given now</button><p class="microcopy">Only tap after actual administration. This records time and starts any applicable reassessment timer.</p>`:""}
    <div class="source-note"><strong>${esc(r?.short||"")}</strong><span>${esc(r?.title||"")}</span></div>`});
}
function openMedicationChooser(task){
  openSheet({eyebrow:"SELECT MEDICATION",title:"What was administered?",html:`<p class="lead">Open the medication card to verify dosing and precautions. Record only after actual administration.</p><div class="sheet-link-list">${task.meds.map(id=>{const m=getMedication(id);return `<button data-med-id="${id}"><span>Rx</span><div><strong>${esc(m.name)}</strong><small>${esc(m.context)}</small></div><b>›</b></button>`;}).join("")}</div>`});
}
function recordMedication(id){
  const m=getMedication(id);if(!session||!m)return;
  const prior=session.doseCounts[id]||0;
  if(m.maxDoses&&prior>=m.maxDoses){toast(`${m.name}: pathway dose limit reached—escalate and verify orders`,"alert");return;}
  session.doseCounts[id]=(session.doseCounts[id]||0)+1;
  logEvent(`${m.name} administered · dose ${session.doseCounts[id]}`,"medication");
  if(m.timer)addTimer({label:m.timerLabel||`Reassess after ${m.name}`,dueAt:sessionMinute()+m.timer,kind:"medication",medId:id});
  const e=EMERGENCIES[session.emergencyId],task=e.tasks.find(t=>t.meds?.includes(id));if(task)session.tasks[task.id]={status:"done",completedAt:currentElapsed()};
  saveSession({type:"MEDICATION_ADMINISTERED",taskId:task?.id||null,status:"completed",payload:{medId:id,doseNumber:session.doseCounts[id]}});closeSheet();render();toast(`${m.name} recorded${m.timer?` · reassess in ${m.timer} min`:""}`);
}
function openEducation(id){
  const x=EDUCATION.find(e=>e.id===id);if(!x)return;
  openSheet({eyebrow:x.kicker,title:x.title,wide:true,html:`<p class="lead">${esc(x.summary)}</p><div class="lesson-sections">${x.sections.map(s=>`<section><h3>${esc(s.h)}</h3>${s.p?`<p>${esc(s.p)}</p>`:""}${s.bullets?`<ul>${s.bullets.map(b=>`<li>${esc(b)}</li>`).join("")}</ul>`:""}</section>`).join("")}</div>${id==="teamstepps"?refTags(["ahrq-teamstepps"]):""}`});
}
function openFlow(id){flowEmergency=id;route="flowcharts";$$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.nav==="flowcharts"));render();}

function showTimers(){
  const active=session.timers.filter(t=>!t.cancelled);
  openSheet({eyebrow:"SESSION CLOCKS",title:"Timers and reminders",html:`<p class="lead">Silencing an alert does not complete its clinical task.</p><div class="timer-list">${active.length?active.sort((a,b)=>a.dueAt-b.dueAt).map(t=>`<article class="${t.dueAt<=sessionMinute()&&!t.ack?"due":""}"><div><strong>${esc(t.label)}</strong><small>${t.ack?`Acknowledged · ${formatDue(t)}`:formatDue(t)}</small></div>${!t.ack?`<button data-action="ack-timer" data-timer-id="${t.id}">Acknowledge</button>`:""}</article>`).join(""):`<p class="empty">No active task timers.</p>`}</div>`});
}
function showTimeline(){
  openSheet({eyebrow:"THIS DEVICE",title:"Event timeline",html:`<p class="lead">A local operational record—not documentation in the medical record. Times are elapsed since session start.</p><div class="timeline-list">${session.events.map(e=>`<article><time>${formatEventTime(e.at)}</time><div><strong>${esc(e.text)}</strong><small>${esc(e.type)}</small></div></article>`).join("")}</div>`});
}
function showDue(id){
  const t=session.timers.find(x=>x.id===id);if(!t)return;
  openSheet({eyebrow:"REMINDER DUE",title:t.label,html:`<div class="due-callout"><strong>${t.message?esc(t.message):"Reassess now and record the applicable clinical action."}</strong><span>${formatDue(t)}</span></div><button class="button primary full" data-action="ack-timer" data-timer-id="${t.id}">Acknowledge reminder</button><p class="microcopy">Acknowledging removes the alert. It does not mark a task complete or medication administered.</p>`});
}
function acknowledgeTimer(id){const t=session.timers.find(x=>x.id===id);if(!t)return;t.ack=true;logEvent(`Reminder acknowledged: ${t.label}`,"timer");saveSession({type:"TIMER_ACKNOWLEDGED",status:"completed",payload:{timerId:id}});closeSheet();render();}

function showAbout(){
  openSheet({eyebrow:"ABOUT THIS BUILD",title:"OB Emergency Assist",html:`<p class="lead">A phone-first clinical guidance and simulation prototype. It is not a medical record, does not replace clinical judgment and must be reviewed against current institutional protocols before clinical use.</p><div class="about-list"><div><strong>Version</strong><span>${APP_VERSION}</span></div><div><strong>Content review</strong><span>${CONTENT_REVIEW_DATE}</span></div><div><strong>Data</strong><span>Stored only in this browser</span></div><div><strong>Network</strong><span>Core content available offline after first successful load</span></div></div><h3>Planned Workspace transition</h3><p>The state engine uses event-style actions so a later Google Workspace adapter can synchronize session codes, task ownership, medication events and timelines across devices.</p>`});
}

function openSheet({eyebrow="",title,html,wide=false}){
  $("#sheetEyebrow").textContent=eyebrow;$("#sheetTitle").textContent=title;$("#sheetBody").innerHTML=html;$("#infoSheet").classList.toggle("wide",!!wide);$("#sheetBackdrop").hidden=false;$("#infoSheet").hidden=false;document.body.classList.add("sheet-open");setTimeout(()=>$("#infoSheet").classList.add("open"),10);
}
function closeSheet(){$("#infoSheet").classList.remove("open");document.body.classList.remove("sheet-open");setTimeout(()=>{$("#infoSheet").hidden=true;$("#sheetBackdrop").hidden=true;},180);}
function toast(message,type="ok"){
  // In the cockpit, toasts never stack over action cards: one at a time, short-lived.
  const cockpit=document.body.classList.contains("in-cockpit");
  if(cockpit)$("#toastRegion").replaceChildren();
  const el=document.createElement("div");el.className=`toast ${type}`;el.textContent=message;$("#toastRegion").appendChild(el);setTimeout(()=>el.remove(),cockpit?2600:4200);
}
function confirmAction(title,text,onConfirm){
  const tpl=$("#confirmTemplate").content.cloneNode(true),card=tpl.querySelector(".confirm-card");card.querySelector("h2").textContent=title;card.querySelector("p").textContent=text;openSheet({eyebrow:"CONFIRM",title:"",html:""});$("#sheetBody").replaceChildren(card);card.addEventListener("click",e=>{if(e.target.dataset.confirm==="cancel")closeSheet();if(e.target.dataset.confirm==="yes"){closeSheet();onConfirm();}});
}
function endSession(){
  confirmAction("End this assist session?","This stops all alerts. The timeline will be cleared when you leave this session.",()=>{clearInterval(clockHandle);freezeClock();session.status="ended";saveSession({type:"SESSION_ENDED",status:"ended"});openSheet({eyebrow:"SESSION ENDED",title:`Elapsed ${fmt(currentElapsed(),true)}`,html:`<p class="lead">Ending the app session does not label the clinical emergency resolved.</p><button class="button secondary full" data-action="show-timeline">View timeline</button><button class="button primary full" data-action="clear-session">Return to emergency home</button>`});render();});
}
function clearSession(){session=null;store.clear();selectedEmergency=null;closeSheet();navigate("emergency");}

document.addEventListener("click",e=>{
  const b=e.target.closest("button,a");if(!b)return;
  if(b.dataset.nav)navigate(b.dataset.nav);
  if(b.dataset.navJump)navigate(b.dataset.navJump);
  if(b.dataset.emergency){selectedEmergency=b.dataset.emergency;render();}
  if(b.dataset.education)openEducation(b.dataset.education);
  if(b.dataset.medId)openMedication(b.dataset.medId);
  if(b.dataset.taskInfo)openTaskInfo(b.dataset.emergencyId,b.dataset.taskInfo);
  if(b.dataset.taskAction)handleTask(b.dataset.taskId,b.dataset.taskAction);
  if(b.dataset.flowSelect){flowEmergency=b.dataset.flowSelect;renderFlowcharts();}
  if(b.dataset.medFilter){
    $$(".filter-chips button").forEach(x=>x.classList.toggle("active",x===b));
    const input=$("#medSearch");if(input){input.value=b.dataset.medFilter;updateMedicationList(b.dataset.medFilter);}
  }
  if(b.dataset.sim){if(b.dataset.sim==="pause"){session.running?freezeClock():resumeClock();render();}else if(b.dataset.sim==="next")jumpNext();else advanceSimulation(Number(b.dataset.sim));}
  const a=b.dataset.action;
  if(a==="dismiss-notice"){settings.noticeDismissed=true;saveSettings();$("#clinicalNotice").hidden=true;}
  if(a==="back-home"){selectedEmergency=null;render();}
  if(a==="start-session")startSession(selectedEmergency,b.dataset.mode);
  if(a==="open-flow")openFlow(b.dataset.id);
  if(a==="close-sheet")closeSheet();
  if(a==="toggle-completed"){const l=$("#completedList");l.hidden=!l.hidden;}
  if(a==="toggle-sound"){session.sound=!session.sound;settings.sound=session.sound;saveSettings();ensureAudio();saveSession();render();}
  if(a==="show-timers")showTimers();
  if(a==="show-timeline")showTimeline();
  if(a==="open-due")showDue(b.dataset.timerId);
  if(a==="ack-timer")acknowledgeTimer(b.dataset.timerId);
  if(a==="record-med")recordMedication(b.dataset.medId);
  if(a==="show-about")showAbout();
  if(a==="end-session")endSession();
  if(a==="clear-session")clearSession();
});

document.addEventListener("input",e=>{if(e.target.id==="medSearch")updateMedicationList(e.target.value);});
$("#sheetBackdrop").addEventListener("click",closeSheet);
$("#homeButton").addEventListener("click",()=>navigate("emergency"));

function updateConnectivity(){
  const online=navigator.onLine;$("#connectionDot").classList.toggle("offline",!online);$("#connectionLabel").textContent=online?"Ready":"Offline";if(!online)toast("Offline · this device continues locally","alert");
}
window.addEventListener("online",updateConnectivity);window.addEventListener("offline",updateConnectivity);
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&session?.status==="active"){checkMilestones();render();}});

if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
updateConnectivity();if(session?.status==="active")startClock();render();
store.subscribe(next=>{
  if(suppressStoreNotification||!next||!session||next.id!==session.id)return;
  if((next.revision||0)>(session.revision||0)){session=hydrateSession(next);render();}
});
