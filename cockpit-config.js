// Two-state cockpit configuration — DRAFT clinical content, pending review
// (see CLINICAL-REVIEW.md › "Two-state cockpit"). Nothing here changes a dose,
// threshold or protocol: it decides WHEN a pathway question is asked, what the
// checklist calls each task, and which task a branch brings forward.
//
// Decision fields
//   id, node        pathway decision node (pathways.js) this question belongs to
//   q               the question, ≤ 5 words
//   on              task ids whose completion / "Assessed" / "Ongoing" asks the question
//   onTimer         medication ids whose reassessment reminder asks the question
//   atMin           elapsed minute at which the question is asked (asked once)
//   requires        task ids that must be completed (or ongoing) before it can be asked
//   repeat          ask again on the next trigger after an answer that is not terminal
//   answers         [{value,label,branch,activate,reopen,pin,terminal,note}]
// The app never answers a question by itself: triggers only ASK.

export const DECISIONS = {
  pph:[
    {id:"pph-controlled",node:"reassess",q:"Bleeding controlled?",on:["pph-assess"],requires:["pph-oxytocin"],repeat:true,
      answers:[
        {value:"yes",label:"YES",branch:"controlled",note:"Keep reassessing"},
        {value:"no",label:"NO",branch:"escalate",activate:["pph-escalate","pph-txa"],pin:"pph-escalate",terminal:true,note:"Escalate now"}
      ]}
  ],
  htn:[
    {id:"htn-persistent",node:"confirm",q:"Severe BP persistent?",on:["htn-bp"],repeat:true,
      answers:[
        {value:"yes",label:"YES",branch:"g-treat",activate:["htn-treat","htn-mag"],pin:"htn-treat",terminal:true,note:"Treat now"},
        {value:"no",label:"NO",branch:"notpersist",note:"Keep monitoring BP"}
      ]},
    {id:"htn-still-severe",node:"reassess",q:"Still severe after dose?",onTimer:["labetalol","hydralazine","nifedipine"],repeat:true,
      answers:[
        {value:"yes",label:"YES",branch:"nextdose",reopen:["htn-treat"],activate:["htn-escalate"],pin:"htn-treat",note:"Next dose in sequence"},
        {value:"no",label:"NO",branch:"target",note:"Keep monitoring BP"}
      ]}
  ],
  eclampsia:[
    {id:"ec-recurrent",node:"recur",q:"Seizure recurred?",on:["ec-vitals"],requires:["ec-mag"],repeat:true,
      answers:[
        {value:"yes",label:"YES",branch:"recurrent",activate:["ec-recur"],reopen:["ec-recur"],pin:"ec-recur",note:"Treat recurrent seizure"},
        {value:"no",label:"NO",note:"Continue magnesium"}
      ]}
  ],
  arrest:[
    {id:"arrest-rosc",node:"rosc",q:"ROSC at 4 minutes?",atMin:4,
      answers:[
        {value:"yes",label:"YES",branch:"post",terminal:true,note:"Post-arrest care"},
        {value:"no",label:"NO",branch:"deliver",activate:["arrest-delivery"],pin:"arrest-delivery",terminal:true,note:"Deliver now"}
      ]}
  ],
  trauma:[
    {id:"tr-stable",node:"stable",q:"Mother and fetus stable?",on:["tr-fetal"],requires:["tr-primary"],
      answers:[
        {value:"yes",label:"YES",branch:"monitor",terminal:true,note:"Monitor ≥ 4 hours"},
        {value:"no",label:"NO",branch:"deliver",activate:["tr-deliver"],pin:"tr-deliver",terminal:true,note:"Expedite delivery"}
      ]}
  ],
  shoulder:[]
};

// Tasks kept out of NOW/DUE until a branch brings them forward (they stay visible in UP NEXT).
export const GATED = {
  pph:["pph-escalate"],
  htn:["htn-escalate"],
  eclampsia:["ec-recur"],
  arrest:[],
  trauma:["tr-deliver"],
  shoulder:["sd-lastresort","sd-after"]
};

// Checklist names, ≤ 3 words.
export const CHECK_LABELS = {
  "pph-help":"Call team","pph-assess":"Bleeding · tone · vitals","pph-massage":"Fundal massage","pph-access":"IV · labs · blood","pph-oxytocin":"Uterotonics","pph-cause":"4 Ts","pph-txa":"TXA","pph-escalate":"Escalate",
  "htn-help":"Call OB","htn-bp":"Repeat BP","htn-symptoms":"Severe symptoms","htn-labs":"Preeclampsia labs","htn-treat":"BP medication","htn-mag":"Magnesium","htn-monitor":"BP after dose","htn-escalate":"Escalate",
  "ec-help":"Call for help","ec-safety":"Protect · airway","ec-mag":"Magnesium","ec-vitals":"BP · O₂ · neuro","ec-recur":"Recurrent seizure","ec-tox":"Mag toxicity watch","ec-neuro":"Neuro exam","ec-delivery":"Delivery plan",
  "arrest-help":"Call arrest team","arrest-cpr":"CPR · rhythm","arrest-lud":"Uterine displacement","arrest-airway":"Early airway","arrest-iv":"IV above diaphragm","arrest-mag":"Stop Mg · calcium","arrest-monitors":"Remove fetal monitors","arrest-delivery":"Resuscitative delivery","arrest-cause":"Causes A–H","arrest-afe":"AFE · transfusion",
  "tr-help":"Call OB · trauma","tr-primary":"Primary survey","tr-lud":"Uterine displacement","tr-iv":"IVs · labs · KB","tr-imaging":"Needed imaging","tr-fetal":"Fetal monitoring","tr-noexam":"No cervical exam","tr-abruption":"Abruption signs","tr-rh":"Rh status","tr-deliver":"Expedite delivery",
  "sd-help":"Call for help","sd-avoid":"No fundal pressure","sd-mcroberts":"McRoberts","sd-suprapubic":"Suprapubic pressure","sd-posterior":"Posterior arm","sd-rotate":"Rubin II / Woods","sd-allfours":"All-fours","sd-episiotomy":"Episiotomy","sd-lastresort":"Last resort","sd-after":"After delivery"
};

// Shoulder dystocia: the left panel is the clock; the checklist is the maneuver log.
export const DYSTOCIA = {
  sections:[
    {title:"First line",ids:["sd-mcroberts","sd-suprapubic"]},
    {title:"Additional",ids:["sd-posterior","sd-rotate","sd-allfours"]},
    {title:"Adjunct",ids:["sd-episiotomy"]},
    {title:"Advanced rescue",ids:["sd-lastresort"]}
  ],
  setup:["sd-help","sd-avoid"],
  after:"sd-after"
};

// Display rule per emergency: "action" (most-urgent action left) or "clock" (clock left).
export const LEFT_PANEL = {pph:"action",htn:"action",eclampsia:"action",arrest:"action",trauma:"action",shoulder:"clock"};
