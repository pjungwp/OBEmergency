import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");

const gas=()=>{execFileSync(process.execPath,[path.join(root,"scripts/build-google-apps-script.mjs")],{cwd:root});
  const rd=f=>fs.readFileSync(path.join(root,"dist/gas",f),"utf8");return {index:rd("Index.html"),sim:rd("SimMaster.html"),code:rd("Code.gs")};};
const mainScript=html=>{const parts=html.split("<script>");return parts[parts.length-1].split("</script>")[0];};

test("Apps Script package builds both pages from the shared source, without PWA-only features",()=>{
  const {index,sim,code}=gas();
  for(const html of [index,sim]){
    assert.doesNotMatch(html,/navigator\.serviceWorker\.register/);
    assert.doesNotMatch(html,/manifest\.webmanifest/);
    assert.doesNotMatch(html,/type="module"/);
    assert.doesNotMatch(html,/href="[a-z-]+\.css"/,"styles are inlined");
    assert.match(html,/window\.__GAS=true/);
  }
  assert.match(index,/createWorkspaceSessionStore\(\{key/);
  assert.match(index,/google\.script\.run/);
  assert.match(code,/page==="sim"/,"doGet routes ?page=sim to Sim Master");
});

test("Apps Script bundles are valid JavaScript and include every module",()=>{
  const {index,sim}=gas();
  const a=mainScript(index),b=mainScript(sim);
  assert.doesNotThrow(()=>new Function(a));assert.doesNotThrow(()=>new Function(b));
  for(const m of ["app.js","back-guard.js","data.js","pathways.js","decisions.js","google-apps-script/workspace-session-store.js","local-session-store.js"])assert.ok(a.includes(JSON.stringify(m)+":function"),`Assist bundle has ${m}`);
  for(const m of ["sim-master.js","sim-engine.js","sim-scenarios.js","sim-sync.js","back-guard.js"])assert.ok(b.includes(JSON.stringify(m)+":function"),`Sim Master bundle has ${m}`);
  assert.match(a,/const \$\$ =/,"no $$ replace mangling");
});

test("Apps Script pages embed their images (no static files on Apps Script)",()=>{
  const {index}=gas();
  assert.match(index,/"img\/splash-640\.webp":"data:image\/webp;base64,/);
  assert.match(index,/url\(data:image\/webp;base64,/,"splash CSS background is embedded");
});

test("every Education topic has a built-in slide deck",async()=>{
  const {EDUCATION}=await import("../data.js");const {EDU_DECKS}=await import("../edu-decks.js");
  const kinds=new Set(["title","cards","steps","script","big","list","split","do"]);
  for(const x of EDUCATION){
    const d=EDU_DECKS[x.id];assert.ok(d&&d.length>=2,`${x.id}: needs a deck`);
    assert.equal(d[0].kind,"title",`${x.id}: first slide is a title`);
    d.forEach((s,i)=>{assert.ok(kinds.has(s.kind),`${x.id}[${i}]: unknown kind ${s.kind}`);
      // no walls of text: every text line on a slide stays short
      const texts=JSON.stringify(s).match(/"(?:t|say|note|example|lead|sub)":"([^"]*)"/g)||[];
      texts.forEach(t=>assert.ok(t.length<=130,`${x.id}[${i}] too long: ${t}`));
      const items=[...(s.items||[]),...(s.steps||[]),...(s.check||[]),...(s.act||[]),...(s.left?.items||[]),...(s.right?.items||[])].filter(v=>typeof v==="string");
      items.forEach(t=>assert.ok(t.length<=60,`${x.id}[${i}] line too long: ${t}`));
      [s.items,s.steps,s.check,s.act,s.left?.items,s.right?.items,s.cards].filter(Boolean).forEach(l=>assert.ok(l.length<=6,`${x.id}[${i}]: a list has more than 6 lines`));
    });
  }
});
