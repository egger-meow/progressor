# Changelog

All notable changes to this project are documented here.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/), and
this project's versioning is defined in [`docs/release.md`](docs/release.md).

## [Unreleased]

### Added

- Bootstrap: drafted all canonical docs (`docs/project-charter.md`,
  `docs/domain-model.md`, `docs/system-direction.md`, `ROADMAP.md`,
  `docs/status.md`, `docs/build-status.md`, `docs/release.md`, `CLAUDE.md`,
  `AGENTS.md`, `PRIORITIES.md`, `README.md`) from the human's project idea,
  per `BOOTSTRAP.md`.
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

### Removed
