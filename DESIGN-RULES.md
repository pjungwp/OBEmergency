# Design rules — OB Emergency Assist

These apply to every emergency module (PPH, severe hypertension, eclampsia, and anything added later), not just one screen.

## Principle

An active session is a **clinical cockpit**, not a scrolling dashboard. Reduce nonclinical vertical space; never shrink clinical text to fit more on screen.

## Active-session layout (top to bottom)

1. **Cockpit header** (sticky, ~85 px): mode tag (SIMULATION / CLINICAL), emergency name, elapsed clock, sound, End. One status line: overdue count + next reminder.
2. **Simulation** uses the identical cockpit. The only differences: a teal SIMULATION tag (instead of red CLINICAL), a teal top rule, and a "Sim time" button on the status line that opens Pause / +1 / +5 / Jump to next event in a sheet. The button turns solid teal and reads "Paused" while the clock is stopped.
3. **Alert strip**: overdue reminders not tied to a task card (milestones, post-dose reassessment). Shows the most overdue item in full; `+N` opens the rest. Never collapsed.
4. **Tool tabs**: Flowchart · Meds · Timers · Timeline (44 px).
5. **Actions**: a `DUE NOW` group first (overdue task cards, red), then the pathway groups. Overdue tasks and the first open group are full cards with their buttons. Every later task is a one-line row (title + status + chevron); tapping it expands it into a full card, one at a time, and it collapses again once completed.

Focus mode is the default: once a session starts, the app header, disclaimer and bottom navigation are hidden. Disclaimers live on the start screen. The simulation indicator (teal tag + striped header) is always visible while simulating.

## Time labels

There is one clock: **elapsed time since session start**. Every time shown is on that clock and labelled:

- `due at 05:00` — the elapsed time the item fell due
- `overdue 10:01` — how long past due, counting live
- `in 03:10` — time until due, counting live

Never show a bare time next to the elapsed clock without one of these labels.

## Type and touch sizes

| Element | Size |
| --- | --- |
| Main action text | 20–22 px, bold |
| Supporting text | ≥ 16 px |
| Section / group labels | 13–15 px |
| Buttons | 15–17 px text, ≥ 44 px tall; task completion buttons ≥ 48 px |
| Card padding | 10–14 px |
| Gap between cards | 6–8 px |
| Elapsed clock | 30–34 px |

## Adaptive width

- **Under 760 px** (Fold outer screen, phones): single column.
- **680 px and up** (Fold unfolded, tablets): actions use the full width. The Flowchart tab opens a sticky right-hand panel (flowchart + recent events) and closes it again. Same type sizes — extra width shows more context, not smaller text.
- **Flowchart is closed by default** on every width. On narrow screens the tab opens it in a sheet over the cockpit.

## Home dashboard

Six emergencies maximum. Phones: one column (scrolling is fine). From 600 px wide: two columns × three rows, all six visible without scrolling at common tablet, Fold-unfolded and laptop sizes.

## Cockpit tools column

Flowchart · Meds · Timers · Timeline are toggles for one tools panel. Wide screens: the right-hand column (tap the active button to close). Phones: the same panel as a sheet over the cockpit. None of them leaves the session. Meds lists the pathway's drugs first; a drug opens its card, where a dose can be recorded.

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
- Toasts in the cockpit: one at a time, short, never a second copy of something already on screen.
- Acknowledging a reminder never marks a task complete.
