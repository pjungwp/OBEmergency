# Sim Master 2.0 — rebuild plan status

Source: "OB Emergency Assist — Sim Master 2.0 Master Rebuild Plan" (Nov 2026) with the Progressive Disclosure amendment, which is now a mandatory app-wide rule in DESIGN-RULES.md.

| Phase | Status | Where |
| --- | --- | --- |
| 1 · Refactor into modules | Done | `sim-scenarios.js` (definitions + context), `sim-engine.js` (state machine, session/event store, observations, injects, debrief + exports), `sim-sync.js` (sync adapter), `sim-master.js` (UI only) |
| 2 · Compact cockpit, offline, one device | Done | Header + vitals strip + state + 2–3 transitions + critical observations always visible; dock; collapsed secondary/reference sections; inject drawer |
| 3 · Event logging and debrief | Done | Sim + wall-clock timestamps, undo, notes, timeline, strengths/opportunities/not documented, instructor summary, CSV / JSON / PDF |
| 4 · Collaborative sessions | Not started — needs a Firebase (or Supabase) project | Implement `sim-sync.js` network adapter: session code / QR join, roles (observer, confederate, learner display, debrief facilitator), one authoritative master, append-only events, offline queue + reconcile, connection status and last sync |
| 5 · Scenario authoring and validation | Validation done (`validate()` + tests); editor not started | Structured editor that writes scenario JSON and runs the same validation |
| 6 · Usability and simulation testing | Not started | Scripts in the plan: phone-only PPH, instructor + observer, rapid deterioration, rapid observations, network loss, full debrief export, changing scenarios |

## Acceptance criteria — current state (single device)

- Patient state and key vitals visible without scrolling: yes (checked at 360 × 740 across all 21 scenario/level runs).
- Common transition ≤ 2 taps: 1 tap. Critical observation: 1 tap. Common inject: 2 taps (Inject → Now).
- Pause or end from any cockpit screen: dock.
- Undo restores the prior state without corrupting the log: tested (`tests/sim-engine.test.mjs`).
- Debrief never invents missed actions: unchecked = not documented; untriggered = not applicable.
- Clinical content versioned and reviewable: scenario `version` + `reviewed` (null until review), shown in UI and exports.
- Collaborative consistency through reconnection: pending phase 4.

## Sim Master 3.0 (Nov 2026) — built on preview

| Plan item | Status |
| --- | --- |
| Prebrief workspace (handoff, read-aloud briefing, role chips, room ready checks, objectives, one Start) | Done |
| Monitor status + on-device learner monitor (separate window on Netlify only) | Done |
| Cockpit: flow map, prompt card (Say / Prompt if needed, Delivered / Skip, More information) | Done |
| Context-aware prompts: per-state line + overdue-action nudges, lag by level, hide when recorded | Done (content DRAFT) |
| Emergency-specific status tiles (bleeding; seizure + magnesium; head-to-body + maneuvers; delivery by 5 min) | Done |
| Action states: tap = done; long-press = partial / not performed / N/A; undo keeps the audit event | Done |
| Focus / Parallel: facilitator choice in ⋯ tools, app marks the suggested one, never switches itself | Done |
| Facilitator tools menu (hold, jump, set vitals, time, monitor) | Done |
| Back / leave: Resume · Pause and leave · End; auto-pause in background; update announced, never mid-session | Done |
| Layout checked at 320×700, 360×740, 390×844, 768×1024, 1200×800, 1440×900 (no horizontal scroll) | Done |
| Netlify + Apps Script from one source (pipeline.yml, DEPLOYMENT.md) | Done; Google needs one-time setup |
| Shared multi-device sessions (network sync adapter) | Not started |
| Clinical review of say lines, nudges, timings | Needed before teaching use |
