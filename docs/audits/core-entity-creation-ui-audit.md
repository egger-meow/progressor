# `Core Entity Creation UI` — Completion Audit

**Phase authorized:** by the project owner directly in chat, 2026-07-18,
after testing the running app and choosing this over the three
pre-existing `ROADMAP.md` "Proposed" phases (calendar export/sync,
notifications/reminders, mobile companion view) specifically because
none of those addressed the actual blocker to testing the product:
there was still no UI to create a `Book`/`Course`/`Routine`/`Semester
Commitment`, only `Time Slot` placement. Written into `ROADMAP.md` as
the Active Phase the same day (commit `f281598`).
**Audit written:** 2026-07-18
**Status:** Complete with noted exceptions

## Original Acceptance Gates

Verbatim from `ROADMAP.md`'s "Core Entity Creation UI" phase, at the
point this phase is being removed:

**Goal:** give the user real, persistent UI — reachable through the
running app alone, no direct DB access, no temporary seed route — to
create, edit, and delete `Trackable Item` (`Book`/`Course`), `Routine`,
and `Semester Commitment` (`Fixed Commitment`/`Deadline Task`) records.
Every prior phase's manual walkthrough has had to fall back on a
throwaway `src/app/api/dev-seed/` route (deleted before each commit)
specifically because this UI didn't exist; closing that gap is what
finally lets the product be tested as itself, not through a debug
backdoor.

**Exit condition (phase gate):** through the running app alone, a human
can create, edit, and delete a `Book`, a `Course`, a `Routine`, a `Fixed
Commitment`, and a `Deadline Task` — each with its service layer's
existing validation (e.g. `WIP Limit` enforcement, cadence-specific
anchor ranges, `startTime < endTime`) surfaced as a visible error instead
of a crash; deleting a record still referenced by an existing `Time Slot`
does not corrupt or crash the Weekly View (the slot's occupant label
degrades gracefully, per `time-slots.ts`'s existing `occupantLabel`
fallback); `npm run verify` passes; a written manual walkthrough exercising
all of the above is recorded in `docs/audits/`.

## Evidence, Gate by Gate

### Gate: create/edit/delete a Book and a Course through the running app

`/items` (`src/app/items/page.tsx`, `src/app/items/actions.ts`) lists
every `Trackable Item`, with a create form and a per-record
`?edit=`-toggled edit form plus a delete button, calling directly into
`src/server/trackable-items.ts`'s `createTrackableItem`/
`updateTrackableItem`/`removeTrackableItem` (the last of these new this
phase — `create`/`update`/`get`/`list` already existed).

Evidence: `trackable-items.test.ts` gained `removeTrackableItem` tests
(deletes an existing item; throws on an unknown id). Manually verified
against the running dev server: created a `Book` ("Test Book Zzz"),
edited its title/`unitsCompleted` and confirmed the change persisted and
displayed, edited its `status` to `"in-progress"` and confirmed it
succeeded (within the configured `WIP Limit`), then deleted it and
confirmed it left the list.

### Gate: create/edit/delete a Routine through the running app

`/routines` (`src/app/routines/`) follows the same pattern against
`src/server/routines.ts`, adding `removeRoutine`. `anchor` is entered as
a comma-separated list rather than a full weekday/day-of-month picker
grid — see Exceptions below.

Evidence: `routines.test.ts` gained `removeRoutine` tests. Manually
verified: created a weekly `Routine` with anchor `[2,4]` and a
`morning` time-of-day preference, confirmed it displayed correctly, then
deleted it.

### Gate: create/edit/delete a Fixed Commitment and a Deadline Task through the running app

`/commitments` (`src/app/commitments/`) renders both kinds as two
separate sections/forms (per `domain-model.md`'s non-interchangeable
framing), calling `src/server/semester-commitments.ts`'s existing
create/update functions plus this phase's new `removeFixedCommitment`/
`removeDeadlineTask`.

Evidence: `semester-commitments.test.ts` gained tests for both remove
functions (delete each kind; throw on an unknown id for either).
Manually verified: created a `Fixed Commitment` and a `Deadline Task`,
edited the `Fixed Commitment`'s title and confirmed it persisted, then
deleted both.

### Gate: existing service-layer validation surfaces as a visible error, not a crash

Every create/update Server Action wraps its call in try/catch and
redirects back to the same page with `?error=<message>`, the identical
pattern already established by the Weekly View (`src/app/actions.ts`)
in Phase 1.

Evidence: manually triggered two distinct validation errors against the
running dev server and confirmed both surfaced as a visible banner with
nothing created: a `Routine` with `cadence: "weekly"` and a blank anchor
(`"cadence \"weekly\" requires a non-empty anchor"`), and a `Fixed
Commitment` with `startTime` after `endTime`
(`"startTime (15:00) must be before endTime (14:00)"`). `WIP Limit`
rejection itself is covered by `trackable-items.test.ts` (pre-existing,
still passing); the update action that would surface it uses the same
try/catch/redirect path already proven for the two errors above.

### Gate: deleting a referenced record doesn't corrupt or crash the Weekly View

`occupantId` was never a real foreign key (sqlite/Prisma has no
polymorphic relation support — `time-slots.ts`'s existing comment), so
this was already safe at the data layer; this phase is what first
exercises and documents it.

Evidence: a new dedicated test in `time-slots.test.ts` creates a
`TrackableItem`, gives it a `Time Slot`, deletes the item via
`removeTrackableItem`, and asserts `listTimeSlotsWithLabels` returns
`"(deleted trackable item)"` for that slot rather than throwing.
Manually verified against the running dev server: deleted a `Book` that
had a `Time Slot` on a future week; the Weekly View rendered correctly
afterward, with only that slot's label changed to `"(deleted trackable
item)"` and every other `Time Slot` (Fixed Commitments, Routine
occurrences, other items' sessions) unchanged.

### Gate: `npm run verify` passes; fixture-based tests plus a written walkthrough both pass

`npm run verify` (lint, typecheck, 121 tests, `next build`) passes clean
as of commit `f322597`. The written walkthrough is the manual browser
verification described gate-by-gate above, executed against
`http://localhost:3000` via the Browser tool; no temporary seed route
was needed for this phase's own verification (unlike Phases 1-3) since
the routes being tested are themselves the creation mechanism — though
pre-existing data from earlier phases' temporary seed routes was still
present in the local dev database and is visible in the walkthrough
evidence above (e.g. "Manual QA Book", "Book A (in progress)").

## Exceptions / Deviations

- **`Routine` anchor input is a comma-separated text field, not a
  weekday/day-of-month picker grid.** `ROADMAP.md`'s exit condition
  didn't specify the input widget, only that creation/edit/delete work
  through the UI — a full picker grid was judged unnecessary polish for
  a field that's edited occasionally, not a frequent-input one. Kept
  deliberately simple, same "correct, not pretty" bias as Phase 1's
  styling decision.
- **No UI to configure a `WIP Limit`.** Out of this phase's scope (the
  exit condition names `Trackable Item`/`Routine`/`Semester Commitment`
  only) — `WIP Limit` is a cross-cutting setting, not one of the five
  named record kinds. Recorded as a Known Limit in `docs/status.md`,
  not silently left undocumented.
- **A stale `.next` build cache was corrupted mid-walkthrough** by
  deleting the directory while the dev server had it open (`rm -rf
  .next` while `preview_start` was running) — surfaced as a real
  `500 Internal Server Error` on `/items`, not a code defect. Fixed by
  stopping the server, clearing `.next`, and restarting cleanly before
  continuing the walkthrough; noted here since it interrupted the
  evidence-gathering sequence, not because it reflects application
  behavior.

## Follow-Up

- No new `ROADMAP.md` proposals came out of this phase. `ROADMAP.md`'s
  Active Phase is now empty again — every remaining "Proposed" entry
  (calendar export/sync, notifications/reminders, mobile companion view)
  needs a human-written goal and exit condition before the phase loop
  can continue.
- `FRAMEWORK_FEEDBACK.md` gained no entries during this phase — nothing
  to harvest.
