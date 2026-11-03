import test from "node:test";
import assert from "node:assert/strict";
import {createLocalSessionStore} from "../local-session-store.js";

function memoryStorage(){
  const map=new Map();
  return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};
}
function seed(){return {id:"session-a",mode:"simulation",status:"active",tasks:{},timers:[],events:[],elapsedBase:0,simulationTimeMs:0};}
function event(eventId,revision,type="TASK_STARTED"){
  return {eventId,sessionId:"session-a",taskId:"pph-help",type,status:"in_progress",actor:"test",occurredAt:"2026-11-02T12:00:00.000Z",schemaVersion:"1.0",revision,simulationTimeMs:0};
}

test("duplicate events are idempotent",()=>{
  const storage=memoryStorage(),store=createLocalSessionStore({storage,key:"test"});
  const created=store.createSession(seed());
  const next={...created,tasks:{"pph-help":{status:"progress"}}};
  const first=store.recordAction({event:event("evt-1",1),nextState:next,expectedRevision:0});
  assert.equal(first.applied,true);assert.equal(first.session.revision,1);
  const duplicate=store.recordAction({event:event("evt-1",2),nextState:{...next,revision:2},expectedRevision:1});
  assert.equal(duplicate.duplicate,true);assert.equal(duplicate.session.revision,1);
});

test("stale revisions do not overwrite authoritative state",()=>{
  const storage=memoryStorage(),store=createLocalSessionStore({storage,key:"test"});
  const created=store.createSession(seed());
  store.recordAction({event:event("evt-1",1),nextState:{...created,tasks:{"pph-help":{status:"progress"}}},expectedRevision:0});
  const stale=store.recordAction({event:event("evt-2",1,"TASK_COMPLETED"),nextState:{...created,tasks:{"pph-help":{status:"done"}}},expectedRevision:0});
  assert.equal(stale.conflict,true);assert.equal(stale.session.tasks["pph-help"].status,"progress");
});

test("reload restores timers and simulation time",()=>{
  const storage=memoryStorage(),a=createLocalSessionStore({storage,key:"test"});
  const created=a.createSession(seed());
  const next={...created,simulationTimeMs:300000,elapsedBase:300000,timers:[{id:"timer-1",createdAtWall:"2026-11-02T12:00:00.000Z",dueAtElapsedMs:600000,dueAt:10,ack:false,cancelled:false}]};
  a.recordAction({event:event("evt-advance",1,"SIMULATION_TIME_ADVANCED"),nextState:next,expectedRevision:0});
  const b=createLocalSessionStore({storage,key:"test"}),loaded=b.loadSession();
  assert.equal(loaded.simulationTimeMs,300000);assert.equal(loaded.timers[0].dueAtElapsedMs,600000);assert.equal(loaded.revision,1);
});

test("legacy local sessions upgrade without losing state",()=>{
  const storage=memoryStorage();
  storage.setItem("test",JSON.stringify({...seed(),tasks:{"pph-help":{status:"done"}}}));
  const store=createLocalSessionStore({storage,key:"test"}),loaded=store.loadSession();
  assert.equal(loaded.revision,0);assert.equal(loaded.schemaVersion,"1.0");assert.deepEqual(loaded._actionEvents,[]);
  const saved=store.recordAction({event:event("evt-upgrade",1),nextState:loaded,expectedRevision:0});
  assert.equal(saved.applied,true);assert.equal(saved.session.tasks["pph-help"].status,"done");
});
