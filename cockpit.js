// Two-state cockpit rendering: Decision Mode and the Split Action Dashboard.
// Pure HTML builders; app.js owns state and events. See DESIGN-RULES.md.

export const SECTION_TITLES={now:"NOW / DUE",ongoing:"ONGOING",completed:"COMPLETED",next:"UP NEXT"};

// ---- State A: full-screen decision ----
export function decisionModeHTML({e,d,ctx,pendingCount,waitingCount}){
  const [a,b]=d.answers;
  return `<section class="decision-mode ${e.accent}" role="dialog" aria-modal="true" aria-labelledby="decisionQ">
    <header class="dm-head"><span class="dm-tag">${ctx.esc((e.id==="pph"?"PPH":e.short).toUpperCase())} · DECISION</span><strong class="live-elapsed dm-clock">${ctx.fmt(ctx.nowMs)}</strong></header>
    <h1 id="decisionQ" tabindex="-1">${ctx.esc(d.q)}</h1>
    <div class="dm-answers">
      <button class="dm-yes" data-answer="${a.value}" data-decision="${d.id}" aria-keyshortcuts="Y">${ctx.esc(a.label)}</button>
      ${b?`<button class="dm-no" data-answer="${b.value}" data-decision="${d.id}" aria-keyshortcuts="N">${ctx.esc(b.label)}</button>`:""}
    </div>
    <footer class="dm-foot"><button class="dm-back" data-action="defer-decision" data-decision="${d.id}" aria-keyshortcuts="Escape">‹ Back to actions</button><span>${pendingCount} action${pendingCount===1?"":"s"} pending${waitingCount>1?` · ${waitingCount-1} more question${waitingCount>2?"s":""}`:""}</span></footer>
  </section>`;
}

// ---- State B: split action dashboard ----
export function primaryAction(t,stored){
  if(t.type==="med")return {action:"done",label:"Record dose"};
  if(t.type==="repeat")return {action:"done",label:"Assessed ✓"};
  if(t.type==="ongoing"&&stored!=="ongoing"&&stored!=="progress")return {action:"ongoing",label:"Started ✓"};
  return {action:"done",label:"DONE ✓"};
}

export function urgentHTML({t,ctx,pinnedNote,icon=""}){
  if(!t)return `<section class="dash-urgent empty" aria-label="Most urgent"><span class="du-label">MOST URGENT</span><h2>All listed actions recorded</h2><p class="du-sub">Keep reassessing. Questions appear when due.</p></section>`;
  const st=ctx.stored(t.id),pa=primaryAction(t,st);
  return `<section class="dash-urgent ${t.priority}${ctx.overdue(t.id)?" is-overdue":""}" id="card-${t.id}" aria-label="Most urgent action">
    <div class="du-top"><span class="du-label">${pinnedNote?ctx.esc(pinnedNote):"MOST URGENT"}</span><button class="info-dot" data-task-info="${t.id}" data-emergency-id="${ctx.emergencyId}" aria-label="Details">i</button></div>
    ${icon?`<div class="du-icon" aria-hidden="true">${icon}</div>`:""}
    ${ctx.statusHTML(t)}
    <h2>${ctx.esc(ctx.label(t))}</h2>
    ${ctx.sub(t)?`<p class="du-sub">${ctx.esc(ctx.sub(t))}</p>`:""}
    <button class="du-done" data-task-action="${pa.action}" data-task-id="${t.id}" aria-keyshortcuts="D">${pa.label}</button>
    ${pa.action==="done"&&t.type!=="med"&&t.type!=="repeat"&&st!=="ongoing"&&st!=="progress"?`<button class="du-second" data-task-action="ongoing" data-task-id="${t.id}">Mark ongoing</button>`:""}
  </section>`;
}

const ICON={pending:"",ongoing:"",completed:"✓",overdue:""};
export function rowHTML(t,kind,ctx){
  const over=ctx.overdue(t.id),k=over&&kind!=="completed"?"overdue":kind;
  return `<button class="ck-row ${k} ${t.priority}" data-check="${t.id}"><span class="ck-box ${k==="now"||k==="next"?"pending":k}" aria-hidden="true">${ICON[k==="now"||k==="next"?"pending":k]}</span><span class="ck-name">${ctx.esc(ctx.check(t))}</span><span class="ck-state">${ctx.rowState(t,kind)}</span></button>`;
}

export function checklistHTML({c,ctx,open}){
  const sec=(key,list,collapsible)=>{
    if(!list.length&&key!=="now")return "";
    const isOpen=open[key]??!collapsible;
    const body=list.length?list.map(t=>rowHTML(t,key,ctx)).join(""):`<p class="ck-empty">Nothing else due now.</p>`;
    return `<section class="ck-sec ck-${key}">
      <button class="ck-head" data-action="toggle-section" data-section="${key}" aria-expanded="${isOpen}"><i class="chev${isOpen?" open":""}" aria-hidden="true"></i><span>${SECTION_TITLES[key]} (${list.length})</span>${!isOpen&&list.length?`<b class="${key==="completed"?"ok":""}">${key==="completed"?"✓ ":""}${list.length}</b>`:""}</button>
      ${isOpen?`<div class="ck-list">${body}</div>`:""}
    </section>`;
  };
  return `<div class="ck-top"><span>CHECKLIST</span><b>${c.done}/${c.total}</b></div>
    ${sec("now",c.now,false)}${sec("ongoing",c.ongoing,false)}${sec("completed",c.completed,true)}${sec("next",c.next,true)}`;
}

// ---- Shoulder dystocia: clock left, maneuver log right ----
export function dystociaLeftHTML({ctx,nextId,delivered}){
  if(delivered!=null)return `<section class="dash-urgent clock-left delivered" aria-label="Head-to-body interval">
    <span class="du-label">HEAD-TO-BODY</span><strong class="big-clock">${ctx.fmt(delivered)}</strong>
    <p class="du-sub">Delivered. Neonatal team · PPH watch · document.</p>
    <button class="du-done" data-check="sd-after">After delivery ›</button></section>`;
  return `<section class="dash-urgent clock-left" aria-label="Time since head delivered">
    <span class="du-label">SINCE HEAD DELIVERED</span>
    <strong class="big-clock live-elapsed" aria-live="off">${ctx.fmt(ctx.nowMs)}</strong>
    ${nextId?`<button class="du-second next-man" data-maneuver="${nextId}">Next: <b>${ctx.esc(ctx.check({id:nextId}))}</b> · log</button>`:""}
    <button class="du-done delivered-btn" data-action="mark-delivered">Baby delivered</button>
  </section>`;
}
export function maneuverLogHTML({config,ctx,attempts,setup}){
  const row=id=>{const a=attempts(id),last=a[a.length-1];
    return `<button class="ck-row man ${a.length?"completed":"pending"}" data-maneuver="${id}"><span class="ck-box ${a.length?"completed":"pending"}" aria-hidden="true">${a.length?"✓":""}</span><span class="ck-name">${ctx.esc(ctx.check({id}))}</span><span class="ck-state">${a.length?`${a.length>1?`×${a.length} · `:""}${ctx.fmt(last.at)}`:"tap to log"}</span></button>`;};
  return `<div class="ck-top"><span>MANEUVER LOG</span><b>${config.sections.reduce((n,s)=>n+s.ids.filter(id=>attempts(id).length).length,0)}</b></div>
    <section class="ck-sec ck-now"><h3 class="ck-head"><span>SET UP</span></h3><div class="ck-list">${setup.map(t=>rowHTML(t.task,t.kind,ctx)).join("")}</div></section>
    ${config.sections.map(s=>`<section class="ck-sec"><h3 class="ck-head"><span>${ctx.esc(s.title.toUpperCase())}</span></h3><div class="ck-list">${s.ids.map(row).join("")}</div></section>`).join("")}
    <button class="text-button undo-man" data-action="undo-maneuver">Undo last log entry</button>`;
}

// ---- P1 alert card (over the dashboard) ----
export function alertCardHTML(a,ctx){
  const t=a.timer;
  return `<section class="alert-card" role="alert">
    <div><span class="ac-label">REASSESS</span><strong>${ctx.esc(t.label)}</strong><span class="ac-time live-overdue" data-due-at="${t.dueAt}">overdue ${ctx.fmt((ctx.nowMs/60000-t.dueAt)*60000)}</span></div>
    <div class="ac-actions">
      ${t.taskId?`<button class="button primary" data-task-action="done" data-task-id="${t.taskId}">Assessed ✓</button>`:""}
      <button class="button secondary" data-action="ack-timer" data-timer-id="${t.id}">Acknowledge</button>
      <button class="button ghost" data-action="snooze-timer" data-timer-id="${t.id}">Snooze 1 min</button>
    </div>
  </section>`;
}
