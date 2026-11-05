import {installBackGuard} from "./back-guard.js";
import {watchForUpdate} from "./update-check.js";
import {APP_VERSION,CONTENT_REVIEW_DATE,EMERGENCIES,MEDICATIONS,EDUCATION,REFERENCES,getMedication,getReference} from "./data.js";
import {createLocalSessionStore} from "./local-session-store.js";
import {createTeamSessionStore,formatCode,normalizeCode} from "./team-sync.js";
import {TEAM_SYNC} from "./team-config.js";
import {SIM_SCENARIOS} from "./sim-scenarios.js";
import {qrcode} from "./vendor/qrcode.js";
import {PATHWAYS} from "./pathways.js";
import {EDU_DECKS} from "./edu-decks.js";
import {renderOverview,renderGuided,renderChart,mountChart,nodeStatus,TYPE_LABEL} from "./flowchart.js";
import {DECISIONS,GATED,CHECK_LABELS,DYSTOCIA,LEFT_PANEL} from "./cockpit-config.js";
import {buildChecklist,displayState} from "./task-engine.js";
import * as D from "./decisions.js";
import {createSessionClock,crossed} from "./clock.js";
import {activeAlerts,snooze as snoozeAlert,card as alertCard,banners as alertBanners} from "./alerts.js";
import {recordDose,canGive,GIVEN_AGO_MIN} from "./medications.js";
import {appendEvent,timeline as sortedTimeline,exportText} from "./history.js";
import {logManeuver,suggestNext,markDelivered,attempts} from "./dystocia.js";
import {decisionModeHTML,urgentHTML,checklistHTML,dystociaLeftHTML,maneuverLogHTML,alertCardHTML} from "./cockpit.js";

const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>[...root.querySelectorAll(s)];
const main = $("#main");
const STORAGE_KEY = "ob-emergency-assist.session.v1";
const SETTINGS_KEY = "ob-emergency-assist.settings.v1";
// Team sync is on only when team-config.js has Firebase values (Netlify build). Otherwise local only.
const TEAM_ON = typeof TEAM_SYNC!=="undefined" && !!(TEAM_SYNC.apiKey && TEAM_SYNC.databaseURL) && typeof createTeamSessionStore==="function";
const store = TEAM_ON ? createTeamSessionStore({config:TEAM_SYNC,key:STORAGE_KEY}) : createLocalSessionStore({key:STORAGE_KEY});
const SHORT_TASKS = {
  "pph-help":"Call hemorrhage response.","pph-assess":"Check bleeding, tone + vitals.","pph-massage":"Massage uterus. Start bimanual compression.","pph-access":"Get IV access, labs + blood.","pph-oxytocin":"Give oxytocin. Add uterotonics.","pph-cause":"Check 4 Ts.","pph-txa":"Consider TXA now.","pph-escalate":"Escalate ongoing bleeding.",
  "htn-help":"Call OB. Activate severe-BP response.","htn-bp":"Repeat BP within 15 minutes.","htn-symptoms":"Check severe symptoms.","htn-labs":"Get preeclampsia labs.","htn-treat":"Give first-line BP medication.","htn-mag":"Start magnesium if indicated.","htn-monitor":"Recheck BP after every dose.","htn-escalate":"Escalate persistent severe BP.",
  "ec-help":"Call for help.","ec-safety":"Protect. Left lateral. Support airway.","ec-mag":"Give magnesium.","ec-vitals":"Check BP, oxygen + neurologic status.","ec-recur":"Treat persistent/recurrent seizure.","ec-tox":"Watch for magnesium toxicity.","ec-neuro":"Do neurologic exam. Consider head CT.","ec-delivery":"Plan delivery after stabilization.",
  "arrest-help":"Call arrest team + OB. Note the time.","arrest-cpr":"CPR. Rhythm check every 2 min.","arrest-lud":"Left uterine displacement.","arrest-airway":"Early airway — most experienced.","arrest-iv":"IV above the diaphragm.","arrest-mag":"On magnesium? Stop it. Give calcium.","arrest-monitors":"Detach fetal monitors.","arrest-delivery":"No ROSC? Deliver by 5 min.","arrest-cause":"Treat the cause: A–H.","arrest-afe":"Suspect AFE? Activate massive transfusion.",
  "tr-help":"Call OB + trauma team.","tr-primary":"Primary survey: ABC.","tr-lud":"Left uterine displacement.","tr-iv":"2 large-bore IVs + labs + KB.","tr-imaging":"Don’t withhold needed imaging.","tr-fetal":"Continuous fetal monitoring.","tr-noexam":"No cervical exam until previa excluded.","tr-abruption":"Look for abruption.","tr-rh":"Rh-negative? Give RhIG.","tr-deliver":"Unstable? Expedite delivery.",
  "sd-help":"Call for help. Start the clock.","sd-avoid":"No pushing. No fundal pressure.","sd-mcroberts":"McRoberts.","sd-suprapubic":"Suprapubic pressure.","sd-posterior":"Deliver the posterior arm.","sd-rotate":"Rotate: Rubin II / Woods.","sd-allfours":"All-fours (Gaskin).","sd-episiotomy":"Consider episiotomy for room.","sd-lastresort":"Last-resort maneuvers.","sd-after":"Neonatal team · PPH watch · document."
};
const SHORT_SUMMARIES = {
  pph:"Resuscitation · 4 Ts · MTP",
  htn:"Treat urgently · Maternal safety",
  eclampsia:"Stabilize · Magnesium · Airway",
  arrest:"Resuscitation · Perimortem CS",
  trauma:"MVA · Assess · Stabilize · Deliver",
  shoulder:"Recognize · Maneuvers · Team"
};
// Emergency icons (cropped from the supplied icon set). They identify the pathway at a glance.
const EMERGENCY_ICONS = {pph:"icon-pph",htn:"icon-htn",eclampsia:"icon-eclampsia",arrest:"icon-arrest",trauma:"icon-trauma",shoulder:"icon-shoulder"};
function emergencyIcon(id,size=56){
  const n=EMERGENCY_ICONS[id];if(!n)return "";
  return `<picture class="em-icon"><source type="image/webp" srcset="img/${n}.webp"><img src="img/${n}.png" alt="" width="${size}" height="${size}" decoding="async"></picture>`;
}

let route = "emergency";
// Practice mode: team phones during a simulation (opened from Sim Master). Clinical is the default.
let practice=(()=>{try{const q=new URLSearchParams(location.search).get("practice");if(q!==null){q==="0"?sessionStorage.removeItem("oba.practice"):sessionStorage.setItem("oba.practice","1");history.replaceState(history.state,"",location.pathname);}return sessionStorage.getItem("oba.practice")==="1";}catch{return false;}})();
function setPractice(on){practice=on;try{on?sessionStorage.setItem("oba.practice","1"):sessionStorage.removeItem("oba.practice");}catch{}}
let selectedEmergency = null;
let flowEmergency = "pph";
let session = hydrateSession(store.loadSession());
let clockHandle = null;
let audioContext = null;
let settings = loadSettings();
let suppressStoreNotification = false;
let expandedTask = null; // UI-only: which compact row is open in the cockpit
let sidePanel = null;   // UI-only: which cockpit side panel is open (flow | meds | timers | timeline); starts closed
const WIDE = window.matchMedia("(min-width:680px)");

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
  route=next;if(typeof closeEduPanel==="function")closeEduPanel();
  if(opts.emergency) selectedEmergency=opts.emergency;
  $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.nav===route));
  render();
  main.focus({preventScroll:true});
  window.scrollTo({top:0,behavior:"instant"});
}

let routeStack=[],shownRoute=route,routeBack=false;
function render(){
  if(route!==shownRoute){if(!routeBack)routeStack.push(shownRoute);if(routeStack.length>20)routeStack.shift();shownRoute=route;}routeBack=false;
  const cockpit=route==="emergency"&&session?.status==="active";
  document.body.classList.toggle("in-cockpit",cockpit);
  document.body.classList.toggle("observer",!!isObserver());
  // Tab landing screens get a one-screen layout on laptops/desktops (see "Desktop fit" in styles.css).
  document.body.dataset.route=route;
  document.body.classList.toggle("landing",!cockpit&&!(route==="emergency"&&selectedEmergency));
  $("#clinicalNotice").hidden=settings.noticeDismissed||cockpit;
  if(route==="emergency") renderEmergency();
  if(route==="flowcharts") renderFlowcharts();
  if(route==="medications") renderMedications();
  if(route==="education") renderEducation();
  if(cockpit)refreshSideSheet();
  updateHeader();
  if(typeof offerUpdate==="function")offerUpdate();
}

function updateHeader(){
  const sub=$("#headerSubtitle");if(!sub)return;
  sub.textContent=session?.status==="active"?`${session.mode==="simulation"?"Simulation":"Clinical"} · ${EMERGENCIES[session.emergencyId].short}`:"Immediate guidance";
}

function renderEmergency(){
  if(session?.status==="active") return renderActiveSession();
  if(selectedEmergency) return renderEmergencyPreview(selectedEmergency);
  // Hero: text-free Clinical Aurora art with HTML title overlay (kept clear of the silhouette on the right).
  main.innerHTML=`
    <section class="hero-aurora">
      <picture>
        <source type="image/webp" srcset="img/aurora-900.webp 900w, img/aurora-1600.webp 1600w" sizes="(min-width:800px) 800px, 100vw">
        <img src="img/aurora-900.jpg" srcset="img/aurora-900.jpg 900w, img/aurora-1600.jpg 1600w" sizes="(min-width:800px) 800px, 100vw" alt="" width="1600" height="533" fetchpriority="high">
      </picture>
      <div class="hero-copy">
        <h1>OB Emergency Assist</h1>
        <p>Ready when seconds matter.</p>
      </div>
    </section>
    ${practice?`<section class="practice-band"><div><strong>Practice mode</strong><small>Sessions you start here are simulations, not real emergencies.</small></div><button class="text-button" data-action="exit-practice">Exit</button></section>`:""}
    ${practice?"":`<a class="sim-door" href="sim-master.html" aria-label="Facilitate a simulation: run a practice scenario for your team">
      <span class="sim-door-icon" aria-hidden="true">▶</span>
      <span class="em-copy"><strong>Facilitate a simulation</strong><small>Run a practice scenario for your team: patient states, timed events, observations and debrief. Best on a tablet or laptop.</small></span>
      <span class="chevron" aria-hidden="true">›</span>
    </a>`}
    <h2 class="home-label"><span>Emergency scenarios</span><span class="hero-status"><span id="connectionDot" class="status-dot"></span><span id="connectionLabel">Ready</span></span></h2>
    <section class="emergency-grid" aria-label="Emergency pathways">
      ${Object.values(EMERGENCIES).map(e=>`
        <button class="emergency-card ${e.accent}" data-emergency="${e.id}">
          ${emergencyIcon(e.id)}
          <span class="em-copy"><strong>${esc(e.name)}</strong><small>${esc(SHORT_SUMMARIES[e.id]||e.summary)}</small></span>
          <span class="chevron" aria-hidden="true">›</span>
        </button>`).join("")}
    </section>
`;
  updateConnectivity(true);
}

function renderEmergencyPreview(id){
  // One screen: identity + start on the left (top on phones), first actions beside/below. No scrolling to start.
  const e=EMERGENCIES[id];
  main.innerHTML=`<section class="ep ${e.accent}">
    <div class="ep-main">
      <button class="back-button ep-back" data-action="back-home">‹ Emergencies</button>
      <header class="ep-head">${emergencyIcon(e.id,56)}<div><p class="eyebrow">EMERGENCY GUIDE</p><h1>${esc(e.name)}</h1><p class="ep-sum">${esc(SHORT_SUMMARIES[e.id]||e.summary)}</p></div></header>
      <div class="ep-actions">
        ${practice?`<button class="button simulation large" data-action="start-session" data-mode="simulation">Start practice session</button>`:`<button class="button primary large" data-action="start-session" data-mode="clinical">Start Clinical Assist</button>`}
        <button class="button ghost" data-action="open-flow" data-id="${e.id}">Flowchart</button>
      </div>
      <p class="ep-basis"><span>Basis</span>${(e.source||[]).map(id=>getReference(id)?.short).filter(Boolean).map(esc).join(" · ")}<small>Local activation language, medication preparation and timer defaults require institutional approval.</small></p>
    </div>
    <section class="ep-first" aria-labelledby="epFirstH">
      <h2 id="epFirstH" class="eyebrow">FIRST ACTIONS · visible before the clock starts</h2>
      <ol class="ep-list">${e.tasks.slice(0,4).map((t,i)=>`<li><span class="ep-n">${i+1}</span><span class="ep-txt"><small>${esc(t.group)}</small><strong>${esc(taskLabel(t))}</strong></span><button class="info-dot" data-task-info="${t.id}" data-emergency-id="${e.id}" aria-label="More information: ${esc(taskLabel(t))}">i</button></li>`).join("")}</ol>
    </section>
  </section>`;
}

function newSession(emergencyId,mode){
  const now=Date.now();
  return {id:uid(),schemaVersion:"1.0",revision:0,emergencyId,mode,status:"active",startedAt:new Date().toISOString(),elapsedBase:0,simulationTimeMs:mode==="simulation"?0:null,lastTickAt:now,lastSavedAt:now,running:true,sound:settings.sound,tasks:{},timers:[],events:[{id:uid(),at:0,type:"session",text:`${mode==="simulation"?"Simulation":"Clinical"} assist started`}],firedMilestones:[],doseCounts:{}};
}

function startSession(id,mode){
  ensureAudio(); session=store.createSession(newSession(id,mode)); selectedEmergency=id; startClock(); render();
}

// ---------- Active session: two-state cockpit (see DESIGN-RULES.md) ----------
// State A: full-screen Decision Mode when a clinically reviewed question is due.
// State B: Split Action Dashboard — most urgent action left (55%), checklist right (45%).
const sectionOpen={}; // per session: {completed,next} collapse state (UI only)
function openState(){const k=session.id;sectionOpen[k]=sectionOpen[k]||{completed:false,next:false};return sectionOpen[k];}
function storedStatus(id){return session.tasks[id]?.status;}
function checkLabel(t){return CHECK_LABELS[t.id]||taskLabel(t);}
function cockpitCtx(){
  const nowMs=currentElapsed(),nowMin=nowMs/60000;
  return {esc,fmt,nowMs,emergencyId:session.emergencyId,label:t=>taskLabel(t).replace(/\.$/,""),check:checkLabel,sub:t=>TASK_SUBTITLES[t.id],stored:storedStatus,
    overdue:id=>!!overdueTimerFor(id),
    statusHTML:t=>taskStatusHTML(t,taskState(t.id)),
    rowState:(t,kind)=>{
      const od=overdueTimerFor(t.id);
      if(od&&kind!=="completed")return `<span class="due-pill">Due now</span>`;
      if(kind==="completed"){const by=taskState(t.id).by;return `<span class="ck-time">${fmt(taskState(t.id).completedAt||0)}${by?` · ${esc(by)}`:""}</span>`;}
      if(kind==="ongoing"){const nx=session.timers.find(x=>x.taskId===t.id&&!x.cancelled&&!x.ack);return nx?`<span class="ck-time">in <span class="live-countdown" data-due-at="${nx.dueAt}">${formatCountdown(nx)}</span></span>`:"";}
      return "";
    }};
}
function checklistModel(){
  const e=EMERGENCIES[session.emergencyId];
  D.ensureDecisionState(session);
  const overdue=new Set(getDueTimers().filter(t=>t.taskId).map(t=>t.taskId));
  return buildChecklist({tasks:e.tasks,states:session.tasks,overdue,activated:new Set(session.branch.activated),gated:new Set(GATED[e.id]||[]),pinned:session.branch.pinned});
}
const TOOL_TABS=[["actions","Actions","list"],["meds","Medications","pill","Meds"],["flow","Flowchart","tree"],["timeline","Timeline","clock"],["team","Team","team"]];
const TOOL_ICONS={list:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17"/>',pill:'<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="M9.5 9.5l5 5"/>',tree:'<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/>',clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',team:'<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="16.5" cy="9.5" r="2.6"/><path d="M15.5 14.3c2.5-.2 4.4 1.4 5 4.7"/>'};

function renderActiveSession(){
  const e=EMERGENCIES[session.emergencyId];
  const sim=session.mode==="simulation";
  const ctx=cockpitCtx();
  const take=D.takeover(session),waitingList=D.waiting(session);
  const c=checklistModel();
  const pendingCount=c.now.length+(c.mostUrgent?1:0);
  if(take){
    const d=(DECISIONS[e.id]||[]).find(x=>x.id===take.id);
    if(d){
      if(!$("#infoSheet").hidden&&$("#infoSheet").classList.contains("open"))closeSheet(); // the question takes the whole screen
      main.innerHTML=decisionModeHTML({e,d,ctx,pendingCount,waitingCount:waitingList.length});
      document.body.classList.add("decision-open");
      requestAnimationFrame(()=>$("#decisionQ")?.focus({preventScroll:true}));
      return;
    }
  }
  document.body.classList.remove("decision-open");
  const alerts=activeAlerts(session.timers,sessionMinute());
  const p1=alertCard(alerts);
  const dyst=LEFT_PANEL[e.id]==="clock";
  let left,right;
  if(dyst){
    left=dystociaLeftHTML({ctx,nextId:suggestNext(session,DYSTOCIA),delivered:session.deliveredAt??null});
    const setup=DYSTOCIA.setup.map(id=>{const t=e.tasks.find(x=>x.id===id);const s=displayState(storedStatus(id));return {task:t,kind:s==="completed"?"completed":s==="ongoing"?"ongoing":"now"};});
    right=maneuverLogHTML({config:DYSTOCIA,ctx,attempts:id=>attempts(session,id),setup});
  }else{
    const pinned=c.mostUrgent&&c.mostUrgent.id===session.branch.pinned;
    const lastNo=pinned?[...session.decisions.answers].reverse().find(a=>a.value==="no"):null;
    const q=lastNo?(DECISIONS[e.id]||[]).find(d=>d.id===lastNo.id):null;
    left=urgentHTML({t:c.mostUrgent,ctx,pinnedNote:q?`${q.q.replace(/\?$/,"")}: NO`:"",icon:emergencyIcon(e.id,72)});
    right=checklistHTML({c,ctx,open:openState()});
  }
  const tool=sidePanel&&sidePanel!=="actions";
  main.innerHTML=`
    <section class="cockpit-head ${session.mode} ${e.accent}" aria-label="Session status">
      <div class="cockpit-row">
        <button class="ch-back" data-action="session-menu" aria-label="Session menu: sound, end session"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></button>
        <h1 class="ch-title">${emergencyIcon(e.id,40)}<span class="ch-txt">${esc(e.id==="pph"?"PPH":e.short)}<span class="ch-mode"> · ${dyst?"Maneuvers":"Action Dashboard"}</span></span></h1>
        <strong id="elapsedClock" class="ch-clock" aria-label="Elapsed time">${fmt(currentElapsed())}</strong>
        ${teamPillHTML()}
        <span class="ch-badge ${sim?(session.running?"sim":"sim paused"):"live"}">${sim?(session.running?"SIMULATION":"PAUSED"):"LIVE"}</span>
        <button class="ch-menu" data-action="session-menu" aria-label="Session menu"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg></button>
      </div>
      ${statusStripHTML2(waitingList,alerts,sim)}
    </section>
    ${renderBanners(alerts)}
    ${p1?alertCardHTML(p1,ctx):""}
    <div class="dash${dyst?" dystocia":""}">
      <div class="dash-left">${left}</div>
      <aside class="dash-right" aria-label="${tool?SIDE_TITLES[sidePanel]:"Checklist"}" data-pathway="${e.id}">
        ${tool&&WIDE.matches?`<div class="tool-panel acc-${e.accent}">${sidePanelHTML(sidePanel)}</div>`:right}
      </aside>
    </div>
    <nav class="tool-bar" aria-label="Session tools">
      ${TOOL_TABS.map(([k,l,ic,short])=>{const on=(k==="actions"&&!tool)||sidePanel===k;return `<button class="${on?"active":""}" data-side="${k}" aria-pressed="${on}" aria-label="${l}"><svg viewBox="0 0 24 24" aria-hidden="true">${TOOL_ICONS[ic]}</svg>${short?`<span class="tl-long">${l}</span><span class="tl-short" aria-hidden="true">${short}</span>`:`<span>${l}</span>`}</button>`;}).join("")}
    </nav>`;
  requestAnimationFrame(updateClockDom);
}

function statusStripHTML2(waitingList,alerts,sim){
  const parts=[];
  const wq=waitingList.filter(x=>x.deferred);
  if(wq.length){const d=(DECISIONS[session.emergencyId]||[]).find(x=>x.id===wq[0].id);parts.push(`<button class="ss-decision" data-action="open-decision" data-decision="${wq[0].id}">? ${esc(d?.q||"Decision")}${wq.length>1?` +${wq.length-1}`:""}</button>`);}
  const od=getDueTimers().length;
  if(od)parts.push(`<b class="overdue-count">${od} overdue</b>`);
  const next=getFutureEvents()[0];
  if(next)parts.push(`<span class="next-up">Next: ${esc(next.label)} in <span class="live-countdown" data-due-at="${next.at}">${fmt((next.at-sessionMinute())*60000)}</span></span>`);
  if(sim&&TEAM_ON&&store.teamStatus().code){const r=store.teamStatus().role;parts.push(`<button class="role-chip${r===OBSERVER?" observer":""}" data-action="team-role" aria-label="Your simulation role: ${esc(r||"not chosen")}. Change role">${r?esc(r):"Choose your role"}</button>`);}
  if(sim)parts.push(`<button class="sim-time-btn${session.running?"":" paused"}" data-action="sim-time">${session.running?"⏩ Sim time":"⏸ Paused"}</button>`);
  return parts.length?`<div class="cockpit-status-row">${parts.join("")}</div>`:"";
}

// P2 banners (milestones, minute marks, P1 snoozed twice): visible without a tap, never a takeover.
function renderBanners(alerts){
  const list=alertBanners(alerts);
  if(!list.length)return "";
  const first=list[0].timer;
  return `<section class="alert-strip" role="status">
    <button class="alert-main" data-action="open-due" data-timer-id="${first.id}"><strong>${esc(first.label)}</strong><span>${first.message&&first.kind==="milestone"?esc(first.message):overdueSpan(first)}</span></button>
    ${list.length>1?`<button class="alert-more" data-side="timeline">+${list.length-1}</button>`:`<button class="alert-more" data-action="ack-timer" data-timer-id="${first.id}" aria-label="Acknowledge">✓</button>`}
  </section>`;
}

function showSessionMenu(){
  const sim=session.mode==="simulation";
  openSheet({eyebrow:"SESSION",title:EMERGENCIES[session.emergencyId].name,html:`<div class="session-menu">
    <button class="button secondary full" data-action="toggle-sound">${session.sound?"🔊 Sound on — mute":"🔇 Sound off — unmute"}</button>
    <button class="button secondary full" data-action="toggle-text">Larger text: ${settings.largeText?"on":"off"}</button>
    ${sim?`<button class="button secondary full" data-action="sim-time">Simulation clock</button>`:`<button class="button secondary full" data-action="live-advance">Advance time…</button>`}
    ${TEAM_ON?`<button class="button secondary full" data-action="team">${store.teamStatus().code?`👥 Team · ${formatCode(store.teamStatus().code)}`:"👥 Share with team phones"}</button>`:""}
    <button class="button danger full" data-action="end-session">End session</button></div>`});
}

// Simulation mirrors the clinical cockpit exactly; time controls live in a
// sheet opened from the "Sim time" button, and the sheet stays open across taps.
function showSimTime(){
  const next=getFutureEvents()[0];
  openSheet({eyebrow:"SIMULATION CLOCK",title:`Elapsed ${fmt(currentElapsed())}${session.running?"":" · paused"}`,html:`
    <p class="lead">${next?`Next: ${esc(next.label)} at ${fmt(next.at*60000)} elapsed.`:"No upcoming timers or milestones."}</p>
    <div class="sim-sheet-grid">
      <button class="button ${session.running?"secondary":"primary"}" data-sim="pause">${session.running?"Pause":"Resume"}</button>
      <button class="button secondary" data-sim="1">+1 min</button>
      <button class="button secondary" data-sim="5">+5 min</button>
      <button class="button primary" data-sim="next">Jump to next event</button>
    </div>
    <p class="microcopy">Advancing time fires any timers and team milestones it passes, exactly as they would in real time.</p>`});
}

function statusLineHTML(){
  const due=getDueTimers().length;
  const next=getFutureEvents()[0];
  const nextTxt=next?`Next: ${esc(next.label)} in <span class="live-countdown" data-due-at="${next.at}">${fmt((next.at-sessionMinute())*60000)}</span>`:"No upcoming reminders";
  return `${due?`<b class="overdue-count">${due} overdue</b>`:""}<span class="next-up">${nextTxt}</span>`;
}

function taskState(id){return session.tasks[id]||{status:"todo"};}
function overdueTimerFor(taskId){return getDueTimers().find(x=>x.taskId===taskId);}
function overdueSpan(t){return `<span class="live-overdue" data-due-at="${t.dueAt}">overdue ${fmt((sessionMinute()-t.dueAt)*60000)}</span> · due at ${fmt(t.dueAt*60000)}`;}
function taskStatusHTML(t,st){
  const overdue=overdueTimerFor(t.id);
  if(overdue)return `<span class="task-status overdue">${overdueSpan(overdue)}</span>`;
  const next=session.timers.find(x=>x.taskId===t.id&&!x.cancelled&&!x.ack);
  const parts=[];
  if(st.status==="progress")parts.push("In progress");
  if(st.status==="ongoing")parts.push("Ongoing");
  if(next)parts.push(`Next in <span class="live-countdown" data-due-at="${next.dueAt}">${formatCountdown(next)}</span>`);
  return parts.length?`<span class="task-status">${parts.join(" · ")}</span>`:"";
}

// Second line under a task title: the specifics a clinician scans for.
// Drawn from the reviewed task detail in data.js; keep them in sync.
const TASK_SUBTITLES={
  "pph-help":"Cart, leader, recorder, anesthesia",
  "pph-assess":"Quantified blood loss, fundus, vitals, mental status",
  "pph-massage":"Remove clots; continue while uterotonics are given",
  "pph-access":"CBC, type & crossmatch, coags, fibrinogen",
  "pph-oxytocin":"Oxytocin first; methylergonovine, carboprost or misoprostol if indicated",
  "pph-cause":"Tone · Trauma · Tissue · Thrombin",
  "pph-txa":"1 g IV over 10–20 min, within 3 h of birth",
  "pph-escalate":"Massive transfusion, device, OR, IR or hysterectomy",
  "htn-help":"SBP ≥160 or DBP ≥110",
  "htn-bp":"Correct cuff and position; confirm persistence",
  "htn-symptoms":"Headache, vision, RUQ pain, dyspnea, neuro",
  "htn-labs":"CBC, platelets, AST/ALT, creatinine, urine protein",
  "htn-treat":"Labetalol IV, hydralazine IV or nifedipine IR PO",
  "htn-mag":"Concurrent with BP treatment when possible",
  "htn-escalate":"Failed sequence, neuro signs, pulmonary edema, HELLP",
  "ec-help":"Leader, recorder, airway equipment",
  "ec-safety":"Do not restrain; prevent aspiration; monitor SpO₂",
  "ec-mag":"4–6 g IV load, then 1–2 g/h",
  "ec-vitals":"SBP ≥160 or DBP ≥110 → severe BP pathway",
  "ec-recur":"Benzodiazepine after magnesium; prepare airway",
  "ec-tox":"Respirations, reflexes, urine output; calcium ready",
  "ec-neuro":"Focal deficit, atypical or refractory seizure",
  "ec-delivery":"Stabilize first; route by obstetric factors",
  "arrest-help":"Leader, anesthesia, OB, neonatology, pharmacy",
  "arrest-cpr":"Standard ACLS doses and defibrillation",
  "arrest-lud":"Manual, continuous · fundus at or above umbilicus",
  "arrest-airway":"Difficult airway is common in pregnancy",
  "arrest-iv":"Arms or neck — avoids aortocaval delay",
  "arrest-mag":"Stop the infusion, give calcium",
  "arrest-monitors":"Out of the way of resuscitation",
  "arrest-delivery":"Prepare from minute one · deliver where you are",
  "arrest-cause":"Anesthetic · Bleeding · Cardiac · Drugs · Embolic · Fever · H’s/T’s · HTN",
  "arrest-afe":"Early coagulation check · avoid fluid overload",
  "tr-help":"Fundus at umbilicus ≈ 20 weeks",
  "tr-primary":"Mother first is the best care for the fetus",
  "tr-lud":"Manual left, or tilt 25–30°",
  "tr-iv":"Type & cross, coags, fibrinogen, Kleihauer-Betke",
  "tr-imaging":"Never withheld because of pregnancy",
  "tr-fetal":"Minimum 4 h; longer with risk signs",
  "tr-noexam":"Ultrasound: placenta location, FHR",
  "tr-abruption":"Pain, firm or tender uterus, contractions, abnormal FHR",
  "tr-rh":"Kleihauer-Betke helps size the dose",
  "tr-deliver":"With OB, anesthesia, neonatology · often cesarean",
  "sd-help":"OB, anesthesia, neonatal team · note head-delivery time",
  "sd-avoid":"Gentle axial traction only",
  "sd-mcroberts":"Hyperflex thighs onto the abdomen",
  "sd-suprapubic":"From the fetal back · never fundal",
  "sd-posterior":"Flex the elbow, sweep across the chest",
  "sd-rotate":"Into an oblique diameter",
  "sd-allfours":"Hands and knees, then retry",
  "sd-episiotomy":"Room for hands — not for the bone",
  "sd-lastresort":"Clavicle fracture · Zavanelli + cesarean · symphysiotomy",
  "sd-after":"Head-to-body interval, maneuvers in order, who did what"
};

const ICON_PATHS={
  call:'<path d="M6 3h3l2 5-2 1.5a12 12 0 0 0 5.5 5.5L16 13l5 2v3a3 3 0 0 1-3 3A16 16 0 0 1 3 6a3 3 0 0 1 3-3z"/>',
  pulse:'<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  hand:'<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-6.5a1.5 1.5 0 0 1 3 0V11m0-5a1.5 1.5 0 0 1 3 0v7.5a7 7 0 0 1-7 7h-.5A6.5 6.5 0 0 1 4 15.5V12a1.5 1.5 0 0 1 3 0v1"/>',
  iv:'<path d="M8 3h8v9a4 4 0 0 1-8 0zM8 7h4M8 10h3M12 16v5"/>',
  syringe:'<path d="M17 3l4 4M19 5l-9 9M14 6l4 4M7 13l4 4M5 19l3-3M9 11l-4 4 4 4 4-4"/>',
  search:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  alert:'<path d="M12 4l9 16H3zM12 10v4M12 17.5v.5"/>',
  shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  flask:'<path d="M9 3h6M10 3v6l-5 10a1.5 1.5 0 0 0 1.4 2h11.2a1.5 1.5 0 0 0 1.4-2L14 9V3M7.5 15h9"/>',
  brain:'<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h1V4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h-1V4z"/>',
  baby:'<circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
};
const TASK_ICONS={
  "pph-help":"call","pph-assess":"pulse","pph-massage":"hand","pph-access":"iv","pph-oxytocin":"syringe","pph-cause":"search","pph-txa":"syringe","pph-escalate":"alert",
  "htn-help":"call","htn-bp":"pulse","htn-symptoms":"eye","htn-labs":"flask","htn-treat":"syringe","htn-mag":"syringe","htn-monitor":"pulse","htn-escalate":"alert",
  "ec-help":"call","ec-safety":"shield","ec-mag":"syringe","ec-vitals":"pulse","ec-recur":"alert","ec-tox":"eye","ec-neuro":"brain","ec-delivery":"baby",
  "arrest-help":"call","arrest-cpr":"pulse","arrest-lud":"hand","arrest-airway":"shield","arrest-iv":"iv","arrest-mag":"syringe","arrest-monitors":"alert","arrest-delivery":"baby","arrest-cause":"search","arrest-afe":"alert",
  "tr-help":"call","tr-primary":"pulse","tr-lud":"hand","tr-iv":"iv","tr-imaging":"eye","tr-fetal":"pulse","tr-noexam":"alert","tr-abruption":"search","tr-rh":"syringe","tr-deliver":"baby",
  "sd-help":"call","sd-avoid":"alert","sd-mcroberts":"hand","sd-suprapubic":"hand","sd-posterior":"hand","sd-rotate":"hand","sd-allfours":"hand","sd-episiotomy":"shield","sd-lastresort":"alert","sd-after":"baby"
};
function taskIcon(t){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[TASK_ICONS[t.id]||(t.type==="med"?"syringe":"pulse")]}</svg>`;}

function completedCount(e){return e.tasks.filter(t=>taskState(t.id).status==="done").length;}
function renderCompleted(e){
  const done=e.tasks.filter(t=>taskState(t.id).status==="done");
  if(!done.length)return `<p class="empty">No completed tasks yet.</p>`;
  return done.map(t=>`<div class="completed-item"><div><strong>${esc(taskLabel(t))}</strong><small>${formatEventTime(taskState(t.id).completedAt)}</small></div><button data-task-action="reopen" data-task-id="${t.id}">Reopen</button></div>`).join("");
}

function handleTask(taskId,action){
  const e=EMERGENCIES[session.emergencyId],t=e.tasks.find(x=>x.id===taskId); if(!t)return;
  const at=currentElapsed();
  if(action==="done"&&t.type==="med"){openMedicationChooser(t);return;}
  const prev=taskState(taskId);
  const by=TEAM_ON&&session.mode==="simulation"?store.teamStatus().role||undefined:undefined;
  if(action==="start"||action==="ongoing"){session.tasks[taskId]={...prev,status:"ongoing",startedAt:at,...(by?{by}:{})};logEvent(`Ongoing: ${t.title}`,"task");}
  if(action==="done"){
    session.tasks[taskId]={...prev,status:"done",completedAt:at,...(by?{by}:{})};
    logEvent(`${t.type==="repeat"?"Assessed":"Completed"}: ${t.title}`,"task");
    cancelTaskTimers(taskId);
    if(t.type==="repeat"&&t.repeatMin) addTimer({taskId,label:t.title,dueAt:sessionMinute()+t.repeatMin,kind:"repeat"});
    if(session.branch?.pinned===taskId)session.branch.pinned=null;
  }
  if(action==="reopen"||action==="pending"){session.tasks[taskId]={status:"todo"};cancelTaskTimers(taskId);logEvent(`Undone: ${t.title}`,"task");}
  if(action==="done"||action==="ongoing"||action==="start")askDecisions(D.onTaskEvent(session,DECISIONS[e.id]||[],taskId,at));
  const type={start:"TASK_STARTED",ongoing:"TASK_MARKED_ONGOING",done:t.type==="repeat"?"ASSESSMENT_RECORDED":"TASK_COMPLETED",reopen:"TASK_REOPENED",pending:"TASK_REOPENED"}[action]||"TASK_UPDATED";
  saveSession({type,taskId,status:session.tasks[taskId]?.status||null});closeSheet();render();
}

// ---------- Decisions: triggers only ask; an answer is recorded only from a tap ----------
function decisionDef(id){return (DECISIONS[session.emergencyId]||[]).find(d=>d.id===id);}
function askDecisions(ids){
  if(!ids?.length)return;
  ids.forEach(id=>{const q=session.decisions.queue.find(x=>x.id===id);logEvent(`Question due: ${decisionDef(id)?.q||id}`,"decision",q?.dueAt??currentElapsed());});
  playAlert();
}
function answerDecision(id,value){
  const d=decisionDef(id);if(!d)return;
  const fx=D.answer(session,DECISIONS[session.emergencyId],id,value,currentElapsed());
  fx.reopen.forEach(tid=>{session.tasks[tid]={status:"todo"};cancelTaskTimers(tid);});
  logEvent(`${d.q} → ${fx.label}`,"decision");
  saveSession({type:"DECISION_ANSWERED",status:"completed",payload:{decisionId:id,value,branch:fx.branch}});
  render();if(fx.note)toast(fx.note,value==="no"?"alert":"ok");
}
function deferDecision(id){
  const d=decisionDef(id);D.defer(session,id);
  logEvent(`Back to actions — question still open: ${d?.q||id}`,"decision");
  saveSession({type:"DECISION_DEFERRED",status:"pending",payload:{decisionId:id}});render();
}
function reopenDecision(id){D.reopen(session,id);render();}

function cancelTaskTimers(taskId){session.timers.forEach(t=>{if(t.taskId===taskId)t.cancelled=true;});}
function addTimer(timer){session.timers.push({id:uid(),createdAt:sessionMinute(),createdAtWall:new Date().toISOString(),dueAtElapsedMs:timer.dueAt*60000,ack:false,cancelled:false,...timer});}
function logEvent(text,type="note",at=currentElapsed()){appendEvent(session,{text,type,at});}
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
  const milestones=session.deliveredAt!=null?[]:e.milestones.filter(m=>!session.firedMilestones.includes(m.min)&&m.min>sessionMinute()).map(m=>({at:m.min,label:m.label}));
  const asked=new Set([...(session.decisions?.answers||[]).map(a=>a.id),...(session.decisions?.queue||[]).map(q=>q.id)]);
  const questions=(DECISIONS[e.id]||[]).filter(d=>d.atMin!=null&&d.atMin>sessionMinute()&&!asked.has(d.id)).map(d=>({at:d.atMin,label:d.q}));
  return [...timerEvents,...milestones,...questions].sort((a,b)=>a.at-b.at);
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
  $$(".live-elapsed").forEach(el=>{el.textContent=fmt(currentElapsed());});
  $$(".live-overdue").forEach(el=>{el.textContent=`overdue ${fmt((now-Number(el.dataset.dueAt))*60000)}`;});
  $$(".live-countdown").forEach(el=>{el.textContent=fmt((Number(el.dataset.dueAt)-now)*60000);});
}
function freezeClock(){
  if(session?.running){session.elapsedBase=currentElapsed();session.running=false;session.lastTickAt=Date.now();session.simulationTimeMs=session.mode==="simulation"?session.elapsedBase:null;saveSession({type:"SESSION_PAUSED",status:"active"});}
}
function resumeClock(){if(session&&!session.running){session.running=true;session.lastTickAt=Date.now();saveSession({type:"SESSION_RESUMED",status:"active"});}}
function advanceSimulation(min){
  if(session.mode!=="simulation")return;
  const clock=createSessionClock(session),from=clock.now();
  clock.advance(min*60000);session.simulationTimeMs=session.elapsedBase;
  const to=clock.now(),e=EMERGENCIES[session.emergencyId];
  const items=[...session.timers.filter(t=>!t.cancelled&&!t.ack).map(t=>({atMs:t.dueAt*60000,label:t.label,t})),
    ...e.milestones.filter(m=>!session.firedMilestones.includes(m.min)).map(m=>({atMs:m.min*60000,label:m.label})),
    ...(DECISIONS[e.id]||[]).filter(d=>d.atMin!=null).map(d=>({atMs:d.atMin*60000,label:`Question: ${d.q}`}))];
  const passed=crossed(items,from,to);
  if(passed.length>1)passed.forEach(x=>{if(x.t)x.t.summarized=true;});
  logEvent(`Simulation time advanced +${Number(min).toFixed(min%1?1:0)} min`,"simulation");
  saveSession({type:"SIMULATION_TIME_ADVANCED",status:"active",payload:{minutes:min,simulationTimeMs:session.simulationTimeMs}});
  checkMilestones(passed.length>1);checkDueTransitions(true);render();
  if(passed.length>1)openSheet({eyebrow:"WHILE TIME ADVANCED",title:`${passed.length} events passed`,html:`<div class="timeline-list">${passed.map(x=>`<article><time>${fmt(x.atMs)}</time><div><strong>${esc(x.label)}</strong></div></article>`).join("")}</div><p class="microcopy">Shown together instead of one alert each. Open items stay in the banner and checklist.</p><button class="button primary full" data-action="close-sheet">Back to actions</button>`});
}
function jumpNext(){
  const next=getFutureEvents()[0];
  if(!next){toast("No future timer or milestone");return;}
  advanceSimulation(Math.max(0,next.at-sessionMinute()));
}
function checkMilestones(quiet=false){
  if(!session)return; const e=EMERGENCIES[session.emergencyId],now=sessionMinute();
  let latest=null;
  if(session.deliveredAt==null)e.milestones.forEach(m=>{
    if(now>=m.min&&!session.firedMilestones.includes(m.min)){
      session.firedMilestones.push(m.min);addTimer({label:m.label,dueAt:m.min,kind:"milestone",message:m.message,summarized:quiet});logEvent(`${m.label}: ${m.message}`,"milestone",m.min*60000);latest=m;
    }
  });
  const asked=D.onTick(session,DECISIONS[e.id]||[],currentElapsed());
  if(asked.length)askDecisions(asked);
  if(latest&&!quiet)playAlert(); // the banner shows it; no second copy as a toast
  if(latest||asked.length){lastDueCount=getDueTimers().length;saveSession({type:"MILESTONE_FIRED",status:"pending",payload:{minute:latest?.min??null}});render();}
}
let lastDueCount=0;
function checkDueTransitions(quiet=false){
  const due=getDueTimers();let changed=false;
  due.forEach(t=>{
    if(t.kind==="repeat"&&t.taskId&&!t.reactivated){t.reactivated=true;session.tasks[t.taskId]={status:"todo",dueAt:currentElapsed()};logEvent(`Reassessment due: ${t.label}`,"timer");changed=true;}
    if(t.kind==="medication"&&!t.asked){t.asked=true;const ids=D.onTimerDue(session,DECISIONS[session.emergencyId]||[],t.medId,currentElapsed());if(ids.length){askDecisions(ids);t.ack=true;}changed=true;}
  });
  if(due.length>lastDueCount){if(!quiet)playAlert();changed=true;}
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

// ---------- Flowcharts: one pathway, three views (see flowchart.js / pathways.js) ----------
let flowPicked=false;           // Flowcharts tab opens on a landing of emergencies until one is picked
let flowView="overview";             // overview | guided | chart — UI only, never touches session state
const guidedStep={},guidedBranch={};  // per pathway
const localChecks=new Set();         // reference-mode checks (no session): this screen only
let chartCtl=null,chartSaved=null;
function flowCtx(id){
  const active=session?.status==="active"&&session.emergencyId===id;
  return {sessionActive:active,localChecks,step:guidedStep[id]||0,branch:guidedBranch[id]||null,
    taskStatus:t=>active&&overdueTimerFor(t)&&taskState(t).status!=="done"?"overdue":taskState(t).status};
}
function statusStripHTML(){
  const e=EMERGENCIES[session.emergencyId];const due=getDueTimers().length;const sim=session.mode==="simulation";
  return `<div class="fc-strip ${session.mode}" role="status"><span class="mode-tag">${sim?"SIM":"CLINICAL"} · ${esc(e.short.toUpperCase())}</span><strong class="live-elapsed">${fmt(currentElapsed())}</strong>${due?`<b class="overdue-count">${due} due</b>`:""}<button data-nav-jump="emergency">Actions ›</button></div>`;
}
function renderFlowLanding(){
  main.innerHTML=`<section class="fc-landing">
    <header class="fc-land-head"><h1>Flowcharts</h1><p>Pick an emergency to see its algorithm</p></header>
    <section class="emergency-grid" aria-label="Flowcharts by emergency">${Object.values(EMERGENCIES).map(e=>`
      <button class="emergency-card ${e.accent}" data-flow-pick="${e.id}">${emergencyIcon(e.id)}<span class="em-copy"><strong>${esc(e.name)}</strong><small>${esc(SHORT_SUMMARIES[e.id]||e.summary)}</small></span><span class="chevron" aria-hidden="true">›</span></button>`).join("")}
    </section></section>`;
}
function renderFlowcharts(){
  if(!flowPicked&&session?.status!=="active"){if(chartCtl){chartCtl.destroy();chartCtl=null;}return renderFlowLanding();}
  if(chartCtl){chartSaved=flowView==="chart"?{id:flowEmergency,...chartCtl.state()}:null;chartCtl.destroy();chartCtl=null;}
  const e=EMERGENCIES[flowEmergency],p=PATHWAYS[e.id],ctx=flowCtx(e.id);
  const drafts=Object.values(p.nodes).filter(n=>n.reviewStatus==="draft").length;
  const views={overview:"Overview",guided:"Guided",chart:"Full chart"};
  const body=flowView==="guided"?renderGuided(p,ctx):flowView==="chart"?renderChart(p,ctx):renderOverview(p,ctx);
  main.innerHTML=`${session?.status==="active"?statusStripHTML():""}
    ${session?.status==="active"?"":`<button class="back-button fc-back" data-action="flow-landing">‹ All flowcharts</button>`}
    <section class="fc-head ${e.accent}">${emergencyIcon(e.id,52)}<div><h1>${esc(p.title)}</h1>
      <div class="fc-emerg" role="tablist" aria-label="Emergency">${Object.values(EMERGENCIES).map(x=>`<button role="tab" aria-selected="${x.id===e.id}" class="${x.id===e.id?"active":""}" data-flow-select="${x.id}">${esc(x.short)}</button>`).join("")}</div></div></section>
    <div class="fc-views" role="tablist" aria-label="View">${Object.entries(views).map(([k,v])=>`<button role="tab" aria-selected="${flowView===k}" class="${flowView===k?"active":""}" data-fview="${k}">${v}</button>`).join("")}</div>
    <section class="fc-body view-${flowView} acc-${e.accent}" id="fcBody" data-pathway="${p.id}">${body}</section>
    <div class="source-band"><span>Content basis</span>${refTags(p.sourceRefs)}<small>${drafts?`${drafts} step${drafts>1?"s":""} marked draft — needs source check before clinical use. `:""}A concise implementation view; the complete source and local protocol govern.</small></div>`;
  if(flowView==="chart")chartCtl=mountChart($("#fcBody"),chartSaved?.id===e.id?chartSaved:null);
}
function openNodeDetail(pid,nid){
  const p=PATHWAYS[pid],n=p?.nodes[nid];if(!n)return;const ctx=flowCtx(pid);const st=nodeStatus(n,ctx);
  const items=(n.items||[]).map(it=>{
    if(it.med){const m=getMedication(it.med);return `<button data-med-id="${it.med}"><span>Rx</span><div><strong>${esc(m.name)}</strong><small>${esc(it.text)}</small></div><b>›</b></button>`;}
    if(it.pathway)return `<button data-fpath="${it.pathway}"><span>→</span><div><strong>${esc(it.text)}</strong><small>Open pathway</small></div><b>›</b></button>`;
    const ts=it.task&&ctx.sessionActive?ctx.taskStatus(it.task):null;
    return `<div class="sheet-item"><strong>${esc(it.text)}</strong>${ts?`<small class="st-${ts}">${{todo:"To do",progress:"In progress",ongoing:"Ongoing",done:"Done",overdue:"Overdue"}[ts]||ts}</small>`:""}${it.task&&ctx.sessionActive?`<button class="text-button" data-action="goto-task" data-task-id="${it.task}">Go to action ›</button>`:""}</div>`;
  }).join("");
  const next=(n.connections||[]).map(c=>{const t=p.nodes[c.to];const label=t?t.title:p.chart.rows.flat().find(x=>typeof x==="object"&&x.group===c.to)?.label;return `<li>${c.label?`<strong>${esc(c.label)}</strong> → `:"→ "}${esc(label||"")}</li>`;}).join("");
  openSheet({eyebrow:`${TYPE_LABEL[n.type]||""}${n.urgency==="critical"?" · CRITICAL":""}${st?` · ${st.toUpperCase()}`:""}`,title:n.title,html:`
    ${n.reviewStatus==="draft"?`<div class="warning-box"><strong>Draft — needs source check</strong><p>${esc(n.reviewNote)}</p></div>`:""}
    <p class="lead">${esc(n.details||n.summary)}</p>
    ${items?`<h3>Actions</h3><div class="sheet-link-list">${items}</div>`:""}
    ${next?`<h3>Next</h3><ul class="sheet-next">${next}</ul>`:""}
    <h3>Evidence basis</h3>${refTags(n.sourceRefs||p.sourceRefs)}`});
}
function guidedCheck(key){
  const pid=flowEmergency;
  if(key.startsWith("task:")){const tid=key.slice(5);if(!(session?.status==="active"&&session.emergencyId===pid))return;
    const st=taskState(tid).status;handleTask(tid,st==="done"||st==="ongoing"?"reopen":"done");return;}
  localChecks.has(key)?localChecks.delete(key):localChecks.add(key);render();
}

// ---------- Medications & Treatment (guide → detail). Clinical text comes only from MEDICATIONS / PATHWAYS. ----------
// Generic name first, brand in parentheses. Brand names and route labels are new interface labels — pending clinical review.
const MED_BRAND={oxytocin:"Pitocin",methylergonovine:"Methergine",carboprost:"Hemabate",misoprostol:"Cytotec",txa:"Cyklokapron",labetalol:"Trandate",hydralazine:"Apresoline",nifedipine:"Procardia",lorazepam:"Ativan",midazolam:"Versed"};
const MED_GENERIC={carboprost:"Carboprost",txa:"Tranexamic acid",labetalol:"Labetalol",hydralazine:"Hydralazine",nifedipine:"Nifedipine"};
const MED_ROUTE={oxytocin:"IV infusion or IM",methylergonovine:"IM",carboprost:"IM or intramyometrial",misoprostol:"Oral, sublingual or rectal",txa:"IV · TXA",labetalol:"IV",hydralazine:"IV",nifedipine:"PO, immediate release",magnesium:"IV (IM if no IV access)","calcium-gluconate":"IV",lorazepam:"IV",midazolam:"IM"};
function medTitle(id){const m=getMedication(id);const g=MED_GENERIC[id]||m.name;return MED_BRAND[id]?`${g} (${MED_BRAND[id]})`:g;}
// First sentence of the reviewed "avoid" text, shown in full before a medication is opened.
function medCaution(m){const t=(m.avoid||"").trim();const first=(t.match(/^.*?\.(\s|$)/)||[t])[0].trim();return first;}
const MED_CATS={
  hemorrhage:{name:"Hemorrhage",accent:"crimson",icon:"pph",line:"Uterotonics, TXA, bleeding control and escalation",groups:[
    {h:"Initial response",p:"Start treatment while assessing the bleeding source.",items:[{med:"oxytocin"},{node:"uterotonics",label:"Uterine massage · bimanual compression",sub:"Hands-on measures for atony"}]},
    {h:"Additional uterotonics",p:"Persistent atony: choose an agent based on contraindications.",items:[{med:"methylergonovine"},{med:"carboprost"},{med:"misoprostol"}]},
    {h:"Early adjunct",p:"TXA accompanies early treatment.",items:[{med:"txa"}]},
    {h:"Bleeding control",p:"Consider the bleeding source and appropriate control measures.",items:[{node:"fourts",label:"Cause-directed care (4 Ts)",sub:"Tone · Trauma · Tissue · Thrombin"},{node:"escalate",label:"Hemorrhage-control devices",sub:"Balloon or vacuum device · must not delay definitive care"}]},
    {h:"Resuscitation & escalation",p:"Escalate according to bleeding, clinical condition and local protocol.",items:[{node:"resus",label:"Resuscitation",sub:"Access, labs, blood products"},{node:"escalate",label:"Escalation · MTP · OR / IR",sub:"Massive transfusion, operating room, interventional radiology, transfer"}]}
  ],note:"Treatment groups, not sequential steps — they often run at the same time."},
  htn:{name:"Severe hypertension",accent:"amber",icon:"htn",line:"First-line IV and oral antihypertensives",groups:[
    {h:"Medications",p:"Guide being rebuilt in the new format — medications and full details below.",items:[{med:"labetalol"},{med:"hydralazine"},{med:"nifedipine"}]}]},
  seizure:{name:"Seizure & magnesium",accent:"violet",icon:"eclampsia",line:"Magnesium, toxicity rescue and persistent seizure",groups:[
    {h:"Medications",p:"Guide being rebuilt in the new format — medications and full details below.",items:[{med:"magnesium"},{med:"calcium-gluconate"},{med:"lorazepam"},{med:"midazolam"}]}]}
};
let medState={cat:null,sel:null,q:""}; // UI only
function medRow(it,catId){
  if(it.med){const m=getMedication(it.med);if(!m)return "";const on=medState.sel===it.med;
    return `<button class="mt-row${on?" on":""}" data-med-pick="${it.med}" aria-pressed="${on}" aria-describedby="mtc-${it.med}"><span class="mt-copy"><strong>${esc(medTitle(it.med))}</strong><small>${esc(MED_ROUTE[it.med]||"")}</small><b class="mt-warn" aria-hidden="true" title="${esc(medCaution(m))}">⚠</b><span class="mt-cau sr-only" id="mtc-${it.med}">Caution: ${esc(medCaution(m))}</span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>`;}
  return `<button class="mt-row ref" data-med-node="${it.node}" data-pathway-id="pph"><span class="mt-copy"><strong>${esc(it.label)}</strong><small>${esc(it.sub||"")}</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>`;
}
function medDetailHTML(id,{back=false}={}){
  const m=getMedication(id);if(!m)return "";const r=getReference(m.source);const live=session?.status==="active";
  return `<article class="mt-detail ${m.accent}" aria-labelledby="mtDetailH">
    ${back?`<button class="back-button mt-back" data-action="med-back">‹ Back to ${esc(MED_CATS[medState.cat]?.name.toLowerCase()||"medications")}</button>`:""}
    <p class="mt-eyebrow">SELECTED TREATMENT</p>
    <h2 id="mtDetailH">${esc(medTitle(id))}</h2>
    <p class="mt-sub">${esc(m.context)}${MED_ROUTE[id]?` · ${esc(MED_ROUTE[id])}`:""}</p>
    <div class="mt-caution" role="note"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9.5 17H2.5z"/><path d="M12 10v4.5M12 17.5v.2"/></svg><div><strong>Contraindications &amp; key cautions</strong><p>${esc(m.avoid)}</p></div></div>
    <section class="mt-sec"><h3>Dose &amp; route</h3><p class="mt-dose">${esc(m.dose)}</p></section>
    <details class="mt-sec"${innerHeight>720?" open":""}><summary><h3>Repeat / maximum</h3></summary><p>${esc(m.repeat)}</p></details>
    <details class="mt-sec"><summary><h3>Monitoring &amp; reassessment</h3></summary><p>${esc(m.watch)}</p></details>
    <details class="mt-sec"><summary><h3>Administration</h3></summary><p>${esc(m.administration)}</p></details>
    <details class="mt-sec"><summary><h3>Source &amp; review</h3></summary><p>${esc(r?.title||"")}${r?.year?` (${esc(r.year)})`:""}. Content review ${esc(CONTENT_REVIEW_DATE)}. Follow your institution's approved protocol.</p></details>
    ${live?`<button class="button primary full" data-med-id="${id}">Record a dose in the running session…</button>`:""}
  </article>`;
}
function renderMedications(){
  const q=medState.q.trim().toLowerCase();
  const narrow=!matchMedia("(min-width:900px)").matches;
  const search=`<label class="mt-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span class="sr-only">Search medication or treatment</span><input id="medSearch" type="search" placeholder="Search medication or treatment" value="${esc(medState.q)}" autocomplete="off"></label>`;
  const tabs=`<div class="mt-tabs" role="tablist" aria-label="Category">${Object.entries(MED_CATS).map(([k,c])=>`<button role="tab" aria-selected="${medState.cat===k}" class="${medState.cat===k?"on":""}" data-med-cat="${k}">${esc(c.name)}</button>`).join("")}</div>`;
  let body="";
  if(q){
    const hits=MEDICATIONS.filter(m=>`${m.name} ${MED_BRAND[m.id]||""} ${m.context}`.toLowerCase().includes(q));
    body=`<section class="mt-results" aria-label="Search results">${hits.length?hits.map(m=>`<button class="mt-row" data-med-open="${m.id}"><span class="mt-copy"><strong>${esc(medTitle(m.id))}</strong><small>${esc(m.context)}</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>`).join(""):`<p class="empty">No medication matched “${esc(medState.q)}”.</p>`}</section>`;
  }else if(!medState.cat){
    body=`<section class="mt-cats" aria-label="Browse by emergency">${Object.entries(MED_CATS).map(([k,c])=>`<button class="mt-cat ${c.accent}" data-med-cat="${k}">${emergencyIcon(c.icon,56)}<span><strong>${esc(c.name)}</strong><small>${esc(c.line)}</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>`).join("")}</section>`;
  }else{
    const c=MED_CATS[medState.cat];
    if(narrow&&medState.sel){main.innerHTML=`<section class="mt-page">${medDetailHTML(medState.sel,{back:true})}</section>`;return;}
    const guide=`<section class="mt-guide ${c.accent}"><h2 class="sr-only">${esc(c.name)}</h2>${c.note?`<p class="mt-guide-sub">${esc(c.note)}</p>`:""}
      ${c.groups.map(g=>`<div class="mt-group"><div class="mt-gh"><h3>${esc(g.h)}</h3><p>${esc(g.p)}</p></div><div class="mt-items">${g.items.map(it=>medRow(it,medState.cat)).join("")}</div></div>`).join("")}</section>`;
    const pane=narrow?"":`<aside class="mt-pane">${medState.sel?medDetailHTML(medState.sel):`<p class="mt-empty">Point at or select a treatment to see its cautions, dose and monitoring.</p>`}</aside>`;
    body=`<div class="mt-split">${guide}${pane}</div>`;
  }
  const inGuide=!!(medState.cat||q);
  main.innerHTML=`<section class="mt-page${inGuide?" in-guide":""}"><header class="mt-head"><h1>Medications &amp; Treatment</h1>${inGuide?"":search}</header>${inGuide?`<h1 class="sr-only">Medications &amp; Treatment</h1><div class="mt-bar">${tabs}${search}</div>`:""}${body}</section>`;
}
// Desktop: hovering or focusing a treatment previews its cautions and dose in the side pane before it is opened.
document.addEventListener("pointerover",e=>{const b=e.target.closest?.("[data-med-pick]");const pane=$(".mt-pane");if(!b||!pane||pane.dataset.preview===b.dataset.medPick)return;pane.dataset.preview=b.dataset.medPick;pane.innerHTML=medDetailHTML(b.dataset.medPick);});
document.addEventListener("focusin",e=>{const b=e.target.closest?.("[data-med-pick]");const pane=$(".mt-pane");if(!b||!pane)return;pane.dataset.preview=b.dataset.medPick;pane.innerHTML=medDetailHTML(b.dataset.medPick);});
document.addEventListener("pointerout",e=>{const b=e.target.closest?.("[data-med-pick]");const pane=$(".mt-pane");if(!b||!pane||e.relatedTarget?.closest?.("[data-med-pick]")===b)return;
  if(e.relatedTarget?.closest?.(".mt-pane"))return;delete pane.dataset.preview;pane.innerHTML=medState.sel?medDetailHTML(medState.sel):`<p class="mt-empty">Point at or select a treatment to see its cautions, dose and monitoring.</p>`;});
function updateMedicationList(query){medState.q=query;const pos=$("#medSearch")?.selectionStart;renderMedications();const i=$("#medSearch");if(i){i.focus();try{i.setSelectionRange(pos,pos);}catch{}}}
function medCard(m){return `<button class="med-card ${m.accent}" data-med-id="${m.id}"><div><small>${esc(m.context)}</small><strong>${esc(m.name)}</strong><p>${esc(m.dose)}</p></div><span>›</span></button>`;}

// Education is organised into a few categories (interface grouping only; deck titles and content unchanged).
const EDU_GROUPS=[
  {id:"team",name:"Teamwork & simulation",accent:"teal",topics:["teamstepps","roles","simulation"]},
  {id:"hemorrhage",name:"Hemorrhage",accent:"crimson",topics:["four-ts","t3-bleeding"]},
  {id:"htn",name:"Hypertension & seizure",accent:"amber",topics:["severe-htn","mag-safety"]},
  {id:"critical",name:"Arrest & delivery emergencies",accent:"violet",topics:["arrest-pregnancy","shoulder-dystocia"]},
  {id:"screening",name:"ED screening",accent:"navy",topics:["pregnancy-status"]}
];
// Source rows: publisher / document type above a short title. The full citation stays in the link's label and the About sheet.
const DOC_LABEL={
  "acog-pph-183":["ACOG / Practice Bulletin 183","Postpartum Hemorrhage"],
  "acog-pph-device":["ACOG / Clinical practice update","Nonsurgical Hemorrhage-Control Devices"],
  "acog-htn":["ACOG / Practice Bulletin 222","Gestational Hypertension and Preeclampsia"],
  "acog-ed-htn":["ACOG / ED algorithm","Acute Hypertension in Pregnancy & Postpartum"],
  "acog-ed-eclampsia":["ACOG / ED algorithm · PDF","Eclampsia Algorithm"],
  "acog-ed-cvd":["ACOG / ED algorithm","Cardiovascular Disease in Pregnancy & Postpartum"],
  "aha-2025-pregnancy":["AHA / 2025 Guidelines, Part 10","Cardiac Arrest in Pregnancy"],
  "smfm-afe-9":["SMFM / Clinical Guideline 9","Amniotic Fluid Embolism"],
  "acog-sd-178":["ACOG / Practice Bulletin 178","Shoulder Dystocia"],
  "aafp-trauma":["Am Fam Physician / Review","Trauma in Pregnancy"],
  "ahrq-teamstepps":["AHRQ / TeamSTEPPS","TeamSTEPPS 3.0 Curriculum"]
};
const EXT_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';
const CHEV='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
function eduGroups(){
  const known=new Set(EDU_GROUPS.flatMap(g=>g.topics));
  const extra=EDUCATION.filter(x=>!known.has(x.id)).map(x=>x.id); // any new deck still shows up
  const groups=EDU_GROUPS.map(g=>({...g,items:g.topics.map(id=>EDUCATION.find(x=>x.id===id)).filter(Boolean)}));
  if(extra.length)groups.push({id:"more",name:"More topics",accent:"navy",items:extra.map(id=>EDUCATION.find(x=>x.id===id))});
  return groups.filter(g=>g.items.length);
}
function docRow(r){const [label,title]=DOC_LABEL[r.id]||[`${r.short} · ${r.year}`,r.title];
  return `<a class="doc-link" href="${r.url}" target="_blank" rel="noopener" aria-label="${esc(r.title)} (${esc(r.year)}), opens the publisher's site"><span class="doc-copy"><small>${esc(label)}</small><strong>${esc(title)}</strong></span>${EXT_ICON}</a>`;}
function renderEducation(){
  // Dashboard: category cards on the left, source documents on the right (the list scrolls inside its panel).
  const docs=REFERENCES.filter(r=>r.url);
  main.innerHTML=`<section class="edu-dash">
    <header class="edu-head"><h1>Education</h1><p>Pick a category to see its teaching decks</p></header>
    <section class="edu-cats" aria-label="Education categories">${eduGroups().map(g=>`<button class="edu-cat ${g.accent}" data-edu-group="${g.id}" aria-haspopup="dialog">
        <span class="edu-cat-name">${esc(g.name)}</span>
        <span class="edu-meta"><span>${g.items.length} topic${g.items.length>1?"s":""}</span>${CHEV}</span></button>`).join("")}
      <button class="edu-cat docs-card" data-action="edu-docs" aria-haspopup="dialog"><span class="edu-cat-name">Source documents</span><span class="edu-meta"><span>${docs.length} documents</span>${CHEV}</span></button>
    </section>
    <aside class="edu-docs" aria-labelledby="srcDocsH"><h2 id="srcDocsH">Source documents</h2>
      <div class="doc-list">${docs.map(docRow).join("")}</div>
      <p class="doc-note">Opens the publisher’s site · needs internet · some ACOG documents ask for a member sign-in.</p>
    </aside>
  </section>`;  requestAnimationFrame(fitEduTopics);
}
// Category cards list their topics only as far as they fit; anything that would be cut off is hidden (the count stays).
function fitEduTopics(){
  $$(".edu-cat-topics").forEach(box=>{const sp=[...box.children];sp.forEach(x=>x.hidden=false);
    const lim=box.getBoundingClientRect().bottom+0.5;let cut=false;
    sp.forEach(x=>{if(cut||x.getBoundingClientRect().bottom>lim){x.hidden=true;cut=true;}});});
}
window.addEventListener("resize",()=>{if(route==="education")fitEduTopics();});
document.fonts?.ready?.then(()=>{if(route==="education")fitEduTopics();});
// Full-page panel listing a category's topics (or the source documents on small screens).
function openEduPanel({title,eyebrow,html,accent=""}){
  let el=$("#eduPanel");
  if(!el){el=document.createElement("div");el.id="eduPanel";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");document.body.appendChild(el);}
  el.className=`edu-panel ${accent}`;el.hidden=false;
  el.innerHTML=`<div class="edu-panel-head"><div><small>${esc(eyebrow)}</small><h2 id="eduPanelH">${esc(title)}</h2></div><button class="icon-button" data-action="edu-panel-close" aria-label="Close">×</button></div><div class="edu-panel-body">${html}</div>`;
  el.setAttribute("aria-labelledby","eduPanelH");document.body.classList.add("edu-panel-open");
  requestAnimationFrame(()=>el.querySelector("[data-action=edu-panel-close]")?.focus());
}
function closeEduPanel(){const el=$("#eduPanel");if(el)el.hidden=true;document.body.classList.remove("edu-panel-open");}
function openEduGroup(id){
  const g=eduGroups().find(x=>x.id===id);if(!g)return;
  openEduPanel({eyebrow:"EDUCATION",title:g.name,accent:g.accent,html:`<div class="edu-decks">${g.items.map(x=>{const n=(EDU_DECKS[x.id]||[]).length;return `<button class="edu-deck ${x.accent}" data-education="${x.id}"><span class="edu-kicker">${esc(x.kicker)}</span><strong>${esc(x.title)}</strong><span class="edu-meta"><span>${n?`${n} slides`:"Open deck"}</span>${CHEV}</span></button>`;}).join("")}</div>`});
}
function openEduDocs(){const docs=REFERENCES.filter(r=>r.url);openEduPanel({eyebrow:"EDUCATION",title:"Source documents",html:`<div class="doc-list">${docs.map(docRow).join("")}</div><p class="doc-note">Opens the publisher’s site · needs internet · some ACOG documents ask for a member sign-in.</p>`});}

// ---------- Built-in slide decks ----------
let deck=null; // {id, i}
function li(items){return `<ul class="sl-list">${items.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`;}
function slideHTML(x,s){
  const note=s.note?`<p class="sl-note">${esc(s.note)}</p>`:"";
  const h=`<h2 class="sl-title">${esc(s.title)}</h2>`;
  switch(s.kind){
    case "title":return `<div class="sl sl-cover"><span class="sl-kicker">${esc(x.kicker)}</span><h2>${esc(s.title)}</h2><p>${esc(s.sub||"")}</p><span class="sl-hint">Swipe or tap › to begin</span></div>`;
    case "cards":return `<div class="sl">${h}<div class="sl-cards n${s.cards.length}">${s.cards.map(c=>`<div class="sl-card"><h3>${esc(c.h)}</h3><p>${esc(c.t)}</p></div>`).join("")}</div>${note}</div>`;
    case "steps":return `<div class="sl">${h}<ol class="sl-steps">${s.steps.map((t,i)=>`<li><span>${i+1}</span><p>${esc(t)}</p></li>`).join("")}</ol>${s.example?`<blockquote class="sl-example"><span>Example</span>${esc(s.example)}</blockquote>`:""}${note}</div>`;
    case "script":return `<div class="sl">${h}<div class="sl-script">${s.lines.map((l,i)=>`<div class="sl-line ${i%2?"reply":""}"><span>${esc(l.who)}</span><p>${esc(l.say)}</p></div>`).join("")}</div>${note}</div>`;
    case "big":return `<div class="sl">${h}<div class="sl-big n${s.items.length}">${s.items.map(it=>`<div><strong>${esc(it.big)}</strong><span>${esc(it.label)}</span></div>`).join("")}</div>${note}</div>`;
    case "list":return `<div class="sl">${h}${li(s.items)}${note}</div>`;
    case "split":return `<div class="sl">${h}<div class="sl-split ${s.tone||""}"><div class="a"><h3>${esc(s.left.h)}</h3>${li(s.left.items)}</div><div class="b"><h3>${esc(s.right.h)}</h3>${li(s.right.items)}</div></div>${note}</div>`;
    case "do":return `<div class="sl">${h}<p class="sl-lead">${esc(s.lead)}</p><div class="sl-split do"><div class="a"><h3>Check</h3>${li(s.check)}</div><div class="b"><h3>Act</h3>${li(s.act)}</div></div>${note}</div>`;
    default:return `<div class="sl">${h}</div>`;
  }
}
function renderDeck(){
  const x=EDUCATION.find(e=>e.id===deck.id),slides=EDU_DECKS[deck.id]||[],n=slides.length,i=deck.i;
  const el=$("#eduDeck");
  el.className=`edu-deck-view ${x.accent}`;
  el.innerHTML=`<header class="dk-top"><button class="dk-x" data-deck="close" aria-label="Close slides">×</button><strong>${esc(x.title)}</strong><span class="dk-count">${i+1} / ${n}</span></header>
    <div class="dk-stage" aria-live="polite" aria-roledescription="slide" aria-label="${i+1} of ${n}">${slideHTML(x,slides[i])}</div>
    <footer class="dk-bot"><button class="dk-nav" data-deck="prev" ${i===0?"disabled":""} aria-label="Previous slide">‹</button>
      <div class="dk-dots" role="tablist">${slides.map((_,k)=>`<button role="tab" aria-selected="${k===i}" aria-label="Slide ${k+1}" class="${k===i?"on":""}" data-deck-go="${k}"></button>`).join("")}</div>
      ${i<n-1?`<button class="dk-nav next" data-deck="next" aria-label="Next slide">›</button>`:`<button class="dk-nav done" data-deck="close">Done</button>`}</footer>`;
}
function openEducation(id){
  if(!EDU_DECKS[id])return;
  deck={id,i:0};
  let el=$("#eduDeck");
  if(!el){el=document.createElement("div");el.id="eduDeck";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");document.body.appendChild(el);bindDeckGestures(el);}
  el.hidden=false;document.body.classList.add("deck-open");renderDeck();el.querySelector(".dk-nav.next,.dk-nav.done")?.focus({preventScroll:true});
}
function deckMove(d){if(!deck)return;const n=(EDU_DECKS[deck.id]||[]).length;const j=Math.max(0,Math.min(n-1,deck.i+d));if(j!==deck.i){deck.i=j;renderDeck();}}
function closeDeck(){const el=$("#eduDeck");if(el)el.hidden=true;document.body.classList.remove("deck-open");deck=null;}
function bindDeckGestures(el){
  let x0=null,y0=null;
  el.addEventListener("pointerdown",e=>{if(e.target.closest("button"))return;x0=e.clientX;y0=e.clientY;});
  el.addEventListener("pointerup",e=>{if(x0==null)return;const dx=e.clientX-x0,dy=e.clientY-y0;x0=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.3)deckMove(dx<0?1:-1);});
  el.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
    if(b.dataset.deck==="next")deckMove(1);if(b.dataset.deck==="prev")deckMove(-1);if(b.dataset.deck==="close")closeDeck();
    if(b.dataset.deckGo!=null){deck.i=Number(b.dataset.deckGo);renderDeck();}});
}
document.addEventListener("keydown",e=>{if(!deck)return;if(e.key==="ArrowRight"||e.key==="PageDown"){deckMove(1);e.preventDefault();}if(e.key==="ArrowLeft"||e.key==="PageUp"){deckMove(-1);e.preventDefault();}if(e.key==="Escape")closeDeck();});

function openTaskInfo(emergencyId,taskId){
  const e=EMERGENCIES[emergencyId],t=e.tasks.find(x=>x.id===taskId);if(!t)return;
  openSheet({eyebrow:t.group,title:t.title,html:`<p class="lead">${esc(t.detail)}</p>${t.review?`<div class="warning-box"><strong>Requires local decision</strong><p>${esc(t.review)}</p></div>`:""}${t.meds?`<h3>Related medications</h3><div class="sheet-link-list">${t.meds.map(id=>{const m=getMedication(id);return `<button data-med-id="${id}"><span>Rx</span><div><strong>${esc(m.name)}</strong><small>${esc(m.context)}</small></div><b>›</b></button>`;}).join("")}</div>`:""}<h3>Evidence basis</h3>${refTags(e.source)}`});
}
let givenAgo=0; // minutes before now the dose was actually given (chosen in the medication sheet)
function openMedication(id,recordable=!!session){
  const m=getMedication(id),r=getReference(m?.source);if(!m)return;
  const live=recordable&&session?.status==="active";
  const maxAgo=live?Math.floor(currentElapsed()/60000):0;
  let rec="";
  if(live){
    const chk=canGive(session,m);
    rec=chk.ok?`<div class="given-row" role="group" aria-label="When was it given?"><span>Given</span>${GIVEN_AGO_MIN.filter(n=>n<=Math.max(0,maxAgo)).map(n=>`<button class="chip${n===givenAgo?" on":""}" data-given-ago="${n}" data-med="${m.id}" aria-pressed="${n===givenAgo}">${n?`${n} min ago`:"Now"}</button>`).join("")}</div>
      <button class="button primary full big-confirm" data-action="record-med" data-med-id="${m.id}">Confirm given ${givenAgo?`${givenAgo} min ago`:"now"}</button>
      <p class="microcopy">Only after actual administration. The given time and the recording time are both kept; reminders run from the given time.</p>`
      :`<div class="warning-box"><strong>Dose limit reached</strong><p>${esc(chk.reason)}</p></div>`;
  }
  openSheet({eyebrow:m.context,title:m.name,html:`<div class="dose-callout ${m.accent}"><small>DOSE / SEQUENCE</small><strong>${esc(m.dose)}</strong></div>
    ${rec}
    <details class="med-more"${live?"":" open"}><summary>Administration, cautions, monitoring</summary><dl class="med-detail"><div><dt>Administration</dt><dd>${esc(m.administration)}</dd></div><div><dt>Repeat / reassessment</dt><dd>${esc(m.repeat)}</dd></div><div class="avoid"><dt>Avoid / use caution</dt><dd>${esc(m.avoid)}</dd></div><div><dt>Monitor</dt><dd>${esc(m.watch)}</dd></div></dl></details>
    <div class="source-note"><strong>${esc(r?.short||"")}</strong><span>${esc(r?.title||"")}</span></div>`});
}
function openMedicationChooser(task){
  openSheet({eyebrow:"RECORD A DOSE",title:"Which medication?",html:`<div class="sheet-link-list">${task.meds.map(id=>{const m=getMedication(id),n=session?.doseCounts?.[id]||0;return `<button data-med-id="${id}"><span>Rx</span><div><strong>${esc(m.name)}</strong><small>${esc(m.context)}${n?` · ${n} recorded`:""}</small></div><b>›</b></button>`;}).join("")}</div>`});
}
function recordMedication(id){
  const m=getMedication(id);if(!session||!m)return;
  const now=currentElapsed(),given=Math.max(0,now-givenAgo*60000);
  let r;try{r=recordDose(session,m,{givenAtMs:given,recordedAtMs:now});}catch(err){toast(err.message,"alert");return;}
  givenAgo=0;
  logEvent(`${m.name} given · dose ${r.dose.n}${given<now?` · recorded at ${fmt(now)}`:""}`,"medication",given);
  if(r.timer)addTimer(r.timer);
  const e=EMERGENCIES[session.emergencyId],task=e.tasks.find(t=>t.meds?.includes(id));
  if(task){session.tasks[task.id]={status:"done",completedAt:now};if(session.branch?.pinned===task.id)session.branch.pinned=null;askDecisions(D.onTaskEvent(session,DECISIONS[e.id]||[],task.id,now));}
  saveSession({type:"MEDICATION_ADMINISTERED",taskId:task?.id||null,status:"completed",payload:{medId:id,doseNumber:r.dose.n,givenAtMs:given,recordedAtMs:now}});closeSheet();render();toast(`${m.name} recorded${m.timer?` · reassess in ${Math.max(0,Math.round(r.timer.dueAt-now/60000))} min`:""}`);
}
function openFlow(id){flowEmergency=id;flowPicked=true;route="flowcharts";$$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.nav==="flowcharts"));render();}

// ---------- Cockpit side panels: Flowchart · Meds · Timers · Timeline ----------
// Wide screens: the right-hand column. Phones: the same content in a sheet. Never leaves the session.
const SIDE_TITLES={flow:"Pathway",meds:"Medications",timeline:"Timeline",team:"Team",timers:"Timeline"};
function sessionMeds(e){
  const ids=new Set();e.tasks.forEach(t=>(t.meds||[]).forEach(m=>ids.add(m)));
  Object.values(PATHWAYS[e.id]?.nodes||{}).forEach(n=>(n.medicationRefs||[]).forEach(m=>ids.add(m)));
  return [...ids].map(getMedication).filter(Boolean);
}
function timersHTML(){
  const active=session.timers.filter(t=>!t.cancelled&&!t.ack).sort((a,b)=>a.dueAt-b.dueAt);
  if(!active.length)return "";
  return `<h3 class="side-h">Reminders</h3><div class="timer-list">${active.map(t=>{const due=t.dueAt<=sessionMinute();return `<article class="${due?"due":""}"><div><strong>${esc(t.label)}</strong><small>${due?overdueSpan(t):`Due at ${fmt(t.dueAt*60000)} · in <span class="live-countdown" data-due-at="${t.dueAt}">${formatCountdown(t)}</span>`}</small></div><button data-action="ack-timer" data-timer-id="${t.id}">Acknowledge</button></article>`;}).join("")}</div><p class="side-note">Acknowledging a reminder does not complete its task.</p>`;
}
function sidePanelHTML(k){
  const e=EMERGENCIES[session.emergencyId];
  const head=extra=>`<div class="side-flow-head"><h2>${SIDE_TITLES[k]}</h2>${extra||""}</div>`;
  if(k==="flow")return head(`<button class="text-button" data-action="open-full-flow">Open full ›</button>`)+renderOverview(PATHWAYS[e.id],flowCtx(e.id),{compact:true});
  if(k==="meds"){
    const mine=sessionMeds(e),mineIds=new Set(mine.map(m=>m.id)),others=MEDICATIONS.filter(m=>!mineIds.has(m.id));
    const card=m=>`<button class="side-med ${m.accent}" data-med-id="${m.id}"><strong>${esc(m.name)}</strong><span>${esc(m.dose)}</span>${session.doseCounts?.[m.id]?`<em>${session.doseCounts[m.id]} dose${session.doseCounts[m.id]>1?"s":""} recorded</em>`:""}</button>`;
    return head()+`${mine.length?`<div class="side-meds">${mine.map(card).join("")}</div>`:`<p class="empty">No pathway-specific medications.</p>`}
      <details class="side-more"><summary>Other medications (${others.length})</summary><div class="side-meds">${others.map(card).join("")}</div></details>`;
  }
  if(k==="timeline"||k==="timers")return head(`<button class="text-button" data-action="export-debrief">Export</button>`)+timersHTML()+`<h3 class="side-h">Events · elapsed time</h3><div class="timeline-list">${sortedTimeline(session).map(ev=>`<article class="tl-${esc(ev.type)}"><time>${formatEventTime(ev.at)}</time><div><strong>${esc(ev.text)}</strong><small>${esc(ev.type)}</small></div></article>`).join("")}</div><p class="side-note">A local record on this device — not documentation in the medical record.</p>`;
  if(k==="team")return head()+teamHTML();
  return "";
}
function teamHTML(){
  const c=checklistModel(),roles=EDUCATION.find(x=>x.id==="roles");
  return `${session.mode==="simulation"?`<div class="sim-note"><strong>Facilitating?</strong><span>Run the scenario from Sim Master on a separate device or window — patient states, injects, observations and the debrief live there.</span><a class="button secondary" href="sim-master.html" target="_blank" rel="noopener">Open Sim Master ↗</a></div>`:""}<div class="team-stats"><div><b>${c.done}</b><span>done</span></div><div><b>${c.ongoing.length}</b><span>ongoing</span></div><div><b>${c.now.length+(c.mostUrgent?1:0)}</b><span>now</span></div><div><b>${getDueTimers().length}</b><span>overdue</span></div></div>
    ${roles?`<h3 class="side-h">Roles</h3><div class="role-list">${roles.sections.map(r=>`<article><strong>${esc(r.h)}</strong><span>${esc(r.p||"")}</span></article>`).join("")}</div>`:""}`;
}
function toggleSide(k){
  if(!session||session.status!=="active")return;
  if(k==="actions"){sidePanel=null;closeSheet();render();return;}
  if(WIDE.matches){sidePanel=sidePanel===k?null:k;render();return;}
  // Phone: open as a sheet; the tab shows as active while the sheet is open.
  sidePanel=k;render();
  openSheet({eyebrow:"SESSION · "+EMERGENCIES[session.emergencyId].short.toUpperCase(),title:SIDE_TITLES[k],wide:true,html:`<div class="sheet-side" data-pathway="${session.emergencyId}">${sidePanelHTML(k).replace(/<div class="side-flow-head"><h2>[^<]*<\/h2>/,'<div class="side-flow-head">')}</div>`});
}
function refreshSideSheet(){
  const host=$("#sheetBody .sheet-side");if(!host||!sidePanel||WIDE.matches)return;
  if(host.contains(document.activeElement)&&document.activeElement.matches("input,textarea,select"))return;
  host.innerHTML=sidePanelHTML(sidePanel).replace(/<div class="side-flow-head"><h2>[^<]*<\/h2>/,'<div class="side-flow-head">');
}
// Checklist row → status sheet. Medication tasks go through the dose confirmation.
function openCheckSheet(taskId){
  const e=EMERGENCIES[session.emergencyId],t=e.tasks.find(x=>x.id===taskId);if(!t)return;
  const st=displayState(storedStatus(taskId)),at=taskState(taskId);
  const b=(act,label,cls="secondary")=>`<button class="button ${cls} full" data-task-action="${act}" data-task-id="${t.id}">${label}</button>`;
  let actions="";
  if(st==="pending")actions=(t.type==="med"?b("done","Record dose…","primary"):b("done",t.type==="repeat"?"Assessed ✓":"Done ✓","primary"))+(t.type!=="med"?b("ongoing","Mark ongoing"):"");
  if(st==="ongoing")actions=b("done",t.type==="repeat"?"Assessed ✓":"Completed ✓","primary")+b("pending","Back to pending");
  if(st==="completed")actions=`<p class="lead">Completed at ${fmt(at.completedAt||0)} elapsed.</p>`+(t.type==="med"?b("done","Record another dose…"):"")+b("pending","Undo — back to pending");
  openSheet({eyebrow:checkLabel(t).toUpperCase(),title:taskLabel(t),html:`<div class="check-actions">${actions}</div><details class="med-more"><summary>Details</summary><p>${esc(t.detail)}</p></details>`});
}
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
function acknowledgeTimer(id){const t=session.timers.find(x=>x.id===id);if(!t)return;t.ack=true;logEvent(`Reminder acknowledged: ${t.label}`,"timer");saveSession({type:"TIMER_ACKNOWLEDGED",status:"completed",payload:{timerId:id}});if(!$("#sheetBody .sheet-side"))closeSheet();render();}


function exportDebrief(print=false){
  const e=EMERGENCIES[session.emergencyId];
  const text=exportText(session,{title:`OB Emergency Assist · ${e.name}`,fmt:ms=>fmt(ms,true)});
  if(print){const w=window.open("","_blank");if(w){w.document.write(`<pre style="font:15px/1.5 system-ui;white-space:pre-wrap">${esc(text)}</pre>`);w.document.close();w.print();}return;}
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:"text/plain"}));a.download=`ob-emergency-${session.mode}-${e.id}.txt`;document.body.appendChild(a);a.click();a.remove();
}
function logManeuverAttempt(id){
  const e=EMERGENCIES.shoulder,t=e.tasks.find(x=>x.id===id);if(!t)return;
  const at=currentElapsed(),entry=logManeuver(session,id,at);
  session.tasks[id]={status:"done",completedAt:at};
  logEvent(`${CHECK_LABELS[id]||t.title}${entry.n>1?` (attempt ${entry.n})`:""}`,"maneuver");
  saveSession({type:"MANEUVER_LOGGED",taskId:id,payload:{n:entry.n}});render();
}
function undoManeuver(){
  const last=(session.maneuvers||[]).pop();if(!last){toast("Nothing to undo");return;}
  if(!attempts(session,last.id).length)session.tasks[last.id]={status:"todo"};
  logEvent(`Undone: ${CHECK_LABELS[last.id]||last.id} log entry`,"maneuver");saveSession({type:"MANEUVER_UNDONE",taskId:last.id});render();
}
function deliveredNow(){
  const at=markDelivered(session,currentElapsed());
  logEvent(`Delivered · head-to-body ${fmt(at)}`,"maneuver");
  session.branch=session.branch||{activated:[],pinned:null};session.branch.activated=[...new Set([...(session.branch.activated||[]),"sd-after"])];
  session.timers.forEach(t=>{if(t.kind==="milestone"&&t.dueAt*60000>at)t.cancelled=true;});
  saveSession({type:"DELIVERED",payload:{atMs:at}});render();
}
function liveAdvanceWarning(){
  openSheet({eyebrow:"LIVE SESSION",title:"Time can’t be changed",html:`<p class="lead">This clock is real time. Advancing or pausing it would make the record wrong.</p><p>To practice with time controls, run a separate simulation on Sim Master. This live session keeps running.</p><a class="button primary full" href="sim-master.html" target="_blank" rel="noopener">Open Sim Master in a new tab</a><button class="button secondary full" data-action="close-sheet">Back to actions</button>`});
}

function showAbout(){
  openSheet({eyebrow:"ABOUT THIS BUILD",title:"OB Emergency Assist",html:`<div class="about-avatar"><img src="img/avatar.png" alt="" width="88" height="88"><div><strong>Dr. Weiping Lin</strong><span>Creator · OB/GYN</span></div></div><p class="lead">A phone-first clinical guidance and simulation prototype. It is not a medical record, does not replace clinical judgment and must be reviewed against current institutional protocols before clinical use.</p><div class="about-list"><div><strong>Version</strong><span>${APP_VERSION}</span></div><div><strong>Content review</strong><span>${CONTENT_REVIEW_DATE}</span></div><div><strong>Data</strong><span>Stored only in this browser</span></div><div><strong>Network</strong><span>Core content available offline after first successful load</span></div></div><h3>Planned Workspace transition</h3><p>The state engine uses event-style actions so a later Google Workspace adapter can synchronize session codes, task ownership, medication events and timelines across devices.</p>`});
}

let sheetGen=0; // a sheet opened right after a close must not be hidden by that close's delayed cleanup
function openSheet({eyebrow="",title,html,wide=false}){sheetGen++;
  $("#sheetEyebrow").textContent=eyebrow;$("#sheetTitle").textContent=title;$("#sheetBody").innerHTML=html;$("#infoSheet").classList.toggle("wide",!!wide);$("#sheetBackdrop").hidden=false;$("#infoSheet").hidden=false;document.body.classList.add("sheet-open");setTimeout(()=>$("#infoSheet").classList.add("open"),10);
}
function closeSheet(){
  // Phone: a side-panel sheet closing also clears the active tool tab.
  if(sidePanel&&!WIDE.matches){sidePanel=null;$$(".tool-bar [data-side]").forEach(b=>{const on=b.dataset.side==="actions";b.classList.toggle("active",on);b.setAttribute("aria-pressed",String(on));});}
  $("#infoSheet").classList.remove("open");document.body.classList.remove("sheet-open");const gen=++sheetGen;setTimeout(()=>{if(gen!==sheetGen)return;$("#infoSheet").hidden=true;$("#sheetBackdrop").hidden=true;},180);}
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
// ---------- Team sync (Netlify build with Firebase configured) ----------
function teamLink(code){return `${location.origin}${location.pathname.replace(/index\.html$/,"")}?team=${code}`;}
function teamPillHTML(){
  if(!TEAM_ON)return "";const st=store.teamStatus();if(!st.code)return "";
  const label={live:"Team synced",connecting:"Connecting to team",offline:"Team offline — changes will send when back online"}[st.state]||"Team";
  return `<button id="teamPill" class="ch-team ${st.state}" data-action="team" aria-label="${label} · code ${formatCode(st.code)}" title="${label}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2c2.6.2 4.6 1.7 5.1 4.8"/></svg><i aria-hidden="true"></i></button>`;
}
function qrSVG(text){
  const q=qrcode(0,"M");q.addData(text);q.make();const n=q.getModuleCount();let d="";
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))d+=`M${c+4} ${r+4}h1v1h-1z`;
  return `<svg class="team-qr" viewBox="0 0 ${n+8} ${n+8}" role="img" aria-label="QR code to join this team session" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#0b2149"/></svg>`;
}
function showTeam(){
  const st=store.teamStatus();
  if(!st.code){openSheet({eyebrow:"TEAM",title:"Share with team phones",html:`
    <p class="lead">Other phones join with a code or QR and see the same checklist, timers and clock. A tap on any phone updates all of them.</p>
    <ul class="team-facts"><li>Shared: which actions are done or ongoing, timers and the clock.</li><li>Stays on this phone: the timeline notes and medication details.</li><li>No names or patient details are entered or sent.</li></ul>
    <button class="button primary large full" data-action="team-share">Share this session</button>`});return;}
  const label={live:"Synced",connecting:"Connecting…",offline:"Offline — changes send when back online"}[st.state]||"";
  openSheet({eyebrow:"TEAM",title:"Team session",html:`
    <div class="team-code-card"><small>Team code</small><strong>${formatCode(st.code)}</strong><span class="team-state ${st.state}">${label}</span></div>
    ${qrSVG(teamLink(st.code))}
    <p class="team-hint">On another phone: scan this, or open OB Emergency Assist → <b>Join a team session</b> and enter the code.</p>
    <div class="button-row"><button class="button secondary" data-action="team-copy">Copy join link</button><button class="button ghost" data-action="team-leave">Stop sharing on this phone</button></div>`});
}
async function teamShare(){
  const btn=$("[data-action=team-share]");if(btn){btn.disabled=true;btn.textContent="Sharing…";}
  try{await store.shareSession();if(session?.mode==="simulation")showRolePicker({after:"share"});else showTeam();}
  catch(e){toast(navigator.onLine?"Could not start team sharing — try again":"No connection — team sharing needs internet","alert");if(btn){btn.disabled=false;btn.textContent="Share this session";}}
}
function teamLeave(){
  confirmAction("Stop sharing on this phone?","This phone keeps the session but stops sending and receiving team updates. Other phones keep going.",()=>{store.leaveTeam();closeSheet();render();});
}
async function teamCopy(){const st=store.teamStatus();if(!st.code)return;const link=teamLink(st.code);
  if(navigator.share){try{await navigator.share({title:"Join OB Emergency Assist team session",text:`Team code ${formatCode(st.code)}`,url:link});return;}catch{}}
  try{await navigator.clipboard.writeText(link);toast("Join link copied");}catch{toast(`Code ${formatCode(st.code)}`);}
}
function showTeamJoin(prefill=""){
  openSheet({eyebrow:"TEAM",title:"Join a team session",html:`
    <p class="lead">Enter the 6-character code shown on the team lead's phone.</p>
    <label class="team-input"><span class="sr-only">Team code</span><input id="teamCode" inputmode="text" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="7" placeholder="ABC-234" value="${esc(prefill?formatCode(prefill):"")}"></label>
    ${session?.status==="active"?`<p class="warning-box"><strong>This phone has its own active session.</strong> Joining replaces it on this phone.</p>`:""}
    <button class="button primary large full" data-action="team-join-go">Join</button>`});
  requestAnimationFrame(()=>{const i=$("#teamCode");i?.focus();i?.addEventListener("keydown",e=>{if(e.key==="Enter")teamJoin();});});
}
async function teamJoin(){
  const code=normalizeCode($("#teamCode")?.value);const btn=$("[data-action=team-join-go]");
  if(code.length!==6){toast("Enter the 6-character code","alert");return;}
  if(btn){btn.disabled=true;btn.textContent="Joining…";}
  try{
    const joined=await store.joinTeam(code);
    session=hydrateSession(joined);selectedEmergency=session.emergencyId;closeSheet();
    if(session.status==="active"){ensureAudio();startClock();}
    navigate("emergency");toast(`Joined team ${formatCode(code)}`);
    if(session.mode==="simulation")showRolePicker({after:"join"});
  }catch(e){toast(e.message||"Could not join","alert");if(btn){btn.disabled=false;btn.textContent="Join";}}
}
// ---------- Simulation roles (team sessions in simulation mode only) ----------
const OBSERVER="Observer";
const DEFAULT_ROLES=["Team leader","Recorder / timekeeper","Primary nurse","Medication nurse","Anesthesia","Runner"];
// Roles come from the simulation scenarios written for this emergency; Observer is always offered.
function rolesFor(emergencyId){
  const list=[];(typeof SIM_SCENARIOS!=="undefined"?SIM_SCENARIOS:[]).filter(x=>x.emergency===emergencyId).forEach(x=>x.roles.forEach(r=>{if(!list.includes(r))list.push(r);}));
  // Scenarios name some roles more or less specifically ("Runner" vs "Runner / blood bank"): keep the specific one.
  const out=list.filter(r=>!list.some(o=>o!==r&&(o.startsWith(r+" /")||o.startsWith(r+" ("))));
  return out.length?out:DEFAULT_ROLES;
}
function isObserver(){return TEAM_ON&&session?.mode==="simulation"&&store.teamStatus().code&&store.teamStatus().role===OBSERVER;}
function showRolePicker({after}={}){
  if(!session)return;const st=store.teamStatus();const counts={};
  Object.entries(st.roster||{}).forEach(([dev,x])=>{if(dev!==st.deviceId&&x?.role)counts[x.role]=(counts[x.role]||0)+1;});
  const btn=(r,sub)=>{const n=counts[r]||0,on=st.role===r;return `<button class="role-opt${on?" on":""}${r===OBSERVER?" observer":""}" data-pick-role="${esc(r)}" aria-pressed="${on}"><strong>${esc(r)}</strong><small>${sub||(n?`${n} other phone${n>1?"s":""}`:"Open")}</small></button>`;};
  openSheet({eyebrow:"SIMULATION · TEAM "+formatCode(st.code||""),title:"Choose your role",html:`
    <p class="lead">Pick the role you're playing. Everyone sees the same checklist; your role is noted on what you tap.</p>
    <div class="rpick-list" role="group" aria-label="Team roles">${rolesFor(session.emergencyId).map(r=>btn(r)).join("")}</div>
    <p class="role-sep">Not playing a role?</p>
    <div class="rpick-list">${btn(OBSERVER,`Watch only · can't change the session${counts[OBSERVER]?` · ${counts[OBSERVER]} other${counts[OBSERVER]>1?"s":""}`:""}`)}</div>
    ${after==="share"?`<button class="button ghost full" data-action="team">Show team code and QR</button>`:""}`});
}
async function pickRole(role){
  await store.setRole(role);document.body.classList.toggle("observer",isObserver());
  closeSheet();render();toast(role===OBSERVER?"Observer · watch only":`You are: ${role}`);
}
// Observers watch: anything that changes the session is blocked on their phone.
const OBSERVER_BLOCK='[data-answer],[data-check],[data-task-action],[data-maneuver],[data-given-ago],[data-gcheck],[data-gbranch],[data-action=ack-timer],[data-action=defer-decision],[data-action=live-advance],[data-action=mark-delivered],[data-action=record-med],[data-action=sim-time],[data-action=snooze-timer],[data-action=undo-maneuver],[data-action=end-session]';
document.addEventListener("click",e=>{
  if(!isObserver())return;const b=e.target.closest(OBSERVER_BLOCK);if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();toast("Observer · watch only. Change role to take part.","alert");
},true);
function clearSession(){session=null;store.clear();selectedEmergency=null;closeSheet();navigate("emergency");}

document.addEventListener("click",e=>{
  const b=e.target.closest("button,a");if(!b)return;
  if(b.dataset.nav){goRoot(b.dataset.nav);navigate(b.dataset.nav);}
  if(b.dataset.drawerGo)drawerGo(b.dataset.drawerGo);
  if(b.dataset.flowPick){flowEmergency=b.dataset.flowPick;flowPicked=true;flowView="overview";renderFlowcharts();window.scrollTo(0,0);}
  if(b.dataset.action==="flow-landing"){flowPicked=false;renderFlowcharts();window.scrollTo(0,0);}
  if(b.dataset.navJump)navigate(b.dataset.navJump);
  if(b.dataset.emergency){selectedEmergency=b.dataset.emergency;render();}
  if(b.dataset.education)openEducation(b.dataset.education);
  if(b.dataset.eduGroup)openEduGroup(b.dataset.eduGroup);
  if(b.dataset.action==="edu-docs")openEduDocs();
  if(b.dataset.action==="edu-panel-close")closeEduPanel();
  if(b.dataset.medId)openMedication(b.dataset.medId);
  if(b.dataset.taskInfo)openTaskInfo(b.dataset.emergencyId,b.dataset.taskInfo);
  if(b.dataset.taskAction)handleTask(b.dataset.taskId,b.dataset.taskAction);
  if(b.dataset.flowSelect){flowEmergency=b.dataset.flowSelect;renderFlowcharts();}
  if(b.dataset.fview){flowView=b.dataset.fview;renderFlowcharts();}
  if(b.dataset.fpath){closeSheet();flowEmergency=b.dataset.fpath;navigate("flowcharts");}
  if(b.dataset.gstep!=null){guidedStep[flowEmergency]=Number(b.dataset.gstep);guidedBranch[flowEmergency]=null;renderFlowcharts();requestAnimationFrame(()=>$(".g-step.current")?.scrollIntoView({block:"nearest",behavior:"smooth"}));}
  if(b.dataset.gbranch){const p=PATHWAYS[flowEmergency],to=b.dataset.gbranch;const k=p.steps.findIndex(st=>st.nodes.includes(to));if(k>=0){guidedStep[flowEmergency]=k;guidedBranch[flowEmergency]=null;}else guidedBranch[flowEmergency]=to;renderFlowcharts();requestAnimationFrame(()=>$(".g-step.current")?.scrollIntoView({block:"nearest",behavior:"smooth"}));}
  if(b.dataset.gcheck)guidedCheck(b.dataset.gcheck);
  if(b.dataset.zoom&&chartCtl){const z=b.dataset.zoom;if(z==="print"){document.body.classList.add("print-chart");window.print();setTimeout(()=>document.body.classList.remove("print-chart"),500);}else if(z==="full")chartCtl.full();else if(z==="fit")chartCtl.fit();else chartCtl.zoom(z);}
  if(b.dataset.medCat){medState={cat:b.dataset.medCat,sel:null,q:""};renderMedications();window.scrollTo(0,0);}
  if(b.dataset.medPick){medState.sel=b.dataset.medPick;renderMedications();if(!matchMedia("(min-width:900px)").matches)window.scrollTo(0,0);}
  if(b.dataset.medOpen){const id=b.dataset.medOpen;const cat=Object.keys(MED_CATS).find(k=>MED_CATS[k].groups.some(g=>g.items.some(it=>it.med===id)));medState={cat,sel:id,q:""};renderMedications();window.scrollTo(0,0);}
  if(b.dataset.medNode)openNodeDetail(b.dataset.pathwayId||"pph",b.dataset.medNode);
  if(b.dataset.action==="med-back"){medState.sel=null;renderMedications();}
  if(b.dataset.medFilter){
    $$(".filter-chips button").forEach(x=>x.classList.toggle("active",x===b));
    const input=$("#medSearch");if(input){input.value=b.dataset.medFilter;updateMedicationList(b.dataset.medFilter);}
  }
  if(b.dataset.answer)answerDecision(b.dataset.decision,b.dataset.answer);
  if(b.dataset.check&&session?.status==="active")openCheckSheet(b.dataset.check);
  if(b.dataset.maneuver)logManeuverAttempt(b.dataset.maneuver);
  if(b.dataset.givenAgo!=null){givenAgo=Number(b.dataset.givenAgo);openMedication(b.dataset.med);}
  if(b.dataset.sim){if(b.dataset.sim==="pause"){session.running?freezeClock():resumeClock();render();}else if(b.dataset.sim==="next")jumpNext();else advanceSimulation(Number(b.dataset.sim));if(!$("#infoSheet").hidden&&!D.takeover(session)&&$("#sheetTitle").textContent.startsWith("Elapsed"))showSimTime();}
  const a=b.dataset.action;
  if(a==="dismiss-notice"){settings.noticeDismissed=true;saveSettings();$("#clinicalNotice").hidden=true;}
  if(a==="back-home"){selectedEmergency=null;render();}
  if(a==="exit-practice"){setPractice(false);render();}
  if(a==="start-session")startSession(selectedEmergency,b.dataset.mode);
  if(a==="open-flow")openFlow(b.dataset.id);
  if(a==="close-sheet")closeSheet();
  if(a==="sim-time"){closeSheet();setTimeout(showSimTime,200);}
  // Wide screens: toggle the side panel. Narrow: open the flowchart in a sheet so the cockpit stays put.
  // Wide: toggle the side overview. Narrow: open the full pathway page (status strip keeps the clock + a way back).
  if(b.dataset.side)toggleSide(b.dataset.side);
  if(a==="open-full-flow"){closeSheet();flowEmergency=session.emergencyId;flowPicked=true;navigate("flowcharts");}
  if(a==="goto-task"){closeSheet();expandedTask=b.dataset.taskId;flowEmergency=session.emergencyId;navigate("emergency");requestAnimationFrame(()=>$(`#card-${b.dataset.taskId}`)?.scrollIntoView({block:"center",behavior:"smooth"}));}
  if(a==="expand-task"){expandedTask=b.dataset.taskId;render();requestAnimationFrame(()=>$(`#card-${expandedTask}`)?.scrollIntoView({block:"nearest",behavior:"smooth"}));}
  if(a==="collapse-task"){expandedTask=null;render();}
  if(a==="toggle-section"){const o=openState();const k=b.dataset.section;o[k]=!(o[k]??(k==="now"||k==="ongoing"));render();}
  if(a==="defer-decision")deferDecision(b.dataset.decision);
  if(a==="open-decision")reopenDecision(b.dataset.decision);
  if(a==="snooze-timer"){const t=session.timers.find(x=>x.id===b.dataset.timerId);if(t&&snoozeAlert(t,sessionMinute())){logEvent(`Snoozed 1 min: ${t.label}`,"timer");saveSession({type:"TIMER_SNOOZED",payload:{timerId:t.id}});render();}}
  if(a==="session-menu")showSessionMenu();
  if(a==="live-advance")liveAdvanceWarning();
  if(a==="mark-delivered")confirmAction("Baby delivered?","Records the head-to-body interval now.",deliveredNow);
  if(a==="undo-maneuver")undoManeuver();
  if(a==="export-debrief")exportDebrief(false);
  if(a==="print-debrief")exportDebrief(true);

  if(a==="toggle-sound"){session.sound=!session.sound;settings.sound=session.sound;saveSettings();ensureAudio();saveSession();closeSheet();render();}
  if(a==="show-timers"){if(session?.status==="active")toggleSide("timers");else showTimers();}
  if(a==="show-timeline")showTimeline();
  if(a==="open-due")showDue(b.dataset.timerId);
  if(a==="ack-timer")acknowledgeTimer(b.dataset.timerId);
  if(a==="record-med")recordMedication(b.dataset.medId);
  if(a==="show-about")showAbout();
  if(a==="end-session")endSession();
  if(a==="team")showTeam();
  if(a==="team-share")teamShare();
  if(a==="team-leave")teamLeave();
  if(a==="team-join")showTeamJoin();
  if(a==="team-join-go")teamJoin();
  if(a==="team-role")showRolePicker();
  if(b.dataset.pickRole!=null)pickRole(b.dataset.pickRole);
  if(a==="team-copy")teamCopy();
  if(a==="clear-session")clearSession();
});

document.addEventListener("input",e=>{if(e.target.id==="medSearch")updateMedicationList(e.target.value);});
// Cockpit keyboard: Y / N answer, Esc = Back to actions, D = done on the most-urgent card.
document.addEventListener("keydown",e=>{
  if(session?.status!=="active"||route!=="emergency"||e.target.matches?.("input,textarea,select")||e.metaKey||e.ctrlKey||e.altKey)return;
  const dm=$(".decision-mode");
  if(dm){const k=e.key.toLowerCase();
    if(k==="y")dm.querySelector('[data-answer="yes"]')?.click();
    else if(k==="n")dm.querySelector('[data-answer="no"]')?.click();
    else if(e.key==="Escape")dm.querySelector(".dm-back")?.click();
    return;}
  if(e.key.toLowerCase()==="d"&&$("#infoSheet").hidden){$(".du-done")?.click();}
});
$("#sheetBackdrop").addEventListener("click",closeSheet);
// ---------- Header controls ----------
let deferredInstall=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;});
function applyTextSize(){
  document.documentElement.classList.toggle("text-lg",!!settings.largeText);
  $$("[data-action=toggle-text]").forEach(b=>b.setAttribute("aria-pressed",String(!!settings.largeText)));
  const st=$("#drawerTextState");if(st)st.textContent=settings.largeText?"On":"Off";
}
// Navigation always lands on the top page of a section (not whatever was open there before).
function goRoot(r){
  if(r==="emergency"&&session?.status!=="active")selectedEmergency=null;
  if(r==="flowcharts"){flowPicked=false;flowView="overview";}
  if(r==="education"&&deck)closeDeck();
  if(r==="medications")medState={cat:null,sel:null,q:""};
}
// Menu tree: every section's branches unfold a second after the menu opens, so people can jump straight in.
function buildMenuTree(){
  const d=$("#menuDrawer");if(!d||d.dataset.tree)return;d.dataset.tree="1";
  const em=Object.values(EMERGENCIES);
  const branches={
    emergency:em.map(e=>[`em:${e.id}`,e.name]),
    flowcharts:em.map(e=>[`fc:${e.id}`,e.name]),
    medications:Object.entries(MED_CATS).map(([k,c])=>[`med:${k}`,c.name]),
    education:(typeof eduGroups==="function"?eduGroups():[]).map(g=>[`edu:${g.id}`,g.name])
  };
  Object.entries(branches).forEach(([nav,items])=>{
    const top=d.querySelector(`:scope > [data-nav="${nav}"]`);if(!top||!items.length)return;
    const ul=document.createElement("div");ul.className="dr-branch";ul.setAttribute("role","group");ul.setAttribute("aria-label",top.textContent.trim());
    ul.innerHTML=items.map(([go,label])=>`<button data-drawer-go="${go}">${esc(label)}</button>`).join("");
    top.after(ul);
  });
}
let treeTimer=null;
function drawerGo(go){
  const [k,id]=go.split(":");closeMenu();
  if(k==="em"){if(session?.status==="active"){navigate("emergency");toast("A session is running — end it to open another emergency","alert");return;}selectedEmergency=id;navigate("emergency");}
  if(k==="fc"){flowEmergency=id;flowPicked=true;flowView="overview";navigate("flowcharts");}
  if(k==="med"){medState={cat:id,sel:null,q:""};navigate("medications");}
  if(k==="edu"){navigate("education");openEduGroup(id);}
}
function openMenu(){buildMenuTree();const dr=$("#menuDrawer");dr.classList.remove("tree");clearTimeout(treeTimer);treeTimer=setTimeout(()=>dr.classList.add("tree"),1000);const d=$("#menuDrawer");d.hidden=false;$("#drawerBackdrop").hidden=false;requestAnimationFrame(()=>d.classList.add("open"));$("[data-action=open-menu]").setAttribute("aria-expanded","true");$$("#menuDrawer [data-nav]").forEach(b=>b.classList.toggle("active",b.dataset.nav===route));}
function closeMenu(){const d=$("#menuDrawer");d.classList.remove("open");$("[data-action=open-menu]")?.setAttribute("aria-expanded","false");setTimeout(()=>{d.hidden=true;$("#drawerBackdrop").hidden=true;},160);}
async function shareApp(){
  const url=location.origin+location.pathname.replace(/index\.html$/,"");
  const data={title:"OB Emergency Assist",text:"Phone-first OB emergency guidance, timers and simulation.",url};
  if(navigator.share){try{await navigator.share(data);}catch{}return;}
  try{await navigator.clipboard.writeText(url);toast("Link copied");}
  catch{openSheet({eyebrow:"SHARE",title:"Copy this link",html:`<p class="lead">${esc(url)}</p>`});}
}
function installApp(){
  if(matchMedia("(display-mode: standalone)").matches||navigator.standalone){toast("Already installed on this device");return;}
  if(deferredInstall){deferredInstall.prompt();deferredInstall.userChoice.finally(()=>{deferredInstall=null;});return;}
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  openSheet({eyebrow:"DOWNLOAD APP",title:"Add to your home screen",html:`
    <p class="lead">Installing keeps the app one tap away and available offline after the first load.</p>
    <div class="install-steps ${ios?"":"dim-ios"}"><h3>iPhone / iPad (Safari)</h3><ol><li>Tap the Share button.</li><li>Choose <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong>.</li></ol></div>
    <div class="install-steps"><h3>Android (Chrome)</h3><ol><li>Tap the ⋮ menu.</li><li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li></ol></div>
    <div class="install-steps"><h3>Laptop (Chrome / Edge)</h3><ol><li>Click the install icon in the address bar, or the browser menu → <strong>Install</strong>.</li></ol></div>`});
}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-action]");if(!b)return;const a=b.dataset.action;
  if(a==="open-menu")openMenu();
  if(a==="close-menu")closeMenu();
  if(a==="toggle-text"){settings.largeText=!settings.largeText;saveSettings();applyTextSize();toast(settings.largeText?"Larger text on":"Larger text off");}
  if(a==="share"){closeMenu();shareApp();}
  if(a==="install"){closeMenu();installApp();}
  if(a==="show-about"&&!$("#menuDrawer").hidden)closeMenu();
});
document.addEventListener("click",e=>{const b=e.target.closest("#menuDrawer [data-nav], #menuDrawer a");if(b)closeMenu();});
document.addEventListener("click",e=>{if(e.target.closest("[data-action=close-menu]"))clearTimeout(treeTimer);});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#menuDrawer").hidden)closeMenu();});
applyTextSize();

function updateConnectivity(quiet=false){
  const online=navigator.onLine;$("#connectionDot")?.classList.toggle("offline",!online);const l=$("#connectionLabel");if(l)l.textContent=online?"Ready":"Offline";if(!online&&!quiet)toast("Offline · this device continues locally","alert");
}
window.addEventListener("online",()=>updateConnectivity());window.addEventListener("offline",()=>updateConnectivity());
// Simulation mode only: auto-pause if the app was in the background for over a minute. Clinical clock never pauses.
const AWAY_GRACE_MS=60000;
function simAway(){if(session?.status==="active"&&session.mode==="simulation"&&session.running&&session.hiddenAt==null){session.hiddenAt=Date.now();saveSession();}}
function simBack(){
  if(!session||session.hiddenAt==null)return false;const h=session.hiddenAt,now=Date.now();delete session.hiddenAt;
  if(session.mode!=="simulation"||!session.running||now-h<=AWAY_GRACE_MS){saveSession();return false;}
  const stopAt=Math.max(h+AWAY_GRACE_MS,session.lastTickAt);session.elapsedBase+=stopAt-session.lastTickAt;session.running=false;session.lastTickAt=now;session.simulationTimeMs=session.elapsedBase;
  saveSession({type:"SESSION_PAUSED",status:"active",payload:{auto:true}});toast(`Simulation auto-paused — you were away ${Math.round((now-h)/60000)} min`);return true;
}
document.addEventListener("visibilitychange",()=>{if(document.hidden){simAway();return;}if(session?.status==="active"){simBack();checkMilestones();render();}});
window.addEventListener("pagehide",simAway);
if(session?.hiddenAt!=null)simBack();

// Phone back button: close the top overlay, then step back through screens; never drop out mid-session by accident.
let leaveArmedUntil=0;
installBackGuard(()=>{
  if(deck){closeDeck();return true;}
  if($("#eduPanel")&&!$("#eduPanel").hidden){closeEduPanel();return true;}
  if(!$("#infoSheet").hidden){closeSheet();return true;}
  if(!$("#menuDrawer").hidden){closeMenu();return true;}
  if(route==="medications"&&medState.sel&&!matchMedia("(min-width:900px)").matches){medState.sel=null;render();return true;}
  if(route==="medications"&&(medState.cat||medState.q)){medState={cat:null,sel:null,q:""};render();return true;}
  if(route==="flowcharts"&&flowView!=="overview"){flowView="overview";render();return true;}
  if(route==="flowcharts"&&flowPicked&&session?.status!=="active"){flowPicked=false;render();return true;}
  const prev=routeStack.pop();
  if(prev&&prev!==route){routeBack=true;navigate(prev);return true;}
  if(route!=="emergency"){routeBack=true;navigate("emergency");return true;}
  if(session?.status==="active"&&Date.now()>leaveArmedUntil){leaveArmedUntil=Date.now()+2500;toast("Press back again to leave — the session is saved");return true;}
  return false;
});

// Splash: fade once the first screen has rendered (at least ~0.8 s so it reads, never longer than needed).
(()=>{const el=document.getElementById("splash");if(!el)return;const wait=Math.max(0,800-(Date.now()-(window.__splashAt||Date.now())));
  setTimeout(()=>{el.classList.add("done");setTimeout(()=>el.remove(),400);},wait);})();
// New version deployed: offer a reload, but never during an active session.
var updateReady=null;
function offerUpdate(){if(!updateReady||session?.status==="active"||$("#updateBand"))return;const b=document.createElement("div");b.id="updateBand";b.className="update-band";b.innerHTML=`<span>New version ready (v${esc(updateReady)})</span><button data-action="reload-app">Reload</button>`;document.body.appendChild(b);}
watchForUpdate(v=>{updateReady=v;offerUpdate();});
document.addEventListener("click",e=>{if(e.target.closest("[data-action=reload-app]"))location.reload();});
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
updateConnectivity();if(session?.status==="active")startClock();render();
store.subscribe(next=>{
  if(suppressStoreNotification||!next||!session||next.id!==session.id)return;
  const reset=!!next._teamReset;
  if(reset||(next.revision||0)>(session.revision||0)){
    const wasActive=session.status==="active";
    delete next._teamReset;session=hydrateSession(next);
    if(reset)toast("Another phone saved first — latest team state loaded. Re-check your last tap.","alert");
    if(wasActive&&session.status!=="active"){clearInterval(clockHandle);toast("The team session was ended on another phone","alert");}
    render();
  }
});
let lastRosterKey="";
if(TEAM_ON)$$("[data-team-only]").forEach(el=>{el.hidden=false;});
if(TEAM_ON){
  store.onTeamStatus(()=>{const el=$("#teamPill");if(el)el.outerHTML=teamPillHTML();const rk=JSON.stringify(store.teamStatus().roster);if(rk!==lastRosterKey){lastRosterKey=rk;if($(".rpick-list")&&!$("#infoSheet").hidden)showRolePicker();}});
  const q=new URLSearchParams(location.search).get("team");
  if(q){try{const u=new URL(location.href);u.searchParams.delete("team");history.replaceState(history.state,"",u);}catch{}showTeamJoin(normalizeCode(q));}
}

// Flowchart nodes: tap or keyboard (SVG groups are not native buttons)
document.addEventListener("click",e=>{const n=e.target.closest("[data-fnode]");if(!n)return;const host=n.closest("[data-pathway]");if(host)openNodeDetail(host.dataset.pathway,n.dataset.fnode);});
document.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const n=e.target.closest?.("g[data-fnode]");if(!n)return;e.preventDefault();const host=n.closest("[data-pathway]");if(host)openNodeDetail(host.dataset.pathway,n.dataset.fnode);});
