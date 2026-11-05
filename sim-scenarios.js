// Sim Master scenario library (v2): branching patient states.
// DRAFT teaching content — vitals, timings, targets and prompts need simulation-faculty
// and clinical review before use (see CLINICAL-REVIEW.md › "Sim Master scenarios").
//
// Scenario
//   id, emergency, title, summary, focus[], review
//   monitor      vital keys shown: BP HR SpO2 RR QBL FHR Rhythm
//   stage        "cmqcc" → PPH stage is worked out from QBL and vitals (draft rule)
//   eventClock   {label, from:"start" | stateId}   second clock (time since the clinical event)
//   levels       {basic|intermediate|advanced: {note, start?, qblStart?}}
//   patient, roles, prebrief, equipment
//   states       {id: {name, text, findings, v:{sbp,dbp,hr,spo2,rr,fhr,rhythm}, qblRate (mL/min),
//                 next:[{kind:"worsen"|"improve"|"same", to, label}], suggest:[rule], levels?, final?}}
//     rule       {go:"worsen"|"improve", why, levels?, missed?:{action,by}, observed?:[actionIds], atMin?, always?}
//   injects      [{id, kind:"lab"|"vitals"|"confederate"|"complication", label, text, show?, qbl?, v?, to?, levels?}]
//   actions      [{id, label, cat:"Recognition"|"Teamwork"|"Management"|"Escalation", target (min|null), critical?, levels?, prompts[]}]
//   debrief      general prompts
// A suggestion only highlights a button. The instructor always decides.

export const SIM_REVIEW_STATUS = "Draft — requires simulation-faculty and clinical review";
export const LEVELS = ["basic","intermediate","advanced"];
export const LEVEL_LABEL = {basic:"Basic",intermediate:"Intermediate",advanced:"Advanced"};

const N = (kind,to,label)=>({kind,to,label});

export const SIM_SCENARIOS = [
  // ---------------------------------------------------------------- PPH: uterine atony
  {
    id:"pph-atony",emergency:"pph",title:"Postpartum hemorrhage · uterine atony",
    summary:"Atony after vaginal birth, progressing to shock if first-line treatment is late.",
    focus:["Recognition","Resuscitation","Escalation","Teamwork"],review:"draft",
    monitor:["BP","HR","SpO2","RR","QBL"],stage:"cmqcc",
    eventClock:{label:"Since bleeding recognized",from:"start"},
    levels:{
      basic:{note:"Responds to massage and a first-line uterotonic.",qblStart:700},
      intermediate:{note:"Needs a second-line uterotonic; family and phone distractions.",qblStart:800},
      advanced:{note:"Faster bleeding, blood-bank delay and coagulopathy unless escalated early.",qblStart:900}
    },
    patient:{oneLiner:"32-year-old G3P3, spontaneous vaginal birth 20 minutes ago, term, 3.9 kg infant.",history:["Labor 14 hours with oxytocin augmentation","No hypertension, no asthma","Placenta delivered complete","Oxytocin at postpartum rate"],setting:"L&D room, one nurse at the start"},
    roles:["Team leader","Recorder / timekeeper","Primary nurse","Medication nurse","Anesthesia","Runner / blood bank"],
    prebrief:["This is a simulation. Treat the mannequin as a patient; ask out loud for anything you need.","Vitals are on the monitor or given when you check them.","If a real emergency happens, we stop immediately."],
    equipment:["Hemorrhage cart","Simulated uterotonics","Two large-bore IV kits","QBL drapes / scale","Mannequin with fundus model"],
    states:{
      atony:{name:"Atony · bleeding",text:"Steady bright-red bleeding.",findings:"Fundus boggy, above umbilicus",v:{sbp:112,dbp:70,hr:110,spo2:98,rr:18},qblRate:90,
        next:[N("worsen","shock","Worsen hemorrhage"),N("improve","responding","Respond to treatment"),N("same","atony","Hold current state")],
        suggest:[{go:"worsen",missed:{action:"a-uterotonic",by:4},why:"No uterotonic by 4 min"},
          {go:"improve",levels:["basic"],observed:["a-massage","a-uterotonic"],why:"Massage and uterotonic given"},
          {go:"improve",levels:["intermediate","advanced"],observed:["a-massage","a-uterotonic","a-second"],why:"First- and second-line treatment given"}]},
      responding:{name:"Responding",text:"Fundus firms with massage; bleeding slowing.",findings:"Fundus firming, relaxes when massage stops",v:{sbp:112,dbp:70,hr:106,spo2:98,rr:18},qblRate:25,
        next:[N("worsen","atony","Relapse to atony"),N("improve","controlled","Bleeding controlled"),N("same","responding","Hold current state")],
        suggest:[{go:"improve",observed:["a-reassess"],why:"Team reassessed and communicated status"}]},
      controlled:{name:"Controlled",text:"Bleeding minimal. Keep reassessing.",findings:"Fundus firm at umbilicus",v:{sbp:118,dbp:74,hr:96,spo2:99,rr:16},qblRate:3,final:true,
        next:[N("worsen","atony","Relapse to atony"),N("same","controlled","Hold current state")],suggest:[]},
      shock:{name:"Hemorrhagic shock",text:"Pale, anxious, cool and clammy.",findings:"Fundus boggy; capillary refill delayed",v:{sbp:82,dbp:48,hr:134,spo2:96,rr:24},qblRate:140,
        next:[N("worsen","dic","Coagulopathy"),N("improve","stabilizing","Respond to resuscitation"),N("same","shock","Hold current state")],
        suggest:[{go:"improve",observed:["a-mtp"],why:"Blood products / MTP started"},{go:"worsen",levels:["advanced"],missed:{action:"a-mtp",by:9},why:"No MTP by 9 min"}]},
      stabilizing:{name:"Stabilizing",text:"Blood products running; perfusion improving.",findings:"Fundus firmer; bleeding slowing",v:{sbp:98,dbp:60,hr:118,spo2:97,rr:20},qblRate:30,
        next:[N("worsen","shock","Bleeding again"),N("improve","responding","Continued response"),N("same","stabilizing","Hold current state")],suggest:[]},
      dic:{name:"Coagulopathy",text:"Oozing from IV sites; blood not clotting.",findings:"Fundus firm but ongoing bleeding",v:{sbp:76,dbp:40,hr:142,spo2:94,rr:26},qblRate:120,levels:["advanced"],
        next:[N("improve","stabilizing","Respond to products + TXA"),N("same","dic","Hold current state")],
        suggest:[{go:"improve",observed:["a-mtp","a-txa"],why:"Products and TXA given"}]}
    },
    injects:[
      {id:"i-cbc",kind:"lab",label:"CBC / coags",text:"Hgb 9.1 g/dL · platelets 210k · fibrinogen 310 mg/dL",show:true},
      {id:"i-fib",kind:"lab",label:"Low fibrinogen",text:"Hgb 7.0 · platelets 88k · fibrinogen 140 mg/dL",show:true,levels:["advanced"]},
      {id:"i-dizzy",kind:"confederate",label:"“I feel dizzy”",text:"Patient: “I feel dizzy… is that normal?”"},
      {id:"i-clot",kind:"complication",label:"Large clot",text:"Passes a large clot (≈300 mL).",qbl:300},
      {id:"i-family",kind:"confederate",label:"Worried partner",text:"Partner: “Is she going to be okay? Should I call her mother?”",levels:["intermediate","advanced"]},
      {id:"i-phone",kind:"confederate",label:"Phone call",text:"Unit clerk: “Room 6 is asking for you — patient fully dilated.”",levels:["intermediate","advanced"]},
      {id:"i-bloodbank",kind:"complication",label:"Blood-bank delay",text:"Blood bank: “Crossmatched units in 15 minutes. O-negative available now.”",levels:["advanced"]}
    ],
    actions:[
      {id:"a-recognize",label:"Recognizes hemorrhage (names it, uses QBL)",cat:"Recognition",target:2,critical:true,prompts:["When did someone first say “hemorrhage” out loud, and what triggered it?","How did the team use QBL rather than BP?"]},
      {id:"a-help",label:"Calls for help and assigns roles",cat:"Teamwork",target:1,critical:true,prompts:["Who was leading, and how did everyone know?"]},
      {id:"a-massage",label:"Fundal massage / bimanual compression",cat:"Management",target:2,critical:true,prompts:["What made massage start when it did?"]},
      {id:"a-uterotonic",label:"First-line uterotonic (oxytocin)",cat:"Management",target:3,critical:true,prompts:["How was the uterotonic ordered and confirmed?"]},
      {id:"a-second",label:"Second-line uterotonic, checks contraindications",cat:"Management",target:7,levels:["intermediate","advanced"],prompts:["How did the team choose the second agent?"]},
      {id:"a-txa",label:"Considers / gives TXA",cat:"Management",target:10,prompts:["Was TXA considered? What would make it indicated here?"]},
      {id:"a-mtp",label:"Escalates to blood products / MTP when indicated",cat:"Escalation",target:8,critical:true,prompts:["What findings prompted escalation — and could it have come sooner?"]},
      {id:"a-reassess",label:"Reassesses response and communicates status",cat:"Teamwork",target:null,prompts:["How did the leader know what had already been given?"]}
    ],
    debrief:["What would the team change in a repeat scenario?","How were responsibilities distributed?"]
  },
  // ---------------------------------------------------------------- PPH: genital tract trauma
  {
    id:"pph-trauma",emergency:"pph",title:"Postpartum hemorrhage · firm uterus, still bleeding",
    summary:"Bleeding continues with a firm uterus after a vacuum birth. Tests the 4 Ts and avoiding fixation on tone.",
    focus:["Diagnostic reasoning","Escalation"],review:"draft",
    monitor:["BP","HR","SpO2","RR","QBL"],stage:"cmqcc",
    eventClock:{label:"Since bleeding recognized",from:"start"},
    levels:{basic:{note:"Laceration easy to find with exposure.",qblStart:600},intermediate:{note:"A confederate pushes for more uterotonics.",qblStart:700},advanced:{note:"Exposure inadequate at bedside; needs the OR.",qblStart:800}},
    patient:{oneLiner:"30-year-old G1P1, vacuum-assisted birth 15 minutes ago, second-degree laceration repaired.",history:["Prolonged second stage","Epidural in place","Placenta complete","No hypertension, no asthma"],setting:"L&D room"},
    roles:["Team leader","Recorder / timekeeper","Primary nurse","Second nurse","Anesthesia","Runner"],
    prebrief:["This is a simulation. Ask out loud for anything you need.","If a real emergency happens, we stop immediately."],
    equipment:["Hemorrhage cart","Light source / retractors (simulated)","Laceration repair tray"],
    states:{
      firm:{name:"Firm uterus · bleeding",text:"Steady bright-red trickle.",findings:"Fundus firm below umbilicus",v:{sbp:114,dbp:72,hr:112,spo2:99,rr:18},qblRate:45,
        next:[N("worsen","shock","Worsen hemorrhage"),N("improve","found","Laceration found"),N("same","firm","Hold current state")],
        suggest:[{go:"improve",observed:["a-exam"],why:"Genital tract examined with exposure"},{go:"worsen",missed:{action:"a-exam",by:7},why:"No exam by 7 min"}]},
      found:{name:"Laceration found",text:"High vaginal sidewall laceration, actively bleeding.",findings:"Pressure / packing controls some bleeding",v:{sbp:112,dbp:70,hr:108,spo2:99,rr:18},qblRate:20,
        next:[N("worsen","shock","Bleeding outpaces repair"),N("improve","repaired","Repaired"),N("same","found","Hold current state")],
        suggest:[{go:"improve",observed:["a-escalate"],why:"Repair arranged"}]},
      repaired:{name:"Repaired",text:"Bleeding controlled after repair.",findings:"Fundus firm; minimal bleeding",v:{sbp:118,dbp:74,hr:98,spo2:99,rr:16},qblRate:2,final:true,next:[N("same","repaired","Hold current state")],suggest:[]},
      shock:{name:"Hemorrhagic shock",text:"Pale, diaphoretic.",findings:"Fundus firm; ongoing bleeding",v:{sbp:86,dbp:50,hr:136,spo2:96,rr:24},qblRate:90,
        next:[N("improve","found","Respond to resuscitation + exam"),N("same","shock","Hold current state")],suggest:[{go:"improve",observed:["a-exam","a-iv"],why:"Exam and resuscitation"}]}
    },
    injects:[
      {id:"i-exam",kind:"complication",label:"Exam finding",text:"With exposure: high vaginal sidewall laceration, actively bleeding.",show:true},
      {id:"i-more",kind:"confederate",label:"“Another dose?”",text:"Nurse: “Should I get another dose of something?”",levels:["intermediate","advanced"]},
      {id:"i-cbc",kind:"lab",label:"CBC / coags",text:"Hgb 9.6 · platelets 198k · fibrinogen 330",show:true},
      {id:"i-exposure",kind:"complication",label:"Poor exposure",text:"Bedside view limited; patient uncomfortable despite epidural.",levels:["advanced"]}
    ],
    actions:[
      {id:"a-help",label:"Calls for help",cat:"Teamwork",target:1,critical:true,prompts:["How quickly did help arrive, and who called?"]},
      {id:"a-tone",label:"Checks tone; recognizes firm uterus",cat:"Recognition",target:2,critical:true,prompts:["When did the team say the uterus was firm — and what did that change?"]},
      {id:"a-4ts",label:"Names the 4 Ts out loud",cat:"Recognition",target:4,prompts:["Who called out the 4 Ts? Did the whole team hear it?"]},
      {id:"a-exam",label:"Examines with exposure, light, analgesia",cat:"Management",target:5,critical:true,prompts:["What would have made the exam happen sooner?"]},
      {id:"a-iv",label:"IV access, labs, type & crossmatch",cat:"Management",target:5,prompts:[]},
      {id:"a-escalate",label:"Arranges repair (OR if exposure inadequate)",cat:"Escalation",target:10,critical:true,prompts:["When is the bedside the wrong place to repair?"]},
      {id:"a-nofix",label:"Avoids repeated uterotonics for a firm uterus",cat:"Management",target:null,prompts:["What helped the team avoid fixation on tone?"]}
    ],
    debrief:["What would the team do differently next time?"]
  },
  // ---------------------------------------------------------------- Severe hypertension / eclampsia
  {
    id:"htn-eclampsia",emergency:"htn",title:"Severe hypertension → eclampsia",
    summary:"Severe-range BP after birth; seizure and magnesium toxicity at higher levels.",
    focus:["Timeliness","Seizure response","Medication safety","Communication"],review:"draft",
    monitor:["BP","HR","SpO2","RR"],
    eventClock:{label:"Since severe BP confirmed",from:"confirmed"},
    levels:{basic:{note:"Severe BP only; responds to first-line treatment.",start:"severe"},intermediate:{note:"Eclamptic seizure at the instructor's signal.",start:"severe"},advanced:{note:"Seizure, then magnesium toxicity.",start:"severe"}},
    patient:{oneLiner:"24-year-old G1P1, 6 hours after vaginal birth, new headache.",history:["Gestational hypertension, no treatment in labor","No asthma","Platelets 168k on admission"],setting:"Postpartum unit"},
    roles:["Team leader","Recorder / timekeeper","Primary nurse","Medication nurse","Anesthesia"],
    prebrief:["This is a simulation. Ask out loud for anything you need.","If a real emergency happens, we stop immediately."],
    equipment:["Simulated antihypertensives","Magnesium setup","Calcium gluconate","Airway equipment, suction"],
    states:{
      severe:{name:"Severe-range BP",text:"Headache; “spots in my vision.”",findings:"Alert; reflexes brisk",v:{sbp:166,dbp:110,hr:92,spo2:98,rr:16},
        next:[N("worsen","confirmed","Still severe on repeat"),N("improve","target","Not persistent"),N("same","severe","Hold current state")],
        suggest:[{go:"worsen",observed:["a-recheck"],why:"Repeat BP taken"}]},
      confirmed:{name:"Persistent severe BP",text:"Repeat BP still severe range.",findings:"Headache worse",v:{sbp:172,dbp:114,hr:96,spo2:98,rr:16},
        next:[N("worsen","seizure","Eclamptic seizure"),N("improve","treated","Respond to medication"),N("same","confirmed","Hold current state")],
        suggest:[{go:"improve",observed:["a-treat"],why:"First-line antihypertensive given"}]},
      treated:{name:"Responding",text:"BP improving after medication.",findings:"Headache easing",v:{sbp:152,dbp:98,hr:90,spo2:98,rr:16},
        next:[N("worsen","seizure","Eclamptic seizure"),N("improve","target","At target"),N("same","treated","Hold current state")],suggest:[]},
      target:{name:"BP below severe range",text:"Keep monitoring.",findings:"Alert, comfortable",v:{sbp:142,dbp:90,hr:86,spo2:99,rr:16},final:true,next:[N("worsen","confirmed","Severe again"),N("same","target","Hold current state")],suggest:[]},
      seizure:{name:"Eclamptic seizure",text:"Generalized tonic-clonic seizure.",findings:"Unresponsive, jerking; tongue bitten",v:{sbp:184,dbp:120,hr:124,spo2:88,rr:8},levels:["intermediate","advanced"],
        next:[N("improve","postictal","Seizure stops"),N("worsen","recurrent","Recurrent seizure"),N("same","seizure","Hold current state")],
        suggest:[{go:"improve",observed:["a-safety","a-mag"],why:"Airway protected, magnesium given"}]},
      postictal:{name:"Post-ictal",text:"Drowsy, confused.",findings:"Breathing, responds to voice",v:{sbp:164,dbp:108,hr:108,spo2:96,rr:18},levels:["intermediate","advanced"],
        next:[N("worsen","magtox","Magnesium toxicity"),N("improve","treated","BP treated"),N("same","postictal","Hold current state")],suggest:[{go:"improve",observed:["a-treat"],why:"BP treated"}]},
      recurrent:{name:"Recurrent seizure",text:"Second seizure during magnesium.",findings:"Unresponsive",v:{sbp:180,dbp:118,hr:126,spo2:86,rr:8},levels:["advanced"],
        next:[N("improve","postictal","Seizure stops"),N("same","recurrent","Hold current state")],suggest:[]},
      magtox:{name:"Magnesium toxicity",text:"Very drowsy; slow shallow breaths.",findings:"Reflexes absent; urine output low",v:{sbp:138,dbp:86,hr:64,spo2:90,rr:8},levels:["advanced"],
        next:[N("improve","postictal","Respond to calcium + stopping Mg"),N("same","magtox","Hold current state")],suggest:[{go:"improve",observed:["a-tox"],why:"Toxicity treated"}]}
    },
    injects:[
      {id:"i-labs",kind:"lab",label:"Preeclampsia labs",text:"Platelets 112k · AST 88 · ALT 74 · creatinine 0.9 · urine protein 3+",show:true},
      {id:"i-headache",kind:"confederate",label:"“Worst headache”",text:"Patient: “This is the worst headache of my life.”"},
      {id:"i-noiv",kind:"complication",label:"IV infiltrated",text:"IV has infiltrated — no IV access.",levels:["intermediate","advanced"]},
      {id:"i-seize",kind:"complication",label:"Seizure now",text:"Patient begins seizing.",to:"seizure",levels:["intermediate","advanced"]},
      {id:"i-mglevel",kind:"lab",label:"Mg level",text:"Serum magnesium 10.2 mg/dL",show:true,levels:["advanced"]}
    ],
    actions:[
      {id:"a-recheck",label:"Repeats BP to confirm persistence",cat:"Recognition",target:3,critical:true,prompts:["How did the team confirm the BP was persistent?"]},
      {id:"a-notify",label:"Notifies OB; activates severe-BP response",cat:"Teamwork",target:2,prompts:["Who was told, and how?"]},
      {id:"a-treat",label:"First-line antihypertensive",cat:"Management",target:8,critical:true,prompts:["What was the time from confirmed severe BP to treatment?"]},
      {id:"a-mag",label:"Magnesium sulfate",cat:"Management",target:10,critical:true,prompts:["When was magnesium started, and who checked the dose?"]},
      {id:"a-labs",label:"Preeclampsia labs",cat:"Management",target:10,prompts:[]},
      {id:"a-safety",label:"Seizure: protects airway, left lateral, prevents injury",cat:"Management",target:null,levels:["intermediate","advanced"],critical:true,prompts:["What did the team do in the first 30 seconds of the seizure?"]},
      {id:"a-tox",label:"Recognizes Mg toxicity; stops Mg, gives calcium",cat:"Escalation",target:null,levels:["advanced"],critical:true,prompts:["What signs pointed to magnesium toxicity?"]},
      {id:"a-closedloop",label:"Closed-loop medication communication",cat:"Teamwork",target:null,prompts:["Give an example of a check-back during this case."]}
    ],
    debrief:["How was the plan shared once the BP was confirmed?"]
  },
  // ---------------------------------------------------------------- Shoulder dystocia
  {
    id:"shoulder",emergency:"shoulder",title:"Shoulder dystocia",
    summary:"Head delivered, shoulders impacted. Maneuver sequence, timing and team leadership.",
    focus:["Maneuver sequence","Timing","Team leadership"],review:"draft",
    monitor:["HR","BP","FHR"],
    eventClock:{label:"Head-to-body",from:"start",stopAt:"delivered"},
    levels:{basic:{note:"Resolves with McRoberts and suprapubic pressure."},intermediate:{note:"Needs delivery of the posterior arm."},advanced:{note:"Needs rotation or all-fours; postpartum hemorrhage after delivery."}},
    patient:{oneLiner:"34-year-old G2P1, diabetic, estimated fetal weight 4.2 kg, second stage 2.5 hours.",history:["Gestational diabetes on insulin","Previous birth 3.6 kg, uncomplicated"],setting:"L&D room, delivering"},
    roles:["Team leader","Recorder / timekeeper (announces time)","Two assistants for McRoberts","Neonatal team","Anesthesia"],
    prebrief:["This is a simulation. Say your actions out loud.","The recorder announces elapsed time.","If a real emergency happens, we stop immediately."],
    equipment:["Birthing mannequin with shoulder dystocia setup","Neonatal resuscitation area"],
    states:{
      impacted:{name:"Shoulders impacted",text:"Head delivered; turtle sign.",findings:"Head retracts against perineum",v:{sbp:128,dbp:80,hr:110,fhr:110},
        next:[N("improve","delivered","Shoulders deliver"),N("same","impacted","Hold — no progress")],
        suggest:[{go:"improve",levels:["basic"],observed:["a-mcroberts","a-suprapubic"],why:"McRoberts + suprapubic pressure"},
          {go:"improve",levels:["intermediate"],observed:["a-posterior"],why:"Posterior arm delivered"},
          {go:"improve",levels:["advanced"],observed:["a-rotate"],why:"Rotation maneuver"},
          {go:"improve",levels:["advanced"],observed:["a-allfours"],why:"All-fours"}]},
      delivered:{name:"Delivered",text:"Baby delivered; handed to neonatal team.",findings:"Infant floppy, pale",v:{sbp:124,dbp:78,hr:104},
        next:[N("worsen","pph","Postpartum hemorrhage"),N("same","delivered","Hold current state")],final:true,suggest:[{go:"worsen",levels:["advanced"],always:true,why:"Advanced: PPH follows"}]},
      pph:{name:"Postpartum hemorrhage",text:"Brisk bleeding after delivery.",findings:"Fundus boggy",v:{sbp:102,dbp:62,hr:122},levels:["advanced"],
        next:[N("same","pph","Hold current state")],suggest:[]}
    },
    injects:[
      {id:"i-fundal",kind:"confederate",label:"“Push on top?”",text:"Nurse: “Should I push on the top of her belly?”"},
      {id:"i-partner",kind:"confederate",label:"Partner asks",text:"Partner: “What's happening? Is the baby stuck?”"},
      {id:"i-apgar",kind:"complication",label:"Apgar 3",text:"Infant: Apgar 3 at 1 minute; neonatal team starts NRP.",show:true},
      {id:"i-right",kind:"vitals",label:"Anterior shoulder",text:"Anterior shoulder is the fetal right.",for:"instructor"}
    ],
    actions:[
      {id:"a-call",label:"Announces shoulder dystocia; calls for help",cat:"Teamwork",target:0.5,critical:true,prompts:["How quickly did everyone know what was happening?"]},
      {id:"a-time",label:"Recorder announces elapsed time",cat:"Teamwork",target:1,prompts:["Did the team hear the time? How did it shape decisions?"]},
      {id:"a-nopush",label:"Stops pushing; no fundal pressure",cat:"Management",target:0.5,critical:true,prompts:["How was the request for fundal pressure handled?"]},
      {id:"a-mcroberts",label:"McRoberts",cat:"Management",target:1,critical:true,prompts:[]},
      {id:"a-suprapubic",label:"Suprapubic pressure",cat:"Management",target:1.5,critical:true,prompts:[]},
      {id:"a-posterior",label:"Delivers the posterior arm",cat:"Management",target:3,levels:["intermediate","advanced"],prompts:["What cued the move to the posterior arm?"]},
      {id:"a-rotate",label:"Rotation (Rubin II / Woods)",cat:"Management",target:4,levels:["advanced"],prompts:[]},
      {id:"a-allfours",label:"All-fours (Gaskin)",cat:"Management",target:4,levels:["advanced"],prompts:[]},
      {id:"a-neonatal",label:"Neonatal team ready at delivery",cat:"Teamwork",target:null,prompts:[]},
      {id:"a-document",label:"Documents interval, maneuvers, anterior shoulder",cat:"Teamwork",target:null,prompts:["What needs to be in the delivery note?"]}
    ],
    debrief:["How was the maneuver sequence communicated?","Who led, and was the plan clear to the assistants?"]
  },
  // ---------------------------------------------------------------- Maternal cardiac arrest
  {
    id:"arrest",emergency:"arrest",title:"Maternal cardiac arrest",
    summary:"Arrest at 34 weeks: CPR, uterine displacement and the 4-minute delivery decision.",
    focus:["Roles","Time-critical decisions","Coordination"],review:"draft",
    monitor:["Rhythm","HR","BP","SpO2"],
    eventClock:{label:"Since arrest",from:"start"},
    levels:{basic:{note:"ROSC after good CPR and uterine displacement."},intermediate:{note:"No ROSC until resuscitative delivery."},advanced:{note:"Amniotic fluid embolism with coagulopathy after delivery."}},
    patient:{oneLiner:"29-year-old G2P1 at 34 weeks, collapses during a non-stress test.",history:["Uncomplicated pregnancy","No known cardiac disease"],setting:"Antepartum testing / L&D"},
    roles:["Team leader","Compressions (rotating)","Airway","Uterine displacement","Recorder / timekeeper","OB for resuscitative delivery","Neonatal team"],
    prebrief:["This is a simulation. Say your actions out loud.","If a real emergency happens, we stop immediately."],
    equipment:["CPR mannequin with gravid abdomen","Defibrillator (training mode)","Airway cart","Resuscitative delivery tray (simulated)"],
    states:{
      arrest:{name:"Cardiac arrest",text:"Unresponsive, not breathing, no pulse.",findings:"Fundus above umbilicus",v:{rhythm:"PEA",hr:0,sbp:0,dbp:0,spo2:0},
        next:[N("improve","rosc","ROSC"),N("worsen","noROSC","No ROSC at 4 minutes"),N("same","arrest","Hold — continue CPR")],
        suggest:[{go:"improve",levels:["basic"],observed:["a-cpr","a-lud"],why:"CPR and uterine displacement"},{go:"worsen",levels:["intermediate","advanced"],atMin:4,why:"4 minutes without ROSC"}]},
      noROSC:{name:"No ROSC · 4 minutes",text:"Still pulseless.",findings:"Resuscitative delivery indicated",v:{rhythm:"PEA",hr:0,sbp:0,dbp:0,spo2:0},
        next:[N("improve","delivered","Delivered"),N("same","noROSC","Hold — continue CPR")],suggest:[{go:"improve",observed:["a-delivery"],why:"Resuscitative delivery done"}]},
      delivered:{name:"Delivered · CPR continues",text:"Infant to neonatal team.",findings:"Compressions more effective",v:{rhythm:"PEA",hr:0,sbp:0,dbp:0,spo2:0},
        next:[N("improve","rosc","ROSC"),N("worsen","afe","Bleeding / coagulopathy"),N("same","delivered","Hold — continue CPR")],
        suggest:[{go:"improve",levels:["intermediate"],observed:["a-delivery"],why:"ROSC after delivery"},{go:"worsen",levels:["advanced"],observed:["a-delivery"],why:"Advanced: AFE coagulopathy"}]},
      rosc:{name:"ROSC",text:"Pulse returns.",findings:"Intubated; responsive to pain",v:{rhythm:"Sinus tachycardia",hr:124,sbp:92,dbp:56,spo2:93},final:true,next:[N("worsen","arrest","Re-arrest"),N("same","rosc","Hold current state")],suggest:[]},
      afe:{name:"AFE · coagulopathy",text:"Oozing from all sites; uterus bleeding.",findings:"Fibrinogen very low",v:{rhythm:"Sinus tachycardia",hr:146,sbp:70,dbp:38,spo2:86},levels:["advanced"],
        next:[N("improve","rosc","Stabilizing with products"),N("same","afe","Hold current state")],suggest:[{go:"improve",observed:["a-afe"],why:"Massive transfusion activated"}]}
    },
    injects:[
      {id:"i-rhythm",kind:"vitals",label:"Rhythm check",text:"Rhythm check: PEA. Resume compressions.",show:true},
      {id:"i-mag",kind:"complication",label:"Magnesium running",text:"Nurse: “She's on a magnesium drip.”",levels:["intermediate","advanced"]},
      {id:"i-fib",kind:"lab",label:"Coags",text:"Fibrinogen 90 mg/dL · platelets 62k · INR 2.1",show:true,levels:["advanced"]},
      {id:"i-neonate",kind:"complication",label:"Neonate",text:"Infant: HR 80, apneic — neonatal team resuscitating.",show:true}
    ],
    actions:[
      {id:"a-call",label:"Calls arrest team + OB + neonatal; notes the time",cat:"Teamwork",target:0.5,critical:true,prompts:["How did the team know the time of arrest?"]},
      {id:"a-cpr",label:"High-quality CPR started",cat:"Management",target:0.5,critical:true,prompts:[]},
      {id:"a-lud",label:"Left uterine displacement",cat:"Management",target:1,critical:true,prompts:["Who took on uterine displacement, and was it continuous?"]},
      {id:"a-rhythm",label:"Rhythm checks every 2 minutes",cat:"Management",target:2,prompts:[]},
      {id:"a-airway",label:"Early airway by most experienced",cat:"Management",target:3,prompts:[]},
      {id:"a-iv",label:"IV / IO above the diaphragm",cat:"Management",target:3,prompts:[]},
      {id:"a-decide",label:"Decides on resuscitative delivery at 4 min",cat:"Escalation",target:4,critical:true,prompts:["Who made the delivery decision, and when?"]},
      {id:"a-delivery",label:"Delivery by 5 minutes, at the bedside",cat:"Escalation",target:5,critical:true,prompts:["What slowed or sped up the delivery?"]},
      {id:"a-causes",label:"Considers causes (A–H)",cat:"Recognition",target:null,prompts:["Which causes were considered out loud?"]},
      {id:"a-afe",label:"Suspects AFE; activates massive transfusion",cat:"Recognition",target:null,levels:["advanced"],critical:true,prompts:["What made the team think of AFE?"]}
    ],
    debrief:["How were roles assigned and rotated?"]
  },
  // ---------------------------------------------------------------- Trauma / abruption after MVA
  {
    id:"trauma-abruption",emergency:"trauma",title:"Placental abruption after a car crash",
    summary:"Third-trimester MVA: mother first, then fetal monitoring; abruption develops at higher levels.",
    focus:["ED–OB coordination","Recognition","Escalation"],review:"draft",
    monitor:["BP","HR","SpO2","RR","FHR"],
    eventClock:{label:"Since arrival",from:"start"},
    levels:{basic:{note:"Stable; correct monitoring and labs."},intermediate:{note:"Abruption develops with contractions."},advanced:{note:"Hemorrhagic shock and fetal bradycardia; expedited delivery."}},
    patient:{oneLiner:"31-year-old G2P1 at 33 weeks, restrained driver in a moderate-speed collision.",history:["Seatbelt sign across lower abdomen","Mild abdominal pain","Small amount of vaginal bleeding"],setting:"Emergency department"},
    roles:["ED leader","OB","Primary nurse","Anesthesia","Blood bank / runner","Neonatal team"],
    prebrief:["This is a simulation. Ask out loud for anything you need.","If a real emergency happens, we stop immediately."],
    equipment:["Fetal monitor (simulated)","Bedside ultrasound (simulated)","Trauma bay"],
    states:{
      arrival:{name:"Arrival",text:"Alert, anxious; mild abdominal pain.",findings:"Seatbelt sign; uterus mildly tender",v:{sbp:118,dbp:76,hr:104,spo2:99,rr:20,fhr:145},
        next:[N("improve","stable","Stable on monitoring"),N("worsen","abruption","Abruption develops"),N("same","arrival","Hold current state")],
        suggest:[{go:"improve",levels:["basic"],observed:["a-primary","a-ftm"],why:"Primary survey and monitoring done"},{go:"worsen",levels:["intermediate","advanced"],observed:["a-ftm"],why:"Monitoring shows contractions"}]},
      stable:{name:"Stable · monitoring",text:"Comfortable; no contractions.",findings:"Uterus soft; FHR reassuring",v:{sbp:120,dbp:76,hr:92,spo2:99,rr:16,fhr:140},final:true,
        next:[N("worsen","abruption","Abruption develops"),N("same","stable","Hold current state")],suggest:[]},
      abruption:{name:"Abruption",text:"Contractions every 2 minutes; more pain.",findings:"Uterus tender and firm; FHR minimal variability",v:{sbp:108,dbp:66,hr:118,spo2:98,rr:22,fhr:160},levels:["intermediate","advanced"],
        next:[N("worsen","shock","Shock + fetal bradycardia"),N("improve","stable","Settles with monitoring"),N("same","abruption","Hold current state")],
        suggest:[{go:"worsen",levels:["advanced"],missed:{action:"a-abruption",by:8},why:"Abruption not recognized by 8 min"}]},
      shock:{name:"Shock · fetal bradycardia",text:"Pale, diaphoretic; rigid uterus.",findings:"Prolonged FHR deceleration",v:{sbp:84,dbp:50,hr:138,spo2:96,rr:26,fhr:70},levels:["advanced"],
        next:[N("improve","delivered","Expedited delivery"),N("same","shock","Hold current state")],suggest:[{go:"improve",observed:["a-deliver"],why:"Delivery decided"}]},
      delivered:{name:"Delivered",text:"Cesarean; neonatal team resuscitating.",findings:"Large retroplacental clot",v:{sbp:96,dbp:58,hr:120,spo2:98,rr:20},levels:["advanced"],final:true,next:[N("same","delivered","Hold current state")],suggest:[]}
    },
    injects:[
      {id:"i-type",kind:"lab",label:"Blood type",text:"Blood type O negative",show:true},
      {id:"i-kb",kind:"lab",label:"Kleihauer-Betke",text:"Kleihauer-Betke positive",show:true,levels:["intermediate","advanced"]},
      {id:"i-ct",kind:"confederate",label:"“CT now?”",text:"ED physician: “Can we get a CT, or does the pregnancy stop that?”"},
      {id:"i-us",kind:"complication",label:"Ultrasound",text:"Bedside ultrasound: placenta fundal, no previa; no clear retroplacental clot.",show:true},
      {id:"i-exam",kind:"confederate",label:"“Check her cervix?”",text:"Resident: “Should I check her cervix?”"}
    ],
    actions:[
      {id:"a-call",label:"Activates OB + trauma teams",cat:"Teamwork",target:1,critical:true,prompts:["How did ED and OB share leadership?"]},
      {id:"a-primary",label:"Primary survey first (ABC)",cat:"Management",target:2,critical:true,prompts:[]},
      {id:"a-lud",label:"Left uterine displacement / tilt",cat:"Management",target:2,critical:true,prompts:[]},
      {id:"a-ivlabs",label:"2 IVs; labs incl. KB, type & crossmatch",cat:"Management",target:5,prompts:[]},
      {id:"a-ftm",label:"Continuous fetal + contraction monitoring",cat:"Management",target:5,critical:true,prompts:["How soon did fetal monitoring start?"]},
      {id:"a-noexam",label:"No digital exam until previa excluded",cat:"Management",target:null,prompts:["How was the request for a cervical exam handled?"]},
      {id:"a-rh",label:"Checks Rh; plans RhIG if negative",cat:"Management",target:null,prompts:[]},
      {id:"a-abruption",label:"Recognizes abruption",cat:"Recognition",target:null,levels:["intermediate","advanced"],critical:true,prompts:["What told the team this was an abruption, despite the ultrasound?"]},
      {id:"a-deliver",label:"Decides on expedited delivery",cat:"Escalation",target:null,levels:["advanced"],critical:true,prompts:["Who made the call, and how was it communicated?"]}
    ],
    debrief:["What was the plan for monitoring duration?"]
  }
];

// PPH with severe preeclampsia: the atony course with a hypertensive patient and the methylergonovine trap.
(()=>{
  const base=SIM_SCENARIOS.find(x=>x.id==="pph-atony");
  const bp={atony:[158,102,112],responding:[150,96,104],controlled:[146,92,96],shock:[112,70,132],stabilizing:[128,80,116],dic:[92,54,140]};
  const states=JSON.parse(JSON.stringify(base.states));
  for(const [id,[sbp,dbp,hr]] of Object.entries(bp))if(states[id])Object.assign(states[id].v,{sbp,dbp,hr});
  states.atony.findings="Fundus boggy; magnesium infusing";
  SIM_SCENARIOS.splice(1,0,{
    ...JSON.parse(JSON.stringify(base)),id:"pph-preeclampsia",title:"Postpartum hemorrhage · with severe preeclampsia",
    summary:"Atony in a patient on magnesium for preeclampsia with severe features. Tests uterotonic choice under pressure.",
    focus:["Medication safety","Speaking up","Teamwork"],
    levels:{basic:{note:"Responds to first-line treatment; one unsafe suggestion.",qblStart:1000},intermediate:{note:"Needs a safe second-line agent; distractions.",qblStart:1000},advanced:{note:"Faster bleeding and coagulopathy; BP and hemorrhage both need managing.",qblStart:1100}},
    patient:{oneLiner:"27-year-old G1P1, cesarean 40 minutes ago for arrest of dilation; preeclampsia with severe features.",history:["Magnesium sulfate infusing","BP 150s–160s/100s before delivery","No asthma","Platelets 142k pre-op"],setting:"Recovery / postpartum room"},
    states,
    injects:[{id:"i-methergine",kind:"confederate",label:"“Give Methergine?”",text:"Medication nurse: “I have Methergine in my hand — want me to give it?”"},
      ...base.injects.filter(i=>i.id!=="i-cbc"),
      {id:"i-cbc",kind:"lab",label:"CBC / LFTs",text:"Hgb 9.4 · platelets 118k · fibrinogen 280 · AST 64",show:true},
      {id:"i-methergine-given",kind:"complication",label:"Methergine given",text:"If the team accepted: “Methergine is in.” BP rises.",v:{sbp:178,dbp:112}}],
    actions:[...base.actions.filter(a=>a.id!=="a-second"),
      {id:"a-avoid",label:"Declines methylergonovine — names hypertension",cat:"Management",target:3,critical:true,prompts:["Who noticed the methylergonovine problem, and how did they say it?","Did the person holding the vial feel able to hold off?"]},
      {id:"a-second",label:"Safe second-line agent (carboprost or misoprostol)",cat:"Management",target:7,levels:["intermediate","advanced"],prompts:["How did the team choose a safe second agent?"]},
      {id:"a-mag",label:"Continues magnesium; watches for toxicity",cat:"Management",target:null,prompts:["Magnesium raises atony risk. Was that discussed?"]},
      {id:"a-bp",label:"Keeps BP treatment in the plan",cat:"Escalation",target:null,prompts:["How did the team balance hemorrhage and blood-pressure priorities?"]}],
    debrief:["What made it easier or harder to speak up about an unsafe order?"]
  });
})();

// ---------------------------------------------------------------- context (Sim Master 2.0)
// state.injects   injects offered first in that state ("Suggested now")
// action.from     state whose first entry starts that action's timing (default: scenario start)
// action.surface  states in which a non-critical action is promoted to the primary checklist
// inject.for      recipient: learner | confederate | monitor | instructor
// version / reviewed: scenario content version and clinical review date (null = not reviewed)
const CONTEXT={
  "pph-atony":{states:{atony:["i-cbc","i-dizzy","i-clot"],responding:["i-cbc","i-family"],shock:["i-bloodbank","i-fib","i-family"],stabilizing:["i-fib"],dic:["i-fib"]},
    actions:{"a-mtp":{from:"shock",target:3,surface:["shock","stabilizing","dic"]},"a-txa":{surface:["shock","dic"]},"a-reassess":{surface:["responding","stabilizing"]}}},
  "pph-preeclampsia":{states:{atony:["i-methergine","i-cbc","i-dizzy"],responding:["i-family"],shock:["i-bloodbank","i-fib"],dic:["i-fib"]},
    actions:{"a-mtp":{from:"shock",target:3,surface:["shock","stabilizing","dic"]},"a-txa":{surface:["shock","dic"]},"a-bp":{surface:["atony","responding"]}}},
  "pph-trauma":{states:{firm:["i-more","i-cbc"],found:["i-exam","i-exposure"],shock:["i-cbc"]},
    actions:{"a-escalate":{from:"found",target:4},"a-nofix":{surface:["firm"]}}},
  "htn-eclampsia":{states:{severe:["i-headache","i-labs"],confirmed:["i-labs","i-noiv","i-seize"],treated:["i-seize"],seizure:["i-noiv"],postictal:["i-mglevel"],magtox:["i-mglevel"]},
    actions:{"a-treat":{from:"confirmed",target:5},"a-safety":{from:"seizure",target:0.5},"a-tox":{from:"magtox",target:2},"a-mag":{surface:["seizure","postictal"]}}},
  "shoulder":{states:{impacted:["i-fundal","i-partner","i-right"],delivered:["i-apgar"]},
    actions:{"a-neonatal":{surface:["delivered"]},"a-document":{surface:["delivered"]}}},
  "arrest":{states:{arrest:["i-rhythm","i-mag"],noROSC:["i-rhythm"],delivered:["i-neonate","i-fib"],afe:["i-fib"]},
    actions:{"a-afe":{surface:["afe"],from:"afe",target:2},"a-causes":{surface:["noROSC"]}}},
  "trauma-abruption":{states:{arrival:["i-type","i-ct","i-exam"],abruption:["i-us","i-kb"],shock:["i-type"]},
    actions:{"a-abruption":{from:"abruption",target:3},"a-deliver":{from:"shock",target:5},"a-rh":{surface:["arrival"]},"a-noexam":{surface:["arrival"]}}}
};
const RECIPIENT={lab:"monitor",vitals:"monitor",confederate:"confederate",complication:"instructor"};
export const SIM_CONTENT_VERSION="2.0";

// ---------------------------------------------------------------- facilitator script (Sim Master 3.0)
// state.say  {who, line}: the one sentence the facilitator says aloud on entering that state. DRAFT.
const PPH_SAY={
  atony:["Nurse","She's bleeding a lot — the pad is soaked."],
  responding:["Nurse","It firms when I rub, but softens when I stop."],
  controlled:["Nurse","Bleeding has really slowed down."],
  shock:["Patient","I feel so cold… I can't catch my breath."],
  stabilizing:["Nurse","Blood is running. Her color looks a little better."],
  dic:["Nurse","She's oozing from her IV — the blood isn't clotting."]};
const SAY={
  "pph-atony":PPH_SAY,"pph-preeclampsia":PPH_SAY,
  "pph-trauma":{firm:["Nurse","Uterus feels firm, but she's still bleeding."],found:["Examiner","There's a tear high on the side wall — it's pumping."],repaired:["Nurse","Bleeding stopped since the repair."],shock:["Patient","I feel faint… the room is spinning."]},
  "htn-eclampsia":{severe:["Patient","My head is pounding, and I'm seeing spots."],confirmed:["Nurse","Repeat pressure is still severe range."],treated:["Nurse","Pressure is coming down."],target:["Patient","The headache is a lot better."],
    seizure:["Nurse","She's seizing! I need help in here!"],postictal:["Nurse","Seizure stopped. She's breathing, but confused."],recurrent:["Nurse","She's seizing again — and magnesium is running!"],magtox:["Nurse","She's very hard to wake, and breathing slowly."]},
  "shoulder":{impacted:["Nurse","The head is out but pulling back — it won't deliver."],delivered:["Nurse","Baby is out — floppy and pale. Peds is here."],pph:["Nurse","Now she's bleeding heavily."]},
  "arrest":{arrest:["Nurse","She's not responding — I can't feel a pulse!"],noROSC:["Recorder","Four minutes of CPR. Still no pulse."],delivered:["Neonatal team","We have the baby."],rosc:["Nurse","I feel a pulse!"],afe:["Nurse","She's bleeding from everywhere — IV sites, the incision."]},
  "trauma-abruption":{arrival:["Patient","My belly hurts where the seatbelt was. Is my baby okay?"],stable:["Nurse","She's comfortable. Baby looks good on the monitor."],abruption:["Patient","The pain is getting worse — it doesn't stop."],shock:["Nurse","Baby's heart rate is way down and not coming back!"],delivered:["Neonatal team","Baby's out — we're resuscitating."]}
};
for(const s of SIM_SCENARIOS){
  const c=CONTEXT[s.id]||{};
  for(const [id,[who,line]] of Object.entries(SAY[s.id]||{}))if(s.states[id])s.states[id].say={who,line};
  s.version=s.version||"2.0";s.reviewed=s.reviewed??null;
  for(const [id,list] of Object.entries(c.states||{}))if(s.states[id])s.states[id].injects=list;
  for(const [id,extra] of Object.entries(c.actions||{})){const a=s.actions.find(x=>x.id===id);if(a)Object.assign(a,extra);}
  for(const i of s.injects){i.for=i.for||(i.show?"monitor":RECIPIENT[i.kind]||"instructor");if(i.kind==="confederate"&&/^Patient:/.test(i.text))i.for="learner";}
}

export function getSimScenario(id){return SIM_SCENARIOS.find(s=>s.id===id);}
