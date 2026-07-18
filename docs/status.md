# Status

Source of truth for current, actually-implemented behavior. If this doc and
the running code disagree, the code wins and this doc is out of date — fix
the doc as part of whatever change you're making, don't leave the drift for
later.

**Bootstrap state:** the Phase 1 scaffold (Next.js + TypeScript + Prisma/
SQLite + Vitest + ESLint) exists and the task gate passes on it. Every
domain concept from `docs/domain-model.md` is now persisted at the data
layer, and the manual Weekly View (`Schedule`) is implemented as the first
UI-layer surface. The remaining `PRIORITIES.md` item is the Phase 1
walkthrough/audit that closes the phase gate.

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

For the active phase ("Data Layer & Manual Weekly View," see
`../ROADMAP.md`), the phase gate is:

1. `npm run verify` passes.
2. A written manual walkthrough, executed and recorded in a
   `docs/audits/` entry, that exercises every bullet in the phase's exit
   condition: create a `Book`/`Course`, restart the app and confirm the data
   persisted, exceed a `WIP Limit` and confirm it's rejected (not silently
   allowed), create a `Routine` and a `Semester Commitment` of both kinds,
   navigate the Weekly View across 上週/本週/下週, and manually add/edit/
   remove a `Time Slot` without corrupting a neighboring one.

Later phases (Constraint-Based Auto-Scheduler v1, Elastic Re-Scheduling)
will each add fixture-replay tests to this section when they're activated —
see their exit conditions in `../ROADMAP.md`.

## Current Behavior

The Next.js app scaffold exists (`src/app/`, default starter page, no
Progressor-specific UI yet). Prisma is wired to a local SQLite file via
`src/server/db.ts` (a cached client singleton, safe under Next.js dev-mode
hot reload).

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

## Known Limits

- No calendar export/sync, no notifications, no mobile view — all
  intentionally out of scope; see `../ROADMAP.md`'s Proposed section.
- Single-user only; no auth, no multi-device sync beyond the local SQLite
  file.
- "Generate Schedule" re-placing a `Fixed Commitment`/`Routine` occurrence
  as a duplicate `Time Slot` on repeated clicks for the same week — see
  the Scheduler section above for why and the tradeoff behind it.
- No creation UI yet for `Book`/`Course`/`Routine`/`Semester
  Commitment`/`Ad-hoc Event` — only `Time Slot` placement (manual or via
  "Generate Schedule") has a UI.

## Configuration / Environment Notes

- Node: v24 (tested with v24.13.1); no lower bound enforced yet.
- `DATABASE_URL` (`.env`, gitignored) points at the local SQLite file —
  default `file:./dev.db`. See `.env.example` for the variable name.
- The dev database file itself (`prisma/*.db`) is gitignored — it's local
  state, not source, and Phase 1's "persists across a restart" exit
  condition only requires the file to survive an app restart, not a git
  clone.
