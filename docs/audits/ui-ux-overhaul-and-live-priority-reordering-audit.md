# `UI/UX Overhaul & Live Priority Reordering` — Completion Audit

**Phase authorized:** by the project owner via `INBOX.md`, 2026-07-20,
overriding Phase 1's earlier "correct, not pretty" styling deferral now
that the data layer, Scheduler, and creation UI all exist and can be
tested. Written into `ROADMAP.md` as the Active Phase the same day
(commit `ab3358c`). The one architecturally load-bearing ambiguity
(what dragging to reorder priority should do to the Schedule) was
resolved via an explicit `AskUserQuestion` — "instantly regenerate."
**Audit written:** 2026-07-20
**Status:** Complete with noted exceptions

## Original Acceptance Gates

Verbatim from `ROADMAP.md`'s "UI/UX Overhaul & Live Priority Reordering"
phase, at the point this phase is being removed:

1. Every page's UI copy (labels, buttons, headings, error/validation
   messages) — Weekly View, `/items`, `/routines`, `/commitments` — is
   Traditional Chinese.
2. A cohesive warm, high-interactivity visual design (palette,
   typography, spacing, hover/active states) is applied consistently
   across all four pages, replacing the current unstyled/all-black look.
3. The add/edit flows for `Book`, `Course`, and `Routine` are visibly
   streamlined (clear primary action, less visual noise) within the new
   design, without removing any existing validation.
4. `/items` supports drag-and-drop reordering of `Trackable Item`
   `priority`; on drop, the new priority persists via the existing
   service layer and the current week's `Schedule` is **instantly
   regenerated** and reflected in the Weekly View.
5. Re-running schedule generation (via drag-drop or the existing
   "Generate Schedule" button) no longer creates duplicate `Time Slot`s
   for an already-placed `Fixed Commitment`/`Routine` occurrence this
   week — fixed as a prerequisite for #4 to be safely usable at all.
6. `npm run verify` passes.
7. A written manual walkthrough, recorded in `docs/audits/`, exercising:
   every page in Traditional Chinese, adding a `Book`/`Course`/`Routine`
   via the streamlined flow, dragging to reorder priority and observing
   the Weekly View update live with no duplicate slots.

## Evidence, Gate by Gate

### Gate 1: every page's UI copy is Traditional Chinese

All UI-layer-authored copy — headings, nav links, form labels, buttons,
status/badge text, hint paragraphs, and the UI layer's own
error-fallback strings — was translated across `src/app/page.tsx`,
`src/app/items/`, `src/app/routines/`, `src/app/commitments/`, and
`src/app/week.ts`'s `DAY_LABELS`.

Evidence: manually verified via `get_page_text` against the running dev
server for all four routes — every heading, nav link, form label, and
status message renders in Traditional Chinese (see the Follow-Up section
for the one deliberate exception).

### Gate 2: cohesive warm, high-interactivity visual design applied consistently

`src/app/globals.css` defines a full token system (coral/amber/teal
color roles, spacing/radius/shadow/motion scale, `Noto Sans TC`
typography) generated with the project's `ui-ux-pro-max` design skill
against the project owner's explicit direction ("warm motivated high
interactive vibe"). `src/app/page.module.css` — shared by all four pages
— consumes these tokens for buttons, cards, badges, forms, and the new
priority list, replacing the prior unstyled/all-black look.

Evidence: `npm run build` confirms the CSS module compiles cleanly;
manually inspected via DOM class names on the running dev server
(`page-module___8aEwW__priorityItem` etc. present with the new token-
driven styles). Full pixel-level visual screenshot could not be captured
this session — see Exceptions.

### Gate 3: streamlined Book/Course/Routine add/edit flows

The `priority` field was removed entirely from `/items`' add and edit
forms — `createTrackableItem` now defaults an omitted `priority` to
"last place" (`nextPriority()` in `src/server/trackable-items.ts`).
`/routines`' cadence/anchor/time-of-day fields and `/items`'
title/unit-count/status fields were restyled within the new design
system; no validation was removed (same service-layer calls, same
try/catch/`?error=` pattern).

Evidence: `trackable-items.test.ts` gained two tests for the new default-
priority behavior. Manually verified: created a `Book` through the
running app with no priority prompt — it appeared at the end of the
list (rank 11 of 11 at the time), then was deleted, restoring the prior
count.

### Gate 4: drag-and-drop priority reordering with instant regenerate

`src/app/items/priority-list.tsx` (a client component) renders the
`Trackable Item` list as a native HTML5 drag-and-drop list. On drop, it
calls `reorderItemsAction` (`src/app/items/actions.ts`) directly (not
through a `<form>`) — which persists the full new order via
`reorderTrackableItems` (one `prisma.$transaction`,
`src/server/trackable-items.ts`) and immediately calls `runScheduler`
for the current calendar week, then `router.refresh()`s. A live status
line reports slots added or "already up to date."

Evidence: `trackable-items.test.ts`'s `reorderTrackableItems` test
(persists sequential 1-indexed priorities in dropped order). A new
`src/app/items/actions.test.ts` exercises `reorderItemsAction`'s actual
composed code path end-to-end: reorders two `in-progress` books,
confirms `addedSlotCount > 0` on the first call, then confirms a second
identical call adds zero further slots (`prisma.timeSlot.count()`
unchanged) — proving both "persist + instantly regenerate" and its
idempotency without a live mouse gesture. The DOM's `draggable="true"`
attribute and drag-state class names were confirmed present on the
running dev server. The native drag *gesture* itself could not be
exercised via a live pointer/mouse simulation this session — see
Exceptions.

### Gate 5: re-run idempotency (duplicate-slot fix)

`hasExistingOccurrence` (`src/scheduler/hard-constraints.ts`) is now
checked by both `placeFixedCommitments` and `placeRoutines`
(`routine-placement.ts`) before placing an occurrence, skipping a day
that already has one from a prior run. `placeFlexibleTrackableItems`
(`flexible-placement.ts`) independently skips any item that already has
a session this week — a duplication case not previously documented in
`docs/status.md`'s Known Limits but required for gate 4's "instantly
regenerate on every drop" to be safe (discovered while implementing
gate 4, not originally scoped in isolation — see Follow-Up).

Evidence: three new unit tests (`hard-constraints.test.ts`,
`routine-placement.test.ts`, `flexible-placement.test.ts`), all passing.
Manually verified against the running dev server: clicked "產生課表"
(Generate Schedule) twice in a row for the same week and compared full
page text — byte-identical output both times, including the two
pre-existing duplicate `Algorithms Lecture` *data* records (a leftover
from earlier manual QA, correctly flagged as a real conflict both times,
not a Scheduler bug).

### Gate 6: `npm run verify` passes

```
npm run verify
```

passes clean: lint, typecheck, 129 tests (12 test files, up from 121/11
at Phase 4's close), and `next build`.

### Gate 7: written manual walkthrough

This document's Evidence sections above, plus: this session's
Browser-pane screenshot/computer (pointer) tools timed out repeatedly and
consistently across multiple retries, independent of the app itself —
`preview_logs` and the browser console stayed clean (HTTP 200s, no
errors) throughout. `get_page_text`, `read_page`, `navigate`, and
`javascript_tool` (used only for inspection/dispatching real DOM events
and `form.requestSubmit()` — never to implement or patch app behavior)
all worked normally and were used for this walkthrough instead. One
attempt to dispatch a synthetic native `DragEvent` sequence via
`javascript_tool` appears to have put the browser into a stuck internal
drag state (a subsequent unrelated `javascript_tool` call also timed
out); recovered cleanly via `navigate` with no lasting effect and no app
state was mutated by the stuck attempt.

## Exceptions / Deviations

- **Service-layer thrown error messages remain in English** (e.g.
  `WipLimitExceededError`, `Routine`/`Fixed Commitment` validation
  messages surfaced verbatim in `?error=` banners). Only UI-layer-authored
  copy was translated — changing service-layer strings would touch
  business-logic code asserted on by existing tests (e.g.
  `trackable-items.test.ts` matches `WipLimitExceededError`'s message via
  regex), which was judged out of proportion for this phase. Recorded as
  a Known Limit in `docs/status.md`.
- **Drag-and-drop has no touch/mobile fallback** (native HTML5 DnD only).
  Consistent with the bootstrap platform decision (local web app first,
  desktop-first) — not a regression, a scope boundary. Recorded as a
  Known Limit in `docs/status.md`.
- **The native drag gesture itself was not exercised via a live
  pointer/mouse simulation**, per the Gate 4 and Gate 7 evidence above —
  a tooling limitation this session (Browser-pane screenshot/computer
  timeouts unrelated to the app), not an untested code path: the
  persist-and-instantly-regenerate pipeline the gesture triggers is
  covered end-to-end by a new permanent test
  (`src/app/items/actions.test.ts`), and the DOM wiring (`draggable`,
  event handlers) was confirmed present and structurally correct.
- **Full pixel-level visual verification (screenshot) of the new warm
  design was not captured** this session for the same tooling reason.
  Verified instead via successful `next build` compilation of the CSS
  module and DOM class-name inspection confirming the new token-driven
  classes are applied.
- **`placeFlexibleTrackableItems`'s idempotency fix** (Trackable Item
  sessions, not just Fixed Commitment/Routine occurrences) was discovered
  as a necessary prerequisite while implementing gate 4, not called out
  by name in the original exit condition's gate 5 wording (which named
  only Fixed Commitment/Routine). Included because "instantly regenerate
  on every drag" would otherwise have stacked duplicate sessions for any
  already-scheduled book/course on every drop.

## Follow-Up

- No new `ROADMAP.md` proposals came out of this phase. `ROADMAP.md`'s
  Active Phase is now empty again — every remaining "Proposed" entry
  (calendar export/sync, notifications/reminders, mobile companion view)
  still needs a human-written goal and exit condition before the phase
  loop can continue.
- Service-layer error-message localization (see Exceptions above) is
  unscoped follow-up work, not part of this phase — would need a
  deliberate decision on how to keep it from breaking existing
  message-matching tests (e.g. a separate user-facing message vs.
  internal `Error.message`).
- `FRAMEWORK_FEEDBACK.md` gained no entries during this phase — nothing
  to harvest.
