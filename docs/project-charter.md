<!-- TEMPLATE: This is the highest-authority doc in the project — the one
other docs and PRIORITIES.md defer to when there's a conflict. Fill in every
section below with real, specific content (not aspirational marketing copy).
Vague charters produce vague authorization, which defeats the point: an
agent (or human) reading this should be able to make correct judgment calls
without asking, precisely because this document was specific enough to
answer the question. Delete this comment once filled in. -->

# Project Charter

## Mission

<!-- TEMPLATE: 1-2 paragraphs. What is this project for, who is it for, and
what does "done" or "good" mean for it? Explicitly state what it is NOT, if
there's an obvious wrong assumption to head off (the model example: "an
operator-assist system, not an autonomous bot"). -->

## Core Areas

<!-- TEMPLATE: Break the mission into the major functional areas of the
product/system, mirroring how domain-model.md will name them. For each area,
state what it must do and what invariant it must uphold. Model shape (from a
trading-system project) — adapt the structure, not the specific content:

### <Area Name>

<What this area is responsible for, and what must always be true about it.> -->

## Guardrails

<!-- TEMPLATE: The non-negotiable rules that constrain every future
decision — the things that must stay true regardless of what feature is
being built. These are what "What Counts as a Blocker" in PRIORITIES.md
should ultimately trace back to. Model examples from a trading system:
- A destructive/high-stakes mode never activates without explicit,
  hard-to-fumble opt-in.
- An external side effect is never treated as complete until independently
  confirmed, not just requested.
- Sensitive endpoints/data stay behind the minimum necessary access boundary
  until proper auth exists.
Write yours as concrete, checkable rules — not aspirations like "be safe." -->

## Documentation Contract

Use these docs as the source of truth. Update the canonical doc when
direction or behavior changes — do not rely on chat history or an agent's
memory of a past session as the record of what was decided.

- [`project-charter.md`](project-charter.md) (this file): mission, core
  areas, guardrails.
- [`domain-model.md`](domain-model.md): concept names and relationships.
- [`system-direction.md`](system-direction.md): architecture direction and
  refactor priorities.
- [`status.md`](status.md): current behavior and system-specific notes.
- [`build-status.md`](build-status.md): coarse build status and verification
  evidence.
- [`../ROADMAP.md`](../ROADMAP.md): the pre-authorized phase queue.
- [`../PRIORITIES.md`](../PRIORITIES.md): active engineering priorities.
- [`../INBOX.md`](../INBOX.md): pending human input (transient — items are
  translated into the docs above, then cleared).
<!-- TEMPLATE: add any project-specific canonical docs listed in
docs/README.md, e.g. api-spec.md, ui-direction.md. -->

If a decision isn't answered by any doc listed here, that's a signal to stop
and ask a human rather than infer — see `../LOOP_ENGINEERING.md`.
