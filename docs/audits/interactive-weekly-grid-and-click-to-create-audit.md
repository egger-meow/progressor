# `Interactive Weekly Grid & Click-to-Create` — Completion Audit

**Phase authorized:** by the project owner in chat, 2026-07-21: the
Weekly View's per-day columns collapsed to a single "沒有時段" message
when a day had no `Time Slot`s, and adding one required scrolling to a
separate bottom form and typing the date/time from scratch even for the
common case of "put something in this specific empty hour." Written into
`ROADMAP.md` as the Active Phase the same day.
**Audit written:** 2026-07-21
**Status:** Complete with noted exceptions

## Original Acceptance Gates

Verbatim from `ROADMAP.md`'s "Interactive Weekly Grid & Click-to-Create"
phase, at the point this phase is being removed:

1. Every day column renders one row per hour across the Scheduler's
   daily window (08:00–23:00), always — replacing the "沒有時段" collapse
   with a real always-visible grid. If a `Time Slot` exists outside that
   window (manual entry isn't restricted to it), the grid extends to
   include it — a `Time Slot` must never become invisible.
2. An existing `Time Slot` renders in its starting hour's row with its
   full time range and occupant/detail label (unchanged content); hours
   it spans afterward render as a distinct, non-interactive
   "continuation" indicator, not as an empty/clickable row.
3. Clicking an empty (non-continuation) hour cell reveals an inline form
   pre-filled with that day + hour as date/start (end defaults to
   start + 1 hour), reusing the existing `createTimeSlotAction` and
   occupant `<select>` — submitting adds the slot in place; canceling
   collapses back to the empty cell. Implemented via the same
   URL-query-param pattern already used for `?edit=` — no new client-side
   JavaScript.
4. The existing bottom "新增時段" and "快速新增臨時事件" forms remain
   available unchanged, for slots that don't align to a single clicked
   hour cell.
5. All existing per-slot actions (編輯/移除/跳過/標記完成) continue to
   work unchanged from within the grid.
6. `npm run verify` passes.
7. A written manual walkthrough, recorded in `docs/audits/`, exercising:
   a week with no slots (grid fully visible, every cell empty and
   clickable), clicking an empty cell and adding a slot inline, a
   multi-hour slot's continuation row(s), and editing/removing a slot
   from within the grid.

## Evidence, Gate by Gate

### Gate 1: always-visible hourly grid, widened for out-of-window slots

`buildHourRows` (`src/app/week.ts`) generates one row per hour covering
at least `[windowStartHour, windowEndHour)`, widened to include every
hour any of that day's `Time Slot`s start in. `src/app/page.tsx` calls
it per day with `WINDOW_START_HOUR`/`WINDOW_END_HOUR` parsed from
`src/scheduler/constants.ts`'s `DAILY_WINDOW_START`/`DAILY_WINDOW_END`
(08:00/23:00), passing that day's slots' start hours as the widening
set.

Evidence: `week.test.ts` (6 new tests) covers the plain 15-row window, a
slot before the window, a slot at/after the window end, and no widening
for an hour already inside it. Manually verified against the running
dev server: an empty week (`http://localhost:3000/`) showed all seven
days rendering the full 08:00–22:00 grid (15 rows each), every cell a
clickable "＋ 新增" link — confirmed via `read_page`'s accessibility
tree, not just visual inspection. Created a `Time Slot` at 06:00–07:00
on one day via the bottom form; confirmed only that day's grid widened
down to include a 06:00 row, every other day unaffected.

### Gate 2: starting-hour card + continuation indicator

Per hour row, `page.tsx` computes `startingSlots` (slots whose `startAt`
falls in that hour) and, if none, whether the hour is a `isContinuation`
(covered by a slot that started in an earlier hour but hasn't ended
yet). A continuation hour renders a non-interactive
`<span class={styles.hourContinuation} aria-hidden="true" />` instead of
an add link.

Evidence: created a 09:00–11:00 `Time Slot` via gate-3's click-to-create
flow; confirmed via `get_page_text` that hour 09:00 showed the slot card
(`09:00–11:00 留白 編輯 移除`) and hour 10:00 showed neither a card nor
a "＋ 新增" link (the continuation bar); confirmed via `javascript_tool`
that a `page-module___8aEwW__hourContinuation` element with
`aria-hidden="true"` was actually present in the DOM at that position,
not just visually blank. Edited the slot's end time down to 10:00 and
confirmed hour 10:00 immediately regained its own "＋ 新增" link.

### Gate 3: click-to-create inline form, no new client JS

An empty cell's "＋ 新增" link is `/?week=<week>&add=<date>T<hour>`. When
`searchParams.add` matches a cell's `cellAddParam`, that cell renders
`InlineAddForm` instead of the link — the same `slotForm` markup pattern
as the existing bottom form and the existing `?edit=` inline edit form,
pre-filled with the clicked day as `date` (hidden input) and the clicked
hour / hour+1 as `startTime`/`endTime` defaults, posting to the existing
`createTimeSlotAction`. No new Server Action, no `"use client"`
component, no client-side JavaScript was added for this — it's pure
Next.js App Router SSR + `<a href>` navigation, identical in kind to the
`?edit=` mechanism already shipped in Phase 1.

Evidence: navigated directly to a `?add=` URL and confirmed via
`read_page` that the inline form appeared in exactly that cell,
pre-filled `09:00`/`10:00`, occupant defaulting to `留白（不指定）`;
changed the end time to `11:00` and submitted (via `requestSubmit()` —
see Exceptions for why) — the resulting slot appeared correctly. The
"取消" link returns to the plain `/?week=...` URL, collapsing the form
back to the add link (confirmed by page text no longer showing the
form).

### Gate 4: bottom forms unchanged

`src/app/page.tsx`'s "新增時段" and "快速新增臨時事件" sections were not
touched — same fields, same Server Actions
(`createTimeSlotAction`/`insertAdHocEventAction`).

Evidence: `get_page_text` against the running dev server shows both
sections present and unchanged below the grid.

### Gate 5: existing per-slot actions unchanged

`SlotCard` and `SlotEditForm` (`src/app/page.tsx`, extracted from what
was previously inline JSX in the day-column `.map`) render byte-for-byte
the same markup/actions as before — 編輯 (link to `?edit=`), 移除
(`deleteTimeSlotAction`), and, for a `trackable-item` occupant, 跳過
(`skipSessionAction`) and 標記完成 (`completeItemAction`).

Evidence: 編輯 and 移除 exercised live end-to-end this session (see
Gates 2–3's walkthrough — edited a slot's end time and removed a slot,
both took effect immediately). 跳過/標記完成 were not re-exercised live
this session, since their underlying code path (`SlotCard`) is
unchanged from Phase 3/5's already-verified behavior — only its
surrounding layout moved from a `<ul>`/`<li>` list to a per-hour grid
cell; no logic inside `SlotCard` itself changed.

### Gate 6: `npm run verify` passes

```
npm run verify
```

passes clean: lint, typecheck, 137 tests (14 test files, up from 131/13
at Phase "books/courses split" close), and `next build`.

### Gate 7: written manual walkthrough

This document's Evidence sections above constitute the walkthrough:
empty-week full grid, click-to-create, a multi-hour slot's continuation
row, edit and remove from within the grid, and the out-of-window
widening case. All exercised against the real running dev server
(`http://localhost:3000`), not fixtures — see Exceptions for the one
tooling substitution used.

## Exceptions / Deviations

- **`mcp__Claude_Browser__computer` (click simulation) timed out again
  this session**, independent of the app — `preview_logs` and the
  browser console stayed clean (HTTP 200s, no errors) throughout, same
  pattern as Phase 5's audit. Worked around by using
  `javascript_tool` to call `form.requestSubmit()` directly on the
  located form element (read-only DOM inspection + dispatching a real
  submit event — not used to implement or patch app behavior, consistent
  with that tool's stated purpose) and `navigate` for direct URL
  transitions in place of clicking links. Every gate above was still
  exercised against the real running app and real Prisma-backed data,
  not mocked.
- **Click-to-create is hourly-only.** The clicked cell always pre-fills
  a whole-hour start/end; a slot starting on a half hour, or spanning
  many hours, needs either the bottom "新增時段" form or manually
  adjusting the pre-filled times in the revealed inline form before
  submitting. Not a regression — the previous bottom-form-only flow had
  the same granularity freedom (any start/end typed by hand); this phase
  only adds a faster path for the common whole-hour case. Recorded as a
  Known Limit in `docs/status.md`.
- 跳過/標記完成 (skip / mark-complete) were not re-verified live this
  session — see Gate 5. Their code (`SlotCard`) is unchanged from
  Phase 3/5, and Phase 3's audit already verified them end-to-end; only
  the surrounding grid layout is new.

## Follow-Up

- No new `ROADMAP.md` proposals came out of this phase. `ROADMAP.md`'s
  Active Phase is empty again — every remaining "Proposed" entry
  (calendar export/sync, notifications/reminders, mobile companion view)
  still needs a human-written goal and exit condition.
- `FRAMEWORK_FEEDBACK.md` gained no entries during this phase.
