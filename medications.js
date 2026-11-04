// Medication administration. No DOM.
// Every dose keeps two times: givenAt (when it went in, chosen by the user) and
// recordedAt (when it was entered). Reassessment timers run from givenAt.

export const GIVEN_AGO_MIN=[0,1,2,5,10];

export function doseCount(session,medId){return (session.doses||[]).filter(d=>d.medId===medId).length||session.doseCounts?.[medId]||0;}

export function canGive(session,med){
  const n=doseCount(session,med.id);
  if(med.maxDoses&&n>=med.maxDoses)return {ok:false,reason:`${med.name}: pathway dose limit reached (${med.maxDoses}). Escalate and verify orders.`};
  return {ok:true,reason:""};
}

// Returns {dose, timer} or throws when the limit blocks the dose.
export function recordDose(session,med,{givenAtMs,recordedAtMs}){
  const check=canGive(session,med);if(!check.ok)throw new Error(check.reason);
  if(givenAtMs>recordedAtMs)throw new RangeError("A dose cannot be given in the future");
  session.doses=session.doses||[];session.doseCounts=session.doseCounts||{};
  const n=doseCount(session,med.id)+1;
  const dose={medId:med.id,n,givenAt:Math.max(0,givenAtMs),recordedAt:recordedAtMs};
  session.doses.push(dose);session.doseCounts[med.id]=n;
  session.doses.sort((a,b)=>a.givenAt-b.givenAt);
  const timer=med.timer?{label:med.timerLabel||`Reassess after ${med.name}`,dueAt:dose.givenAt/60000+med.timer,kind:"medication",medId:med.id}:null;
  return {dose,timer};
}
