# Loop Engineering

This document is the concept guide for this repository. Read it once, fully,
before filling in any template. Everything else in this repo is an
implementation of the ideas below.

## The problem this repo solves

The default way of working with an AI coding agent looks like this: the agent
proposes something, the human says "yes" or "ok", the agent does it, and
repeat. That loop feels productive but most of the "yes/ok" exchanges carry no
information — the human is rubber-stamping because re-explaining the full
context every time is more expensive than just approving. As a project grows,
this gets worse: more surface area, more decisions, more chances the agent
drifts from what was actually intended, and more human attention spent just
keeping the agent pointed the right way.

**Loop engineering** is the practice of front-loading authorization into
written, canonical artifacts so that day-to-day execution doesn't need
per-step human confirmation. The human's judgment gets spent once, in writing,
on direction and priority. The agent's job on every subsequent loop is to
read the current written state, do the next authorized thing, prove it did
that thing correctly, update the written state, and move to the next thing —
without asking permission for work that was already authorized.

This only works if the written state is trustworthy: current, unambiguous,
and structured so an agent can mechanically determine "what's next" and "is
this actually done" without guessing. That's what the file structure in this
repo exists to guarantee.

## The core insight: separate the four kinds of truth

Most projects blur direction, current state, priority, and history together
into one running conversation (chat history, a single sprawling README, or
the agent's memory of "what we talked about"). Loop engineering keeps them in
four separate, single-purpose places:

| Kind of truth | Question it answers | Lives in | Changes how often |
| --- | --- | --- | --- |
| **Direction** | Where is this going, and what must never break? | [`docs/project-charter.md`](docs/project-charter.md), [`docs/domain-model.md`](docs/domain-model.md), [`docs/system-direction.md`](docs/system-direction.md) | Rarely — only when the human decides the goal itself changes |
| **Current state** | What actually exists and works right now? | [`docs/status.md`](docs/status.md), [`docs/build-status.md`](docs/build-status.md) | Every loop that changes behavior |
| **Priority** | What is the agent authorized to work on next? | [`ROADMAP.md`](ROADMAP.md) (phase-sized), [`PRIORITIES.md`](PRIORITIES.md) (task-sized) | Every loop — items are removed when done, reordered when danger/priority changes |
| **History** | What happened, and when, with what evidence? | [`CHANGELOG.md`](CHANGELOG.md), `docs/audits/`, git commits | Append-only |

Every one of these has an owner and a shape. None of them is "just notes."
If a fact doesn't fit one of these four, it probably doesn't need to be
written down — or it belongs in a code comment at the point of the actual
constraint.

There is one more file that is deliberately **not** a kind of truth:
[`INBOX.md`](INBOX.md), the human-input channel. It holds a pending human
instruction only until the agent translates it into one of the four homes
above, then that item is deleted. It is a mailbox, not a document — see
"The inbox" below.

## Reading discipline: write often, read on demand

Not every file gets read every loop, and that split is deliberate, not an
oversight. The **current-truth** files — `docs/status.md`,
`docs/build-status.md`, `PRIORITIES.md`, `ROADMAP.md` — are read at every
task-loop and phase-loop boundary (see below), which is exactly why they
carry a shrinking-queue rule: a file that gets re-read constantly has to
stay small, or every loop pays a growing token cost for zero new
information.

**History files — `CHANGELOG.md`, `docs/audits/`, `FRAMEWORK_FEEDBACK.md`,
git — are the opposite: written to constantly (append-only), read rarely,
on demand.** Neither the
task loop nor the phase loop below includes them in routine orientation.
Open one only for a specific reason — adding a new entry (a write, not a
full read), preparing a release, or checking whether a specific past claim
still holds — and even then, read narrowly: the `[Unreleased]` section of
`CHANGELOG.md`, not its full history; the one audit file
[`docs/audits/README.md`](docs/audits/README.md)'s index points you to, not
every file in that folder. "Let me read the whole CHANGELOG for context" or
"let me skim all the audits" is a mistake, not thoroughness — it's exactly
the token cost append-only history exists to avoid paying every loop.

## The two loops

Work happens in two nested loops.

- The **task loop** executes one authorized task at a time: take the top
  `PRIORITIES.md` item, do it, prove it, update state, repeat.
- The **phase loop** wraps it: decide which `ROADMAP.md` phase is active,
  decompose it into the task queue, and — when the queue drains — prove the
  *whole phase* works before moving to the next one.

The split exists to answer the question the task loop alone can't: *"the
queue is empty — now what?"* Without a phase loop, an empty queue is always a
human interrupt. With one, the agent returns to the roadmap, closes out the
finished phase with end-to-end evidence, activates the next **pre-authorized**
phase, and keeps going. The human is needed only when the roadmap itself runs
out or a genuine judgment call appears.

**The authorization boundary, stated once:** the phase loop plans *within*
authorization; it never *creates* authorization. It may activate the next
phase a human already wrote into `ROADMAP.md`, and decompose that phase into
`PRIORITIES.md` items. It may not invent a new phase, reorder phases, or
promote a "Proposed" phase to authorized — those are human moves, made in
writing, in `ROADMAP.md`.

```
PHASE LOOP
  1. process INBOX.md
  2. goal + roadmap check ───────────── roadmap exhausted → WAIT FOR HUMAN
  3. active phase's exit condition met?
       yes → run PHASE GATE → write audit → remove phase from ROADMAP.md
  4. activate next authorized phase → decompose into PRIORITIES.md
  5. ↓ run the task loop
  6. ↑ back to 1

TASK LOOP  (inside step 5, repeats while the queue has items)
  a. check INBOX.md ──────────────── direction-level input → exit to phase loop
  b. take the top PRIORITIES.md item
  c. do the work
  d. prove it: TASK GATE
  e. update status docs · retire the item · record history
  f. back to a ──────────────────── queue empty → exit to phase loop
```

### The task loop

This is the inner procedure, one iteration per task:

1. **Orient.** Read [`AGENTS.md`](AGENTS.md) / [`CLAUDE.md`](CLAUDE.md) —
   these point at the canonical docs. Read
   [`docs/project-charter.md`](docs/project-charter.md) and
   [`docs/domain-model.md`](docs/domain-model.md) if this is a new session or
   direction may have changed.
2. **Check the inbox.** Open [`INBOX.md`](INBOX.md). If it has items, process
   them per that file's protocol *before* taking new work: task-level input
   gets translated into `PRIORITIES.md` edits or direct fixes and you
   continue; direction-level input means exit to the phase loop now.
3. **Check current truth.** Read [`docs/status.md`](docs/status.md) and
   [`docs/build-status.md`](docs/build-status.md) to know what already exists
   — don't re-derive this from chat memory, and don't trust a stale mental
   model from a previous session.
4. **Take the top item.** Open [`PRIORITIES.md`](PRIORITIES.md). The first
   item under "Current Priorities" is the authorized next unit of work. Do
   not skip down the list to something more interesting — order is a safety
   decision, not a suggestion (see the rules inside that file).
5. **Do the work.**
6. **Prove it with the task gate.** Run this project's task gate (defined in
   `docs/status.md`). "It should work" is not evidence. A passing gate, a
   manual walkthrough result, or a specific reproduction is evidence.
7. **Update current truth.** Reflect what changed in `docs/status.md` and/or
   `docs/build-status.md`.
8. **Retire the priority item.** Remove it from `PRIORITIES.md` per that
   file's own rules — don't leave a trail of struck-through history there;
   history belongs in `CHANGELOG.md` and git, not in the priority queue.
9. **Record history.** Add a `CHANGELOG.md` entry if this is release-visible.
10. **Repeat from step 2** — or exit to the phase loop (below) when an exit
    trigger fires.

The task loop exits to the phase loop when **any** of these happens:

1. **The queue is empty** — the normal path: the phase may be done.
2. **The inbox contains direction-level input** — a goal change, a strategy
   shift, "this is the wrong approach." Don't patch the current task around
   it; re-plan at the phase level.
3. **The current task contradicts a direction doc** — the work can't be
   completed without violating the charter, domain model, or system
   direction. The phase loop re-evaluates; if it can't resolve the conflict
   from the written docs either, that's a human question.

A small human note in the inbox ("also fix the off-by-one in the pager") is
**not** a reason to exit — translate it into the queue and keep looping.
Bouncing every minor comment up to a full re-plan would make leaving feedback
expensive, which is exactly the failure mode this repo exists to avoid.

### The phase loop

This is the outer procedure:

1. **Process the inbox first.** Direction-level items land here — apply them
   to `ROADMAP.md`, `docs/project-charter.md`, or
   `docs/system-direction.md` (or stop and ask, if they need a decision only
   a human can make) before planning anything else on top of stale direction.
2. **Check the overall goal.** Read the charter and [`ROADMAP.md`](ROADMAP.md).
   If there is no active phase and no authorized phase remaining, everything
   pre-authorized is done: **stop and wait for a human.** This — not an empty
   task queue — is the real "wait for human" condition.
3. **Close out a finished phase.** If the active phase's exit condition
   appears met: run the **phase gate** (see "Two verification gates" below),
   write the audit in `docs/audits/` per
   [`docs/audits/README.md`](docs/audits/README.md), add the `CHANGELOG.md`
   entry, and remove the phase from `ROADMAP.md` per that file's rules. If
   the phase gate fails, the gap goes into `PRIORITIES.md` and the phase
   stays active.
4. **Activate the next authorized phase.** Take the first phase under
   "Authorized Phases" in `ROADMAP.md`, mark it active, and decompose it into
   concrete `PRIORITIES.md` items — each with a stated "done means" that the
   task gate can verify. This decomposition is mechanical planning within
   what the human already authorized, so it does not need per-item sign-off.
5. **Run the task loop** until an exit trigger fires.
6. **Return to step 1.**

## The inbox: the human checkpoint

[`INBOX.md`](INBOX.md) is how a human steers a running loop without sitting
next to it. Drop a note in the file at any time; the agent checks it at every
task-loop boundary and at the start of every phase loop. The full protocol
lives in the file itself; the load-bearing rules are:

- **One-shot semantics.** An item lives in the inbox only until it's
  processed. This keeps the file near-empty at rest — no accumulating
  history to re-read every loop, no index needed, no token bloat.
- **Translate, then clear, in the same commit.** The commit that deletes an
  item must contain the edits that item turned into (a `PRIORITIES.md` entry,
  a charter change, a status fix). The diff is the receipt — the human
  reviews it to catch misreadings *before* the instruction is gone. Never
  "read and clear" without the translation in the same change.
- **Delete only what you processed.** Never truncate the whole file — the
  human may have appended a new item while the agent was mid-loop.
- **Git is the archive.** The file stays tracked in git (do not gitignore
  it); its commit history is the permanent record of what came through and
  what each item became.

## Framework feedback: the flight recorder

[`FRAMEWORK_FEEDBACK.md`](FRAMEWORK_FEEDBACK.md) is the inbox's mirror
image: the inbox carries human input *into* the project; this file carries
defect reports *out of* it, back to the scaffold the project was copied
from. When the framework itself fails you mid-loop — you got lost despite
the docs, a rule forced token waste, two rules contradicted each other, a
gate didn't fit, the human had to step in where autonomy was promised —
append a short entry (the file's header gives the format and a ~6-line
cap) and keep working.

Three rules keep it near-free, all inherited from patterns above:

- **It's history-class.** Append-only, write-only during loops, never part
  of routine orientation — "Reading discipline" applies in full. Appending
  a few lines costs almost nothing; the token cost this design avoids is
  re-reading the file, so don't.
- **Nothing in it licenses work.** It's a flight recorder, not a second
  inbox or a backlog. Record and move on; an entry is never a reason to
  "fix the framework" in this repo mid-loop.
- **Harvest is human-triggered, at phase close.** The audit's Follow-Up
  step reminds the human when the file gained entries; the agent drafts
  the upstream issue text, the human files it. Each harvest appends a
  receipt line — entries themselves are never edited.

## Two verification gates

Both are defined per-project in [`docs/status.md`](docs/status.md):

- The **task gate** is fast and runs every task-loop iteration — typically
  lint + typecheck + unit tests + build, bundled as one command. It proves
  *this change* didn't break anything observable.
- The **phase gate** is expensive and runs only when a phase closes —
  integration/end-to-end tests, a written manual walkthrough, real-data runs;
  whatever proves the *phase's exit condition* as a whole. Its results are
  recorded as evidence in the phase audit (`docs/audits/`).

Two gates because one can't do both jobs: a gate fast enough to run on every
task is too shallow to prove a whole phase works end to end, and a gate
thorough enough to prove a phase is too slow to run per-task — it would get
skipped, and a gate that gets skipped protects nothing.

## When the agent must stop and wait for a human

Loop engineering does not mean the agent never talks to the human — it means
the human's input is reserved for decisions that are actually theirs to make.
Stop and wait when:

- **The roadmap is exhausted.** No active phase, nothing under "Authorized
  Phases" in `ROADMAP.md`. (An empty *task queue* alone is not this — that
  just returns to the phase loop.)
- **An inbox item needs a human decision** — it proposes a new phase, a
  danger-based reordering, or a direction change the written docs can't
  settle.
- **Authorizing new phase-sized work.** The agent may *propose* a phase under
  "Proposed — Not Yet Authorized" in `ROADMAP.md`, with a suggested goal and
  exit condition, but a human moves it into the authorized queue.
- **The action is destructive, irreversible, or touches production/secrets/
  money/access control**, regardless of what's written anywhere.
  Written authorization for *what* to build is not authorization to skip
  the judgment calls this framework's own house rules require confirming.
- **Two canonical docs disagree** and the phase loop can't resolve it from
  the charter, or the task requires a genuine product/business call no
  canonical doc answers.
- **Priority or phase order itself is ambiguous** — e.g., two blockers seem
  equally dangerous. Reordering on a real safety judgment call is a human
  decision; reordering because item #2 looked more fun is not something the
  agent should ever do.

Everything else — implementing the top priority item, fixing a bug that
blocks it, decomposing an authorized phase into tasks, updating status docs
to reflect reality, writing tests — is already authorized by the fact that
it's written down. Do it without asking.

## Why this scales as the project grows

A small project can survive on chat memory and vibes. A large one can't: the
context window can't hold the whole history, the human can't re-explain
intent every session, and "ask me before doing anything" turns into a
bottleneck that makes the agent slower than doing it by hand. Because
direction, state, priority, and history live in specific files with specific
shapes instead of in conversation, a fresh agent session (or a different
agent entirely) can pick up exactly where the last one left off by reading a
bounded set of files — not by reading the whole project history. And because
steering happens through `INBOX.md` instead of live chat, the human can
drop a correction at 9am and review the receipt-diff at noon — the loop
doesn't block on their presence, and their input doesn't get lost in a
scrollback. That's the actual point of this repo: make "the agent forgot the
context" a non-event, because the context was never only in its head.

## What's in this repo

- [`README.md`](README.md) / [`README.zh-TW.md`](README.zh-TW.md) — what this
  repo is and how to adopt it into a new project (English / 繁體中文).
- [`INIT_CHECKLIST.md`](INIT_CHECKLIST.md) /
  [`INIT_CHECKLIST.zh-TW.md`](INIT_CHECKLIST.zh-TW.md) — the order to fill in
  the templates when bootstrapping a new project from this scaffold.
- [`BOOTSTRAP.md`](BOOTSTRAP.md) / [`BOOTSTRAP.zh-TW.md`](BOOTSTRAP.zh-TW.md)
  — the interview alternative to the checklist: an agent asks what it can't
  infer from your pasted idea, drafts every canonical file, and waits for
  one explicit written authorization before any loop starts.
- [`CLAUDE.md`](CLAUDE.md) / [`AGENTS.md`](AGENTS.md) — agent entry points.
  Keep both in sync; different tools read different files.
- [`ROADMAP.md`](ROADMAP.md) — the pre-authorized phase queue the phase loop
  plans from.
- [`PRIORITIES.md`](PRIORITIES.md) — the task-level priority queue contract.
- [`INBOX.md`](INBOX.md) — the human checkpoint mailbox. Ships ready to use
  (no `TEMPLATE:` markers); just leave it empty until you have something to
  say to a running loop.
- [`FRAMEWORK_FEEDBACK.md`](FRAMEWORK_FEEDBACK.md) — append-only flight
  recorder for defects in the framework itself, harvested upstream to
  loop-engine at phase close. Ships ready to use; empty is its normal
  state.
- [`CHANGELOG.md`](CHANGELOG.md) — history.
- [`docs/`](docs/README.md) — canonical direction and current-state docs, plus
  `docs/audits/` for phase-completion evidence.
- [`scripts/check-templates.sh`](scripts/check-templates.sh) /
  [`.ps1`](scripts/check-templates.ps1) — finds leftover `TEMPLATE:` markers
  so you can tell what's actually been filled in.
- [`examples/linkcheck/`](examples/linkcheck/) — a complete, fully-filled-in
  instance of every template in this repo, for a small hypothetical CLI
  tool. Read it alongside a template when the abstract version isn't enough.

Every template file below contains `TEMPLATE:` comments marking what to fill
in and what to delete once filled in. Delete the `TEMPLATE:` comments
themselves as you go — a template comment left in a doc that's supposedly
"the source of truth" is a sign the doc hasn't actually been filled in yet.
Run `scripts/check-templates.sh` to find every remaining one at once instead
of hunting by eye.
