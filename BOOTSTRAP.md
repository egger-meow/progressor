# Bootstrap: from one pasted idea to running loops

This is the interview path into loop-engine. Instead of filling in
[`INIT_CHECKLIST.md`](INIT_CHECKLIST.md)'s eleven steps by hand, you paste
your project idea into an agent; the agent asks you what it can't infer,
drafts every canonical file, and stops for one explicit written approval
before any loop starts. The checklist stays the spec — this file is a
front-end over it, not a shortcut around it: everything the checklist
requires still gets written, just not by you.

Two audiences, two sections. **Humans:** the next section is your entire
job — you never need to read past it. **Agents:** your procedure starts at
"Agent procedure"; follow it exactly.

## Human: your whole job

1. **Get the files.** Create a new, empty repo for your project and copy
   loop-engine's contents into it ("Use this template" on GitHub if
   enabled, or copy by hand). Don't fork — your project isn't a derivative
   of loop-engine.
2. **Paste this to your agent**, opened inside the new repo:

   > Read `BOOTSTRAP.md` and follow its agent procedure. My project idea:
   > *(your idea — a paragraph or a page, messy is fine, any language)*

3. **Answer the questions.** They arrive in one batch, grouped by which
   file each answer unblocks. "I don't know" is a valid answer — the agent
   will propose a default and flag it as its own guess later.
4. **Read the authorization summary and approve it in writing.** The agent
   shows you a short summary — mission, first phase and its exit
   condition, the guardrails, the gate command. This is the only thing you
   must actually read. Fix anything wrong, then say explicitly:
   **"I authorize this."** Nothing loops before you do.
5. **Watch the first loop (recommended).** While the agent runs its first
   real task, drop a small note into `INBOX.md` and confirm it gets
   translated and cleared — that file is how you'll steer from now on.

You're needed at exactly two moments: step 3 and step 4. Everything else
is the agent's work. Afterward,
[`LOOP_ENGINEERING.md`](LOOP_ENGINEERING.md)'s loops take over:
`ROADMAP.md` is where you spend authorization, `INBOX.md` is how you
steer.

## Agent procedure

You may arrive here two ways: the human pasted the prompt above, or your
entry-point file (`CLAUDE.md` / `AGENTS.md`) routed you here because the
repo still carries `TEMPLATE:` markers. The procedure is identical either
way — and if the human already described their project in chat, that
description **is** the Stage 1 idea dump; don't ask them to restate it in
any particular format.

Follow the stages in order; each names its exit condition, and no stage
starts before the previous one's exit condition holds. If you enter a repo
mid-bootstrap (dead session, human walked away), don't guess where you are
— use "Locating yourself" below.

### Stage 0 — Orient

Read [`LOOP_ENGINEERING.md`](LOOP_ENGINEERING.md) fully, then
[`INIT_CHECKLIST.md`](INIT_CHECKLIST.md); skim
[`examples/linkcheck/`](examples/linkcheck/) as the filled-in model. The
checklist is the spec of what information must exist before looping is
safe; this procedure only changes who types it. Don't skip this stage to
look fast — every question you ask in Stage 2 must be justified by a
checklist step needing that information.

**Exit:** you can say, for each checklist step 1–9, what information it
needs.

### Stage 1 — Gap analysis

Read the human's idea dump against checklist steps 1–9 and sort every
piece of needed information into:

- **Answered** — the dump already says it. Never re-ask these; re-asking
  tells the human their dump wasn't read.
- **Inferable** — a reasonable default exists; you'll use it and flag it
  in the Stage 4 summary as your guess.
- **Must ask** — a human value judgment you can't safely default:
  typically the guardrails ("what must this system never do"), the first
  phase's scope and exit condition, priorities among competing goals,
  platform/stack when genuinely open, and what counts as a blocker.

**Exit:** a three-way sort (scratch notes, not committed).

### Stage 2 — Interview, one batch

Ask everything in **one batch, in chat**, grouped by the file each answer
unblocks. Rules:

- Hard cap of ~10 questions; needing more means your "Inferable" bucket is
  too small. Mark which questions are critical and which merely refine a
  default.
- Ask in the human's language.
- "I don't know" or no answer on a non-critical question → use your
  default and flag it later.
- Two questions to always include unless the dump already answers them:
  **what language should the filled-in docs be written in**, and **what
  must this system never do** — the dump almost never states guardrails,
  and they're the highest-authority content in the repo.
- Chat is transport, files are truth: answers get translated directly into
  the Stage 3 drafts. Do **not** create an interview-notes file — the
  filled-in docs are the record of the answers.

**Exit:** every "Must ask" item has an answer or an explicit
default-plus-flag.

### Stage 3 — Draft everything

Fill the files in checklist order, steps 1–9 (charter → domain model →
system direction → roadmap → status → build-status → release → agent
entry points → priorities), exactly as the checklist describes each. Also
honor its "Before step 1" note: replace loop-engine's own `README.md` /
`README.zh-TW.md` with a short, real README for this project.

Marker rules:

- Delete every `TEMPLATE:` marker you fill past — same as checklist
  step 10 —
- **except one that you add**: at the top of `ROADMAP.md`, place

  ```
  <!-- TEMPLATE: BOOTSTRAP — drafted by agent, awaiting human authorization.
  No phase in this file licenses any work while this marker exists. -->
  ```

Run `./scripts/check-templates.sh` (or `.ps1`): the **only** remaining hit
must be that marker. (This file's own quotation of the marker doesn't
count — `BOOTSTRAP.md` and its `.zh-TW` sibling are excluded from the scan
by design, like `docs/audits/TEMPLATE.md`.) Commit the whole draft as one
commit, e.g. `bootstrap: draft all canonical docs, awaiting authorization`.

**Exit:** check-templates reports exactly the one authorization marker.

### Stage 4 — Authorization

Present to the human, in chat, a summary short enough to actually get read
— about five sentences, not a file listing:

1. the mission, in one line;
2. phase 1's goal and exit condition, verbatim from `ROADMAP.md`;
3. the guardrails, verbatim from the charter;
4. the task gate command;
5. every place you used a default instead of an answer, flagged as such.

Then wait. Enthusiasm ("cool!", "looks great") is not authorization;
silence is not authorization; only explicit approval ("I authorize this"
or equally unambiguous words) is. If the human edits anything, apply the
edit and re-present the changed lines.

On approval: delete the marker from `ROADMAP.md` and commit that deletion
by itself, e.g. `bootstrap: authorized by <name>, <date>`. **That diff is
the authorization receipt** — the same receipt-in-git pattern as
`INBOX.md`.

**Exit:** check-templates exits 0; the receipt commit exists.

### Stage 5 — First loop and handoff

Run checklist step 11: take the top `PRIORITIES.md` item through one full
task loop from `LOOP_ENGINEERING.md` — implement, task gate, status
update, retire the item, changelog entry. Invite the human to drop a note
into `INBOX.md` mid-loop and process it per protocol, so the steering
channel is proven before it's relied on.

Bootstrap is then over and this file has nothing further to say —
`LOOP_ENGINEERING.md` governs from here, and the project may delete
`BOOTSTRAP.md` (and `BOOTSTRAP.zh-TW.md`) whenever it likes.

## Locating yourself

Repo state alone tells any agent — fresh session, different tool, months
later — exactly where bootstrap stands. Run
`./scripts/check-templates.sh`, then check `ROADMAP.md`:

| Repo state | Stage | Do |
| --- | --- | --- |
| `TEMPLATE:` markers across `docs/`, `PRIORITIES.md`, etc. | ≤ 3 | If the interview answers died with the session, re-run Stages 1–2 **only for what's still unfilled** — filled files already encode their answers. |
| Only the `BOOTSTRAP —` marker in `ROADMAP.md` remains | 4 | Re-present the summary; wait for explicit approval. Never delete the marker without it. |
| check-templates exits 0 and `PRIORITIES.md` has items | Done | Stop reading this file; follow `LOOP_ENGINEERING.md`. |
| check-templates exits 0 but `PRIORITIES.md` is empty | — | Something nonstandard happened. Don't guess — ask the human. |

## What bootstrap never changes

- **The agent writes 100%; the human decides 100%.** The interview and the
  summary move the *typing* to the agent — never the judgment. A bootstrap
  whose human didn't actually read the summary reproduces rubber-stamping
  with extra steps, the exact failure this framework exists to end.
- **`ROADMAP.md`'s write rules resume in full after Stage 4.** Drafting
  phases was licensed only by the bootstrap marker; once it's gone,
  adding, reordering, and promoting phases are human-only again, forever.
- **No loop starts while the marker exists.** Not even "one small task
  first" — nothing.
