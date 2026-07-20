# Status

Source of truth for current, actually-implemented behavior. If this doc and
the running code disagree, the code wins and this doc is out of date — fix
the doc as part of whatever change you're making, don't leave the drift for
later.

**Bootstrap state:** the Next.js + TypeScript + Prisma/SQLite + Vitest +
ESLint scaffold exists and the task gate passes on it. Every domain
concept from `docs/domain-model.md` is persisted at the data layer, the
manual Weekly View (`Schedule`) is the primary UI-layer surface, and the
`Scheduler` (`src/scheduler/`) both generates a `Schedule` from scratch
(`computeSchedule`, Phase 2) and locally repairs one for a disruption
(`repairSchedule`, Phase 3 — see "Repair" below). Every domain record
(`Book`/`Course`, `Routine`, `Fixed Commitment`, `Deadline Task`,
`Ad-hoc Event`) now has real creation/edit/delete UI (Phase 4), closing
the gap that previously forced every phase's manual walkthrough to rely
on a temporary, non-shipped seed route. The UI is now Traditional
Chinese with a warm, interactive visual design and live drag-and-drop
priority reordering (Phase 5 — see "UI/UX Overhaul & Live Priority
Reordering" below). Phases 1-5 are closed; see `docs/audits/` for their
completion evidence.

## Verification Gates

### Task Gate

Established. From the repo root:

```bash
npm run lint
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run build
```

bundled as `npm run verify`. No task in the task loop may be claimed done
without this command passing clean (see `../LOOP_ENGINEERING.md`, "Two
verification gates").

### Phase Gate

#### Phase 1 — Data Layer & Manual Weekly View (closed)

1. `npm run verify` passes.
2. A written manual walkthrough, executed and recorded in a
   `docs/audits/` entry, that exercises every bullet in the phase's exit
   condition: create a `Book`/`Course`, restart the app and confirm the data
   persisted, exceed a `WIP Limit` and confirm it's rejected (not silently
   allowed), create a `Routine` and a `Semester Commitment` of both kinds,
   navigate the Weekly View across 上週/本週/下週, and manually add/edit/
   remove a `Time Slot` without corrupting a neighboring one.

Passed; see
[`docs/audits/data-layer-manual-weekly-view-audit.md`](audits/data-layer-manual-weekly-view-audit.md).

#### Phase 2 — Constraint-Based Auto-Scheduler v1 (closed)

1. `npm run verify` passes.
2. Given a realistic fixture data set (a mix of books, courses, routines,
   and semester commitments), `src/scheduler/index.ts`'s `computeSchedule`
   produces a weekly `Schedule` where every `Fixed Commitment` and
   undischarged `Deadline Task` is honored, no `WIP Limit` is violated, no
   two non-Slack items double-book the same `Time Slot`, and a documented
   minimum share of each day is left as `Slack`.
3. A written manual walkthrough against the running app (not just
   fixtures), executed and recorded in a `docs/audits/` entry.

Passed; see
[`docs/audits/constraint-based-auto-scheduler-v1-audit.md`](audits/constraint-based-auto-scheduler-v1-audit.md).

#### Phase 3 — Elastic Re-Scheduling & Ad-hoc Events (closed)

1. `npm run verify` passes.
2. A documented set of disruption scenarios (skip today's reading session,
   insert a same-day `Ad-hoc Event`, mark a `Chapter`/`Video` done early)
   each produce a correctly repaired `Schedule` when re-run, verified
   against expected fixture output (`src/scheduler/repair.test.ts`).
3. The repair operation has a documented, interactively-fast time budget
   (see "Repair" below).
4. The existing Phase-1 manual-edit guarantee (one edit never corrupts
   another `Time Slot`) still holds.
5. A written manual walkthrough against the running app (not just
   fixtures), executed and recorded in a `docs/audits/` entry.

Passed; see
[`docs/audits/elastic-re-scheduling-and-ad-hoc-events-audit.md`](audits/elastic-re-scheduling-and-ad-hoc-events-audit.md).

#### Phase 4 — Core Entity Creation UI (closed)

Authorized by the project owner in chat (2026-07-18), choosing it over
the three pre-existing `ROADMAP.md` "Proposed" phases specifically to
unblock manual testing of the product itself — every prior phase's
walkthrough had relied on a throwaway `src/app/api/dev-seed/` route.

1. `npm run verify` passes.
2. Through the running app alone, a human can create, edit, and delete a
   `Book`, a `Course`, a `Routine`, a `Fixed Commitment`, and a `Deadline
   Task` — each with its service layer's existing validation surfaced as
   a visible error instead of a crash.
3. Deleting a record still referenced by an existing `Time Slot` does not
   corrupt or crash the Weekly View.
4. A written manual walkthrough exercising all of the above, recorded in
   `docs/audits/`.

Passed; see
[`docs/audits/core-entity-creation-ui-audit.md`](audits/core-entity-creation-ui-audit.md).

#### Phase 5 — UI/UX Overhaul & Live Priority Reordering (closed)

Authorized by the project owner via `INBOX.md` (2026-07-20), overriding
Phase 1's "correct, not pretty" styling deferral.

1. Every page's UI copy is Traditional Chinese.
2. A cohesive warm, high-interactivity visual design is applied
   consistently across all four pages.
3. The `Book`/`Course`/`Routine` add/edit flows are visibly streamlined.
4. `/items` supports drag-and-drop `priority` reordering that instantly
   regenerates the current week's Schedule on drop.
5. Re-running schedule generation no longer creates duplicate `Time
   Slot`s for an already-placed `Fixed Commitment`/`Routine`/`Trackable
   Item` occurrence this week.
6. `npm run verify` passes.
7. A written manual walkthrough, recorded in `docs/audits/`.

Passed; see
[`docs/audits/ui-ux-overhaul-and-live-priority-reordering-audit.md`](audits/ui-ux-overhaul-and-live-priority-reordering-audit.md).

No phase is currently active — see `../ROADMAP.md`'s "Proposed — Not Yet
Authorized" section for what's left to authorize.

## Current Behavior

The Next.js app scaffold exists (`src/app/`). Prisma is wired to a local
SQLite file via `src/server/db.ts` (a cached client singleton, safe under
Next.js dev-mode hot reload). Real Progressor-specific UI now exists at
`/` (Weekly View), `/items`, `/routines`, and `/commitments` — see "Core
Entity Creation UI (Phase 4)" below for the latter three.

`Trackable Item` (`Book`/`Course`) is implemented end-to-end at the data
layer: `prisma/schema.prisma`'s `TrackableItem` model plus
`src/server/trackable-items.ts`'s `createTrackableItem` /
`updateTrackableItem` / `getTrackableItem` / `listTrackableItems`. `type`
and `status` are plain strings validated at the service layer (sqlite has
no native enum support in Prisma). `WIP Limit` is enforced independently per
`type` via the `WipLimit` model and `getWipLimit`/`setWipLimit`: creating or
updating an item to `status = "in-progress"` beyond the configured limit
throws `WipLimitExceededError` rather than silently succeeding; the default
limit (3, `DEFAULT_WIP_LIMIT`) is an inferred placeholder, not a value the
user chose — `setWipLimit` overrides it per type. No UI exists yet to
create or edit `Trackable Item`s directly (see the Weekly View paragraph
below for what UI does exist).

`Routine` is implemented (`src/server/routines.ts`): `cadence` is
`"daily" | "weekly" | "monthly"`; `anchor` is a JSON-encoded array of
integers whose valid range depends on `cadence` (weekday(s) 0-6 for
weekly, day(s)-of-month 1-31 for monthly, unused for daily) — the service
layer parses/serializes it so callers work with plain `number[]`.
`timeOfDayPreference` is one of `"morning" | "afternoon" | "evening" |
"night"`; an explicit hour-range alternative mentioned in
`domain-model.md` is not implemented (Phase 1 doesn't require it — flagged
as a scope-narrowing decision, not a user answer).

`Semester Commitment`'s two kinds are implemented as separate models and
separate service modules, deliberately not sharing a type or a
create/update function (`src/server/semester-commitments.ts`):
`FixedCommitment` (`dayOfWeek` 0-6, `startTime`/`endTime` as `"HH:mm"`,
validated so `startTime < endTime`) and `DeadlineTask` (`dueAt`,
`estimatedDays`). Passing one kind's shape to the other's create function
is rejected at runtime, not just by the type checker.

`Ad-hoc Event` (`src/server/ad-hoc-events.ts`) and `Time Slot`
(`src/server/time-slots.ts`) are implemented. A `TimeSlot` has
`occupantType` (one of `"routine" | "fixed-commitment" | "deadline-task" |
"trackable-item" | "ad-hoc-event" | "slack"`) and `occupantId`; since
sqlite/Prisma has no polymorphic relation support, `occupantId` isn't a
foreign key — `createTimeSlot`/`updateTimeSlot` instead query the
corresponding table directly to confirm the referenced record exists,
rejecting a dangling reference rather than silently storing it.
Overlapping `Time Slot`s are allowed on purpose: the charter's guardrail
that an `Ad-hoc Event` always outranks flexible work, and that the user can
always override a slot, both presuppose two things can want the same time
— resolving that is a Phase 2 `Scheduler` concern, not a Phase 1 storage
constraint. Editing or removing one `Time Slot` never touches another
(verified directly by test, not just by the absence of a relation).

`Schedule` (the Weekly View, `src/app/page.tsx`) is implemented as the root
route: it renders 本週 by default from real `TimeSlot` data (via
`listTimeSlotsWithLabels`, a service-layer helper in
`src/server/time-slots.ts` that resolves each slot's occupant to a
human-readable label so the UI never has to know how each occupant kind is
looked up), and `← 上週` / `本週` / `下週 →` navigate via a `?week=` query
param holding the Monday date of the displayed week (date math in
`src/app/week.ts`, pure functions, no Prisma access). Every `Time Slot` can
be added, edited, or removed by hand: `src/app/actions.ts` holds three
Server Actions (`createTimeSlotAction`/`updateTimeSlotAction`/
`deleteTimeSlotAction`) that call directly into `src/server/time-slots.ts`
— the UI layer still never touches Prisma. The occupant `<select>` is built
from whatever `Routine`/`FixedCommitment`/`DeadlineTask`/`TrackableItem`/
`AdHocEvent` records already exist (plus `Slack`); a validation error from
the service layer (invalid range, dangling occupant) round-trips back to
the same week via a `?error=` query param instead of crashing. There is no
UI yet to create `Book`/`Course`/`Routine`/`Semester Commitment`/
`Ad-hoc Event` records themselves — those still only exist via the service
functions (exercised in tests) or direct DB access; only `Time Slot`
placement has a UI, per this `PRIORITIES.md` item's specific "Done ="
condition. Styling is intentionally plain (see `PRIORITIES.md`'s
Non-Blocking section — Phase 1 needs this correct, not pretty).

`Scheduler` (`src/scheduler/`) defines the pure data contracts
(`types.ts`: `SchedulerInput`/`SchedulerOutput`, see below) and now the
hard-constraint half of placement (`hard-constraints.ts`):
`placeFixedCommitments` places every `Fixed Commitment` occurrence at its
anchored day/time within the target week — this never fails to place
(overlapping `Time Slot`s are allowed by design, see below), but it does
detect and flag two `Fixed Commitment`s, or a `Fixed Commitment` and an
existing `Ad-hoc Event` `Time Slot`, landing on the same time, as a
`SchedulerConflict` (reason `"fixed-commitment-unplaceable"`) — surfaced,
not silently hidden, per the charter's guardrail against silently dropping
a fixed-deadline affair. `placeDeadlineTasks` searches each day of the
target week, in order, for a free window (within the configured daily
scheduling window, see Configuration below) before the task's `dueAt`
(clamped to the week), and places one session there; if no day has room,
it reports a `SchedulerConflict` (reason `"deadline-task-unplaceable"`)
instead of fabricating an overlapping placement — unlike a `Fixed
Commitment`, a `Deadline Task` session is flexible/movable, so a
fabricated overlap would misrepresent real availability. A task already
past its deadline (or due exactly at `weekStart`) naturally falls through
to this same conflict path — no separate "is this overdue" branch exists.
`placeHardConstraints` combines both and ensures a `Deadline Task` session
never double-books a `Fixed Commitment` occurrence or an existing `Time
Slot`.

`src/scheduler/routine-placement.ts`'s `placeRoutines` places each
`Routine`'s occurrence(s) for the target week: `daily` occurs every day,
`weekly` on its anchor weekday(s), `monthly` on its anchor day(s)-of-month
when one falls in the week. Each occurrence first searches within its
`timeOfDayPreference`'s sub-window (a fixed mapping in that file — e.g.
`evening` → `17:00`–`20:00` — itself an inferred placeholder, not a user
decision) and falls back to the full daily scheduling window if that
sub-window has no room. A `Routine`, unlike a `Fixed Commitment`, is
explicitly a soft preference the scheduler "can nudge around"
(`docs/domain-model.md`) — an occurrence with no room anywhere in the day
is silently skipped, not reported as a `SchedulerConflict`; the charter's
never-silently-drop guardrail is scoped to `Fixed Commitment`/`Deadline
Task`, not `Routine`. `src/scheduler/time.ts`'s `findFreeInterval` is the
shared free-window search both `hard-constraints.ts` and
`routine-placement.ts` use, so "find room in this window" behaves
identically everywhere in the Scheduler.

`src/scheduler/flexible-placement.ts`'s `placeFlexibleTrackableItems`
places the last, most flexible layer: one work session per eligible
`Trackable Item`, in `priority` order (lower number = higher priority,
scheduled first). "Eligible" is every already-`in-progress` item plus
`not-started`/`paused` items promoted up to each `type`'s remaining `WIP
Limit` capacity (highest priority promoted first) — this doesn't persist
any status change, it only decides who gets a proposed session, since the
Scheduler never writes to the store. A `type` missing from the input's
`wipLimits` is treated as zero remaining capacity, not unlimited, so
incomplete input can't silently violate the limit. Each session searches
the week's days in order for free time, skipping a day once placing the
session would push that day's used time past a configured minimum daily
`Slack` share (`MIN_SLACK_SHARE_PER_DAY` in `constants.ts`, currently 20%
— an inferred placeholder, not a user decision, same status as
`DEFAULT_WIP_LIMIT`) — deliberately leaving part of each day unscheduled
rather than packing it solid. Like a `Routine` occurrence, an item with no
room anywhere this week simply gets no session; no `SchedulerConflict` is
raised for it.

`src/scheduler/index.ts`'s `computeSchedule(input: SchedulerInput):
SchedulerOutput` is the Scheduler's public entry point: it runs the three
placement layers in order — hard constraints, then `Routine` occurrences,
then flexible `Trackable Item` work — feeding each layer's placements
forward as "busy" for the next, then merges everything into one
`SchedulerOutput`. `src/scheduler/index.test.ts` is the fixture-based
end-to-end suite: a realistic mixed week (an in-progress `Book` plus a
second `Book` blocked by its type's `WIP Limit` already being at cap, a
promotable `Course`, a `Fixed Commitment`, a `Deadline Task`, and a weekly
`Routine`) run through `computeSchedule` and checked against every bullet
in `ROADMAP.md`'s Phase 2 exit condition: no `WIP Limit` violated, no two
output slots double-book each other, the `Fixed Commitment`/`Deadline
Task` are honored with an empty conflict list, both `Routine` occurrences
land without displacing the `Fixed Commitment`, and each day's flexible
`Trackable Item` time stays within the `Slack` budget — plus a sixth test
confirming a genuinely-unplaceable `Deadline Task` still produces a
conflict rather than a fabricated placement, through the full composed
pipeline (not just the isolated unit tested in `hard-constraints.test.ts`).

`src/server/scheduler-runs.ts`'s `runScheduler(weekStart, weekEnd)` is
where the Scheduler meets the real store: it snapshots current domain data
via existing `src/server/*` query functions (including the target week's
already-placed `Time Slot`s), converts it to a `SchedulerInput`, calls
`computeSchedule`, and persists every proposed slot via
`src/server/time-slots.ts`'s `createTimeSlot` — `src/scheduler/` itself
still never touches Prisma. The Weekly View (`src/app/page.tsx`) has a
"Generate Schedule" button next to the week nav, wired to a
`generateScheduleAction` Server Action in `src/app/actions.ts`; any
`SchedulerConflict`s from the run are joined into the existing `?error=`
banner.

**Re-run policy (explicit product decision, not inferred):** the
Scheduler only fills genuinely empty time — it never modifies or deletes
a `Time Slot` already on the board for the target week, regardless of how
that slot got there (manual edit, `Ad-hoc Event`, a prior run). Verified
manually against the running dev server: seeded a `Book`, a weekly
`Routine`, a `Fixed Commitment`, and one pre-existing manual `Time Slot`;
clicking "Generate Schedule" placed the `Fixed Commitment`, the `Routine`
occurrence, and one `Book` session into the empty time around the manual
slot, and the manual slot itself was untouched both before and after.

**Known limit of this policy, also confirmed manually:** because nothing
tracks "the Scheduler placed this specific occurrence," clicking
"Generate Schedule" a second time for the same week re-places every
`Fixed Commitment` occurrence and any `Routine` occurrence for which the
week still has WIP/Slack room again, creating duplicate `Time Slot`s
rather than recognizing they're already scheduled — confirmed directly
(a second click produced a second, identical `Fixed Commitment` slot at
the same time). This is a direct, expected consequence of the "only fill
empty time" policy the project owner chose (the simplest and safest of
three options offered) over a policy that would first clear the
Scheduler's own prior placements — not a bug, but worth knowing before
clicking the button repeatedly. Deduplicating across runs is unscoped
follow-up work, not part of this `PRIORITIES.md` item.

Deliberately no `@prisma/client` import anywhere under `src/scheduler/`;
these types and functions mirror, but don't import, the shapes in
`src/server/*`, per `docs/system-direction.md`'s layering rule.

**Scheduling parameters** (`src/scheduler/constants.ts`) — chosen by the
project owner on 2026-07-18 when the Scheduler needed them, not silently
inferred: the daily window the Scheduler may place flexible work in is
`08:00`–`23:00` (`Fixed Commitment`s outside this window still place as
normal); one "day" of an item's `estimatedDays` becomes one 2-hour session
per calendar day it's scheduled.

### Core Entity Creation UI (Phase 4)

Three new routes, each following the Weekly View's existing plain
list + inline-edit-via-`?edit=`-query-param + Server Action pattern
(`src/app/page.tsx`'s pattern, reused rather than reinvented):

- `/items` (`src/app/items/`) — create, edit, and delete `Book` and
  `Course` records: title, type, priority, `unitCount`,
  `unitsCompleted`, `estimatedDays`, `status`. `type` is immutable once
  created (not part of the edit form, matching `updateTrackableItem`'s
  input shape).
- `/routines` (`src/app/routines/`) — create, edit, and delete `Routine`
  records. `anchor` is entered as a comma-separated list ("1,3,5")
  rather than a full weekday/day-of-month picker grid — an inferred
  simplification, not a user decision, since a `Routine`'s anchor is an
  occasional-edit field, not a frequent-input one.
- `/commitments` (`src/app/commitments/`) — create, edit, and delete
  both `Fixed Commitment` and `Deadline Task`, kept as two clearly
  separate sections/forms rather than a merged form, matching
  `domain-model.md`'s "deliberately non-interchangeable" framing.

Every existing service-layer validation (`WIP Limit` enforcement,
`Routine` cadence/anchor range checks, `Fixed Commitment`'s
`startTime < endTime`) now surfaces as a visible `?error=` banner on
these pages instead of only being reachable via a test or the temporary
dev-seed route prior phases relied on. `removeTrackableItem`/
`removeRoutine`/`removeFixedCommitment`/`removeDeadlineTask`
(`src/server/*.ts`) were the one piece missing from full CRUD at the
service layer before this phase — each throws on an unknown id, mirroring
`time-slots.ts`'s existing `removeTimeSlot`.

**Delete-with-reference guarantee:** `occupantId` was never a real
foreign key (sqlite/Prisma has no polymorphic relations — see the `Time
Slot` paragraph below), so deleting a record still referenced by an
existing `Time Slot` was already safe at the data layer; this phase is
what first exercises and documents it. `listTimeSlotsWithLabels`
degrades that slot's label to e.g. `"(deleted trackable item)"` rather
than throwing. Verified both by a dedicated test
(`time-slots.test.ts`) and manually against the running dev server:
deleting a `Book` that had a `Time Slot` on a future week left the
Weekly View rendering correctly, with only that one slot's label
changed and every other slot untouched.

Manually verified end-to-end in the browser for all five record kinds:
create, edit, and delete each succeeded; an invalid `Routine` anchor for
its cadence and an out-of-order `Fixed Commitment` time range each
surfaced as a visible error with nothing created; setting a `Trackable
Item` to `"in-progress"` within its type's `WIP Limit` succeeded (the
rejection path itself is covered by `trackable-items.test.ts`, already
passing before this phase).

### Repair (Phase 3 — Elastic Re-Scheduling & Ad-hoc Events)

`src/scheduler/repair.ts`'s `repairSchedule(input, disruption)` locally
repairs an already-placed `Schedule` for one of three disruptions, without
a `computeSchedule` recompute — same purity rules as the rest of
`src/scheduler/` (no Prisma, see above):

- **`skip-session`** — removes the named flexible `Trackable Item` `Time
  Slot`. **Backfill policy (project owner's explicit decision,
  2026-07-18):** the freed window is immediately offered to the next
  eligible item that doesn't already have a session this week (reusing
  `selectEligibleItems`/`dailyWindowMs`/`usedMsOnDay` from
  `flexible-placement.ts`), never to the skipped item itself — not always
  left as `Slack` until the next full "Generate Schedule" run.
- **`insert-ad-hoc-event`** — the `Ad-hoc Event`'s `Time Slot` always
  places, exactly where declared (same "never refused" pattern as a
  `Fixed Commitment`). An overlapping flexible `Trackable Item` session is
  evicted and relocated elsewhere in the week (charter guardrail: an
  `Ad-hoc Event` always outranks flexible work); an overlap with a `Fixed
  Commitment` or `Deadline Task` is flagged as a new `"ad-hoc-event-overlap"`
  `SchedulerConflict` instead of evicted, since neither is flexible work
  the charter lets an `Ad-hoc Event` bump; a `Routine` occurrence overlap
  is left alone entirely (already a soft, nudge-around preference with no
  conflict-flagging precedent elsewhere in the Scheduler).
- **`item-completed`** — removes only the item's *future* session(s) this
  week (`startAt >= now`, an explicit input rather than read internally,
  keeping the Scheduler pure) and backfills the freed window the same way
  as `skip-session`. A past session is never touched — the charter's
  guardrail against losing already-tracked history means finishing a book
  early must not erase that a session already happened.

**Documented time budget:** a repair only touches the disrupted slot(s)
plus, for `insert-ad-hoc-event`, a bounded per-item day-loop search over
the rest of the week (never a full recompute of every other item's
placement). `repair.test.ts`'s time-budget test demonstrates this
completing in single-digit milliseconds against a busy 8-slot fixture; an
interactive UI action built on this should never need a loading spinner.

Wired into the real store by `src/server/scheduler-repair.ts`
(`skipSession`, `insertAdHocEvent`, `completeItemEarly`) — each applies
whatever domain-data change the disruption itself represents (creating
the `Ad-hoc Event` record, marking a `Trackable Item` `"done"`) via the
existing `src/server/*` functions, snapshots a fresh `SchedulerInput` the
same way `scheduler-runs.ts` does, calls `repairSchedule`, then applies
the returned diff (`removeTimeSlot`/`createTimeSlot`). The Weekly View
(`src/app/page.tsx`) exposes this as a "Skip" and "Mark done" control on
every flexible `Trackable Item` `Time Slot`, and a "Quick Ad-hoc Event"
form — the latter is also the first creation UI for the `Ad-hoc Event`
record itself (previously only reachable via the service layer or direct
DB access).

Manually verified against the running dev server across all three
disruptions: skipping a session removed only that slot; inserting an
overlapping `Ad-hoc Event` placed it and relocated the displaced session
to the next day, leaving every `Fixed Commitment`/`Routine`/other
`Trackable Item` slot untouched; marking an item done removed its future
session and the freed window was immediately backfilled by the next
eligible item in the same window — confirming both the backfill policy
and the Phase-1 manual-edit guarantee (one edit never corrupts another
`Time Slot`) hold through the real app, not just fixtures.

### UI/UX Overhaul & Live Priority Reordering (Phase 5)

**Design system** (`src/app/globals.css`): warm coral/amber/teal CSS
custom properties (color, spacing, radius, shadow, typography, motion
tokens) replace the prior black/white default look, applied consistently
via `src/app/page.module.css` (shared by all four pages) — project
owner's explicit design direction, 2026-07-20 ("warm motivated high
interactive vibe"), chosen and generated with the ui-ux-pro-max design
skill. `Noto Sans TC` is the sole typeface (headings and body), chosen
for Traditional Chinese + Latin coverage in one family rather than
pairing a Latin display font that can't render the primary language.

**Localization:** every page's UI copy (labels, buttons, headings, nav,
hint text, and the UI-layer's own error-fallback strings) is Traditional
Chinese. Service-layer thrown error messages (e.g. `WipLimitExceededError`,
`Routine`/`Fixed Commitment` validation errors) remain in English — an
explicit scope boundary, not an oversight, since translating them would
touch business-logic strings asserted on by existing tests; see
Exceptions in this phase's audit.

**Streamlined create flow:** the `priority` field was removed from
`/items`' add and edit forms entirely. `createTrackableItem` now defaults
an omitted `priority` to "last place" (current max + 1,
`src/server/trackable-items.ts`'s `nextPriority`) — a new item is simply
appended, and priority from then on is managed exclusively by dragging.

**Drag-and-drop priority reordering** (`src/app/items/priority-list.tsx`,
a client component): native HTML5 drag-and-drop reorders the `/items`
list; on drop, `reorderItemsAction`
(`src/app/items/actions.ts`) persists the full new order via
`reorderTrackableItems` (sequential 1-indexed priorities in one
`prisma.$transaction`) and immediately calls `runScheduler` for the
current calendar week — the project owner's explicit decision,
2026-07-20 ("instantly regenerate"), not deferred to a manual "Generate
Schedule" click. The list shows a live status line (slots added / already
up to date) and a rank badge per item.

**Re-run idempotency (new Scheduler fix, prerequisite for the above):**
`placeFixedCommitments`/`placeRoutines`
(`src/scheduler/hard-constraints.ts`, `routine-placement.ts`) now skip an
occurrence that already has a Time Slot on that calendar day in
`existingSlots` (`hasExistingOccurrence`), and
`placeFlexibleTrackableItems` (`src/scheduler/flexible-placement.ts`)
skips an item that already has a session this week — closing the
previously-documented "Generate Schedule re-placing a duplicate on
repeated clicks" limit, and additionally covering flexible `Trackable
Item` sessions (a duplication case not previously documented but
required for instant regenerate-on-every-drag to be safe). Covered by
new tests in `hard-constraints.test.ts`, `routine-placement.test.ts`,
and `flexible-placement.test.ts`.

Manually verified against the running dev server: translated all four
pages; created and deleted a `Book` through the streamlined flow
(appended at the end, no priority prompt); clicked "產生課表" (Generate
Schedule) twice in a row for the same week and confirmed byte-identical
output — no new duplicate slots. The native drag *gesture* itself was
verified via a new permanent integration test
(`src/app/items/actions.test.ts`) exercising `reorderItemsAction`'s
actual code path end-to-end (persist + instant regenerate, and a second
call producing zero additional slots) rather than a live mouse
simulation — this session's Browser-pane screenshot/pointer tooling was
unavailable (timed out) independent of the app itself (server logs and
console stayed clean throughout); see Exceptions in this phase's audit.

### Per-Type Priority Lists & Trackable Item Time Slot Detail (2026-07-20)

Two small fixes from direct human feedback via `INBOX.md`
("books and course different kind... and a block on time table should also
have books like detail (which chapter)"), not phase-sized:

**Separate Book/Course priority lists:** `/items` (`src/app/items/
priority-list.tsx`) now renders two independent drag-and-drop lists — 書籍
and 課程 — each with its own rank badge starting at 1, instead of one
merged list. `TrackableItem.priority` is still one flat, shared column
(unchanged — it's also what fixes the relative book/course interleave the
Scheduler uses when both types compete for the same week's Slack time);
dropping within one type's section only splices that type's subsequence
and leaves every other-type item in its existing slot
(`src/app/items/priority-order.ts`'s `reorderWithinType`, unit-tested),
then hands the merged full order to the unchanged `reorderItemsAction` /
`reorderTrackableItems`. No Scheduler change was needed.

**Trackable Item Time Slot detail:** a Weekly View block occupied by a
`Book`/`Course` session now shows which unit it's for, e.g. `書籍：Deep
Work（第 1 章／共 12 章）` or `課程：Algorithms Course（第 1 支影片／共 30
支影片）` — `Chapter` for `Book`, `Video` for `Course`, per
`docs/domain-model.md`'s unit vocabulary, computed as `unitsCompleted + 1`
capped at `unitCount` (`occupantLabel` in `src/server/time-slots.ts`).
This also closed a leftover Phase 5 gap: `occupantLabel`'s output for
every occupant kind (not just `Trackable Item`) was still in English —
now Traditional Chinese throughout (e.g. `常規事件：`, `固定事務：`,
`（已刪除）` placeholders).

Manually verified against the running dev server: added a `Book` (0/12
units) and a `Course` (0/30 units), confirmed each landed in its own
section ranked 1; clicked "產生課表" and confirmed the resulting blocks
read `書籍：Deep Work（第 1 章／共 12 章）` and `課程：Algorithms
Course（第 1 支影片／共 30 支影片）`. `npm run verify` passes — 131 tests
(2 new for `reorderWithinType`), lint/typecheck/build all clean.

## Known Limits

- No calendar export/sync, no notifications, no mobile view — all
  intentionally out of scope; see `../ROADMAP.md`'s Proposed section.
- Single-user only; no auth, no multi-device sync beyond the local SQLite
  file.
- No UI yet to configure a `WIP Limit` (`setWipLimit`) — it defaults to
  `DEFAULT_WIP_LIMIT` (3) per type and is only adjustable via the service
  layer or a test.
- Service-layer error messages (validation errors, `WipLimitExceededError`)
  still surface in English in `?error=` banners — only UI-authored copy
  was translated to Traditional Chinese this phase (Phase 5); see that
  phase's Current Behavior notes above.
- Drag-and-drop priority reordering (`/items`) uses native HTML5
  drag-and-drop with no touch/mobile fallback — a desktop-first
  interaction, consistent with the bootstrap platform decision (local web
  app first, see `../ROADMAP.md`'s Proposed section on a mobile view).

## Configuration / Environment Notes

- Node: v24 (tested with v24.13.1); no lower bound enforced yet.
- `DATABASE_URL` (`.env`, gitignored) points at the local SQLite file —
  default `file:./dev.db`. See `.env.example` for the variable name.
- The dev database file itself (`prisma/*.db`) is gitignored — it's local
  state, not source, and Phase 1's "persists across a restart" exit
  condition only requires the file to survive an app restart, not a git
  clone.
