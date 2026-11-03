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
