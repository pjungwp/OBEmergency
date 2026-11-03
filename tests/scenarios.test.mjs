import test from "node:test";
import assert from "node:assert/strict";
import {SCENARIOS,FOCUS_AREAS} from "../scenarios.js";
import {EMERGENCIES} from "../data.js";

test("every scenario is internally consistent",()=>{
  const ids=new Set();
  for(const s of SCENARIOS){
    assert.ok(!ids.has(s.id),`duplicate scenario id ${s.id}`);ids.add(s.id);
    assert.ok(EMERGENCIES[s.emergency],`${s.id}: unknown emergency`);
    s.focus.forEach(f=>assert.ok(FOCUS_AREAS.includes(f),`${s.id}: unknown focus ${f}`));
    const actionIds=new Set(s.actions.map(a=>a.id));
    assert.equal(actionIds.size,s.actions.length,`${s.id}: duplicate action id`);
    const itemIds=[...s.events,...s.conditional].map(x=>x.id);
    assert.equal(new Set(itemIds).size,itemIds.length,`${s.id}: duplicate event id`);
    s.conditional.forEach(c=>assert.ok(actionIds.has(c.ifNot),`${s.id}/${c.id}: ifNot references missing action ${c.ifNot}`));
    s.events.forEach(e=>assert.ok(e.at>=0&&e.at<=s.duration,`${s.id}/${e.id}: event outside scenario duration`));
    assert.ok(s.actions.some(a=>a.critical),`${s.id}: needs at least one critical action`);
  }
});
