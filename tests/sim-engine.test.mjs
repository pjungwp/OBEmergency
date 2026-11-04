import test from "node:test";
import assert from "node:assert/strict";
import {SIM_SCENARIOS,getSimScenario,LEVELS} from "../sim-scenarios.js";
import {EMERGENCIES} from "../data.js";
import * as S from "../sim-engine.js";

const MIN=60000;
const run=(id="pph-atony",level="basic")=>{const scn=getSimScenario(id),r=S.resolve(scn,level),x=S.createRun(scn,level,0);S.startRun(x,0);x.clock.running=false;return {scn,r,x};};

test("every scenario is valid at every level, for a known emergency, with draft review status",()=>{
  for(const s of SIM_SCENARIOS){
    assert.deepEqual(S.validate(s,LEVELS),[],s.id);
    assert.ok(EMERGENCIES[s.emergency],s.id);
    assert.equal(s.review,"draft");
    assert.ok(s.prebrief.some(p=>/real emergency/i.test(p)),`${s.id}: prebrief mentions stopping for a real emergency`);
  }
});

test("levels share one scenario: advanced adds states, injects and actions",()=>{
  const scn=getSimScenario("pph-atony"),b=S.resolve(scn,"basic"),a=S.resolve(scn,"advanced");
  assert.ok(!b.states.dic&&a.states.dic);
  assert.ok(a.injects.length>b.injects.length);
  assert.ok(a.actions.some(x=>x.id==="a-second")&&!b.actions.some(x=>x.id==="a-second"));
});

test("vitals drift toward the state's targets; blood loss accumulates with time",()=>{
  const {r,x}=run();
  const v0=S.vitalsAt(x,r,0),v5=S.vitalsAt(x,r,5*MIN);
  assert.equal(v0.qbl,700);assert.equal(v5.qbl,700+90*5);
  S.goTo(x,r,"shock",5*MIN);
  const v6=S.vitalsAt(x,r,6*MIN),v20=S.vitalsAt(x,r,20*MIN);
  assert.ok(v6.hr>v5.hr&&v6.hr<134,"moving, not jumping");
  assert.ok(Math.abs(v20.hr-134)<=1&&Math.abs(v20.sbp-82)<=1,"reaches the target");
  assert.equal(v6.trend.hr,1);
});

test("hold freezes the patient; release resumes the state's course",()=>{
  const {r,x}=run();S.goTo(x,r,"shock",2*MIN);
  S.setHold(x,r,true,2.5*MIN);const a=S.vitalsAt(x,r,2.5*MIN),b=S.vitalsAt(x,r,8*MIN);
  assert.equal(a.hr,b.hr);assert.equal(a.qbl,b.qbl);
  S.setHold(x,r,false,8*MIN);assert.ok(S.vitalsAt(x,r,9*MIN).qbl>b.qbl);
});

test("suggestions only highlight: missed uterotonic suggests worsen; treatment suggests improve; nothing changes state",()=>{
  const {r,x}=run();
  assert.equal(S.suggestion(x,r,3*MIN),null);
  assert.equal(S.suggestion(x,r,4*MIN).to,"shock");
  assert.equal(x.state,"atony","suggestion never acts");
  S.observe(x,"a-massage","observed",4.1*MIN);S.observe(x,"a-uterotonic","observed",4.2*MIN);
  assert.equal(S.suggestion(x,r,4.3*MIN).to,"responding");
});

test("intermediate needs second-line before the improve suggestion",()=>{
  const {r,x}=run("pph-atony","intermediate");
  S.observe(x,"a-massage","observed",MIN);S.observe(x,"a-uterotonic","observed",MIN);
  assert.equal(S.suggestion(x,r,2*MIN),null);
  S.observe(x,"a-second","observed",2*MIN);assert.equal(S.suggestion(x,r,2*MIN).to,"responding");
});

test("undo restores the state, vitals course and observations exactly",()=>{
  const {r,x}=run();
  S.observe(x,"a-help","observed",30000);
  const before=JSON.stringify({s:x.state,a:x.anchor,o:x.obs});
  S.goTo(x,r,"shock",MIN);S.inject(x,r,"i-clot",1.5*MIN);
  assert.equal(S.undo(x).kind,"inject");assert.equal(S.undo(x).kind,"state");
  assert.equal(JSON.stringify({s:x.state,a:x.anchor,o:x.obs}),before);
  assert.equal(S.undo(x).kind,"obs");assert.equal(x.obs["a-help"],undefined);
});

test("inject adds blood loss, shows labs, and can jump state",()=>{
  const {r,x}=run();S.inject(x,r,"i-clot",MIN);assert.equal(S.vitalsAt(x,r,MIN).qbl,700+90+300);
  S.inject(x,r,"i-cbc",MIN);assert.equal(x.shown.length,1);
  const h=run("htn-eclampsia","intermediate");S.inject(h.x,h.r,"i-seize",2*MIN);assert.equal(h.x.state,"seizure");
});

test("override sets vitals and holds them until the next state",()=>{
  const {r,x}=run();S.override(x,r,{sbp:70,hr:150},MIN);
  assert.equal(S.vitalsAt(x,r,5*MIN).sbp,70);
  S.goTo(x,r,"responding",5*MIN);assert.equal(x.overrides,null);
});

test("PPH stage rule: unstable vitals or >1500 mL is stage 3",()=>{
  assert.equal(S.pphStage(1200,{sbp:82,hr:132}),3);assert.equal(S.pphStage(1200,{sbp:110,hr:100}),2);
  assert.equal(S.pphStage(700,{sbp:118,hr:96}),1);assert.equal(S.pphStage(1600,{sbp:118,hr:96}),3);
});

test("event clocks: HTN counts from confirmed severe BP; shoulder dystocia stops at delivery",()=>{
  const h=run("htn-eclampsia","basic");
  assert.equal(S.eventClock(h.x,h.r,MIN,h.r.start),null);
  S.goTo(h.x,h.r,"confirmed",3*MIN);assert.equal(S.eventClock(h.x,h.r,5*MIN,h.r.start).ms,2*MIN);
  const sd=run("shoulder","basic");S.goTo(sd.x,sd.r,"delivered",95000);
  const c=S.eventClock(sd.x,sd.r,5*MIN,sd.r.start);assert.equal(c.ms,95000);assert.equal(c.stopped,true);
});

test("debrief: late, missed, not documented and not assessed are distinct; prompts start with what went wrong",()=>{
  const {scn,r,x}=run();
  S.observe(x,"a-help","observed",30000);           // on time (target 1)
  S.observe(x,"a-uterotonic","observed",6*MIN);     // late (target 3)
  S.observe(x,"a-mtp","missed",9*MIN);
  S.observe(x,"a-txa","na",9*MIN);
  S.endRun(x,0);
  const d=S.debrief(x,scn),st=id=>d.actions.find(a=>a.id===id).status;
  assert.equal(st("a-help"),"observed");assert.equal(st("a-uterotonic"),"late");assert.equal(st("a-mtp"),"missed");assert.equal(st("a-txa"),"na");assert.equal(st("a-recognize"),"not documented");
  assert.ok(d.suggested[0].includes("hemorrhage")||d.suggested.length===3);
  x.confirm["a-recognize"]="observed";assert.equal(S.debrief(x,scn).actions.find(a=>a.id==="a-recognize").status,"observed","instructor confirmation wins");
});

test("stopping for a real emergency pauses the clock and is logged",()=>{
  const {x}=run();x.clock.running=true;x.clock.lastTickAt=0;
  S.stopForEmergency(x,MIN);assert.equal(x.phase,"stopped");assert.equal(x.clock.running,false);assert.equal(S.simNow(x,10*MIN),MIN);
  assert.equal(x.log.at(-1).kind,"stop");
});
