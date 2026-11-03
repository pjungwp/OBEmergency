import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";

const require=createRequire(import.meta.url);
const sharp=require("/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.cjs");
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const output=path.join(root,"flowcharts");
fs.mkdirSync(output,{recursive:true});

const flows={
  pph:{title:"POSTPARTUM HEMORRHAGE",subtitle:"Recognize · resuscitate · identify cause · escalate",color:"#b82643",soft:"#fff0f3",nodes:[
    ["1","RECOGNIZE","≥1,000 mL OR bleeding with hypovolemia signs"],
    ["2","ACTIVATE + RESUSCITATE","Call team · access · labs · warming · blood support"],
    ["3","CHECK THE 4 Ts","Tone · Trauma · Tissue · Thrombin"],
    ["4","TREAT THE CAUSE","Massage/compress · uterotonics · repair/remove/correct"],
    ["5","REASSESS BLEEDING","Consider early TXA when indicated"],
    ["6","ESCALATE NOW","MTP · device · OR/IR · surgery/transfer"]]},
  htn:{title:"ACUTE SEVERE HYPERTENSION",subtitle:"Confirm · treat promptly · reassess by agent",color:"#b56900",soft:"#fff6df",nodes:[
    ["1","IDENTIFY","SBP ≥160 or DBP ≥110 in pregnancy/postpartum"],
    ["2","CONFIRM PERSISTENCE","Repeat correctly within 15 minutes"],
    ["3","TREAT PROMPTLY","Labetalol IV · hydralazine IV · nifedipine IR PO"],
    ["4","REASSESS BY AGENT","Labetalol 10 min · hydralazine/nifedipine 20 min"],
    ["5","CHECK SEVERE FEATURES","Neuro · RUQ · lungs · platelets · liver · creatinine"],
    ["6","ESCALATE + PLAN","Persistent severe BP or deterioration → expert support"]]},
  eclampsia:{title:"ECLAMPSIA / OBSTETRIC SEIZURE",subtitle:"Protect · magnesium · airway readiness · reassess",color:"#6546b8",soft:"#f3efff",nodes:[
    ["1","CALL FOR HELP","Presumed pregnancy/recent postpartum seizure"],
    ["2","PROTECT + SUPPORT","Left lateral · prevent injury/aspiration · airway/O₂"],
    ["3","MAGNESIUM SULFATE","4–6 g IV load → 1–2 g/hour maintenance"],
    ["4","SEIZURE PERSISTS/RECURS?","Approved rescue pathway · airway · expert support"],
    ["5","AFTER SEIZURE","BP · neuro · oxygenation · fetal status · consider CT"],
    ["6","ONGOING CARE","Monitor toxicity · plan delivery after stabilization"]]},
  cardiac:{title:"CARDIAC RED FLAGS",subtitle:"Recognize · stabilize · test · consult · transfer",color:"#0e8077",soft:"#e8f8f5",nodes:[
    ["1","PREGNANCY STATUS","Pregnant or pregnant within the last 12 months?"],
    ["2","CHECK RED FLAGS","Rest symptoms · abnormal vitals · murmur/crackles/JVD"],
    ["3","STABILIZE + ACTIVATE","Emergency support · OB/MFM · cardiology"],
    ["4","KEY WORK-UP","ECG · BNP · chest X-ray · troponin"],
    ["5","ABNORMAL TESTING?","Echocardiogram · urgent specialist consultation"],
    ["6","TREAT + DISPOSITION","Treat life threats · admit or transfer"]]}
};

const escape=s=>String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));

function svg(flow){
  const nodes=flow.nodes.map((n,i)=>{
    const y=238+i*184;
    return `${i?`<path d="M540 ${y-42}v34" stroke="${flow.color}" stroke-width="8" stroke-linecap="round"/><path d="M523 ${y-18}l17 17 17-17" fill="none" stroke="${flow.color}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`:""}
      <rect x="72" y="${y}" width="936" height="142" rx="28" fill="white" stroke="${flow.color}" stroke-width="5"/>
      <circle cx="145" cy="${y+71}" r="42" fill="${flow.color}"/>
      <text x="145" y="${y+85}" text-anchor="middle" font-family="Arial,sans-serif" font-size="40" font-weight="800" fill="white">${n[0]}</text>
      <text x="215" y="${y+59}" font-family="Arial,sans-serif" font-size="36" font-weight="800" fill="#10203b">${escape(n[1])}</text>
      <text x="215" y="${y+103}" font-family="Arial,sans-serif" font-size="28" font-weight="500" fill="#52627a">${escape(n[2])}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 1080 1440">
    <rect width="1080" height="1440" fill="#f7f9fc"/>
    <rect width="1080" height="202" fill="${flow.color}"/>
    <text x="72" y="82" font-family="Arial,sans-serif" font-size="49" font-weight="900" fill="white">${escape(flow.title)}</text>
    <text x="72" y="138" font-family="Arial,sans-serif" font-size="29" font-weight="500" fill="white">${escape(flow.subtitle)}</text>
    <text x="72" y="178" font-family="Arial,sans-serif" font-size="21" font-weight="700" fill="white" opacity=".82">OB EMERGENCY ASSIST · QUICK PATHWAY</text>
    <rect x="48" y="214" width="984" height="1164" rx="36" fill="${flow.soft}"/>
    ${nodes}
    <text x="540" y="1410" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="#66758b">Prototype · verify against current institutional protocol</text>
  </svg>`;
}

for(const [id,flow] of Object.entries(flows)){
  await sharp(Buffer.from(svg(flow))).flatten({background:"#f7f9fc"}).jpeg({quality:92,chromaSubsampling:"4:4:4"}).toFile(path.join(output,`${id}.jpg`));
}
console.log("Generated 4 responsive flowchart JPEGs.");
