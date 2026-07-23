# Scheduler Constraint Formulation

This is the formal Constraint Optimization Problem (COP) definition of
Progressor's Scheduler, in standard CP/WCSP/RCPSP vocabulary — written for
readers connecting the code to the literature the project owner's
2026-07-22 `/goal` named (Handbook of Constraint Programming; RCPSP survey
literature; Google OR-Tools CP-SAT). It complements
[`domain-model.md`](domain-model.md)'s Scheduler section (the product-facing
"what, and where in code") rather than replacing it — read that first for
orientation; this file exists specifically to make the formulation
implicit in the code explicit, and to be honest about exactly how far the
current implementation goes and doesn't go relative to the full literature.

## Decision variables

For each Time Slot the Scheduler decides to place — one per Fixed
Commitment occurrence, Routine occurrence, `CategoryItemSchedule`
occurrence, Deadline Task chunk, or flexible Trackable Item session — the
decision variable is its start time `s_i` (a point in continuous time
within the target week). Its end time is fully determined by
`s_i + duration_i`: every session's duration is fixed by its type
(`SESSION_DURATION_MS`, a schedule's `durationMinutes`, or a Deadline
Task chunk's computed size), never itself a decision.

## Domain

The domain of `s_i` — every value it could feasibly take — is the set of
free gaps in `[DAILY_WINDOW_START, DAILY_WINDOW_END)` on candidate days,
after subtracting every interval already claimed by an earlier-decided
variable (`busy`). This is why the Scheduler layers hard-constraint types
before soft ones (`index.ts`'s `computeSchedule`): each layer's placements
shrink every later variable's domain before that variable is ever
evaluated.

## Hard constraints

As implemented today — matching the requested "no overlap / deadlines /
fixed events" list, plus two Progressor-specific ones the literature
doesn't name:

- **No-overlap**: for any two placed slots `i, j`,
  `[s_i, s_i+duration_i)` and `[s_j, s_j+duration_j)` never overlap.
  Enforced structurally — every candidate domain value is already carved
  out of `busy` — so this can never be violated by construction, not
  checked after the fact.
- **Fixed events**: a Fixed Commitment's `s_i` isn't a decision at all —
  a deterministic function of its `dayOfWeek`/`startTime` — so this
  constraint is satisfied by construction too.
- **Deadlines**: `s_i + duration_i <= task_i.dueAt` for every Deadline
  Task chunk (`hard-constraints.ts`'s day loop: `if (day >= deadline)
  break`).
- **Daily window**: `s_i >= DAILY_WINDOW_START` and
  `s_i + duration_i <= DAILY_WINDOW_END` on `s_i`'s own day.
- **Per-day Slack budget** (Progressor-specific — `domain-model.md`'s
  "Slack" concept, the charter's elasticity guardrail requiring headroom
  for later manual edits): a day's already-used time plus this session's
  duration cannot exceed `dailyWindowMs * (1 - MIN_SLACK_SHARE_PER_DAY)`.
- **WIP Limit** (Progressor-specific): which Trackable Items even have a
  decision variable at all is capped per type (`selectEligibleItems`) — a
  "which variables exist" constraint, not a value constraint on an
  existing one.

## Soft constraints (the WCSP objective)

`objective.ts`'s `scoreCandidate`, evaluated over every value remaining in
a variable's domain once the hard constraints above have already filtered
it:

```
Score(s_i) = w_free   · FreeBlockSize(s_i)
           − w_frag   · Fragmentation(s_i)
           + w_bal    · DailyBalance(s_i)
           + w_energy · EnergyAlignment(s_i)
           − w_switch · ContextSwitching(s_i)
```

with weights (`w_free=1, w_frag=3, w_bal=1, w_energy=0.5, w_switch=1`)
chosen so no single term can dominate the sum (`objective.ts`'s own
comment). The exact mapping of these five terms — plus the three
requested-but-deliberately-not-scored terms, `GoalCompletion` (a
mechanism: `selectEligibleItems`'s priority sort), `Overtime`
(structurally impossible among already-hard-filtered candidates), and
`DeadlineSlack` (out of scope for the one path with no due date) — to
their exact code location and reasoning already lives in
[`domain-model.md`](domain-model.md)'s Scheduler section; not duplicated
here.

## Solving approach — honestly, not a general CP-SAT solver

This is a **greedy, sequential, priority-ordered local search**, not a
general-purpose constraint solver:

1. Variables are decided one at a time, in a fixed order (hard-constraint
   types first, in `computeSchedule`; within Trackable Items,
   `selectEligibleItems`'s priority sort).
2. For each variable, every value remaining in its *current* domain
   (after all prior decisions) is enumerated and scored; the
   highest-scoring value is committed immediately and permanently — no
   backtracking.
3. Because commitments are permanent, this is **not** guaranteed to find
   the schedule with the single highest total score across all variables
   jointly. A true CP-SAT branch-and-bound solver, or an RCPSP heuristic
   like a serial/parallel schedule-generation scheme, would explore
   alternate orderings or backtrack on a bad early commitment. What this
   guarantees instead: every individual placement decision is the best
   available *given everything decided before it* — a myopic/greedy
   optimum, not a provably global one.

This tradeoff is deliberate, not accidental: it keeps `computeSchedule`
linear-time and keeps the Scheduler layer pure and fixture-testable per
`system-direction.md`'s layering rule — no external solver process to
shell out to, no long-running search to bound. Google's OR-Tools CP-SAT —
the engineering reference the `/goal` message named — is a real
branch-and-bound/lazy-clause-generation solver that would find a global
(or provably-bounded) optimum over *the same variables and constraints
modeled above*, at the cost of a genuinely different architecture: a
separate solver process/library dependency, a translation layer from this
domain model into CP-SAT's variable/constraint API, and a bounded time
budget per solve (CP-SAT is not guaranteed instant). Adopting it is a
real, available option for a future phase — not adopted now because it's
a dependency and architecture decision `ROADMAP.md`'s own governance
reserves for a human to authorize (see `status.md`'s 2026-07-22 entries
for the full discussion), not a technical limitation of the model above.

## Relationship to RCPSP

RCPSP generalizes this problem with two extensions the "recommended
references" section names directly:

- **Multiple resource types with finite per-period capacity.** Progressor
  currently models exactly one resource — time itself, via the daily
  window and Slack budget. Energy/focus/availability are not modeled as
  separate capacitated resources (see `domain-model.md`'s
  `EnergyAlignment` entry) because no per-item data exists in the domain
  model to size such a resource meaningfully — `EnergyAlignment` today is
  a generic, weakly-weighted "earlier is mildly preferred" default, not a
  read of a real capacity constraint.
- **Precedence constraints between tasks.** Progressor's domain model has
  no concept of one Trackable Item/Routine/Deadline Task depending on
  another completing first. A Book's chapters are ordered *within* one
  item via `unitsCompleted`, but the Scheduler doesn't model that as an
  inter-task dependency edge; two different Trackable Items are always
  independent of each other.

Both extensions are legitimate, well-studied directions — exactly what
RCPSP's resource-capacity and precedence-graph formulations are — but
each requires new domain concepts this project's `ROADMAP.md` reserves
for human authorization, consistent with the project owner's explicit
2026-07-22 decision (see `status.md`) to keep this round of work inside
the current domain model rather than open that scope unilaterally.
