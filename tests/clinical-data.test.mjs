import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {APP_VERSION,EMERGENCIES,MEDICATIONS} from "../data.js";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const medication=id=>MEDICATIONS.find(item=>item.id===id);

test("release identifier matches the network-first cache",()=>{
  assert.equal(APP_VERSION,"1.1.0-prototype");
  assert.match(fs.readFileSync(path.join(root,"sw.js"),"utf8"),/ob-emergency-assist-v1\.1\.0/);
});

test("severe hypertension pathways encode exact sequence, timer and stop",()=>{
  const expected={
    labetalol:{doses:["20 mg IV over 2 minutes","40 mg IV over 2 minutes","80 mg IV over 2 minutes"],timer:10,next:/hydralazine 10 mg/i},
    hydralazine:{doses:["5–10 mg IV over 2 minutes","10 mg IV over 2 minutes"],timer:20,next:/labetalol 20 mg/i},
    nifedipine:{doses:["10 mg PO immediate release","20 mg PO immediate release","20 mg PO immediate release"],timer:20,next:/labetalol 20 mg/i}
  };
  for(const [id,rule] of Object.entries(expected)){
    const med=medication(id);
    assert.deepEqual(med.doseSteps.map(step=>step.dose),rule.doses);
    assert.equal(med.maxDoses,rule.doses.length);
    assert.equal(med.timer,rule.timer);
    assert.match(med.nextAction,rule.next);
  }
});

test("hemorrhage definition and carboprost maximum remain explicit",()=>{
  assert.match(EMERGENCIES.pph.tasks.find(task=>task.id==="pph-assess").detail,/≥1,000 mL/);
  assert.equal(medication("carboprost").maxDoses,8);
});

test("eclampsia rescue sequence and magnesium safety values remain encoded",()=>{
  assert.match(medication("diazepam").dose,/5–10 mg IV/);
  assert.match(medication("fosphenytoin").dose,/20 mg PE\/kg IV at 150 mg PE\/min/);
  assert.match(medication("levetiracetam").dose,/60 mg\/kg IV; maximum 4,500 mg/);
  assert.match(medication("calcium-chloride").dose,/500 mg.*5–10 minutes/);
  const magnesium=medication("magnesium");
  assert.equal(magnesium.workflowSteps.length,2);
  assert.match(magnesium.administration,/creatinine is ≥1 mg\/dL/);
  assert.match(magnesium.repeat,/every 4 hours/);
  assert.match(magnesium.repeat,/4\.9–8\.5 mg\/dL/);
  assert.match(magnesium.repeat,/>9\.6 mg\/dL/);
  assert.match(magnesium.repeat,/<8\.4 mg\/dL/);
  assert.equal(magnesium.toxicityTable.length,5);
});

test("cardiac red flags are a first-class emergency",()=>{
  assert.equal(EMERGENCIES.cardiac.tasks.length,6);
  const workup=EMERGENCIES.cardiac.tasks.find(task=>task.id==="cv-workup");
  assert.match(`${workup.title} ${workup.detail}`,/ECG, BNP, chest X-ray and troponin/);
});

test("service worker never substitutes the app shell for a missing script",()=>{
  const worker=fs.readFileSync(path.join(root,"sw.js"),"utf8");
  assert.match(worker,/request\.mode==="navigate"/);
  assert.match(worker,/\["script","style","worker"\]/);
  assert.doesNotMatch(worker,/catch\(\(\)=>caches\.match\("\.\/index\.html"\)\)/);
  assert.match(worker,/response\?\.ok/);
});

test("medication recording is scoped to the active emergency",()=>{
  const app=fs.readFileSync(path.join(root,"app.js"),"utf8");
  assert.match(app,/belongsToActiveEmergency=.*tasks\.some\(task=>task\.meds\?\.includes\(id\)\)/);
  assert.match(app,/const canRecord=recordable&&belongsToActiveEmergency/);
});
