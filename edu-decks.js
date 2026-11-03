// Built-in Education slide decks. One idea per slide, short lines, no paragraphs.
// Wording is condensed from the reviewed EDUCATION sections in data.js; keep them in sync.
//
// Slide kinds
//   title  {title, sub}
//   cards  {title, cards:[{h,t}], note?}
//   steps  {title, steps:[text], example?, note?}
//   script {title, lines:[{who,say}], note?}
//   big    {title, items:[{big,label}], note?}
//   list   {title, items:[text], note?}
//   split  {title, left:{h,items}, right:{h,items}, tone?:"dodont"}
//   do     {title, lead, check:[text], act:[text]}

export const EDU_DECKS = {
  teamstepps:[
    {kind:"title",title:"TeamSTEPPS in an OB emergency",sub:"Clear leader · closed loop · shared mental model"},
    {kind:"cards",title:"Four skills, one team",cards:[
      {h:"Communication",t:"Say it clearly. Confirm it back."},
      {h:"Team leadership",t:"One named leader sets priorities and shares the plan."},
      {h:"Situation monitoring",t:"Watch the patient, the team, the room and progress."},
      {h:"Mutual support",t:"Speak up. Back each other up."}],
      note:"The app prompts. The team directs care."},
    {kind:"steps",title:"Brief at activation",steps:["Leader: “I am leading.”","Name the emergency and the goal","Assign meds, bedside, recorder, runner","State the first escalation threshold + resources"],
      example:"“I am leading. This is a postpartum hemorrhage. Goal: control bleeding and resuscitate.”"},
    {kind:"script",title:"Call-out + check-back",lines:[
      {who:"Leader",say:"Labetalol 20 mg IV now."},
      {who:"Nurse",say:"Labetalol 20 mg IV."},
      {who:"Leader",say:"Correct."}],
      note:"Then announce when it is given — and record it."},
    {kind:"split",title:"Huddle",left:{h:"When",items:["Plan isn’t working","New information","Resources change"]},right:{h:"Say",items:["Patient status","Actions done","Response","Threats","Next plan"]}},
    {kind:"big",title:"Speak up: CUS",items:[{big:"C",label:"I’m Concerned"},{big:"U",label:"I’m Uncomfortable"},{big:"S",label:"This is a Safety issue"}],
      note:"Not acknowledged? Two-Challenge Rule: say it twice, then escalate."},
    {kind:"list",title:"Debrief",items:["What went well?","What could improve?","Were roles and communication clear?","What system issue needs follow-up?"]}
  ],

  roles:[
    {kind:"title",title:"Suggested emergency team roles",sub:"Localize before release · roles never block emergency actions"},
    {kind:"cards",title:"At the bedside",cards:[
      {h:"Team leader",t:"Priorities, shared plan, updates, escalation."},
      {h:"Bedside nurse",t:"Focused assessment. Calls out changes."},
      {h:"Medication nurse",t:"Prepares, checks contraindications, closes the loop, announces each dose."}]},
    {kind:"cards",title:"Supporting the team",cards:[
      {h:"Recorder / timekeeper",t:"Records events and doses. Announces due reassessments."},
      {h:"OB / procedural clinician",t:"Cause-specific evaluation and procedures, with the leader."},
      {h:"Anesthesia / resuscitation",t:"Airway, hemodynamics, access, transfusion."}],
      note:"Short-staffed? One person can hold two roles — say so out loud."}
  ],

  "four-ts":[
    {kind:"title",title:"PPH: the 4 Ts",sub:"Find the cause while resuscitation continues"},
    {kind:"big",title:"Four causes",items:[{big:"Tone",label:"Atony"},{big:"Trauma",label:"Injury"},{big:"Tissue",label:"Retained"},{big:"Thrombin",label:"Coagulopathy"}],
      note:"More than one can be present at once."},
    {kind:"do",title:"Tone",lead:"Most common cause",check:["Fundus","Lower uterine segment"],act:["Massage · remove clots","Bimanual compression","Uterotonics — check contraindications"]},
    {kind:"do",title:"Trauma",lead:"Firm uterus + still bleeding → think trauma",check:["Cervix, vagina, vulva, perineum"],act:["Find laceration, hematoma or rupture","Consider concealed bleeding"]},
    {kind:"do",title:"Tissue",lead:"Is the placenta complete?",check:["Placental completeness","Manual exam · ultrasound"],act:["Suspected accreta → escalate early"]},
    {kind:"do",title:"Thrombin",lead:"Treat coagulopathy",check:["Coagulation labs","Viscoelastic testing if available"],act:["Replace components + fibrinogen","Massive-transfusion protocol"]},
    {kind:"steps",title:"Still bleeding? Escalate",steps:["Hemorrhage-control device","Operating room or IR","Definitive surgery"],note:"A device must never delay transfer or definitive control."}
  ],

  "severe-htn":[
    {kind:"title",title:"Severe hypertension",sub:"Persistent SBP ≥160 or DBP ≥110 is an emergency"},
    {kind:"steps",title:"Confirm, then act",steps:["SBP ≥160 or DBP ≥110","Repeat with correct technique within 15 min","Persistent → treat as soon as reasonably possible"],note:"Prepare the medication while you confirm."},
    {kind:"cards",title:"Choose one first-line agent",cards:[
      {h:"Labetalol IV",t:"Avoid with asthma, bradycardia, heart block."},
      {h:"Hydralazine IV",t:"Watch for maternal hypotension."},
      {h:"Nifedipine IR PO",t:"Useful without IV access."}],
      note:"Choose by access, asthma, heart rate, cardiac disease, oral tolerance."},
    {kind:"big",title:"Reassess BP by agent",items:[{big:"10 min",label:"Labetalol"},{big:"20 min",label:"Hydralazine"},{big:"20 min",label:"Nifedipine"}],
      note:"Time passing never means a repeat dose was given."},
    {kind:"list",title:"Look beyond the number",items:["Neurologic symptoms","Pulmonary edema","RUQ / epigastric pain","Platelets · liver enzymes · creatinine"],note:"Severe headache + hypertension → think stroke."}
  ],

  "mag-safety":[
    {kind:"title",title:"Magnesium sulfate safety",sub:"First-line for eclampsia and severe-feature seizure prophylaxis"},
    {kind:"big",title:"Supplied pathway",items:[{big:"4–6 g",label:"IV load over 20–30 min"},{big:"1–2 g/h",label:"Maintenance"}],
      note:"Renal dysfunction: adjust dose, check serum levels, get expert guidance."},
    {kind:"list",title:"Watch for toxicity",items:["Respiratory rate · oxygenation","Deep tendon reflexes","Urine output · renal function","Mental status","Serum magnesium when indicated"]},
    {kind:"steps",title:"If toxicity",steps:["Stop or adjust magnesium","Support airway and breathing","Calcium gluconate 1 g IV over 3 min"],note:"Calcium dose from the supplied algorithm — use your approved local pathway."},
    {kind:"list",title:"Recurrent seizure",items:["Continue magnesium","Approved refractory-seizure pathway","Prepare the airway","Consider alternate diagnoses","Call for multidisciplinary support"]}
  ],

  "pregnancy-status":[
    {kind:"title",title:"Ask about pregnancy",sub:"Emergencies can present after delivery and outside L&D"},
    {kind:"split",title:"Ask the question",left:{h:"Pregnant now or in the last 6 weeks?",items:["High BP · seizure","Headache · vision changes","RUQ pain · shortness of breath"]},right:{h:"Pregnant in the last 12 months?",items:["Any cardiovascular symptom"]}},
    {kind:"cards",title:"Cardiovascular red flags",cards:[
      {h:"Symptoms",t:"Breathless or chest pain at rest · severe orthopnea · near-syncope with palpitations"},
      {h:"Vitals",t:"HR ≥120 · RR ≥25 · SpO₂ ≤94% · SBP ≥160 or <90"},
      {h:"Exam",t:"New murmur · S3/S4 · crackles · distended neck veins"}]},
    {kind:"steps",title:"Initial work-up",steps:["ECG · BNP · chest X-ray · troponin","Abnormal or indicated → echocardiogram","OB + cardiology consultation"]}
  ],

  simulation:[
    {kind:"title",title:"Using Simulation mode",sub:"Same actions and timers — the facilitator controls time"},
    {kind:"split",tone:"dodont",title:"Time controls",left:{h:"They do",items:["Pause the clock","Jump +1 or +5 minutes","Fire reminders that fall due"]},right:{h:"They never",items:["Give a medication","Complete a task","Improve the patient","Advance a branch"]}},
    {kind:"steps",title:"Suggested exercise",steps:["Start the assist and brief","Assign tasks out loud; tap Start / Done","Advance to the next reminder","Require call-out + check-back for medications","Introduce deterioration → huddle","Debrief with the event timeline"]},
    {kind:"list",title:"Running a scripted case?",items:["Open Sim Master on a laptop","Pick a scenario","Tick actions as you see them","Debrief from the results"]}
  ]
};
