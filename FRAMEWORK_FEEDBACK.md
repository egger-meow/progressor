# Framework Feedback

The flight recorder for the scaffold itself. When the *framework* — the
loop files, rules, and procedures this project copied from
[loop-engine](https://github.com/egger-meow/loop-engine) — misleads you,
wastes tokens, or contradicts itself, append a short entry here and keep
working. This is how defects discovered in real downstream use find their
way back upstream.

This file is about the framework, never the project: a bug in the code
goes to `PRIORITIES.md` or `INBOX.md`; a defect in *how the loops are run*
goes here.

Ships ready to use — nothing to fill in. Empty is the normal state of a
framework that's working.

## Protocol

**Agent — when to append.** Any of these, at the moment it happens:

- you got lost or had to guess despite following the docs;
- a framework rule forced obvious token waste;
- two canonical rules contradicted each other;
- a gate or procedure didn't fit and needed a workaround;
- the human had to intervene where the framework promised autonomy.

**Humans may append too.** Same format, same rules. Framework friction the
human notices doesn't need to route through `INBOX.md` — entries here are
reports, not instructions, so they never trigger work.

**Entry format** — hard cap ~6 lines, any language, appended under
"Entries" below (newest last):

```
### <date> — <one-line title>
- Where: <task loop step / phase gate / bootstrap stage / …>
- What happened: <one or two lines>
- Framework file/rule: <e.g. LOOP_ENGINEERING.md, "Reading discipline">
- Suggested change (optional): <one line>
```

**Hard rules:**

1. **Append-only; write-only during loops.** This file is history-class
   (see `LOOP_ENGINEERING.md`, "Reading discipline"): append your entry
   without reading the ones before it, and never open this file for
   routine context. Duplicates are fine — they're evidence of frequency
   and get merged at harvest.
2. **Nothing here licenses work.** Record and move on. This is not a
   second inbox and not a backlog; an entry is never a reason to "fix the
   framework" in this repo mid-loop.
3. **Harvest is human-triggered.** At phase close, the audit's Follow-Up
   step reminds the human if this file gained entries. The agent may draft
   the upstream issue text (or `gh issue create` commands) against the
   loop-engine repo, but the human files them — publishing to an external
   repo is theirs to fire.
4. **Receipts are appended, never edited in.** After a harvest, add one
   line at the end of "Entries" —
   `> Harvested through "<last entry title>" — filed upstream as <links>, <date>.`
   — and leave the entries themselves untouched.

---

## Entries

_(none yet)_
