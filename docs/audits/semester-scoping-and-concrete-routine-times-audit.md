# `Semester Scoping for Fixed Commitments & Concrete Routine Times` — Completion Audit

**Phase authorized:** by the project owner in chat, 2026-07-21:
`Fixed Commitment` occurrences (weekly classes) showed every week
forever, with no way to say "only while the semester is actually
running" (寒暑假 should show none) — and a `Routine`'s `Time-of-Day
Preference` only offered the four vague buckets (morning/afternoon/
evening/night), with no way to pin an exact time, even though
`docs/domain-model.md` already anticipated "(or an explicit hour
range)" for this field. Written into `ROADMAP.md` as the Active Phase
the same day.
**Audit written:** 2026-07-21
**Status:** Complete

## Original Acceptance Gates

Verbatim from `ROADMAP.md`'s "Semester Scoping for Fixed Commitments &
Concrete Routine Times" phase, at the point this phase is being
removed:

1. A `Semester` (start date + week count, default 16) is configurable
   from `/commitments`, persists, and is shown there once set.
2. A `Fixed Commitment` has a new "忽略學期範圍" (ignore semester
   bounds) option, defaulting to off. When a `Semester` is configured
   and a commitment does *not* ignore it, the Scheduler places that
   commitment's occurrence only for weeks inside `[semester start's
   week, semester start's week + week count)` — outside that range
   (before start, or after it ends — 寒暑假), the occurrence is not
   placed. A commitment with the opt-out on, or when no `Semester` is
   configured at all, is unaffected (today's always-shown behavior) —
   configuring a `Semester` must never make an existing commitment
   silently disappear from a week it would have shown in before.
3. The Weekly View shows "第 N 週" next to the week label whenever the
   displayed week falls inside the configured `Semester`'s range;
   nothing extra is shown otherwise (before/after the semester, or none
   configured).
4. A `Routine` can be given a concrete preferred start time (via
   `TimePicker`) instead of, or in addition to, the four-bucket
   `Time-of-Day Preference`; when set, the Scheduler tries that exact
   time first, falling back to the bucket window and then the full
   daily window exactly as it does today when no concrete time is set.
5. `npm run verify` passes, including new test coverage for the
   semester-bounding and concrete-time placement logic.
6. A written manual walkthrough, recorded in `docs/audits/`.

## Evidence, Gate by Gate

### Gate 1: configurable, persistent, displayed `Semester`

`src/server/semester.ts` (`getSemester`/`setSemester`) backs a
singleton `Semester` row (fixed id `"singleton"`, `prisma/schema.prisma`).
`/commitments`' new "學期設定" section renders a `DatePicker` + week-count
number input (`setSemesterAction`, `src/app/commitments/actions.ts`),
and shows "目前學期：... 起，共 N 週（到 ... 前）" once configured, or an
explanatory "尚未設定學期" message otherwise.

Evidence: `semester.test.ts` (5 tests: returns null unconfigured,
persists and round-trips, overwrites rather than duplicating the
singleton, rejects an invalid `startDate`, rejects a non-positive
`weekCount`). Manually verified against the running dev server:
configured a `Semester` (2026-08-01, 16 weeks) via the form and
confirmed the page immediately showed "目前學期：2026-08-01 起，共 16
週（到 2026-11-21 前）".

### Gate 2: Fixed Commitment bounding + opt-out

`FixedCommitment.ignoreSemesterBounds` (new column, default `false`) is
a checkbox on both the create and edit forms. `placeFixedCommitments`
(`src/scheduler/hard-constraints.ts`) filters occurrences through a new
`isWithinSemester(date, semester)` before placing them — `semester ===
null` always returns `true` (unbounded), and a commitment with
`ignoreSemesterBounds: true` skips the check entirely.

Evidence: 5 new tests in `hard-constraints.test.ts`'s "placeFixedCommitments
— Semester bounding" block: places when the target week is inside the
range; does not place for a week before the Semester starts; does not
place for a week after `weekCount` ends; still places when
`ignoreSemesterBounds` is true even outside the range; places
unconditionally when `semester: null` (backward compatibility).
Manually verified against the running dev server using the project
owner's own real `Fixed Commitment` ("資料探勘", Tuesday 13:30–15:20):
after configuring the 2026-08-01/16-week Semester above, clicked "產生
課表" for the week of 2026-08-03 (inside range) and confirmed "資料探勘"
was placed on Tuesday 8/4 at 13:30–15:20; clicked "產生課表" for the
week of 2026-07-20 (before the Semester starts) and confirmed, via
direct `Time Slot` inspection, that nothing new was created for it.

### Gate 3: "第 N 週" display

`semesterWeekIndex(weekStart, semester)` (`src/app/week.ts`) returns the
1-indexed week number or `null` outside the range/when unconfigured —
week 1 is the calendar week containing `startDate`, computed via a new
`startOfWeek` reused from the same file. The Weekly View renders it as
a badge next to the week-range label only when non-null.

Evidence: 5 new tests in `week.test.ts`'s "semesterWeekIndex" block
(null when unconfigured, week 1 for the start week, counts up correctly,
null before start, null after `weekCount` ends). Manually verified
against the running dev server across four weeks with the same
2026-08-01/16-week Semester configured: the current week (2026-07-20,
before the semester) showed no badge; the week of 2026-07-27 showed
"第 1 週"; the week of 2026-11-09 (the 16th week) showed "第 16 週"; the
week of 2026-11-16 (one week past the end) showed no badge again.

### Gate 4: concrete Routine time

`Routine.preferredStartTime` (new column, nullable `"HH:mm"`) is set via
a `TimePicker` plus a "使用指定時間（優先於時段偏好）" checkbox on
`/routines` (the checkbox exists because `TimePicker` always carries a
real value with no "empty" state, so it alone can't express "don't use
this"). `placeRoutines` (`src/scheduler/routine-placement.ts`) tries the
exact `[preferredStartTime, preferredStartTime + session duration)`
window first — `findFreeInterval` only succeeds there if that precise
slot is entirely free — before falling back to `timeOfDayPreference`'s
bucket window, then the full daily window, unchanged from before when
`preferredStartTime` is unset.

Evidence: 2 new tests in `routine-placement.test.ts` ("places exactly
at preferredStartTime when that slot is free", "falls back to the
Time-of-Day Preference bucket when preferredStartTime's exact slot is
busy" — the latter set `timeOfDayPreference: "evening"` too, proving
the concrete time wins when both are set and free). 3 new tests in
`routines.test.ts` (creates with a concrete time, defaults to `null`
when omitted, rejects a malformed value) plus an update test (sets and
clears `preferredStartTime`). Manually verified against the running dev
server: created a test `Routine` ("Gym", daily, `preferredStartTime:
"09:00"`) and confirmed its list entry read "每日 · 指定 09:00";
generated the schedule for a week and confirmed it was placed exactly
at 09:00–11:00 every day.

### Gate 5: `npm run verify` + new test coverage

```
npm run verify
```

passes clean: lint, typecheck, 161 tests (15 test files, up from
137/14 before this phase — 24 new: `semester.test.ts` plus new cases in
`semester-commitments.test.ts`, `routines.test.ts`,
`hard-constraints.test.ts`, `routine-placement.test.ts`, `week.test.ts`),
`next build`.

### Gate 6: written manual walkthrough

This document's Evidence sections above constitute the walkthrough, all
exercised against the real running dev server (`http://localhost:3000`)
and, where a `Fixed Commitment` was needed, the project owner's own
pre-existing real record rather than fabricated data.

## Exceptions / Deviations

None from the original exit condition's wording. One thing worth
recording since it shaped how verification was carried out: partway
through this phase's manual testing, it became clear the project owner
had been using the app in their own session concurrently — a real
`Fixed Commitment` ("資料探勘") and a manually-placed Slack `Time Slot`
appeared in the database that this session never created. Every `Time
Slot` was cross-checked by `createdAt` against this session's own
action timeline before any cleanup; only records this session's own
test actions produced were removed (an arbitrary test `Semester`
configuration, one `Fixed Commitment` occurrence it caused to be
placed, a test `Routine` and its one placed occurrence). The project
owner's own "資料探勘" commitment and their own independently-created
`Time Slot`s (including one `Fixed Commitment` occurrence they placed
themselves before this phase's work began) were left untouched
throughout.

## Follow-Up

- No new `ROADMAP.md` proposals came out of this phase. `ROADMAP.md`'s
  Active Phase is empty again — every remaining "Proposed" entry
  (calendar export/sync, notifications/reminders, mobile companion
  view) still needs a human-written goal and exit condition.
- Recorded as new Known Limits in `docs/status.md`, not addressed here:
  no UI to unset a configured `Semester` (only overwrite it), and a
  `Routine`'s `preferredStartTime` is a single anchor for the whole
  Routine (no per-weekday variation for a multi-day weekly anchor).
- `FRAMEWORK_FEEDBACK.md` gained no entries during this phase.
