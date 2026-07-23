# Changelog

All notable changes to this project are documented here.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/), and
this project's versioning is defined in [`docs/release.md`](docs/release.md).

## [Unreleased]

### Added

- **Whole-Future Persisted Scheduling Engine**: 產生課表 now schedules the
  whole future (default 12 weeks, extended to cover the furthest
  `Deadline Task`/`Semester` end, capped at 26) in one run and persists
  it, so switching to any future week is a pure DB read instead of
  requiring another click from inside it. Formalized as a Constraint
  Optimization Problem (Weighted Constraint Satisfaction objective,
  Resource-Constrained Project Scheduling Problem structure) and solved
  via a Serial Schedule Generation Scheme priority-rule heuristic — new
  `src/scheduler/activity-planner.ts` (Task Planner), `resource-calendar.ts`
  (Constraint Engine), `rcpsp-solver.ts` (Optimization Engine), `horizon.ts`
  (orchestrator), and `src/server/scheduler-runs.ts`'s
  `runSchedulerForHorizon`. Fixes real cross-week bugs the old single-week
  engine had: a flexible `Trackable Item` only ever got one session per
  run no matter how many were requested, and a `Deadline Task` recomputed
  its full hour budget from scratch every week, both silently
  under-scheduling and duplicating `SchedulerConflict`s. See
  `docs/domain-model.md`'s "Whole-Future Persisted Scheduling Engine"
  subsection and `docs/audits/whole-future-scheduling-engine-audit.md`.
- Per-unit weight overrides for `Trackable Item`s: `unitWeightMultiplier`
  is now explicitly the baseline for any unit without its own entry in
  the new `unitWeightOverrides` (JSON unit-index → multiplier map,
  migration `20260723015650_trackable_item_unit_weight_overrides`) — e.g.
  chapter 8 alone can be set to 2.5x while every other chapter stays at
  1x, instead of one flat average across the whole book. New
  `effectiveUnitWeightMultiplier` (`src/server/trackable-items.ts`) is
  shared by progress advancement, the Weekly View's progress-fraction
  display, and the Whole-Future Scheduling Engine's remaining-session
  count (a real correctness fix there: a long chapter now gets enough
  sessions actually scheduled to match how many confirmations it takes to
  finish, not just one). `/items`' edit/create forms gained a sparse
  "個別單元倍率覆蓋" input (`8:2.5, 15:1.8` format — project owner,
  2026-07-23, clarifying what the old flat multiplier field should have
  meant).
- Per-session progress advancement for `Trackable Item`s: answering "是，
  已完成" in the Daily Check-In Gate, or clicking the Weekly View's new
  **完成本次** button, now advances the item's `unitsCompleted` by one
  sitting (`advanceTrackableItemProgress`, `src/server/trackable-items.ts`;
  new `TrackableItem.currentUnitSessionsCompleted` field, migration
  `20260722164624_trackable_item_current_unit_sessions`) — rolling forward
  once `round(unitWeightMultiplier)` sessions are logged. Fixes a real
  gap: previously nothing anywhere advanced progress per session, so every
  session for a book/course showed the identical chapter/video forever —
  project owner, 2026-07-23: "why the fuck everyday book content all the
  same, same progress, same content, same chapter." The existing whole-item
  "標記完成" button is relabeled **提前完成整本** and visually de-emphasized
  to distinguish it from the new per-session action.
- Daily Check-In Gate (Phase 8): a same-day, mandatory yes/no confirmation
  for every past `Book`/`Course`/`Deadline Task` `Time Slot` the user never
  marked resolved. Blocks the whole app (`src/app/layout.tsx`) until
  answered. "Yes" only timestamps `TimeSlot.confirmedAt`; "no" deletes the
  session and reschedules the item's outstanding work via the existing
  `runScheduler`, pruning any fresh placement that itself still lands on an
  already-elapsed day. New: `src/server/check-ins.ts`, `src/app/
  check-in-gate.tsx`, `src/app/check-in-actions.ts`, migration
  `20260722151340_time_slot_confirmed_at`. See `docs/domain-model.md`'s
  "Daily Check-In" entry and `docs/status.md`'s Phase 8 section.

### Fixed

- `placeCategoryItemSchedules` (`src/scheduler/category-placement.ts`): a
  category-scheduled `Trackable Item` (a shared daily/weekly book or
  course slot) got a brand-new session on every eligible occurrence
  forever, with no regard for `unitCount` — a 13-chapter book with a
  daily shared slot was computed to receive 157 sessions, running months
  past when it should have finished (project owner, 2026-07-23, live on
  real data: "她媽13天讀完喔?" / "到底在幹三小"). Now caps each item at its
  own remaining-session budget via `activity-planner.ts`'s
  `computeRemainingSessions` (now exported), threaded across the horizon
  week loop (`horizon.ts`'s `categoryScheduledCounts`) so a multi-week
  run stops exactly where the non-shared-slot path already does.
- Weekly View's `occupantProgress` session fraction (e.g. `1/1`) was only
  shown when a unit needed more than one sitting, hiding it for the
  common 1x case and leaving no way to tell "this chapter is one
  sitting" from a stale/incomplete display — now always shown.
- `/items`' 固定排程 card (`CategoryScheduleForm`) reused `.slotItem`
  (which relies on its Weekly-View-only child for padding) with no
  padding of its own, so its border sat directly on the text — new
  `.paddedCard` class.
- Daily Check-In Gate: clicking 提交 processed the answers but never
  closed the gate — `submitCheckInsAction` had no `redirect()`/
  `revalidatePath()`, so `layout.tsx`'s `listPendingCheckIns()` never
  re-ran and the exact same stale pending list kept rendering.
  `revalidatePath("/", "layout")` added (project owner, 2026-07-23: "why
  the fuck click 提交 it dont close"). Found and fixed live, unrelated to
  this release's scheduler work.
- A `Trackable Item` session's `occupantProgress` now shows which sitting
  of a multi-session unit it is (e.g. `第 13 章 1/2／共 24 章`) when
  `unitWeightMultiplier` rounds above 1, instead of only naming the
  chapter/video — project owner, 2026-07-22: "we dont read the whole
  chapter... if you split chapter into 5 days, than would be like 第1章
  1/5." Wires up `unitWeightMultiplier`, previously display-only/unused.
- The Daily Check-In Gate's 是/否 controls are now select-then-submit
  (`src/app/check-in-gate-form.tsx`) instead of each being its own
  instant-submit Server Action — project owner: "at least have the
  reaction i selected" (no visible confirmation before the round-trip)
  and "why no something like 提交." Picking an answer is now instant
  client state (the picked option highlights, the other dims), nothing
  is sent until a sticky "提交" button (disabled until every pending item
  has an answer) submits every answer in one batch
  (`submitCheckInsAction`/`submitCheckIns`).
- The Daily Check-In Gate's sticky "提交" bar no longer overlaps ("穿模")
  the last pending row's 是/否 buttons — project owner, 2026-07-23. The
  bar was `position: sticky` inside the same scrolling container as the
  list, so it glued over whatever row landed in the bottom viewport band
  regardless of scroll position. `.checkInGateList` is now the only
  scrolling element; the submit bar is a plain flex child below it.

- Bootstrap: drafted all canonical docs (`docs/project-charter.md`,
  `docs/domain-model.md`, `docs/system-direction.md`, `ROADMAP.md`,
  `docs/status.md`, `docs/build-status.md`, `docs/release.md`, `CLAUDE.md`,
  `AGENTS.md`, `PRIORITIES.md`, `README.md`) from the human's project idea,
  per `.loop-engine/BOOTSTRAP.md`.
- Project scaffold: Next.js 16 + TypeScript + Prisma 6 (SQLite) + Vitest 3 +
  ESLint, following `docs/system-direction.md`'s layering. `npm run verify`
  (lint + typecheck + test + build) is now the established task gate.
- `Trackable Item` (`Book`/`Course`) data model and `WIP Limit` enforcement
  (`prisma/schema.prisma`, `src/server/trackable-items.ts`), enforced
  independently per type on both creation and status updates.
- `Routine` (`src/server/routines.ts`) and `Semester Commitment`'s two
  kinds, `FixedCommitment` and `DeadlineTask` (`src/server/
  semester-commitments.ts`), as deliberately separate, non-interchangeable
  models and service functions.
- `Ad-hoc Event` (`src/server/ad-hoc-events.ts`) and `Time Slot`
  (`src/server/time-slots.ts`), with occupant-existence validation across
  all five referenceable occupant kinds plus `slack`.
- Manual Weekly View (`src/app/page.tsx`, `src/app/actions.ts`,
  `src/app/week.ts`): renders 本週 from real `Time Slot` data, navigates
  上週/本週/下週 via a `?week=` query param, and supports adding, editing,
  and removing `Time Slot`s by hand through Server Actions that call
  straight into `src/server/time-slots.ts`.
- Phase 1 ("Data Layer & Manual Weekly View") closed: completion audit at
  `docs/audits/data-layer-manual-weekly-view-audit.md`; removed from
  `ROADMAP.md`. Phase 2 ("Constraint-Based Auto-Scheduler v1") activated
  and decomposed into `PRIORITIES.md`.
- Scheduler data contracts (`src/scheduler/types.ts`): `SchedulerInput`
  (snapshot of domain data for a target week) and `SchedulerOutput`
  (proposed `Time Slot`s plus an explicit conflict list), with no
  `@prisma/client` import anywhere under `src/scheduler/` — the first piece
  of Phase 2's Scheduler layer.
- Scheduler hard-constraint placement (`src/scheduler/hard-constraints.ts`):
  `Fixed Commitment` occurrences always place at their anchored time and
  flag (never hide) a clash with another `Fixed Commitment` or an existing
  `Ad-hoc Event` slot; `Deadline Task` sessions search for free time before
  their deadline and report an explicit conflict, with nothing fabricated,
  when none exists. Daily scheduling window (`08:00`–`23:00`) and session
  length (2h/day) are configured in `src/scheduler/constants.ts` per the
  project owner's explicit decision, not inferred.
- Scheduler Routine occurrence placement
  (`src/scheduler/routine-placement.ts`): expands each `Routine`'s
  occurrences for the target week from its cadence/anchor, prefers its
  Time-of-Day Preference sub-window and falls back to the full daily
  window, and silently skips an occurrence with no room (a soft
  preference, unlike `Fixed Commitment`/`Deadline Task`). Corrects an
  earlier `PRIORITIES.md` scoping error that assumed `Trackable Item`
  referenced a `Routine`, which the schema doesn't support.
- Scheduler flexible Trackable Item placement
  (`src/scheduler/flexible-placement.ts`): one session per eligible item
  in `priority` order, WIP-Limit-aware promotion of `not-started`/`paused`
  items, and a new `MIN_SLACK_SHARE_PER_DAY` (20%, an inferred default) so
  flexible placement never packs a day solid.
- `computeSchedule` (`src/scheduler/index.ts`): composes hard-constraint,
  `Routine`, and flexible placement into one `SchedulerOutput` — the
  Scheduler's public entry point. `src/scheduler/index.test.ts` adds a
  fixture-based end-to-end suite verifying every bullet in `ROADMAP.md`'s
  Phase 2 exit condition against one realistic mixed week.
- Scheduler wired into the running app: `src/server/scheduler-runs.ts`'s
  `runScheduler` snapshots current domain data, calls `computeSchedule`,
  and persists every proposed `Time Slot`; a "Generate Schedule" button on
  the Weekly View triggers it. Re-run policy (only fill empty time, never
  touch an existing `Time Slot`) was an explicit product decision, not
  inferred — see `docs/status.md` for the tradeoff it accepts (repeated
  runs can duplicate a `Fixed Commitment`/`Routine` occurrence).
- Phase 2 ("Constraint-Based Auto-Scheduler v1") closed: completion audit
  at `docs/audits/constraint-based-auto-scheduler-v1-audit.md`; removed
  from `ROADMAP.md`. Phase 3 ("Elastic Re-Scheduling & Ad-hoc Events")
  activated; not yet decomposed into `PRIORITIES.md`.
- Scheduler repair layer (`src/scheduler/repair.ts`'s `repairSchedule`,
  Phase 3): locally repairs an existing `Schedule` for one of three
  disruptions without a full recompute — skipping a flexible `Trackable
  Item` session, inserting a same-day `Ad-hoc Event`, or marking an item
  done early — each backed by fixture tests in `repair.test.ts` plus
  evidence for a documented, interactively-fast time budget. Backfill
  policy (freeing scheduled time immediately offers it to the next
  eligible priority item, never left as `Slack` until the next full
  "Generate Schedule" run) was the project owner's explicit decision
  (2026-07-18), not inferred.
- Scheduler repair wired into the real store
  (`src/server/scheduler-repair.ts`: `skipSession`, `insertAdHocEvent`,
  `completeItemEarly`) and exposed on the Weekly View as a "Skip" and
  "Mark done" control on every flexible `Trackable Item` `Time Slot`, plus
  a "Quick Ad-hoc Event" form — the latter is also the first creation UI
  for the `Ad-hoc Event` record itself. Manually verified against the
  running dev server across all three disruptions, confirming the
  Phase-1 manual-edit guarantee (one edit never corrupts another `Time
  Slot`) still holds.
- Phase 3 ("Elastic Re-Scheduling & Ad-hoc Events") closed: completion
  audit at
  `docs/audits/elastic-re-scheduling-and-ad-hoc-events-audit.md`; removed
  from `ROADMAP.md`.
- Phase 4 ("Core Entity Creation UI") authorized by the project owner in
  chat (2026-07-18), choosing it over the three pre-existing "Proposed"
  phases specifically to unblock manual testing of the product itself —
  every prior phase's walkthrough had relied on a temporary,
  non-shipped `src/app/api/dev-seed/` route for exactly this reason.
- `removeTrackableItem`/`removeRoutine`/`removeFixedCommitment`/
  `removeDeadlineTask` (`src/server/*.ts`) — the one piece missing from
  full CRUD at the service layer, mirroring `time-slots.ts`'s existing
  `removeTimeSlot`. A dedicated test proves the delete-with-reference
  safety gate: deleting a `TrackableItem` still referenced by a `Time
  Slot` doesn't throw, and `listTimeSlotsWithLabels` degrades that
  slot's label to `"(deleted trackable item)"` rather than corrupting or
  crashing the Weekly View.
- Creation UI for `Book`/`Course` (`/items`), `Routine` (`/routines`),
  and `Semester Commitment` (`/commitments`), each following the Weekly
  View's existing list + inline-edit + Server Action pattern. Every
  existing service-layer validation now surfaces as a visible error
  instead of only being reachable via a test or the temporary seed
  route. Manually verified end-to-end for all five record kinds
  (create/edit/delete, validation errors, and deleting a record still
  referenced by a `Time Slot`) against the running dev server.
- Phase 4 ("Core Entity Creation UI") closed: completion audit at
  `docs/audits/core-entity-creation-ui-audit.md`; removed from
  `ROADMAP.md`. No phase is currently authorized — every remaining
  "Proposed" entry (calendar export/sync, notifications/reminders,
  mobile companion view) needs a human-written goal and exit condition
  before the phase loop can continue.
- Phase 5 ("UI/UX Overhaul & Live Priority Reordering") authorized by the
  project owner via `INBOX.md` (2026-07-20), overriding Phase 1's
  "correct, not pretty" styling deferral: a warm, high-interactivity,
  Traditional-Chinese redesign of every page, streamlined create flows,
  and drag-and-drop `priority` reordering on `/items` that instantly
  regenerates the current week's Schedule. Activated in `ROADMAP.md` and
  decomposed into `PRIORITIES.md`.
- Warm design-token system (`src/app/globals.css`) and `Noto Sans TC`
  typography applied across all four pages (`src/app/page.module.css`),
  generated with the ui-ux-pro-max design skill per the project owner's
  "warm motivated high interactive vibe" direction.
- All UI-authored copy (labels, buttons, headings, nav, hints,
  error-fallback strings) translated to Traditional Chinese.
- `/items`' add/edit forms no longer take a manual `priority` field —
  `createTrackableItem` now defaults an omitted priority to "last place"
  (`src/server/trackable-items.ts`'s `nextPriority`).
- Drag-and-drop `priority` reordering on `/items`
  (`src/app/items/priority-list.tsx`, `reorderTrackableItems`,
  `reorderItemsAction`): persists the new order and instantly
  regenerates the current week's Schedule on drop.
- Phase 5 closed: completion audit at
  `docs/audits/ui-ux-overhaul-and-live-priority-reordering-audit.md`;
  removed from `ROADMAP.md`. No phase is currently authorized.
- `/items` now shows two independent drag-and-drop priority lists (書籍,
  課程) instead of one merged list, per `INBOX.md` (2026-07-20). Dropping
  within one type's section only reorders that type's items
  (`src/app/items/priority-order.ts`'s `reorderWithinType`); the other
  type's items and the shared `priority` column's cross-type interleave
  are untouched.
- A Weekly View block for a `Trackable Item` session now shows which unit
  it's for — `Chapter` for `Book`, `Video` for `Course` — e.g. `書籍：Deep
  Work（第 1 章／共 12 章）` (`occupantLabel` in `src/server/time-slots.ts`),
  per the same `INBOX.md` request.
- Phase 6 ("Interactive Weekly Grid & Click-to-Create") authorized by the
  project owner in chat (2026-07-21), activated in `ROADMAP.md` and
  decomposed into `PRIORITIES.md`, then closed: completion audit at
  `docs/audits/interactive-weekly-grid-and-click-to-create-audit.md`;
  removed from `ROADMAP.md`.
- The Weekly View's day columns now always render a full hourly grid
  across the Scheduler's daily window (`buildHourRows`, `src/app/week.ts`)
  instead of collapsing to "沒有時段" when empty — widened per-day to
  include any `Time Slot` outside that window so one is never hidden.
- Clicking an empty hour cell in the Weekly View reveals an inline,
  pre-filled "新增時段" form in place (same `createTimeSlotAction`, no new
  Server Action), via the same URL-query-param pattern the existing
  `?edit=` inline edit already used — no new client-side JavaScript.
- Free-text tags (`tags`, JSON-encoded string array, `src/server/tags.ts`)
  on `Trackable Item`, `Routine`, `Fixed Commitment`, and `Deadline Task` —
  a "標籤（用逗號分隔）" field on each record's create/edit form on
  `/items`, `/routines`, and `/commitments`, shown as chips on the record
  list and, when set, on that occupant's `SlotCard` in the Weekly View —
  project owner, 2026-07-21: "add function that we can add tags to items
  like 資料探勘would be 學校課 and books related to 交易 we can tag it
  trader."
- Today's column in the Weekly View is now highlighted with a themed
  border (`.dayColumnToday`, `src/app/page.tsx`/`page.module.css`) —
  project owner, 2026-07-21: "today should [be] marked with border
  line...just highlight it since its today."
- A "顯示：" field selector above the Weekly View (`DisplayOptionsControl`,
  `src/app/display-options.tsx`) toggles which fields a `SlotCard` shows —
  時間／標籤／類別 — persisted per-browser in `localStorage` (not
  server/Prisma state). Defaults to 時間 and 標籤 on, 類別 off, per the
  project owner's stated default; category ("固定事務"/"常規事件"/...)
  is reachable via the toggle instead of a permanent prefix.
- `Deadline Task`s due on a given calendar day now show a red banner above
  that day's column in the Weekly View (`.deadlineBanner`,
  `src/app/page.tsx`) — project owner, 2026-07-21: "If a day have a
  deadline event, the event would show above the day...to highlight that
  day is a deadline, maybe with red."
- `TrackableItem.targetDate` (optional `DateTime?`) — an explicit target
  completion date, independent of `estimatedDays` (never auto-derived from
  it): most useful set directly on a not-yet-started item, where "today +
  N days" doesn't mean anything yet. A "設定目標完成日期" checkbox +
  `DatePicker` on `/items`' create/edit forms — project owner, 2026-07-21,
  clarifying that the day-count/deadline equivalence "only for those we
  are active reading...most book we not started reading hard to estimate
  deadline."
- `TrackableItem.unitWeightMultiplier` (`Float`, default `1.0`) — "chapters
  average Nx longer than normal," a single per-item multiplier (the
  project owner's own choice over a per-chapter list). Display-only for
  now ("平均每單元倍率" on `/items`) — deliberately not wired into any
  scheduling/pacing logic yet, flagged in a schema comment so it doesn't
  become the next silent dead field.
- `CategoryItemSchedule` (new model, one row per `TrackableItemType` —
  `src/server/category-item-schedules.ts`): an opt-in recurring
  reservation for Book/Course scheduling, reusing `Routine`'s
  cadence/anchor/timeOfDayPreference/preferredStartTime vocabulary
  (extracted into shared `src/server/cadence.ts`/`src/scheduler/
  occurrence-timing.ts`, reused by both `Routine` and this — a pure
  refactor, `routines.test.ts`/`routine-placement.test.ts` pass
  unmodified). `placeCategoryItemSchedules` (`src/scheduler/
  category-placement.ts`) places one Time Slot per currently-eligible item
  of that type, all sharing the exact same window per occurrence — not
  one book picked per occurrence — per the project owner's explicit
  correction, 2026-07-21: "all books in progress I will finish the parts
  at that period...never watch specific book(s) only." A type with no
  configured schedule is untouched and keeps today's per-item flexible
  placement (`placeFlexibleTrackableItems`) — additive, not a breaking
  replacement. Configured via a new "固定排程" section on `/items`
  (`setCategoryItemScheduleAction`/`removeCategoryItemScheduleAction`),
  deliberately shipped only after the Scheduler already consumed it —
  see `docs/status.md`'s note on the `DeadlineTask.estimatedDays` dead-field
  mistake this session found and fixed once already.
- The Weekly View now merges same-window Time Slots of the same kind
  (`groupKey`, `src/app/grouped-slot-block.tsx`) into one block instead of
  stacked duplicate cards — the direct rendering counterpart to
  `CategoryItemSchedule`'s shared-window placement. Only the shared kind
  chip + time range are always visible; per-item title + progress
  (`occupantProgress`, split out of `occupantLabel` in
  `src/server/time-slots.ts`) appear on expand (`GroupedSlotDetailPanel`,
  via the existing "?edit="-style query-param pattern, no new client JS)
  — project owner, 2026-07-21: "all books together in a time zone...not
  different books separated, only details looks what the books' progress."
- `placeFlexibleTrackableItems` (`src/scheduler/flexible-placement.ts`) now
  ranks its placement candidates instead of taking the first free gap it
  finds — project owner, 2026-07-22 (`/goal`): "don't build a simple
  priority scheduler...optimize for the best schedule, not just a valid
  one," framed as Weighted Constraint Satisfaction (hard constraints filter
  what's feasible, soft constraints rank the survivors). New
  `src/scheduler/objective.ts`: for each candidate, scores fragmentation
  avoidance (a placement leaving a leftover under 30 minutes is a dead,
  unusable sliver and is penalized), free-block preservation (a placement
  is rewarded, up to a cap, by how much usable contiguous free time it
  leaves behind), and daily load balance (an emptier day scores higher, so
  eligible items spread across the week instead of every item piling onto
  the first day with any room, which is what the old first-fit version
  did). `flexible-placement.ts` now enumerates every structurally feasible
  (day, gap) candidate across the whole week before picking, rather than
  stopping at the first day with room. Stated as v1 scope, not
  overclaimed: this ranks one placement path's own candidate search (the
  only path with no `Time-of-Day Preference` of its own to lean on already
  — `Routine`/`CategoryItemSchedule` occurrences already search a
  preferred window via `occurrence-timing.ts`), not a general-purpose
  CP-SAT/RCPSP solver. See `docs/domain-model.md`'s Scheduler section and
  `objective.ts`'s header comment for the full framing and explicit
  non-goals.
- `objective.ts` (follow-up, 2026-07-22, same `/goal`) scores two more
  terms from the requested `Score` formula: EnergyAlignment
  (`energyAlignmentScore` — a generic, weakly-weighted default preferring
  earlier-in-day starts, since a bare `Trackable Item` has no per-item
  `Time-of-Day Preference` of its own to read a real signal from) and
  ContextSwitching (`contextSwitchPenalty` — a candidate placed back-to-back
  with a differently-kinded occupant, e.g. a `Routine` or `Fixed
  Commitment`, is penalized; touching another `Trackable Item` session is
  continuity, not a switch, and is never penalized). ContextSwitching
  needed occupant-kind-tagged busy intervals (new `KindedInterval` type),
  threaded from `index.ts`'s `computeSchedule` — which now also builds a
  `kindedBusy` list from every earlier layer's placements plus
  `existingSlots` — through `flexible-placement.ts`'s new optional third
  parameter. `docs/domain-model.md`'s Scheduler section now carries the
  full term-by-term mapping table (every one of the formula's 7 terms,
  scored / handled elsewhere / explicitly out of scope with a stated
  reason) so the v1 boundary is precise rather than a blanket "not
  overclaimed" note. 5 new tests in `objective.test.ts`, 1 new pipeline
  test in `flexible-placement.test.ts` (isolates ContextSwitching's effect
  on a real placement decision by holding FreeBlockSize and daily-balance
  equal between two candidate gaps on the same day, differing only in
  which one touches a different-kind neighbor).
- `objective.ts` (follow-up, 2026-07-22, project owner's explicit scope
  decision after the Stop hook flagged the remaining gap — RCPSP resource/
  dependency modeling and a formal solver architecture would require new
  domain concepts this project's `ROADMAP.md` governance reserves for a
  human to authorize; extending the existing WCSP gap-scoring to more
  placement paths without inventing those concepts was chosen instead):
  new `pickBestGapInWindow`, a drop-in replacement for `time.ts`'s
  `findFreeInterval` with the identical signature and feasibility contract,
  but scoring FreeBlockSize/Fragmentation across every gap in the given
  window instead of returning the first one found. Wired into
  `occurrence-timing.ts`'s `findOccurrenceWindow` (`Routine`/
  `CategoryItemSchedule`, all three of its search branches) and
  `hard-constraints.ts`'s `placeDeadlineTasks` (`findFreeSlot`).
  Deliberately does **not** change which day/window each path searches —
  only which gap inside an already-chosen window comes back — so
  `Deadline Task`'s day-by-day slack-budget loop and the charter's
  never-silently-drop guarantee are untouched; all 97 pre-existing
  scheduler tests passed unmodified against the new code, including all 22
  `hard-constraints.test.ts` cases. 2 new tests (`category-placement.test.ts`,
  `hard-constraints.test.ts`) mirror `flexible-placement.test.ts`'s
  fragmentation-avoidance test: a day split into a gap that would be filled
  exactly (zero leftover) and a gap with a large leftover now picks the
  latter, where the old first-fit search picked the former.
- `docs/scheduler-constraint-formulation.md` (new): the Scheduler's formal
  Constraint Optimization Problem definition — decision variables, domain,
  hard/soft constraints written in standard CP/WCSP notation matching
  `objective.ts`'s actual weights — plus an honest section on how the
  current greedy/sequential search differs from a real CP-SAT
  branch-and-bound solver, and how RCPSP's resource-capacity/precedence
  extensions relate to what Progressor does and doesn't model. Written to
  directly engage with the `/goal`'s recommended references (Handbook of
  Constraint Programming, RCPSP surveys, OR-Tools CP-SAT) without adding
  any new dependency, domain concept, or architecture — pure documentation
  of what the existing, already-tested implementation already does,
  formalized in the requested vocabulary. Linked from `docs/README.md`.

### Changed

- Weekly View empty-cell "＋" affordance restyled from a full-width
  dashed "＋ 新增" button to a quiet, low-opacity "＋" that only reaches
  full color on hover/focus — same-day project-owner feedback that ~105
  loud buttons per week read as visual clutter, not a calm timetable.
- An empty hour cell exactly adjacent to an existing `Time Slot`'s
  boundary now shows a one-click "接續前一個"/"接續後一個" button that
  extends that slot to swallow the hour (`ExtendSlotButton`,
  `src/app/page.tsx`, reuses the existing `updateTimeSlotAction`) — for
  wanting a session longer than one hour without reopening the add form
  and retyping the end time.
- All four pages now share one persistent, sticky top nav bar
  (`src/app/nav-bar.tsx`, rendered in `layout.tsx`) with active-link
  highlighting, replacing the plain-text section links each page used to
  repeat on its own.
- The Weekly View's inline edit/add forms (`SlotEditForm`,
  `InlineAddForm`) now render as a labeled card, consistent with every
  other page's inline edit form, instead of unlabeled bare inputs.
- The Weekly View's standalone "新增時段" form was removed (click-to-
  create on the grid covers it), and "快速新增臨時事件" is now a
  `?quickEvent=1` toggle next to "產生課表" instead of an always-visible
  section — the page ends right after the grid by default.
- Every `<input type="time">`/`<input type="date">` in the app (Weekly
  View's edit/add/quick-event forms, `/commitments`' Fixed Commitment
  and Deadline Task forms) was replaced with click-based `TimePicker`/
  `DatePicker` components (`src/app/time-picker.tsx`, `date-picker.tsx`,
  `use-popover.ts`) — a 上午/下午 toggle, hour/minute grids, and a real
  month calendar, all mouse-driven, submitting the same `"HH:MM"`/
  `"YYYY-MM-DD"` strings the existing Server Actions already expected
  (no action or service-layer changes).
- Weekly View hour rows now have a uniform `min-height` (real timetable
  blocks from the start, not just tall enough for "+") and the "+" is
  centered both axes; a multi-hour slot's continuation indicator now
  fills the row instead of a thin line.
- The Weekly View's edit/add-slot forms no longer expand their own row
  inline — `HourCellOverlay` (`src/app/hour-cell-overlay.tsx`, new)
  floats them as a panel next to the cell instead, so editing one day's
  slot no longer misaligns that day's rows against the rest of the week.
- Phase 7 ("Semester Scoping for Fixed Commitments & Concrete Routine
  Times") authorized, activated, and closed: completion audit at
  `docs/audits/semester-scoping-and-concrete-routine-times-audit.md`;
  removed from `ROADMAP.md`.
- New `Semester` concept (`src/server/semester.ts`, singleton — start
  date + week count, default 16), configurable from a "學期設定" section
  on `/commitments`.
- `FixedCommitment.ignoreSemesterBounds` (new column, default `false`,
  a checkbox on its create/edit forms): when a `Semester` is configured,
  a non-opted-out commitment's occurrence is only placed by the
  Scheduler for weeks inside the Semester's range (`isWithinSemester`,
  `src/scheduler/hard-constraints.ts`) — unaffected when opted out or
  when no Semester is configured.
- The Weekly View shows "第 N 週" next to the week label whenever the
  displayed week falls inside the configured Semester's range
  (`semesterWeekIndex`, `src/app/week.ts`).
- `Routine.preferredStartTime` (new column, nullable `"HH:mm"`, set via
  a `TimePicker` + checkbox on `/routines`): the Scheduler
  (`routine-placement.ts`) tries this exact time before
  `timeOfDayPreference`'s bucket window, falling back exactly as before
  when unset.
- Weekly View day columns are now a real CSS Grid instead of a flex
  column of independent hour rows, so a multi-hour `Time Slot` renders as
  one card spanning `grid-row: "<start> / span <n>"` — one continuous
  block crossing cell boundaries — instead of a start-hour card followed
  by separately styled "continuation" strips underneath it (project
  owner, 2026-07-21: "接續...the event should cross the blocks").
- `SlotCard` (`src/app/page.tsx`) redesigned as a compact chip: only the
  time range and occupant label are always visible; clicking the card
  opens the existing floating edit panel, and 移除 is now a small icon
  button (`.slotDeleteButton`) instead of a separate always-visible text
  row — project owner, 2026-07-21: "固定事務：資料探勘 / 編輯 / 移除"
  stacked as three lines was needless clutter.
- The Weekly View's/`/commitments`' occupant `<select>` ("內容") replaced
  with `OccupantPicker` (`src/app/occupant-picker.tsx`), a grouped
  popover listing every Routine/Fixed Commitment/Deadline Task/Book or
  Course/Ad-hoc Event by category — project owner, 2026-07-21, mistook a
  cramped native dropdown (only "留白（不指定）" visibly highlighted) for
  there being nothing else to pick, even though a second option existed
  underneath it.
- `occupantLabel` (`src/server/time-slots.ts`) no longer prefixes a Time
  Slot's title with its category (e.g. "固定事務：資料探勘") — the
  compact `SlotCard` now shows just the title. The category moved to a
  new `occupantKind` field, shown only once a slot's edit panel is
  opened (a small badge above the fields) — project owner, 2026-07-21:
  "no need prefix, for anything in 課表. Just show what kind is it after
  click open details."
- `Routine.durationMinutes` (new column, default 120): each Routine now
  has its own session length instead of the Scheduler applying one
  hardcoded `SESSION_DURATION_MS` (2 hours) to every Routine's
  occurrence — set via a "時間長度（分鐘）" number input on `/routines`.
  The default (120) matches the prior constant exactly, so an existing
  Routine's placement is unaffected until its duration is edited.
- `.checkboxLabel` (`src/app/page.module.css`, used by the Weekly View's
  occupant-picker-adjacent checkboxes and `/commitments`'/`/routines`'
  option checkboxes) — a lone checkbox+text row used to sink to the
  bottom of its `.addForm .slotForm` row (shorter than sibling label+
  input fields, so `align-items: flex-end` bottom-aligned it out of
  step) and rendered as a bare, unstyled browser-default square;
  `align-self: center` now centers it within the row, and the checkbox
  itself is restyled (`appearance: none` + a themed border/fill/
  checkmark) to match the rest of the app instead of standing out —
  project owner, 2026-07-21: "checkbox a bit 突兀 and location not
  horizontally aligned."
- `DeadlineTask.estimatedDays` renamed to `estimatedHours` (Float; "預估
  工時（小時）" on `/commitments`) and `placeDeadlineTasks`
  (`src/scheduler/hard-constraints.ts`) rewritten to actually use it: it
  previously placed exactly one fixed 2-hour session per task regardless
  of the field's value (the field did nothing). It now splits the task's
  total hour budget across one session per day (capped at 2h/day, and by
  each day's `MIN_SLACK_SHARE_PER_DAY` budget so it can't pack a day
  solid) over as many days as needed before the deadline. Hours that
  still don't fit are surfaced as a `deadline-task-unplaceable`
  `SchedulerConflict` alongside whatever did get placed, never silently
  dropped — project owner, 2026-07-21, on seeing "預估天數": "what i
  supposed is 預估小時...the system would assign it into empty 課表
  spaces (ofcourse can split)...try best to fit the requirement and make
  the result most not squeezed." Scoped to `DeadlineTask` only (not
  `Trackable Item`), per the project owner's explicit answer when asked.
  `dailyWindowMs`/`usedMsOnDay` moved from `flexible-placement.ts` to the
  shared `src/scheduler/time.ts` so both placement layers use the same
  Slack-budget logic (`flexible-placement.ts` re-exports them for
  `repair.ts`'s existing import).
- `Routine`/`CategoryItemSchedule`'s Time-of-Day Preference is now
  multi-select (`timeOfDayPreference: TimeOfDayPreference | null` →
  `timeOfDayPreferences: TimeOfDayPreference[]`, JSON-encoded array column,
  default `"[]"`) — project owner, 2026-07-22, while investigating the
  evening/08:00 placement bug documented under "Fixed" below: wanted to
  pick more than one bucket (e.g. 早上 AND 傍晚), and "if the time periods
  are contiguous, the system can even join them together."
  `src/scheduler/occurrence-timing.ts`'s `findOccurrenceWindow` now builds
  a list of candidate windows (`buildCandidateWindows`) from the selected
  buckets, merging adjacent ones (e.g. `morning`+`afternoon`, which touch
  at 12:00) into one continuous window; non-adjacent selections (e.g.
  `morning`+`night`) stay separate and are tried in day order, so a gap
  the user didn't select is never silently filled. Only the last candidate
  is allowed to run past its own bucket's end (up to the full daily
  window) — the same overflow behavior as the evening/08:00 fix below,
  now generalized to N selected buckets; earlier candidates stay strictly
  bounded to their own window. New shared helpers in
  `src/server/cadence.ts`: `assertValidTimeOfDayPreferences`,
  `serializeTimeOfDayPreferences` (dedupes + sorts into canonical order),
  `parseTimeOfDayPreferences`. The UI (`/routines`, `/items`) replaced the
  single `<select>` with a checkbox group; `formData.getAll` reads every
  checked value, so the old "（無偏好）" sentinel option is gone — zero
  boxes checked now means no preference. Migration
  (`20260722034900_routine_multi_time_of_day`) preserves existing data:
  an existing single value like `"evening"` becomes `["evening"]`, not `[]`.
- `GroupedSlotBlock`'s compact card (`src/app/grouped-slot-block.tsx`)
  showed only a bare "N 項進行中" count, never the actual item titles —
  unlike `SlotCard`, which always shows its one item's title inline.
  Project owner, 2026-07-22: "why the fuck the blocks still blank and not
  even showing 看書 or 書籍...if time table block space enough, can still
  show...book names...wont ever explode since the border can just cut
  off." Now joins every item's title into the same `.slotOccupant` span
  `SlotCard` uses — already 3-line-clamped with `overflow: hidden` on the
  parent, so a long list is safely truncated in place rather than
  inflating the block, with the full list one click away via the existing
  expand panel. Added `.slotGroupCount` for a smaller trailing "共 N 項".

### Fixed

- `occupantLabel` (`src/server/time-slots.ts`) — the Weekly View's per-slot
  occupant text for every occupant kind, not just `Trackable Item` — was
  still in English, a leftover gap from Phase 5's translation pass; now
  Traditional Chinese throughout.

- `placeFixedCommitments`/`placeRoutines`/`placeFlexibleTrackableItems`
  (`src/scheduler/`) re-placed a duplicate `Time Slot` for an
  already-scheduled `Fixed Commitment`/`Routine` occurrence or
  `Trackable Item` session on every re-run of schedule generation for
  the same week — now idempotent (`hasExistingOccurrence`, per-item
  "already scheduled this week" checks), a prerequisite for drag-and-drop
  priority reordering to safely trigger an instant regenerate on every
  drop.

- Vitest test files raced on the shared SQLite test database when run in
  parallel, corrupting other files' in-progress assertions; disabled
  `fileParallelism` in `vitest.config.ts`.
- `updateTimeSlot` silently reused a `Time Slot`'s previous `occupantId`
  when `occupantType` changed without a new id — now requires a fresh
  `occupantId` whenever the type changes.
- `HourCellOverlay`'s floating edit/add-slot panel (`src/app/
  hour-cell-overlay.tsx`) clamped its `position: fixed` placement against a
  guessed constant height (340px) instead of the panel's real size — once
  its content grew past that guess (e.g. expanding the 內容 occupant
  picker's list), the bottom of the panel overflowed past the viewport
  with no way to scroll to it (project owner, 2026-07-22: "content below
  lower bound would never seen and manipulate"). Now measures the panel's
  actual rendered size via `ResizeObserver` and re-clamps on both content
  resize and window resize, plus a `max-height`/`overflow-y: auto` fallback
  on `.hourOverlayPanel` (`src/app/page.module.css`) so content taller than
  the viewport itself is still reachable by scrolling inside the panel.
- `GroupedSlotDetailPanel`'s per-item rows (`src/app/grouped-slot-block.tsx`)
  reused `.recordCard`'s row layout (title block beside a 3-button action
  block), built for the wide record-list pages (`/items`, `/routines`,
  `/commitments`) — squeezed into the floating panel's 260px, `.recordMain`
  was left almost no width, wrapping CJK book titles one character per line
  and clipping the `／共 N 章` half of the progress fraction out of view
  (project owner, 2026-07-22 screenshot: "股票作手回憶錄" stacked
  vertically, "第13章的 ?/?"). Added a `.hourOverlayPanel .recordCard`
  override (`src/app/page.module.css`) that stacks the action row below the
  title instead of beside it, and a `panelClassName` prop on
  `HourCellOverlay` so this one floating-panel case can render at 400px
  instead of 260px.
- `findOccurrenceWindow`'s Time-of-Day Preference search
  (`src/scheduler/occurrence-timing.ts`, shared by `Routine` and
  `CategoryItemSchedule`) bounded the search to the preference bucket's own
  end (e.g. evening's 17:00-20:00) — a session whose `durationMinutes`
  alone exceeds the bucket's width (e.g. a book's 200-minute block vs.
  evening's 180-minute span) could then never fit, silently failing the
  bucket search and falling through to the full-day fallback, which starts
  searching from 08:00 and ignores the preference entirely (project owner,
  2026-07-22: set 傍晚/200min on `book`, got placed at 08:00 with the
  evening window sitting empty — "why 排 早上, other space are even
  empty"). The bucket search now only bounds the earliest allowed *start*
  (`window.start`), letting the session run past the bucket's own end up
  to `DAILY_WINDOW_END` — it still starts as close to the preferred bucket
  as possible instead of abandoning the preference outright. Existing
  `Time Slot`s already generated before this fix still reflect the old
  08:00 placement; regenerating (`產生課表`) only fills in new/unfilled
  occurrences, so already-placed days need their old `Time Slot`s removed
  first for the corrected placement to apply retroactively.
- `placeDeadlineTasks`'s (`src/scheduler/hard-constraints.ts`)
  `MIN_DEADLINE_SESSION_MS` day-budget gate compared a day's whole slack
  headroom against the 30-minute threshold, skipping the day outright
  whenever that headroom was small — even when the task's actual remaining
  work was itself smaller than the headroom and would have fit.
  `constants.ts`'s own comment on `MIN_DEADLINE_SESSION_MS` promises this
  doesn't block "a genuinely small *final* remainder," but the code never
  actually implemented that carve-out. Now compares the chunk it would
  actually place (`chunkMs`) against the threshold, and only skips when
  more of the task remains after this chunk — a task's last few minutes of
  work are no longer needlessly surfaced as a `SchedulerConflict` on a day
  that had just enough room.
- `repairInsertAdHocEvent` (`src/scheduler/repair.ts`), part of Phase 3's
  Elastic Re-Scheduling, predated `CategoryItemSchedule`
  (`category-placement.ts`, added this session) and had two related gaps
  once the two features interact: (1) `relocateSession` always searched
  for exactly the generic `SESSION_DURATION_MS` (2h) when relocating a
  Trackable Item session evicted by a new Ad-hoc Event, silently
  shrinking/growing a relocated session that was actually a different
  length (e.g. a book's 200-minute `CategoryItemSchedule` block) — now
  preserves the evicted slot's own original duration. (2) Two or more
  Trackable Item `Time Slot`s sharing one `CategoryItemSchedule` occurrence
  (identical `[startAt,endAt)`, per that feature's core "all books in
  progress share one window" invariant) were evicted and relocated
  independently, letting them land on different days/times and fragmenting
  the occurrence right back into the separate carve-outs the feature was
  built to avoid — `relocateSession` → `relocateGroup` now relocates every
  member of a shared occurrence to the same new window together, or drops
  the whole group (no session for either) if no shared window exists,
  never a partial fragment. Also found while fixing this: `busy` excluded
  *every* slot overlapping the new Ad-hoc Event regardless of type,
  including a Fixed Commitment/Deadline Task/Routine that's flagged (or
  left alone) but never actually removed from the board — wrongly freeing
  up that commitment's own real-world-occupied window for a relocation
  search to land on. Now only Trackable Item slots (the ones actually
  evicted) are excluded from `busy`.
- `GroupedSlotBlock` (`src/app/grouped-slot-block.tsx`) rendered no tag
  markup at all, so the Weekly View's "標籤" display-option toggle had no
  effect on merged book/course blocks even though it correctly showed/hid
  tags on every single-item `SlotCard` — project owner, 2026-07-22: "show
  標籤 cliked but books inside 標籤 not showed." Now renders the group's
  deduped tags through the same `.slotTags`/`.slotTagChip` markup
  `SlotCard` already used, so the existing `data-show-tags` CSS toggle
  (`display-options.tsx`) applies uniformly.
- `HourCellOverlay`'s floating panel (`src/app/hour-cell-overlay.tsx`)
  still clipped in some cell positions even after the previous
  anchor-clamp fix — project owner, 2026-07-22, on the expanded book detail
  panel running off the right/bottom edge: "bro still cut wtf, I dont wanna
  see any cut in any cases...why not just set that more centered in the
  screen." Replaced anchor-relative positioning entirely with a centered
  modal: a fixed, dimmed backdrop with the panel centered inside it,
  bounded to `calc(100vw/vh - 32px)` with its own internal scroll —
  verified down to a 380×300 viewport, where the panel still stays fully
  on-screen and scrolls internally instead of spilling past an edge.
  Removes the whole class of "content cut off past the viewport edge"
  bugs instead of patching the clamp math a third time.
- Every internal `?edit=`/`?add=`/`?expand=`/week-nav link (`src/app/
  page.tsx`, `grouped-slot-block.tsx`) was a plain `<a href>`, forcing a
  full document reload on every click — project owner, 2026-07-22: "the
  page rerender and have a kind of lag or tick." Converted to `next/link`'s
  `Link` for client-side transitions; verified live that closing the
  detail panel no longer reloads the page.
- The floating panel's close action was a "取消"/"關閉" text link buried at
  the bottom of its content — project owner, 2026-07-22: "關閉 should be
  like a x on right up which is more intuitive." Replaced with a single
  top-right X button rendered by `HourCellOverlay` itself (so it applies
  uniformly to the edit/add/expand panels), removing the redundant
  per-form text links.

### Removed
