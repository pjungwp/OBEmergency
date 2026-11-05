export const APP_VERSION = "0.22.0-prototype";
export const CONTENT_REVIEW_DATE = "2026-11-02";

export const REFERENCES = [
  {id:"acog-pph-183",url:"https://www.acog.org/clinical/clinical-guidance/practice-bulletin/articles/2017/10/postpartum-hemorrhage",urlKind:"page",short:"ACOG PB 183",title:"ACOG Practice Bulletin No. 183: Postpartum Hemorrhage",year:"2017",note:"Definition, 4 Ts, uterotonics, TXA, escalation and transfusion principles."},
  {id:"acog-pph-device",url:"https://www.acog.org/clinical/clinical-guidance/clinical-practice-update",urlKind:"index",short:"ACOG CPU",title:"Use of Nonsurgical Hemorrhage-Control Devices for Postpartum Hemorrhage Management",year:"2025",note:"Balloon tamponade and vacuum-induced hemorrhage-control devices within a comprehensive algorithm."},
  {id:"acog-htn",url:"https://www.acog.org/clinical/clinical-guidance/practice-bulletin/articles/2020/06/gestational-hypertension-and-preeclampsia",urlKind:"page",short:"ACOG PB 222",title:"ACOG Practice Bulletin No. 222: Gestational Hypertension and Preeclampsia",year:"2020",note:"Severe features, urgent antihypertensive therapy, magnesium sulfate and delivery principles."},
  {id:"acog-ed-htn",url:"https://www.acog.org/programs/obstetric-emergencies-in-nonobstetric-settings",urlKind:"index",short:"ACOG ED HTN",title:"Acute Hypertension in Pregnancy & Postpartum Algorithm",year:"2023",note:"Emergency department recognition and sequential labetalol, hydralazine and nifedipine pathways."},
  {id:"acog-ed-eclampsia",url:"https://www.acog.org/-/media/project/acog/acogorg/files/pdfs/programs/ob-emergencies/eclampsia_algorithm.pdf",urlKind:"pdf",short:"ACOG ED Eclampsia",title:"Eclampsia Algorithm",year:"2023",note:"Initial seizure care, magnesium, refractory seizure management and toxicity monitoring."},
  {id:"acog-ed-cvd",url:"https://www.acog.org/programs/obstetric-emergencies-in-nonobstetric-settings",urlKind:"index",short:"ACOG ED CVD",title:"Cardiovascular Disease in Pregnancy & Postpartum Algorithm",year:"2023",note:"Pregnancy-status screening, cardiovascular red flags and initial work-up."},
  {id:"aha-2025-pregnancy",short:"AHA 2025",title:"2025 AHA Guidelines, Part 10: Special Circumstances — Cardiac Arrest in Pregnancy",year:"2025",url:"https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-and-pediatric-special-circumstances-of-resuscitation",urlKind:"page",note:"Left uterine displacement, early airway, IV above the diaphragm, stop magnesium and give calcium, detach fetal monitors, MTP for suspected AFE, resuscitative delivery within 5 minutes."},
  {id:"smfm-afe-9",short:"SMFM CG 9",title:"SMFM Clinical Guideline No. 9: Amniotic Fluid Embolism — Diagnosis and Management",year:"2016",url:"https://publications.smfm.org/publications/581-society-for-maternal-fetal-medicine-clinical-guidelines-9/",urlKind:"page",note:"Clinical diagnosis; immediate high-quality CPR; delivery if arrested at ≥23 weeks; avoid excessive fluid; early coagulation assessment and massive transfusion."},
  {id:"acog-sd-178",short:"ACOG PB 178",title:"ACOG Practice Bulletin No. 178: Shoulder Dystocia",year:"2017",url:"https://www.acog.org/clinical/clinical-guidance/practice-bulletin/articles/2017/05/shoulder-dystocia",urlKind:"page",note:"McRoberts and suprapubic pressure first; posterior arm delivery and internal rotational maneuvers next; avoid fundal pressure."},
  {id:"aafp-trauma",short:"AFP 2014",title:"Trauma in Pregnancy: Assessment, Management, and Prevention (Am Fam Physician)",year:"2014",url:"https://www.aafp.org/pubs/afp/issues/2014/1115/p717.html",urlKind:"page",note:"Uterine displacement, fetal monitoring after trauma (minimum 4 hours, longer with risk signs), Rh immune globulin and Kleihauer-Betke testing."},
  {id:"acog-co-723",short:"ACOG CO 723",title:"ACOG Committee Opinion No. 723: Guidelines for Diagnostic Imaging During Pregnancy and Lactation",year:"2017",note:"Indicated maternal imaging should not be withheld because of pregnancy."},
  {id:"ahrq-teamstepps",short:"AHRQ TeamSTEPPS",title:"TeamSTEPPS 3.0 Curriculum",year:"2023",url:"https://www.ahrq.gov/teamstepps-program/curriculum/intro/overview.html",note:"Communication, leadership, situation monitoring and mutual support."}
];

export const MEDICATIONS = [
  {id:"oxytocin",name:"Oxytocin",context:"PPH · uterotonic",accent:"crimson",dose:"10–40 units in 500–1,000 mL IV as a continuous infusion; or 10 units IM.",administration:"Do not give as an undiluted IV push. Use institutional preparation and pump policy.",repeat:"Continuous infusion; reassess uterine tone, bleeding and hemodynamic response.",avoid:"Rare hypersensitivity.",watch:"Hypotension with IV push; nausea/vomiting; hyponatremia with prolonged high-dose exposure.",source:"acog-pph-183"},
  {id:"methylergonovine",name:"Methylergonovine",context:"PPH · uterotonic",accent:"crimson",dose:"0.2 mg IM.",administration:"Use after checking contraindications and current blood pressure.",repeat:"May repeat every 2–4 hours per protocol.",avoid:"Hypertension, preeclampsia, cardiovascular disease or hypersensitivity. IV administration is not recommended in the cited bulletin.",watch:"Severe hypertension, nausea and vomiting.",source:"acog-pph-183"},
  {id:"carboprost",name:"Carboprost (15-methyl PGF₂α)",context:"PPH · uterotonic",accent:"crimson",dose:"0.25 mg IM or intramyometrial.",administration:"Confirm pulmonary history before administration.",repeat:"Every 15–90 minutes; maximum 8 doses in the cited bulletin.",avoid:"Asthma. Relative contraindication with hypertension or active hepatic, pulmonary or cardiac disease.",watch:"Bronchospasm, diarrhea, nausea/vomiting, fever, chills and hypertension.",source:"acog-pph-183"},
  {id:"misoprostol",name:"Misoprostol",context:"PPH · uterotonic",accent:"crimson",dose:"600–1,000 micrograms oral, sublingual or rectal.",administration:"Route should follow the approved local hemorrhage protocol.",repeat:"One-time dose in the cited bulletin.",avoid:"Hypersensitivity to medication or prostaglandins.",watch:"Fever, shivering, diarrhea, nausea/vomiting and headache.",source:"acog-pph-183",maxDoses:1},
  {id:"txa",name:"Tranexamic acid (TXA)",context:"PPH · antifibrinolytic",accent:"crimson",dose:"1 g IV over 10–20 minutes within 3 hours of birth for ongoing immediate PPH; a second 1 g dose may be given if bleeding continues after 30 minutes.",administration:"Record actual administration time and notify receiving/consulting teams. Use the approved hospital hemorrhage protocol.",repeat:"Reassess at 30 minutes; time alone does not authorize another dose.",avoid:"Review active thromboembolic disease, contraindications and dose adjustment requirements under local policy.",watch:"Thromboembolic risk assessment, infusion reaction and ongoing bleeding.",source:"acog-pph-183",timer:30,timerLabel:"Reassess bleeding; second TXA dose may be eligible",maxDoses:2},
  {id:"labetalol",name:"Labetalol IV",context:"Severe hypertension",accent:"amber",dose:"20 mg IV over 2 minutes → repeat BP in 10 min; if still severe, 40 mg IV → repeat in 10 min; if still severe, 80 mg IV → repeat in 10 min, then convert/escalate per algorithm.",administration:"Treat persistent SBP ≥160 or DBP ≥110 promptly. The selected ED algorithm uses the 20/40/80 mg sequence.",repeat:"Each confirmed dose starts a 10-minute BP reassessment timer.",avoid:"Asthma, bradycardia, heart block, decompensated cardiac function or preexisting myocardial disease.",watch:"Hypotension, bradycardia and bronchospasm.",source:"acog-ed-htn",timer:10,timerLabel:"Reassess BP after labetalol"},
  {id:"hydralazine",name:"Hydralazine IV",context:"Severe hypertension",accent:"amber",dose:"5–10 mg IV over 2 minutes → repeat BP in 20 min; if still severe, 10 mg IV → repeat in 20 min, then convert/escalate per algorithm.",administration:"Use the exact locally approved sequence; the supplied ED algorithm permits 5–10 mg initially.",repeat:"Each confirmed dose starts a 20-minute BP reassessment timer.",avoid:"No pathway-specific absolute contraindication listed in the supplied ED algorithm; assess for maternal hypotension risk.",watch:"Maternal hypotension, headache and abnormal fetal heart rate tracing.",source:"acog-ed-htn",timer:20,timerLabel:"Reassess BP after hydralazine"},
  {id:"nifedipine",name:"Nifedipine immediate release",context:"Severe hypertension",accent:"amber",dose:"10 mg PO immediate release → repeat BP in 20 min; if still severe, 20 mg PO → repeat in 20 min; one additional 20 mg PO step appears in the supplied ED algorithm before conversion/escalation.",administration:"Useful when IV access is not available. Confirm immediate-release formulation and ability to take oral medication.",repeat:"Each confirmed dose starts a 20-minute BP reassessment timer.",avoid:"Use clinical judgment with hypotension or inability to take oral medication.",watch:"Reflex tachycardia, headache and hypotension.",source:"acog-ed-htn",timer:20,timerLabel:"Reassess BP after nifedipine"},
  {id:"magnesium",name:"Magnesium sulfate",context:"Severe preeclampsia / eclampsia",accent:"violet",dose:"Loading dose 4–6 g IV over 20–30 minutes, then maintenance 1–2 g/hour.",administration:"For eclampsia without IV access: 10 g IM loading (5 g in each buttock), then 5 g IM every 4 hours in the supplied algorithm. Obtain expert guidance for renal dysfunction.",repeat:"Continuous maintenance; a recurrent seizure may prompt an additional magnesium bolus under the approved protocol and clinician direction.",avoid:"Altered renal function requires adjustment and serum monitoring. Confirm local thresholds and orders.",watch:"Respiratory rate, oxygenation, deep tendon reflexes, urine output and signs of toxicity.",source:"acog-ed-eclampsia"},
  {id:"calcium-gluconate",name:"Calcium gluconate",context:"Magnesium toxicity rescue",accent:"violet",dose:"10% solution, 10 mL (1 g) IV over 3 minutes in the supplied eclampsia algorithm.",administration:"Keep immediately available when respiratory depression from magnesium toxicity is a concern; support airway and stop magnesium as clinically indicated.",repeat:"No automatic repeat. Obtain urgent expert guidance.",avoid:"Use with monitoring and clinician/pharmacy confirmation.",watch:"Cardiac rhythm and response to treatment.",source:"acog-ed-eclampsia"},
  {id:"lorazepam",name:"Lorazepam",context:"Persistent/recurrent seizure",accent:"violet",dose:"4 mg IV over 3–5 minutes after magnesium loading when seizure persists or recurs, per supplied algorithm.",administration:"Prepare for airway support and possible intubation.",repeat:"No automatic repeat timer in this prototype.",avoid:"Assess respiratory compromise and cumulative sedative exposure.",watch:"Respiratory depression, hypotension and level of consciousness.",source:"acog-ed-eclampsia"},
  {id:"midazolam",name:"Midazolam",context:"Persistent seizure · no IV",accent:"violet",dose:"10 mg IM if no IV access, per supplied eclampsia algorithm.",administration:"Use when persistent/recurrent seizure follows magnesium loading and IV access is unavailable.",repeat:"No automatic repeat timer in this prototype.",avoid:"Assess respiratory compromise and cumulative sedative exposure.",watch:"Respiratory depression, hypotension and level of consciousness.",source:"acog-ed-eclampsia"}
];

const commonMilestones = [
  {min:5,label:"5-minute team check",message:"Reassess patient status, treatment response, outstanding actions and escalation plan."},
  {min:10,label:"10-minute status update",message:"State the current condition, interventions completed, response and next priorities."},
  {min:15,label:"15-minute huddle",message:"Confirm shared mental model, unresolved threats and need for higher-level resources."}
];

export const EMERGENCIES = {
  pph:{
    id:"pph",name:"Postpartum Hemorrhage",short:"Hemorrhage",icon:"◉",accent:"crimson",summary:"Control bleeding while resuscitating and identifying the cause.",source:["acog-pph-183","acog-pph-device"],milestones:commonMilestones,
    tasks:[
      {id:"pph-help",group:"DO NOW",title:"Call for help. Activate the obstetric hemorrhage response.",detail:"Bring the hemorrhage cart, designate a leader and recorder/timekeeper, notify anesthesia and obtain additional obstetric support according to local policy.",type:"once",priority:"critical"},
      {id:"pph-assess",group:"DO NOW",title:"Assess bleeding, uterine tone and maternal status.",detail:"Quantify cumulative blood loss when possible. Assess fundus, vaginal bleeding, vital signs, mental status and perfusion. Hemodynamic changes can occur late.",type:"repeat",repeatMin:5,priority:"critical",review:"The 5-minute recurrence is a prototype setting requiring local approval."},
      {id:"pph-massage",group:"DO IN PARALLEL",title:"Massage the fundus; begin bimanual compression for suspected atony.",detail:"Remove intrauterine clots as appropriate. Continue while uterotonics are prepared and administered. A firm uterus with ongoing bleeding should redirect attention toward Trauma, Tissue and Thrombin.",type:"ongoing",priority:"high"},
      {id:"pph-access",group:"DO IN PARALLEL",title:"Establish rapid access, obtain hemorrhage labs and prepare blood products.",detail:"Use local hemorrhage protocol for IV access, CBC, type and crossmatch, coagulation studies and fibrinogen. Escalate blood-product support based on patient condition and protocol.",type:"once",priority:"high"},
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
      {id:"htn-treat",group:"TREAT",title:"Give a first-line antihypertensive using one approved sequence.",detail:"Labetalol IV, hydralazine IV or immediate-release nifedipine PO are accepted first-line options. Choose based on access and contraindications; start the drug-specific BP timer only after confirming administration.",type:"med",meds:["labetalol","hydralazine","nifedipine"],priority:"critical"},
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
      {id:"ec-recur",group:"ESCALATE",title:"Persistent or recurrent seizure: continue magnesium and escalate anticonvulsant/airway management.",detail:"The supplied algorithm prefers benzodiazepine after magnesium loading, followed by additional agents and possible intubation with critical care, anesthesia, neurology or MFM consultation.",type:"med",meds:["lorazepam","midazolam"],priority:"critical"},
      {id:"ec-tox",group:"MONITOR",title:"Monitor for magnesium toxicity and keep calcium available.",detail:"Monitor respiratory status, deep tendon reflexes, urine output and serum magnesium when indicated. Stop/adjust therapy and treat impending respiratory depression according to the approved protocol.",type:"ongoing",priority:"high",meds:["calcium-gluconate"]},
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
  arrest:{
    id:"arrest",name:"Maternal Cardiac Arrest",short:"Arrest",icon:"♥",accent:"crimson",summary:"High-quality CPR with left uterine displacement; deliver within 5 minutes if no ROSC. Includes amniotic fluid embolism.",source:["aha-2025-pregnancy","smfm-afe-9"],
    milestones:[
      {min:4,label:"4 minutes — no ROSC?",message:"Fundus at or above the umbilicus and no ROSC: begin resuscitative delivery now."},
      {min:5,label:"5-minute delivery target",message:"Goal: delivery within 5 minutes of arrest if no ROSC."},
      {min:10,label:"10-minute status update",message:"State the rhythm, interventions, suspected cause and next priorities."}
    ],
    tasks:[
      {id:"arrest-help",group:"DO NOW",title:"Call the cardiac arrest team and obstetrics. Note the time of arrest.",detail:"Activate the cardiac arrest in pregnancy team per local resources: team leader, anesthesia, obstetrics, neonatology, nursing and pharmacy. Start the app clock at the time of arrest.",type:"once",priority:"critical",review:"New pathway (AHA 2025) pending clinical review."},
      {id:"arrest-cpr",group:"DO NOW",title:"High-quality CPR. Defibrillate when indicated. Rhythm check every 2 minutes.",detail:"Standard BLS/ACLS: compressions, defibrillation and drug doses are unchanged in pregnancy. Address the cause while resuscitation continues.",type:"repeat",repeatMin:2,priority:"critical"},
      {id:"arrest-lud",group:"DO NOW",title:"Continuous manual left uterine displacement.",detail:"Displace the uterus to the left continuously when the fundus is at or above the umbilicus. This relieves aortocaval compression and makes compressions more effective.",type:"ongoing",priority:"critical"},
      {id:"arrest-airway",group:"OPTIMIZE FOR PREGNANCY",title:"Early airway by the most experienced provider.",detail:"A difficult airway is common in pregnancy. Prioritize early airway management (endotracheal tube or supraglottic airway) and oxygenation.",type:"once",priority:"critical"},
      {id:"arrest-iv",group:"OPTIMIZE FOR PREGNANCY",title:"IV access above the diaphragm.",detail:"Place IV or IO access above the diaphragm so drugs and fluids are not slowed by aortocaval compression.",type:"once",priority:"high"},
      {id:"arrest-mag",group:"OPTIMIZE FOR PREGNANCY",title:"On IV magnesium? Stop it and give calcium.",detail:"If the patient is receiving IV magnesium, stop the infusion and give calcium.",type:"med",meds:["calcium-gluconate"],priority:"high"},
      {id:"arrest-monitors",group:"OPTIMIZE FOR PREGNANCY",title:"Detach fetal monitors.",detail:"Remove fetal monitors so they do not interfere with resuscitation or defibrillation.",type:"once",priority:"high"},
      {id:"arrest-delivery",group:"DELIVER",title:"Prepare resuscitative delivery now. No ROSC: deliver, target within 5 minutes.",detail:"Begin preparation when the fundal height is at or above the umbilicus. If there is no ROSC, the goal is delivery within 5 minutes, where the resuscitation is taking place. Resuscitate the newborn with the neonatal algorithm.",type:"once",priority:"critical"},
      {id:"arrest-cause",group:"FIND THE CAUSE",title:"Treat the cause: A–H.",detail:"Anesthetic complications · Bleeding · Cardiovascular · Drugs · Embolic (amniotic fluid or pulmonary) · Fever · General H’s and T’s · Hypertension (preeclampsia).",type:"once",priority:"high"},
      {id:"arrest-afe",group:"FIND THE CAUSE",title:"Suspect amniotic fluid embolism? Activate massive transfusion.",detail:"Consider AFE with sudden cardiorespiratory collapse in labor or just after delivery; it is a clinical diagnosis with no confirmatory test. Activate massive transfusion, assess coagulation early and treat bleeding aggressively, avoid excessive fluid, and use vasopressors/inotropes as indicated with a multidisciplinary team.",type:"once",priority:"critical",review:"AFE content from AHA 2025 and SMFM Clinical Guideline 9 (2016) pending review."}
    ],
    flow:[
      {title:"Arrest recognized",body:"Pregnant or recently delivered, no pulse. Call the team; note the time.",tone:"start"},
      {title:"CPR + uterine displacement",body:"High-quality CPR, defibrillation when indicated, continuous left uterine displacement.",tone:"critical"},
      {title:"Optimize for pregnancy",body:"Early airway, IV above the diaphragm, stop magnesium and give calcium, detach fetal monitors.",tone:"action"},
      {title:"ROSC by 4 minutes?",body:"If not, begin resuscitative delivery; target delivery within 5 minutes.",tone:"decision"},
      {title:"Find the cause",body:"A–H; suspected amniotic fluid embolism → massive transfusion and early coagulation management.",tone:"critical"}
    ]
  },
  trauma:{
    id:"trauma",name:"Third-Trimester Trauma / Abruption",short:"Trauma",icon:"⚠",accent:"amber",summary:"Motor vehicle crash or other trauma with vaginal bleeding late in pregnancy. Mother first, then monitor for abruption.",source:["aafp-trauma","acog-co-723"],
    milestones:[
      {min:5,label:"5-minute team check",message:"Maternal status, fetal heart rate, bleeding and the next priorities."},
      {min:15,label:"15-minute huddle",message:"Stable? Abruption signs? Delivery plan and level of care."},
      {min:240,label:"4 hours of monitoring",message:"Review contractions, bleeding, uterine tenderness and FHR before discharge or extended monitoring."}
    ],
    tasks:[
      {id:"tr-help",group:"DO NOW",title:"Call OB and the trauma team. Estimate gestational age.",detail:"Activate trauma and obstetric response, and the neonatal team at a viable gestation. A fundus at or above the umbilicus suggests at least 20 weeks.",type:"once",priority:"critical",review:"New pathway pending clinical review."},
      {id:"tr-primary",group:"DO NOW",title:"Mother first: airway, breathing, circulation.",detail:"Complete the primary survey before obstetric assessment. Maternal resuscitation is the best fetal resuscitation.",type:"once",priority:"critical"},
      {id:"tr-lud",group:"DO NOW",title:"Left uterine displacement or left tilt.",detail:"Manually displace the uterus to the left, or tilt the whole body (on a backboard) 25–30 degrees, to relieve aortocaval compression.",type:"ongoing",priority:"critical"},
      {id:"tr-iv",group:"DO IN PARALLEL",title:"Two large-bore IVs. CBC, type & crossmatch, coags, fibrinogen, Kleihauer-Betke.",detail:"Kleihauer-Betke testing is recommended for all pregnant patients with major trauma, regardless of Rh status.",type:"once",priority:"high"},
      {id:"tr-imaging",group:"DO IN PARALLEL",title:"Don’t withhold needed imaging.",detail:"Indicated maternal imaging should not be delayed or withheld because of pregnancy.",type:"once",priority:"high"},
      {id:"tr-fetal",group:"ASSESS THE PREGNANCY",title:"Continuous fetal heart rate and contraction monitoring.",detail:"At 20 weeks or more, monitor as soon as the mother is stable: a minimum of 4 hours even after minor trauma. Extend (commonly 24 hours) with frequent contractions, bleeding, uterine tenderness, abnormal FHR or serious maternal injury. Follow local protocol.",type:"ongoing",priority:"high"},
      {id:"tr-noexam",group:"ASSESS THE PREGNANCY",title:"No digital cervical exam until previa is excluded by ultrasound.",detail:"Bedside ultrasound for placental location, fetal heart rate and gestational age. Ultrasound often misses abruption: a normal scan does not exclude it.",type:"once",priority:"critical"},
      {id:"tr-abruption",group:"ASSESS THE PREGNANCY",title:"Look for abruption: pain, tender or firm uterus, contractions, abnormal FHR.",detail:"Bleeding may be concealed. Abruption can appear up to 24 hours after trauma; frequent contractions are an early warning sign.",type:"once",priority:"high"},
      {id:"tr-rh",group:"ASSESS THE PREGNANCY",title:"Rh-negative? Give Rh immune globulin.",detail:"Rh-negative patients receive Rh immune globulin unless the injury is remote from the uterus; Kleihauer-Betke helps size the dose.",type:"once",priority:"high"},
      {id:"tr-deliver",group:"DELIVER",title:"Unstable mother or abnormal fetal status at a viable gestation: expedite delivery.",detail:"Decide with OB, anesthesia and neonatology; delivery is often by cesarean. If the mother arrests, switch to the Maternal Cardiac Arrest pathway: resuscitative delivery within 5 minutes.",type:"once",priority:"critical"}
    ],
    flow:[
      {title:"Pregnant trauma + bleeding",body:"Call OB and trauma; estimate gestational age.",tone:"start"},
      {title:"Mother first",body:"Primary survey, left uterine displacement, IV access and labs, needed imaging.",tone:"critical"},
      {title:"Assess the pregnancy",body:"Fetal monitoring, ultrasound before any cervical exam, abruption signs, Rh status.",tone:"action"},
      {title:"Stable?",body:"Yes: monitor at least 4 hours. No: expedite delivery.",tone:"decision"}
    ]
  },
  shoulder:{
    id:"shoulder",name:"Shoulder Dystocia",short:"Shoulder",icon:"⟲",accent:"violet",summary:"Head delivered, shoulders impacted. Call for help, McRoberts and suprapubic pressure, then posterior arm and rotation.",source:["acog-sd-178"],
    milestones:[
      {min:1,label:"1 minute since head delivered",message:"Announce the time. No progress? Move to the next maneuver."},
      {min:2,label:"2 minutes since head delivered",message:"Announce the time. Posterior arm or rotation if not yet tried."},
      {min:3,label:"3 minutes since head delivered",message:"Announce the time. All-fours; prepare for last-resort options."},
      {min:4,label:"4 minutes since head delivered",message:"Announce the time. Senior help, OR and anesthesia ready."},
      {min:5,label:"5 minutes since head delivered",message:"Announce the time. Consider last-resort maneuvers."}
    ],
    tasks:[
      {id:"sd-help",group:"DO NOW",title:"Say “shoulder dystocia.” Call OB, anesthesia and the neonatal team.",detail:"Announce the emergency, call additional obstetric help, anesthesia and a neonatal resuscitation team. Start the app clock when the head delivers; a recorder announces elapsed time.",type:"once",priority:"critical",review:"New pathway (ACOG PB 178) pending clinical review."},
      {id:"sd-avoid",group:"DO NOW",title:"Stop pushing. No fundal pressure. Gentle axial traction only.",detail:"Avoid fundal pressure (uterine rupture risk) and excessive lateral or downward traction on the head (brachial plexus injury).",type:"ongoing",priority:"critical"},
      {id:"sd-mcroberts",group:"FIRST LINE",title:"McRoberts: hyperflex the thighs onto the abdomen.",detail:"Two assistants flex the maternal thighs onto the abdomen, flattening the sacrum and rotating the symphysis. Often resolves the dystocia, especially with suprapubic pressure.",type:"once",priority:"critical"},
      {id:"sd-suprapubic",group:"FIRST LINE",title:"Suprapubic pressure — never fundal.",detail:"Pressure just above the pubic bone from the side of the fetal back, pushing the anterior shoulder down and toward the fetal face. Steady, then rocking.",type:"once",priority:"critical"},
      {id:"sd-posterior",group:"NEXT MANEUVERS",title:"Deliver the posterior arm.",detail:"Follow the posterior arm to the elbow, flex it and sweep the forearm across the chest and out. Hold the wrist or forearm, not the upper arm.",type:"once",priority:"high"},
      {id:"sd-rotate",group:"NEXT MANEUVERS",title:"Internal rotation: Rubin II, Woods screw, reverse Woods.",detail:"Rubin II: pressure on the back of the anterior shoulder toward the chest. Woods screw: pressure on the front of the posterior shoulder. Rotate the shoulders into an oblique diameter.",type:"once",priority:"high"},
      {id:"sd-allfours",group:"NEXT MANEUVERS",title:"All-fours (Gaskin) position.",detail:"Roll the patient to hands and knees and try gentle downward traction to deliver the posterior shoulder. Maneuvers can be repeated in this position.",type:"once",priority:"high"},
      {id:"sd-episiotomy",group:"NEXT MANEUVERS",title:"Consider episiotomy for room to work.",detail:"Episiotomy does not relieve the bony obstruction; it only gives space for internal maneuvers.",type:"once",priority:"high"},
      {id:"sd-lastresort",group:"LAST RESORT",title:"Last resort: clavicle fracture, Zavanelli with cesarean, symphysiotomy.",detail:"When other maneuvers fail. Requires the most experienced clinicians; get the operating room and anesthesia ready early.",type:"once",priority:"critical"},
      {id:"sd-after",group:"AFTER DELIVERY",title:"Neonatal team, watch for PPH, document.",detail:"Neonatal resuscitation and arm/clavicle exam. Anticipate postpartum hemorrhage and perineal injury. Document the head-to-body interval, maneuvers in order, who did what, and which shoulder was anterior.",type:"once",priority:"high"}
    ],
    flow:[
      {title:"Head delivered, shoulders stuck",body:"Call for help, note the time, stop pushing, no fundal pressure.",tone:"start"},
      {title:"McRoberts + suprapubic pressure",body:"First-line, together.",tone:"critical"},
      {title:"Delivered?",body:"If not: posterior arm, internal rotation, all-fours; consider episiotomy for room.",tone:"decision"},
      {title:"Last resort",body:"Clavicle fracture, Zavanelli with cesarean, symphysiotomy.",tone:"critical"},
      {title:"After delivery",body:"Neonatal team, PPH watch, documentation.",tone:"action"}
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
    {h:"Choose one first-line pathway",p:"Labetalol IV, hydralazine IV and immediate-release nifedipine PO are accepted choices. Access, asthma, bradycardia, cardiac disease and oral tolerance affect selection."},
    {h:"Reassess by agent",bullets:["Labetalol pathway: reassess BP in 10 minutes.","Hydralazine pathway: reassess BP in 20 minutes.","Nifedipine pathway: reassess BP in 20 minutes.","Never infer that a repeat dose was given merely because time elapsed."]},
    {h:"Look beyond the number",p:"Assess neurologic symptoms, pulmonary edema, RUQ/epigastric pain, platelets, liver enzymes and creatinine. Severe headache with hypertension should raise concern for stroke."}
  ]},
  {id:"mag-safety",title:"Magnesium sulfate safety",kicker:"SEIZURE PREVENTION",accent:"violet",summary:"Magnesium is first-line for eclampsia and severe-feature seizure prophylaxis, with close respiratory and renal monitoring.",sections:[
    {h:"Standard supplied pathway",p:"4–6 g IV over 20–30 minutes followed by 1–2 g/hour. Renal dysfunction requires dose adjustment and serum monitoring with expert guidance."},
    {h:"Clinical toxicity monitoring",bullets:["Respiratory rate and oxygenation","Deep tendon reflexes","Urine output and renal function","Mental status and neuromuscular findings","Serum magnesium when indicated"]},
    {h:"Toxicity response",p:"Stop or adjust magnesium as clinically indicated, support airway/ventilation and use the locally approved calcium rescue pathway. The supplied algorithm lists calcium gluconate 1 g IV over 3 minutes."},
    {h:"Recurrent seizure",p:"Continue magnesium and use the approved refractory-seizure pathway. Persistent seizure requires airway preparation, alternate-diagnosis assessment and urgent multidisciplinary support."}
  ]},
  {id:"pregnancy-status",title:"Ask about current or recent pregnancy",kicker:"ED SCREENING",accent:"teal",summary:"Pregnancy-related emergencies can present after delivery and outside labor and delivery.",sections:[
    {h:"Hypertension / eclampsia screen",p:"Ask whether the patient is pregnant or has been pregnant within the last 6 weeks when evaluating hypertension, seizure, headache, visual symptoms, RUQ pain or dyspnea."},
    {h:"Cardiovascular screen",p:"Ask whether the patient is pregnant or has been pregnant in the last 12 months when assessing cardiovascular symptoms."},
    {h:"Cardiovascular red flags",bullets:["Shortness of breath or chest pain at rest","Severe orthopnea or near-syncope with palpitations","Resting HR ≥120 or RR ≥25","Oxygen saturation ≤94%","Resting systolic BP ≥160 or <90","New pathologic murmur, S3/S4, crackles or distended neck veins"]},
    {h:"Initial work-up",p:"The supplied ACOG educational algorithm highlights ECG, BNP, chest X-ray and troponin, followed by echocardiography and obstetric/cardiology consultation when abnormal or clinically indicated."}
  ]},
  {id:"shoulder-dystocia",title:"Shoulder dystocia maneuvers",kicker:"EVERY SECOND COUNTS",accent:"teal",summary:"First-line maneuvers, what comes next, and what never to do.",sections:[]},
  {id:"t3-bleeding",title:"Third-trimester bleeding and trauma",kicker:"ABRUPTION · PREVIA · TRAUMA",accent:"crimson",summary:"Causes, first steps, and what non-OB teams miss after trauma.",sections:[]},
  {id:"arrest-pregnancy",title:"Cardiac arrest in pregnancy",kicker:"INCLUDES AMNIOTIC FLUID EMBOLISM",accent:"navy",summary:"What changes in pregnancy, the 4–5 minute clock, and causes A–H.",sections:[]},
  {id:"simulation",title:"Using Simulation mode",kicker:"DUAL-PURPOSE TRAINING",accent:"teal",summary:"Simulation uses the same actions and timers while allowing the facilitator to control time.",sections:[
    {h:"What time controls do",p:"Pause, +1 minute, +5 minutes and Next event change the simulation clock and trigger reminders that become due."},
    {h:"What time controls never do",p:"They never administer a medication, complete a task, improve the patient or advance a clinical branch automatically."},
    {h:"Suggested exercise",bullets:["Start the assist and conduct a brief.","Assign tasks verbally and use Start/Done in the app.","Advance to the next reminder.","Require a call-out and check-back for medication.","Introduce deterioration and ask for a huddle.","End with a short debrief using the event timeline."]}
  ]}
];

export function getReference(id){ return REFERENCES.find(r=>r.id===id); }
export function getMedication(id){ return MEDICATIONS.find(m=>m.id===id); }
