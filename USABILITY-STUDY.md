# Phase 9 — usability study protocol (draft)

Purpose: check the two-state cockpit (Decision Mode + Split Action Dashboard) with a real mixed team before clinical sign-off and before the old layout is retired.

## Participants
A mixed team per run: OB attending or senior resident, two nurses, anesthesia, one junior resident. Aim for 3–4 teams. Simulation faculty facilitate.

## Setup
- Facilitator laptop: **Sim Master** (Home → Open Sim Master) → choose scenario and level → Prebrief → open the monitor window on a projector or second screen → Start.
- Team phones: each runs its own simulation session (no sync in this release).
- Devices to cover across runs: Galaxy Z Fold (outer and inner), a small iPhone, an iPad, a laptop.

## Cases
1. PPH — atony after vaginal birth (preset). Expected: a NO on "Bleeding controlled?" brings escalation to the left panel.
2. PPH with severe preeclampsia (preset): methylergonovine caution, magnesium.
3. Optional: shoulder dystocia (clock-left variant) or severe hypertension (medication reminder asks "Still severe after dose?").

## Measures
| Measure | How |
| --- | --- |
| Time to first recorded action | Timeline export |
| Milestones missed or late | Timeline export (unacknowledged milestones) |
| Questions answered vs deferred, time to answer | Timeline export (Question due → answer) |
| Dose recording errors (wrong drug, wrong time) | Facilitator review against the scenario |
| Back-to-actions use, and whether the queued question was found again | Observation |
| Perceived workload and usability | NASA-TLX (raw) and SUS after each run |
| Free comments | 10-minute debrief |

## Acceptance tests to confirm in practice (from the build plan)
A1 dashboard in ≤ 2 taps · A2 question → NO → escalation with checklist intact · A3 Back to actions keeps the question queued · A4 dose given 3 min ago shows given and recorded times · A5 shoulder dystocia clock + log, minute marks as banners · A6 live session refuses time changes · A7 facilitator runs the whole case from Sim Master on one device · A8 reload / offline restores the session · A9 Larger text at 320 px.

## Decision rule
If any acceptance test fails in practice, or SUS < 68, change the design before Phase 9 sign-off. Record findings and changes in CLINICAL-REVIEW.md.

## Data
Exports contain elapsed times, task names and instructor notes only. No patient or participant identifiers. Delete exports after analysis per the simulation program's retention policy.
