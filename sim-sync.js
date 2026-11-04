// Sim Master sync adapter. One interface; today a same-device adapter (BroadcastChannel +
// localStorage fallback) feeds the monitor window. A later network adapter (e.g. Firebase)
// implements the same methods for observer / confederate / learner devices.
//
// Adapter interface
//   role                 "master" | "observer" | "confederate" | "learner" | "monitor"
//   publish(payload)     master → others: the current learner-safe view (no instructor notes)
//   subscribe(fn)        receive payloads; returns an unsubscribe function
//   send(event)          non-master → master: queued observation / acknowledgement (future)
//   onEvent(fn)          master receives events from other devices (future)
//   status()             {connected, lastSync, mode:"local"|"network"}
// Rules for the network adapter (Sim Master 2.0 plan §8): one authoritative master; events are
// appended, never overwritten; offline events queue and reconcile; show last successful sync.

const CHANNEL="ob-sim-monitor",LAST="ob-sim-monitor.last";

export function createLocalSync(role="master"){
  let bc=null,last=null;const subs=new Set(),evs=new Set();
  try{bc=new BroadcastChannel(CHANNEL);bc.onmessage=e=>{const m=e.data;if(m?.type==="event")evs.forEach(f=>f(m));else if(m?.type==="hello"&&role==="master"&&last)post(last);else subs.forEach(f=>f(m));};}catch{}
  const post=p=>{try{bc?.postMessage(p);}catch{}try{localStorage.setItem(LAST,JSON.stringify(p));}catch{}};
  return {
    role,
    publish(payload){last={...payload,type:"state",at:Date.now()};post(last);},
    subscribe(fn){subs.add(fn);try{const p=JSON.parse(localStorage.getItem(LAST)||"null");if(p)fn(p);}catch{}if(role!=="master")try{bc?.postMessage({type:"hello"});}catch{}return ()=>subs.delete(fn);},
    send(event){try{bc?.postMessage({...event,type:"event",at:Date.now()});}catch{}},
    onEvent(fn){evs.add(fn);return ()=>evs.delete(fn);},
    status(){return {connected:!!bc,lastSync:last?.at||null,mode:"local"};}
  };
}
