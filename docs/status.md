<!-- TEMPLATE: This is the detailed "what is actually true right now" doc —
finer-grained than build-status.md's coarse table. Update it every loop that
changes observable behavior. An agent should be able to trust this doc over
its own possibly-stale memory of the codebase. Delete this comment once
filled in with real content; keep the section headings as a durable
structure even if some sections stay short. -->

# Status

Source of truth for current, actually-implemented behavior. If this doc and
the running code disagree, the code wins and this doc is out of date — fix
the doc as part of whatever change you're making, don't leave the drift for
later.

## Verification Gates

### Task Gate

<!-- TEMPLATE: Define the single fast command (or short sequence) that runs
on EVERY task-loop iteration and proves a change didn't break anything
observable — the thing referenced by LOOP_ENGINEERING.md's task loop
("prove it, don't just claim it"). Model:

```bash
<lint>
<typecheck>
<test>
<build>
```

If there's no single bundled command yet, that's itself worth a PRIORITIES.md
entry — "no task gate" means every change requires a human to manually
decide whether it's safe, which defeats the purpose of this repo. -->

### Phase Gate

<!-- TEMPLATE: Define the expensive checks that run only when a ROADMAP.md
phase closes — integration/end-to-end tests, a written manual walkthrough
script, real-data runs; whatever proves a whole phase's exit condition
rather than a single change. Results are recorded as evidence in the phase
audit (docs/audits/). Keep it heavier than the task gate on purpose — see
LOOP_ENGINEERING.md, "Two verification gates." -->

## Current Behavior

<!-- TEMPLATE: Describe what's actually implemented and working, organized
by the core areas from project-charter.md / domain-model.md. Be specific
about edge cases, current limits, and known rough edges — this doc's value
is in the details a coarse status table can't hold. -->

## Known Limits

<!-- TEMPLATE: Things that are true right now and intentional or
not-yet-fixed, so an agent doesn't mistake a known limit for an undiscovered
bug (or vice versa). -->

## Configuration / Environment Notes

<!-- TEMPLATE: Anything an agent needs to know about how this system is
configured/deployed to reason correctly about behavior — modes, environment
variables that change behavior materially, feature flags. Don't duplicate
secrets-handling policy here; that belongs in AGENTS.md's Security section. -->
