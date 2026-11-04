// Session timeline: append-only. Each entry carries seq, wallAt and at (elapsed ms on the
// session clock). Undo appends a reversing entry; nothing is deleted. No DOM.

export function appendEvent(session,{text,type="note",at,data}){
  session.events=session.events||[];
  session.seq=(session.seq||session.events.length)+1;
  const ev={id:`e${session.seq}`,seq:session.seq,wallAt:new Date().toISOString(),at,type,text,...(data?{data}:{})};
  session.events.unshift(ev);
  return ev;
}
// Newest first by clock time; ties by sequence (later entry first).
export function timeline(session){return [...(session.events||[])].sort((a,b)=>(b.at-a.at)||((b.seq||0)-(a.seq||0)));}

// Debrief export: plain text, no identifiers.
export function exportText(session,{title,fmt}){
  const lines=[`${title}`,`${session.mode==="simulation"?"Simulation":"Clinical"} session · started ${session.startedAt}`,""];
  [...timeline(session)].reverse().forEach(e=>lines.push(`${fmt(e.at)}  ${e.text}`));
  const ans=session.decisions?.answers||[];
  if(ans.length){lines.push("","Decisions:");ans.forEach(a=>lines.push(`${fmt(a.at)}  ${a.id} → ${a.value.toUpperCase()}`));}
  const doses=session.doses||[];
  if(doses.length){lines.push("","Doses (given / recorded):");doses.forEach(d=>lines.push(`${fmt(d.givenAt)} / ${fmt(d.recordedAt)}  ${d.medId} #${d.n}`));}
  if(session.notes?.length){lines.push("","Instructor notes:");session.notes.forEach(n=>lines.push(`${fmt(n.at)}  ${n.text}`));}
  return lines.join("\n");
}
