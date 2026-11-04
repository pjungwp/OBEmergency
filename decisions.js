// Decision queue. Triggers only ASK a question; an answer is recorded only from a tap.
// No DOM. Session fields used: session.decisions = {queue:[], answers:[], closed:[]}
//                              session.branch    = {activated:[], pinned:null, reopen:[]}

export function ensureDecisionState(session){
  session.decisions=session.decisions||{queue:[],answers:[],closed:[]};
  session.branch=session.branch||{activated:[],pinned:null};
  return session;
}

function done(session,id){const s=session.tasks?.[id]?.status;return s==="done"||s==="ongoing"||s==="progress";}
function canAsk(session,d){
  const q=session.decisions;
  if(q.closed.includes(d.id))return false;
  if(q.queue.some(x=>x.id===d.id))return false;
  if(!d.repeat&&q.answers.some(a=>a.id===d.id))return false;
  return (d.requires||[]).every(id=>done(session,id));
}
function enqueue(session,d,atMs,trigger){session.decisions.queue.push({id:d.id,dueAt:atMs,trigger,deferred:false});return d.id;}

// A task was completed, assessed or marked ongoing.
export function onTaskEvent(session,decisions,taskId,atMs){
  ensureDecisionState(session);
  return decisions.filter(d=>(d.on||[]).includes(taskId)&&canAsk(session,d)).map(d=>enqueue(session,d,atMs,`task:${taskId}`));
}
// A medication reassessment reminder came due.
export function onTimerDue(session,decisions,medId,atMs){
  ensureDecisionState(session);
  return decisions.filter(d=>(d.onTimer||[]).includes(medId)&&canAsk(session,d)).map(d=>enqueue(session,d,atMs,`timer:${medId}`));
}
// Clock tick: minute-based questions are asked once.
export function onTick(session,decisions,nowMs){
  ensureDecisionState(session);
  return decisions.filter(d=>d.atMin!=null&&nowMs>=d.atMin*60000&&canAsk(session,d)&&!session.decisions.answers.some(a=>a.id===d.id)).map(d=>enqueue(session,d,d.atMin*60000,`minute:${d.atMin}`));
}

// Back to actions: no answer is recorded; the question stays queued.
export function defer(session,id){
  ensureDecisionState(session);
  const item=session.decisions.queue.find(x=>x.id===id);
  if(item){item.deferred=true;item.deferrals=(item.deferrals||0)+1;}
  return item||null;
}
export function reopen(session,id){
  const item=session.decisions?.queue.find(x=>x.id===id);if(item)item.deferred=false;return item||null;
}

// Record an answer. Returns the effects for the caller to apply to task state.
export function answer(session,decisions,id,value,atMs){
  ensureDecisionState(session);
  const d=decisions.find(x=>x.id===id);if(!d)throw new Error(`Unknown decision ${id}`);
  const a=d.answers.find(x=>x.value===value);if(!a)throw new Error(`Unknown answer ${value}`);
  session.decisions.queue=session.decisions.queue.filter(x=>x.id!==id);
  session.decisions.answers.push({id,value,at:atMs,branch:a.branch||null});
  if(a.terminal)session.decisions.closed.push(id);
  const act=new Set(session.branch.activated);(a.activate||[]).forEach(t=>act.add(t));
  session.branch.activated=[...act];
  if(a.pin)session.branch.pinned=a.pin;
  return {activate:a.activate||[],reopen:a.reopen||[],pin:a.pin||null,note:a.note||"",branch:a.branch||null,label:a.label};
}

// The question to show full screen now (first one not deferred), or null.
export function takeover(session){return session.decisions?.queue.find(x=>!x.deferred)||null;}
export function waiting(session){return session.decisions?.queue||[];}
