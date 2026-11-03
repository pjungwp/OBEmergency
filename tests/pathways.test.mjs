import test from "node:test";
import assert from "node:assert/strict";
import {PATHWAYS} from "../pathways.js";
import {EMERGENCIES,MEDICATIONS,REFERENCES} from "../data.js";

const medIds=new Set(MEDICATIONS.map(m=>m.id));
const refIds=new Set(REFERENCES.map(r=>r.id));

for(const [id,p] of Object.entries(PATHWAYS)){
  test(`${id}: pathway is complete and internally consistent`,()=>{
    const e=EMERGENCIES[id];assert.ok(e,"pathway must match an emergency");
    const taskIds=new Set(e.tasks.map(t=>t.id));
    const nodes=p.nodes;
    const groups=new Map();
    p.chart.rows.forEach(row=>row.forEach(c=>{if(typeof c==="object")groups.set(c.group,c);}));
    const targetOk=t=>nodes[t]||groups.has(t);
    const placed=new Set();
    p.chart.rows.forEach(row=>row.forEach(c=>{if(typeof c==="string")placed.add(c);else{c.nodes.forEach(n=>placed.add(n));if(c.head)placed.add(c.head);}}));
    for(const [nid,n] of Object.entries(nodes)){
      assert.ok(placed.has(nid),`${nid} is not on the full chart`);
      (n.connections||[]).forEach(c=>assert.ok(targetOk(c.to),`${nid} → missing target ${c.to}`));
      if(n.type==="decision"){
        assert.ok((n.connections||[]).length>=2,`${nid}: decision needs ≥2 branches`);
        n.connections.forEach(c=>assert.ok(c.label,`${nid}: decision branch to ${c.to} needs a label`));
      }
      (n.items||[]).forEach(it=>{
        if(it.task)assert.ok(taskIds.has(it.task),`${nid}: unknown task ${it.task}`);
        if(it.med)assert.ok(medIds.has(it.med),`${nid}: unknown medication ${it.med}`);
        if(it.pathway)assert.ok(PATHWAYS[it.pathway],`${nid}: unknown pathway ${it.pathway}`);
      });
      (n.medicationRefs||[]).forEach(m=>assert.ok(medIds.has(m),`${nid}: unknown medication ${m}`));
      (n.sourceRefs||[]).forEach(r=>assert.ok(refIds.has(r),`${nid}: unknown source ${r}`));
      assert.ok(["from-content","draft"].includes(n.reviewStatus),`${nid}: reviewStatus required`);
      if(n.reviewStatus==="draft")assert.ok(n.reviewNote,`${nid}: draft nodes need a reviewNote`);
    }
    for(const g of groups.values())(g.connections||[]).forEach(c=>assert.ok(targetOk(c.to),`${g.group} → missing ${c.to}`));
    // No emergency task may be left out of the pathway.
    const linked=new Set(Object.values(nodes).flatMap(n=>(n.items||[]).map(i=>i.task).filter(Boolean)));
    taskIds.forEach(t=>assert.ok(linked.has(t),`task ${t} is not represented in the pathway`));
    // Guided steps reference real nodes; decision steps name a decision node.
    p.steps.forEach(s=>{s.nodes.forEach(n=>assert.ok(nodes[n],`step ${s.title}: unknown node ${n}`));if(s.decision)assert.equal(nodes[s.decision].type,"decision");});
  });
}
