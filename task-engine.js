// Task engine: task states, checklist sections and the single most-urgent action.
// No DOM. Run under node --test.
//
// Stored states (kept for old sessions): todo | progress | ongoing | done
// Displayed states: pending | ongoing | completed

const RANK = {critical:0,high:1,routine:2};

export function displayState(stored){
  if(stored==="done")return "completed";
  if(stored==="ongoing"||stored==="progress")return "ongoing";
  return "pending";
}

// tasks: ordered task list for the emergency
// states: {taskId:{status}}           overdue: Set of task ids with a due reminder
// activated: Set of task ids brought forward by a decision answer
// gated: Set of task ids held back until activated         pinned: task id or null
export function buildChecklist({tasks,states={},overdue=new Set(),activated=new Set(),gated=new Set(),pinned=null}){
  const st=id=>displayState(states[id]?.status);
  const order=new Map(tasks.map((t,i)=>[t.id,i]));
  const completed=[],ongoing=[],pending=[];
  for(const t of tasks){
    const s=st(t.id);
    if(s==="completed")completed.push(t);
    else if(s==="ongoing"&&!overdue.has(t.id))ongoing.push(t);
    else pending.push(t);
  }
  // NOW/DUE = overdue ∪ activated ∪ pending tasks in the first two open groups (gated tasks excluded).
  const openGroups=[];
  for(const t of pending){
    if(gated.has(t.id)&&!activated.has(t.id))continue;
    if(!openGroups.includes(t.group))openGroups.push(t.group);
  }
  const nowGroups=new Set(openGroups.slice(0,2));
  const isNow=t=>overdue.has(t.id)||activated.has(t.id)||(nowGroups.has(t.group)&&!(gated.has(t.id)&&!activated.has(t.id)));
  const now=pending.filter(isNow),next=pending.filter(t=>!isNow(t));
  const rank=t=>[
    t.id===pinned?0:1,
    overdue.has(t.id)?0:1,
    RANK[t.priority]??2,
    order.get(t.id)
  ];
  const cmp=(a,b)=>{const x=rank(a),y=rank(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return x[i]-y[i];return 0;};
  now.sort(cmp);
  const mostUrgent=now[0]||next.find(t=>!gated.has(t.id))||null;
  return {
    mostUrgent,
    now:now.filter(t=>t!==mostUrgent),
    ongoing,
    completed,
    next:next.filter(t=>t!==mostUrgent),
    total:tasks.length,
    done:completed.length
  };
}
