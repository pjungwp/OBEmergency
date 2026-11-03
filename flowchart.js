// Flowchart engine: one pathway record (pathways.js) → three views.
//   Overview  — semantic HTML map of every stage and branch (default)
//   Guided    — numbered steps with checklists, labelled decision branches
//   Full chart— SVG diagram with pan, pinch/wheel zoom, fit, fullscreen, print
// Rendering is pure: callers pass a ctx with task status and UI state.
// Events are wired in app.js through data-* attributes.

const fcEsc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const TYPE_LABEL={start:"Start",action:"Action",decision:"Decision",parallel:"At the same time",escalation:"Escalation",endpoint:"Outcome"};

// ---------- shared helpers ----------
function allGroups(p){const m=new Map();p.chart.rows.forEach(r=>r.forEach(c=>{if(typeof c==="object")m.set(c.group,c);}));return m;}
function rowOf(p,id){for(let i=0;i<p.chart.rows.length;i++){for(const c of p.chart.rows[i]){if(c===id)return i;if(typeof c==="object"&&(c.group===id||c.nodes.includes(id)||c.head===id))return i;}}return -1;}
function incomingLabel(p,id){
  // label of the branch that leads into `id` (e.g. "Yes", "No"), if any
  for(const [nid,n] of Object.entries(p.nodes))for(const c of n.connections||[])if(c.to===id&&c.label)return {label:c.label,from:nid};
  return null;
}
export function nodeStatus(node,ctx){
  const tasks=(node.items||[]).map(i=>i.task).filter(Boolean);
  if(!tasks.length||!ctx.sessionActive)return null;
  const st=tasks.map(t=>ctx.taskStatus(t));
  if(st.includes("overdue"))return "overdue";
  if(st.every(s=>s==="done"))return "done";
  if(st.some(s=>s==="done"||s==="progress"||s==="ongoing"))return "active";
  return "todo";
}
const STATUS_TEXT={done:"Done",active:"In progress",overdue:"Overdue",todo:"To do"};
function statusBadge(s){return s&&s!=="todo"?`<span class="fc-status ${s}" aria-label="${STATUS_TEXT[s]}">${s==="done"?"✓":s==="overdue"?"!":s==="active"?"•":""}</span>`:"";}

// ---------- Overview ----------
function ovBox(p,id,ctx,{compact=false}={}){
  const n=p.nodes[id];const s=nodeStatus(n,ctx);const inc=incomingLabel(p,id);
  const body=n.bullets?.length?`<ul>${n.bullets.map(b=>`<li>${fcEsc(b)}</li>`).join("")}</ul>`:`<p>${fcEsc(n.summary)}</p>`;
  return `<button class="ov-box t-${n.type} u-${n.urgency}${n.medicationRefs?" meds":""}${s?` s-${s}`:""}" data-fnode="${id}" aria-label="${fcEsc(n.title)}. ${fcEsc(n.summary)}${s?`. ${STATUS_TEXT[s]}`:""}">
    ${inc&&!compact?`<span class="ov-branch">${fcEsc(inc.label)}</span>`:""}
    <span class="ov-title">${fcEsc(n.title)}${statusBadge(s)}</span>${compact&&n.type!=="decision"?`<p>${fcEsc(n.summary)}</p>`:n.type==="decision"?`<p>${fcEsc(n.summary)}</p>`:body}
  </button>`;
}
export function renderOverview(p,ctx,{compact=false}={}){
  return `<div class="ov${compact?" compact":""}">${p.chart.rows.map((row,i)=>{
    const cells=row.map(c=>{
      if(typeof c==="string")return ovBox(p,c,ctx,{compact});
      const head=c.head?p.nodes[c.head]:null;const hs=head?nodeStatus(head,ctx):null;
      return `<div class="ov-group${c.nodes.length>2?" many":""}" role="group" aria-label="${fcEsc(c.label)}">
        <button class="ov-group-head" data-fnode="${c.head||c.nodes[0]}">${fcEsc(c.label)}${statusBadge(hs)}</button>
        <div class="ov-group-cells n${c.nodes.length}">${c.nodes.map(id=>ovBox(p,id,ctx,{compact:true})).join("")}</div></div>`;
    }).join("");
    const arrow=i<p.chart.rows.length-1?`<div class="ov-arrow" aria-hidden="true">${row.length===1&&p.nodes[row[0]]?.type==="decision"?"↙ ↘":"↓"}</div>`:"";
    return `<div class="ov-row n${row.length}">${cells}</div>${arrow}`;
  }).join("")}</div>`;
}

// ---------- Guided ----------
function stepOfNode(p,id){return p.steps.findIndex(s=>s.nodes.includes(id));}
function itemHTML(p,nid,item,i,ctx){
  if(item.med)return `<button class="g-med" data-med-id="${item.med}"><span aria-hidden="true">Rx</span>${fcEsc(item.text)}<b aria-hidden="true">›</b></button>`;
  if(item.pathway)return `<button class="g-med path" data-fpath="${item.pathway}"><span aria-hidden="true">→</span>${fcEsc(item.text)}<b aria-hidden="true">›</b></button>`;
  let on,key;
  if(item.task&&ctx.sessionActive){const st=ctx.taskStatus(item.task);on=st==="done"||st==="ongoing";key=`task:${item.task}`;}
  else{key=`local:${p.id}:${nid}:${i}`;on=ctx.localChecks.has(key);}
  const overdue=item.task&&ctx.sessionActive&&ctx.taskStatus(item.task)==="overdue";
  return `<button class="g-check${on?" on":""}${overdue?" overdue":""}" role="checkbox" aria-checked="${on}" data-gcheck="${key}"><span class="box" aria-hidden="true">${on?"✓":""}</span><span>${fcEsc(item.text)}${overdue?` <em>overdue</em>`:""}</span></button>`;
}
function nodeBlock(p,nid,ctx){
  const n=p.nodes[nid];
  const items=(n.items||[]).map((it,i)=>itemHTML(p,nid,it,i,ctx)).join("");
  if(!items)return `<button class="g-info" data-fnode="${nid}"><strong>${fcEsc(n.title)}</strong><span>${fcEsc(n.summary)}</span></button>`;
  return `<div class="g-node"><button class="g-node-head" data-fnode="${nid}"><span>${fcEsc(n.title)}</span><i aria-hidden="true">i</i></button>${items}</div>`;
}
export function renderGuided(p,ctx){
  const k=Math.min(ctx.step??0,p.steps.length-1);const step=p.steps[k];
  const branch=ctx.branch;
  const dec=step.decision?p.nodes[step.decision]:null;
  const branchBtns=dec?`<div class="g-question"><p>${fcEsc(dec.title)}</p><span>${fcEsc(dec.summary)}</span><div class="g-branches">${dec.connections.map(c=>{const t=p.nodes[c.to]||{};const cls=t.type==="escalation"||stepOfNode(p,c.to)>=0&&p.steps[stepOfNode(p,c.to)].escalation?"bad":t.type==="endpoint"?"good":"";return `<button class="g-branch ${cls}${branch===c.to?" chosen":""}" data-gbranch="${c.to}"><strong>${fcEsc(c.label)}</strong><span>${fcEsc(t.title||"Next")}</span></button>`;}).join("")}</div></div>`:"";
  // A chosen branch whose target is not its own step (e.g. "Controlled") is shown inline here.
  const inline=branch&&p.nodes[branch]&&stepOfNode(p,branch)<0?(()=>{const t=p.nodes[branch];return `<div class="g-outcome t-${t.type}">${nodeBlock(p,branch,ctx)}${(t.connections||[]).map(c=>`<button class="g-branch bad" data-gbranch="${c.to}"><strong>${fcEsc(c.label||"Next")}</strong><span>${fcEsc(p.nodes[c.to]?.title||"")}</span></button>`).join("")}</div>`;})():"";
  const body=step.nodes.filter(id=>id!==step.decision||(p.nodes[id].items||[]).length).map(id=>nodeBlock(p,id,ctx)).join("");
  return `<div class="g">
    <div class="g-progress"><span>Step ${k+1} of ${p.steps.length}</span><div class="bar"><i style="width:${Math.round((k+1)/p.steps.length*100)}%"></i></div></div>
    <p class="g-mode-note">${ctx.sessionActive?"Checks update the action cards and timeline.":"Reference mode — checks stay on this screen only."}</p>
    ${p.steps.map((s,i)=>{
      if(i===k)return `<section class="g-step current${s.escalation?" esc":""}" aria-current="step">
        <h3><span class="num">${i+1}</span>${fcEsc(s.title)}</h3>
        ${s.parallel?`<p class="g-parallel">All at the same time — not in order</p>`:""}
        ${body}${branchBtns}${inline}
        ${i<p.steps.length-1&&!dec?`<button class="g-next" data-gstep="${i+1}"><span aria-hidden="true">✓</span> Done → Next step</button>`:""}
      </section>`;
      return `<button class="g-step row${i<k?" past":""}${s.escalation?" esc":""}" data-gstep="${i}"><span class="num">${i<k?"✓":i+1}</span><span>${fcEsc(s.title)}</span><b aria-hidden="true">›</b></button>`;
    }).join("")}
  </div>`;
}

// ---------- Full chart (SVG) ----------
const FC_W=600,FC_GAP=14,FC_ROWGAP=46,FC_PAD=16;
function fcWrap(text,maxChars){const words=String(text||"").split(/\s+/);const lines=[];let cur="";for(const w of words){if((cur+" "+w).trim().length>maxChars&&cur){lines.push(cur);cur=w;}else cur=(cur+" "+w).trim();}if(cur)lines.push(cur);return lines;}
function boxSize(n,width){
  const tl=fcWrap(n.title,Math.floor(width/9.6)),sl=fcWrap(n.summary,Math.floor(width/7.4));
  return {tl,sl,h:18+tl.length*19+sl.length*16+12};
}
export function renderChartSVG(p,ctx){
  const place={};let y=FC_PAD;const parts=[];const groupsDrawn=[];
  p.chart.rows.forEach(row=>{
    const cellW=(FC_W-FC_PAD*2-FC_GAP*(row.length-1))/row.length;let x=FC_PAD;let rowH=0;const pending=[];
    row.forEach(c=>{
      if(typeof c==="string"){const n=p.nodes[c];const sz=boxSize(n,cellW);pending.push({kind:"node",id:c,x,w:cellW,sz});rowH=Math.max(rowH,sz.h);}
      else{
        const inner=c.nodes.length;const iw=(cellW-12-8*(inner-1))/inner;const sizes=c.nodes.map(id=>boxSize(p.nodes[id],iw));
        const ih=Math.max(...sizes.map(s=>s.h));const gh=34+ih+10;
        pending.push({kind:"group",g:c,x,w:cellW,iw,sizes,ih,h:gh});rowH=Math.max(rowH,gh);
      }
      x+=cellW+FC_GAP;
    });
    pending.forEach(it=>{
      if(it.kind==="node"){const h=it.sz.h;place[it.id]={x:it.x,y,w:it.w,h};parts.push(drawNode(p,it.id,it.x,y,it.w,h,it.sz,ctx));}
      else{
        place[it.g.group]={x:it.x,y,w:it.w,h:it.h};
        const head=it.g.head?p.nodes[it.g.head]:null;
        groupsDrawn.push(`<g class="svg-group" ${it.g.head?`data-fnode="${it.g.head}" role="button" tabindex="0" aria-label="${fcEsc(it.g.label)}"`:""}><rect x="${it.x}" y="${y}" width="${it.w}" height="${it.h}" rx="14" class="grp"/><rect x="${it.x}" y="${y}" width="${it.w}" height="28" rx="14" class="grp-head"/><rect x="${it.x}" y="${y+14}" width="${it.w}" height="14" class="grp-head"/><text x="${it.x+it.w/2}" y="${y+19}" class="grp-label" text-anchor="middle">${fcEsc(it.g.label)}${head?" ⓘ":""}</text></g>`);
        let ix=it.x+6;it.g.nodes.forEach((id,k)=>{place[id]={x:ix,y:y+34,w:it.iw,h:it.ih};parts.push(drawNode(p,id,ix,y+34,it.iw,it.ih,it.sizes[k],ctx));ix+=it.iw+8;});
      }
    });
    y+=rowH+FC_ROWGAP;
  });
  const H=y-FC_ROWGAP+FC_PAD;
  // edges
  const edges=[];
  const add=(from,c)=>{const a=place[from],b=place[c.to];if(!a||!b)return;
    const sameRow=Math.abs(a.y-b.y)<2;
    if(sameRow){const left=a.x<b.x;const x1=left?a.x+a.w:a.x,x2=left?b.x:b.x+b.w,yy=a.y+Math.min(a.h,b.h)/2;
      edges.push(`<path d="M${x1} ${yy} L${x2} ${yy}" class="edge" marker-end="url(#arr)"/>`);if(c.label)edges.push(edgeLabel((x1+x2)/2,yy-8,c.label,c.label));return;}
    const x1=a.x+a.w/2,y1=a.y+a.h,x2=b.x+b.w/2,y2=b.y,my=y1+(y2-y1)/2;
    edges.push(`<path d="M${x1} ${y1} L${x1} ${my} L${x2} ${my} L${x2} ${y2-2}" class="edge" marker-end="url(#arr)"/>`);
    if(c.label)edges.push(edgeLabel(x2,my+15,c.label,c.label));
  };
  Object.entries(p.nodes).forEach(([id,n])=>(n.connections||[]).forEach(c=>add(id,c)));
  allGroups(p).forEach(g=>(g.connections||[]).forEach(c=>add(g.group,c)));
  return {W:FC_W,H,svg:`<svg viewBox="0 0 ${FC_W} ${H}" width="${FC_W}" height="${H}" class="fc-svg" role="img" aria-label="${fcEsc(p.title)} full algorithm" xmlns="http://www.w3.org/2000/svg">
    <defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="arrowhead"/></marker></defs>
    ${groupsDrawn.join("")}${edges.join("")}${parts.join("")}</svg>`};
}
function edgeLabel(x,y,text,kind){const w=Math.max(34,text.length*7.4+16);const cls=/^yes/i.test(kind)?"yes":/^no/i.test(kind)?"no":"";return `<g class="edge-label ${cls}"><rect x="${x-w/2}" y="${y-13}" width="${w}" height="20" rx="10"/><text x="${x}" y="${y+1}" text-anchor="middle">${fcEsc(text)}</text></g>`;}
function drawNode(p,id,x,y,w,h,sz,ctx){
  const n=p.nodes[id];const s=nodeStatus(n,ctx);
  const shape=n.type==="decision"
    ?`<path d="M${x+18} ${y} H${x+w-18} L${x+w} ${y+h/2} L${x+w-18} ${y+h} H${x+18} L${x} ${y+h/2} Z" class="nb"/>`
    :`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" class="nb"/>`;
  let ty=y+24;const t=sz.tl.map(l=>{const r=`<text x="${x+w/2}" y="${ty}" class="nt" text-anchor="middle">${fcEsc(l)}</text>`;ty+=19;return r;}).join("");
  ty+=2;const sm=sz.sl.map(l=>{const r=`<text x="${x+w/2}" y="${ty}" class="ns" text-anchor="middle">${fcEsc(l)}</text>`;ty+=16;return r;}).join("");
  const badge=s&&s!=="todo"?`<g class="svg-status ${s}"><circle cx="${x+w-12}" cy="${y+12}" r="9"/><text x="${x+w-12}" y="${y+16}" text-anchor="middle">${s==="done"?"✓":s==="overdue"?"!":"•"}</text></g>`:"";
  return `<g class="svg-node t-${n.type} u-${n.urgency}${n.medicationRefs?" meds":""}" data-fnode="${id}" role="button" tabindex="0" aria-label="${fcEsc(n.title)}. ${fcEsc(n.summary)}${s?`. ${STATUS_TEXT[s]}`:""}">${shape}${t}${sm}${badge}</g>`;
}
export function renderChart(p,ctx){
  const {svg}=renderChartSVG(p,ctx);
  return `<div class="fc-tools" role="toolbar" aria-label="Chart controls">
      <button data-zoom="in" aria-label="Zoom in">＋</button><button data-zoom="out" aria-label="Zoom out">−</button>
      <button data-zoom="fit">Fit</button><button data-zoom="full" aria-label="Fullscreen">⛶</button><button data-zoom="print">Print / PDF</button>
    </div>
    <div class="fc-viewport" tabindex="0" aria-label="Full algorithm. Drag to pan, pinch or use the buttons to zoom.">${svg}</div>
    <p class="fc-hint">Drag to pan · pinch or ＋/− to zoom · tap a box for details</p>`;
}

// ---------- pan / zoom ----------
export function mountChart(root,saved){
  const vp=root.querySelector(".fc-viewport");const svg=vp?.querySelector("svg");if(!svg)return null;
  const W0=+svg.getAttribute("width"),H0=+svg.getAttribute("height");
  let s=1,tx=0,ty=0;const pts=new Map();let moved=false,start=null,pinch=null;
  const apply=()=>{svg.style.transform=`translate(${tx}px,${ty}px) scale(${s})`;};
  const fit=()=>{const r=vp.getBoundingClientRect();s=Math.min(r.width/W0,1.6);tx=(r.width-W0*s)/2;ty=0;vp.style.height=Math.min(Math.max(H0*s+8,280),window.innerHeight*0.78)+"px";apply();};
  const zoomAt=(f,cx,cy)=>{const ns=Math.min(4,Math.max(0.3,s*f));tx=cx-(cx-tx)*(ns/s);ty=cy-(cy-ty)*(ns/s);s=ns;apply();};
  svg.style.transformOrigin="0 0";svg.style.width=W0+"px";svg.style.height=H0+"px";
  vp.addEventListener("pointerdown",e=>{pts.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=false;start={x:e.clientX,y:e.clientY,tx,ty};if(pts.size===2){const [a,b]=[...pts.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),s};}});
  const onMove=e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size===2&&pinch){const [a,b]=[...pts.values()];const r=vp.getBoundingClientRect();const d=Math.hypot(a.x-b.x,a.y-b.y);zoomAt((pinch.s*d/pinch.d)/s,(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top);moved=true;return;}
    if(start){const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.abs(dx)+Math.abs(dy)>6)moved=true;if(moved){tx=start.tx+dx;ty=start.ty+dy;apply();}}};
  const end=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch=null;if(!pts.size)start=null;};
  window.addEventListener("pointermove",onMove);window.addEventListener("pointerup",end);window.addEventListener("pointercancel",end);
  vp.addEventListener("click",e=>{if(moved){e.stopPropagation();e.preventDefault();moved=false;}},true);
  vp.addEventListener("wheel",e=>{e.preventDefault();const r=vp.getBoundingClientRect();zoomAt(e.deltaY<0?1.12:1/1.12,e.clientX-r.left,e.clientY-r.top);},{passive:false});
  vp.addEventListener("keydown",e=>{const r=vp.getBoundingClientRect();if(e.key==="+"||e.key==="=")zoomAt(1.2,r.width/2,r.height/2);if(e.key==="-")zoomAt(1/1.2,r.width/2,r.height/2);if(e.key==="0")fit();
    const step=40;if(e.target===vp){if(e.key==="ArrowLeft"){tx+=step;apply();}if(e.key==="ArrowRight"){tx-=step;apply();}if(e.key==="ArrowUp"){ty+=step;apply();e.preventDefault();}if(e.key==="ArrowDown"){ty-=step;apply();e.preventDefault();}}});
  // Restore the previous pan/zoom after a re-render (e.g. a timer firing), else fit to width.
  if(saved){s=saved.s;tx=saved.tx;ty=saved.ty;vp.style.height=saved.h;apply();}else fit();
  let lastW=vp.parentElement.getBoundingClientRect().width;
  const ro=new ResizeObserver(()=>{const w=vp.parentElement.getBoundingClientRect().width;if(Math.abs(w-lastW)>2){lastW=w;fit();}});ro.observe(vp.parentElement);
  return {
    zoom(d){const r=vp.getBoundingClientRect();zoomAt(d==="in"?1.25:1/1.25,r.width/2,r.height/2);},
    fit,
    state(){return {s,tx,ty,h:vp.style.height};},
    full(){const host=root;if(document.fullscreenElement){document.exitFullscreen();return;}
      if(host.requestFullscreen){host.requestFullscreen().then(()=>setTimeout(fit,120)).catch(()=>{host.classList.toggle("fc-pseudo-full");setTimeout(fit,50);});}
      else{host.classList.toggle("fc-pseudo-full");setTimeout(fit,50);}},
    destroy(){ro.disconnect();window.removeEventListener("pointermove",onMove);window.removeEventListener("pointerup",end);window.removeEventListener("pointercancel",end);}
  };
}
export {TYPE_LABEL};
