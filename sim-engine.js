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
    obs:{},shown:[],notes:[],log:[],seq:0,narrative:"",confirm:{}};
}
export function simNow(run,wall=Date.now()){const c=run.clock;return c.elapsedBase+(c.running?wall-c.lastTickAt:0);}
export function startRun(run,wall=Date.now()){run.phase="run";run.clock.running=true;run.clock.lastTickAt=wall;push(run,{kind:"clock",what:"start",text:"Scenario started"},0);}
export function pause(run,wall=Date.now()){const c=run.clock;if(!c.running)return;c.elapsedBase=simNow(run,wall);c.running=false;c.lastTickAt=wall;push(run,{kind:"clock",what:"pause",text:"Paused"},c.elapsedBase);}
export function resume(run,wall=Date.now()){const c=run.clock;if(c.running)return;c.running=true;c.lastTickAt=wall;push(run,{kind:"clock",what:"resume",text:"Resumed"},c.elapsedBase);}
export function advance(run,ms,wall=Date.now()){
  if(!(ms>0))return;const c=run.clock;c.elapsedBase=simNow(run,wall)+ms;c.lastTickAt=wall;
  push(run,{kind:"clock",what:"advance",text:`Time advanced +${Math.round(ms/60000*10)/10} min`},c.elapsedBase);
}

function push(run,entry,at,prev){run.seq++;run.log.push({seq:run.seq,at,...entry,...(prev?{prev}:{})});return run.log[run.log.length-1];}
function snap(run){return clone({state:run.state,stateAt:run.stateAt,hold:run.hold,overrides:run.overrides,anchor:run.anchor,obs:run.obs,shown:run.shown});}

// ---------- physiology ----------
function targetOf(run,scn){
  const st=scn.states[run.state]||{};
  if(run.hold)return {v:run.anchor.vals,rate:0};
  return {v:run.overrides?{...st.v,...run.overrides}:st.v||{},rate:run.overrides?.qblRate??st.qblRate??0};
}
export function vitalsAt(run,scn,now){
  const t=targetOf(run,scn),a=run.anchor,dt=Math.max(0,now-a.at),f=1-Math.exp(-dt/TAU_MS);
  const out={};
  for(const k of NUMERIC){const from=a.vals[k],to=t.v[k];if(to==null)continue;const x=from==null?to:from+(to-from)*f;out[k]=Math.round(x);}
  out.rhythm=t.v.rhythm??a.vals.rhythm;
  out.qbl=Math.round(a.qbl+t.rate*dt/60000);
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
  if(i.show)run.shown.push({id,text:i.text,at:now});
  return push(run,{kind:"inject",id,cat:i.kind,text:`${i.label}: ${i.text}`,...(i.to?{to:i.to}:{})},now,prev);
}
/** status: "observed" | "missed" | "na" | null (clear) */
export function observe(run,actionId,status,now){
  const prev=snap(run);
  if(status)run.obs[actionId]={status,at:now};else delete run.obs[actionId];
  return push(run,{kind:"obs",action:actionId,status,text:status?`${status}: ${actionId}`:`cleared: ${actionId}`},now,prev);
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

// ---------- debrief ----------
export function debrief(run,scn){
  const r=resolve(scn,run.level);
  const ec=scn.eventClock,origin=ec?.from&&ec.from!=="start"?firstEntry(run,r,ec.from,r.start)??0:0;
  const actions=r.actions.map(a=>{
    const o=run.obs[a.id],conf=run.confirm[a.id];
    let status=o?o.status:"not documented";
    if(status==="observed"&&a.target!=null&&o.at>a.target*60000)status="late";
    if(conf)status=conf;
    return {...a,status,at:o?.status==="observed"?o.at:null,fromEvent:o?.status==="observed"?o.at-origin:null};
  });
  const timeline=run.log.filter(e=>!e.undone&&e.kind!=="clock"||e.kind==="clock"&&!e.undone&&["start","advance"].includes(e.what)).map(e=>({at:e.at,kind:e.kind,status:e.kind==="obs"?e.status:undefined,text:e.kind==="obs"?obsText(e,r):e.kind==="state"?`→ ${r.states[e.to]?.name||e.to}`:e.text}));
  const weak=actions.filter(a=>["late","missed","not documented"].includes(a.status));
  const prompts=[...weak.flatMap(a=>a.prompts||[]),...(scn.debrief||[])];
  const counts={observed:0,late:0,missed:0,na:0,"not documented":0};actions.forEach(a=>counts[a.status]=(counts[a.status]||0)+1);
  const end=run.log.findLast?.(e=>e.kind==="end")?.at??simNow(run);
  return {actions,timeline,prompts:[...new Set(prompts)],suggested:[...new Set(prompts)].slice(0,3),counts,elapsed:end,origin,
    critical:actions.filter(a=>a.critical),states:[...new Set(run.log.filter(e=>!e.undone&&e.kind==="state").map(e=>e.to))]};
}
function obsText(e,r){const a=r.actions.find(x=>x.id===e.action);const l=a?a.label:e.action;return e.status==="observed"?l:e.status?`${l} — ${e.status==="na"?"not assessed":e.status}`:`${l} — cleared`;}

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
  for(const a of scn.actions){if(!CATS.has(a.cat))errs.push(`action ${a.id}: category ${a.cat}`);if(!(a.target===null||typeof a.target==="number"))errs.push(`action ${a.id}: target`);}
  for(const s of Object.values(scn.states))if(!s.v)errs.push(`state ${s.name}: no vitals`);
  return errs;
}
