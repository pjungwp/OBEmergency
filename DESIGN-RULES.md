# Design rules — OB Emergency Assist

These apply to every emergency module (PPH, severe hypertension, eclampsia, and anything added later), not just one screen.

## Principle

An active session is a **clinical cockpit**, not a scrolling dashboard. Reduce nonclinical vertical space; never shrink clinical text to fit more on screen.

## Active session: two display states (v2.1)

The workflow decides the screen, not a layout picker.

**State A — Decision Mode.** When a clinically reviewed trigger fires (`cockpit-config.js` → `DECISIONS`), the whole screen becomes one question (≤ 5 words) with two enormous answers. Answering records the decision, applies its branch and returns to the dashboard. **Back to actions** returns without recording anything; the question stays queued and shows as a chip in the status strip. The app never answers a question from a timer: triggers only ask. Y / N / Esc work on a keyboard.

**State B — Split Action Dashboard** (default whenever a session is active):

1. **Header**: back/menu, emergency icon + name, elapsed clock, SIMULATION / LIVE badge, ⋮ session menu (sound, larger text, sim clock, End).
2. **Status strip** (only when needed): queued question chip · overdue count · next reminder · Sim time.
3. **Banners** (P2): milestones and minute marks; never a takeover. **Alert card** (P1): reassessment or post-dose reminder with Assessed / Acknowledge / Snooze 1 min; after two snoozes it becomes a banner.
4. **Left (55%)**: the single most-urgent action — very large label, one big DONE / Assessed / Record dose / Started button. Selection order: pinned by the last decision → overdue → critical → in pathway order.
5. **Right (45%)**: checklist with NOW / DUE and ONGOING open, COMPLETED and UP NEXT collapsed with counts. Rows show pending (box), ongoing (spinner), completed (✓ + time), "Due now" pill. Tapping a row opens its status sheet (Done, Ongoing, Undo); medication rows open the dose confirmation.
6. **Tool bar** (bottom): Actions · Medications · Flowchart · Timeline · Team. On wide screens a tool replaces the checklist column; on phones it opens as a sheet. Actions returns to the checklist. Timeline holds reminders and events, plus Export. Team shows roles (live) or the SIM Master console (simulation).

Under 600 px the panels stack: most-urgent card first, checklist below. Switching branches never erases completed or ongoing work.

**Shoulder dystocia** uses the same dashboard with the clock on the left (time since head delivered, next maneuver, Baby delivered) and the maneuver log on the right (First line · Additional · Adjunct · Advanced rescue; tap to log, ×n for repeats, Undo).

**Medication confirmation** is a sheet, not a takeover: choose when it was given (Now / 1 / 2 / 5 / 10 min ago), confirm. Given time and recorded time are both kept; reminders run from the given time; dose limits block with a reason.

**Simulation** is the same cockpit with a teal SIMULATION badge and the Sim time controls. A jump that passes more than one event shows one summary instead of a burst of alerts. A live session cannot be paused or advanced (`clock.js` throws); "Advance time…" in a live session explains and offers Sim Master in a new tab.

## Time labels

There is one clock: **elapsed time since session start**. Every time shown is on that clock and labelled:

- `due at 05:00` — the elapsed time the item fell due
- `overdue 10:01` — how long past due, counting live
- `in 03:10` — time until due, counting live

Never show a bare time next to the elapsed clock without one of these labels.

## Type and touch sizes

| Element | Phone | Wide |
| --- | --- | --- |
| Decision question | 40–56 px | 56–88 px |
| YES / NO buttons | ≥ 96 px tall, 36–48 px text | up to 180 px tall, 48–64 px text |
| Most-urgent label | 30–36 px, 900 weight | 40–60 px |
| Most-urgent button | ≥ 72 px tall | ≥ 80 px tall |
| Shoulder dystocia clock | 72–100 px | 100–140 px |
| Checklist row | 18–20 px, ≥ 56 px tall | 20–22 px |
| Header clock | 26–30 px | 36–40 px |
| Any touch target | ≥ 44 px (≥ 48 px for actions) | same |

Word budgets: question ≤ 5 words, checklist name ≤ 3 words (tested), action ≤ 4–6 words. Meaning wins over brevity; detail moves into the row's sheet.

## Adaptive width

- **Under 600 px** (Fold outer screen, phones): stacked — most-urgent card, then checklist.
- **600 px and up** (Fold unfolded, tablets, laptops): 55 / 45 split. Same type sizes — extra width shows more context, not smaller text.
- **Tools are closed by default** on every width.

## Home dashboard

Six emergencies maximum. Phones: one column (scrolling is fine). From 600 px wide: two columns × three rows, all six visible without scrolling at common tablet, Fold-unfolded and laptop sizes.

## Flowcharts

One pathway record per emergency (`pathways.js`) drives three views (`flowchart.js`):

- **Overview** (default): every stage and branch on one scrolling map. Parallel actions sit side by side inside one "at the same time" box; decisions show labelled Yes/No outcomes. Nothing clinically essential is hidden.
- **Guided**: numbered steps with checklists. During a session, ticking a linked item is the same as tapping Done on its action card. Without a session, ticks stay on screen only. Decisions are explicit branch buttons; escalation is always one tap away in the step list.
- **Full chart**: SVG, sharp at any zoom; drag, pinch, wheel, ＋/−, Fit, fullscreen, Print/PDF. Every box opens its detail sheet by tap or keyboard.

Switching views never changes session or task state. A status strip (mode, clock, overdue, Actions) shows on the flowchart page whenever a session is running. In the cockpit, the Flowchart tab opens the side Overview on wide screens and the full pathway page on phones.

## Education

Every Education topic is a built-in slide deck (`edu-decks.js`): one idea per slide, short lines, no paragraphs. Slides open full-screen with swipe, ‹ › buttons, arrow keys and dots; the first slide is always a title. A test fails if a line runs long or a list passes six items. `EDUCATION[].sections` in `data.js` remains the reviewed long-form source; keep the decks in sync with it.

## Alerts

- Overdue items are visible without a tap (on the card or in the alert strip).
- Toasts in the cockpit: one at a time, short, at the top, never a second copy of something already on screen (milestones show as banners, not toasts).
- Levels: P0 question takeover · P1 alert card · P2 banner · P3 status count · P4 timeline only (`alerts.js`).
- Acknowledging a reminder never marks a task complete.
