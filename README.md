# Progressor

一個個人化的生活排程系統：把正在讀的書（依章節）、正在上的線上課程（依影片）、
每週的健身/家教等常規事件、學期開始後的固定課程與作業/考試截止日、以及臨時的
朋友聚會，通通變成一份持續更新、有彈性、不會因為臨時變動就整個壞掉的每週課表。

## Status

Bootstrap 剛完成——目前沒有任何程式碼，只有規劃文件。專案用
[`LOOP_ENGINEERING.md`](LOOP_ENGINEERING.md) 這套 loop-engineering 框架管理
方向與優先序：人類在書面文件裡一次性授權，agent 依照 `PRIORITIES.md` /
`ROADMAP.md` 自主推進，不用每一步都問。

想知道現在做到哪、下一步是什麼，看：

- [`docs/project-charter.md`](docs/project-charter.md) — mission、核心
  範疇、guardrails。
- [`docs/domain-model.md`](docs/domain-model.md) — 這個專案裡每個概念的
  正典名稱。
- [`ROADMAP.md`](ROADMAP.md) — 目前授權的 phase（Phase 1：資料層 + 手動
  週視圖）。
- [`PRIORITIES.md`](PRIORITIES.md) — Phase 1 拆解出來的具體任務佇列。
- [`docs/status.md`](docs/status.md) — 現在實際存在、能動的行為。

## For agents

If you're an agent picking this repo up: read [`CLAUDE.md`](CLAUDE.md) or
[`AGENTS.md`](AGENTS.md) first — they point at everything else in the
correct reading order, including [`INBOX.md`](INBOX.md) (check it before any
new work) and the full loop procedure in
[`LOOP_ENGINEERING.md`](LOOP_ENGINEERING.md).
