import test from "node:test";
import assert from "node:assert/strict";
import {createTeamSessionStore,coordinationSnapshot,normalizeCode,formatCode} from "../team-sync.js";

// In-memory stand-in for Firebase Auth + Realtime Database REST/streaming, enforcing the
// same rules as firebase-database.rules.json (code claims are write-once; a snapshot write
// must be exactly the next revision).
function fakeFirebase(){
  const data={},streams=new Map();
  const get=p=>p.split("/").reduce((o,k)=>o?.[k],data);
  const set=(p,v)=>{const ks=p.split("/");let o=data;ks.slice(0,-1).forEach(k=>o=o[k]??={});o[ks.at(-1)]=v;};
  const allowed=(p,v)=>{
    const old=get(p);
    if(/^codes\/[A-Z2-9]{6}$/.test(p))return old===undefined&&v?.room&&v?.createdAt;
    const m=p.match(/^sessions\/([^/]{20,})\/snap$/);
    if(m)return !!v&&(old===undefined||v.revision===old.revision+1);
    return false;
  };
  const fetchImpl=async(url,opt={})=>{
    if(url.includes("accounts:signUp"))return {ok:true,json:async()=>({idToken:"tok",refreshToken:"r",expiresIn:"3600"})};
    const u=new URL(url);if(!u.searchParams.get("auth"))return {ok:false,status:401};
    const p=u.pathname.replace(/^\//,"").replace(/\.json$/,"");
    if((opt.method||"GET")==="GET")return {ok:true,json:async()=>structuredClone(get(p)??null)};
    const v=JSON.parse(opt.body);
    if(!allowed(p,v))return {ok:false,status:401};
    set(p,v);(streams.get(p)||[]).forEach(s=>s.emit("put",{path:"/",data:structuredClone(v)}));
    return {ok:true,json:async()=>v};
  };
  class ES{constructor(url){const u=new URL(url);this.p=u.pathname.replace(/^\//,"").replace(/\.json$/,"");this.l={};this.readyState=1;
    (streams.get(this.p)||streams.set(this.p,[]).get(this.p)).push(this);
    queueMicrotask(()=>this.emit("put",{path:"/",data:structuredClone(get(this.p)??null)}));}
    addEventListener(t,f){(this.l[t]??=[]).push(f);} emit(t,d){(this.l[t]||[]).forEach(f=>f({data:JSON.stringify(d)}));}
    close(){this.readyState=2;const a=streams.get(this.p);a.splice(a.indexOf(this),1);}}
  return {fetchImpl,EventSourceImpl:ES,data};
}
function memStorage(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
const config={apiKey:"k",databaseURL:"https://db.test"};
const flush=()=>new Promise(r=>setTimeout(r,10));
function phone(fb){return createTeamSessionStore({config,key:"s",storage:memStorage(),fetchImpl:fb.fetchImpl,EventSourceImpl:fb.EventSourceImpl});}
function tap(store,taskId){const s=store.loadSession();const next=structuredClone(s);next.tasks[taskId]={status:"completed"};
  return store.recordAction({expectedRevision:s.revision,nextState:next,event:{eventId:Math.random().toString(36),type:"TASK_UPDATED",taskId,revision:s.revision+1}});}
const seed={id:"sess1",mode:"clinical",status:"active",emergencyId:"pph",tasks:{},timers:[{id:"t1",medId:"oxytocin",dueAt:5}],events:[{text:"private"}],doseCounts:{oxytocin:1}};

test("codes are normalized and formatted for reading aloud",()=>{
  assert.equal(normalizeCode("abc-234"),"ABC234");
  assert.equal(normalizeCode(" k7p 4qx "),"K7P4QX");
  assert.equal(formatCode("K7P4QX"),"K7P-4QX");
});

test("only the coordination snapshot leaves the phone",()=>{
  const snap=coordinationSnapshot({...seed,_actionEvents:[1]});
  assert.equal(snap.events,undefined);assert.equal(snap.doseCounts,undefined);assert.equal(snap._actionEvents,undefined);
  assert.equal(snap.timers[0].medId,undefined);assert.equal(snap.timers[0].dueAt,5);
});

test("a joined phone sees the lead's taps and the lead sees the joined phone's taps",async()=>{
  const fb=fakeFirebase(),lead=phone(fb),nurse=phone(fb);
  lead.createSession(seed);
  const {code}=await lead.shareSession();
  assert.match(code,/^[A-Z2-9]{6}$/);
  const stored=JSON.stringify(fb.data);
  assert.ok(!stored.includes("private")&&!stored.includes("oxytocin"),"private details never reach the database");
  const seen=[];nurse.subscribe(x=>seen.push(x));
  const joined=await nurse.joinTeam(formatCode(code));
  assert.equal(joined.id,"sess1");
  tap(lead,"call-help");await flush();
  assert.equal(nurse.loadSession().tasks["call-help"]?.status,"completed");
  tap(nurse,"massage");await flush();
  assert.equal(lead.loadSession().tasks["massage"]?.status,"completed");
  assert.equal(lead.loadSession().events[0].text,"private","the lead keeps its own private timeline");
  assert.ok(!seen.some(x=>x?._teamReset),"normal joining and syncing never shows the conflict warning");
});

test("when two phones save at once, the second loads the shared state instead of overwriting",async()=>{
  const fb=fakeFirebase(),lead=phone(fb),nurse=phone(fb);
  lead.createSession(seed);const {code}=await lead.shareSession();await nurse.joinTeam(code);
  const seen=[];nurse.subscribe(s=>seen.push(s));
  // Both tap from the same revision before either hears from the other.
  const r=lead.loadSession().revision;
  const a=structuredClone(lead.loadSession());a.tasks.x={status:"completed"};
  const b=structuredClone(nurse.loadSession());b.tasks.y={status:"completed"};
  lead.recordAction({expectedRevision:r,nextState:a,event:{eventId:"e1",type:"T",revision:r+1}});
  nurse.recordAction({expectedRevision:r,nextState:b,event:{eventId:"e2",type:"T",revision:r+1}});
  await flush();await flush();
  const shared=fb.data.sessions[Object.keys(fb.data.sessions)[0]].snap;
  assert.equal(shared.tasks.x?.status,"completed");assert.equal(shared.tasks.y,undefined,"the losing write did not overwrite");
  assert.equal(nurse.loadSession().tasks.x?.status,"completed","the losing phone now shows the shared state");
  assert.ok(seen.some(s=>s?._teamReset),"the losing phone is told to re-check");
});

test("a wrong code gives a clear message",async()=>{
  const fb=fakeFirebase(),nurse=phone(fb);
  await assert.rejects(nurse.joinTeam("ZZZ-999"),/No team session/);
  await assert.rejects(nurse.joinTeam("AB"),/6-character/);
});

test("without Firebase settings the store behaves as the local store and team sync stays off",()=>{
  const s=createTeamSessionStore({config:{apiKey:"",databaseURL:""},key:"s",storage:memStorage()});
  assert.equal(s.teamEnabled,false);s.createSession(seed);assert.equal(s.loadSession().id,"sess1");assert.equal(s.teamStatus().state,"off");
});
