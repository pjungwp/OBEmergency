import test from "node:test";
import assert from "node:assert/strict";
import {EMERGENCIES,MEDICATIONS} from "../data.js";
import {PATHWAYS} from "../pathways.js";
import {DECISIONS,GATED,CHECK_LABELS,DYSTOCIA,LEFT_PANEL} from "../cockpit-config.js";
import {buildChecklist,displayState} from "../task-engine.js";
import * as D from "../decisions.js";
import {createSessionClock,LiveClockError,crossed} from "../clock.js";
import {activeAlerts,snooze,card,banners} from "../alerts.js";
import {recordDose,canGive} from "../medications.js";
import {appendEvent,timeline} from "../history.js";
import {logManeuver,suggestNext,markDelivered} from "../dystocia.js";

const sess=(over={})=>({id:"s",mode:"simulation",emergencyId:"pph",tasks:{},timers:[],events:[],elapsedBase:0,running:false,lastTickAt:0,...over});
const pph=EMERGENCIES.pph;
const ck=(s,extra={})=>buildChecklist({tasks:EMERGENCIES[s.emergencyId].tasks,states:s.tasks,gated:new Set(GATED[s.emergencyId]),activated:new Set(s.branch?.activated||[]),pinned:s.branch?.pinned||null,...extra});

test("config: every emergency has a left-panel rule; labels exist and are ≤ 3 words",()=>{
  for(const e of Object.values(EMERGENCIES)){
    assert.ok(LEFT_PANEL[e.id],e.id);assert.ok(Array.isArray(DECISIONS[e.id]),e.id);
    for(const t of e.tasks){const l=CHECK_LABELS[t.id];assert.ok(l,`label ${t.id}`);assert.ok(l.split(/\s+/).filter(w=>!/^[·/]$/.test(w)).length<=3,`${t.id}: ${l}`);}
    for(const id of GATED[e.id])assert.ok(e.tasks.some(t=>t.id===id),`gated ${id}`);
  }
});

test("config: decisions point at pathway decision nodes, real tasks and meds; questions ≤ 5 words",()=>{
  const meds=new Set(MEDICATIONS.map(m=>m.id));
  for(const [eid,list] of Object.entries(DECISIONS)){
    const ids=new Set(EMERGENCIES[eid].tasks.map(t=>t.id));
    for(const d of list){
      assert.equal(PATHWAYS[eid].nodes[d.node]?.type,"decision",`${d.id} node`);
      assert.ok(d.q.split(/\s+/).length<=5,d.q);
      assert.ok(d.on||d.onTimer||d.atMin!=null,`${d.id} has a trigger`);
      for(const t of [...(d.on||[]),...(d.requires||[])])assert.ok(ids.has(t),`${d.id}: ${t}`);
      for(const m of d.onTimer||[])assert.ok(meds.has(m),`${d.id}: ${m}`);
      for(const a of d.answers){for(const t of [...(a.activate||[]),...(a.reopen||[])])assert.ok(ids.has(t),`${d.id}: ${t}`);if(a.pin)assert.ok(ids.has(a.pin));}
    }
  }
  for(const s of DYSTOCIA.sections)for(const id of s.ids)assert.ok(EMERGENCIES.shoulder.tasks.some(t=>t.id===id),id);
});

test("display states map old stored states",()=>{
  assert.equal(displayState("todo"),"pending");assert.equal(displayState(undefined),"pending");
  assert.equal(displayState("progress"),"ongoing");assert.equal(displayState("ongoing"),"ongoing");assert.equal(displayState("done"),"completed");
});

test("most urgent: first critical task at start; gated escalation stays in UP NEXT",()=>{
  const c=ck(sess());
  assert.equal(c.mostUrgent.id,"pph-help");
  assert.ok(!c.now.some(t=>t.id==="pph-escalate"));
  assert.ok(c.next.some(t=>t.id==="pph-escalate"));
  assert.equal(c.done,0);assert.equal(c.total,pph.tasks.length);
});

test("checklist sections: completed and ongoing move out of NOW; overdue always in NOW and ranked first",()=>{
  const s=sess({tasks:{"pph-help":{status:"done"},"pph-massage":{status:"ongoing"}}});
  let c=ck(s);
  assert.ok(c.completed.some(t=>t.id==="pph-help"));
  assert.ok(c.ongoing.some(t=>t.id==="pph-massage"));
  assert.ok(!c.now.some(t=>t.id==="pph-help"||t.id==="pph-massage"));
  c=ck(s,{overdue:new Set(["pph-cause"])});
  assert.equal(c.mostUrgent.id,"pph-cause");
  c=ck(s,{overdue:new Set(["pph-massage"])});
  assert.ok([c.mostUrgent,...c.now].some(t=>t.id==="pph-massage"),"overdue ongoing task returns to NOW");
});

test("no decision is answered without a tap: triggers only queue",()=>{
  const s=sess();
  assert.deepEqual(D.onTaskEvent(s,DECISIONS.pph,"pph-assess",60000),[],"requires oxytocin first");
  s.tasks["pph-oxytocin"]={status:"done"};
  assert.deepEqual(D.onTaskEvent(s,DECISIONS.pph,"pph-assess",120000),["pph-controlled"]);
  assert.equal(s.decisions.answers.length,0);
  assert.deepEqual(D.onTaskEvent(s,DECISIONS.pph,"pph-assess",130000),[],"not queued twice");
  // Minute triggers ask, never answer
  const a=sess({emergencyId:"arrest"});D.onTick(a,DECISIONS.arrest,3.9*60000);assert.equal(D.waiting(a).length,0);
  D.onTick(a,DECISIONS.arrest,4*60000);assert.equal(D.waiting(a).length,1);assert.equal(a.decisions.answers.length,0);
});

test("Back to actions defers without recording; the question stays queued",()=>{
  const s=sess({tasks:{"pph-oxytocin":{status:"done"}}});
  D.onTaskEvent(s,DECISIONS.pph,"pph-assess",1);
  assert.equal(D.takeover(s).id,"pph-controlled");
  D.defer(s,"pph-controlled");
  assert.equal(D.takeover(s),null);assert.equal(D.waiting(s).length,1);assert.equal(s.decisions.answers.length,0);
  D.reopen(s,"pph-controlled");assert.equal(D.takeover(s).id,"pph-controlled");
});

test("NO brings escalation forward without erasing completed or ongoing work",()=>{
  const s=sess({tasks:{"pph-help":{status:"done"},"pph-massage":{status:"ongoing"},"pph-oxytocin":{status:"done"}}});
  D.onTaskEvent(s,DECISIONS.pph,"pph-assess",5);
  const fx=D.answer(s,DECISIONS.pph,"pph-controlled","no",6);
  assert.equal(fx.pin,"pph-escalate");
  const c=ck(s);
  assert.equal(c.mostUrgent.id,"pph-escalate");
  assert.ok(c.completed.some(t=>t.id==="pph-help"));assert.ok(c.ongoing.some(t=>t.id==="pph-massage"));
  assert.deepEqual(D.onTaskEvent(s,DECISIONS.pph,"pph-assess",7),[],"terminal answer closes the question");
});

test("YES on a repeating question can be asked again at the next trigger",()=>{
  const s=sess({tasks:{"pph-oxytocin":{status:"done"}}});
  D.onTaskEvent(s,DECISIONS.pph,"pph-assess",1);D.answer(s,DECISIONS.pph,"pph-controlled","yes",2);
  assert.deepEqual(D.onTaskEvent(s,DECISIONS.pph,"pph-assess",3),["pph-controlled"]);
});

test("medication reassessment asks the HTN question",()=>{
  const s=sess({emergencyId:"htn"});
  assert.deepEqual(D.onTimerDue(s,DECISIONS.htn,"labetalol",600000),["htn-still-severe"]);
});

test("live clock cannot be paused or advanced; simulation clock can",()=>{
  let t=1000;const live=sess({mode:"clinical",running:true,lastTickAt:0});const c=createSessionClock(live,()=>t);
  assert.equal(c.now(),1000);assert.throws(()=>c.advance(60000),LiveClockError);assert.throws(()=>c.pause(),LiveClockError);
  const sim=sess({running:true,lastTickAt:0});const s=createSessionClock(sim,()=>t);
  s.advance(60000);assert.equal(s.now(),61000);s.pause();t=5000;assert.equal(s.now(),61000);s.resume();t=6000;assert.equal(s.now(),62000);
});

test("a simulation jump summarizes crossed events in order",()=>{
  const items=[{atMs:300000,label:"b"},{atMs:60000,label:"a"},{atMs:900000,label:"c"}];
  assert.deepEqual(crossed(items,0,600000).map(x=>x.label),["a","b"]);
});

test("alerts: milestones are banners; P1 cards become banners after two snoozes; ack never completes a task",()=>{
  const timers=[{id:"m",kind:"milestone",dueAt:1},{id:"r",kind:"repeat",taskId:"pph-assess",dueAt:2}];
  let a=activeAlerts(timers,3);
  assert.equal(a.find(x=>x.id==="m").form,"banner");assert.equal(card(a).id,"r");
  snooze(timers[1],3);a=activeAlerts(timers,3.5);assert.equal(card(a),null,"snoozed");
  a=activeAlerts(timers,4.1);assert.equal(card(a).id,"r");
  snooze(timers[1],4.1);a=activeAlerts(timers,5.2);
  assert.equal(card(a),null);assert.ok(banners(a).some(x=>x.id==="r"),"now a banner");
  assert.equal(snooze(timers[1],5.2),false);
  const sd=EMERGENCIES.shoulder.milestones.map((m,i)=>({id:`sd${i}`,kind:"milestone",dueAt:m.min}));
  assert.ok(activeAlerts(sd,6).every(x=>x.form==="banner"),"shoulder dystocia minute marks never take over");
});

test("medications: dose limit blocks with a reason; givenAt earlier than recordedAt sorts and times the reminder",()=>{
  const miso=MEDICATIONS.find(m=>m.id==="misoprostol"),lab=MEDICATIONS.find(m=>m.id==="labetalol");
  const s=sess();
  recordDose(s,miso,{givenAtMs:60000,recordedAtMs:60000});
  assert.equal(canGive(s,miso).ok,false);assert.match(canGive(s,miso).reason,/limit/);
  assert.throws(()=>recordDose(s,miso,{givenAtMs:70000,recordedAtMs:70000}));
  const {dose,timer}=recordDose(s,lab,{givenAtMs:120000,recordedAtMs:300000});
  assert.equal(dose.givenAt,120000);assert.equal(dose.recordedAt,300000);
  assert.equal(timer.dueAt,2+lab.timer);
  assert.deepEqual(s.doses.map(d=>d.medId),["misoprostol","labetalol"]);
  assert.throws(()=>recordDose(s,lab,{givenAtMs:500000,recordedAtMs:400000}),RangeError);
});

test("history is append-only and sorted by clock time",()=>{
  const s=sess();appendEvent(s,{text:"a",at:1000});appendEvent(s,{text:"b",at:500});appendEvent(s,{text:"c",at:1000});
  assert.deepEqual(timeline(s).map(e=>e.text),["c","a","b"]);assert.equal(s.events.length,3);
});

test("shoulder dystocia: maneuver log suggests the next maneuver in order",()=>{
  const s=sess({emergencyId:"shoulder"});
  assert.equal(suggestNext(s,DYSTOCIA),"sd-mcroberts");
  logManeuver(s,"sd-mcroberts",20000);logManeuver(s,"sd-suprapubic",40000);
  assert.equal(suggestNext(s,DYSTOCIA),"sd-posterior");
  assert.equal(logManeuver(s,"sd-mcroberts",70000).n,2);
  assert.equal(markDelivered(s,95000),95000);assert.equal(markDelivered(s,99000),95000);
});
