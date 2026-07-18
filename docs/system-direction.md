<!-- TEMPLATE: This doc separates "where the architecture is heading" from
"where it is right now" (that's status.md's job). Keeping them separate lets
an agent tell the difference between a bug (deviates from status.md) and a
planned gap (deviates from this doc but matches status.md). Delete this
comment once filled in. -->

# System Direction

## Target Architecture

<!-- TEMPLATE: Describe the intended shape of the system — major
components/services/modules and their responsibilities, and the boundaries
between them that must not blur (e.g. "layer X never calls layer Y
directly"). This describes the destination, not necessarily what exists
today; call out explicitly where current code deviates, or let status.md
carry that instead and just link to it. -->

## Current Fit

<!-- TEMPLATE: Honest assessment of how well the current codebase matches
the target architecture above. Where are the known seams, workarounds, or
technical debt that exist because the target isn't fully realized yet? -->

## Refactor Priorities

<!-- TEMPLATE: Architecture-level work that isn't urgent enough to be a
PRIORITIES.md blocker but should inform decisions when touching the affected
area — e.g. "when next touching module X, prefer approach A over B because
we're migrating toward A." If a refactor becomes urgent (blocks something),
it graduates to PRIORITIES.md; this section is a standing bias, not a queue. -->

## Retiring Legacy Paths

<!-- TEMPLATE: State the project's policy on parallel/legacy implementations
once a replacement fully covers them. Model rule (adapt as needed):
"Once a new implementation covers a legacy path's behavior completely,
remove the superseded code, config, tests, docs, and references outright.
Do not keep parallel implementations as permanent compatibility fallbacks
unless a specific external consumer requires the old path to keep working."
-->
