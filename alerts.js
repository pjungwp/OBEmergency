// Alert levels. No DOM.
//   P0  decision takeover (full screen)               — decisions.js
//   P1  reassessment / post-dose reminder: alert card over the dashboard, snooze 1 min
//       snoozed twice → P1 banner (stays until acknowledged); crossed during a sim jump → banner
//   P2  milestone or minute mark: banner only, never a takeover
//   P3  status-strip count     P4  timeline entry only
// Acknowledging an alert never completes a task.

export const SNOOZE_MIN=1;
export const MAX_SNOOZES=2;

export function level(timer){
  if(timer.kind==="milestone")return "P2";
  if(timer.kind==="repeat"||timer.kind==="medication")return "P1";
  return "P3";
}

// timers: session.timers (dueAt and snoozedUntil in minutes)
export function activeAlerts(timers,nowMin){
  return timers.filter(t=>!t.cancelled&&!t.ack&&t.dueAt<=nowMin).map(t=>{
    const lv=level(t),snoozed=(t.snoozedUntil||0)>nowMin,snoozes=t.snoozes||0;
    const form=lv==="P1"&&snoozes<MAX_SNOOZES&&!snoozed&&!t.summarized?"card":lv==="P3"?"count":"banner";
    return {id:t.id,level:lv,form,snoozes,timer:t,overdueMin:nowMin-t.dueAt};
  }).sort((a,b)=>a.level.localeCompare(b.level)||a.timer.dueAt-b.timer.dueAt);
}

export function snooze(timer,nowMin){
  if(level(timer)!=="P1")return false;
  if((timer.snoozes||0)>=MAX_SNOOZES)return false;
  timer.snoozes=(timer.snoozes||0)+1;timer.snoozedUntil=nowMin+SNOOZE_MIN;return true;
}
export function card(alerts){return alerts.find(a=>a.form==="card")||null;}
export function banners(alerts){return alerts.filter(a=>a.form==="banner");}
