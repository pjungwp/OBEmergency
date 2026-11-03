import {APP_VERSION,CONTENT_REVIEW_DATE,EMERGENCIES,MEDICATIONS,EDUCATION,REFERENCES,APPROVALS,INSTITUTIONAL_PLACEHOLDERS,getMedication,getReference} from "./data.js";
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
  "ec-help":"Call for help.","ec-safety":"Protect. Left lateral. Support airway.","ec-mag":"Give magnesium.","ec-vitals":"Check BP, oxygen + neurologic status.","ec-recur":"Treat persistent/recurrent seizure.","ec-tox":"Watch for magnesium toxicity.","ec-neuro":"Do neurologic exam. Consider head CT.","ec-delivery":"Plan delivery after stabilization.",
  "cv-pregnancy":"Ask: pregnant in last 12 months?","cv-redflags":"Check cardiac red flags + vitals.","cv-help":"Call emergency, OB + cardiac support.","cv-workup":"Get ECG, BNP, CXR + troponin.","cv-echo":"Abnormal tests: echo + consult.","cv-treat":"Treat life threats. Admit or transfer."
};
const SHORT_SUMMARIES = {
  pph:"Bleeding · resuscitation · 4 Ts",
  htn:"Confirm · treat · reassess",
  eclampsia:"Protect · magnesium · airway",
  cardiac:"Red flags · work-up · consult"
};
const FLOW_IMAGES = {
  pph:"flowcharts/pph.jpg",
  htn:"flowcharts/htn.jpg",
  eclampsia:"flowcharts/eclampsia.jpg",
  cardiac:"flowcharts/cardiac.jpg"
};

let route = "emergency";
let selectedEmergency = null;
let flowEmergency = "pph";
let session = hydrateSession(store.loadSession());
let clockHandle = null;
let audioContext = null;
let settings = loadSettings();
let suppressStoreNotification = false;
let deferredInstallPrompt = null;
let wakeLock = null;
let hiddenAtElapsed = null;
let missedReminderCount = 0;
let refreshingForUpdate = false;
let swRegistration = null;

function loadSettings(){
  try{return {...{noticeDismissed:false,sound:true,largeText:false},...JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}")};}catch{return {noticeDismissed:false,sound:true,largeText:false};}
}
function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}
function hydrateSession(s){
  if(!s) return null;
  s.doseCounts=s.doseCounts||{};
  s.medicationStates=s.medicationStates||{};
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
  applyDisplaySettings();
  $("#clinicalNotice").hidden=false;
  if(route==="emergency") renderEmergency();
  if(route==="flowcharts") renderFlowcharts();
  if(route==="medications") renderMedications();
  if(route==="education") renderEducation();
  updateHeader();
}

function updateHeader(){
  const sub=$("#headerSubtitle");
  const label=session?.status==="active"?`${session.mode==="simulation"?"Simulation":"Clinical"} · ${EMERGENCIES[session.emergencyId].short}`:"Immediate guidance";
  sub.textContent=`${label}${navigator.onLine?"":" · Offline"}`;
}

function applyDisplaySettings(){
  document.body.classList.toggle("large-text",!!settings.largeText);
  const button=$("#textSizeButton");
  if(button)button.setAttribute("aria-pressed",String(!!settings.largeText));
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
    </section>
    <section class="release-strip" aria-label="App version"><strong>${APP_VERSION}</strong><span>Clinical content reviewed ${CONTENT_REVIEW_DATE}</span></section>`;
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
  return {id:uid(),schemaVersion:"1.0",revision:0,emergencyId,mode,status:"active",startedAt:new Date().toISOString(),elapsedBase:0,simulationTimeMs:mode==="simulation"?0:null,lastTickAt:now,lastSavedAt:now,running:true,sound:settings.sound,tasks:{},timers:[],events:[{id:uid(),at:0,type:"session",text:`${mode==="simulation"?"Simulation":"Clinical"} assist started`}],firedMilestones:[],doseCounts:{},medicationStates:{}};
}

function startSession(id,mode){
  ensureAudio(); session=store.createSession(newSession(id,mode)); selectedEmergency=id; startClock();requestWakeLock();render();toast(`${mode==="simulation"?"Simulation":"Clinical"} clock started`);
}

function renderActiveSession(){
  const e=EMERGENCIES[session.emergencyId];
  const elapsed=currentElapsed();
  const dueTimers=getDueTimers();
  main.innerHTML=`
    <div class="session-banner ${session.mode}">
      <div><span>${session.mode==="simulation"?"SIMULATION":"CLINICAL ASSIST"}</span><strong>${esc(e.name)}</strong></div>
      <button class="text-button light" data-action="end-session">End</button>
    </div>
    ${missedReminderCount?`<section class="missed-alert" role="alert" aria-live="assertive"><div><strong>${missedReminderCount} reminder${missedReminderCount===1?" was":"s were"} missed while the screen was off.</strong><span>Review overdue timers now.</span></div><button data-action="dismiss-missed" aria-label="Dismiss missed-reminder message">×</button></section>`:""}
    <section class="timer-console ${e.accent}">
      <div class="main-clock"><small>ELAPSED</small><strong id="elapsedClock">${fmt(elapsed,true)}</strong></div>
      <div class="next-clock"><small>NEXT DUE</small><strong id="nextDue">${nextDueLabel()}</strong></div>
      <button class="alarm-button ${session.sound?"on":""}" data-action="toggle-sound" aria-label="Toggle sound">${session.sound?"🔊":"🔇"}<small>${session.sound?"Sound on":"Sound off"}</small></button>
    </section>
    ${session.mode==="simulation"?renderSimulationControls():""}
    ${dueTimers.length?`<section class="due-panel" role="alert" aria-live="assertive" aria-atomic="true"><strong>${dueTimers.length} reminder${dueTimers.length>1?"s":""} due</strong>${dueTimers.map(t=>`<button data-action="open-due" data-timer-id="${t.id}">${esc(t.label)} <span>Due ${formatDue(t)}</span></button>`).join("")}</section>`:""}
    <div class="active-toolbar">
      <button data-action="open-flow" data-id="${e.id}">↳ <strong>Flowchart</strong></button>
      <button data-action="show-timers">◷ <strong>Timers</strong><span>${session.timers.filter(t=>!t.cancelled).length}</span></button>
      <button data-action="show-timeline">≡ <strong>Timeline</strong><span>${session.events.length}</span></button>
    </div>
    <section class="task-workspace">
      ${renderTaskGroups(e)}
    </section>
    <section class="completed-panel">
      <button data-action="toggle-completed"><strong>Completed</strong><span>${completedCount(e)} task${completedCount(e)===1?"":"s"} ›</span></button>
      <div id="completedList" hidden>${renderCompleted(e)}</div>
    </section>`;
  requestAnimationFrame(updateClockDom);
}

function renderSimulationControls(){
  return `<section class="sim-controls"><span>SIM CLOCK</span><button data-sim="pause">${session.running?"Pause":"Resume"}</button><button data-sim="1">+1 min</button><button data-sim="5">+5 min</button><button data-sim="next">Next event</button></section>`;
}

function taskState(id){return session.tasks[id]||{status:"todo"};}
function renderTaskGroups(e){
  const groups=[...new Set(e.tasks.map(t=>t.group))];
  return groups.map(group=>{
    const items=e.tasks.filter(t=>t.group===group && taskState(t.id).status!=="done");
    if(!items.length)return "";
    return `<div class="task-group"><h2>${esc(group)}</h2>${items.map(renderTaskCard).join("")}</div>`;
  }).join("");
}

function renderTaskCard(t){
  const st=taskState(t.id);
  const repeatTimer=session.timers.find(x=>x.taskId===t.id&&!x.cancelled);
  return `<article class="task-card ${t.priority} ${st.status}">
    <div class="task-copy"><div class="task-status">${st.status==="progress"?"IN PROGRESS":t.type==="ongoing"&&st.status==="ongoing"?"ONGOING":"TO DO"}${repeatTimer?` · ${repeatTimer.dueAt<=sessionMinute()?"DUE NOW":`NEXT ${formatCountdown(repeatTimer)}`}`:""}</div><h3>${esc(taskLabel(t))}</h3></div>
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
function formatDue(t){return t.dueAt<=sessionMinute()?`by ${fmt((sessionMinute()-t.dueAt)*60000)}`:`in ${formatCountdown(t)}`;}

function getDueTimers(){return session?session.timers.filter(t=>!t.cancelled&&!t.ack&&t.dueAt<=sessionMinute()):[];}
function getFutureEvents(){
  if(!session)return[];
  const e=EMERGENCIES[session.emergencyId];
  const timerEvents=session.timers.filter(t=>!t.cancelled&&!t.ack&&t.dueAt>sessionMinute()).map(t=>({at:t.dueAt,label:t.label}));
  const milestones=e.milestones.filter(m=>!session.firedMilestones.includes(m.min)&&m.min>sessionMinute()).map(m=>({at:m.min,label:m.label}));
  return [...timerEvents,...milestones].sort((a,b)=>a.at-b.at);
}
function nextDueLabel(){
  const due=getDueTimers(); if(due.length)return "DUE NOW";
  const next=getFutureEvents()[0]; return next?fmt((next.at-sessionMinute())*60000):"—";
}

function startClock(){
  clearInterval(clockHandle); if(!session||session.status!=="active")return;
  session.lastTickAt=Date.now();
  clockHandle=setInterval(()=>{updateClockDom();checkMilestones();checkDueTransitions();},500);
}
async function requestWakeLock(){
  if(!session||session.status!=="active"||document.hidden||!navigator.wakeLock?.request)return;
  try{wakeLock=await navigator.wakeLock.request("screen");wakeLock.addEventListener("release",()=>{wakeLock=null;});}catch{}
}
async function releaseWakeLock(){
  try{await wakeLock?.release();}catch{}wakeLock=null;
}
function updateClockDom(){
  if(!session)return;
  const c=$("#elapsedClock"); if(c)c.textContent=fmt(currentElapsed(),true);
  const n=$("#nextDue"); if(n)n.textContent=nextDueLabel();
  $$(".task-card").forEach(card=>{});
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
  if(latest){playAlert();toast(latest.message,"alert");lastDueCount=getDueTimers().length;saveSession({type:"MILESTONE_FIRED",status:"pending",payload:{minute:latest.min,label:latest.label}});}
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
  main.innerHTML=`<section class="page-head dashboard-head"><p class="eyebrow">ALL PATHWAYS</p><h1>Clinical flowcharts</h1><p>Tap a pathway. Tap its image to magnify.</p></section>
    <section class="dashboard-stack flow-dashboard">${Object.values(EMERGENCIES).map(flowHTML).join("")}</section>
    <div class="source-band compact-source"><span>Clinical prototype</span><small>Concise orientation views. Verify against the complete source and current institutional protocol.</small></div>`;
}
function flowHTML(e){
  return `<details class="dashboard-section flow-panel ${e.accent}" ${e.id===flowEmergency?"open":""}>
    <summary><span class="summary-icon">${e.icon}</span><span><strong>${esc(e.name)}</strong><small>${esc(SHORT_SUMMARIES[e.id]||e.summary)}</small></span><b>⌄</b></summary>
    <div class="flow-panel-body">
      <button class="flow-image-button" data-action="zoom-flow" data-id="${e.id}" aria-label="Magnify ${esc(e.name)} flowchart"><img src="${FLOW_IMAGES[e.id]}" alt="${esc(e.name)} quick clinical pathway"><span>Tap to magnify</span></button>
      <div class="flow-panel-actions"><button class="button secondary" data-action="zoom-flow" data-id="${e.id}">Magnify</button>${session?.emergencyId===e.id?`<button class="button primary" data-nav-jump="emergency">Actions</button>`:""}</div>
      ${refTags(e.source)}
    </div>
  </details>`;
}

function renderMedications(query=""){
  main.innerHTML=`<section class="page-head dashboard-head"><p class="eyebrow">MEDICATION DASHBOARD</p><h1>Medication reference</h1><p>Grouped by emergency. Tap a group, then a medication.</p></section>
    <label class="search-box"><span>⌕</span><input id="medSearch" type="search" placeholder="Search medication or contraindication" value="${esc(query)}"></label>
    <div class="filter-chips"><button class="active" data-med-filter="">All</button><button data-med-filter="PPH">PPH</button><button data-med-filter="hypertension">Severe BP</button><button data-med-filter="eclampsia">Eclampsia</button></div>
    <section id="medDashboard" class="dashboard-stack medication-dashboard">${renderMedicationGroups(query)}</section>`;
}
function updateMedicationList(query){
  const list=$("#medDashboard");if(list)list.innerHTML=renderMedicationGroups(query);
}
function renderMedicationGroups(query=""){
  const groups=[
    {title:"PPH medications",subtitle:"Uterotonics + TXA",accent:"crimson",ids:["oxytocin","methylergonovine","carboprost","misoprostol","txa"]},
    {title:"Severe BP medications",subtitle:"Labetalol · hydralazine · nifedipine",accent:"amber",ids:["labetalol","hydralazine","nifedipine"]},
    {title:"Eclampsia + magnesium safety",subtitle:"Magnesium · rescue · recurrent seizure",accent:"violet",ids:["magnesium","calcium-gluconate","calcium-chloride","lorazepam","diazepam","midazolam","fosphenytoin","levetiracetam","propofol-airway"]}
  ];
  const q=query.trim().toLowerCase();
  let visible=0;
  const html=groups.map((group,index)=>{
    const meds=group.ids.map(getMedication).filter(m=>m&&(!q||`${m.name} ${m.context} ${m.dose} ${m.avoid}`.toLowerCase().includes(q)));
    if(!meds.length)return "";
    visible+=meds.length;
    return `<details class="dashboard-section medication-group ${group.accent}" ${q||index===0?"open":""}><summary><span><strong>${esc(group.title)}</strong><small>${esc(group.subtitle)} · ${meds.length}</small></span><b>⌄</b></summary><div class="med-list">${meds.map(m=>medCard(m)).join("")}</div></details>`;
  }).join("");
  return visible?html:`<p class="empty dashboard-empty">No medication matched that search.</p>`;
}
function medCard(m){return `<button class="med-card ${m.accent}" data-med-id="${m.id}"><div><small>${esc(m.context)}</small><strong>${esc(m.name)}</strong><p>${esc(m.dose)}</p></div><span>›</span></button>`;}

function renderEducation(){
  const groups=[
    {title:"Team response",subtitle:"TeamSTEPPS + roles",accent:"navy",ids:["teamstepps","roles"]},
    {title:"Emergency concepts",subtitle:"4 Ts · severe BP · magnesium",accent:"crimson",ids:["four-ts","severe-htn","mag-safety"]},
    {title:"Screening + simulation",subtitle:"Pregnancy status · training mode",accent:"teal",ids:["pregnancy-status","simulation"]}
  ];
  main.innerHTML=`<section class="page-head dashboard-head"><p class="eyebrow">EDUCATION DASHBOARD</p><h1>Understand the response</h1><p>All guides, grouped and collapsible.</p></section>
    <section class="dashboard-stack education-dashboard">${groups.map((group,index)=>`<details class="dashboard-section education-group ${group.accent}" ${index===0?"open":""}><summary><span><strong>${esc(group.title)}</strong><small>${esc(group.subtitle)} · ${group.ids.length}</small></span><b>⌄</b></summary><div class="education-grid">${group.ids.map(id=>EDUCATION.find(x=>x.id===id)).filter(Boolean).map(x=>educationCard(x)).join("")}</div></details>`).join("")}
      <details class="dashboard-section governance-group"><summary><span><strong>Clinical sign-off</strong><small>${APPROVALS.filter(x=>x.status==="Approved").length} of ${APPROVALS.length} approvals complete</small></span><b>⌄</b></summary><div class="governance-list">${APPROVALS.map(x=>`<article><span class="approval-state ${x.status.toLowerCase()}">${esc(x.status)}</span><div><strong>${esc(x.role)}</strong><small>${x.approvedBy?`${esc(x.approvedBy)} · ${esc(x.date)}`:"Reviewer and date required"}</small></div></article>`).join("")}<div class="institution-list"><strong>Institutional fields</strong>${INSTITUTIONAL_PLACEHOLDERS.map(x=>`<div><span>${esc(x.label)}</span><b>${esc(x.value||"Not configured")}</b></div>`).join("")}</div></div></details>
      <details class="dashboard-section references-group"><summary><span><strong>Sources + review status</strong><small>${REFERENCES.length} references · prototype ${APP_VERSION}</small></span><b>⌄</b></summary><div class="references"><div class="reference-list">${REFERENCES.map(r=>`<article><div><strong>${esc(r.title)}</strong><small>${r.year} · ${esc(r.short)}</small><p>${esc(r.note)}</p></div>${r.url?`<a href="${r.url}" target="_blank" rel="noopener">Open ↗</a>`:"<span>PDF</span>"}</article>`).join("")}</div><div class="version-card"><strong>Clinical review required</strong><span>Content review: ${CONTENT_REVIEW_DATE}</span><p>Institutional approval is required before clinical release.</p></div></div></details>
    </section>`;
}
function educationCard(x){return `<button class="education-card ${x.accent}" data-education="${x.id}"><small>${esc(x.kicker)}</small><strong>${esc(x.title)}</strong><span>Open ›</span></button>`;}

function openTaskInfo(emergencyId,taskId){
  const e=EMERGENCIES[emergencyId],t=e.tasks.find(x=>x.id===taskId);if(!t)return;
  openSheet({eyebrow:t.group,title:t.title,html:`<p class="lead">${esc(t.detail)}</p>${t.review?`<div class="warning-box"><strong>Requires local decision</strong><p>${esc(t.review)}</p></div>`:""}${t.meds?`<h3>Related medications</h3><div class="sheet-link-list">${t.meds.map(id=>{const m=getMedication(id);return `<button data-med-id="${id}"><span>Rx</span><div><strong>${esc(m.name)}</strong><small>${esc(m.context)}</small></div><b>›</b></button>`;}).join("")}</div>`:""}<h3>Evidence basis</h3>${refTags(e.source)}`});
}
function openMedication(id,recordable=!!session){
  const m=getMedication(id),r=getReference(m.source);if(!m)return;
  const belongsToActiveEmergency=!!session&&EMERGENCIES[session.emergencyId].tasks.some(task=>task.meds?.includes(id));
  const canRecord=recordable&&belongsToActiveEmergency;
  const prior=session?.doseCounts?.[id]||0,steps=m.workflowSteps||m.doseSteps||[],step=steps.length?steps[Math.min(prior,steps.length-1)]:null,limit=m.maxDoses||steps.length||null,reached=!!limit&&prior>=limit;
  const stepLabel=reached?"PATHWAY LIMIT REACHED":step?`NEXT · ${step.label}`:"DOSE / SEQUENCE";
  const stepDose=reached?(m.nextAction||"Do not record another dose from this pathway."):(step?.dose||m.dose);
  openSheet({eyebrow:m.context,title:m.name,html:`<div class="dose-callout ${m.accent}"><small>${esc(stepLabel)}</small><strong>${esc(stepDose)}</strong>${limit?`<span>${prior} of ${limit} step${limit===1?"":"s"} recorded</span>`:""}</div>
    ${steps.length?`<ol class="dose-steps">${Array.from({length:limit||steps.length},(_,i)=>{const s=steps[Math.min(i,steps.length-1)];return `<li class="${i<prior?"done":i===prior?"next":""}"><b>${i<prior?"✓":i+1}</b><span><strong>${esc(s.label)}</strong><small>${esc(s.dose)}</small></span></li>`;}).join("")}</ol>`:""}
    <dl class="med-detail"><div><dt>Administration</dt><dd>${esc(m.administration)}</dd></div><div><dt>Repeat / reassessment</dt><dd>${esc(m.repeat)}</dd></div><div class="avoid"><dt>Avoid / use caution</dt><dd>${esc(m.avoid)}</dd></div><div><dt>Monitor</dt><dd>${esc(m.watch)}</dd></div></dl>
    ${m.toxicityTable?`<h3>Serum magnesium effects</h3><div class="toxicity-table">${m.toxicityTable.map(row=>`<div><strong>${esc(row.range)}</strong><span>${esc(row.effect)}</span></div>`).join("")}</div>`:""}
    ${canRecord&&session.status==="active"&&m.recordable!==false&&!reached?`<button class="button primary full" data-action="record-med" data-med-id="${m.id}">Confirm ${esc(step?.label||"medication given")}</button><p class="microcopy">Only tap after actual administration. This records the exact step and starts the applicable reassessment timer.</p>`:""}
    ${canRecord&&session.status==="active"&&m.doseSteps&&prior>0&&!reached?`<button class="button secondary full" data-action="finish-med-pathway" data-med-id="${m.id}">BP controlled · finish this pathway</button>`:""}
    ${m.nextAction&&reached?`<div class="warning-box"><strong>Next action</strong><p>${esc(m.nextAction)}</p></div>`:""}
    <div class="source-note"><strong>${esc(r?.short||"")}</strong><span>${esc(r?.title||"")}</span></div>`});
}
function openMedicationChooser(task){
  openSheet({eyebrow:"SELECT MEDICATION",title:"What was administered?",html:`<p class="lead">Open the medication card to verify dosing and precautions. Record only after actual administration.</p><div class="sheet-link-list">${task.meds.map(id=>{const m=getMedication(id);return `<button data-med-id="${id}"><span>Rx</span><div><strong>${esc(m.name)}</strong><small>${esc(m.context)}</small></div><b>›</b></button>`;}).join("")}</div>`});
}
function recordMedication(id){
  const m=getMedication(id);if(!session||!m)return;
  const prior=session.doseCounts[id]||0;
  if(m.maxDoses&&prior>=m.maxDoses){toast(`${m.name}: pathway dose limit reached—escalate and verify orders`,"alert");return;}
  const steps=m.workflowSteps||m.doseSteps||[],step=steps.length?steps[Math.min(prior,steps.length-1)]:null,doseText=step?.dose||m.dose;
  session.doseCounts[id]=(session.doseCounts[id]||0)+1;
  session.medicationStates[id]={step:session.doseCounts[id],label:step?.label||"Medication given",dose:doseText,updatedAt:currentElapsed()};
  logEvent(`${m.name}: ${step?.label||"administered"} · ${doseText}`,"medication");
  if(m.timer)addTimer({label:m.timerLabel||`Reassess after ${m.name}`,dueAt:sessionMinute()+m.timer,kind:"medication",medId:id});
  const e=EMERGENCIES[session.emergencyId],task=e.tasks.find(t=>t.meds?.includes(id));if(task)session.tasks[task.id]={status:"done",completedAt:currentElapsed()};
  const limit=m.maxDoses||steps.length||1,sequenceComplete=session.doseCounts[id]>=limit;
  if(task&&!sequenceComplete)session.tasks[task.id]={status:"progress",startedAt:taskState(task.id).startedAt||currentElapsed()};
  saveSession({type:"MEDICATION_ADMINISTERED",taskId:task?.id||null,status:sequenceComplete?"completed":"in_progress",payload:{medId:id,doseNumber:session.doseCounts[id],dose:doseText,stepLabel:step?.label||null}});closeSheet();render();toast(`${m.name}: ${step?.label||"recorded"}${m.timer?` · reassess in ${m.timer} min`:""}${sequenceComplete&&m.nextAction?" · pathway limit reached":""}`);
}
function finishMedicationPathway(id){
  const m=getMedication(id);if(!session||!m)return;
  const e=EMERGENCIES[session.emergencyId],task=e.tasks.find(t=>t.meds?.includes(id));
  if(task)session.tasks[task.id]={status:"done",completedAt:currentElapsed()};
  logEvent(`${m.name} pathway finished after ${session.doseCounts[id]||0} recorded dose(s)`,"medication");
  saveSession({type:"MEDICATION_PATHWAY_FINISHED",taskId:task?.id||null,status:"completed",payload:{medId:id,doses:session.doseCounts[id]||0}});closeSheet();render();toast(`${m.name} pathway finished`);
}
function openEducation(id){
  const x=EDUCATION.find(e=>e.id===id);if(!x)return;
  openSheet({eyebrow:x.kicker,title:x.title,wide:true,html:`<p class="lead">${esc(x.summary)}</p><div class="lesson-sections">${x.sections.map(s=>`<section><h3>${esc(s.h)}</h3>${s.p?`<p>${esc(s.p)}</p>`:""}${s.bullets?`<ul>${s.bullets.map(b=>`<li>${esc(b)}</li>`).join("")}</ul>`:""}</section>`).join("")}</div>${id==="teamstepps"?refTags(["ahrq-teamstepps"]):""}`});
}
function openFlow(id){flowEmergency=id;route="flowcharts";$$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.nav==="flowcharts"));render();}

function showTimers(){
  const active=session.timers.filter(t=>!t.cancelled);
  openSheet({eyebrow:"SESSION CLOCKS",title:"Timers and reminders",html:`<p class="lead">Silencing an alert does not complete its clinical task.</p><div class="timer-list">${active.length?active.sort((a,b)=>a.dueAt-b.dueAt).map(t=>`<article class="${t.dueAt<=sessionMinute()&&!t.ack?"due":""}"><div><strong>${esc(t.label)}</strong><small>${t.ack?"Acknowledged":t.dueAt<=sessionMinute()?`Overdue ${formatDue(t)}`:`Due in ${formatCountdown(t)}`}</small></div>${!t.ack?`<button data-action="ack-timer" data-timer-id="${t.id}">Acknowledge</button>`:""}</article>`).join(""):`<p class="empty">No active task timers.</p>`}</div>`});
}
function showTimeline(){
  openSheet({eyebrow:"THIS DEVICE",title:"Event timeline",html:`<p class="lead">A local operational record—not documentation in the medical record.</p><div class="timeline-list">${session.events.map(e=>`<article><time>${formatEventTime(e.at)}</time><div><strong>${esc(e.text)}</strong><small>${esc(e.type)}</small></div></article>`).join("")}</div>`});
}
function showDue(id){
  const t=session.timers.find(x=>x.id===id);if(!t)return;
  openSheet({eyebrow:"REMINDER DUE",title:t.label,html:`<div class="due-callout"><strong>${t.message?esc(t.message):"Reassess now and record the applicable clinical action."}</strong><span>${formatDue(t)}</span></div><button class="button primary full" data-action="ack-timer" data-timer-id="${t.id}">Acknowledge reminder</button><p class="microcopy">Acknowledging removes the alert. It does not mark a task complete or medication administered.</p>`});
}
function acknowledgeTimer(id){const t=session.timers.find(x=>x.id===id);if(!t)return;t.ack=true;logEvent(`Reminder acknowledged: ${t.label}`,"timer");saveSession({type:"TIMER_ACKNOWLEDGED",status:"completed",payload:{timerId:id}});closeSheet();render();}

function openFlowZoom(id){
  const e=EMERGENCIES[id];if(!e)return;
  const image=FLOW_IMAGES[e.id];
  openSheet({eyebrow:"PINCH OR USE CONTROLS",title:e.name,wide:true,html:`<div class="flow-zoom-controls"><button data-action="zoom-step" data-step="-0.25" aria-label="Zoom out">−</button><button data-action="zoom-reset">Fit</button><button data-action="zoom-step" data-step="0.25" aria-label="Zoom in">+</button><a href="${image}" target="_blank" rel="noopener">Open image ↗</a></div><div class="flow-zoom-viewport"><img id="flowZoomImage" src="${image}" alt="${esc(e.name)} quick clinical pathway"></div><p class="microcopy">Image is optimized to fit a phone screen. Magnify for detail.</p>`});
}
function zoomFlow(delta){
  const image=$("#flowZoomImage");if(!image)return;
  const current=Number(image.dataset.zoom||1),next=Math.min(3,Math.max(.75,current+delta));
  image.dataset.zoom=String(next);image.style.width=`${next*100}%`;
}
function resetFlowZoom(){const image=$("#flowZoomImage");if(image){image.dataset.zoom="1";image.style.width="100%";}}

async function shareApp(){
  const data={title:"OB Emergency Assist",text:"Phone-first obstetric emergency guidance and simulation.",url:location.href};
  try{
    if(navigator.share){await navigator.share(data);return;}
    await navigator.clipboard.writeText(location.href);toast("App link copied");
  }catch(error){if(error?.name!=="AbortError")toast("Share unavailable—copy the page address","alert");}
}
async function installApp(){
  if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;return;}
  openSheet({eyebrow:"INSTALL APP",title:"Add to your phone",html:`<div class="install-help"><strong>iPhone / iPad</strong><p>Tap Safari Share, then <b>Add to Home Screen</b>.</p><strong>Android / computer</strong><p>Open the browser menu and choose <b>Install app</b> or <b>Add to Home screen</b>.</p></div>`});
}
function toggleTextSize(){settings.largeText=!settings.largeText;saveSettings();applyDisplaySettings();toast(settings.largeText?"Larger text on":"Standard text on");}

function showAbout(){
  openSheet({eyebrow:"ABOUT THIS BUILD",title:"OB Emergency Assist",html:`<div class="about-creator"><img src="icons/ping-avatar.png" alt="Dr. Weiping Lin"><div><strong>Designed by Dr. Weiping Lin</strong><span>OB-GYN physician and medical educator</span></div></div><p class="lead">A phone-first clinical guidance and simulation prototype. It is not a medical record, does not replace clinical judgment and must be reviewed against current institutional protocols before clinical use.</p><div class="about-list"><div><strong>Version</strong><span>${APP_VERSION}</span></div><div><strong>Content review</strong><span>${CONTENT_REVIEW_DATE}</span></div><div><strong>Data</strong><span>Stored in this browser</span></div><div><strong>Offline</strong><span>Available after first load</span></div></div><h3>Shared-session transition</h3><p>The included Google Workspace adapter can later synchronize task state, timers and timelines across approved devices without rebuilding the clinical interface.</p>`});
}

function openSheet({eyebrow="",title,html,wide=false}){
  $("#sheetEyebrow").textContent=eyebrow;$("#sheetTitle").textContent=title;$("#sheetBody").innerHTML=html;$("#infoSheet").classList.toggle("wide",!!wide);$("#sheetBackdrop").hidden=false;$("#infoSheet").hidden=false;document.body.classList.add("sheet-open");setTimeout(()=>$("#infoSheet").classList.add("open"),10);
}
function closeSheet(){$("#infoSheet").classList.remove("open");document.body.classList.remove("sheet-open");setTimeout(()=>{$("#infoSheet").hidden=true;$("#sheetBackdrop").hidden=true;},180);}
function toast(message,type="ok"){
  const el=document.createElement("div");el.className=`toast ${type}`;el.setAttribute("role",type==="alert"?"alert":"status");el.textContent=message;$("#toastRegion").appendChild(el);setTimeout(()=>el.remove(),4200);
}
function confirmAction(title,text,onConfirm){
  const tpl=$("#confirmTemplate").content.cloneNode(true),card=tpl.querySelector(".confirm-card");card.querySelector("h2").textContent=title;card.querySelector("p").textContent=text;openSheet({eyebrow:"CONFIRM",title:"",html:""});$("#sheetBody").replaceChildren(card);card.addEventListener("click",e=>{if(e.target.dataset.confirm==="cancel")closeSheet();if(e.target.dataset.confirm==="yes"){closeSheet();onConfirm();}});
}
function endSession(){
  confirmAction("End this assist session?","This stops all alerts. The timeline will be cleared when you leave this session.",()=>{clearInterval(clockHandle);freezeClock();releaseWakeLock();session.status="ended";saveSession({type:"SESSION_ENDED",status:"ended"});openSheet({eyebrow:"SESSION ENDED",title:`Elapsed ${fmt(currentElapsed(),true)}`,html:`<p class="lead">Ending the app session does not label the clinical emergency resolved.</p><button class="button secondary full" data-action="show-timeline">View timeline</button><button class="button primary full" data-action="clear-session">Return to emergency home</button>`});render();});
}
function clearSession(){releaseWakeLock();session=null;store.clear();selectedEmergency=null;missedReminderCount=0;closeSheet();navigate("emergency");}

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
  if(a==="toggle-text-size")toggleTextSize();
  if(a==="share-app")shareApp();
  if(a==="install-app")installApp();
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
  if(a==="finish-med-pathway")finishMedicationPathway(b.dataset.medId);
  if(a==="dismiss-missed"){missedReminderCount=0;render();}
  if(a==="apply-update")applyUpdate();
  if(a==="zoom-flow")openFlowZoom(b.dataset.id);
  if(a==="zoom-step")zoomFlow(Number(b.dataset.step));
  if(a==="zoom-reset")resetFlowZoom();
  if(a==="show-about")showAbout();
  if(a==="end-session")endSession();
  if(a==="clear-session")clearSession();
});

document.addEventListener("input",e=>{if(e.target.id==="medSearch")updateMedicationList(e.target.value);});
$("#sheetBackdrop").addEventListener("click",closeSheet);
$("#homeButton").addEventListener("click",()=>navigate("emergency"));

function updateConnectivity(){
  const online=navigator.onLine;document.body.classList.toggle("offline",!online);updateHeader();if(!online)toast("Offline · this device continues locally","alert");
}
window.addEventListener("online",updateConnectivity);window.addEventListener("offline",updateConnectivity);
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();deferredInstallPrompt=event;});
window.addEventListener("appinstalled",()=>{deferredInstallPrompt=null;toast("App installed");});
document.addEventListener("visibilitychange",()=>{
  if(!session||session.status!=="active")return;
  if(document.hidden){hiddenAtElapsed=currentElapsed();return;}
  const hiddenAt=hiddenAtElapsed??currentElapsed();
  requestWakeLock();
  checkMilestones();
  checkDueTransitions();
  const now=currentElapsed();
  missedReminderCount=session.timers.filter(t=>!t.cancelled&&!t.ack&&(t.dueAtElapsedMs??t.dueAt*60000)>hiddenAt&&(t.dueAtElapsedMs??t.dueAt*60000)<=now).length;
  hiddenAtElapsed=null;
  render();
});

// SERVICE_WORKER_START
function showUpdateBanner(){
  const banner=$("#updateBanner");if(!banner)return;
  banner.hidden=false;
}
function watchServiceWorker(registration){
  swRegistration=registration;
  if(registration.waiting&&navigator.serviceWorker.controller)showUpdateBanner();
  registration.addEventListener("updatefound",()=>{
    const worker=registration.installing;if(!worker)return;
    worker.addEventListener("statechange",()=>{if(worker.state==="installed"&&navigator.serviceWorker.controller)showUpdateBanner();});
  });
}
function applyUpdate(){
  if(!swRegistration?.waiting){swRegistration?.update();toast("Checking for an update");return;}
  refreshingForUpdate=true;
  swRegistration.waiting.postMessage({type:"SKIP_WAITING"});
}
if("serviceWorker" in navigator){
  window.addEventListener("load",async()=>{
    try{watchServiceWorker(await navigator.serviceWorker.register("./sw.js"));await swRegistration.update();setInterval(()=>swRegistration?.update(),60*60*1000);}catch{}
  });
  navigator.serviceWorker.addEventListener("controllerchange",()=>{if(refreshingForUpdate)location.reload();});
  window.addEventListener("online",()=>swRegistration?.update());
}
// SERVICE_WORKER_END
updateConnectivity();if(session?.status==="active"){startClock();requestWakeLock();}render();
store.subscribe(next=>{
  if(suppressStoreNotification||!next||!session||next.id!==session.id)return;
  if((next.revision||0)>(session.revision||0)){session=hydrateSession(next);render();}
});
