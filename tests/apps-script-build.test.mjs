import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");

test("Apps Script package builds from the shared UI without a service worker dependency",()=>{
  execFileSync(process.execPath,[path.join(root,"scripts/build-google-apps-script.mjs")],{cwd:root});
  const html=fs.readFileSync(path.join(root,"google-apps-script/Index.html"),"utf8");
  assert.match(html,/createWorkspaceSessionStore/);
  assert.match(html,/google\.script\.run/);
  assert.doesNotMatch(html,/navigator\.serviceWorker/);
  assert.doesNotMatch(html,/manifest\.webmanifest/);
  assert.doesNotMatch(html,/type="module"/);
});

test("Apps Script bundle is valid JavaScript (catches $$ / replace mangling)",()=>{
  execFileSync(process.execPath,[path.join(root,"scripts/build-google-apps-script.mjs")],{cwd:root});
  const html=fs.readFileSync(path.join(root,"google-apps-script/Index.html"),"utf8");
  const parts=html.split("<script>");const main=parts[parts.length-1].split("</script>")[0];
  assert.doesNotThrow(()=>new Function(main));
  assert.match(main,/const \$\$ =/);
  assert.match(main,/PATHWAYS/);
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
