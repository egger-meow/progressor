// Scheduling parameters the project owner chose (2026-07-18) when the
// Scheduler needed them to place flexible work — asked explicitly rather
// than silently inferred, since unlike DEFAULT_WIP_LIMIT these shape every
// schedule the system produces. Adjustable here if the owner's preference
// changes; nothing else in src/scheduler/ should hardcode these values.

// The daily window the Scheduler will place flexible work sessions inside
// (Deadline Task / Trackable Item sessions). Fixed Commitments outside this
// window are still placed as-is — this only bounds where the Scheduler may
// add flexible work.
export const DAILY_WINDOW_START = "08:00";
export const DAILY_WINDOW_END = "23:00";

// One flexible work session (Trackable Item, Routine occurrence, or one
// chunk of a Deadline Task's split work) runs this many hours, at most.
export const SESSION_HOURS_PER_DAY = 2;
export const SESSION_DURATION_MS = SESSION_HOURS_PER_DAY * 60 * 60 * 1000;

// Minimum share of each day's daily scheduling window that flexible
// Trackable Item and Deadline Task placement must leave unfilled as Slack,
// so the week isn't packed solid (docs/domain-model.md's "Slack" — what
// makes Phase 3's elastic re-scheduling possible). An inferred placeholder,
// not a user decision yet — same status as DEFAULT_WIP_LIMIT, flagged in
// docs/status.md, adjustable here.
export const MIN_SLACK_SHARE_PER_DAY = 0.2;

// Below this, a Deadline Task chunk isn't worth searching a day for — skip
// to the next day instead of wedging in a sliver. Doesn't block a
// genuinely small *final* remainder (see placeDeadlineTasks): this only
// gates how much of the day's slack budget must be available up front.
export const MIN_DEADLINE_SESSION_MS = 30 * 60 * 1000;

// How far ahead the Whole-Future Persisted Scheduling Engine
// (src/scheduler/horizon.ts, 2026-07-23) plans by default, and the hard
// cap it's extended to when a Deadline Task's due date or the configured
// Semester's end runs further out — same "inferred default, documented,
// adjustable" status as DEFAULT_WIP_LIMIT. The cap exists so a mis-set
// due date years out can't trigger unbounded computation/storage.
export const DEFAULT_HORIZON_WEEKS = 12;
export const MAX_HORIZON_WEEKS = 26;
