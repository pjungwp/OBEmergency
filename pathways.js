// Structured clinical pathways — one source for the Overview, Guided and Full chart views.
// Wording is taken from the existing reviewed content in data.js (flow, task detail,
// medication cards). Anything restructured or added is marked reviewStatus:"draft"
// with a reviewNote, and listed in CLINICAL-REVIEW.md.
//
// Node fields
//   id, title, type (start|action|decision|parallel|escalation|endpoint), urgency (routine|urgent|critical)
//   summary      short line shown on the chart
//   bullets      very short phrases for the Overview boxes (optional)
//   items        checklist lines for Guided: {text, task?, med?, pathway?}
//                  task → linked to the Emergency Assist task (shared state)
//                  med  → opens the medication card (never a checkbox)
//   details      expandable explanation (tap a node)
//   connections  [{to, label}]  decision branches always carry a label
//   medicationRefs, sourceRefs, reviewStatus ("from-content" | "draft"), reviewNote
//
// chart.rows: deterministic layout. Each row is a list of node ids, or {group,label,nodes}
//   for actions that happen at the same time (drawn side by side in one box, never as a sequence).
// steps: the Guided sequence. A step lists node ids; `decision` names its decision node.

export const PATHWAYS = {
  pph:{
    id:"pph",
    title:"PPH – Postpartum Hemorrhage",
    sourceRefs:["acog-pph-183","acog-pph-device"],
    nodes:{
      recognize:{title:"PPH recognized",type:"start",urgency:"critical",
        summary:"≥1,000 mL cumulative, or bleeding with hypovolemia signs",
        details:"Ongoing abnormal postpartum bleeding or blood loss with hypovolemia signs. Do not wait for hypotension.",
        connections:[{to:"g-immediate"}],sourceRefs:["acog-pph-183"],reviewStatus:"draft",reviewNote:"Adds the ≥1,000 mL cumulative threshold from ACOG PB 183 to the existing recognition text."},
      help:{title:"Call for help",type:"action",urgency:"critical",summary:"Activate hemorrhage response",
        bullets:["Hemorrhage team","Leader + recorder","Anesthesia"],
        items:[{text:"Call for help · activate hemorrhage response",task:"pph-help"}],
        details:"Bring the hemorrhage cart, designate a leader and recorder/timekeeper, notify anesthesia and obtain additional obstetric support according to local policy.",reviewStatus:"from-content"},
      resus:{title:"Resuscitate",type:"action",urgency:"critical",summary:"Access, labs, blood products",
        bullets:["IV access","CBC, type & cross, coags, fibrinogen","Blood products"],
        items:[{text:"IV access + labs: CBC, type & crossmatch, coags, fibrinogen",task:"pph-access"}],
        details:"Use local hemorrhage protocol for IV access, CBC, type and crossmatch, coagulation studies and fibrinogen. Escalate blood-product support based on patient condition and protocol. Warming and monitoring proceed in parallel.",reviewStatus:"from-content"},
      assess:{title:"Assess",type:"action",urgency:"critical",summary:"Blood loss, uterine tone, vitals",
        bullets:["Quantified blood loss","Uterine tone","Vitals, mental status"],
        items:[{text:"Quantify blood loss · check fundus, vitals, mental status",task:"pph-assess"}],
        details:"Quantify cumulative blood loss when possible. Assess fundus, vaginal bleeding, vital signs, mental status and perfusion. Hemodynamic changes can occur late.",reviewStatus:"from-content"},
      uterotonics:{title:"Uterotonics + medical treatment",type:"action",urgency:"critical",
        summary:"Oxytocin first → added agents if needed · consider TXA",
        bullets:["Massage / bimanual","Oxytocin → added agents","Consider TXA"],
        items:[
          {text:"Fundal massage · bimanual compression for atony",task:"pph-massage"},
          {text:"Oxytocin first-line, then additional uterotonics if needed",task:"pph-oxytocin"},
          {text:"Methylergonovine — avoid with hypertension / preeclampsia",med:"methylergonovine"},
          {text:"Carboprost — avoid with asthma",med:"carboprost"},
          {text:"Misoprostol",med:"misoprostol"},
          {text:"Consider TXA 1 g IV within 3 h of birth",task:"pph-txa"}],
        details:"Oxytocin is first-line for uterine atony. Select additional agents only after checking hypertension/preeclampsia, asthma and cardiac/hepatic/pulmonary contraindications. Consider early TXA for ongoing immediate postpartum hemorrhage; do not wait for a milestone.",
        connections:[{to:"g-4ts"}],
        medicationRefs:["oxytocin","methylergonovine","carboprost","misoprostol","txa"],sourceRefs:["acog-pph-183"],reviewStatus:"from-content"},
      fourts:{title:"Identify & treat cause (4 Ts)",type:"parallel",urgency:"urgent",summary:"Multiple causes may coexist",
        items:[{text:"Assess Tone · Trauma · Tissue · Thrombin",task:"pph-cause"}],
        details:"More than one cause can coexist. Examine the uterus and genital tract, assess placental completeness/retained tissue and evaluate coagulation status. A firm uterus with ongoing bleeding should redirect attention toward Trauma, Tissue and Thrombin.",reviewStatus:"from-content"},
      tone:{title:"Tone",type:"action",urgency:"urgent",summary:"Atony → massage + uterotonics",reviewStatus:"from-content"},
      trauma:{title:"Trauma",type:"action",urgency:"urgent",summary:"Laceration / injury → identify + repair",reviewStatus:"from-content"},
      tissue:{title:"Tissue",type:"action",urgency:"urgent",summary:"Retained tissue → evaluate + remove",reviewStatus:"from-content"},
      thrombin:{title:"Thrombin",type:"action",urgency:"urgent",summary:"Coagulopathy → correct (labs, blood)",reviewStatus:"from-content"},
      reassess:{title:"Bleeding controlled?",type:"decision",urgency:"critical",
        summary:"Reassess response continuously",
        details:"Reassess response continuously. Consider TXA early when indicated; do not wait for a milestone.",
        connections:[{to:"controlled",label:"Yes"},{to:"escalate",label:"No"}],reviewStatus:"from-content"},
      controlled:{title:"Controlled",type:"endpoint",urgency:"routine",summary:"Continue therapy + monitoring",
        bullets:["Continue therapy","Keep reassessing bleeding, tone, vitals"],
        items:[{text:"Keep reassessing bleeding, tone and vitals"}],
        details:"Continue indicated therapy and repeated assessment; hemodynamic changes can occur late.",reviewStatus:"draft",reviewNote:"Endpoint wording is implied by the existing ‘Ongoing bleeding?’ step, not stated in it."},
      escalate:{title:"Persistent → escalate",type:"escalation",urgency:"critical",
        summary:"MTP · device · OR / IR · transfer",
        bullets:["Massive transfusion","Balloon / vacuum device","OR, IR or hysterectomy"],
        items:[
          {text:"Activate massive transfusion as indicated",task:"pph-escalate"},
          {text:"Balloon or vacuum hemorrhage-control device — must not delay definitive care"},
          {text:"Operating room, interventional radiology or hysterectomy based on cause and response"},
          {text:"Transfer when local resources require"}],
        details:"Activate massive transfusion as indicated. Prepare nonsurgical hemorrhage-control device, operating room, interventional radiology or hysterectomy based on cause, response, resources and patient status. Device use must not delay definitive care or transfer.",
        sourceRefs:["acog-pph-183","acog-pph-device"],reviewStatus:"from-content"}
    },
    chart:{rows:[
      ["recognize"],
      [{group:"g-immediate",label:"Immediate actions — at the same time",nodes:["help","resus","assess"],connections:[{to:"uterotonics"}]}],
      ["uterotonics"],
      [{group:"g-4ts",label:"Identify & treat cause (4 Ts)",head:"fourts",nodes:["tone","trauma","tissue","thrombin"],connections:[{to:"reassess"}]}],
      ["reassess"],
      ["controlled","escalate"]
    ]},
    steps:[
      {title:"Initial response",nodes:["recognize","help","resus","assess"],parallel:true},
      {title:"Uterine & medical treatment",nodes:["uterotonics"]},
      {title:"Identify & treat the 4 Ts",nodes:["fourts","tone","trauma","tissue","thrombin"]},
      {title:"Reassess response",nodes:["reassess"],decision:"reassess"},
      {title:"Escalate if persistent",nodes:["escalate"],escalation:true}
    ]
  },

  htn:{
    id:"htn",
    title:"Acute Severe Hypertension",
    sourceRefs:["acog-htn","acog-ed-htn"],
    nodes:{
      identify:{title:"Severe BP identified",type:"start",urgency:"critical",
        summary:"SBP ≥160 or DBP ≥110 · ≥20 wk or ≤6 wk postpartum",
        items:[{text:"Notify OB · activate severe-BP response",task:"htn-help"}],
        details:"≥20 weeks pregnant or ≤6 weeks postpartum with SBP ≥160 or DBP ≥110. Acute-onset persistent severe BP is an obstetric emergency during pregnancy and postpartum.",
        connections:[{to:"confirm"}],reviewStatus:"from-content"},
      confirm:{title:"Persistent on repeat?",type:"decision",urgency:"critical",
        summary:"Repeat correctly within 15 min",
        items:[{text:"Repeat BP with correct technique within 15 minutes",task:"htn-bp"}],
        details:"Repeat correctly within 15 minutes while assessing symptoms and preparing medication. Treatment should be given promptly once persistence is established; do not wait four hours.",
        connections:[{to:"g-treat",label:"Yes"},{to:"notpersist",label:"No"}],reviewStatus:"from-content"},
      notpersist:{title:"Not persistent",type:"endpoint",urgency:"routine",summary:"Continue close BP monitoring",
        items:[{text:"Continue close BP monitoring per local policy"}],
        details:"Continue close monitoring and reassess. Confirm the local monitoring schedule.",reviewStatus:"draft",reviewNote:"‘Not persistent’ branch is not stated in the existing content; confirm against the ACOG ED algorithm."},
      treat:{title:"Treat promptly",type:"action",urgency:"critical",summary:"Labetalol IV · hydralazine IV · nifedipine IR PO",
        bullets:["One first-line agent","Record actual time"],
        items:[{text:"Give one first-line antihypertensive · record the time",task:"htn-treat"},
          {text:"Labetalol IV",med:"labetalol"},{text:"Hydralazine IV",med:"hydralazine"},{text:"Nifedipine immediate release PO",med:"nifedipine"}],
        details:"Labetalol IV, hydralazine IV or immediate-release nifedipine PO are accepted first-line options. Choose based on access and contraindications; start the drug-specific BP timer only after confirming administration.",
        medicationRefs:["labetalol","hydralazine","nifedipine"],reviewStatus:"from-content"},
      symptoms:{title:"Severe features",type:"action",urgency:"urgent",summary:"Headache, vision, RUQ pain, dyspnea, neuro",
        items:[{text:"Assess headache, vision, RUQ/epigastric pain, dyspnea, neuro",task:"htn-symptoms"}],
        details:"Severe headache with hypertension raises concern for stroke. Evaluate oliguria and other severe features; perform focused neurologic assessment.",reviewStatus:"from-content"},
      labs:{title:"Labs",type:"action",urgency:"urgent",summary:"CBC, platelets, AST/ALT, creatinine, urine protein",
        items:[{text:"CBC, platelets, AST/ALT, creatinine, urine protein",task:"htn-labs"}],
        details:"Laboratory severe features include platelets <100 × 10⁹/L, transaminases to twice normal, or creatinine >1.1 mg/dL or doubling without other renal disease.",reviewStatus:"from-content"},
      mag:{title:"Magnesium",type:"action",urgency:"urgent",summary:"When indicated for severe features",
        items:[{text:"Start magnesium sulfate when indicated",task:"htn-mag"},{text:"Magnesium sulfate",med:"magnesium"}],
        details:"Antihypertensive treatment and magnesium should proceed simultaneously when possible; antihypertensive treatment takes priority if they cannot be concurrent.",
        medicationRefs:["magnesium"],reviewStatus:"from-content"},
      reassess:{title:"Still severe after the dose?",type:"decision",urgency:"critical",
        summary:"Labetalol 10 min · hydralazine 20 · nifedipine 20",
        items:[{text:"Recheck BP after every dose",task:"htn-monitor"}],
        details:"Reassess by agent: labetalol 10 min, hydralazine 20 min, nifedipine 20 min. Repeat only if still severe and within the approved sequence.",
        connections:[{to:"nextdose",label:"Yes"},{to:"target",label:"No"}],reviewStatus:"from-content"},
      nextdose:{title:"Next dose in sequence",type:"action",urgency:"critical",summary:"Then reassess ↺ · sequence done → escalate",
        items:[{text:"Give the next step of the approved sequence, then reassess"}],
        details:"Repeat only if still severe and within the approved sequence. Each confirmed dose starts its own reassessment timer. Escalate after failure of the initial sequence.",
        connections:[{to:"escalate",label:"Sequence complete or deteriorating"}],reviewStatus:"from-content"},
      target:{title:"Below severe range",type:"endpoint",urgency:"routine",summary:"Target 130–150 / 80–100 · staged monitoring",
        items:[{text:"Monitor to target per the staged schedule"}],
        details:"The supplied ED algorithm targets 130–150/80–100 mm Hg, then uses a staged monitoring schedule. Confirm target and schedule with local policy.",reviewStatus:"from-content"},
      escalate:{title:"Escalate + plan delivery",type:"escalation",urgency:"critical",summary:"Expert support · disposition / delivery",
        items:[{text:"Obtain emergent higher-level consultation",task:"htn-escalate"}],
        details:"Persistent severe BP, stroke concern, HELLP, pulmonary edema or deterioration requires urgent expert support and disposition/delivery planning.",reviewStatus:"from-content"}
    },
    chart:{rows:[
      ["identify"],
      ["confirm","notpersist"],
      [{group:"g-treat",label:"Treat and assess — at the same time",nodes:["treat","symptoms","labs","mag"],connections:[{to:"reassess"}]}],
      ["reassess"],
      ["nextdose","target"],
      ["escalate"]
    ]},
    steps:[
      {title:"Confirm severe BP",nodes:["identify","confirm"],decision:"confirm"},
      {title:"Treat and assess",nodes:["treat","symptoms","labs","mag"],parallel:true},
      {title:"Reassess after each dose",nodes:["reassess"],decision:"reassess"},
      {title:"Escalate + plan delivery",nodes:["escalate"],escalation:true}
    ]
  },

  eclampsia:{
    id:"eclampsia",
    title:"Eclampsia / Obstetric Seizure",
    sourceRefs:["acog-htn","acog-ed-eclampsia"],
    nodes:{
      start:{title:"Presumed eclamptic seizure",type:"start",urgency:"critical",
        summary:"Pregnant or recently postpartum",
        items:[{text:"Call for help · OB, anesthesia, emergency support",task:"ec-help"}],
        details:"Known/suspected pregnancy or recent postpartum state. Call for help and begin usual seizure care. Designate a leader and recorder/timekeeper; prepare airway equipment.",
        connections:[{to:"g-stabilize"}],reviewStatus:"from-content"},
      safety:{title:"Protect + support",type:"action",urgency:"critical",summary:"Prevent injury · left lateral · airway",
        items:[{text:"Protect from injury · left lateral · support airway",task:"ec-safety"}],
        details:"Prevent injury and aspiration; left lateral when feasible; support airway/breathing and monitor oxygenation. Do not forcibly restrain.",reviewStatus:"from-content"},
      mag:{title:"Magnesium sulfate",type:"action",urgency:"critical",summary:"4–6 g IV over 20–30 min → 1–2 g/h",
        items:[{text:"Magnesium loading dose, then maintenance",task:"ec-mag"},{text:"Magnesium sulfate (incl. IM pathway)",med:"magnesium"}],
        details:"4–6 g IV over 20–30 min → maintenance 1–2 g/h. Use the approved IM pathway when IV cannot be established; obtain expert guidance for renal dysfunction.",
        medicationRefs:["magnesium"],reviewStatus:"from-content"},
      vitals:{title:"Assess",type:"action",urgency:"urgent",summary:"BP, oxygenation, neuro, fetal status",
        items:[{text:"BP, oxygenation, respirations, neuro, fetal status",task:"ec-vitals"},{text:"SBP ≥160 or DBP ≥110 → severe BP pathway",pathway:"htn"}],
        details:"If SBP ≥160 or DBP ≥110, initiate the acute severe-hypertension pathway. Maternal stabilization comes first during fetal bradycardia associated with seizure.",reviewStatus:"from-content"},
      recur:{title:"Persistent or recurrent seizure?",type:"decision",urgency:"critical",summary:"Continue magnesium either way",
        details:"Continue magnesium; use the approved benzodiazepine/second-line pathway for persistent or recurrent seizure.",
        connections:[{to:"second",label:"Yes"},{to:"after",label:"No"}],reviewStatus:"from-content"},
      second:{title:"Second-line + airway",type:"escalation",urgency:"critical",summary:"Benzodiazepine · prepare intubation · consult",
        items:[{text:"Approved benzodiazepine / second-line pathway",task:"ec-recur"},{text:"Lorazepam IV",med:"lorazepam"},{text:"Midazolam IM (no IV)",med:"midazolam"}],
        details:"The supplied algorithm prefers benzodiazepine after magnesium loading, followed by additional agents and possible intubation with critical care, anesthesia, neurology or MFM consultation.",
        connections:[{to:"after",label:"Once controlled"}],medicationRefs:["lorazepam","midazolam"],reviewStatus:"from-content"},
      after:{title:"After the seizure",type:"action",urgency:"urgent",summary:"Severe BP, neuro deficits, consider head CT",
        items:[{text:"Focused neuro exam · consider head imaging",task:"ec-neuro"}],
        details:"Assess severe BP, neurologic deficits, oxygenation and fetal status; consider head CT and alternate diagnoses for focal deficits, atypical presentation, persistent altered mental status or seizure refractory to magnesium.",
        connections:[{to:"g-ongoing"}],reviewStatus:"from-content"},
      tox:{title:"Magnesium toxicity watch",type:"action",urgency:"urgent",summary:"Respirations, reflexes, urine · calcium ready",
        items:[{text:"Monitor for toxicity · keep calcium available",task:"ec-tox"},{text:"Calcium gluconate",med:"calcium-gluconate"}],
        details:"Monitor respiratory status, deep tendon reflexes, urine output and serum magnesium when indicated. Stop/adjust therapy and treat impending respiratory depression according to the approved protocol.",
        medicationRefs:["magnesium","calcium-gluconate"],reviewStatus:"from-content"},
      delivery:{title:"Plan delivery",type:"endpoint",urgency:"urgent",summary:"After stabilization · route by obstetric factors",
        items:[{text:"Prepare for delivery after stabilization",task:"ec-delivery"}],
        details:"Eclampsia is not itself an automatic indication for cesarean birth. Stabilize first; timing and route depend on maternal, fetal and obstetric factors.",reviewStatus:"from-content"}
    },
    chart:{rows:[
      ["start"],
      [{group:"g-stabilize",label:"Stabilize and treat — at the same time",nodes:["safety","mag","vitals"],connections:[{to:"recur"}]}],
      ["recur"],
      ["second","after"],
      [{group:"g-ongoing",label:"Ongoing care",nodes:["tox","delivery"]}]
    ]},
    steps:[
      {title:"Stabilize + magnesium",nodes:["start","safety","mag","vitals"],parallel:true},
      {title:"Persistent or recurrent?",nodes:["recur"],decision:"recur"},
      {title:"Second-line + airway",nodes:["second"],escalation:true},
      {title:"After the seizure",nodes:["after"]},
      {title:"Ongoing care",nodes:["tox","delivery"]}
    ]
  },

  arrest:{
    id:"arrest",
    title:"Maternal Cardiac Arrest",
    sourceRefs:["aha-2025-pregnancy","smfm-afe-9"],
    nodes:{
      recognize:{title:"Cardiac arrest in pregnancy",type:"start",urgency:"critical",summary:"No pulse · call the team · note the time",
        items:[{text:"Call the arrest team + OB · note the time",task:"arrest-help"}],
        details:"Activate the cardiac arrest in pregnancy team per local resources: leader, anesthesia, obstetrics, neonatology, nursing, pharmacy.",
        connections:[{to:"g-start"}],sourceRefs:["aha-2025-pregnancy"],reviewStatus:"draft",reviewNote:"New pathway from the 2025 AHA cardiac arrest in pregnancy algorithm; pending clinical review."},
      cpr:{title:"High-quality CPR",type:"action",urgency:"critical",summary:"Defibrillate when indicated · rhythm check every 2 min",
        items:[{text:"CPR · defibrillate when indicated · check every 2 min",task:"arrest-cpr"}],
        details:"Standard BLS/ACLS: compressions, defibrillation and drug doses are unchanged in pregnancy.",reviewStatus:"draft",reviewNote:"AHA 2025; pending clinical review."},
      lud:{title:"Left uterine displacement",type:"action",urgency:"critical",summary:"Continuous, manual · fundus at or above umbilicus",
        items:[{text:"Continuous manual left uterine displacement",task:"arrest-lud"}],
        details:"Relieves aortocaval compression and makes compressions more effective.",reviewStatus:"draft",reviewNote:"AHA 2025; pending clinical review."},
      airway:{title:"Early airway",type:"action",urgency:"critical",summary:"Most experienced provider",
        items:[{text:"Early airway by the most experienced provider",task:"arrest-airway"}],
        details:"A difficult airway is common in pregnancy. Endotracheal tube or supraglottic airway; oxygenate.",reviewStatus:"draft",reviewNote:"AHA 2025; pending clinical review."},
      iv:{title:"IV above the diaphragm",type:"action",urgency:"urgent",summary:"Arms or neck",
        items:[{text:"IV or IO access above the diaphragm",task:"arrest-iv"}],details:"Access above the diaphragm avoids delay from aortocaval compression.",reviewStatus:"draft",reviewNote:"AHA 2025; pending clinical review."},
      mag:{title:"On magnesium?",type:"action",urgency:"urgent",summary:"Stop it · give calcium",
        items:[{text:"Stop IV magnesium and give calcium",task:"arrest-mag"},{text:"Calcium gluconate",med:"calcium-gluconate"}],
        details:"If the patient is receiving IV magnesium, stop it and give calcium.",medicationRefs:["calcium-gluconate"],reviewStatus:"draft",reviewNote:"AHA 2025; pending clinical review."},
      monitors:{title:"Detach fetal monitors",type:"action",urgency:"urgent",summary:"Before defibrillation",
        items:[{text:"Detach fetal monitors",task:"arrest-monitors"}],details:"Remove fetal monitors so they do not interfere with resuscitation.",reviewStatus:"draft",reviewNote:"AHA 2025; pending clinical review."},
      rosc:{title:"ROSC within 4 minutes?",type:"decision",urgency:"critical",summary:"Prepare for delivery from minute one",
        details:"Begin preparing for resuscitative delivery as soon as the arrest is called when the fundus is at or above the umbilicus.",
        connections:[{to:"post",label:"Yes"},{to:"deliver",label:"No"}],reviewStatus:"draft",reviewNote:"4-minute decision point from AHA guidance; pending clinical review."},
      deliver:{title:"Resuscitative delivery",type:"escalation",urgency:"critical",summary:"Target: delivered within 5 minutes",
        items:[{text:"Resuscitative delivery where you are · target 5 min",task:"arrest-delivery"},{text:"Newborn: neonatal resuscitation algorithm"}],
        details:"If there is no ROSC, the goal is delivery within 5 minutes, at the site of the resuscitation. Continue ALS throughout.",
        connections:[{to:"cause",label:"Continue ALS"}],reviewStatus:"draft",reviewNote:"AHA 2025; pending clinical review."},
      post:{title:"ROSC",type:"endpoint",urgency:"urgent",summary:"Post-arrest care · keep looking for the cause",
        items:[{text:"Post-arrest care with the full team"}],details:"Continue to identify and treat the cause.",
        connections:[{to:"cause",label:"Find the cause"}],reviewStatus:"draft",reviewNote:"Endpoint wording pending clinical review."},
      cause:{title:"Treat the cause: A–H",type:"action",urgency:"urgent",summary:"Anesthetic · Bleeding · Cardiac · Drugs · Embolic · Fever · H’s/T’s · Hypertension",
        items:[{text:"Treat the cause (A–H)",task:"arrest-cause"}],
        details:"Anesthetic complications · Bleeding · Cardiovascular · Drugs · Embolic (amniotic fluid or pulmonary) · Fever · General H’s and T’s · Hypertension (preeclampsia).",reviewStatus:"draft",reviewNote:"AHA 2025 etiologies; pending clinical review."},
      afe:{title:"Amniotic fluid embolism?",type:"escalation",urgency:"critical",summary:"Massive transfusion · early coagulation · avoid fluid overload",
        items:[{text:"Suspected AFE: activate massive transfusion",task:"arrest-afe"}],
        details:"Sudden cardiorespiratory collapse in labor or just after delivery. Clinical diagnosis; no confirmatory test. Activate massive transfusion, assess coagulation early, avoid excessive fluid, vasopressors/inotropes as indicated, multidisciplinary team.",
        sourceRefs:["aha-2025-pregnancy","smfm-afe-9"],reviewStatus:"draft",reviewNote:"AHA 2025 and SMFM Clinical Guideline 9 (2016); pending clinical review."}
    },
    chart:{rows:[
      ["recognize"],
      [{group:"g-start",label:"Start now — at the same time",nodes:["cpr","lud"],connections:[{to:"g-opt"}]}],
      [{group:"g-opt",label:"Optimize for pregnancy — at the same time",nodes:["airway","iv","mag","monitors"],connections:[{to:"rosc"}]}],
      ["rosc"],
      ["post","deliver"],
      [{group:"g-cause",label:"Find the cause",nodes:["cause","afe"]}]
    ]},
    steps:[
      {title:"Start resuscitation",nodes:["recognize","cpr","lud"],parallel:true},
      {title:"Optimize for pregnancy",nodes:["airway","iv","mag","monitors"],parallel:true},
      {title:"ROSC within 4 minutes?",nodes:["rosc"],decision:"rosc"},
      {title:"Resuscitative delivery",nodes:["deliver"],escalation:true},
      {title:"Find the cause",nodes:["cause","afe"]}
    ]
  },

  trauma:{
    id:"trauma",
    title:"Third-Trimester Trauma / Abruption",
    sourceRefs:["aafp-trauma","acog-co-723"],
    nodes:{
      start:{title:"Pregnant trauma + vaginal bleeding",type:"start",urgency:"critical",summary:"Call OB + trauma · fundus at umbilicus ≈ 20 weeks",
        items:[{text:"Call OB + trauma team · estimate gestational age",task:"tr-help"}],
        details:"Activate trauma and obstetric response, and the neonatal team at a viable gestation.",
        connections:[{to:"g-mother"}],reviewStatus:"draft",reviewNote:"New pathway pending clinical review."},
      primary:{title:"Primary survey",type:"action",urgency:"critical",summary:"Airway · breathing · circulation",
        items:[{text:"Primary survey: airway, breathing, circulation",task:"tr-primary"}],details:"Maternal resuscitation is the best fetal resuscitation.",reviewStatus:"draft",reviewNote:"Pending clinical review."},
      lud:{title:"Uterine displacement",type:"action",urgency:"critical",summary:"Manual left, or tilt 25–30°",
        items:[{text:"Left uterine displacement or left tilt",task:"tr-lud"}],details:"Relieves aortocaval compression.",sourceRefs:["aafp-trauma"],reviewStatus:"draft",reviewNote:"AFP 2014; pending clinical review."},
      iv:{title:"Access + labs",type:"action",urgency:"urgent",summary:"2 large-bore IVs · type & cross · coags · KB",
        items:[{text:"2 large-bore IVs · CBC, type & cross, coags, fibrinogen, KB",task:"tr-iv"}],
        details:"Kleihauer-Betke for all pregnant patients with major trauma, regardless of Rh status.",sourceRefs:["aafp-trauma"],reviewStatus:"draft",reviewNote:"AFP 2014; pending clinical review."},
      imaging:{title:"Imaging",type:"action",urgency:"urgent",summary:"Never withheld because of pregnancy",
        items:[{text:"Don’t withhold needed imaging",task:"tr-imaging"}],details:"Indicated maternal imaging should not be delayed or withheld because of pregnancy.",sourceRefs:["acog-co-723"],reviewStatus:"draft",reviewNote:"ACOG CO 723; pending clinical review."},
      fetal:{title:"Fetal monitoring",type:"action",urgency:"urgent",summary:"Continuous FHR + contractions",
        items:[{text:"Continuous fetal heart rate + contraction monitoring",task:"tr-fetal"}],
        details:"At 20 weeks or more, once the mother is stable: minimum 4 hours even after minor trauma; longer (commonly 24 h) with risk signs. Follow local protocol.",sourceRefs:["aafp-trauma"],reviewStatus:"draft",reviewNote:"Monitoring durations from AFP 2014; local protocol governs."},
      us:{title:"Ultrasound first",type:"action",urgency:"critical",summary:"No digital exam until previa excluded",
        items:[{text:"No cervical exam until previa is excluded",task:"tr-noexam"}],
        details:"Placental location, fetal heart rate, gestational age. A normal ultrasound does not exclude abruption.",reviewStatus:"draft",reviewNote:"Pending clinical review."},
      abruption:{title:"Abruption signs",type:"action",urgency:"urgent",summary:"Pain · firm or tender uterus · contractions · abnormal FHR",
        items:[{text:"Look for abruption signs",task:"tr-abruption"}],details:"Bleeding may be concealed; abruption can appear up to 24 hours after trauma.",sourceRefs:["aafp-trauma"],reviewStatus:"draft",reviewNote:"AFP 2014; pending clinical review."},
      rh:{title:"Rh status",type:"action",urgency:"urgent",summary:"Rh-negative → Rh immune globulin",
        items:[{text:"Rh-negative: give Rh immune globulin",task:"tr-rh"}],details:"Kleihauer-Betke helps size the dose.",sourceRefs:["aafp-trauma"],reviewStatus:"draft",reviewNote:"AFP 2014; pending clinical review."},
      stable:{title:"Mother and fetus stable?",type:"decision",urgency:"critical",summary:"Reassess continuously",
        details:"Maternal hemodynamics, bleeding, uterine tone and tenderness, contractions and FHR.",
        connections:[{to:"monitor",label:"Yes"},{to:"deliver",label:"No"}],reviewStatus:"draft",reviewNote:"Pending clinical review."},
      monitor:{title:"Monitor",type:"endpoint",urgency:"routine",summary:"≥4 hours · longer with any risk sign",
        items:[{text:"Monitor at least 4 hours; extend with contractions, bleeding, tenderness or abnormal FHR"}],
        details:"Commonly extended to 24 hours with frequent contractions, bleeding, uterine tenderness, abnormal FHR or serious maternal injury.",sourceRefs:["aafp-trauma"],reviewStatus:"draft",reviewNote:"AFP 2014; local protocol governs."},
      deliver:{title:"Expedite delivery",type:"escalation",urgency:"critical",summary:"Viable gestation · often cesarean",
        items:[{text:"Expedite delivery with OB, anesthesia, neonatology",task:"tr-deliver"},{text:"Mother arrests → Maternal Cardiac Arrest pathway",pathway:"arrest"}],
        details:"Unstable mother or abnormal fetal status at a viable gestation.",reviewStatus:"draft",reviewNote:"Pending clinical review."}
    },
    chart:{rows:[
      ["start"],
      [{group:"g-mother",label:"Mother first — at the same time",nodes:["primary","lud","iv","imaging"],connections:[{to:"g-preg"}]}],
      [{group:"g-preg",label:"Assess the pregnancy — at the same time",nodes:["fetal","us","abruption","rh"],connections:[{to:"stable"}]}],
      ["stable"],
      ["monitor","deliver"]
    ]},
    steps:[
      {title:"Mother first",nodes:["start","primary","lud","iv","imaging"],parallel:true},
      {title:"Assess the pregnancy",nodes:["fetal","us","abruption","rh"],parallel:true},
      {title:"Stable?",nodes:["stable"],decision:"stable"},
      {title:"Expedite delivery",nodes:["deliver"],escalation:true}
    ]
  },

  shoulder:{
    id:"shoulder",
    title:"Shoulder Dystocia",
    sourceRefs:["acog-sd-178"],
    nodes:{
      start:{title:"Shoulder dystocia",type:"start",urgency:"critical",summary:"Head delivered · shoulders stuck · start the clock",
        items:[{text:"Say “shoulder dystocia” · call OB, anesthesia, neonatal team",task:"sd-help"}],
        details:"Start the app clock when the head delivers; a recorder announces elapsed time.",
        connections:[{to:"g-first"}],reviewStatus:"draft",reviewNote:"New pathway (ACOG PB 178); pending clinical review."},
      avoid:{title:"Never",type:"escalation",urgency:"critical",summary:"Fundal pressure · pushing · excess traction",
        items:[{text:"Stop pushing · no fundal pressure · gentle axial traction only",task:"sd-avoid"}],
        details:"Fundal pressure risks uterine rupture; excessive lateral or downward traction risks brachial plexus injury.",reviewStatus:"draft",reviewNote:"ACOG PB 178; pending clinical review."},
      mcroberts:{title:"McRoberts",type:"action",urgency:"critical",summary:"Hyperflex thighs onto the abdomen",
        items:[{text:"McRoberts: hyperflex the thighs",task:"sd-mcroberts"}],details:"Two assistants flex the thighs onto the abdomen.",reviewStatus:"draft",reviewNote:"ACOG PB 178; pending clinical review."},
      suprapubic:{title:"Suprapubic pressure",type:"action",urgency:"critical",summary:"From the fetal back · never fundal",
        items:[{text:"Suprapubic pressure — never fundal",task:"sd-suprapubic"}],details:"Push the anterior shoulder down and toward the fetal face; steady, then rocking.",reviewStatus:"draft",reviewNote:"ACOG PB 178; pending clinical review."},
      delivered1:{title:"Delivered?",type:"decision",urgency:"critical",summary:"Announce the time",
        connections:[{to:"after",label:"Yes"},{to:"posterior",label:"No"}],details:"If not, move on without delay.",reviewStatus:"draft",reviewNote:"Pending clinical review."},
      posterior:{title:"Posterior arm",type:"action",urgency:"critical",summary:"Flex elbow · sweep across the chest",
        items:[{text:"Deliver the posterior arm",task:"sd-posterior"}],details:"Hold the wrist or forearm, not the upper arm.",reviewStatus:"draft",reviewNote:"ACOG PB 178; pending clinical review."},
      rotate:{title:"Internal rotation",type:"action",urgency:"critical",summary:"Rubin II · Woods screw · reverse Woods",
        items:[{text:"Rubin II · Woods screw · reverse Woods",task:"sd-rotate"}],details:"Rotate the shoulders into an oblique diameter.",reviewStatus:"draft",reviewNote:"ACOG PB 178; pending clinical review."},
      allfours:{title:"All-fours",type:"action",urgency:"urgent",summary:"Gaskin: hands and knees, then retry",
        items:[{text:"All-fours (Gaskin) position",task:"sd-allfours"}],details:"Gentle downward traction to deliver the posterior shoulder; maneuvers can be repeated.",reviewStatus:"draft",reviewNote:"Pending clinical review."},
      episiotomy:{title:"Episiotomy?",type:"action",urgency:"routine",summary:"Room for your hands, not the bone",
        items:[{text:"Consider episiotomy for room",task:"sd-episiotomy"}],details:"Does not relieve the bony obstruction.",reviewStatus:"draft",reviewNote:"ACOG PB 178; pending clinical review."},
      delivered2:{title:"Delivered?",type:"decision",urgency:"critical",summary:"Announce the time",
        connections:[{to:"after",label:"Yes"},{to:"lastresort",label:"No"}],details:"Senior help, OR and anesthesia ready.",reviewStatus:"draft",reviewNote:"Pending clinical review."},
      lastresort:{title:"Last resort",type:"escalation",urgency:"critical",summary:"Clavicle fracture · Zavanelli + cesarean · symphysiotomy",
        items:[{text:"Last-resort maneuvers by the most experienced clinician",task:"sd-lastresort"}],details:"OR and anesthesia ready early.",reviewStatus:"draft",reviewNote:"ACOG PB 178; pending clinical review."},
      after:{title:"After delivery",type:"endpoint",urgency:"urgent",summary:"Neonatal team · PPH watch · document",
        items:[{text:"Neonatal team, PPH watch, document",task:"sd-after"}],
        details:"Document head-to-body interval, maneuvers in order, who did what, and which shoulder was anterior.",reviewStatus:"draft",reviewNote:"Pending clinical review."}
    },
    chart:{rows:[
      ["start","avoid"],
      [{group:"g-first",label:"First line — together",nodes:["mcroberts","suprapubic"],connections:[{to:"delivered1"}]}],
      ["delivered1"],
      [{group:"g-next",label:"Next — choose by the situation",nodes:["posterior","rotate","allfours","episiotomy"],connections:[{to:"delivered2"}]}],
      ["delivered2"],
      ["lastresort","after"]
    ]},
    steps:[
      {title:"Call for help · start the clock",nodes:["start","avoid"],parallel:true},
      {title:"McRoberts + suprapubic pressure",nodes:["mcroberts","suprapubic","delivered1"],decision:"delivered1",parallel:true},
      {title:"Next maneuvers",nodes:["posterior","rotate","allfours","episiotomy","delivered2"],decision:"delivered2"},
      {title:"Last resort",nodes:["lastresort"],escalation:true},
      {title:"After delivery",nodes:["after"]}
    ]
  }
};
