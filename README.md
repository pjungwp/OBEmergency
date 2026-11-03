# OB Emergency Assist — master build

Phone-first clinical-reference and simulation prototype for postpartum hemorrhage, acute severe hypertension, eclampsia and cardiac red flags in pregnancy/postpartum. The first release is a Netlify-hosted, single-device app. Google Workspace synchronization is intentionally parked until the one-phone simulation pilot is validated.

## What is included

- Immediate large-text emergency actions
- `i` explanations without leaving the active session
- To do → In progress/Ongoing → Done task states
- Repeating assessment timers
- Drug-specific reassessment timers started only after confirmed administration
- Step-by-step severe-BP medication pathways with enforced limits
- Magnesium loading/maintenance status and toxicity table
- Clinical and Simulation modes
- Simulation Pause, +1 minute, +5 minutes and Next event controls
- Five-, ten-, and fifteen-minute team-coordination milestones
- One-tap flowcharts
- Searchable medication cards with dosing, cautions and monitoring
- TeamSTEPPS, roles, 4 Ts, severe-hypertension, magnesium-safety, pregnancy-status and cardiovascular education
- Local event timeline
- Offline caching after the first successful load
- Network-first clinical updates with an explicit reload banner
- Screen wake lock during active sessions, with missed-reminder recovery on return
- Tiny-iPhone-first layout with large action text and 44 px minimum controls
- Bridge-style header with larger-text, share, install and avatar/About controls
- Collapsible dashboard landing pages for flowcharts, medications and education
- Phone-first JPEG flowcharts with fit-to-screen and magnification controls

## Release order

1. **Netlify first:** deploy the repository root as a static app. No build command is required.
2. **Google Workspace later:** keep the adapter packaged but do not deploy synchronized sessions until the single-device simulation gate and institutional approvals are complete.

This implements the groundwork in [OBEmergency issue #1](https://github.com/pjungwp/OBEmergency/issues/1) without delaying the Netlify release.

## Deploy to Netlify

### Drag-and-drop

1. Unzip the release package.
2. In Netlify, choose **Add new site → Deploy manually**.
3. Drag the entire unzipped folder—not the ZIP itself—into Netlify.
4. Open the resulting HTTPS URL once while online so the offline cache installs.

### GitHub

1. Commit every file in this folder to the repository root.
2. Connect the repository in Netlify.
3. Build command: leave blank.
4. Publish directory: `.`

## Verify the release

```bash
npm test
npm run build:gas
```

The tests cover clinical dose sequences and limits, magnesium thresholds, emergency content, safer offline routing, duplicate-event idempotency, stale-revision rejection, timer restoration and simulation-time restoration.

## Optional Google Workspace build

The Apps Script package is generated from the same source UI:

```bash
npm run build:gas
cd google-apps-script
clasp create --type webapp --title "OB Emergency Assist"
clasp push
```

`google-apps-script/Index.html` is generated locally and intentionally not committed because the flowchart images are embedded into that file for Apps Script hosting.

To link an existing Apps Script project instead, create a local `.clasp.json` with its Script ID, then run `clasp push`. The file is ignored by Git. In Apps Script, deploy as a web app only after approving execution identity and access settings for the intended Workspace group.

The Workspace adapter uses stable event IDs, revisions, Apps Script locking and polling. The server log stores coordination state only; medication details and the local timeline remain on-device. Do not enter PHI, commit Script IDs/tokens, or treat the event sheet as a medical record.

## Master implementation plan

### Release 0 — content governance

- Assign physician, nursing, pharmacy, anesthesia, blood bank and informatics owners.
- Replace all local-policy placeholders.
- Approve medication preparations, timers, escalation wording and contact paths.
- Maintain a content register with source, owner, approval date, next review and change history.

### Release 1 — Netlify single-device pilot

- Complete clinical review of PPH, severe hypertension and eclampsia.
- Conduct scripted usability testing on iPhone, Android, small phone and tablet.
- Test online/offline behavior, interrupted sessions, screen rotation and alert readiness.
- Run simulation-only testing before any clinical pilot.
- Display **Single-device** and **Simulation** labels unmistakably.

### Release 1.1 — clinical workflow refinement

- Add approved Holy Name activation language and contacts.
- Add role-specific views only if they do not hide the complete action pathway.
- Add local equipment/device preparation cards.
- Add printable reviewed flowcharts and version/update notice.
- Decide whether a session summary may be exported; never imply EHR documentation.

### Release 2 — Google Workspace synchronized sessions

- Preserve the UI, content model, task engine and event names.
- Add a `WorkspaceSessionStore` beside the current browser-local store.
- Start/join sessions through a short code and QR link.
- Store append-only events and a revision number in a protected Workspace data store.
- Use Apps Script locking for concurrent changes.
- Poll for new revisions and show Connected / Syncing / Offline / Stale states.
- Keep one authoritative start time and derive every device clock from it.
- Add participant name/initials and role without requiring task assignment.
- Automatically expire and delete sessions; begin without PHI.

### Release 3 — validation and governance

- Concurrent-device testing with 3–8 phones.
- Network testing on hospital Wi-Fi, managed devices and cellular service.
- Human-factors simulation with nurses, residents, attendings and anesthesia.
- Downtime and stale-data drills.
- Formal institutional approval, privacy/security review and release sign-off.
- Quarterly source surveillance and defined urgent-update process.

## Shared-session event contract

The synchronized version should transmit events rather than overwrite an entire dashboard:

- `SESSION_STARTED`
- `TASK_STARTED`
- `TASK_MARKED_ONGOING`
- `TASK_COMPLETED`
- `TASK_REOPENED`
- `ASSESSMENT_RECORDED`
- `MEDICATION_ADMINISTERED`
- `TIMER_ACKNOWLEDGED`
- `SIMULATION_TIME_ADVANCED`
- `SESSION_ENDED`

Each event requires `eventId`, `sessionId`, `taskId`, `type`, `status`, `actor`, `occurredAt`, `schemaVersion`, `revision` and a minimal payload. Duplicate IDs are ignored and stale revisions cannot overwrite the authoritative session.

## Important limitations

- Prototype only; not approved clinical decision support.
- No patient identifiers.
- The app requests a screen wake lock during an active session and reports reminders crossed while hidden. The browser or operating system can still suspend audio/background execution, so it is not a replacement for approved clinical alarms.
- Current sessions are local to one browser and are not shared.
- The timeline is not documentation in the medical record.
- Hospital protocols and clinician judgment supersede the prototype.

## Source files used for the prototype

- ACOG Practice Bulletin No. 183: Postpartum Hemorrhage (2017)
- ACOG Clinical Practice Update: Use of Nonsurgical Hemorrhage-Control Devices (2025)
- ACOG Practice Bulletin No. 222: Gestational Hypertension and Preeclampsia (2020)
- ACOG emergency algorithms for postpartum hemorrhage, acute hypertension, eclampsia and cardiovascular disease
- AHRQ TeamSTEPPS 3.0 curriculum

Do not publish the supplied copyrighted PDFs inside the public repository unless distribution permission has been confirmed.
