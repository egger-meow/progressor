# Init Checklist

Order matters here: each step needs the ones before it to be real (not
template placeholders) before it can be filled in honestly. Read
[`LOOP_ENGINEERING.md`](LOOP_ENGINEERING.md) first if you haven't — this
checklist is just the mechanical sequence; that doc is why the sequence is
this way.

**Don't want to walk this by hand?** [`BOOTSTRAP.md`](BOOTSTRAP.md) runs
this same checklist as an agent-led interview: you paste your project idea,
answer one batch of questions, and read one short authorization summary —
the agent types everything else. This checklist remains the spec either
way; bootstrap follows it step by step rather than bypassing it.

Work through this with the human who owns the project — steps 1-4 require
their judgment, not an agent's guess. An agent can draft them, but a human
should confirm before they're treated as authorized.

Keep [`examples/linkcheck/`](examples/linkcheck/) open in another tab as you
go — it's a complete filled-in instance of every file this checklist asks
you to write, so you have a concrete model for each step instead of just the
abstract template.

**Before step 1:** if you copied loop-engine's own `README.md` (or
`zh-TW/README.md`) into your project, replace them with your project's
actual README — they describe loop-engine, not your project, and don't get
templated like the files below. `INBOX.md` is the opposite case: it ships
ready to use with nothing to fill in — leave it as-is (and empty). So does
`FRAMEWORK_FEEDBACK.md` — empty until the framework itself gives you
something to report.

- [ ] **1. `../docs/project-charter.md`** — Mission, core areas, guardrails.
      This is the highest-authority doc; everything else should trace back
      to it. If you can't fill this in confidently yet, the project isn't
      ready for autonomous looping — spend more time here, not less.
- [ ] **2. `../docs/domain-model.md`** — Name the core concepts from the
      charter's "Core Areas." Do this before writing any other doc in
      detail, so later docs use consistent vocabulary from the start instead
      of needing a rename pass.
- [ ] **3. `../docs/system-direction.md`** — Target architecture, in enough
      detail to guide real decisions. Can be sparse for a brand-new project
      (there's no "current fit" gap yet); should be substantive for an
      existing codebase being retrofitted with this framework.
- [ ] **4. `../ROADMAP.md`** — The pre-authorized phase queue. Write at least
      the first phase (name, goal, exit condition) under "Authorized
      Phases"; park bigger ideas under "Proposed — Not Yet Authorized."
      Exit conditions are the step people write too vaguely — "X works
      well" never closes; write them like acceptance gates. This is where
      the human's authorization is actually spent, so it's a human decision
      with agent drafting help, same as the charter.
- [ ] **5. `../docs/status.md`** — For a new project, this starts nearly empty
      plus a defined **task gate** command; add the **phase gate** (the
      expensive end-to-end checks that close a phase) once the first
      phase's exit condition makes clear what it must prove. For an
      existing codebase, this is also where you do the honest, detailed
      accounting of what actually works today — the more accurate this is
      now, the less the agent will waste time rediscovering it.
- [ ] **6. `../docs/build-status.md`** — The coarse table version of step 5,
      one row per core area from the charter. Seed the Verification Evidence
      log with today's date and whatever's already been verified.
- [ ] **7. `../docs/release.md`** — Versioning scheme and checklist. Can be
      minimal for a pre-release project; still worth having so the shape
      exists before it's needed under time pressure.
- [ ] **8. `../CLAUDE.md` and `../AGENTS.md`** — Fill in commands, structure, and
      conventions. These reference the docs above rather than duplicating
      them — resist the urge to copy content in instead of linking.
- [ ] **9. `../PRIORITIES.md`** — Write "What Counts as a Blocker" for this
      project first (this is the step people are tempted to skip or leave
      generic — don't; a vague blocker definition produces a priority queue
      an agent can't reliably reason about). Then activate `../ROADMAP.md`'s
      first phase and decompose it into "Current Priorities" — real items,
      most urgent first, each with a stated "done means."
- [ ] **10. Delete every remaining `TEMPLATE:` comment.** Run
      `.loop-engine/scripts/check-templates.sh` (or `check-templates.ps1` on
      Windows) from the repo root instead of grepping by hand — it lists
      every file and line still carrying a `TEMPLATE:` marker and exits
      nonzero if any remain. A doc with a `TEMPLATE:` comment still in it is
      not yet a source of truth — treat it as "not written" until the
      comment is gone. (`../docs/audits/TEMPLATE.md` is excluded from the
      scan on purpose — it's meant to stay a blank template forever; see
      `../docs/audits/README.md`. So are `BOOTSTRAP.md` and its
      `zh-TW/BOOTSTRAP.md` sibling, which quote the bootstrap authorization
      marker verbatim as an instruction.)
- [ ] **11. Do one real loop.** Take the first `../PRIORITIES.md` item through
      the full task loop in `LOOP_ENGINEERING.md` — implement, verify via
      the task gate from `../docs/status.md`, update status docs, retire the
      priority item, log the changelog entry. Drop a small note in
      `../INBOX.md` mid-loop and confirm the agent translates and clears it
      per protocol. This surfaces any gap in the docs above (missing
      context, an undefined gate, an ambiguous blocker definition) while
      it's cheap to fix, before relying on the framework for real
      autonomous work.

Once step 11 is done, an agent working in this repo should be able to start
a fresh session, read `../AGENTS.md`/`../CLAUDE.md`, and correctly identify
what to work on next without you re-explaining anything from this
conversation — and you should be able to steer it mid-run by writing to
`../INBOX.md` instead of interrupting it in chat.
