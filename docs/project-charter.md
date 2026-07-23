# Project Charter

## Mission

Progressor 是一個**個人化的生活排程系統（personal life-scheduling
system）**：把長期進行中的追蹤項目（書籍依章節、線上課程依影片切分）、週期性
常規事件（gym、家教…）、學期驅動的固定事務與期限任務（上課、會議、報告、作業、
小考、考試），以及臨時事件（突然的朋友聚會），全部餵給一個排程引擎，產生並持續
更新一份「這一週該做什麼」的課表（weekly timetable）。目標使用者是專案擁有者
本人（single user），核心價值是**兩件事同時成立**：排程要盡量貼近使用者設定的
優先序與時段偏好（如「gym 偏好早上」），而且要**保有彈性（elastic）**——臨時
變動（跳過今天的閱讀、插入一場聚會）只需要局部修正，不需要整份課表重建，也不能
讓系統「壞掉」。

Progressor **不是**：

- 不是多人協作或團隊行事曆工具——單一使用者，沒有共享/權限模型。
- 不是通用的專案管理工具——它的核心物件是「書籍/課程的進度」與「時間排程」，
  不是任意的看板卡片或工單。
- Phase 1（見 `../ROADMAP.md`）**不包含**自動排程演算法——先把資料層與手動
  週視圖做對，排程引擎是後續 phase 的工作，見 `system-direction.md`。

## Core Areas

### Item Tracking（追蹤項目管理）

管理兩種可追蹤項目：Book（書籍，依 Chapter／章節切分）與 Course（線上課程，
依 Video／單元切分）。每個項目要能記錄總單元數、預估完成天數、使用者指定的
優先度（priority）、目前進度（完成到第幾個單元）、狀態（未開始／進行中／
暫停／完成）。必須支援 WIP Limit（同時進行上限）：書籍與課程各自有可設定的
「最多同時進行幾本／幾門」上限，超過上限不可再標記新項目為進行中。

### Routine & Commitment Management（常規與學期事務管理）

管理兩類非臨時性的時間承諾：

- **Routine（常規事件）**：daily／weekly／monthly 週期性事件，例如「每週一
  練胸、週二練手臂與背、週三練腿」的健身課表，或每週固定的家教。
- **Semester Commitment（學期事務）**：學期開始後出現的事務，再分兩種——
  **Fixed Commitment**（固定時段，不可移動，如每週上課、每週會議）與
  **Deadline Task**（有截止時間但完成前的時段可彈性安排，如作業、小考／考試
  準備、報告撰寫）。

### Preference & Constraint Capture（偏好與條件設定）

記錄使用者層級或分類層級的時段偏好（例如「gym 偏好早上」、「某類工作偏好晚上」）、
WIP Limit、以及書籍／課程／deadline task 之間的優先度設定。這些是排程引擎的
輸入條件，不是排程引擎本身。

### Auto-Scheduling Engine（自動排程引擎，Phase 2 起）

把 Item Tracking、Routine & Commitment、Preference & Constraint 的所有輸入
整合，產生一週的課表，並在事情發生變化時（使用者手動改動、提早完成、臨時事件
插入）快速局部修正而不需整份重排。這是 Phase 1 之後才啟用的核心區域——Phase 1
的課表是使用者手動排的，見 `../ROADMAP.md`。

### Schedule View / Export（課表檢視）

呈現「這一週 / 下一週」的課表視圖，讓使用者能快速看懂、快速手動覆寫任何一個
時段而不破壞其他時段。匯出到外部行事曆（如 ICS／Google Calendar）目前只是
`../ROADMAP.md` 中的 Proposed 項目，尚未授權。

## Guardrails

- **不遺失已追蹤的進度或歷史紀錄。** 章節/影片完成紀錄、已排定過的課表歷史，
  絕不因為排程重算、系統錯誤或使用者操作而憑空消失。
- **不悄悄丟掉固定期限事務。** 考試、上課、會議、作業截止日等 Fixed
  Commitment／Deadline Task，若排程引擎排不進去，必須明確標示為衝突並呈現給
  使用者，絕不能默默從課表上消失。
- **使用者永遠可以覆寫任一時段，且覆寫不能讓系統壞掉。** 手動改掉一個時段是
  局部操作，不需要、也不能強迫使用者重建整份課表；系統要能吸收這個改動繼續
  運作（見 `system-direction.md` 的 Slack / Elasticity 設計）。
- **臨時事件永遠贏過彈性可移動的閱讀／學習時間。** 使用者說「我現在要出門見
  朋友」時，排程引擎要能把受影響的彈性項目（書籍/課程進度）重新安排到其他
  時段，而不是要求使用者手動清空重排。

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

If a decision isn't answered by any doc listed here, that's a signal to stop
and ask a human rather than infer — see `../.loop-engine/LOOP_ENGINEERING.md`.
