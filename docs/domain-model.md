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
`estimatedDays`（使用者輸入的預估完成天數）, `tags`（見下方 Tag）. A
Trackable Item may have many `Time Slot` occurrences assigned to it across
many weeks, but at most one `status` at a time.

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
`timeOfDayPreference`（見下）, `durationMinutes`（每次發生的時長，預設
120 分鐘 — 取代了 Scheduler 過去對所有 Routine 一律套用的固定
`SESSION_DURATION_MS`）. `tags`（見 Tag）. A `Routine` occurrence recurs indefinitely
until the user edits or deletes the `Routine` itself — it is not a
`Deadline Task` and never has a due date.

### Time-of-Day Preference（時段偏好）

A preference, attached to a `Routine`, expressed either as a bucket
(`morning` | `afternoon` | `evening` | `night`, field `timeOfDayPreference`)
or a concrete anchor time (field `preferredStartTime`, `"HH:mm"` — Phase 7,
"Semester Scoping for Fixed Commitments & Concrete Routine Times"). The
scheduler (from Phase 2 on) tries `preferredStartTime` first when set, then
`timeOfDayPreference`'s bucket window, then the full daily window; Phase 1
showed it as metadata only, since Phase 1 has no scheduler.

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
red banner above that day's column.

### Scheduler（自動排程引擎）

The component (introduced Phase 2, "Constraint-Based Auto-Scheduler v1" in
`../ROADMAP.md`) that computes or repairs a `Schedule` from all `Trackable
Item`s, `Routine`s, `Semester Commitment`s, `Ad-hoc Event`s,
`Time-of-Day Preference`s, and `WIP Limit`s. Does not exist in Phase 1.

## Naming Conventions

- Code (variable/field/type names) always uses the English identifier shown
  in this doc — e.g. `unitsCompleted`, not `已完成單元數` — even where the UI
  displays the Chinese label. Never invent a synonym for a concept already
  named here (e.g. don't introduce `progress` alongside `unitsCompleted`).
- "Fixed Commitment" and "Routine" are structurally similar (both recurring)
  but must stay semantically distinct in code and docs: a `Routine` is a
  soft preference the scheduler can nudge around within its
  `timeOfDayPreference`; a `Fixed Commitment` is a hard constraint that never
  moves. Do not merge them into one type without re-deriving this document.
