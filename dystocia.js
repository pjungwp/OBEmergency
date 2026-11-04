// Shoulder dystocia: clock since head delivery, maneuver log, delivery time. No DOM.

export function logManeuver(session,id,atMs){
  session.maneuvers=session.maneuvers||[];
  const entry={id,at:atMs,n:session.maneuvers.filter(m=>m.id===id).length+1};
  session.maneuvers.push(entry);return entry;
}
export function attempts(session,id){return (session.maneuvers||[]).filter(m=>m.id===id);}
// First maneuver in the configured order not yet tried.
export function suggestNext(session,config){
  for(const s of config.sections)for(const id of s.ids)if(!attempts(session,id).length)return id;
  return null;
}
export function markDelivered(session,atMs){if(session.deliveredAt==null)session.deliveredAt=atMs;return session.deliveredAt;}
// Head-to-body interval in ms (null until delivered).
export function headToBody(session){return session.deliveredAt==null?null:session.deliveredAt;}
