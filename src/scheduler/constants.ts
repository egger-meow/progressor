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

// One "day" of an item's estimatedDays becomes one session of this many
// hours, once per calendar day it's scheduled.
export const SESSION_HOURS_PER_DAY = 2;
export const SESSION_DURATION_MS = SESSION_HOURS_PER_DAY * 60 * 60 * 1000;

// Minimum share of each day's daily scheduling window that flexible
// Trackable Item placement must leave unfilled as Slack, so the week isn't
// packed solid (docs/domain-model.md's "Slack" — what makes Phase 3's
// elastic re-scheduling possible). An inferred placeholder, not a user
// decision yet — same status as DEFAULT_WIP_LIMIT, flagged in
// docs/status.md, adjustable here.
export const MIN_SLACK_SHARE_PER_DAY = 0.2;
