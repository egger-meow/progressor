# Bootstrap:從一段貼上的想法,到跑起來的迴圈

這是進入 loop-engine 的訪談路線。你不用親手填完
[`INIT_CHECKLIST.zh-TW.md`](INIT_CHECKLIST.zh-TW.md) 的十一個步驟,而是把你
的專案想法貼給 agent;agent 會問你它推斷不出來的東西、起草每一份正典檔案,
然後在任何迴圈開始之前,停下來等你一次明確的書面批准。清單仍然是規格——這份
檔案是它前面的一層介面,不是繞過它的捷徑:清單要求的每樣東西都還是會被寫出
來,只是不必由你來打字。

兩種讀者,兩個區塊。**人類:** 下一節就是你的全部工作——後面的內容你永遠不
需要讀。**Agent:** 你的程序從「Agent 程序」開始;照著一步一步執行。

## 人類:你的全部工作

1. **拿到檔案。** 為你的專案開一個全新的空 repo,把 loop-engine 的內容複製進
   去(GitHub 上若有啟用就按「Use this template」,不然手動複製)。不要用
   fork——你的專案不是 loop-engine 的衍生品。
2. **把這段話貼給 agent**(在新 repo 裡開啟):

   > 讀 `BOOTSTRAP.md` 並照它的 agent 程序執行。我的專案想法:
   > *(你的想法——一段話或一整頁都行,寫得亂沒關係,任何語言都可以)*

3. **回答問題。** 問題會一次一批送到,依照每個答案解鎖哪份檔案來分組。「我不
   知道」是合法的答案——agent 會提出一個預設值,並在之後標明那是它自己的猜
   測。
4. **讀授權摘要,並以書面批准。** Agent 會給你一份很短的摘要——使命、第一個
   phase 和它的退場條件、護欄、關卡指令。這是你唯一真的必須讀的東西。把不對
   的地方改掉,然後明確地說:**「我授權這份內容。」** 在你說之前,什麼迴圈都
   不會開始。
5. **看著第一圈跑完(建議)。** Agent 執行第一個真實任務時,往 `INBOX.md` 丟
   一句小備註,確認它被翻譯並清空——之後你就是靠這個檔案轉向的。

整個過程你只在兩個時刻被需要:第 3 步和第 4 步。其他都是 agent 的工作。之後
就由 [`LOOP_ENGINEERING.zh-TW.md`](LOOP_ENGINEERING.zh-TW.md) 的兩層迴圈接
手:`ROADMAP.md` 是你花授權的地方,`INBOX.md` 是你轉向的地方。

## Agent 程序

你可能經由兩條路抵達這裡:人類貼了上面的提示,或是你的入口檔案
(`CLAUDE.md` / `AGENTS.md`)因為 repo 還帶著 `TEMPLATE:` 標記而把你導到這
裡。無論哪條路,程序完全相同——而且如果人類已經在聊天裡描述過他們的專案,
那段描述**就是** Stage 1 的想法傾倒;不要要求他們用任何特定格式重講一次。

依序執行各階段;每個階段都寫明退場條件,前一階段的退場條件不成立,就不能開
始下一階段。如果你是在 bootstrap 進行到一半時進入這個 repo(session 死了、
人類走開了),不要用猜的——用下面的「定位自己」。

### Stage 0 — 定向

完整讀完 [`LOOP_ENGINEERING.md`](LOOP_ENGINEERING.md),再讀
[`INIT_CHECKLIST.md`](INIT_CHECKLIST.md);把
[`examples/linkcheck/`](examples/linkcheck/) 當填好的範本掃過一遍。清單是
「迴圈能安全運轉之前,哪些資訊必須存在」的規格;這套程序只改變由誰來打字。
不要為了顯得快而跳過這一階段——你在 Stage 2 問的每一個問題,都必須有某個清
單步驟需要那項資訊來背書。

**退場條件:** 你能對清單第 1–9 步的每一步,說出它需要哪些資訊。

### Stage 1 — 缺口分析

把人類的想法傾倒對照清單第 1–9 步,把每一項所需資訊分成三類:

- **已回答**——傾倒裡已經說了。絕不重問這些;重問等於告訴人類他寫的東西沒
  被讀。
- **可推斷**——存在合理的預設值;你會採用它,並在 Stage 4 的摘要裡標明那是
  你的猜測。
- **必須問**——你無法安全預設的人類價值判斷:通常是護欄(「這個系統絕對不
  能做什麼」)、第一個 phase 的範圍與退場條件、互相競爭的目標之間的優先序、
  真正懸而未決的平台/技術棧,以及什麼算 blocker。

**退場條件:** 一份三分類的整理(草稿即可,不用 commit)。

### Stage 2 — 訪談,一次一批

**在聊天裡、一批問完**所有問題,依照每個答案解鎖哪份檔案分組。規則:

- 硬上限約 10 題;需要更多,代表你的「可推斷」那一類分太少了。標明哪些題是
  關鍵、哪些只是在微調預設值。
- 用人類的語言發問。
- 非關鍵題收到「我不知道」或沒有回答 → 採用你的預設值,之後標明。
- 除非傾倒已經回答,否則永遠要包含兩題:**填好的文件要用什麼語言寫**,以及
  **這個系統絕對不能做什麼**——傾倒幾乎從不主動說出護欄,而護欄是整個 repo
  裡權威最高的內容。
- 聊天是傳輸,檔案是真相:答案在 Stage 3 直接被翻譯進草稿。**不要**建立訪談
  筆記檔——填好的文件本身就是答案的紀錄。

**退場條件:** 每一個「必須問」的項目,都有答案,或有明確的「預設值+標
明」。

### Stage 3 — 起草一切

依清單順序填寫檔案,第 1–9 步(charter → domain model → system direction →
roadmap → status → build-status → release → agent 入口 → priorities),每一
份都完全照清單的描述來。也要遵守它的「在第 1 步之前」備註:把 loop-engine
自己的 `README.md` / `README.zh-TW.md` 換成這個專案自己的、簡短而真實的
README。

標記規則:

- 你填過的每一個 `TEMPLATE:` 標記都要刪掉——跟清單第 10 步一樣——
- **除了一個由你新增的**:在 `ROADMAP.md` 最上方,放上

  ```
  <!-- TEMPLATE: BOOTSTRAP — drafted by agent, awaiting human authorization.
  No phase in this file licenses any work while this marker exists. -->
  ```

執行 `./scripts/check-templates.sh`(或 `.ps1`):**唯一**剩下的命中必須就
是那個標記。(這份檔案自己引用的標記不算——`BOOTSTRAP.md` 和它的 `.zh-TW`
版本依設計被排除在掃描之外,就像 `docs/audits/TEMPLATE.md` 一樣。)把整份
草稿做成一個 commit,例如
`bootstrap: draft all canonical docs, awaiting authorization`。

**退場條件:** check-templates 回報的恰好只有那一個授權標記。

### Stage 4 — 授權

在聊天裡給人類一份短到真的會被讀完的摘要——大約五句話,不是檔案清單:

1. 使命,一行;
2. phase 1 的目標與退場條件,逐字取自 `ROADMAP.md`;
3. 護欄,逐字取自 charter;
4. task gate 指令;
5. 每一個你用了預設值而不是答案的地方,明確標出。

然後等。熱情(「讚!」「看起來很棒」)不是授權;沉默不是授權;只有明確的批
准(「我授權這份內容」或同樣不含糊的話)才是。人類改了任何東西,就套用修改
並重新呈現改動的那幾行。

批准之後:把 `ROADMAP.md` 裡的標記刪掉,並讓這個刪除單獨成為一個 commit,
例如 `bootstrap: authorized by <name>, <date>`。**那個 diff 就是授權回執**
——跟 `INBOX.md` 一樣的「回執進 git」模式。

**退場條件:** check-templates 以 0 結束;回執 commit 存在。

### Stage 5 — 第一圈與交接

執行清單第 11 步:把 `PRIORITIES.md` 第一項帶著走完
`LOOP_ENGINEERING.md` 裡完整的一圈 task loop——實作、task gate、更新現況、
移除項目、記 changelog。邀請人類在中途往 `INBOX.md` 丟一句話,並照協議處理
它,讓轉向通道在被依賴之前先被證明有效。

至此 bootstrap 結束,這份檔案再無話可說——之後由 `LOOP_ENGINEERING.md` 治
理,專案隨時可以刪掉 `BOOTSTRAP.md`(和 `BOOTSTRAP.zh-TW.md`)。

## 定位自己

單憑 repo 的狀態,任何 agent——新 session、不同工具、幾個月後——都能準確
知道 bootstrap 走到哪裡。執行 `./scripts/check-templates.sh`,再看
`ROADMAP.md`:

| Repo 狀態 | 階段 | 動作 |
| --- | --- | --- |
| `docs/`、`PRIORITIES.md` 等處還有 `TEMPLATE:` 標記 | ≤ 3 | 如果訪談答案隨著死掉的 session 消失了,**只針對還沒填的部分**重跑 Stage 1–2——填好的檔案已經內含它們的答案。 |
| 只剩 `ROADMAP.md` 裡的 `BOOTSTRAP —` 標記 | 4 | 重新呈現摘要;等明確批准。沒有批准,永遠不刪標記。 |
| check-templates 以 0 結束,且 `PRIORITIES.md` 有項目 | 完成 | 別再讀這份檔案;照 `LOOP_ENGINEERING.md` 走。 |
| check-templates 以 0 結束,但 `PRIORITIES.md` 是空的 | — | 發生了非標準的事。不要猜——問人類。 |

## Bootstrap 永遠不改變的事

- **Agent 寫 100%;人類決定 100%。** 訪談和摘要移轉的是*打字*,永遠不是判
  斷。一場人類沒有真的讀過摘要的 bootstrap,只是用更多步驟重演了蓋章文化—
  —正是這套框架存在要終結的那個失敗。
- **Stage 4 之後,`ROADMAP.md` 的寫入規則完整恢復。** 起草 phase 的權限只來
  自 bootstrap 標記;標記一消失,新增、重排、升格 phase 就永遠回到人類專
  屬。
- **標記還在,就沒有任何迴圈開始。** 連「先做一個小任務」都不行——什麼都不
  行。

（本檔案是 [`BOOTSTRAP.md`](BOOTSTRAP.md) 的繁體中文版,兩者應保持內容一
致;若有出入,以英文版為準。）
