// Sim Master scenario library — facilitator-only content.
// DRAFT: vitals, timings and expected-action targets are teaching defaults that
// require facilitator / clinical review before use (see CLINICAL-REVIEW.md).
//
// Shape:
//   events       fire automatically at `at` minutes of elapsed sim time
//   conditional  fire at `by` minutes only if action `ifNot` has not been checked
//   actions      expected team actions; `target` = minutes by which it is expected
//   hints        what to answer if the team asks
//   vitals keys  HR, BP, SpO2, RR, QBL (mL), Fundus, Other

export const SCENARIO_REVIEW_STATUS = "Draft — requires facilitator and clinical review";

export const FOCUS_AREAS = ["Recognition","Team communication","Medication safety","Diagnostic reasoning","Escalation"];

export const SCENARIOS = [
  {
    id:"pph-atony",
    emergency:"pph",
    title:"Atony after vaginal birth",
    level:"Core",
    duration:15,
    audience:"Mixed team",
    focus:["Recognition","Team communication","Escalation"],
    summary:"Classic uterine atony 20 minutes after an uncomplicated vaginal birth. Builds the first-10-minutes response.",
    trap:"Hemodynamic changes lag blood loss. A normal BP at the start is not reassurance.",
    objectives:[
      "Recognize hemorrhage early using quantified blood loss and trend, not BP alone",
      "Call the hemorrhage response and assign leader and recorder roles",
      "Start fundal massage and first-line uterotonic within minutes",
      "Use closed-loop communication for every medication order"
    ],
    patient:{
      oneLiner:"32-year-old G3P3, spontaneous vaginal birth 20 minutes ago, term, 3.9 kg infant.",
      history:["Labor 14 hours with oxytocin augmentation","No hypertension, no asthma","Placenta delivered complete per delivering clinician","Oxytocin infusion running at postpartum rate"],
      setting:"L&D room, one nurse present at start"
    },
    start:{HR:"104",BP:"112/70",SpO2:"98%",RR:"18",QBL:"800 mL",Fundus:"Boggy, above umbilicus"},
    roles:["Team leader","Recorder / timekeeper","Primary nurse","Second nurse / medications","Anesthesia","Runner / blood bank"],
    prebrief:[
      "This is a simulation. Treat the mannequin as a patient; ask out loud for anything you need.",
      "Vitals are given verbally or on screen when you check them.",
      "Phones: start OB Emergency Assist → Hemorrhage → Start Simulation when I say go."
    ],
    equipment:["Hemorrhage cart","Uterotonics (simulated)","Two large-bore IV kits","QBL scale / drapes","Mannequin with fundus model"],
    events:[
      {id:"e0",at:0,title:"Nurse calls for help",say:"\"She just passed a big clot and she's still bleeding — the pad is soaked.\""},
      {id:"e1",at:2,title:"Bleeding continues",say:"Steady bright-red bleeding. Patient: \"I feel dizzy.\"",vitals:{HR:"116",BP:"108/66",QBL:"1100 mL"}},
      {id:"e2",at:6,title:"Partial response",say:"Fundus firms with massage but relaxes when massage stops.",vitals:{HR:"118",BP:"104/62",QBL:"1300 mL"}},
      {id:"e3",at:9,title:"Labs back",say:"Hgb 9.1 g/dL, platelets 210k, fibrinogen 310 mg/dL.",show:"Labs: Hgb 9.1 · Plt 210k · Fibrinogen 310"},
      {id:"e4",at:12,title:"Bleeding slowing",say:"Fundus firm. Bleeding slowed to a trickle.",vitals:{HR:"106",BP:"110/68",QBL:"1450 mL",Fundus:"Firm, at umbilicus"}}
    ],
    conditional:[
      {id:"c1",ifNot:"a-uterotonic",by:4,title:"Deterioration — no uterotonic yet",say:"Patient becomes pale and anxious. \"I don't feel right.\"",vitals:{HR:"132",BP:"88/52",QBL:"1500 mL"}},
      {id:"c2",ifNot:"a-help",by:3,title:"Prompt — still working alone",say:"Nurse: \"Should I call someone?\""}
    ],
    actions:[
      {id:"a-help",label:"Calls hemorrhage response / help",target:1,critical:true},
      {id:"a-roles",label:"Names leader and recorder",target:2},
      {id:"a-qbl",label:"Quantifies blood loss and checks vitals",target:2,critical:true},
      {id:"a-massage",label:"Fundal massage / bimanual compression",target:2,critical:true},
      {id:"a-uterotonic",label:"Gives first-line uterotonic (oxytocin)",target:3,critical:true},
      {id:"a-iv",label:"Second IV access, labs, type & crossmatch",target:5},
      {id:"a-second",label:"Adds second-line uterotonic for ongoing atony",target:8},
      {id:"a-txa",label:"Considers TXA",target:10},
      {id:"a-closedloop",label:"Closed-loop communication on medication orders",target:null}
    ],
    hints:[
      {q:"Has she had any blood pressure problems or asthma?",a:"No hypertension, no asthma, no cardiac history."},
      {q:"Is the placenta complete?",a:"Delivering clinician documented it as complete."},
      {q:"What is the oxytocin running at?",a:"Postpartum maintenance rate per unit protocol."},
      {q:"Allergies?",a:"No known drug allergies."}
    ],
    debrief:[
      "When did the team first say the word 'hemorrhage' out loud — and what triggered it?",
      "How did the leader know what had already been given?",
      "BP was near-normal at 6 minutes. What told you she was still in trouble?",
      "Was TXA considered? What would make it indicated here?"
    ]
  },
  {
    id:"pph-preeclampsia",
    emergency:"pph",
    title:"Hemorrhage with severe preeclampsia",
    level:"Intermediate",
    duration:15,
    audience:"Mixed team",
    focus:["Medication safety","Team communication"],
    summary:"Atony in a patient with preeclampsia with severe features on magnesium. Tests uterotonic selection under pressure.",
    trap:"Methylergonovine is contraindicated with hypertension. A team member will suggest it.",
    objectives:[
      "Choose uterotonics using contraindications (hypertension → avoid methylergonovine)",
      "Speak up and use check-back when an unsafe order is proposed",
      "Continue magnesium and recognize its contribution to atony risk",
      "Keep BP management on the radar during hemorrhage"
    ],
    patient:{
      oneLiner:"27-year-old G1P1, cesarean for arrest of dilation 40 minutes ago, preeclampsia with severe features.",
      history:["Magnesium sulfate infusion running","BP 150s–160s/100s before delivery; labetalol IV ×1 in labor","No asthma","Platelets 142k pre-op"],
      setting:"Recovery / postpartum room"
    },
    start:{HR:"108",BP:"158/102",SpO2:"98%",RR:"16",QBL:"1000 mL (incl. OR)",Fundus:"Boggy",Other:"Magnesium infusing"},
    roles:["Team leader","Recorder / timekeeper","Primary nurse","Medication nurse","Anesthesia","Runner / blood bank"],
    prebrief:[
      "This is a simulation. Ask out loud for anything you need.",
      "Phones: start OB Emergency Assist → Hemorrhage → Start Simulation when I say go."
    ],
    equipment:["Hemorrhage cart","Simulated uterotonics incl. methylergonovine vial","Magnesium pump (running)"],
    events:[
      {id:"e0",at:0,title:"Nurse calls for help",say:"\"Her fundus is boggy and she's bleeding through the pad.\""},
      {id:"e1",at:2,title:"The unsafe suggestion",say:"Medication nurse (confederate): \"I have Methergine in my hand — want me to give it?\"",confederate:true},
      {id:"e2",at:5,title:"Ongoing bleeding",say:"Bleeding continues despite oxytocin.",vitals:{HR:"120",BP:"146/94",QBL:"1350 mL"}},
      {id:"e3",at:8,title:"Labs back",say:"Hgb 9.4, platelets 118k, fibrinogen 280, AST 64.",show:"Labs: Hgb 9.4 · Plt 118k · Fibrinogen 280 · AST 64"},
      {id:"e4",at:12,title:"Response",say:"Fundus firm after second-line agent.",vitals:{HR:"110",BP:"150/96",QBL:"1500 mL",Fundus:"Firm"}}
    ],
    conditional:[
      {id:"c1",ifNot:"a-avoid-methergine",by:3,title:"Methylergonovine given (if accepted)",say:"If the team accepted: \"Methergine is in.\" BP rises.",vitals:{BP:"178/112"}},
      {id:"c2",ifNot:"a-uterotonic",by:4,title:"Deterioration — no uterotonic",say:"Patient pale, HR climbing.",vitals:{HR:"130",BP:"128/80",QBL:"1500 mL"}}
    ],
    actions:[
      {id:"a-help",label:"Calls hemorrhage response / help",target:1,critical:true},
      {id:"a-massage",label:"Fundal massage",target:2,critical:true},
      {id:"a-uterotonic",label:"Gives / increases oxytocin",target:3,critical:true},
      {id:"a-avoid-methergine",label:"Declines methylergonovine — names hypertension",target:3,critical:true},
      {id:"a-second",label:"Chooses an appropriate second-line agent (carboprost or misoprostol)",target:7},
      {id:"a-mag",label:"Continues magnesium; monitors toxicity",target:null},
      {id:"a-bp",label:"Keeps BP monitoring / treatment in plan",target:null},
      {id:"a-checkback",label:"Uses check-back / speaks up on the unsafe order",target:null}
    ],
    hints:[
      {q:"Does she have asthma?",a:"No asthma."},
      {q:"What's her BP trend?",a:"150s–160s over 100s since delivery."},
      {q:"Magnesium dose and reflexes?",a:"Maintenance infusion; reflexes 2+, RR 16, urine output adequate."}
    ],
    debrief:[
      "Who noticed the methylergonovine problem, and how did they say it?",
      "Did the person holding the vial feel able to hold off? What made that easier or harder?",
      "How did the team balance hemorrhage and blood-pressure priorities?",
      "Magnesium raises atony risk. Was that discussed?"
    ]
  },
  {
    id:"pph-trauma",
    emergency:"pph",
    title:"Firm uterus, still bleeding",
    level:"Advanced",
    duration:15,
    audience:"Mixed team",
    focus:["Diagnostic reasoning","Escalation"],
    summary:"Bleeding continues with a firm uterus after a vacuum-assisted birth. Tests the 4 Ts and avoiding fixation on tone.",
    trap:"Uterotonics will not fix trauma. Teams often keep escalating drugs for a firm uterus.",
    objectives:[
      "Recognize that a firm uterus with ongoing bleeding points away from atony",
      "Work through Tone, Trauma, Tissue, Thrombin out loud",
      "Arrange exposure, lighting and analgesia for a genital-tract exam",
      "Escalate to repair in the OR when exposure or bleeding control is inadequate"
    ],
    patient:{
      oneLiner:"30-year-old G1P1, vacuum-assisted vaginal birth 15 minutes ago, second-degree laceration repaired.",
      history:["Prolonged second stage","Epidural in place","Placenta complete","No hypertension, no asthma"],
      setting:"L&D room"
    },
    start:{HR:"110",BP:"116/72",SpO2:"99%",RR:"18",QBL:"700 mL",Fundus:"Firm, below umbilicus"},
    roles:["Team leader","Recorder / timekeeper","Primary nurse","Second nurse","Anesthesia","Runner"],
    prebrief:[
      "This is a simulation. Ask out loud for anything you need.",
      "Phones: start OB Emergency Assist → Hemorrhage → Start Simulation when I say go."
    ],
    equipment:["Hemorrhage cart","Good light source / retractors (simulated)","Laceration repair tray"],
    events:[
      {id:"e0",at:0,title:"Nurse calls for help",say:"\"She's still bleeding — steady trickle, bright red.\""},
      {id:"e1",at:3,title:"Fundus check",say:"Fundus remains firm. Bleeding continues, bright red, steady.",vitals:{HR:"118",BP:"110/68",QBL:"950 mL",Fundus:"Firm"}},
      {id:"e2",at:6,title:"If examined",say:"On exam with exposure: actively bleeding high vaginal sidewall laceration.",show:"Exam finding (reveal only if the team examines): high vaginal sidewall laceration"},
      {id:"e3",at:9,title:"Ongoing",say:"Bleeding continues until controlled.",vitals:{HR:"126",BP:"100/60",QBL:"1250 mL"}}
    ],
    conditional:[
      {id:"c1",ifNot:"a-exam",by:7,title:"Fixation — no exam yet",say:"Nurse (confederate): \"Should I get another dose of something?\"",confederate:true},
      {id:"c2",ifNot:"a-escalate",by:11,title:"Deterioration",say:"Patient pale, diaphoretic.",vitals:{HR:"138",BP:"86/50",QBL:"1500 mL"}}
    ],
    actions:[
      {id:"a-help",label:"Calls hemorrhage response / help",target:1,critical:true},
      {id:"a-tone",label:"Checks tone; recognizes firm uterus",target:2,critical:true},
      {id:"a-4ts",label:"Names the 4 Ts out loud",target:4},
      {id:"a-exam",label:"Examines genital tract with exposure, light, analgesia",target:5,critical:true},
      {id:"a-iv",label:"IV access, labs, type & crossmatch",target:5},
      {id:"a-escalate",label:"Escalates for repair (OR if exposure inadequate)",target:10,critical:true},
      {id:"a-nofixation",label:"Avoids repeated uterotonics for a firm uterus",target:null}
    ],
    hints:[
      {q:"Was the placenta complete?",a:"Yes, inspected and complete."},
      {q:"Is the epidural still working?",a:"Yes, she has adequate block."},
      {q:"Any bleeding history?",a:"No personal or family bleeding history."}
    ],
    debrief:[
      "At what point did the team say the uterus was firm — and what did that change?",
      "Who called out the 4 Ts? Did the whole team hear it?",
      "What would have made the exam happen sooner?",
      "When is the bedside the wrong place to repair?"
    ]
  }
];
