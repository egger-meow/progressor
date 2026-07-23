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
Reordering" below). The Weekly View always renders a full hourly time
grid per day, whether or not it has any `Time Slot`s, with click-to-
create directly on an empty hour cell (Phase 6 — see "Interactive
Weekly Grid & Click-to-Create" below). All four pages share one
persistent top nav bar (`src/app/nav-bar.tsx`) instead of each
repeating its own plain-text section links. A `Fixed Commitment` can be
bound to a configurable `Semester` window (default 16 weeks), the
Weekly View shows which week of the semester is displayed, and a
`Routine` can pin a concrete preferred start time instead of only a
time-of-day bucket (Phase 7 — see "Semester Scoping for Fixed
Commitments & Concrete Routine Times" below). Phases 1-7 are closed;
see `docs/audits/` for their completion evidence.

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
without this command passing clean (see `../.loop-engine/LOOP_ENGINEERING.md`, "Two
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

#### Phase 6 — Interactive Weekly Grid & Click-to-Create (closed)

Authorized by the project owner in chat (2026-07-21): the Weekly View's
per-day columns collapsed to a single "沒有時段" message when empty and
adding a slot required a separate bottom form.

1. Every day column renders one row per hour across the Scheduler's
   daily window (08:00–23:00), always — extended per-day to include any
   `Time Slot` outside that window.
2. An existing `Time Slot` renders in its starting hour's row; the hours
   it spans afterward render as a non-interactive continuation
   indicator, not an empty/clickable row.
3. Clicking an empty hour cell reveals an inline pre-filled add form
   (reusing `createTimeSlotAction`); canceling collapses it back.
4. The bottom "新增時段"/"快速新增臨時事件" forms remain available
   unchanged.
5. All existing per-slot actions (編輯/移除/跳過/標記完成) work
   unchanged from within the grid.
6. `npm run verify` passes.
7. A written manual walkthrough, recorded in `docs/audits/`.

Passed; see
[`docs/audits/interactive-weekly-grid-and-click-to-create-audit.md`](audits/interactive-weekly-grid-and-click-to-create-audit.md).

#### Phase 7 — Semester Scoping for Fixed Commitments & Concrete Routine Times (closed)

Authorized by the project owner in chat (2026-07-21): `Fixed Commitment`
occurrences showed every week forever with no way to say "only while
the semester is running" (寒暑假 should show none), and a `Routine`'s
`Time-of-Day Preference` only offered four vague buckets with no way to
pin an exact time.

1. A `Semester` (start date + week count, default 16) is configurable
   from `/commitments`, persists, and is shown there once set.
2. A `Fixed Commitment` has a "忽略學期範圍" option, defaulting to off.
   When a `Semester` is configured and a commitment does not ignore it,
   the Scheduler places its occurrence only for weeks inside the
   Semester's range. A commitment with the opt-out on, or when no
   `Semester` is configured, is unaffected.
3. The Weekly View shows "第 N 週" next to the week label whenever the
   displayed week falls inside the configured `Semester`'s range.
4. A `Routine` can be given a concrete preferred start time; when set,
   the Scheduler tries that exact time first, falling back to the
   bucket window and then the full daily window.
5. `npm run verify` passes, with new test coverage.
6. A written manual walkthrough, recorded in `docs/audits/`.

Passed; see
[`docs/audits/semester-scoping-and-concrete-routine-times-audit.md`](audits/semester-scoping-and-concrete-routine-times-audit.md).

#### Phase 8 — Daily Check-In Gate for Missed Sessions (closed)

Authorized by the project owner in chat (2026-07-22): a `Book`/`Course`/
`Deadline Task` session that goes by unmarked just sits inert on the board
forever — nothing ever asks whether it actually happened, and nothing
reschedules the outstanding work if it didn't.

1. A same-day, mandatory gate blocks the whole app (every route) whenever
   a `Trackable Item`/`Deadline Task` `Time Slot` has already elapsed and
   was never confirmed. `Routine`/`Fixed Commitment` occurrences are out of
   scope.
2. Answering "yes, done" for a pending session only records the
   confirmation; it never changes `unitsCompleted`/`estimatedHours`.
3. Answering "no, not done" removes that session and triggers a real
   reschedule of the underlying item's outstanding work, without leaving a
   stale, already-elapsed replacement behind.
4. `npm run verify` passes, with new test coverage.
5. A written manual walkthrough, recorded in `docs/audits/`.

Passed; see
[`docs/audits/daily-check-in-gate-audit.md`](audits/daily-check-in-gate-audit.md).

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
`estimatedHours`). Passing one kind's shape to the other's create function
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
a fixed-deadline affair. `placeDeadlineTasks` treats `estimatedHours` as a
total work-hour budget (renamed from `estimatedDays`, 2026-07-21 —
previously present but unused: every task got exactly one fixed 2-hour
session regardless of its value) and splits it across the target week: it
walks each day before the task's `dueAt` (clamped to the week) in order,
placing at most one session per day, each capped at 2 hours and further
capped by that day's remaining `Slack` budget (`dailyWindowMs`/
`usedMsOnDay`, shared with `flexible-placement.ts` via `src/scheduler/
time.ts`) so Deadline Task placement alone can't pack a day solid ahead of
`Routine`/flexible-item placement that runs after it. Any hours that still
don't fit anywhere before the deadline are reported as a
`SchedulerConflict` (reason `"deadline-task-unplaceable"`, message notes
how many hours placed vs. needed when some did fit) rather than fabricated
as an overlapping placement or silently dropped — unlike a `Fixed
Commitment`, a `Deadline Task` session is flexible/movable, so a
fabricated overlap would misrepresent real availability. A task already
past its deadline (or due exactly at `weekStart`) naturally falls through
to this same conflict path — no separate "is this overdue" branch exists.
`placeHardConstraints` combines both and ensures a `Deadline Task` session
never double-books a `Fixed Commitment` occurrence or an existing `Time
Slot`. Scoped to `Deadline Task` only — `Trackable Item`'s `estimatedDays`
is unaffected and still drives nothing (project owner's explicit choice
when asked, 2026-07-21).

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

Added 2026-07-22: `src/scheduler/category-placement.ts`'s
`placeCategoryItemSchedules` runs *before* `placeFlexibleTrackableItems`
and, for each `Trackable Item` `type` with a configured `Category Item
Schedule`, takes over its placement entirely — reusing
`selectEligibleItems` (unmodified) to find that type's eligible items, then
for each cadence/anchor occurrence (day+window selection shared with
`Routine` via `src/scheduler/occurrence-timing.ts`'s
`occurrenceDayOffsets`/`findOccurrenceWindow`), placing one Time Slot per
eligible item, all sharing the identical window — not one item per
occurrence like a `Routine`. `computeSchedule` (`src/scheduler/index.ts`)
filters that type's items out of `placeFlexibleTrackableItems`'s input
afterward, so a type with no configured schedule flows through unchanged
(additive, not a breaking replacement) — this is what makes the two
placement strategies mutually exclusive per type rather than
double-booking. Re-run idempotency reuses `hard-constraints.ts`'s
`hasExistingOccurrence` (now generic over every occupant kind, not just
`"fixed-commitment"`/`"routine"`), checked per item per day, so a
newly-WIP-promoted item is filled into an already-partially-covered day
rather than skipped or duplicated.

`src/scheduler/index.ts`'s `computeSchedule(input: SchedulerInput):
SchedulerOutput` is the Scheduler's public entry point: it runs the
placement layers in order — hard constraints, then `Routine` occurrences,
then `Category Item Schedule` occurrences, then flexible `Trackable Item`
work for whatever's left — feeding each layer's placements forward as
"busy" for the next, then merges everything into one `SchedulerOutput`.
`src/scheduler/index.test.ts` is the fixture-based
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
normal); a flexible work session (`Trackable Item`, `Routine` occurrence,
or one chunk of a split `Deadline Task`) runs at most 2 hours;
`MIN_DEADLINE_SESSION_MS` (30 minutes, added 2026-07-21) is the floor
below which `placeDeadlineTasks` won't bother searching a day for room —
it moves on to the next day instead, though a genuinely small *final*
remainder of a task's hours still places normally.

### Core Entity Creation UI (Phase 4)

Three new routes, each following the Weekly View's existing plain
list + inline-edit-via-`?edit=`-query-param + Server Action pattern
(`src/app/page.tsx`'s pattern, reused rather than reinvented):

- `/items` (`src/app/items/`) — create, edit, and delete `Book` and
  `Course` records: title, type, priority, `unitCount`,
  `unitsCompleted`, `estimatedDays`, `targetDate`, `unitWeightMultiplier`,
  `status`. `type` is immutable once created (not part of the edit form,
  matching `updateTrackableItem`'s input shape). Also hosts (added
  2026-07-22) a "同時進行上限" section (`WIP Limit` per type, previously
  backend-only) and a "固定排程" section (`Category Item Schedule` per
  type — cadence/anchor/time-of-day/preferredStartTime/durationMinutes,
  same fields as `/routines`' form).
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
`Book`/`Course` session shows which unit it's for, e.g. `Deep Work（第 1
章／共 12 章）` — `Chapter` for `Book`, `Video` for `Course`, per
`docs/domain-model.md`'s unit vocabulary, computed as `unitsCompleted + 1`
capped at `unitCount`. This also closed a leftover Phase 5 gap:
`occupantLabel`'s output for every occupant kind (not just `Trackable
Item`) was still in English — now Traditional Chinese throughout (e.g.
`常規事件：`, `固定事務：`, `（已刪除）` placeholders). Updated 2026-07-22:
`occupantInfo` (`src/server/time-slots.ts`) splits this into two fields —
`occupantLabel` is now just the title, and the unit string moved to a new
`occupantProgress` (`TimeSlotWithLabel`, `undefined` for every non-
`Trackable Item` occupant) — so a Weekly View block shared by multiple
items (a `Category Item Schedule` occurrence) can list each item's own
title + progress separately once expanded, instead of one baked-together
string. A single-item block still joins them back into one line for
display, so the single-book-per-day look is unchanged.

Manually verified against the running dev server: added a `Book` (0/12
units) and a `Course` (0/30 units), confirmed each landed in its own
section ranked 1; clicked "產生課表" and confirmed the resulting blocks
read `書籍：Deep Work（第 1 章／共 12 章）` and `課程：Algorithms
Course（第 1 支影片／共 30 支影片）`. `npm run verify` passes — 131 tests
(2 new for `reorderWithinType`), lint/typecheck/build all clean.

### Interactive Weekly Grid & Click-to-Create (Phase 6)

The Weekly View's per-day columns (`src/app/page.tsx`) no longer
collapse to a single "沒有時段" message when empty. Each day always
renders one row per hour across the Scheduler's daily window
(`DAILY_WINDOW_START`–`DAILY_WINDOW_END`, `src/scheduler/constants.ts`
— 08:00–23:00), via a new pure helper, `buildHourRows`
(`src/app/week.ts`, unit-tested in `week.test.ts`). A day whose
`Time Slot`s fall outside that window (manual entry isn't restricted to
it) has its grid widened to include them, per row — a `Time Slot` can
never become invisible.

Each hour row renders one of three things: (1) the `Time Slot`(s)
starting in that hour, as the same card/edit-form used before (unchanged
content and actions — 編輯/移除/跳過/標記完成); (2) a thin, non-
interactive "continuation" bar, for an hour already covered by a slot
that started earlier; or (3) a quiet "＋" link, for a genuinely empty
hour — deliberately low-opacity by default (no border, no visible
label text) and only reaching full color/opacity on hover/focus, per
project-owner feedback the same day ("密集恐懼症"): the first version
showed a full-width dashed "＋ 新增" button in every one of the ~105
empty cells across a week, which read as visual clutter rather than a
calm timetable.

Clicking that link navigates to `/?week=...&add=<date>T<hour>` — the
same URL-query-param pattern the existing `?edit=` inline-edit form
already uses, so this needed no new client-side JavaScript. When `add`
matches a cell, that cell renders an inline form pre-filled with the
clicked day/hour as date/start (end defaults to start + 1 hour),
submitting straight to the existing `createTimeSlotAction` — the same
Server Action and fields the bottom "新增時段" form already uses.
Canceling (or submitting) returns to the plain `/?week=...` URL. The
bottom "新增時段" and "快速新增臨時事件" forms are unchanged, for slots
that don't align to one clicked hour cell (e.g. a slot starting at a
half hour, or a longer manual entry).

Manually verified against the running dev server: an empty week showed
the full 08:00–22:00 grid on every day with every cell clickable;
clicking an empty cell and submitting created a 2-hour slot, which
rendered a card in its starting hour and a continuation bar (no add
link) in the hour it also covered; editing that slot down to 1 hour
correctly gave the freed hour back its own "＋ 新增" link; removing it
returned the day to fully empty; a slot created at 06:00 (outside the
default window) correctly widened only that day's grid down to 06:00,
leaving other days at 08:00. `npm run verify` passes — 137 tests (6 new
for `buildHourRows`/`parseHour`/`formatHourParam`), lint/typecheck/build
all clean. Test data cleared from `prisma/dev.db` afterward.

**Adjacent-slot quick extend (same-day follow-up, 2026-07-21):** wanting
a session longer than one hour used to mean opening the inline add form
and retyping its end time. An empty hour cell whose start exactly
matches an existing `Time Slot`'s end now also shows a small "↑ 接續
前一個" button, and a cell whose end exactly matches a `Time Slot`'s
start shows "接續後一個 ↓" — both one-click, submitting straight to the
existing `updateTimeSlotAction` with that slot's own occupant unchanged
and just one boundary moved to swallow the hour (`ExtendSlotButton`,
`src/app/page.tsx`; no new Server Action). These buttons only render on
the rare cell genuinely touching an existing slot's boundary, so they
don't reintroduce the density the plain "＋" was just calmed down from.
Manually verified: created a 09:00–10:00 slot, confirmed "↑ 接續前一個"
appeared at 10:00 and "接續後一個 ↓" at 08:00; clicked "↑ 接續前一個" —
slot became 09:00–11:00, the button correctly moved down to the new
11:00 boundary; clicked "接續後一個 ↓" at 08:00 — slot became
08:00–11:00, with no leftover buttons at either end since nothing is
adjacent on either side anymore. `npm run verify` passes — still 137
tests (composed from existing `updateTimeSlotAction`/`updateTimeSlot`,
no new logic to test). Test data cleared from `prisma/dev.db` afterward.

**Shared nav bar, decluttered Weekly View (2026-07-21):** from a
screenshot and chat feedback — the inline edit form looked cramped with
no field labels and no visual separation from the surrounding grid row
("should be vertical spacer"); the four section links (每週課表/書籍與
課程/常規事件/學期事務) repeated as plain unstyled text inside every
page instead of a real nav; and the Weekly View's two bottom forms
("新增時段" and "快速新增臨時事件") always took up scroll space even
though click-to-create already covers the common case.

- `src/app/nav-bar.tsx` (new, `"use client"` for `usePathname()`
  active-link highlighting) renders once in `layout.tsx` as a sticky top
  bar shared by all four pages, replacing each page's own duplicated
  `<nav>` of plain links.
- `SlotEditForm` and `InlineAddForm` (`src/app/page.tsx`) are now
  wrapped in the same `.addForm` card styling every other page's inline
  edit form already used (background, border, padding), with visible
  field labels (日期/開始/結束/內容) instead of bare inputs — consistent
  with the rest of the app rather than a special case.
- The Weekly View's standalone "新增時段" section was removed entirely
  — click-to-create on the grid (plus editing the pre-filled times in
  that inline form) already covers what it did.
- "快速新增臨時事件" is no longer always-visible below the grid; a
  "快速新增臨時事件"/"取消快速新增" link next to "產生課表" toggles it
  via a `?quickEvent=1` query param (the same pattern as `?edit=`/
  `?add=` — no new client-side JavaScript). The page now ends right
  after the grid by default.

Manually verified against the running dev server: the nav bar's active
link correctly followed the current page across all four routes;
opening a slot's edit form showed it as a distinct card with labeled
fields instead of bare stacked inputs; clicking "快速新增臨時事件"
revealed the ad-hoc form and its own 取消 collapsed it back, with the
Weekly View ending immediately after the grid when closed (the default).
`npm run verify` passes — still 137 tests (styling/structure only, no
new logic), lint/typecheck/build all clean. Test data cleared from
`prisma/dev.db` afterward.

**Click-based Time/Date pickers (2026-07-21, via the ui-ux-pro-max
skill):** every `<input type="time">`/`<input type="date">` in the app
(12 across `src/app/page.tsx` and `src/app/commitments/page.tsx`) was
replaced with `TimePicker`/`DatePicker` (`src/app/time-picker.tsx`,
`date-picker.tsx`) — project owner wanted setting an hour/minute/上午-
下午/day to be entirely mouse-driven instead of typing into or nudging a
native input's tiny segments.

- `TimePicker`: a button trigger showing e.g. `上午 9:00`; the popover
  offers a 上午/下午 toggle, a 1–12 hour grid, and a 5-minute-increment
  grid (00, 05, …, 55) — all click targets, no typing. Internally still
  tracks and submits a 24-hour `"HH:MM"` string via a hidden input, so
  no Server Action or `combineDateAndTime` (`src/app/week.ts`) needed
  any changes.
- `DatePicker`: a button trigger showing e.g. `2026/7/20（週一）`; the
  popover is a real month calendar (prev/next month nav, Monday-first
  weekday header matching `DAY_LABELS`, muted padding days from the
  adjacent month, today outlined, the selected day filled) — submits a
  `"YYYY-MM-DD"` string via a hidden input, same contract as before.
- Both popovers are portaled to `document.body` with `position: fixed`
  (`src/app/use-popover.ts`) rather than positioned relative to their
  trigger in-place, specifically because `.weekGrid` scrolls
  (`overflow-x/y: auto`) and would otherwise clip the panel when a
  picker is opened inside the Weekly View's grid. The hook also closes
  the popover on outside click, `Escape`, or any scroll/resize.

Manually verified against the running dev server: opened a `TimePicker`
inside the Weekly View grid and confirmed the panel rendered fully
outside the grid's clipping (not cut off); clicked an hour and a minute
and confirmed the trigger label updated live; submitted a slot and
confirmed the created `Time Slot` had the exact picked time; opened a
`DatePicker`, navigated to the next month, clicked a day, and confirmed
the trigger updated and the panel auto-closed; created a `Fixed
Commitment` via the new pickers on `/commitments` and confirmed it
persisted with the exact picked start/end time. `npm run verify`
passes — still 137 tests (these are pure UI replacements over the same
Server Action contracts; no service-layer behavior changed), lint/
typecheck/build all clean. Test data cleared from `prisma/dev.db`
afterward.

**Uniform hourly-grid row height + floating edit/add panel
(2026-07-21):** project owner feedback — empty hour rows were only as
tall as their "+" (~24px), so a cell with a slot, or worse, an open
edit/add form (5+ fields), suddenly inflated just that one row, making
the day column look jagged/misaligned ("参差不齊") next to every other
day at the same hour.

- `.hourRow` now has a `min-height: 56px` (`src/app/page.module.css`)
  instead of hugging its content — every row starts the same size, like
  a real timetable, whether or not anything is scheduled there. `.hourRow`
  switched from `align-items: center` to `stretch` so `.hourContent`
  fills that height; a lone "+" centers itself vertically and
  horizontally within it via `justify-content`/`.hourEmptyActions`
  instead of sitting flush at the top-left.
- `.hourContinuation` (the bar marking an hour a multi-hour slot already
  covers) now fills the row's full height with a tinted color block
  instead of a thin 6px line — a multi-hour event reads as one
  continuous colored block spanning its rows, closer to a real calendar.
- `SlotEditForm` and `InlineAddForm` no longer render inline in the row
  at all. `HourCellOverlay` (`src/app/hour-cell-overlay.tsx`, new) wraps
  every cell's compact content (the "+"/slot card/continuation bar,
  which always stays inline and keeps the row's height stable) and,
  when the SSR-decided `?edit=`/`?add=` form is present for that cell,
  portals it to `document.body` as a floating panel positioned next to
  the cell instead — the row that's being edited never grows, so it
  can't throw off alignment with the other six days. Reuses the
  existing `.addForm` card styling internally (just repositioned via a
  thin wrapper, `.hourOverlayPanel`), elevated to `--shadow-lg` since it
  now floats disconnected from the page's normal flow.

Manually verified against the running dev server: an empty week showed
every row at the same height across all seven days; opened the
click-to-create form on a Wednesday 11:00 cell and confirmed it floated
as a card next to the grid without changing that row's height or
disturbing Thursday/Friday's alignment; submitted it, then opened
編輯 on the resulting slot and confirmed the compact `SlotCard` stayed
inline while the edit form floated beside it. `npm run verify` passes
— still 137 tests (pure layout/structure change, no new logic), lint/
typecheck/build all clean. Test data cleared from `prisma/dev.db`
afterward.

**Spanning slot cards, compact SlotCard, grouped occupant picker
(2026-07-21, same-day follow-up):** project owner feedback against a
real multi-hour slot on their own week: the previous "continuation bar"
approach (a 14%-tint strip in each covered hour) read as separate boxes
with gaps between them, not one event ("接續...the event should cross
the blocks"); the compact `SlotCard` still stacked "固定事務：X" /
"編輯" / "移除" as three lines for something that should read at a
glance; and the native `<select>` for "內容" only visibly showed "留白
（不指定）" highlighted when opened, reading as if nothing else was
selectable even when a second option existed underneath.

- `.hourGrid` (`src/app/page.module.css`) is now a real CSS Grid
  (`grid-template-columns: 40px 1fr`, `grid-auto-rows: 56px`) instead of
  a flex column of independent `.hourRow`s. The day-column render loop
  (`src/app/page.tsx`) precomputes each `Time Slot`'s start row index and
  row span, and renders its `SlotCard` once with an inline `gridRow:
  "<start> / span <n>"` — a multi-hour slot is one continuous card
  crossing cell boundaries, with nothing rendered in the rows it covers
  (no separate "continuation" element at all; `.hourContinuation` was
  deleted). `HourCellOverlay` (`hour-cell-overlay.tsx`) gained a `style`
  prop to carry this per-cell `gridRow` through to its anchor `<div>`.
- `SlotCard` redesigned as a compact chip filling its full row-span
  height: the time range + occupant label are the only always-visible
  text, the whole card is a link to the existing `?edit=` floating panel
  (same edit UI as before, just triggered by clicking the card instead
  of a separate "編輯" line), and 移除 is a small icon button
  (`.slotDeleteButton`, an inline SVG trash icon) pinned to the card's
  corner instead of a fourth always-visible text row. 跳過/標記完成 (only
  shown for a `Trackable Item` occupant) remain small pill buttons below.
- `OccupantPicker` (`src/app/occupant-picker.tsx`, new) replaces the
  native `<select name="occupant">` everywhere it appeared (Weekly
  View's edit/add forms). Same popover pattern as `TimePicker`/
  `DatePicker`: a button trigger showing the current selection, a panel
  listing every option grouped under its category header (常規事件/固定
  事務/截止任務/書籍/課程/臨時事件; 留白（不指定） stands alone with no
  header). The hidden input still carries the exact `"type|id"` string
  every Server Action already parses — no backend change.

Manually verified against the running dev server, using the project
owner's own real data: their existing 17:00–20:00 "留白" `Time Slot`
(the exact one in their screenshot) rendered as one continuous card
spanning three hour rows with no gap or color seam, `↑ 接續前一個`/`接續
後一個 ↓` still offered correctly on the empty cells touching its
boundaries; clicking 編輯 opened the floating panel positioned beside
the spanning card without disturbing any other day's row alignment;
opening the occupant picker showed both "留白（不指定）" and a "固定事
務" group containing their real "資料探勘" commitment, clearly legible
at once (not just one item visible); selecting it, submitting a test
1-hour slot, and deleting it again round-tripped cleanly (`TimeSlot`
count back to the same 2 real rows it started at). `npm run verify`
passes — still 161 tests (pure UI restructuring over the same Server
Action contracts; no service-layer behavior changed), lint/typecheck/
build all clean.

**No category prefix in the compact card (2026-07-21, same-day
follow-up):** even after the redesign above, the compact `SlotCard`
still read "固定事務：資料探勘" — project owner: "no need prefix, for
anything in 課表. Just show what kind is it after click open details."
`occupantLabel` (`src/server/time-slots.ts`) no longer prefixes the
title with its category; `TimeSlotWithLabel` gained a separate
`occupantKind` field ("常規事件"/"固定事務"/"截止任務"/"書籍"/"課程"/
"臨時事件", or `""` for 留白). The Weekly View's compact `SlotCard`
shows only the bare title; `SlotEditForm` shows `occupantKind` as a
small badge above the date/time/內容 fields, so the category is visible
once you open a slot's details, not before. Manually verified against
the running dev server (the project owner's own real "資料探勘"
commitment, now at week 9/7 after their own concurrent edits): the
compact card read just "資料探勘"; opening its edit panel showed a
"固定事務" badge above the fields. `npm run verify` passes — still 161
tests (one field renamed/split, no new logic; the existing "deleted
reference" fallback-message test still passes unchanged), lint/
typecheck/build all clean.

### Semester Scoping for Fixed Commitments & Concrete Routine Times (Phase 7)

`Semester` (`src/server/semester.ts`, new — a singleton row, fixed id
`"singleton"`) holds a `startDate` and `weekCount` (default 16),
configurable from a new "學期設定" section at the top of `/commitments`
(a `DatePicker` + number input, `setSemesterAction`). `getSemester()`
returning `null` (not yet configured) is a first-class state, not an
error — every consumer treats it as "unbounded," matching the exit
condition's guardrail that configuring a `Semester` must never make an
existing `Fixed Commitment` silently disappear from a week it showed in
before.

**Fixed Commitment bounding:** `FixedCommitment.ignoreSemesterBounds`
(new column, default `false`) is a checkbox on both the create and edit
forms ("忽略學期範圍（不限 16 週，每週都顯示）"). `SchedulerInput` gained
a `semester: { startDate, weekCount } | null` field
(`src/server/scheduler-runs.ts`'s `buildSchedulerInput`, threaded to
both `runScheduler` and the repair layer since they share that
builder). `placeFixedCommitments`'s new `isWithinSemester` helper
(`src/scheduler/hard-constraints.ts`) computes the target occurrence's
calendar week against `[startOfWeek(semester.startDate), + weekCount
weeks)` (a new `startOfWeek` added to `src/scheduler/time.ts`, mirroring
`src/app/week.ts`'s own copy — the Scheduler never imports the UI
layer) — week 1 is the calendar week containing `startDate`, even if
that date isn't itself a Monday. A commitment with
`ignoreSemesterBounds: true`, or `semester: null`, is filtered in
(unaffected), matching pre-Phase-7 behavior exactly.

**"第 N 週" header:** `semesterWeekIndex` (`src/app/week.ts`) returns
the 1-indexed week number, or `null` outside the `Semester`'s range or
when unconfigured; the Weekly View shows it as a badge next to the
week-range label only when non-null.

**Concrete Routine time:** `Routine.preferredStartTime` (new column,
nullable `"HH:mm"`) is set via a `TimePicker` plus a "使用指定時間（優先
於時段偏好）" checkbox on `/routines`' create/edit forms — the checkbox
exists because `TimePicker` always carries a real value (no "empty"
state), so it alone can't distinguish "I want 09:00" from "I didn't set
anything." `placeRoutines` (`src/scheduler/routine-placement.ts`) tries
the exact `[preferredStartTime, preferredStartTime + session duration)`
window first (only succeeds if that precise slot is free), then falls
back to `timeOfDayPreference`'s bucket window, then the full daily
window — unchanged behavior when `preferredStartTime` is unset.

Manually verified against the running dev server, using the project
owner's own real `Fixed Commitment` ("資料探勘", Tuesday
13:30–15:20, pre-existing) so as not to fabricate unrelated data:
configured a `Semester` starting 2026-08-01 (16 weeks); confirmed the
Weekly View showed no "第 N 週" badge for the current week (before the
semester) but "第 1 週"/"第 16 週" for the first/last weeks in range and
no badge again the week after; clicked "產生課表" for a week inside the
range and confirmed "資料探勘" was placed, then for a week before the
range and confirmed nothing was placed for it. Created a test `Routine`
with a concrete `preferredStartTime` of 09:00 and confirmed it recorded
correctly ("指定 09:00" in its list entry) and that generating the
schedule placed it exactly there. `npm run verify` passes — 161 tests
(24 new: `semester.test.ts`, plus new coverage in
`semester-commitments.test.ts`, `routines.test.ts`,
`hard-constraints.test.ts`, `routine-placement.test.ts`, `week.test.ts`),
lint/typecheck/build all clean. All test artifacts (a temporary
`Routine`, a `Time Slot` this session generated, and the test
`Semester` configuration) were cleaned up afterward — the project
owner's own pre-existing `Fixed Commitment` and its earlier
independently-created `Time Slot`s were left untouched throughout.

**Per-Routine session duration + checkbox styling/alignment fix
(2026-07-21, follow-up):** every `Routine` occurrence was placed for a
single hardcoded `SESSION_DURATION_MS` (2 hours) regardless of what the
Routine actually was — a 30-minute stretch and a 2-hour gym session both
got the same block. `Routine.durationMinutes` (new column, default 120)
is now set via a "時間長度（分鐘）" number input on `/routines`'
create/edit forms; `placeRoutines` (`src/scheduler/routine-placement.ts`)
computes `durationMs = routine.durationMinutes * 60 * 1000` and uses it
everywhere `SESSION_DURATION_MS` used to be hardcoded (the constant
itself is now unused there). The default (120) exactly matches the old
constant, so an existing Routine's placement doesn't change until its
duration is edited. Separately, `.checkboxLabel` (the "使用指定時間"/
"忽略學期範圍" checkboxes) sank to the bottom of its row instead of
lining up with the labeled fields beside it (a lone checkbox+text row is
shorter than a label-text-plus-input stack, so `.addForm .slotForm`'s
`align-items: flex-end` bottom-aligned it out of step) and rendered as a
bare, unstyled browser-default square that stood out against the app's
theme — `align-self: center` fixes the alignment, and the checkbox is
now restyled (`appearance: none`, themed border/fill, a drawn checkmark)
to match. Manually verified against the running dev server: created a
"Stretch" `Routine` with `durationMinutes: 30`, `preferredStartTime:
09:00`, generated the schedule, and confirmed it placed exactly
09:00–09:30 (not the old 2-hour block); opened `/commitments`' and
`/routines`' checkbox rows and confirmed the checkbox now centers
vertically with its sibling fields and renders as a themed square with a
checkmark when checked. `npm run verify` passes — 166 tests (5 new: 3 in
`routines.test.ts` for `durationMinutes` validation/defaulting, 1 in
`routine-placement.test.ts` confirming a custom duration is honored, 1
update test), lint/typecheck/build all clean.

**Tags, Weekly View display selector, and deadline-day banner (2026-07-21,
follow-up):** three requests from the project owner in one message. (1)
Free-text `Tag`s (`tags`, new JSON-encoded-string-array column,
`src/server/tags.ts`'s `normalizeTags`/`serializeTags`/`parseTags`) on
`Trackable Item`, `Routine`, `Fixed Commitment`, and `Deadline Task` — a
"標籤（用逗號分隔）" input on each record's create/edit form (`/items`,
`/routines`, `/commitments`), shown as chips on the record list
(`.tagList`/`.tagChip`) and, when set, on that occupant's `SlotCard` in the
Weekly View. `occupantInfo` (`src/server/time-slots.ts`) now also returns
`tags`, surfaced as `TimeSlotWithLabel.occupantTags`. (2) A "顯示：" field
selector above the Weekly View (`DisplayOptionsControl`,
`src/app/display-options.tsx`, client component) toggles 時間／標籤／類別
independently, applied via `data-show-*` attributes on `#weekly-view` (not
React conditional rendering, so the CSS in `page.module.css` does the
show/hide) and persisted per-browser in `localStorage` — a display
preference, not `Schedule` data, so it never touches Prisma. Defaults:
時間 on, 標籤 on, 類別 off (project owner: "default time and tag is
enough"), reconciling the same session's earlier "no need prefix" request
(the kind badge is now opt-in via this selector instead of gone). (3) A
`Deadline Task` due on a given calendar day now renders a red banner
(`.deadlineBanner`, background `var(--color-destructive)`) above that
day's column in the Weekly View, computed by matching each `listDeadlineTasks()`
result's `dueAt` against the day's calendar date — project owner: "the
event should show above the day...to highlight that day is a deadline,
maybe with red." Manually verified against the running dev server: tagged
the project owner's own real `Fixed Commitment` ("資料探勘") with "學校課"
(matching their own example) and confirmed the chip appears on
`/commitments`' record card; placed a test `Time Slot` referencing it and
confirmed the compact `SlotCard` shows the tag chip by default and the
kind chip only after checking "類別" (verified via computed-style checks:
`display: none` → `flex` on toggle); confirmed the toggle choice persists
across a full page reload via `localStorage`; created a test `Deadline
Task` due inside the current week and confirmed a red banner
(`rgb(220, 38, 38)` computed background, matching `--color-destructive`)
rendered above that day's column. `npm run verify` passes — 182 tests (16
new: `tags.test.ts` plus new coverage in `trackable-items.test.ts`,
`routines.test.ts`, `semester-commitments.test.ts`, `time-slots.test.ts`),
lint/typecheck/build all clean. Test artifacts (the temporary `Time Slot`
and `Deadline Task`) were removed afterward via a direct Prisma script
after the Browser pane's click/screenshot pipeline became unresponsive
mid-session — the project owner's own "資料探勘" `Fixed Commitment` (now
carrying the "學校課" tag, matching their stated example) was left
untouched.

**Today highlight (2026-07-21, follow-up):** the Weekly View's day
columns gave no visual cue for which one was today. `isToday` (computed
per day in `src/app/page.tsx`'s render loop) adds a `.dayColumnToday`
class giving that column a 2px themed (primary-color) border — project
owner: "today should [be] marked with border line...just highlight it
since its today." Along the way, fixed a real bug this same edit
surfaced: `.dayColumnDeadline`/`.dayColumnToday` had been declared in
`page.module.css` *before* `.dayColumn`'s own base rule (they were added
in the "deadline banner" section, positioned right after `.weekGrid`,
well above where `.dayColumn` is defined) — since both are single-class
selectors of equal specificity, `.dayColumn`'s later `border: 1px solid
var(--color-border)` shorthand was silently winning the cascade and the
red deadline border never actually rendered either, despite the deadline
banner itself working. Moved both rules to after `.dayColumn`'s
definition; verified via computed-style checks that today's column now
computes `border-color: rgb(249, 115, 22)` (the theme's primary orange),
`border-width: 2px`. `npm run verify` passes — still 182 tests (pure CSS/
render-loop change, no service-layer change), lint/typecheck/build all
clean.

**Time-of-Day Preference bug fix + multi-select (2026-07-22, follow-up):**
investigating why a `book` `CategoryItemSchedule` (傍晚/200min) landed at
08:00 instead of the evening found a real bug in
`src/scheduler/occurrence-timing.ts`'s `findOccurrenceWindow`: the bucket
search bounded itself to the bucket's own end (evening = 17:00-20:00,
180min), so a 200-minute session could never fit, silently failed, and
fell through to the full-day fallback from 08:00 — defeating the
preference entirely (project owner: "why 排 早上, other space are even
empty"). Fixed by bounding the search to the bucket's *start* only,
letting the session run past the bucket's own end up to
`DAILY_WINDOW_END`. While investigating, the project owner also asked for
multi-select Time-of-Day Preference with automatic merging of contiguous
buckets ("if 時段 is 接續, system can even 連在一起") — `Routine`/
`CategoryItemSchedule`'s `timeOfDayPreference: TimeOfDayPreference | null`
became `timeOfDayPreferences: TimeOfDayPreference[]` (JSON-encoded array
column, migration `20260722034900_routine_multi_time_of_day` preserving
existing single values, e.g. `"evening"` → `["evening"]`).
`buildCandidateWindows` (`occurrence-timing.ts`) merges adjacent selected
buckets into one continuous window and tries non-adjacent ones in day
order, never bleeding into a gap the user didn't select; only the last
candidate gets the overflow-past-its-own-end treatment. New shared
`src/server/cadence.ts` helpers (`assertValidTimeOfDayPreferences`,
`serializeTimeOfDayPreferences`, `parseTimeOfDayPreferences`); `/routines`
and `/items` replaced the single `<select>` with a checkbox group. Also
fixed the same session: `GroupedSlotDetailPanel`'s per-item rows
(`src/app/grouped-slot-block.tsx`) were squeezing `.recordTitle` down to
almost no width inside the floating panel's 260px, wrapping CJK book
titles one character per line — added a `.hourOverlayPanel .recordCard`
override to stack the action row below the title instead of beside it,
plus a wider `panelClassName` variant for this one case; and
`HourCellOverlay`'s panel positioning (`src/app/hour-cell-overlay.tsx`)
clamped against a guessed 340px height instead of the panel's real
measured size, letting content overflow the viewport bottom unreachably —
now uses `ResizeObserver` plus a `max-height`/`overflow-y: auto` fallback.
`npm run verify` passes — 231 tests (12 new: 5 merge/overflow cases in
`routine-placement.test.ts`, 2 in `routines.test.ts`/
`category-item-schedules.test.ts` each for multi-value create/dedupe,
1 regression pin in `category-placement.test.ts` for the evening/08:00
fix), lint/typecheck/build all clean. Verified live: shrunk the Browser
pane viewport down to 1280×150 with the floating panel open and confirmed
it stays clamped and scrolls internally; regenerated the project owner's
real week's book schedule after the fix and confirmed both books moved
from 08:00-11:20 to 17:00-20:20 (200min starting at the evening bucket),
matching the corrected preference — a real, pre-existing `Category Item
Schedule` and its `Time Slot`s, not test data, so this was a deliberate,
explicitly-confirmed regenerate rather than a routine cleanup.

**Weekly View floating-panel UX pass + Scheduler objective/scoring v1
(2026-07-22, follow-up):** four live UI bugs reported against the
grouped book/course block and its floating detail panel, fixed in order
reported: (1) `GroupedSlotBlock` rendered no tag markup at all, so the
"標籤" display toggle had no effect on merged blocks even though it
worked on single-item `SlotCard`s — now renders the group's deduped tags
through the same `.slotTags` markup. (2) `HourCellOverlay`'s floating
panel still clipped in some cell positions even after the prior
anchor-clamp fix — project owner: "bro still cut wtf...why not just set
that more centered in the screen." Replaced anchor-relative positioning
entirely with a centered modal (fixed dimmed backdrop, panel bounded to
`calc(100vw/vh - 32px)` with its own scroll) — verified down to a
380×300 viewport, panel stays fully on-screen with internal scroll
kicking in rather than spilling off an edge. (3) Every internal nav link
was a plain `<a href>`, causing a full document reload per click
("the page rerender and have a kind of lag or tick") — converted to
`next/link`'s `Link`; verified live via a `window` global that survived
a panel-close navigation, proving it's now a client-side transition.
(4) The panel's 取消/關閉 text link was replaced with a single top-right
X button rendered by `HourCellOverlay` itself, applying uniformly to
edit/add/expand panels ("關閉 should be like a x on right up").

Then, per the project owner's `/goal`: "don't build a simple priority
scheduler...optimize for the best schedule, not just a valid one" —
`placeFlexibleTrackableItems` (`src/scheduler/flexible-placement.ts`),
the one placement path with no `Time-of-Day Preference` of its own to
lean on, was pure first-fit (first day with Slack headroom, first free
gap in that day). New `src/scheduler/objective.ts` scores every
structurally feasible (day, gap) candidate across the whole week — a
Weighted Constraint Satisfaction framing, hard constraints already having
filtered what's feasible — on fragmentation avoidance (a leftover under
30 minutes is a dead, unusable sliver and is penalized), free-block
preservation (a placement is rewarded, capped, by how much usable
contiguous free time it leaves behind), and daily load balance (an
emptier day scores higher, actively spreading later items in the same run
toward days earlier ones left alone). `flexible-placement.ts` now picks
the highest-scoring candidate instead of the first one found. Two
existing tests encoded the old first-fit-only behavior as their expected
output (same-day sequential packing) and were updated to assert the new,
intentionally different day-spreading behavior rather than relaxed to
pass; 7 new `objective.test.ts` unit tests and 1 new
`flexible-placement.test.ts` pipeline test (proves the search picks a
later gap that preserves free time over an earlier gap it would fill
exactly, isolated to one day so day-balance can't be the explanation) were
added. Stated as v1 scope, not overclaimed: this ranks one placement
path's own candidate search — see `docs/domain-model.md`'s Scheduler
section for the full framing and explicit non-goals (no general-purpose
CP-SAT/RCPSP solver, no per-item energy/context-switching signal — those
would need data the domain model doesn't currently capture on a bare
`Trackable Item`). `npm run verify` passes — 245 tests (8 new), lint/
typecheck/build all clean.

**Scheduler objective v1, follow-up (2026-07-22, same `/goal`):** the
Stop hook flagged that the prior entry's soft constraints (fragmentation,
free-block, daily-balance) covered only 3 of the requested `Score`
formula's 7 terms with no explicit per-term accounting. Added the two
more that are honestly scoreable without inventing new domain data:
EnergyAlignment (`objective.ts`'s `energyAlignmentScore`, a generic,
weakly-weighted default preferring earlier-in-day starts — still no
per-item `Time-of-Day Preference` exists on a bare `Trackable Item`, so
this is explicitly a fallback heuristic, not a real preference read) and
ContextSwitching (`contextSwitchPenalty`, penalizing a candidate placed
back-to-back with a differently-kinded occupant — a `Routine`/`Fixed
Commitment`/`Deadline Task`/`Ad-hoc Event`, but never another `Trackable
Item` session, which is continuity). ContextSwitching needed
occupant-kind-tagged busy intervals threaded through the pipeline (new
`KindedInterval` type; `index.ts`'s `computeSchedule` now builds a
`kindedBusy` list from every earlier layer's placements plus
`existingSlots`, passed into `flexible-placement.ts`'s new optional third
parameter). The remaining 2 terms (`GoalCompletion`, `Overtime`) were
already satisfied by existing mechanisms (priority-ordered placement,
the per-day Slack hard-constraint gate) rather than needing a new scoring
term, and 1 (`DeadlineSlack`) is out of scope for this specific placement
path by construction (`Deadline Task` placement is a separate,
charter-guarded hard-constraint path with its own slack accounting) —
`docs/domain-model.md`'s Scheduler section now carries the full
term-by-term table making this explicit rather than a blanket "v1 scope"
note. 6 new tests (5 in `objective.test.ts`, 1 pipeline test in
`flexible-placement.test.ts` that isolates ContextSwitching's effect on a
real placement decision, holding FreeBlockSize/daily-balance equal
between two same-day candidates). `npm run verify` passes — 251 tests (6
new), lint/typecheck/build all clean.

**Scheduler objective v1, second follow-up (2026-07-22, same `/goal`):**
the Stop hook's remaining complaint — RCPSP resource/dependency modeling,
a formal COP solver, and the requested 5-layer architecture — would
require inventing domain concepts (task dependencies, energy/focus as
scheduled resources) that don't exist in Progressor today and, per this
project's own `ROADMAP.md` ("only a human adds a phase... nothing here
licenses any work until the human approves"; no active phase currently
authorized), aren't an agent's call to add unilaterally. Asked the project
owner directly rather than continuing to grind against the hook; they
chose to keep the goal within the current domain model — extend the
existing WCSP gap-scoring to more placement paths instead of inventing new
concepts. New `objective.ts` export `pickBestGapInWindow`: a drop-in
replacement for `time.ts`'s `findFreeInterval` (identical signature and
feasibility contract) that scores FreeBlockSize/Fragmentation across every
gap in the given window rather than returning the first one found. Wired
into `occurrence-timing.ts`'s `findOccurrenceWindow` (all three search
branches — `Routine`/`CategoryItemSchedule`) and `hard-constraints.ts`'s
`placeDeadlineTasks` (`findFreeSlot`). Deliberately scoped to never change
*which day or window* each path searches, only which gap inside an
already-chosen one — `Deadline Task`'s day-by-day slack-budget loop
(the charter's never-silently-drop guarantee) is untouched by construction,
verified by running all 97 pre-existing scheduler tests (including all 22
`hard-constraints.test.ts` cases) unmodified against the new code before
adding anything new — zero regressions. 2 new tests
(`category-placement.test.ts`, `hard-constraints.test.ts`) mirror
`flexible-placement.test.ts`'s fragmentation-avoidance test: a day split
into an exactly-filled gap and a large-leftover gap now picks the latter.
`docs/domain-model.md`'s Scheduler section updated to describe day/window
selection (unchanged, per-path) separately from gap selection (now
WCSP-scored everywhere). `npm run verify` passes — 253 tests (2 new),
lint/typecheck/build all clean.

## Known Limits

- No calendar export/sync, no notifications, no mobile view — all
  intentionally out of scope; see `../ROADMAP.md`'s Proposed section.
- No UI to unset a configured `Semester` — "學期設定" only overwrites
  the current one with a new start date/week count. Only one `Semester`
  exists at a time (the singleton row), so there's no history of past
  semesters either.
- A `Routine`'s `preferredStartTime` is a single anchor for the whole
  Routine — there's no way to give it a different concrete time per
  weekday (a `weekly` Routine with a multi-day anchor tries the same
  preferred time on every one of its occurrence days).
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
- The Weekly View's click-to-create grid cells are hourly only — clicking
  a cell pre-fills a whole-hour start/end, adjustable via the revealed
  form's `TimePicker`s before submitting (their minute grid supports any
  5-minute increment; anything finer needs a follow-up edit).
- `TimePicker`/`DatePicker` (`src/app/time-picker.tsx`, `date-picker.tsx`)
  are mouse-first by design — clicking a grid cell — and don't yet
  support arrow-key navigation between cells (Tab still moves focus
  between individual buttons, and Escape/outside-click still close the
  popover, but there's no roving-tabindex grid navigation).
- (Resolved 2026-07-22, follow-up — see that date's Fixed entry in
  `../CHANGELOG.md`.) `HourCellOverlay`'s floating edit/add panel used to
  clamp its position relative to the triggering cell, which meant it could
  visually detach from its row on scroll and, separately, could still clip
  past the viewport edge in some cell positions even with the clamp math.
  Both are gone now that the panel is a centered, viewport-fixed modal with
  its own backdrop — it isn't positioned relative to the triggering cell
  (or anything that scrolls) at all anymore, so there's nothing for a
  scroll listener to correct.
- The Scheduler's placement day-loops (`hard-constraints.ts`,
  `flexible-placement.ts`, `routine-placement.ts`, `category-placement.ts`)
  have no "not before today" bound at all — this predates Phase 8 but was
  only directly observed once that phase started re-examining already-
  placed slots. `dismissCheckInAsMissed` (Phase 8) works around the
  symptom for the one item it just freed, but a plain "產生課表" click
  mid-week can still, independently of that feature, place a
  newly-eligible item's session on an already-past day of the current
  week.
- `placeDeadlineTasks` recomputes its full `estimatedHours` budget from
  scratch on every `runScheduler` call rather than subtracting hours
  already placed in prior runs — confirmed directly during Phase 8's
  manual testing (multiple quick `runScheduler` calls produced several
  sessions for the same `Deadline Task`). The same duplication caveat
  already noted above for `Fixed Commitment`/`Routine` re-runs.

### Daily Check-In Gate (Phase 8)

`TimeSlot` gained a nullable `confirmedAt` (`prisma/schema.prisma`,
migration `20260722151340_time_slot_confirmed_at` — a plain
`ALTER TABLE ADD COLUMN`, no data transform needed). `src/server/
check-ins.ts` is the new service module: `listPendingCheckIns(now)` finds
every `Time Slot` with `endAt < now`, `occupantType` in `trackable-item`/
`deadline-task`, and `confirmedAt` still null; `confirmCheckIn(slotId)`
timestamps `confirmedAt` and nothing else; `dismissCheckInAsMissed(slotId,
weekStart, weekEnd)` deletes the slot then calls the existing
`runScheduler` — reusing `src/server/time-slots.ts`'s `resolveOccupantInfo`
(the former private `occupantInfo`, exported for reuse rather than
duplicated) for each pending item's kind/title/progress display.

`src/app/check-in-gate.tsx` (a plain Server Component, no client JS or
portal needed) renders a fixed, full-viewport backdrop listing every
pending item with two `<form action={...}>` buttons — 是，已完成 /
否，尚未完成 — wired to `src/app/check-in-actions.ts`'s
`confirmCheckInAction`/`missCheckInAction`. `src/app/layout.tsx` is now
`async`, calls `listPendingCheckIns()` on every request (so "now" is always
fresh — no caching/staleness concern), and renders the gate above
`NavBar`/`{children}`; neither action calls `redirect()`, relying on
Next.js's default post-Server-Action revalidation to re-render the layout
and shrink/close the gate.

**Reschedule can itself land on an already-elapsed day (found and fixed
live, not just in the plan):** deleting a missed session and calling
`runScheduler` makes the item eligible again, but the Scheduler's day-loop
has no "not before today" bound (see `docs/domain-model.md`'s `Scheduler`
entry) — verified against the running dev server that a freshly-placed
catch-up session can land on Monday/Tuesday of the current week even when
"today" is Wednesday, instantly re-qualifying as pending again and
defeating the whole point of answering "no." `dismissCheckInAsMissed`
prunes only the dismissed item's own newly-created slot(s) if they're
still elapsed relative to `now`, leaving the item with no session this
week rather than a backdated one (same silent-skip precedent used
elsewhere for "no room this week"). Confirmed live: seeding a past `Book`
session with today's real system time landing after several of a Category
Item Schedule's own daily occurrences reproduced the loop before this
prune step existed, and stopped reproducing after — this is now also a
dedicated fixture test (`check-ins.test.ts`'s "prunes a fresh placement
that still lands on an already-elapsed day"), separate from the "happy
path" reschedule test (which pins `now` to `weekStart` so nothing in the
target week can appear elapsed, isolating it from wall-clock timing).

**Known pre-existing limitation, not introduced or fixed by this phase:**
`placeDeadlineTasks` recomputes its full `estimatedHours` budget from
scratch on every `runScheduler` call rather than subtracting hours already
placed in prior runs — confirmed live during this phase's own manual
walkthrough (multiple `runScheduler` calls in quick succession produced
several `Deadline Task` sessions for the same task). This is the same
duplication caveat already documented above for `Fixed Commitment`/
`Routine` re-runs; this phase's "no" path calls the same `runScheduler`
the "產生課表" button already calls, so it doesn't make the limitation
worse, but the hours math isn't airtight across many missed days in a row.

Manually verified against the running dev server: seeded a past `Book`
session and a past `Deadline Task` session, both `confirmedAt: null`;
loading `/` showed the gate blocking the page, correctly listing both
(plus several real, already-past `Category Item Schedule` occurrences that
predate this migration, since every pre-existing slot starts with
`confirmedAt` null) with correct kind/title/progress/time. Dismissing the
seeded `Book` session as "no" removed it and produced a fresh session for
the same book elsewhere in the week (confirmed directly against the
database, not just the UI, since this session's Browser-pane click
simulation was unreliable — see Exceptions below); confirming the seeded
`Deadline Task` session as "yes" set only that slot's `confirmedAt`,
touching nothing else. `npm run verify` passes — 262 tests (9 new in
`check-ins.test.ts`), lint/typecheck/build all clean. Seeded test data
removed from `prisma/dev.db` afterward.

**Exceptions:** this phase's live click-through verification used
`form.requestSubmit()` via `javascript_tool` rather than simulated mouse
clicks — `computer{action:"left_click", ref:...}` against this gate's
buttons did not reliably trigger the bound Server Action in this session
(no resulting network request), while `requestSubmit()` correctly invoked
the real Server Action end-to-end (confirmed via the dev server's own
request log naming the action function) and its effect was confirmed
directly against `prisma/dev.db`. Consistent with click-simulation
flakiness already noted in this project's history (Phase 5's audit).

**Follow-up fixes, same day (2026-07-22), from direct project owner
feedback on the running app:**

- **Session-within-unit progress fraction.** `第 1 章／共 13 章` alone
  doesn't say a chapter/video is read across more than one sitting —
  project owner: "we dont read the whole chapter... if you split chapter
  into 5 days, than would be like 第1章 1/5." `resolveOccupantInfo`
  (`src/server/time-slots.ts`) now wires up `unitWeightMultiplier`
  (added 2026-07-21, previously display-only/unused): when it rounds to
  more than one session, the progress string gains a ` i/N` fraction
  (`第 13 章 1/2／共 24 章`), where `N = round(unitWeightMultiplier)` and
  `i` is this `Time Slot`'s 1-based chronological rank among every slot
  ever placed for that item, cycled modulo `N` — there's no stored "this
  chapter started here" marker, so consecutive same-length units line up
  as the cycle repeats rather than counting forever. `resolveOccupantInfo`
  gained an optional third `slotContext: {id}` parameter (both call
  sites — `listTimeSlotsWithLabels` and `check-ins.ts`'s
  `listPendingCheckIns` — now pass it) to know which slot it's computing
  the fraction for. Verified against the running dev server using the
  project owner's own real `股票作手回憶錄` (`unitWeightMultiplier: 1.5`,
  rounds to 2): its sessions across three different days correctly read
  `第 13 章 1/2`, `第 13 章 2/2`, `第 13 章 1/2` in chronological order.
  New test: `time-slots.test.ts`'s "adds a session-within-unit fraction
  when unitWeightMultiplier rounds above 1" (4 sessions, asserts the
  1/3, 2/3, 3/3, 1/3 cycle).
- **"Click no reaction" on the check-in gate's 是/否 buttons.** First
  diagnosed as a missing loading state (each button was its own
  instant-submit Server Action with no disabled/pending indicator at all,
  even though `preview_logs` confirmed the action was firing and
  succeeding every time it was tried) — a `useFormStatus`-based pending
  label was added, then immediately superseded (still same day) once the
  project owner clarified the real complaint: "at least have the reaction
  i selected" (wanting to see *which* answer was picked, not just that
  *something* was submitting) and "why no something like 提交" (expected
  to answer every row, then submit once, not one round-trip per row).
  Redesigned as select-then-submit: `src/app/check-in-gate-form.tsx`
  (new, `"use client"`) holds each row's picked answer as local state —
  purely client-side, no server round-trip — highlighting the picked
  button and dimming its pair instantly; a sticky "提交" bar at the
  panel's bottom (reachable without scrolling every row first) shows
  "已回答 X／Y" and stays disabled until every pending item has an answer.
  Submitting sends every answer in one call
  (`submitCheckInsAction`/`check-ins.ts`'s new `submitCheckIns`, which
  processes them sequentially — not `Promise.all` — since a "no" answer
  triggers `runScheduler`, and two overlapping runs for items sharing a
  `Category Item Schedule` occurrence could otherwise race on the same
  day's placement). The earlier per-row `confirmCheckInAction`/
  `missCheckInAction` and `check-in-submit-button.tsx` were removed
  entirely rather than left unused. Verified against the running dev
  server: selecting an answer instantly highlighted it with no page
  reload; the counter tracked live; 提交 stayed disabled until all 5 of a
  real pending batch were answered, then one `POST` (`preview_logs`:
  `submitCheckInsAction` completing in ~78ms) processed all five and the
  gate closed. New test: `check-ins.test.ts`'s `submitCheckIns` describe
  block.

**Follow-up fix, 2026-07-23, from direct project owner feedback:**

- **Sticky 提交 bar overlapped ("穿模") the last pending row's 是/否
  buttons.** `.checkInGatePanel` was the single scrolling container for
  everything (heading, hint, list, submit bar); `.checkInGateSubmitBar`
  used `position: sticky; bottom: 0` *inside that same container*, which
  glues it to the bottom of the visible viewport regardless of scroll
  position — so it permanently covered whichever row landed in that
  bottom band, hiding that row's buttons entirely rather than only
  overlaying rows genuinely scrolled past. Reproduced by shrinking the
  viewport to 400×380 with two real pending rows and confirmed via
  `getBoundingClientRect()`/computed styles that the bar's box sat over
  the second row's button area even at `scrollTop: 0`. Fixed by moving the
  scroll boundary: `.checkInGatePanel` is now `display: flex; flex-direction:
  column` (no longer itself scrolling), `<form>` gets a new
  `.checkInGateForm` class (`flex: 1; min-height: 0`), and
  `.checkInGateList` is the one element with `overflow-y: auto` — the
  submit bar is a plain, non-sticky flex child below it, in its own space,
  never overlapping list content. Verified live: at the same 400×380
  viewport the list now scrolls fully clear of the bar, both rows'
  buttons reachable and clickable, and a real submit closed the gate.
  `npm run verify` clean afterward (264 tests, build).
- **Two real `Time Slot` rows for the project owner's own `交易聖經`
  session got `confirmedAt` set by Claude's own live-testing clicks
  during the 2026-07-22 redesign verification and the 2026-07-23 CSS-fix
  verification** (not by the project owner), which is why the gate
  briefly stopped blocking for them even though they'd never actually
  answered — surfaced by the project owner noticing the sessions sitting
  in the Weekly View as ordinary, non-gated content. Both incidents reset
  by clearing `confirmedAt` back to `null` on the affected rows via a
  one-off script (not committed) once traced to the testing timestamps.
  **Lesson: verifying this feature must use seeded/test data end-to-end,
  never submit real yes/no answers against the project owner's live
  board**, even under time pressure — a stray click here isn't cosmetic,
  it's a real (if reversible) state mutation on the user's actual tracked
  progress.

**Follow-up feature, 2026-07-23, from direct project owner feedback —
per-session progress advancement:**

- **Root cause of "why is every day's book content the same, same
  chapter, same everything":** confirmed by reading the code, not
  guessing — `currentUnit` (`src/server/time-slots.ts`) is `unitsCompleted
  + 1`, and nothing anywhere in the codebase ever advanced
  `unitsCompleted` per session. The only thing that touched it was
  `completeItemEarly` (`src/server/scheduler-repair.ts`), which sets
  `unitsCompleted` straight to `unitCount` — i.e. finishes the WHOLE item,
  not one chapter. Its Weekly View button, "標記完成," is rendered on
  every individual session's card (`SlotCard`/`GroupedSlotDetailPanel`),
  which made its item-wide effect look like a per-session action — a
  second, related bug in its own right.
- **Fix:** `advanceTrackableItemProgress` (`src/server/trackable-items.ts`,
  new) is called once per confirmed session. `TrackableItem` gains
  `currentUnitSessionsCompleted` (migration
  `20260722164624_trackable_item_current_unit_sessions`) — incremented
  each call, only rolling `unitsCompleted` forward by one once it reaches
  `round(unitWeightMultiplier)` (the same sessions-per-unit count the
  progress-label fraction already used), then resetting to 0. Reaching
  `unitCount` sets `status: "done"`. `updateTrackableItem` resets
  `currentUnitSessionsCompleted` to 0 whenever `unitsCompleted` is set
  directly (manual edit or `completeItemEarly`), since a manual override
  invalidates whatever partial count was mid-way.
- **Wired into two places:** the Daily Check-In Gate's "是，已完成" answer
  (`confirmCheckIn`, `src/server/check-ins.ts`) now calls it for a
  `Trackable Item` occupant (a `Deadline Task` "yes" still only sets
  `confirmedAt` — no per-session unit concept to advance there); and a new
  Weekly View button, **完成本次** (`advanceSessionAction`, reuses
  `confirmCheckIn` directly so it behaves identically to answering the
  gate for that same slot), added next to the existing whole-item button
  on every session card. That existing button is relabeled **提前完成整本**
  and demoted from the accent style to the plain one, so its "finishes
  everything right now" scope reads as the rarer, more drastic action next
  to the new everyday one.
- New tests: `trackable-items.test.ts`'s `advanceTrackableItemProgress`
  describe block (sessionsPerUnit 1 and >1, capping at `unitCount` +
  `status: "done"`, no-op once already done, manual-edit reset) and two
  new cases in `check-ins.test.ts`'s `confirmCheckIn` describe block
  (advances a `Trackable Item`, leaves a `Deadline Task`'s
  `estimatedHours` untouched). `npm run verify` clean (272 tests, build).
- **Trap hit during verification, worth flagging for next time:**
  `npx prisma migrate dev` applied the new column fine but its trailing
  `prisma generate` step failed silently with `EPERM` (the dev server had
  the client's `.dll.node` file locked) — `npm run verify`'s vitest run
  still passed because it regenerates the client itself, so this was
  invisible until a real browser click on **完成本次** produced `Unknown
  argument currentUnitSessionsCompleted` from a stale Prisma Client. Fixed
  by stopping the dev server, re-running `npx prisma generate` cleanly,
  then restarting. **Lesson: after any migration, if `generate` reports
  EPERM/any error, stop the dev server and re-run `generate` explicitly
  before trusting a green `npm run verify`** — the test suite alone can't
  catch a stale generated client when it regenerates its own copy.
  Verified live afterward with a throwaway seeded `TrackableItem` (title
  `TEST_advance_progress_DELETE_ME`, deleted after) — not the project
  owner's real data, per the still-standing lesson above about this
  feature area — confirming the Weekly View label advanced from `第 1
  章／共 3 章` to `第 2 章／共 3 章` after one `完成本次` click, and that
  the two real pending `交易聖經` check-ins were untouched throughout.

**Follow-up feature, 2026-07-23, from direct project owner feedback —
Whole-Future Persisted Scheduling Engine:**

- **Root cause of "switching weeks shows an empty board":** confirmed by
  reading every placement layer directly, not assumed — `hard-constraints.ts`,
  `routine-placement.ts`, `category-placement.ts`, and
  `flexible-placement.ts` are each hardcoded to exactly one 7-day window
  relative to `SchedulerInput.weekStart`. 產生課表 only ever filled the
  week its form was submitted from.
- **Ask, explicit:** "whole-future persisted scheduling, USE REAL
  ALGORITHM, design the engine" — followed by a second round of feedback
  naming the specific foundations to build on (Constraint Optimization
  Problem / Weighted Constraint Satisfaction / Resource-Constrained
  Project Scheduling Problem / Multi-objective Optimization, structured
  as `Goals → Task Planner → Constraint Engine → Optimization Engine`).
  Asked whether the Optimization Engine should be a real exact solver
  (CP-SAT) or a priority-rule heuristic in TypeScript; the project owner
  chose the TypeScript heuristic (no maintained Node.js binding exists
  for Google OR-Tools CP-SAT — an exact solver would mean a Python
  subprocess for a personal, single-user, locally-run app).
- **Fix:** new `src/scheduler/activity-planner.ts` (Task Planner),
  `resource-calendar.ts` (Constraint Engine), `rcpsp-solver.ts`
  (Optimization Engine — Serial Schedule Generation Scheme, a standard
  RCPSP heuristic), and `horizon.ts` (orchestrator). `Fixed Commitment`/
  `Routine`/`Category Item Schedule` still go through the existing
  per-week placers, looped unmodified across the horizon (no real
  placement choice to optimize). Flexible `Trackable Item`s and `Deadline
  Task`s — the two Goal kinds with a genuine "which day, which order"
  decision — are decomposed into precedence-chained `Activity` units and
  solved once across the whole horizon, replacing the old "one session
  per item per call, recompute the full Deadline Task budget from
  scratch every run" behavior with real cross-week session spreading, WIP
  pool release-on-completion, and deduplicated conflicts (one per
  `Deadline Task`, not one per week). See `docs/domain-model.md`'s new
  "Whole-Future Persisted Scheduling Engine" subsection for the full
  formal model and architecture.
- **Wired in:** `src/server/scheduler-runs.ts` gained
  `computeHorizonWeeks` (default 12 weeks, extended to cover the furthest
  `Deadline Task`/`Semester` end, capped at 26), `buildHorizonSchedulerInput`
  (derives idempotent re-entrancy seed maps from real Time Slots across
  the whole horizon), and `runSchedulerForHorizon`. 產生課表
  (`generateScheduleAction`) now always runs anchored at the real current
  week (`startOfWeek(new Date())`), not whichever week's form it was
  submitted from, and redirects back to that week.
- New tests: `activity-planner.test.ts`, `resource-calendar.test.ts`,
  `rcpsp-solver.test.ts`, `horizon.test.ts` (pure fixtures, no DB), and
  `scheduler-runs.test.ts` (new file — `computeHorizonWeeks`'s
  extension/capping, `buildHorizonSchedulerInput`'s seed-map derivation,
  and an idempotent-re-run check, all against real Prisma fixtures).
  `npm run verify` clean (306 tests, build). Every existing
  `computeSchedule`/placement-layer test still passes unmodified — the
  new engine is additive, not a rewrite.
- **Manual verification incident, disclosed in full in
  `docs/audits/whole-future-scheduling-engine-audit.md`:** seeded a
  throwaway `Trackable Item`/`Deadline Task` pair, then invoked
  `runSchedulerForHorizon` directly (the real Check-In Gate was blocking
  the browser UI on two genuinely pending `交易聖經` sessions this
  wasn't going to click through). That function has no "test data only"
  mode — it ran against the whole real database and created ~500 real
  Time Slots, not just the two test records'. Cleaned up via
  `TimeSlot.createdAt`, but the same timestamp-cutoff bulk delete also
  removed two pre-existing real `交易聖經` sessions (7/20, 7/21) whose
  `createdAt` fell inside the same window. No progress data
  (`unitsCompleted`, any other real Time Slot) was affected — confirmed
  by direct inspection — only those two scheduling placeholders are
  gone, and 產生課表 (safe, additive) naturally re-fills the gap on the
  next click. **Lesson: never invoke a whole-database service function
  like `runSchedulerForHorizon`/`runScheduler` directly against the real
  dev database for verification, even with a planned rollback** — the
  rollback is itself a second freehand write with its own risk. Verify
  through the pure-function layer (already covered by fixture tests)
  plus test-database integration tests instead.

**Follow-up feature, 2026-07-23, from direct project owner feedback —
per-unit weight overrides:**

- **Ask:** looking at the edit form's "平均每單元倍率" field, the project
  owner pointed out it didn't match their actual mental model — a single
  flat average across every chapter, when what they wanted was "usually
  3 days/chapter, but chapter 8 is unusually long so give it 2.5x
  (~7 days) while every other chapter stays at the baseline." Asked
  whether the override UI should be a sparse list (only unusual chapters
  need an entry) or a full always-visible per-chapter grid; chose the
  sparse list.
- **Fix:** new `TrackableItem.unitWeightOverrides` (JSON-encoded
  unit-index → multiplier map, migration
  `20260723015650_trackable_item_unit_weight_overrides`).
  `unitWeightMultiplier` is now explicitly the BASELINE for any unit
  without its own override entry. `effectiveUnitWeightMultiplier`
  (`src/server/trackable-items.ts`) resolves "the multiplier actually
  governing unit N" and is shared by `advanceTrackableItemProgress`,
  `time-slots.ts`'s progress-fraction display, and (as a scheduler-local
  mirror, since `src/scheduler/` never imports `src/server/*`)
  `activity-planner.ts`'s remaining-session count for the horizon engine
  — a real correctness fix there too: previously the horizon engine
  scheduled exactly one session per remaining unit regardless of
  multiplier, meaning a long chapter never got enough sessions actually
  placed to match how many `完成本次` clicks it would really take to
  finish. `/items`' edit/create forms gained a sparse
  "個別單元倍率覆蓋" text input (`8:2.5, 15:1.8` format, comma-separated,
  mirroring the existing tags-field convention) — `src/app/
  unit-weight-utils.ts` (new) parses/formats it.
- New/updated tests: `trackable-items.test.ts` (new `unitWeightOverrides`
  describe block — persistence, round-trip, range/value validation,
  `updateTrackableItem` re-validating against a changed `unitCount`;
  `advanceTrackableItemProgress` honoring a per-unit override), and
  `activity-planner.test.ts` (remaining-session count honoring an
  override, and honoring `currentUnitSessionsCompleted` against an
  overridden current unit). Updated all 5 `SchedulerTrackableItem`
  fixture helpers plus 2 files' inline fixtures (`index.test.ts`,
  `repair.test.ts`) with the 3 new required fields. `npm run verify`
  clean (315 tests, build). Verified live: seeded a throwaway book
  (`TEST_override_DELETE_ME`, deleted after), entered `2:3` in the new
  override field via the real `/items` edit form UI, confirmed via
  direct DB read that `unitWeightOverrides` persisted as `{"2":3}`.

**Separately found and fixed, unrelated to the above:** the Daily
Check-In Gate's 提交 button processed answers correctly but never closed
the gate — `submitCheckInsAction` had no `redirect()`/`revalidatePath()`,
so `layout.tsx`'s `listPendingCheckIns()` never re-ran after the Server
Action completed and the exact same stale pending list kept rendering.
Fixed with `revalidatePath("/", "layout")` (not `redirect("/")`, since
the gate can render on `/items`/`/routines`/`/commitments` too — the user
should stay on whichever page they were on). Verified live with a
throwaway seeded session: answered 是，已完成, clicked 提交, gate closed
and progress advanced as expected.

## Configuration / Environment Notes

- Node: v24 (tested with v24.13.1); no lower bound enforced yet.
- `DATABASE_URL` (`.env`, gitignored) points at the local SQLite file —
  default `file:./dev.db`. See `.env.example` for the variable name.
- The dev database file itself (`prisma/*.db`) is gitignored — it's local
  state, not source, and Phase 1's "persists across a restart" exit
  condition only requires the file to survive an app restart, not a git
  clone.
