// Sim Master engine: one run of a branching scenario. No DOM; tested under node --test.
// Times are simulation milliseconds. Every instructor event is appended to run.log with a
// snapshot of what it changed, so Undo restores exactly the previous state.

export const TAU_MS = 60000;           // vitals drift toward the state's targets with this time constant
export const NUMERIC = ["sbp","dbp","hr","spo2","rr","fhr"];
const clone = x => JSON.parse(JSON.stringify(x));
const lv = (x,level) => !x.levels || x.levels.includes(level);

// ---------- scenario for one level ----------
export function resolve(scn,level){
  const states={};
  for(const [id,s] of Object.entries(scn.states))if(lv(s,level))states[id]={...s,id};
  for(const s of Object.values(states)){
    s.next=(s.next||[]).filter(n=>states[n.to]);
    s.suggest=(s.suggest||[]).filter(r=>lv(r,level));
  }
  const L=scn.levels[level]||{};
  const start=L.start||Object.keys(states)[0];
  return {...scn,states,start,qblStart:L.qblStart||0,note:L.note||"",
    injects:(scn.injects||[]).filter(i=>lv(i,level)&&(!i.to||states[i.to])),
    actions:(scn.actions||[]).filter(a=>lv(a,level))};
}

// ---------- run lifecycle ----------
export function createRun(scn,level,wall=Date.now()){
  const r=resolve(scn,level),st=r.states[r.start];
  return {v:2,scenarioId:scn.id,level,phase:"prebrief",createdAt:new Date(wall).toISOString(),
    clock:{elapsedBase:0,running:false,lastTickAt:wall},
    state:r.start,stateAt:0,hold:false,overrides:null,
    anchor:{at:0,vals:{...st.v},qbl:r.qblStart},
    obs:{},shown:[],notes:[],log:[],seq:0,narrative:"",confirm:{},queue:[],delivery:{},summary:{strengths:"",opportunities:"",teaching:""},
    scenarioVersion:scn.version||"1.0",reviewed:scn.reviewed??null};
}
export function simNow(run,wall=Date.now()){const c=run.clock;return c.elapsedBase+(c.running?wall-c.lastTickAt:0);}
export function startRun(run,wall=Date.now()){run.phase="run";run.clock.running=true;run.clock.lastTickAt=wall;push(run,{kind:"clock",what:"start",text:"Scenario started"},0);}
export function pause(run,wall=Date.now()){const c=run.clock;if(!c.running)return;c.elapsedBase=simNow(run,wall);c.running=false;c.lastTickAt=wall;push(run,{kind:"clock",what:"pause",text:"Paused"},c.elapsedBase);}
export function resume(run,wall=Date.now()){const c=run.clock;if(c.running)return;c.running=true;c.lastTickAt=wall;push(run,{kind:"clock",what:"resume",text:"Resumed"},c.elapsedBase);}
// Auto-pause: if the facilitator's app sat in the background longer than the grace period,
// stop the clock at hiddenAt+grace so a forgotten scenario doesn't keep running for hours.
export const AWAY_GRACE_MS=60000;
export function markAway(run,wall=Date.now()){const c=run?.clock;if(c&&c.running&&run.phase==="run"&&c.hiddenAt==null)c.hiddenAt=wall;}
export function returnFromAway(run,wall=Date.now(),grace=AWAY_GRACE_MS){
  const c=run?.clock;if(!c)return null;const h=c.hiddenAt;delete c.hiddenAt;
  if(h==null||!c.running||run.phase!=="run"||wall-h<=grace)return null;
  const stopAt=Math.max(h+grace,c.lastTickAt);c.elapsedBase=simNow(run,stopAt);c.running=false;c.lastTickAt=wall;
  push(run,{kind:"clock",what:"pause",auto:true,text:"Auto-paused — app was in the background"},c.elapsedBase);
  return {awayMs:wall-h};
}
export function advance(run,ms,wall=Date.now()){
  if(!(ms>0))return;const c=run.clock;c.elapsedBase=simNow(run,wall)+ms;c.lastTickAt=wall;
  push(run,{kind:"clock",what:"advance",text:`Time advanced +${Math.round(ms/60000*10)/10} min`},c.elapsedBase);
}

function push(run,entry,at,prev){run.seq++;run.log.push({seq:run.seq,at,wallAt:new Date().toISOString(),...entry,...(prev?{prev}:{})});return run.log[run.log.length-1];}
function snap(run){return clone({state:run.state,stateAt:run.stateAt,hold:run.hold,overrides:run.overrides,anchor:run.anchor,obs:run.obs,shown:run.shown,queue:run.queue||[],delivery:run.delivery||{}});}

// ---------- physiology ----------
function targetOf(run,scn){
  const st=scn.states[run.state]||{};
  if(run.hold)return {v:run.anchor.vals,rate:0};
  return {v:run.overrides?{...st.v,...run.overrides}:st.v||{},rate:run.overrides?.qblRate??st.qblRate??0};
}
export const QBL_MAX=6000; // cap so a forgotten or long-running scenario never shows impossible blood loss
/** States in teaching order: breadth-first from the start state along the transitions. */
export function flowOrder(scn){const seen=[scn.start],q=[scn.start];while(q.length){const st=scn.states[q.shift()];for(const n of st?.next||[])if(n.kind!=="same"&&scn.states[n.to]&&!seen.includes(n.to)){seen.push(n.to);q.push(n.to);}}for(const id of Object.keys(scn.states))if(!seen.includes(id))seen.push(id);return seen;}
export function vitalsAt(run,scn,now){
  const t=targetOf(run,scn),a=run.anchor,dt=Math.max(0,now-a.at),f=1-Math.exp(-dt/TAU_MS);
  const out={};
  for(const k of NUMERIC){const from=a.vals[k],to=t.v[k];if(to==null)continue;const x=from==null?to:from+(to-from)*f;out[k]=Math.round(x);}
  out.rhythm=t.v.rhythm??a.vals.rhythm;
  out.qbl=Math.min(QBL_MAX,Math.round(a.qbl+t.rate*dt/60000));
  out.trend={};for(const k of NUMERIC)if(t.v[k]!=null&&a.vals[k]!=null){const d=t.v[k]-out[k];out.trend[k]=Math.abs(d)<2?0:Math.sign(d);}
  return out;
}
function reanchor(run,scn,now){const v=vitalsAt(run,scn,now);const vals={};for(const k of NUMERIC)if(v[k]!=null)vals[k]=v[k];if(v.rhythm)vals.rhythm=v.rhythm;run.anchor={at:now,vals,qbl:v.qbl};}

/** CMQCC-style PPH stage (draft rule, pending review): 3 = >1500 mL or unstable (SBP <90 or HR ≥120); 2 = >1000 mL; 1 = >500 mL. */
export function pphStage(qbl,v){if(qbl>1500||(v.sbp!=null&&v.sbp<90)||(v.hr!=null&&v.hr>=120))return 3;if(qbl>1000)return 2;if(qbl>500)return 1;return 0;}

// ---------- instructor events ----------
export function goTo(run,scn,to,now,label){
  if(!scn.states[to])throw new Error(`Unknown state ${to}`);
  const prev=snap(run);reanchor(run,scn,now);
  const from=run.state;run.state=to;run.stateAt=now;run.overrides=null;run.hold=false;
  return push(run,{kind:"state",from,to,text:label||scn.states[to].name},now,prev);
}
export function setHold(run,scn,on,now){
  const prev=snap(run);reanchor(run,scn,now);run.hold=!!on;
  return push(run,{kind:"hold",on:!!on,text:on?"Held patient state":"Released hold"},now,prev);
}
export function override(run,scn,vals,now){
  const prev=snap(run);reanchor(run,scn,now);
  const clean={};for(const [k,v] of Object.entries(vals))if(v!==""&&v!=null)clean[k]=k==="rhythm"?String(v):Number(v);
  run.anchor.vals={...run.anchor.vals,...clean};run.overrides={...(run.overrides||{}),...clean};
  return push(run,{kind:"override",vals:clean,text:`Vitals set: ${Object.entries(clean).map(([k,v])=>`${k} ${v}`).join(", ")}`},now,prev);
}
export function inject(run,scn,id,now){
  const i=(scn.injects||[]).find(x=>x.id===id);if(!i)throw new Error(`Unknown inject ${id}`);
  const prev=snap(run);reanchor(run,scn,now);
  if(i.qbl)run.anchor.qbl+=i.qbl;
  if(i.v){run.anchor.vals={...run.anchor.vals,...i.v};run.overrides={...(run.overrides||{}),...i.v};}
  if(i.to&&scn.states[i.to]){run.state=i.to;run.stateAt=now;run.overrides=null;run.hold=false;}
  const forWho=i.for||(i.show?"monitor":"instructor");
  if(i.show||forWho==="monitor"||forWho==="learner"&&i.show)run.shown.push({id,text:i.text,at:now});
  const e=push(run,{kind:"inject",id,cat:i.kind,for:forWho,label:i.label,text:`${i.label}: ${i.text}`,...(i.to?{to:i.to}:{})},now,prev);
  run.delivery=run.delivery||{};run.delivery[e.seq]="delivered";
  return e;
}
/** A custom event typed by the instructor. */
export function injectCustom(run,{title,text,recipient="instructor",showOnMonitor=false},now){
  const prev=snap(run);
  if(showOnMonitor||recipient==="monitor")run.shown.push({id:"custom",text:text||title,at:now});
  const e=push(run,{kind:"inject",id:"custom",cat:"custom",for:recipient,label:title,text:`${title}${text?`: ${text}`:""}`},now,prev);
  run.delivery=run.delivery||{};run.delivery[e.seq]="delivered";return e;
}
/** Schedule an inject for later sim time. It fires from processDue(). */
export function schedule(run,scn,id,atMs,now){
  if(!(scn.injects||[]).some(x=>x.id===id))throw new Error(`Unknown inject ${id}`);
  const prev=snap(run);run.queue=run.queue||[];
  const q={qid:`q${run.seq+1}`,id,dueAt:atMs};run.queue.push(q);
  push(run,{kind:"schedule",id,dueAt:atMs,text:`Scheduled ${scn.injects.find(x=>x.id===id).label} for ${Math.round(atMs/1000)} s`},now,prev);
  return q;
}
export function cancelScheduled(run,qid,now){
  const q=(run.queue||[]).find(x=>x.qid===qid);if(!q)return null;
  const prev=snap(run);run.queue=run.queue.filter(x=>x.qid!==qid);
  return push(run,{kind:"unschedule",id:q.id,text:`Cancelled scheduled ${q.id}`},now,prev);
}
/** Fire every queued inject whose time has come (logged at its scheduled time). */
export function processDue(run,scn,now){
  const due=(run.queue||[]).filter(q=>q.dueAt<=now).sort((a,b)=>a.dueAt-b.dueAt);
  for(const q of due){run.queue=run.queue.filter(x=>x.qid!==q.qid);inject(run,scn,q.id,q.dueAt);}
  return due;
}
/** Delivery status for an inject log entry: queued (in run.queue), delivered, acknowledged. */
export function acknowledge(run,seq,now){
  const e=run.log.find(x=>x.seq===seq);if(!e)return null;
  run.delivery=run.delivery||{};run.delivery[seq]="acknowledged";
  return push(run,{kind:"ack",ref:seq,text:`Acknowledged: ${e.label||e.text}`},now);
}
/** status: "observed" | "missed" | "na" | null (clear) */
export function observe(run,actionId,status,now){
  const prev=snap(run);
  if(status)run.obs[actionId]={status,at:now};else delete run.obs[actionId];
  return push(run,{kind:"obs",action:actionId,status,text:status?`${status}: ${actionId}`:`cleared: ${actionId}`},now,prev);
}
/** Quality and comment for an observation (does not change its status). */
export function observeDetail(run,actionId,{quality,comment},now){
  const prev=snap(run),o=run.obs[actionId]||{status:null,at:null};
  run.obs[actionId]={...o,...(quality!==undefined?{quality}:{}),...(comment!==undefined?{comment}:{})};
  return push(run,{kind:"obsdetail",action:actionId,quality,comment,text:`Detail: ${actionId}${quality?` · ${quality}`:""}${comment?` · ${comment}`:""}`},now,prev);
}
export function note(run,text,now){run.notes.push({at:now,text});return push(run,{kind:"note",text},now,snap(run));}
export function undo(run){
  for(let i=run.log.length-1;i>=0;i--){
    const e=run.log[i];if(!e.prev||e.undone)continue;
    Object.assign(run,clone(e.prev));e.undone=true;
    if(e.kind==="note")run.notes=run.notes.filter(n=>!(n.at===e.at&&n.text===e.text));
    return e;
  }
  return null;
}
export function stopForEmergency(run,wall=Date.now()){const at=simNow(run,wall);pause(run,wall);run.phase="stopped";return push(run,{kind:"stop",text:"Stopped — real emergency"},at);}
export function resumeAfterStop(run,wall=Date.now()){run.phase="run";resume(run,wall);}
export function endRun(run,wall=Date.now()){const at=simNow(run,wall);pause(run,wall);run.phase="debrief";return push(run,{kind:"end",text:"Scenario ended"},at);}

// ---------- guidance ----------
const observed=(run,id)=>run.obs[id]?.status==="observed";
/** The suggested next step (first matching rule of the current state), or null. Suggestions only highlight; they never act. */
export function suggestion(run,scn,now){
  const st=scn.states[run.state];if(!st)return null;
  for(const r of st.suggest||[]){
    let hit=false;
    if(r.always)hit=true;
    else if(r.observed)hit=r.observed.every(id=>observed(run,id));
    else if(r.missed)hit=!observed(run,r.missed.action)&&now>=r.missed.by*60000;
    else if(r.atMin!=null)hit=now>=r.atMin*60000;
    if(!hit)continue;
    const n=st.next.find(x=>x.kind===r.go);if(n)return {...n,why:r.why};
  }
  return null;
}

/** First time the run entered a state (ms), or null. The start state counts as 0. */
export function firstEntry(run,scn,stateId,startId){
  if(stateId===startId)return 0;
  const e=run.log.find(x=>!x.undone&&((x.kind==="state"&&x.to===stateId)||(x.kind==="inject"&&x.to===stateId)));
  return e?e.at:(run.state===stateId?run.stateAt:null);
}
/** Second clock: time since the clinical event (null until it starts). Stops at scn.eventClock.stopAt. */
export function eventClock(run,scn,now,startId){
  const ec=scn.eventClock;if(!ec)return null;
  const from=ec.from==="start"?0:firstEntry(run,scn,ec.from,startId);
  if(from==null)return null;
  const stop=ec.stopAt?firstEntry(run,scn,ec.stopAt,startId):null;
  return {label:ec.label,ms:(stop??now)-from,stopped:stop!=null};
}

// ---------- checklist (primary vs optional) ----------
/** Critical actions plus any optional action surfaced by the current state go first; the rest are optional. */
export function checklist(run,scn){
  const r=scn.states?scn:resolve(scn,run.level);
  const surfaced=a=>!a.critical&&(a.surface||[]).includes(run.state);
  const primary=r.actions.filter(a=>a.critical||surfaced(a)).map(a=>({...a,surfaced:surfaced(a)}));
  const optional=r.actions.filter(a=>!a.critical&&!surfaced(a));
  return {primary,optional};
}

// ---------- debrief ----------
/** Status words used everywhere; "not documented" never means "not performed". */
export const STATUS={observed:"Recorded on time",late:"Recorded after target",missed:"Missed",na:"Not applicable / not assessed","not documented":"Not documented"};
export function debrief(run,scn){
  const r=resolve(scn,run.level);
  const ec=scn.eventClock,origin=ec?.from&&ec.from!=="start"?firstEntry(run,r,ec.from,r.start)??0:0;
  const actions=r.actions.map(a=>{
    const o=run.obs[a.id],conf=run.confirm[a.id];
    const trig=a.from?firstEntry(run,r,a.from,r.start):0;          // timing starts at the action's trigger event
    let status=o?.status||"not documented";
    if(status==="observed"&&a.target!=null&&trig!=null&&o.at-trig>a.target*60000)status="late";
    if(!o?.status&&a.from&&trig==null)status="na";                   // trigger never happened: not applicable, not missed
    if(conf)status=conf;
    const at=o?.status==="observed"?o.at:null;
    return {...a,status,at,trigger:trig,fromTrigger:at!=null&&trig!=null?at-trig:null,fromEvent:at!=null?at-origin:null,quality:o?.quality||null,comment:o?.comment||""};
  });
  const live=run.log.filter(e=>!e.undone);
  const timeline=live.filter(e=>e.kind!=="clock"||["start","advance","pause","resume"].includes(e.what)).map(e=>({seq:e.seq,at:e.at,wallAt:e.wallAt,kind:e.kind,status:e.kind==="obs"?e.status:undefined,text:e.kind==="obs"?obsText(e,r):e.kind==="state"?`→ ${r.states[e.to]?.name||e.to}`:e.text}));
  const critIds=new Set(actions.filter(a=>a.critical).map(a=>a.id));
  const keyTimeline=timeline.filter(e=>e.kind==="state"||e.kind==="stop"||e.kind==="inject"&&live.find(x=>x.seq===e.seq)?.to||e.kind==="obs"&&e.status==="observed"&&critIds.has(live.find(x=>x.seq===e.seq)?.action));
  const weak=actions.filter(a=>["late","missed","not documented"].includes(a.status));
  const prompts=[...weak.flatMap(a=>a.prompts||[]),...(scn.debrief||[])];
  const counts={observed:0,late:0,missed:0,na:0,"not documented":0};actions.forEach(a=>counts[a.status]=(counts[a.status]||0)+1);
  const end=[...run.log].reverse().find(e=>e.kind==="end")?.at??simNow(run);
  const team=actions.filter(a=>a.cat==="Teamwork");
  return {actions,timeline,keyTimeline,prompts:[...new Set(prompts)],suggested:[...new Set(prompts)].slice(0,3),counts,elapsed:end,origin,
    strengths:actions.filter(a=>a.status==="observed"),opportunities:actions.filter(a=>a.status==="late"||a.status==="missed"),
    undocumented:actions.filter(a=>a.critical&&a.status==="not documented"),team,notes:run.notes||[],
    critical:actions.filter(a=>a.critical),states:[...new Set(live.filter(e=>e.kind==="state").map(e=>e.to))]};
}
function obsText(e,r){const a=r.actions.find(x=>x.id===e.action);const l=a?a.label:e.action;return e.status==="observed"?l:e.status?`${l} — ${e.status==="na"?"not assessed":e.status}`:`${l} — cleared`;}

// ---------- exports (no identifiers) ----------
const csvCell=v=>{const s=String(v??"");return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;};
const mmss=ms=>{ms=Math.max(0,Math.round(ms||0)/1000|0);return `${String(ms/60|0).padStart(2,"0")}:${String(ms%60).padStart(2,"0")}`;};
export function exportCSV(run,scn){
  const d=debrief(run,scn);
  const rows=[["section","sim_time","wall_time","kind","item","status","detail"]];
  for(const e of d.timeline)rows.push(["timeline",mmss(e.at),e.wallAt||"",e.kind,e.text,e.status||"",""]);
  for(const a of d.actions)rows.push(["action",a.at!=null?mmss(a.at):"","",a.cat,a.label,STATUS[a.status],[a.fromTrigger!=null?`${mmss(a.fromTrigger)} from trigger`:"",a.target!=null?`target ${a.target} min`:"",a.quality||"",a.comment||""].filter(Boolean).join("; ")]);
  return rows.map(r=>r.map(csvCell).join(",")).join("\n");
}
export function exportJSON(run,scn){
  const d=debrief(run,scn);
  return JSON.stringify({format:"ob-sim-debrief/1",scenario:{id:scn.id,title:scn.title,version:run.scenarioVersion||scn.version,reviewed:run.reviewed??scn.reviewed??null},level:run.level,
    createdAt:run.createdAt,elapsedMs:d.elapsed,counts:d.counts,summary:run.summary,narrative:run.narrative||"",
    actions:d.actions.map(a=>({id:a.id,label:a.label,category:a.cat,critical:!!a.critical,status:a.status,simMs:a.at,fromTriggerMs:a.fromTrigger,targetMin:a.target,quality:a.quality,comment:a.comment})),
    timeline:d.timeline.map(e=>({simMs:e.at,wallAt:e.wallAt,kind:e.kind,text:e.text,status:e.status}))},null,2);
}

// ---------- content checks (used by tests) ----------
export function validate(scn,levels=["basic","intermediate","advanced"]){
  const errs=[],CATS=new Set(["Recognition","Teamwork","Management","Escalation"]);
  for(const level of levels){
    if(!scn.levels[level]){errs.push(`${level}: missing level`);continue;}
    const r=resolve(scn,level);
    if(!r.states[r.start])errs.push(`${level}: start state missing`);
    const seen=new Set([r.start]),q=[r.start];
    while(q.length){const s=r.states[q.shift()];for(const n of s?.next||[])if(!seen.has(n.to)){seen.add(n.to);q.push(n.to);}for(const i of r.injects)if(i.to&&!seen.has(i.to)){seen.add(i.to);q.push(i.to);}}
    for(const id of Object.keys(r.states))if(!seen.has(id))errs.push(`${level}: state ${id} unreachable`);
    if(!Object.values(r.states).some(s=>s.final))errs.push(`${level}: no final state`);
    const ids=new Set(r.actions.map(a=>a.id));
    for(const s of Object.values(r.states))for(const rule of s.suggest){
      if(!s.next.some(n=>n.kind===rule.go))errs.push(`${level}: ${s.id} suggests ${rule.go} with no such option`);
      for(const a of rule.observed||[])if(!ids.has(a))errs.push(`${level}: ${s.id} rule needs unknown action ${a}`);
      if(rule.missed&&!ids.has(rule.missed.action))errs.push(`${level}: ${s.id} rule needs unknown action ${rule.missed.action}`);
    }
    if(!r.actions.some(a=>a.critical))errs.push(`${level}: no critical actions`);
  }
  for(const a of scn.actions){
    for(const st of [a.from,...(a.surface||[])].filter(Boolean))if(!scn.states[st])errs.push(`action ${a.id}: unknown state ${st}`);
  }
  for(const s of Object.values(scn.states))for(const i of s.injects||[])if(!scn.injects.some(x=>x.id===i))errs.push(`state ${s.name}: unknown inject ${i}`);
  for(const i of scn.injects)if(!["learner","confederate","monitor","instructor"].includes(i.for||""))errs.push(`inject ${i.id}: recipient`);
  if(!scn.version)errs.push("no version");
  for(const a of scn.actions){if(!CATS.has(a.cat))errs.push(`action ${a.id}: category ${a.cat}`);if(!(a.target===null||typeof a.target==="number"))errs.push(`action ${a.id}: target`);}
  for(const s of Object.values(scn.states))if(!s.v)errs.push(`state ${s.name}: no vitals`);
  return errs;
}
