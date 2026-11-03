export const APP_VERSION = "1.1.0-prototype";
export const CONTENT_REVIEW_DATE = "2026-11-03";

export const REFERENCES = [
  {id:"acog-pph-183",short:"ACOG PB 183",title:"ACOG Practice Bulletin No. 183: Postpartum Hemorrhage",year:"2017",note:"Definition, 4 Ts, uterotonics, TXA, escalation and transfusion principles."},
  {id:"acog-pph-device",short:"ACOG CPU",title:"Use of Nonsurgical Hemorrhage-Control Devices for Postpartum Hemorrhage Management",year:"2025",note:"Balloon tamponade and vacuum-induced hemorrhage-control devices within a comprehensive algorithm."},
  {id:"acog-ed-pph",short:"ACOG ED PPH",title:"Postpartum Hemorrhage Emergency Algorithm",year:"2025",note:"Recognition, initial resuscitation, TXA and blood-product escalation signals."},
  {id:"acog-htn",short:"ACOG PB 222",title:"ACOG Practice Bulletin No. 222: Gestational Hypertension and Preeclampsia",year:"2020",note:"Severe features, urgent antihypertensive therapy, magnesium sulfate and delivery principles."},
  {id:"acog-ed-htn",short:"ACOG ED HTN",title:"Acute Hypertension in Pregnancy & Postpartum Algorithm",year:"2023",note:"Emergency department recognition and sequential labetalol, hydralazine and nifedipine pathways."},
  {id:"acog-ed-eclampsia",short:"ACOG ED Eclampsia",title:"Eclampsia Algorithm",year:"2023",note:"Initial seizure care, magnesium, refractory seizure management and toxicity monitoring."},
  {id:"acog-ed-cvd",short:"ACOG ED CVD",title:"Cardiovascular Disease in Pregnancy & Postpartum Algorithm",year:"2023",note:"Pregnancy-status screening, cardiovascular red flags and initial work-up."},
  {id:"ahrq-teamstepps",short:"AHRQ TeamSTEPPS",title:"TeamSTEPPS 3.0 Curriculum",year:"2023",url:"https://www.ahrq.gov/teamstepps-program/curriculum/intro/overview.html",note:"Communication, leadership, situation monitoring and mutual support."}
];

export const APPROVALS = [
  {role:"Obstetrics / MFM",status:"Pending",approvedBy:"",date:""},
  {role:"Pharmacy",status:"Pending",approvedBy:"",date:""},
  {role:"L&D / ED Nursing",status:"Pending",approvedBy:"",date:""},
  {role:"Anesthesia",status:"Pending",approvedBy:"",date:""},
  {role:"Blood Bank",status:"Pending",approvedBy:"",date:""},
  {role:"Risk / Compliance",status:"Pending",approvedBy:"",date:""},
  {role:"Clinical Informatics",status:"Pending",approvedBy:"",date:""}
];

export const INSTITUTIONAL_PLACEHOLDERS = [
  {label:"Hemorrhage cart location",value:""},
  {label:"Massive transfusion activation",value:""},
  {label:"OB rapid-response number",value:""},
  {label:"Transfer / higher-care route",value:""}
];

export const MEDICATIONS = [
  {id:"oxytocin",name:"Oxytocin",context:"PPH · uterotonic",accent:"crimson",dose:"10–40 units in 500–1,000 mL IV as a continuous infusion; or 10 units IM.",administration:"Do not give as an undiluted IV push. Use institutional preparation and pump policy.",repeat:"Continuous infusion; reassess uterine tone, bleeding and hemodynamic response.",avoid:"Rare hypersensitivity.",watch:"Hypotension with IV push; nausea/vomiting; hyponatremia with prolonged high-dose exposure.",source:"acog-pph-183"},
  {id:"methylergonovine",name:"Methylergonovine",context:"PPH · uterotonic",accent:"crimson",dose:"0.2 mg IM.",administration:"Use after checking contraindications and current blood pressure.",repeat:"May repeat every 2–4 hours per protocol.",avoid:"Hypertension, preeclampsia, cardiovascular disease or hypersensitivity. IV administration is not recommended in the cited bulletin.",watch:"Severe hypertension, nausea and vomiting.",source:"acog-pph-183"},
  {id:"carboprost",name:"Carboprost (15-methyl PGF₂α)",context:"PPH · uterotonic",accent:"crimson",dose:"0.25 mg IM or intramyometrial.",doseSteps:[{label:"Dose 1",dose:"0.25 mg IM or intramyometrial"},{label:"Repeat dose",dose:"0.25 mg IM or intramyometrial"}],administration:"Confirm pulmonary history before administration.",repeat:"Every 15–90 minutes; maximum 8 doses in the cited bulletin.",avoid:"Asthma. Relative contraindication with hypertension or active hepatic, pulmonary or cardiac disease.",watch:"Bronchospasm, diarrhea, nausea/vomiting, fever, chills and hypertension.",source:"acog-pph-183",maxDoses:8},
  {id:"misoprostol",name:"Misoprostol",context:"PPH · uterotonic",accent:"crimson",dose:"600–1,000 micrograms oral, sublingual or rectal.",administration:"Route should follow the approved local hemorrhage protocol.",repeat:"One-time dose in the cited bulletin.",avoid:"Hypersensitivity to medication or prostaglandins.",watch:"Fever, shivering, diarrhea, nausea/vomiting and headache.",source:"acog-pph-183",maxDoses:1},
  {id:"txa",name:"Tranexamic acid (TXA)",context:"PPH · antifibrinolytic",accent:"crimson",dose:"1 g IV over 10–20 minutes within 3 hours of birth for ongoing immediate PPH; a second 1 g dose may be given if bleeding continues after 30 minutes.",administration:"Record actual administration time and notify receiving/consulting teams. Use the approved hospital hemorrhage protocol.",repeat:"Reassess at 30 minutes; time alone does not authorize another dose.",avoid:"Review active thromboembolic disease, contraindications and dose adjustment requirements under local policy.",watch:"Thromboembolic risk assessment, infusion reaction and ongoing bleeding.",source:"acog-pph-183",timer:30,timerLabel:"Reassess bleeding; second TXA dose may be eligible",maxDoses:2},
  {id:"labetalol",name:"Labetalol IV",context:"Severe hypertension",accent:"amber",dose:"20 → 40 → 80 mg IV; reassess BP 10 minutes after each dose.",doseSteps:[{label:"Step 1",dose:"20 mg IV over 2 minutes"},{label:"Step 2",dose:"40 mg IV over 2 minutes"},{label:"Step 3",dose:"80 mg IV over 2 minutes"}],nextAction:"If BP remains severe: switch to hydralazine 10 mg IV and obtain emergent MFM/critical-care consultation.",administration:"Treat persistent SBP ≥160 or DBP ≥110 promptly. Record only the dose actually administered.",repeat:"Repeat BP in 10 minutes after each confirmed dose.",avoid:"Asthma, bradycardia, heart block, decompensated cardiac function or preexisting myocardial disease.",watch:"Hypotension, bradycardia and bronchospasm.",source:"acog-ed-htn",timer:10,timerLabel:"Reassess BP after labetalol",maxDoses:3},
  {id:"hydralazine",name:"Hydralazine IV",context:"Severe hypertension",accent:"amber",dose:"5–10 mg → 10 mg IV; reassess BP 20 minutes after each dose.",doseSteps:[{label:"Step 1",dose:"5–10 mg IV over 2 minutes"},{label:"Step 2",dose:"10 mg IV over 2 minutes"}],nextAction:"If BP remains severe: switch to labetalol 20 mg IV and obtain emergent MFM/critical-care consultation.",administration:"Use the exact locally approved initial dose within the supplied 5–10 mg range. Record only the dose actually administered.",repeat:"Repeat BP in 20 minutes after each confirmed dose.",avoid:"No pathway-specific absolute contraindication is listed; assess maternal hypotension risk.",watch:"Maternal hypotension, headache and abnormal fetal heart rate tracing.",source:"acog-ed-htn",timer:20,timerLabel:"Reassess BP after hydralazine",maxDoses:2},
  {id:"nifedipine",name:"Nifedipine immediate release",context:"Severe hypertension",accent:"amber",dose:"10 → 20 → 20 mg PO immediate release; reassess BP every 20 minutes.",doseSteps:[{label:"Step 1",dose:"10 mg PO immediate release"},{label:"Step 2",dose:"20 mg PO immediate release"},{label:"Step 3",dose:"20 mg PO immediate release"}],nextAction:"If BP remains severe: switch to labetalol 20 mg IV and obtain emergent MFM/critical-care consultation.",administration:"Preferred when IV access is not available. Confirm immediate-release formulation and ability to take oral medication.",repeat:"Repeat BP in 20 minutes after each confirmed dose.",avoid:"Use clinical judgment with hypotension or inability to take oral medication.",watch:"Reflex tachycardia, headache and hypotension.",source:"acog-ed-htn",timer:20,timerLabel:"Reassess BP after nifedipine",maxDoses:3},
  {id:"magnesium",name:"Magnesium sulfate",context:"Severe preeclampsia / eclampsia",accent:"violet",dose:"Loading dose 4–6 g IV over 20–30 minutes, then maintenance 1–2 g/hour.",workflowSteps:[{label:"Loading dose started",dose:"4–6 g IV over 20–30 minutes"},{label:"Maintenance running",dose:"1–2 g/hour continuous infusion"}],nextAction:"Continue for at least 24–48 hours after delivery or the last seizure, whichever is later. Monitor toxicity and renal function.",administration:"If IV access cannot be established: 10 g IM loading (5 g in each buttock), then 5 g IM every 4 hours. If creatinine is ≥1 mg/dL, adjust maintenance dosing with pharmacy/obstetric guidance.",repeat:"Check serum magnesium every 4 hours when indicated (first level 4 hours after initiation). Therapeutic range in the supplied algorithm: 4.9–8.5 mg/dL. Stop infusion if >9.6 mg/dL; restart when <8.4 mg/dL.",avoid:"Altered renal function (creatinine ≥1 mg/dL) requires maintenance-dose adjustment. Confirm local orders and monitoring.",watch:"Respiratory status, oxygenation, deep tendon reflexes, urine output, renal function and serum magnesium.",source:"acog-ed-eclampsia",maxDoses:2,toxicityTable:[{range:"4.9–8.5 mg/dL",effect:"Therapeutic range for seizure prophylaxis"},{range:"8.5–12.2 mg/dL",effect:"Loss of deep tendon reflexes"},{range:"12.2–15.8 mg/dL",effect:"Respiratory paralysis"},{range:">18.2 mg/dL",effect:"Altered cardiac conduction"},{range:">30 mg/dL",effect:"Cardiac arrest"}]},
  {id:"calcium-gluconate",name:"Calcium gluconate",context:"Magnesium toxicity rescue",accent:"violet",dose:"10% solution, 10 mL (1 g) IV over 3 minutes in the supplied eclampsia algorithm.",administration:"Keep immediately available when respiratory depression from magnesium toxicity is a concern; support airway and stop magnesium as clinically indicated.",repeat:"No automatic repeat. Obtain urgent expert guidance.",avoid:"Use with monitoring and clinician/pharmacy confirmation.",watch:"Cardiac rhythm and response to treatment.",source:"acog-ed-eclampsia"},
  {id:"lorazepam",name:"Lorazepam",context:"Persistent/recurrent seizure",accent:"violet",dose:"4 mg IV over 3–5 minutes after magnesium loading when seizure persists or recurs, per supplied algorithm.",administration:"Prepare for airway support and possible intubation.",repeat:"No automatic repeat timer in this prototype.",avoid:"Assess respiratory compromise and cumulative sedative exposure.",watch:"Respiratory depression, hypotension and level of consciousness.",source:"acog-ed-eclampsia"},
  {id:"midazolam",name:"Midazolam",context:"Persistent seizure · no IV",accent:"violet",dose:"10 mg IM if no IV access, per supplied eclampsia algorithm.",administration:"Use when persistent/recurrent seizure follows magnesium loading and IV access is unavailable.",repeat:"No automatic repeat timer in this prototype.",avoid:"Assess respiratory compromise and cumulative sedative exposure.",watch:"Respiratory depression, hypotension and level of consciousness.",source:"acog-ed-eclampsia"}
  ,{id:"diazepam",name:"Diazepam",context:"Persistent/recurrent seizure",accent:"violet",dose:"5–10 mg IV slowly after magnesium loading.",administration:"Preferred benzodiazepine-class alternative in the supplied algorithm. Prepare for airway support and possible intubation.",repeat:"No automatic repeat timer in this prototype.",avoid:"Assess respiratory compromise and cumulative sedative exposure.",watch:"Respiratory depression, hypotension and level of consciousness.",source:"acog-ed-eclampsia"}
  ,{id:"fosphenytoin",name:"Fosphenytoin",context:"Seizure persists after benzodiazepine",accent:"violet",dose:"20 mg PE/kg IV at 150 mg PE/min.",administration:"Use only within the persistent-seizure pathway with urgent expert support.",repeat:"No automatic repeat timer in this prototype.",avoid:"Confirm contraindications, weight-based calculation and monitoring with pharmacy/critical care.",watch:"Cardiac rhythm, blood pressure, airway and neurologic response.",source:"acog-ed-eclampsia"}
  ,{id:"levetiracetam",name:"Levetiracetam",context:"Persistent seizure after fosphenytoin",accent:"violet",dose:"60 mg/kg IV; maximum 4,500 mg.",administration:"Use within the refractory-seizure pathway with neurology/anesthesia/critical-care support.",repeat:"No automatic repeat timer in this prototype.",avoid:"Confirm weight-based calculation and renal considerations with pharmacy/critical care.",watch:"Airway, neurologic response and sedation.",source:"acog-ed-eclampsia"}
  ,{id:"propofol-airway",name:"Intubation with propofol",context:"Persistent refractory seizure",accent:"violet",dose:"Dose and airway plan per anesthesia/critical care.",administration:"The supplied algorithm says to consider intubation with propofol; it does not provide a dose. Do not use this card as a dosing order.",repeat:"Immediate expert airway management.",avoid:"Requires an appropriately trained airway team and full monitoring.",watch:"Airway, ventilation, hemodynamics and seizure control.",source:"acog-ed-eclampsia",recordable:false}
  ,{id:"calcium-chloride",name:"Calcium chloride",context:"Magnesium toxicity rescue",accent:"violet",dose:"10% solution, 5 mL (500 mg) IV over 5–10 minutes.",administration:"Alternative calcium rescue listed in the supplied eclampsia algorithm. Support airway and stop magnesium as clinically indicated.",repeat:"No automatic repeat. Obtain urgent expert guidance.",avoid:"Use with cardiac monitoring and clinician/pharmacy confirmation.",watch:"Cardiac rhythm, IV site and clinical response.",source:"acog-ed-eclampsia"}
];

const commonMilestones = [
  {min:5,label:"5-minute team check",message:"Reassess patient status, treatment response, outstanding actions and escalation plan."},
  {min:10,label:"10-minute status update",message:"State the current condition, interventions completed, response and next priorities."},
  {min:15,label:"15-minute huddle",message:"Confirm shared mental model, unresolved threats and need for higher-level resources."}
];

export const EMERGENCIES = {
  pph:{
    id:"pph",name:"Postpartum Hemorrhage",short:"Hemorrhage",icon:"◉",accent:"crimson",summary:"Control bleeding while resuscitating and identifying the cause.",source:["acog-pph-183","acog-pph-device","acog-ed-pph"],milestones:commonMilestones,
    tasks:[
      {id:"pph-help",group:"DO NOW",title:"Call for help. Activate the obstetric hemorrhage response.",detail:"Bring the hemorrhage cart, designate a leader and recorder/timekeeper, notify anesthesia and obtain additional obstetric support according to local policy.",type:"once",priority:"critical"},
      {id:"pph-assess",group:"DO NOW",title:"Assess bleeding, uterine tone and maternal status.",detail:"PPH is cumulative blood loss ≥1,000 mL or blood loss with signs/symptoms of hypovolemia within 24 hours of birth. Quantify cumulative blood loss when possible; assess fundus, bleeding, vital signs, mental status and perfusion. Hemodynamic changes can occur late.",type:"repeat",repeatMin:5,priority:"critical",review:"The 5-minute recurrence is a prototype setting requiring local approval."},
      {id:"pph-massage",group:"DO IN PARALLEL",title:"Massage the fundus; begin bimanual compression for suspected atony.",detail:"Remove intrauterine clots as appropriate. Continue while uterotonics are prepared and administered. A firm uterus with ongoing bleeding should redirect attention toward Trauma, Tissue and Thrombin.",type:"ongoing",priority:"high"},
      {id:"pph-access",group:"DO IN PARALLEL",title:"Establish rapid access, obtain hemorrhage labs and prepare blood products.",detail:"Use local hemorrhage protocol for IV access, CBC, type and crossmatch, coagulation studies and fibrinogen. The supplied emergency algorithm flags estimated blood loss ≥1,500 mL, abnormal vital signs, or ongoing uncontrolled blood loss as reasons to consider blood products. Use the institutional staged hemorrhage/MTP protocol.",type:"once",priority:"high"},
      {id:"pph-oxytocin",group:"TREAT",title:"Give oxytocin; add rapid-sequence uterotonics when indicated.",detail:"Oxytocin is first-line for uterine atony. Select additional agents only after checking hypertension/preeclampsia, asthma and cardiac/hepatic/pulmonary contraindications.",type:"med",meds:["oxytocin","methylergonovine","carboprost","misoprostol"],priority:"high"},
      {id:"pph-cause",group:"IDENTIFY CAUSE",title:"Assess Tone · Trauma · Tissue · Thrombin.",detail:"More than one cause can coexist. Examine the uterus and genital tract, assess placental completeness/retained tissue and evaluate coagulation status.",type:"repeat",repeatMin:10,priority:"high"},
      {id:"pph-txa",group:"TREAT",title:"Consider early TXA for ongoing immediate postpartum hemorrhage.",detail:"The supplied guidance supports 1 g IV over 10–20 minutes within 3 hours of birth, with reassessment before any second dose. Follow the approved local protocol.",type:"med",meds:["txa"],priority:"high"},
      {id:"pph-escalate",group:"ESCALATE",title:"If bleeding continues, escalate without waiting for a timer.",detail:"Activate massive transfusion as indicated. Prepare nonsurgical hemorrhage-control device, operating room, interventional radiology or hysterectomy based on cause, response, resources and patient status. Device use must not delay definitive care or transfer.",type:"once",priority:"critical"}
    ],
    flow:[
      {title:"Recognize",body:"Ongoing abnormal postpartum bleeding or blood loss with hypovolemia signs. Do not wait for hypotension.",tone:"start"},
      {title:"Activate + resuscitate",body:"Call hemorrhage response; leader and recorder; access, monitoring, labs, warming and blood support in parallel.",tone:"critical"},
      {title:"Assess 4 Ts",body:"Tone · Trauma · Tissue · Thrombin. Multiple causes may coexist.",tone:"decision"},
      {title:"Treat cause",body:"Atony: massage/compression + uterotonics. Trauma: identify and repair. Tissue: evaluate/remove. Thrombin: correct coagulopathy.",tone:"action"},
      {title:"Ongoing bleeding?",body:"Reassess response continuously. Consider TXA early when indicated; do not wait for a milestone.",tone:"decision"},
      {title:"Escalate",body:"MTP/blood support · balloon or vacuum-induced control device · OR/IR · definitive surgery/transfer.",tone:"critical"}
    ]
  },
  htn:{
    id:"htn",name:"Acute Severe Hypertension",short:"Severe BP",icon:"↑",accent:"amber",summary:"Confirm persistence, treat promptly and assess severe features.",source:["acog-htn","acog-ed-htn"],milestones:commonMilestones,
    tasks:[
      {id:"htn-help",group:"DO NOW",title:"Notify obstetrics and activate the severe-hypertension response.",detail:"Acute-onset persistent SBP ≥160 or DBP ≥110 is an obstetric emergency during pregnancy and postpartum. Escalate immediately according to local policy.",type:"once",priority:"critical"},
      {id:"htn-bp",group:"DO NOW",title:"Repeat BP with correct technique within 15 minutes.",detail:"Confirm an acute severe value as persistent. Treatment should be given promptly once persistence is established; do not wait four hours.",type:"repeat",repeatMin:15,priority:"critical"},
      {id:"htn-symptoms",group:"DO IN PARALLEL",title:"Assess headache, vision, RUQ/epigastric pain, dyspnea, pulmonary edema and neurologic findings.",detail:"Severe headache with hypertension raises concern for stroke. Evaluate oliguria and other severe features; perform focused neurologic assessment.",type:"repeat",repeatMin:15,priority:"high"},
      {id:"htn-labs",group:"DO IN PARALLEL",title:"Obtain CBC, platelets, AST/ALT, creatinine and urine protein assessment.",detail:"Laboratory severe features include platelets <100 × 10⁹/L, transaminases to twice normal, or creatinine >1.1 mg/dL or doubling without other renal disease.",type:"once",priority:"high"},
      {id:"htn-treat",group:"TREAT",title:"Give a first-line antihypertensive using one approved sequence.",detail:"No IV access: choose immediate-release nifedipine. Asthma or bradycardia: choose hydralazine or nifedipine. Otherwise use an approved labetalol, hydralazine or nifedipine sequence. Start the drug-specific BP timer only after confirming administration.",type:"med",meds:["labetalol","hydralazine","nifedipine"],priority:"critical"},
      {id:"htn-mag",group:"TREAT",title:"Initiate magnesium sulfate when indicated for severe preeclampsia.",detail:"Antihypertensive treatment and magnesium should proceed simultaneously when possible; antihypertensive treatment takes priority if they cannot be concurrent.",type:"med",meds:["magnesium"],priority:"high"},
      {id:"htn-monitor",group:"REASSESS",title:"Reassess BP after every dose and monitor for treatment response.",detail:"The supplied ED algorithm targets 130–150/80–100 mm Hg, then uses a staged monitoring schedule. Confirm target and schedule with local policy.",type:"ongoing",priority:"high"},
      {id:"htn-escalate",group:"ESCALATE",title:"Persistent severe BP or deterioration: obtain emergent higher-level consultation.",detail:"Escalate after failure of the initial sequence, neurologic symptoms, pulmonary edema, HELLP concern or maternal/fetal deterioration. Prepare for delivery based on gestational age and clinical circumstances after stabilization.",type:"once",priority:"critical"}
    ],
    flow:[
      {title:"Identify",body:"≥20 weeks pregnant or ≤6 weeks postpartum with SBP ≥160 or DBP ≥110.",tone:"start"},
      {title:"Confirm persistence",body:"Repeat correctly within 15 minutes while assessing symptoms and preparing medication.",tone:"decision"},
      {title:"Treat promptly",body:"Choose labetalol IV, hydralazine IV or nifedipine IR PO. Record the actual administration time.",tone:"critical"},
      {title:"Reassess by agent",body:"Labetalol: 10 min. Hydralazine: 20 min. Nifedipine: 20 min. Repeat only if still severe and within the approved sequence.",tone:"action"},
      {title:"Severe features",body:"Assess neurologic symptoms, RUQ/epigastric pain, pulmonary edema, platelets, liver enzymes and creatinine; initiate magnesium when indicated.",tone:"decision"},
      {title:"Escalate + plan delivery",body:"Persistent severe BP, stroke concern, HELLP, pulmonary edema or deterioration requires urgent expert support and disposition/delivery planning.",tone:"critical"}
    ]
  },
  eclampsia:{
    id:"eclampsia",name:"Eclampsia / Obstetric Seizure",short:"Eclampsia",icon:"⚡",accent:"violet",summary:"Protect the patient, give magnesium and prepare for recurrence or airway intervention.",source:["acog-htn","acog-ed-eclampsia"],milestones:commonMilestones,
    tasks:[
      {id:"ec-help",group:"DO NOW",title:"Call for help; request immediate obstetric, anesthesia and emergency support.",detail:"Designate a leader and recorder/timekeeper. Prepare airway equipment and medications while supportive seizure care begins.",type:"once",priority:"critical"},
      {id:"ec-safety",group:"DO NOW",title:"Protect from injury; position left lateral when feasible; support airway and breathing.",detail:"Do not forcibly restrain. Prevent aspiration, monitor oxygen saturation and provide usual seizure care. Most eclamptic seizures are self-limited; magnesium prevents recurrence.",type:"ongoing",priority:"critical"},
      {id:"ec-mag",group:"TREAT",title:"Give magnesium sulfate loading dose, then maintenance infusion.",detail:"The supplied algorithm uses 4–6 g IV over 20–30 minutes followed by 1–2 g/hour. Use the IM pathway if IV access cannot be established and obtain expert guidance for renal dysfunction.",type:"med",meds:["magnesium"],priority:"critical"},
      {id:"ec-vitals",group:"DO IN PARALLEL",title:"Assess BP, oxygenation, respirations, neurologic status and fetal status when applicable.",detail:"If SBP ≥160 or DBP ≥110, initiate the acute severe-hypertension pathway. Maternal stabilization comes first during fetal bradycardia associated with seizure.",type:"repeat",repeatMin:5,priority:"high",review:"The 5-minute recurrence is a prototype setting requiring local approval."},
      {id:"ec-recur",group:"ESCALATE",title:"Persistent or recurrent seizure: continue magnesium and escalate anticonvulsant/airway management.",detail:"After magnesium loading, use one approved benzodiazepine option. If still seizing, the supplied sequence lists fosphenytoin, then levetiracetam, and consideration of intubation with propofol plus urgent neurology/anesthesia/critical-care/MFM consultation.",type:"med",meds:["lorazepam","diazepam","midazolam","fosphenytoin","levetiracetam","propofol-airway"],priority:"critical"},
      {id:"ec-tox",group:"MONITOR",title:"Monitor for magnesium toxicity and keep calcium available.",detail:"Monitor respiratory status, deep tendon reflexes, urine output, renal function and serum magnesium. The supplied algorithm says stop if serum magnesium is >9.6 mg/dL and restart when <8.4 mg/dL. Calcium gluconate or calcium chloride should be immediately available for impending respiratory depression.",type:"ongoing",priority:"high",meds:["calcium-gluconate","calcium-chloride"]},
      {id:"ec-neuro",group:"AFTER SEIZURE",title:"Perform focused neurologic evaluation and consider head imaging.",detail:"Evaluate focal deficits, atypical presentation, persistent altered mental status or seizure refractory to magnesium. Consider alternate diagnoses.",type:"once",priority:"high"},
      {id:"ec-delivery",group:"AFTER STABILIZATION",title:"Prepare for delivery based on obstetric circumstances.",detail:"Eclampsia is not itself an automatic indication for cesarean birth. Stabilize first; timing and route depend on maternal, fetal and obstetric factors.",type:"once",priority:"high"}
    ],
    flow:[
      {title:"Presumed eclamptic seizure",body:"Known/suspected pregnancy or recent postpartum state. Call for help and begin usual seizure care.",tone:"start"},
      {title:"Protect + support",body:"Prevent injury and aspiration; left lateral when feasible; support airway/breathing and monitor oxygenation.",tone:"critical"},
      {title:"Magnesium sulfate",body:"4–6 g IV over 20–30 min → maintenance 1–2 g/h. Use approved IM pathway when IV cannot be established.",tone:"action"},
      {title:"Persistent/recurrent?",body:"Continue magnesium; use approved benzodiazepine/second-line pathway; prepare for intubation and expert consultation.",tone:"decision"},
      {title:"After seizure",body:"Assess severe BP, neurologic deficits, oxygenation and fetal status; consider head CT and alternate diagnoses.",tone:"action"},
      {title:"Ongoing care",body:"Monitor magnesium toxicity, continue therapy per protocol and plan delivery after stabilization.",tone:"critical"}
    ]
  },
  cardiac:{
    id:"cardiac",name:"Cardiac Red Flags",short:"Cardiac",icon:"♥",accent:"teal",summary:"Recognize cardiovascular danger in pregnancy or within 12 months postpartum.",source:["acog-ed-cvd"],milestones:commonMilestones,
    tasks:[
      {id:"cv-pregnancy",group:"DO NOW",title:"Ask: pregnant or pregnant within the last 12 months?",detail:"Pregnancy-related cardiovascular disease can occur during pregnancy and up to 12 months postpartum, regardless of age.",type:"once",priority:"critical"},
      {id:"cv-redflags",group:"DO NOW",title:"Check cardiac red flags and vital signs.",detail:"Red flags include dyspnea or chest pain at rest/minimal exertion, ripping/tearing chest pain, near-syncope with palpitations, severe orthopnea, HR ≥120, RR ≥25, oxygen saturation ≤94%, systolic BP ≥160 or <90, pathologic murmur/S3/S4, crackles or distended neck veins.",type:"repeat",repeatMin:5,priority:"critical",review:"The 5-minute recurrence is a prototype setting requiring local approval."},
      {id:"cv-help",group:"ACTIVATE",title:"Call emergency, obstetric and cardiac support.",detail:"Escalate immediately when red flags or instability are present. Arrange transfer when echocardiography, cardiology, obstetrics/MFM or higher-level care is not available.",type:"once",priority:"critical"},
      {id:"cv-workup",group:"WORK UP",title:"Obtain ECG, BNP, chest X-ray and troponin.",detail:"These are the key initial tests in the supplied ACOG educational algorithm. Do not delay stabilization or treatment of a life-threatening emergency.",type:"once",priority:"high"},
      {id:"cv-echo",group:"ESCALATE",title:"If testing is abnormal: echo, consult and admit/transfer.",detail:"Obtain echocardiography, consult cardiology plus obstetrics/MFM, and treat/admit/transfer as clinically indicated.",type:"once",priority:"critical"},
      {id:"cv-treat",group:"TREAT",title:"Treat life-threatening cardiovascular emergencies.",detail:"The supplied algorithm states that otherwise-indicated emergency cardiovascular medications should not be withheld solely because the patient is pregnant or breastfeeding. Consult pharmaceutical references and specialists for ongoing therapy.",type:"ongoing",priority:"high"}
    ],
    flow:[
      {title:"Pregnancy status",body:"Pregnant or pregnant within the last 12 months?",tone:"start"},
      {title:"Cardiac red flags",body:"Rest symptoms · syncope/palpitations · abnormal vitals · murmur/crackles/JVD.",tone:"critical"},
      {title:"Stabilize + activate",body:"Emergency support plus obstetrics/MFM and cardiology; transfer when needed.",tone:"critical"},
      {title:"Key work-up",body:"ECG · BNP · chest X-ray · troponin.",tone:"action"},
      {title:"Abnormal testing?",body:"Obtain echocardiogram and urgent specialist consultation.",tone:"decision"},
      {title:"Treat + disposition",body:"Treat life threats; admit or transfer as clinically indicated.",tone:"critical"}
    ]
  }
};

export const EDUCATION = [
  {id:"teamstepps",title:"TeamSTEPPS in an OB emergency",kicker:"TEAM PERFORMANCE",accent:"navy",summary:"A clear leader, closed-loop communication and a shared mental model—without making the app a role-assignment obstacle.",sections:[
    {h:"Four core skills",p:"Communication, team leadership, situation monitoring and mutual support reinforce one another. The app surfaces short prompts; the team—not the phone—directs care."},
    {h:"Brief at activation",bullets:["Leader states: ‘I am leading.’","Name the emergency and immediate goal.","Assign medication, bedside assessment, recorder/timekeeper and runner roles.","State the first escalation threshold and available resources."]},
    {h:"Call-out + check-back",p:"Use a call-out for critical information and a check-back to close the loop. Example: ‘Labetalol 20 mg IV now.’ → ‘Labetalol 20 mg IV.’ → ‘Correct.’ Completion should then be announced and recorded."},
    {h:"Huddle",p:"Pause briefly when the plan is not working, new information appears or resources change. State patient status, actions completed, response, threats and the next plan."},
    {h:"Speak up",p:"Use CUS—Concerned, Uncomfortable, Safety issue—or the Two-Challenge Rule when a safety concern is not acknowledged."},
    {h:"Debrief",p:"Afterward, review what went well, what could improve, whether roles and communication were clear, and what system issue requires follow-up."}
  ]},
  {id:"roles",title:"Suggested emergency team roles",kicker:"LOCALIZE BEFORE RELEASE",accent:"navy",summary:"Roles are educational here; assignment should never block access to emergency actions.",sections:[
    {h:"Team leader",p:"Sets priorities, maintains the shared mental model, requests updates and escalates resources."},
    {h:"Primary bedside nurse",p:"Performs focused assessment, communicates changes and coordinates bedside interventions."},
    {h:"Medication nurse",p:"Prepares medications, checks contraindications, uses closed-loop confirmation and announces administration time."},
    {h:"Recorder / timekeeper",p:"Records events and doses, announces due reassessments and prompts structured status updates."},
    {h:"Obstetric / procedural clinician",p:"Directs cause-specific evaluation and procedures while coordinating with the team leader."},
    {h:"Anesthesia / resuscitation lead",p:"Supports airway, hemodynamics, vascular access, transfusion and escalation of care."}
  ]},
  {id:"four-ts",title:"PPH: the 4 Ts",kicker:"CAUSE-DIRECTED CARE",accent:"crimson",summary:"Identify and treat the cause while resuscitation continues; multiple causes can coexist.",sections:[
    {h:"Tone",p:"Atony is most common. Assess fundus and lower uterine segment; massage, remove clots as appropriate, use bimanual compression and rapid-sequence uterotonics without contraindications."},
    {h:"Trauma",p:"Inspect cervix, vagina, vulva and perineum. A firm uterus with ongoing bleeding should increase concern for laceration, hematoma, rupture or concealed bleeding."},
    {h:"Tissue",p:"Assess placental completeness and retained tissue. Manual examination and ultrasound may support evaluation; suspected accreta requires early escalation."},
    {h:"Thrombin",p:"Evaluate coagulopathy and replace blood components/fibrinogen according to laboratory findings, viscoelastic testing when available and the massive-transfusion protocol."},
    {h:"Escalation",p:"If uterotonics and massage fail, move promptly to approved nonsurgical hemorrhage-control devices, OR/IR or definitive surgery. Do not let a device delay transfer or definitive control."}
  ]},
  {id:"severe-htn",title:"Severe hypertension: treatment logic",kicker:"TIME-CRITICAL",accent:"amber",summary:"Persistent SBP ≥160 or DBP ≥110 requires prompt therapy; each drug has its own reassessment interval.",sections:[
    {h:"Confirm—then act",p:"Repeat a severe value with correct technique within 15 minutes while preparing treatment. Once persistent, administer therapy as soon as reasonably possible."},
    {h:"Choose one first-line pathway",p:"No IV access: choose immediate-release nifedipine. Asthma or bradycardia: choose hydralazine or nifedipine. Otherwise select an approved labetalol, hydralazine or nifedipine pathway."},
    {h:"Reassess by agent",bullets:["Labetalol pathway: reassess BP in 10 minutes.","Hydralazine pathway: reassess BP in 20 minutes.","Nifedipine pathway: reassess BP in 20 minutes.","Never infer that a repeat dose was given merely because time elapsed."]},
    {h:"Look beyond the number",p:"Assess neurologic symptoms, pulmonary edema, RUQ/epigastric pain, platelets, liver enzymes and creatinine. Severe headache with hypertension should raise concern for stroke."}
  ]},
  {id:"mag-safety",title:"Magnesium sulfate safety",kicker:"SEIZURE PREVENTION",accent:"violet",summary:"Magnesium is first-line for eclampsia and severe-feature seizure prophylaxis, with close respiratory and renal monitoring.",sections:[
    {h:"Standard supplied pathway",p:"4–6 g IV over 20–30 minutes followed by 1–2 g/hour. Continue for at least 24–48 hours after delivery or the last seizure, whichever is later."},
    {h:"Renal function + levels",p:"If creatinine is ≥1 mg/dL, maintenance dosing requires adjustment. When indicated, check serum magnesium every 4 hours; the supplied therapeutic range is 4.9–8.5 mg/dL."},
    {h:"Clinical toxicity monitoring",bullets:["Respiratory rate and oxygenation","Deep tendon reflexes","Urine output and renal function","Mental status and neuromuscular findings","Serum magnesium when indicated"]},
    {h:"Toxicity response",p:"Stop the infusion if serum magnesium is >9.6 mg/dL and restart when <8.4 mg/dL. Support airway/ventilation. The supplied rescue options are calcium gluconate 1 g IV over 3 minutes or calcium chloride 500 mg IV over 5–10 minutes."},
    {h:"Toxicity levels",bullets:["4.9–8.5 mg/dL: therapeutic range","8.5–12.2: loss of deep tendon reflexes","12.2–15.8: respiratory paralysis",">18.2: altered cardiac conduction",">30: cardiac arrest"]},
    {h:"Recurrent seizure",p:"Continue magnesium, then use the supplied benzodiazepine → fosphenytoin → levetiracetam pathway. Persistent seizure requires possible intubation with propofol and urgent multidisciplinary support."}
  ]},
  {id:"pregnancy-status",title:"Ask about current or recent pregnancy",kicker:"ED SCREENING",accent:"teal",summary:"Pregnancy-related emergencies can present after delivery and outside labor and delivery.",sections:[
    {h:"Hypertension / eclampsia screen",p:"Ask whether the patient is pregnant or has been pregnant within the last 6 weeks when evaluating hypertension, seizure, headache, visual symptoms, RUQ pain or dyspnea."},
    {h:"Cardiovascular screen",p:"Ask whether the patient is pregnant or has been pregnant in the last 12 months when assessing cardiovascular symptoms."},
    {h:"Cardiovascular red flags",bullets:["Shortness of breath or chest pain at rest","Severe orthopnea or near-syncope with palpitations","Resting HR ≥120 or RR ≥25","Oxygen saturation ≤94%","Resting systolic BP ≥160 or <90","New pathologic murmur, S3/S4, crackles or distended neck veins"]},
    {h:"Initial work-up",p:"The supplied ACOG educational algorithm highlights ECG, BNP, chest X-ray and troponin, followed by echocardiography and obstetric/cardiology consultation when abnormal or clinically indicated."}
  ]},
  {id:"simulation",title:"Using Simulation mode",kicker:"DUAL-PURPOSE TRAINING",accent:"teal",summary:"Simulation uses the same actions and timers while allowing the facilitator to control time.",sections:[
    {h:"What time controls do",p:"Pause, +1 minute, +5 minutes and Next event change the simulation clock and trigger reminders that become due."},
    {h:"What time controls never do",p:"They never administer a medication, complete a task, improve the patient or advance a clinical branch automatically."},
    {h:"Suggested exercise",bullets:["Start the assist and conduct a brief.","Assign tasks verbally and use Start/Done in the app.","Advance to the next reminder.","Require a call-out and check-back for medication.","Introduce deterioration and ask for a huddle.","End with a short debrief using the event timeline."]}
  ]}
];

export function getReference(id){ return REFERENCES.find(r=>r.id===id); }
export function getMedication(id){ return MEDICATIONS.find(m=>m.id===id); }
