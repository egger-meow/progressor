# Examples

[`linkcheck/`](linkcheck/) is a complete, fully-filled-in instance of the
loop-engine scaffold for a small hypothetical CLI tool. Every `TEMPLATE:`
comment from the root scaffold has been replaced with real content — no
placeholders remain (`../scripts/check-templates.sh examples/linkcheck`
reports clean).

It exists to answer "what does a *filled-in* version of this actually look
like," which is hard to picture from templates alone. Read it alongside
[`../INIT_CHECKLIST.md`](../INIT_CHECKLIST.md): each file in `linkcheck/`
corresponds 1:1 to a step in that checklist.

linkcheck itself isn't a real, working tool — it's a plausible small CLI
(scans a docs tree for broken markdown links, with an opt-in autofix mode)
invented specifically to have interesting-enough guardrails, a real blocker
definition, and one completed build phase worth auditing, without needing a
proprietary or unrelated real codebase as the example.

Two files are shown in states worth noticing: `linkcheck/INBOX.md` is
empty — that *is* its filled-in state (the inbox is a mailbox, empty at
rest) — and `linkcheck/ROADMAP.md` shows all three sections populated at
once (an active phase, an authorized next phase, and unauthorized
proposals), which is what a mid-flight project looks like.

Do not copy `linkcheck/`'s *content* into your project — copy its *shape*.
Your charter, domain model, and priorities should reflect your actual
project, not a docs-link-checker's.
