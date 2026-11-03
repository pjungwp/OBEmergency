# Clinical review checklist

Status legend: `[ ]` not reviewed · `[~]` under review · `[x]` approved

## Global

- [ ] Intended users and clinical setting approved
- [ ] Disclaimer and governance language approved
- [ ] No PHI entered or retained
- [ ] Emergency activation and escalation language localized
- [ ] Alarm milestones distinguished from treatment deadlines
- [ ] Locked-screen/background alert limitations accepted
- [ ] Accessibility and language review completed

## Postpartum hemorrhage

- [ ] Definition and recognition language
- [ ] Hemorrhage activation team and contacts
- [ ] Vital-sign reassessment interval
- [ ] Laboratory panel and massive-transfusion activation
- [ ] Oxytocin preparation and administration
- [ ] Methylergonovine contraindications
- [ ] Carboprost contraindications and dose limit
- [ ] Misoprostol dose/route
- [ ] TXA indication, infusion, second-dose criteria and renal/thrombotic cautions
- [ ] Balloon and vacuum-induced hemorrhage-control device pathway
- [ ] OR, IR, transfer and hysterectomy escalation

## Acute severe hypertension

- [ ] BP technique and 15-minute confirmation rule
- [ ] Treatment timing statement
- [ ] Labetalol 20/40/80 sequence and contraindications
- [ ] Hydralazine sequence and reassessment interval
- [ ] Nifedipine IR sequence and reassessment interval
- [ ] BP target and post-control monitoring schedule
- [ ] Magnesium indication and simultaneous-treatment language
- [ ] Stroke and pulmonary-edema escalation
- [ ] Delivery and transfer language

## Eclampsia

- [ ] Initial airway/safety/positioning actions
- [ ] Magnesium IV load and maintenance
- [ ] IM pathway when IV access is unavailable
- [ ] Renal adjustment and serum-monitoring thresholds
- [ ] Recurrent-seizure magnesium/benzodiazepine pathway
- [ ] Fosphenytoin/levetiracetam/intubation pathway if added to active mode
- [ ] Calcium gluconate rescue dose
- [ ] Neuroimaging/alternate diagnosis language
- [ ] Delivery timing and route language

## Maternal cardiac arrest (incl. amniotic fluid embolism) — new, all draft

- [ ] Team activation and roles (AHA 2025 cardiac arrest in pregnancy algorithm)
- [ ] Left uterine displacement threshold (fundus at or above umbilicus)
- [ ] Early airway, IV above diaphragm, stop magnesium + calcium, detach fetal monitors
- [ ] 4-minute decision / 5-minute delivery target; delivery at the site of resuscitation
- [ ] A–H etiologies wording
- [ ] AFE: massive transfusion activation, early coagulation, fluid restriction, vasopressors (SMFM CG 9, 2016)
- [ ] Milestones: 4 min, 5 min, 10 min; 2-minute rhythm-check timer

## Third-trimester trauma / abruption — new, all draft

- [ ] Uterine displacement / 25–30° tilt; primary survey first
- [ ] Labs incl. Kleihauer-Betke for major trauma; Rh immune globulin criteria
- [ ] Fetal monitoring minimum 4 h, extension criteria (AFP 2014; local protocol)
- [ ] No digital exam until previa excluded; ultrasound limits for abruption
- [ ] Imaging not withheld (ACOG CO 723) — add a direct source link if available
- [ ] Delivery criteria and the link to the arrest pathway; 240-minute milestone

## Shoulder dystocia — new, all draft

- [ ] Help/team call; recorder announcing time; clock starts at head delivery
- [ ] McRoberts + suprapubic pressure first (ACOG PB 178)
- [ ] Posterior arm, Rubin II, Woods screw, reverse Woods, all-fours, episiotomy wording
- [ ] Last-resort list and "avoid" list; documentation items
- [ ] 1–5 minute milestones and their prompts

## New Education decks — draft

- [ ] Shoulder dystocia maneuvers · Third-trimester bleeding and trauma · Cardiac arrest in pregnancy

## Flowchart pathways (`pathways.js`)

Restructured from the existing flow, task and medication text. Nodes marked `reviewStatus:"draft"` add or infer content:

- [ ] PPH "PPH recognized": adds the ≥1,000 mL cumulative threshold (ACOG PB 183)
- [ ] PPH "Controlled" outcome wording (implied by "Ongoing bleeding?", not stated)
- [ ] Severe HTN "Not persistent" branch (not in existing content; check ACOG ED algorithm)
- [ ] All three: parallel groupings, decision branch labels, guided step order
- [ ] Overview bullets and chart summaries (shortened from reviewed text)
- [ ] Mockup items intentionally **not** added pending review: "IV ×2", "treat anemia", "UOP", "IR (UAE)"

## Sim Master scenarios (`scenarios.js`)

- [ ] PPH atony: vitals trajectory, event timings, expected-action targets
- [ ] PPH with severe preeclampsia: methylergonovine trap, second-line agent choices, magnesium monitoring
- [ ] PPH firm uterus / trauma: exam finding, escalation-to-OR criteria
- [ ] Subtitle lines on cockpit task cards (`TASK_SUBTITLES` in `app.js`)
- [ ] Debrief questions and confederate lines reviewed by simulation faculty

## TeamSTEPPS and simulation

- [ ] Local role names and responsibilities
- [ ] Brief, call-out/check-back, huddle and debrief scripts
- [ ] CUS and Two-Challenge Rule education
- [ ] Simulation cases, expected actions and facilitator controls
- [ ] Debrief rubric and data-retention policy
