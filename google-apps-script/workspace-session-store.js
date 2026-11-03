// Client adapter for the optional Apps Script build. The Netlify release does not use this file.
export function createWorkspaceSessionStore({key="ob-emergency-assist.session.v1",pollMs=3000}={}){
  const local=createLocalSessionStore({key});
  let activeSessionId=null,pollHandle=null;
  const call=(name,...args)=>new Promise((resolve,reject)=>{
    if(!globalThis.google?.script?.run){reject(new Error("google.script.run unavailable"));return;}
    google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[name](...args);
  });
  const mergeAuthoritative=remote=>{
    if(!remote)return null;
    const privateState=local.loadSession()||{};
    const merged={...privateState,...remote,events:privateState.events||[],doseCounts:privateState.doseCounts||{},_actionEvents:privateState._actionEvents||[]};
    return local.replaceAuthoritative(merged);
  };
  const coordinationSnapshot=session=>{
    const clean=JSON.parse(JSON.stringify(session));
    delete clean._actionEvents;delete clean.events;delete clean.doseCounts;
    clean.timers=(clean.timers||[]).map(({medId,...timer})=>timer);
    return clean;
  };
  const coordinationEvent=event=>event.type==="MEDICATION_ADMINISTERED"?{...event,type:"TASK_UPDATED",payload:{coordinationOnly:true}}:event;
  const beginPolling=()=>{
    clearInterval(pollHandle);
    if(!activeSessionId)return;
    pollHandle=setInterval(async()=>{
      try{
        const current=local.loadSession(),result=await call("pollSession",activeSessionId,current?.revision||0);
        if(result?.changed&&result.session)mergeAuthoritative(result.session);
      }catch{/* Local emergency screen remains usable while sync is unavailable. */}
    },pollMs);
  };
  return {
    createSession(seed){
      const created=local.createSession(seed);activeSessionId=created.id;beginPolling();
      call("createSession",coordinationSnapshot(created)).then(r=>r?.session&&mergeAuthoritative(r.session)).catch(()=>{});
      return created;
    },
    loadSession(){const s=local.loadSession();activeSessionId=s?.id||null;beginPolling();return s;},
    recordAction(input){
      const result=local.recordAction(input);
      if(result.applied){
        call("recordAction",coordinationEvent(result.event),coordinationSnapshot(result.session),input.expectedRevision)
          .then(r=>r?.session&&mergeAuthoritative(r.session)).catch(()=>{});
      }
      return result;
    },
    subscribe(listener){return local.subscribe(listener);},
    clear(){activeSessionId=null;clearInterval(pollHandle);local.clear();}
  };
}
