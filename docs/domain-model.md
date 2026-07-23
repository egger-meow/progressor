# Domain Model

Shared vocabulary for Progressor. If code, docs, or conversation use a term
for a core concept that isn't defined here, either the term is wrong or this
doc is out of date — fix whichever it is before proceeding. Concept names
below are bilingual on purpose (中文名 + English identifier) per the
project's documentation-language decision; **code always uses the English
identifier**, never the Chinese gloss, so grep-ability stays intact.

## Concepts

### Trackable Item（追蹤項目）

Abstract concept for anything the user is reading/studying through in
discrete units over multiple sittings. Concrete kinds: `Book`, `Course`.
Fields: `id`, `title`, `type` (`book` | `course`), `priority` (使用者指定的
整數優先度，數字越小越優先), `status` (`not-started` | `in-progress` |
`paused` | `done`), `unitCount`（總單元數）, `unitsCompleted`（已完成單元數）,
`estimatedDays`（完成剩餘進度所需天數，不是整個項目的總天數 — 2026-07-21
澄清）, `targetDate`（可選，明確指定的目標完成日期，與 `estimatedDays`
互相獨立，不會自動互相推算——尚未開始的項目通常沒有「今天」可以當基準，
2026-07-21 新增）, `unitWeightMultiplier`（BASELINE 倍率，預設 1.0，代表
「沒有個別設定的單元，平均比正常長 N 倍」；接入見下方
`currentUnitSessionsCompleted`, 2026-07-21 新增）, `unitWeightOverrides`
（選填，個別單元索引→倍率的覆蓋表，2026-07-23 新增——見下方「Per-Unit
Weight Override」）, `currentUnitSessionsCompleted`（目前這個單元已確認完成
的堂數，2026-07-23 新增 — 見下方「Per-Session Progress」）, `tags`（見下方
Tag）. A Trackable Item may have many `Time Slot` occurrences assigned to it
across many weeks, but at most one `status` at a time.

#### Per-Unit Weight Override（個別單元倍率覆蓋）

Added 2026-07-23 after the project owner pointed out `unitWeightMultiplier`
as a single flat per-item average didn't match how they actually think
about it: "usually 排3days one chapter... than lets set chapter 8 longer,
倍率 maybe 2.5, than for that chapter maybe use 3\*2.5≈7 days" — a
per-CHAPTER override, not one number averaged across the whole book.
`TrackableItem.unitWeightOverrides` is a JSON-encoded map from unit index
(1-based, "第 N 章" numbering) to that one unit's own multiplier, entered
in the `/items` edit form as a sparse comma-separated list ("8:2.5,
15:1.8" — most chapters need no entry, only the unusual ones) rather than
an always-visible per-chapter grid. `effectiveUnitWeightMultiplier`
(`src/server/trackable-items.ts`) resolves the multiplier actually
governing a given unit index — its own override entry if one exists,
otherwise the item's baseline `unitWeightMultiplier` — and is the single
source of truth every consumer shares:

- `advanceTrackableItemProgress` — how many sittings the CURRENT unit
  needs before `unitsCompleted` rolls forward (replaces the old flat
  `round(unitWeightMultiplier)`).
- `time-slots.ts`'s `resolveOccupantInfo` — the progress-label session
  fraction (`第 8 章 2/3／共 24 章`) for the current unit.
- `src/scheduler/activity-planner.ts`'s `computeRemainingSessions` (Task
  Planner) — how many Activities to place for each remaining unit, so a
  book with an overridden long chapter gets that many sessions actually
  scheduled, not just one flat session per remaining chapter. This is a
  scheduler-local mirror of the same resolution logic (`src/scheduler/`
  never imports `src/server/*`, see `types.ts`'s header comment), fed
  `SchedulerTrackableItem`'s own `unitWeightMultiplier`/
  `unitWeightOverrides`/`currentUnitSessionsCompleted` fields.

#### Per-Session Progress（單次完成推進進度）

Added 2026-07-23 after the project owner found every session for a `Book`/
`Course` showed the identical chapter/video forever — tracing it found
`unitsCompleted` had **no** mechanism anywhere that ever advanced it per
session; the only thing that touched it was finishing the whole item
early. `advanceTrackableItemProgress` (`src/server/trackable-items.ts`) is
the fix: called once per confirmed session — from the `Daily Check-In`
gate's "是，已完成" answer, or the Weekly View's **完成本次** button
(`advanceSessionAction`, `src/app/actions.ts`) — it increments
`currentUnitSessionsCompleted`, and only rolls `unitsCompleted` forward by
one once that counter reaches `round(unitWeightMultiplier)` (the same
sessions-per-unit count `time-slots.ts`'s progress-label fraction already
uses), resetting the counter to 0. Reaching `unitCount` also sets
`status: "done"`. A manual edit of `unitsCompleted` (via the `/items` edit
form, or `completeItemEarly` finishing the whole item) resets
`currentUnitSessionsCompleted` back to 0 — see `updateTrackableItem`.

This is deliberately distinct from **提前完成整本** (`completeItemAction` →
`completeItemEarly`, `src/server/scheduler-repair.ts`), which finishes the
WHOLE item immediately regardless of which session's card it's clicked
from — kept, relabeled, and visually de-emphasized so its item-wide scope
isn't mistaken for "this one session" (that confusion, sitting right next
to "same chapter forever," was the other half of the project owner's
2026-07-23 complaint).

### Tag（標籤）

Added 2026-07-21: free-text labels the user assigns to a record —
independent of `type`/`category`, multiple per record (e.g. a `Fixed
Commitment` "資料探勘" tagged `學校課`, a `Book` about trading tagged
`trader`). Not its own model — a `tags` field (JSON-encoded string array,
`src/server/tags.ts`) on `Trackable Item`, `Routine`, `Fixed Commitment`,
and `Deadline Task`. Surfaced on a `Time Slot`'s `occupantTags` for display
in the Weekly View (see `Schedule / Weekly View` below).

### Book（書籍）

A `Trackable Item` with `type = "book"`. Its unit is `Chapter`（章節）;
`unitCount` = chapter count.

### Course（線上課程）

A `Trackable Item` with `type = "course"`. Its unit is `Video`（影片／課程
單元）; `unitCount` = video count.

### WIP Limit（同時進行上限）

A configured maximum number of `Trackable Item`s of a given `type` allowed
to have `status = "in-progress"` at once. Enforced independently per type
(one limit for `book`, one for `course`) — starting a new item beyond the
limit is rejected until an existing in-progress item is paused or finished.

### Routine（常規事件）

A recurring, non-deadline commitment. Fields: `id`, `title`, `category`
（如 `gym`、`tutoring`／家教）, `cadence` (`daily` | `weekly` | `monthly`),
`anchor`（依 cadence 決定：weekly 存星期幾，可多個；monthly 存日期）,
`timeOfDayPreferences`（見下；multi-select，2026-07-22）, `durationMinutes`
（每次發生的時長，預設 120 分鐘 — 取代了 Scheduler 過去對所有 Routine 一律
套用的固定 `SESSION_DURATION_MS`）. `tags`（見 Tag）. A `Routine` occurrence
recurs indefinitely until the user edits or deletes the `Routine` itself —
it is not a `Deadline Task` and never has a due date.

### Time-of-Day Preference（時段偏好）

A preference, attached to a `Routine`, expressed as zero or more buckets
(`morning` | `afternoon` | `evening` | `night`, field
`timeOfDayPreferences` — multi-select as of 2026-07-22, was a single
nullable value) and/or a concrete anchor time (field `preferredStartTime`,
`"HH:mm"` — Phase 7, "Semester Scoping for Fixed Commitments & Concrete
Routine Times"). The scheduler (from Phase 2 on) tries `preferredStartTime`
first when set, then the selected buckets: buckets that are adjacent (e.g.
`morning`+`afternoon`, which touch at 12:00) merge into one continuous
search window; non-adjacent selections (e.g. `morning`+`night`, skipping
`afternoon`/`evening`) are tried in day order as separate windows, and a
gap the user didn't select is never silently filled by an earlier
candidate. Only the *last* candidate is allowed to run past its own
bucket's end (up to the full daily window) — this lets a session longer
than a single bucket (e.g. 200 minutes vs. `evening`'s 180-minute span)
still start inside the preferred bucket instead of the whole search
silently failing and falling back to the full daily window from 08:00,
which used to defeat the preference entirely (project owner, 2026-07-22).
If nothing in the selected buckets has room, the scheduler falls back to
the full daily window as a last resort. Phase 1 showed it as metadata
only, since Phase 1 has no scheduler.
See `src/scheduler/occurrence-timing.ts`'s `buildCandidateWindows`.

### Category Item Schedule（分類固定排程）

Added 2026-07-22: an opt-in recurring reservation for one `Trackable Item`
`type` (`book` or `course`) — one row per type, configured on `/items`'
"固定排程" section. Reuses `Routine`'s `cadence`/`anchor`/
`timeOfDayPreferences`/`preferredStartTime`/`durationMinutes` vocabulary
exactly (same shape, shared validation in `src/server/cadence.ts`), but
unlike a `Routine` occurrence — which belongs to one occupant — an
occurrence here is shared by **every currently `in-progress` (or
WIP-Limit-promotable) item of that type at once**: "all books in progress
I will finish the parts at that period" (project owner, 2026-07-22), not
one book picked per occurrence. A `type` with no configured schedule keeps
the original priority-ordered flexible placement (one session per eligible
item, found independently within the week's `Slack` budget) unchanged —
this is additive, never a breaking replacement. See `Schedule / Weekly
View` below for how multiple items sharing one occurrence are displayed.

### Semester（學期）

Added Phase 7 (2026-07-21), not part of the original bootstrap interview:
a configurable `startDate` + `weekCount` (default 16) that bounds a `Fixed
Commitment`'s occurrences to the weeks it covers. A `Fixed Commitment` may
set `ignoreSemesterBounds` to opt out (e.g. a standing meeting with a
professor that isn't tied to term dates). Singleton — one active `Semester`
at a time, matching this app's single-user scope. Drives the Weekly View's
"第 N 週" (week-of-semester) display.

### Semester Commitment（學期事務）

Umbrella term for anything that appears once a semester starts. Splits into
two mutually exclusive kinds:

- **Fixed Commitment（固定事務）**：anchored to an exact recurring time slot
  that cannot move — weekly class, weekly meeting/report slot. Structurally
  like a `Routine` with `cadence = "weekly"`, but semantically distinct: it
  is a hard constraint, never a schedulable-around preference. Bound to the
  `Semester` window by default (`ignoreSemesterBounds = false`); a
  commitment not actually tied to term dates (e.g. a standing meeting with
  a professor) can set `ignoreSemesterBounds = true` to show every week
  regardless — see `Semester` below. Also carries `tags`（見 Tag）.
- **Deadline Task（期限任務）**：has a `dueAt`（also drives the Weekly
  View's red deadline-day banner, see `Schedule / Weekly View` below）but
  flexible placement before that time — homework, quiz/exam prep, report
  writing. Carries `estimatedHours`（a total work-hour budget, not a day
  count — renamed from `estimatedDays`, 2026-07-21）: the Scheduler
  (`placeDeadlineTasks`, `src/scheduler/hard-constraints.ts`) splits this
  budget across one session per day (capped at 2h/day, and by each day's
  Slack budget so it can't pack a day solid) over as many days as it
  takes before `dueAt`, instead of one fixed-length session. Hours that
  still don't fit before the deadline are surfaced as a
  `SchedulerConflict` rather than silently dropped. Also carries `tags`
  （見 Tag）.

### Ad-hoc Event（臨時事件）

A one-off, non-recurring event the user declares — either pre-placed by the
scheduler as a suggestion, or injected by the user at the last minute (「我
現在要出門見朋友」). Per the charter's Guardrails, an `Ad-hoc Event` always
outranks flexible `Trackable Item` work when both want the same `Time Slot`.

### Time Slot（時段）

The atomic bookable unit inside a `Schedule`: `startAt`, `endAt`, and what
occupies it — one of a `Routine` occurrence, a `Fixed Commitment` occurrence,
a `Deadline Task` work-session, a `Trackable Item` work-session, an
`Ad-hoc Event`, or `Slack` (deliberately empty).

### Daily Check-In（每日確認）

Added 2026-07-22: a same-day, mandatory yes/no confirmation for every past
`Time Slot` whose occupant is a `Trackable Item` (`Book`/`Course`) or a
`Deadline Task` — the two "progress to catch up on" kinds, per the project
owner's own scoping; a `Routine`/`Fixed Commitment` occurrence is recurring/
anchored, not progress, and is never gated. `TimeSlot.confirmedAt`
(`DateTime?`, `prisma/schema.prisma`) is null until answered; a slot with
`endAt` in the past and `confirmedAt` still null is "pending" and blocks the
whole app (rendered from `src/app/layout.tsx`, above every route) until
resolved — "user must answer to continue use the system." Each pending slot
is its own yes/no; there is no bulk-dismiss.

- **"Yes, I did it"** (`confirmCheckIn`, `src/server/check-ins.ts`) 
  timestamps `confirmedAt`, and — added 2026-07-23, reversing the original
  "explicit non-goal" — for a `Trackable Item` occupant also calls
  `advanceTrackableItemProgress` (see `Trackable Item` above's
  "Per-Session Progress") to advance that item's progress by one sitting.
  A `Deadline Task` occupant still only gets `confirmedAt` set;
  `estimatedHours` stays entirely user-edited — there's no per-session
  unit concept to advance there.
- **"No, I didn't do it"** (`dismissCheckInAsMissed`) deletes the `Time
  Slot` outright — a "missed" value is never written to `confirmedAt` —
  then re-runs the existing `runScheduler` for the current week. Deleting
  the stale slot is what makes the item eligible for a fresh placement
  again (`flexible-placement.ts`'s `itemIdsWithSessionThisWeek`), so this
  reuses the Scheduler's existing placement logic rather than adding new
  placement math. Because the Scheduler's day-loop has no "not before
  today" bound (a pre-existing characteristic — see `Scheduler` below),
  the fresh placement can itself land on an already-elapsed day of the
  target week; `dismissCheckInAsMissed` prunes only the dismissed item's
  own newly-created slot(s) if that happens, leaving the item with no
  session this week rather than a backdated one (the same silent-skip
  precedent already used elsewhere for "no room this week").

### Slack（彈性留白）

A `Time Slot` the scheduler deliberately leaves unassigned so the week isn't
fully packed. Slack is what makes Elastic Re-Scheduling (Phase 3) possible —
without reserved slack, absorbing a disruption always cascades into
rebuilding the whole week.

### Schedule / Weekly View（課表 / 週視圖）

The full set of `Time Slot`s for one calendar week, labelled 本週／下週 in
the UI. This is the primary surface the user reads and edits. Phase 1's
Schedule is populated entirely by hand (no `Scheduler` yet); from Phase 2 on
it is generated/repaired by the `Scheduler` and still remains manually
editable per the charter's Guardrails. A "顯示：" selector above the grid
(added 2026-07-21) toggles which fields each `Time Slot`'s card shows —
time／`Tag`／occupant kind — a per-browser display preference, not part of
the `Schedule` data itself. A day with a `Deadline Task` due on it shows a
red banner above that day's column. Multiple `Time Slot`s that share the
exact same `[startAt, endAt)` window and occupant kind — e.g. every
`in-progress` `Book` sharing one `Category Item Schedule` occurrence —
render as one merged block instead of stacked duplicate cards; per-item
title/progress only shows once expanded (added 2026-07-22).

### Scheduler（自動排程引擎）

The component (introduced Phase 2, "Constraint-Based Auto-Scheduler v1" in
`../ROADMAP.md`) that computes or repairs a `Schedule` from all `Trackable
Item`s, `Routine`s, `Semester Commitment`s, `Ad-hoc Event`s,
`Time-of-Day Preference`s, and `WIP Limit`s. Every placement layer's
day-loop searches the full `[weekStart, weekEnd)` window with no "not
before today" lower bound — a pre-existing characteristic, not something
any phase added deliberately, that only became directly observable once
`Daily Check-In` (above) started re-examining already-placed slots.
Composed of five layers
(`src/scheduler/index.ts`'s `computeSchedule`), each layer's placements
becoming the next layer's "busy" so nothing double-books an earlier layer:
hard constraints (`Fixed Commitment`/`Deadline Task`,
`hard-constraints.ts`) → `Routine` occurrences → `Category Item Schedule`
occurrences → flexible `Trackable Item` work
(`flexible-placement.ts`) — plus `repair.ts` for Phase 3's local,
non-full-recompute fixes to an already-placed `Schedule`.

A `Fixed Commitment` occurrence is placed deterministically (it's
anchored — `dayOfWeek`/`startTime`/`endTime` fully determine it, nothing
to search). `Deadline Task`, `Routine`, and `Category Item Schedule`
occurrences are each placed by *hard-constraint search* for **which day
and window** — no-overlap, the daily window, per-day Slack budget
(`Deadline Task`), and (for `Routine`/`Category Item Schedule`) the
`Time-of-Day Preference` bucket order in `occurrence-timing.ts` — that
day/window selection logic is unchanged. Flexible `Trackable Item` work is
placed differently for *which day* too (2026-07-22, project owner's
`/goal`: "don't build a simple priority scheduler...optimize for the best
schedule, not just a valid one") — `flexible-placement.ts` enumerates
every structurally feasible placement across the whole week first (every
free gap on every day whose Slack budget isn't exhausted), then
`objective.ts` scores each candidate as a Weighted Constraint Satisfaction
problem (hard constraints already filtered what's feasible; this ranks the
survivors) and the highest-scoring one wins, not simply the earliest one
found.

Separately, **within whichever window each of the four occurrence kinds
above already searches**, the specific gap returned also went from
first-fit to WCSP-scored (2026-07-22, follow-up, same `/goal`, project
owner's explicit scope decision to extend gap-scoring to more placement
paths without inventing new domain concepts like resource/dependency
modeling): `objective.ts`'s `pickBestGapInWindow` is a drop-in replacement
for `time.ts`'s `findFreeInterval` used by `occurrence-timing.ts`'s
`findOccurrenceWindow` (`Routine`/`Category Item Schedule`) and
`hard-constraints.ts`'s `placeDeadlineTasks`, scoring FreeBlockSize/
Fragmentation only — it never changes which day or window was chosen, only
which gap inside it, so it can't affect the charter's never-silently-drop
guarantee for `Deadline Task`/`Fixed Commitment`. `Fixed Commitment` itself
has no gap choice (deterministic, above) and is unaffected.

v1's soft constraints, both computable from data the Scheduler already has
(a bare `Trackable Item` carries no `Time-of-Day Preference` of its own —
that belongs to `Routine`/`Category Item Schedule`, already handled
above).

The project owner's `/goal` (2026-07-22) proposed the objective
`Score = +GoalCompletion +FreeBlockSize +EnergyAlignment +DeadlineSlack
-Fragmentation -ContextSwitching -Overtime`. Every term is accounted for —
`src/scheduler/objective.ts`'s header comment is the authoritative,
kept-current version of this table; the same content is repeated here for
discoverability, not as a second source of truth:

| Term | Status | Where |
| --- | --- | --- |
| `+GoalCompletion` | Mechanism, not a scored term | `selectEligibleItems`'s priority sort (`flexible-placement.ts`) — higher-priority items are placed first in a run, so they claim the best-scoring candidate before a lower-priority item's search even runs |
| `+FreeBlockSize` | Scored | `objective.ts`'s `freeBlockScore` — rewards, up to a cap, how much usable contiguous free time a placement leaves behind |
| `+EnergyAlignment` | Scored, generic default | `objective.ts`'s `energyAlignmentScore` — a bare `Trackable Item` has no per-item `Time-of-Day Preference` of its own (that's `Routine`/`Category Item Schedule` territory, already handled above), so this is a weakly-weighted, documented fallback (earlier-in-day mildly preferred), not a read of a real user preference |
| `+DeadlineSlack` | Out of scope for this path | Belongs to `Deadline Task` placement (`hard-constraints.ts`'s `placeDeadlineTasks`), a charter-guarded hard constraint with its own day-by-day slack accounting; `placeFlexibleTrackableItems`'s candidates never carry a due date |
| `-Fragmentation` | Scored | `objective.ts`'s `fragmentationPenalty` — a leftover under 30 minutes is unusable dead space and is penalized |
| `-ContextSwitching` | Scored | `objective.ts`'s `contextSwitchPenalty` — a candidate back-to-back with a differently-kinded occupant (Routine/Fixed Commitment/Deadline Task/Ad-hoc Event) is penalized; touching another `Trackable Item` session is continuity, not a switch, and is never penalized. Needs occupant-kind-tagged busy intervals (`KindedInterval`), threaded from `index.ts`'s `computeSchedule` through `flexible-placement.ts` |
| `-Overtime` | Structurally impossible among scored candidates | Every candidate `objective.ts` ever sees already passed the per-day Slack budget hard-constraint gate (`enumerateWeekCandidates`) before being offered — there is nothing left for a soft penalty to discourage |

`daily load balancing` (an emptier day scores higher, so eligible items
spread across the week as earlier ones claim days instead of every item
piling onto the first day with any room — literally the
pre-`objective.ts` behavior) sits outside the requested formula's named
terms but was added because it's what "balance workload across days" (the
`/goal` message's Multi-objective Optimization section) names directly.

This was stated as v1 scope deliberately: it ranks one placement path's
own candidate search (`placeFlexibleTrackableItems`), not a
general-purpose CP-SAT/RCPSP solver with resource modeling, task
dependencies, or a `Task Planner`/`Constraint Engine`/`Optimization
Engine` layered architecture — see `../CHANGELOG.md`'s 2026-07-22 entries
and `src/scheduler/objective.ts`'s header comment for the full framing.
That layered architecture is exactly what the next subsection adds, for
one specific new path — `objective.ts` and the single-week
`computeSchedule` above remain unchanged and still work exactly as
described.

### Whole-Future Persisted Scheduling Engine（COP／WCSP／RCPSP）

Project owner (2026-07-23): clicking 產生課表 only filled the ONE week the
button was clicked from — switching to any other week showed an empty
board until 產生課表 was clicked again from inside it. The ask: schedule
the WHOLE future and persist it, so switching weeks becomes a pure DB
read, using a real algorithm rather than a superficial patch. Confirmed
by reading every placement layer directly that this wasn't a caller-side
limitation: `hard-constraints.ts`, `routine-placement.ts`,
`category-placement.ts`, and `flexible-placement.ts` are each hardcoded
to exactly one 7-day window relative to `SchedulerInput.weekStart` — so a
correct fix needed genuine new multi-week orchestration, not a wider date
range passed into the existing `computeSchedule`.

Formalized as a **Constraint Optimization Problem**: decision variables
are the start day (and intra-day gap) of every schedulable unit of work;
domain is every feasible day/gap in the horizon; hard constraints are
no-overlap, per-item session precedence, `Deadline Task` due dates, `WIP
Limit` capacity per `Trackable Item` type (a *renewable resource* — this
is the **Resource-Constrained Project Scheduling Problem**, RCPSP, part),
and `Semester` bounds; the objective is `objective.ts`'s existing
multi-term **Weighted Constraint Satisfaction** score, now evaluated
across the whole horizon instead of one week — nothing in `objective.ts`
itself changed; it was already day-agnostic (works on any absolute
`Date`), which is the whole reason this could be reused as-is.

Solved via a **Serial Schedule Generation Scheme (SGS)** with a priority
rule (deadline urgency, then item priority) — the standard practical
RCPSP heuristic (Kolisch & Hartmann), not an exact solver. The project
owner chose this over spawning an external constraint solver (no
maintained Node.js binding exists for Google OR-Tools CP-SAT; an exact
solver would mean a Python subprocess for a personal, single-user,
locally-run app) — good schedules, not provably optimal ones, running
synchronously inside the existing 產生課表 Server Action.

Architecture (`Goals → Task Planner → Constraint Engine → Optimization
Engine`, each its own module under `src/scheduler/`):

- **Goals that need no optimization stay on today's deterministic code,
  unmodified.** `Fixed Commitment`/`Routine`/`Category Item Schedule`
  have no real placement *choice* — cadence dictates the day; the
  existing `Time-of-Day Preference` merge already picks the gap — so
  `horizon.ts` (the orchestrator) produces them by looping
  `placeFixedCommitments`/`placeRoutines`/`placeCategoryItemSchedules`
  once per week across the horizon, entirely unchanged.
- **Task Planner** (`activity-planner.ts`): decomposes flexible
  `Trackable Item`s (types with no `Category Item Schedule`) and
  `Deadline Task`s — the two Goal kinds with a genuine "which day, which
  order" decision — into atomic `Activity` units. A `Trackable Item`'s
  remaining sessions become a precedence chain (session *i+1* only
  becomes eligible once *i* is placed); a `Deadline Task`'s remaining
  hours are chunked the same way `placeDeadlineTasks` already sizes a
  session, also chained. Each `Trackable Item` chain-head carries which
  `WIP Limit` pool (its `type`) it competes for — but only if the item is
  `not-started`/`paused`; an already-`in-progress` item's slot is
  pre-reserved before the solve starts (mirrors `selectEligibleItems`'
  unconditional "every in-progress item is eligible" rule).
- **Constraint Engine** (`resource-calendar.ts`): a thin adapter, not new
  scoring math — tracks busy time (seeded from the deterministic layers'
  output and real pre-existing Time Slots) and each `WIP Limit` pool's
  remaining capacity, and delegates "best gap on this day" straight to
  `objective.ts`'s `pickBestGapInWindow`.
- **Optimization Engine** (`rcpsp-solver.ts`): the Serial SGS loop
  itself. A pool-blocked Activity is retried on a later pass (capacity
  may free once some other chain of that pool finishes — releasing back
  when an item's *last* Activity places, same "WIP frees up when an item
  completes" behavior the WIP Limit was always meant to have); a
  day-window-exhausted failure is permanent (busy time only ever grows)
  and is finalized immediately — one deduplicated `SchedulerConflict` per
  `Deadline Task` (charter-guarded — never silently dropped, and never
  one conflict per chunk/week the way the single-week path could
  double-report), or silently dropped for a `Trackable Item` (soft,
  discretionary work, same as today).

**Idempotent re-entrancy**: `buildHorizonSchedulerInput`
(`src/server/scheduler-runs.ts`) queries every real Time Slot across the
*entire* horizon before planning, and derives per-occupant "already
scheduled" seed counts the Task Planner subtracts before chaining — a
repeat 產生課表 click only fills what's genuinely still missing, never
duplicates, same guarantee the single-week path already had.

**Horizon length** (`computeHorizonWeeks`): `DEFAULT_HORIZON_WEEKS = 12`
(~3 months), extended to cover the furthest relevant `Deadline Task` due
date or the configured `Semester`'s end, capped at `MAX_HORIZON_WEEKS =
26` (~6 months) so a mis-set due date years out can't trigger unbounded
computation/storage — same "inferred default, documented, adjustable"
status as `DEFAULT_WIP_LIMIT` (`src/scheduler/constants.ts`).

產生課表 (`generateScheduleAction`) now always runs this engine anchored
at the real current week (`startOfWeek(new Date())`), regardless of which
week's form it was submitted from, and redirects back to that week.

Explicitly out of scope, flagged rather than silently left unhandled:
`repair.ts`'s per-item disruptions (`skip-session`/`item-completed`)
still only rebuild the *current* week's local diff — re-running 產生課表
(now idempotent across the whole horizon) is the reconciliation path, not
a retroactive cleanup of already-persisted future sessions elsewhere in
the horizon. The pre-existing quirk where WIP-limit "promotion" never
persists a `status` change to the DB is unchanged — the horizon engine's
pool tracking is a run-scoped simulation only, same as
`selectEligibleItems` always was.

## Naming Conventions

- Code (variable/field/type names) always uses the English identifier shown
  in this doc — e.g. `unitsCompleted`, not `已完成單元數` — even where the UI
  displays the Chinese label. Never invent a synonym for a concept already
  named here (e.g. don't introduce `progress` alongside `unitsCompleted`).
- "Fixed Commitment" and "Routine" are structurally similar (both recurring)
  but must stay semantically distinct in code and docs: a `Routine` is a
  soft preference the scheduler can nudge around within its
  `timeOfDayPreferences`; a `Fixed Commitment` is a hard constraint that never
  moves. Do not merge them into one type without re-deriving this document.
