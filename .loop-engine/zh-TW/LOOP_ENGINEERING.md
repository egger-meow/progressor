# 迴圈工程(Loop Engineering)

這份文件是本 repo 的概念指南。請先完整讀過一次,再開始填寫任何模板。這個
repo 裡的其他所有東西,都是下面這些想法的具體實作。

## 這個 repo 要解決的問題

跟 AI coding agent 合作的預設模式是這樣的:agent 提案,人類說「好」或
「ok」,agent 執行,重複。這個迴圈感覺很有生產力,但大部分「yes/ok」的往返
不帶任何資訊——人類蓋章只是因為每次重新解釋完整脈絡,比直接批准更貴。專案越
大越糟:表面積更大、決策更多、agent 偏離原意的機會更多,人類的注意力被大量
花在「讓 agent 保持在正確方向上」這件事本身。

**迴圈工程(Loop Engineering)** 是把授權前置到書面的正典成品(canonical
artifacts)裡的做法,讓日常執行不需要每一步都經過人類確認。人類的判斷只花一
次,寫成文字,對象是方向與優先序。Agent 在之後每一輪的工作,就是讀取當前的
書面狀態、做下一件已授權的事、證明自己確實做對了、更新書面狀態、然後前進到下
一件事——不需要為已經授權過的工作再問一次許可。

這套機制能成立的前提是:書面狀態必須可信——現時、無歧義,而且結構化到讓
agent 能機械式地判斷「下一步是什麼」和「這件事是不是真的做完了」,不用用猜
的。這正是本 repo 的檔案結構存在的目的。

## 核心洞見:把四種真相分開

大多數專案把方向、現況、優先序、歷史,全部混在同一條進行中的對話裡(聊天紀
錄、一份龐雜的 README,或 agent 對「我們之前聊過什麼」的記憶)。迴圈工程把它
們分放在四個獨立、單一用途的地方:

| 真相種類 | 回答的問題 | 住在哪 | 更新頻率 |
| --- | --- | --- | --- |
| **方向** | 要去哪裡、什麼絕對不能壞? | [`docs/project-charter.md`](../docs/project-charter.md)、[`docs/domain-model.md`](../docs/domain-model.md)、[`docs/system-direction.md`](../docs/system-direction.md) | 極少——只在人類決定改變目標本身時 |
| **現況** | 現在到底有什麼、什麼能動? | [`docs/status.md`](../docs/status.md)、[`docs/build-status.md`](../docs/build-status.md) | 每個改變行為的迭代 |
| **優先序** | agent 下一步被授權做什麼? | [`ROADMAP.md`](../ROADMAP.md)(phase 級)、[`PRIORITIES.md`](../PRIORITIES.md)(task 級) | 每個迭代——完成即移除,危險程度改變時重排 |
| **歷史** | 發生過什麼、何時、證據是什麼? | [`CHANGELOG.md`](../CHANGELOG.md)、`../docs/audits/`、git commits | 只增不改 |

上面每一項都有明確的擁有者與形狀。沒有一項是「隨手記記」。如果一個事實不屬於
這四種之一,它大概根本不需要被寫下來——或者它該放進真正產生那個限制的地方,
變成一則程式碼註解。

還有一個檔案刻意**不屬於**這四種真相:[`INBOX.md`](../INBOX.md),人類輸入的
通道。它只暫存一則待處理的人類指示,直到 agent 把它翻譯進上面四個家之一為
止,然後那一項就會被刪除。它是一個信箱,不是一份文件——見下方「信箱:人類中
繼點」。

## 讀取紀律:常常寫,按需讀

不是每個檔案每輪迴圈都會被讀,而且這個區分是刻意設計的,不是疏漏。**當前真相**
的檔案——`../docs/status.md`、`../docs/build-status.md`、`../PRIORITIES.md`、
`../ROADMAP.md`——會在每個 task-loop 和 phase-loop 邊界被讀(見下方),這正是為
什麼它們都帶著「只減不增」的規則:一個會被反覆讀取的檔案,體積必須被壓住,不
然每一輪迴圈都要為零新資訊付出越來越高的 token 成本。

**歷史檔案——`../CHANGELOG.md`、`../docs/audits/`、`FRAMEWORK_FEEDBACK.md`、
git——恰恰相反:持續被寫入(只增不改),但很少被讀,而且是按需讀。** Task loop 和 phase loop 都沒有把它們列
進例行的定位程序裡。只有在有具體理由時才打開它們——加一筆新條目(是寫入,不是
整份讀取)、準備發版,或是查證某個過去的主張是否仍然成立——而且就算要讀,也要
讀得窄:`../CHANGELOG.md` 的 `[Unreleased]` 那一段,不是整份歷史;
[`docs/audits/README.md`](../docs/audits/README.md) 的索引指向的那一個 audit
檔案,不是資料夾裡的每一個檔案。「讓我把整份 CHANGELOG 讀一遍當脈絡」或「讓我
把所有 audit 都掃一遍」不是仔細,是失誤——這正是「只增不改」這個設計本來就想
避免每輪迴圈都要付的 token 成本。

## 兩層迴圈

工作發生在兩層嵌套的迴圈裡。

- **task loop(小迴圈)** 一次執行一個已授權的任務:取 `../PRIORITIES.md` 的第
  一項、執行、舉證、更新狀態、重複。
- **phase loop(大迴圈)** 包在外層:決定哪個 `../ROADMAP.md` 的 phase 是啟用
  中的、把它拆解進任務佇列,並且——當佇列清空時——在移動到下一個 phase 之
  前,先證明*整個 phase* 真的能動。

這個切分要回答一個小迴圈自己回答不了的問題:「*佇列空了——然後呢?*」沒有大
迴圈的話,佇列清空永遠等於叫人類來。有了大迴圈,agent 會回到 roadmap、用端到
端的證據收尾剛完成的 phase、啟用下一個**已預先授權**的 phase、繼續前進。只有
當 roadmap 本身用完,或出現真正需要判斷的情況時,才需要人類。

**授權邊界,講一次就好:** phase loop 是在授權範圍**內**規劃,它永遠不會*創
造*授權。它可以啟用人類已經寫進 `../ROADMAP.md` 的下一個 phase,並把那個 phase
拆解成 `../PRIORITIES.md` 裡的項目。它不能發明新 phase、重排 phase 順序,或把
「Proposed」的 phase 升格為已授權——這些都是人類的動作,而且要以書面完成,寫
在 `../ROADMAP.md` 裡。

```
PHASE LOOP(大迴圈)
  1. 處理 INBOX.md
  2. 檢查目標 + roadmap ──────────────── roadmap 用完了 → 等待人類
  3. 目前啟用中的 phase 退場條件達成了嗎?
       是 → 跑 PHASE GATE → 寫 audit → 從 ROADMAP.md 移除該 phase
  4. 啟用下一個已授權的 phase → 拆解進 PRIORITIES.md
  5. ↓ 執行 task loop
  6. ↑ 回到步驟 1

TASK LOOP(小迴圈,在步驟 5 內部,佇列還有項目就持續重複)
  a. 檢查 INBOX.md ──────────────── 方向級輸入 → 退出到 phase loop
  b. 取 PRIORITIES.md 第一項
  c. 執行
  d. 舉證:TASK GATE
  e. 更新現況文件・移除該項・記錄歷史
  f. 回到 a ──────────────────── 佇列清空 → 退出到 phase loop
```

### Task loop(小迴圈)

這是內層程序,每個任務跑一輪:

1. **定位。** 讀 [`AGENTS.md`](../AGENTS.md) / [`CLAUDE.md`](../CLAUDE.md)——這兩
   個檔案會指向正典文件。如果這是新的 session,或方向可能已經改變,再讀一次
   [`docs/project-charter.md`](../docs/project-charter.md) 和
   [`docs/domain-model.md`](../docs/domain-model.md)。
2. **檢查信箱。** 打開 [`INBOX.md`](../INBOX.md)。如果裡面有項目,先照那份檔
   案的協議處理它們,**再**接新工作:task 級的輸入會被翻譯成
   `../PRIORITIES.md` 的修改或直接修正,然後繼續;方向級的輸入代表現在就要退出
   到 phase loop。
3. **檢查當前真相。** 讀 [`docs/status.md`](../docs/status.md) 和
   [`docs/build-status.md`](../docs/build-status.md),了解現在到底存在什麼——
   不要靠聊天記憶去反推,也不要相信上一個 session 可能已經過期的心智模型。
4. **取第一項。** 打開 [`PRIORITIES.md`](../PRIORITIES.md)。「Current
   Priorities」下的第一項就是被授權的下一個工作單位。不要跳過去做更有趣的那
   項——順序是安全決策,不是建議(見該檔案內的規則)。
5. **執行。**
6. **用 task gate 舉證。** 執行這個專案的 task gate(定義在
   `../docs/status.md`)。「應該可以動」不是證據。通過的關卡、一次人工走查的結
   果,或一個具體的重現,才是證據。
7. **更新當前真相。** 把改變反映到 `../docs/status.md` 和/或
   `../docs/build-status.md`。
8. **移除該優先項目。** 照 `../PRIORITIES.md` 自己的規則把它移除——不要在那裡
   留下一串刪除線的歷史紀錄;歷史屬於 `../CHANGELOG.md` 和 git,不屬於優先佇
   列。
9. **記錄歷史。** 如果這個改動對外可見,在 `../CHANGELOG.md` 加一筆。
10. **從步驟 2 重複**——或是在退場觸發條件出現時(見下方),退出到 phase
    loop。

Task loop 在以下**任一**情況發生時,會退出到 phase loop:

1. **佇列清空了**——正常路徑:這個 phase 可能已經做完了。
2. **信箱裡有方向級的輸入**——目標改變、策略轉向、「這個方向不對」。不要試
   圖用修補當前任務的方式繞過去;要回到 phase 層級重新規劃。
3. **當前任務跟方向文件矛盾**——這個工作沒辦法在不違反 charter、domain
   model 或 system direction 的前提下完成。Phase loop 會重新評估;如果連書
   面文件都解不開這個衝突,那就是該問人類的問題了。

信箱裡一則小小的人類備註(例如「順便修一下 pager 那個差一的錯誤」)**不算**
退出的理由——把它翻譯進佇列,繼續跑就好。如果每一則小意見都要彈回完整的重新
規劃,留意見就會變得很貴,而這正是這個 repo 想避免的失敗模式。

### Phase loop(大迴圈)

這是外層程序:

1. **先處理信箱。** 方向級的項目會落在這裡——先把它們套用到
   `../ROADMAP.md`、`../docs/project-charter.md` 或 `../docs/system-direction.md`
   (或者,如果需要只有人類能做的決定,就停下來問),再開始規劃任何建立在過
   期方向之上的東西。
2. **檢查整體目標。** 讀 charter 和 [`ROADMAP.md`](../ROADMAP.md)。如果沒有啟
   用中的 phase,也沒有剩下的已授權 phase,代表所有預先授權的工作都做完了:
   **停下來等待人類。** 這——而不是任務佇列清空——才是真正的「等待人類」條
   件。
3. **收尾一個做完的 phase。** 如果啟用中的 phase 的退場條件看起來已經達成:
   跑**phase gate**(見下方「兩層驗證關卡」)、依照
   [`docs/audits/README.md`](../docs/audits/README.md) 在 `../docs/audits/` 寫
   audit、加上 `../CHANGELOG.md` 條目、依照該檔案的規則把這個 phase 從
   `../ROADMAP.md` 移除。如果 phase gate 沒過,缺口進 `../PRIORITIES.md`,這個
   phase 保持啟用中。
4. **啟用下一個已授權的 phase。** 取 `../ROADMAP.md` 裡「Authorized Phases」下
   的第一個 phase,標記為啟用中,並把它拆解成具體的 `../PRIORITIES.md` 項目
   ——每一項都要有清楚的「done means」,讓 task gate 能夠驗證。這個拆解是在
   人類已經授權的範圍內做機械式規劃,所以不需要逐項簽核。
5. **執行 task loop**,直到出現退場觸發條件。
6. **回到步驟 1。**

## 信箱:人類中繼點

[`INBOX.md`](../INBOX.md) 是人類在不用坐在旁邊盯著的情況下,轉向一個正在跑的迴
圈的方式。隨時把一句話丟進這個檔案;agent 會在每個 task-loop 邊界,以及每次
phase loop 開始時檢查它。完整協議寫在檔案本身裡;這裡是承重的規則:

- **一次性(one-shot)語意。** 一則項目只會待在信箱裡,直到被處理完為止。這
  讓檔案在平時保持近乎空白——不會累積要每輪重讀的歷史,不需要索引,不會吃
  token。
- **翻譯後清空,在同一個 commit 裡。** 移除某項目的那個 commit,必須同時包
  含那則項目被翻譯成的實際修改(一則 `PRIORITIES.md` 條目、一次 charter 修
  改、一個現況修正)。這個 diff 就是回執——人類靠它在指示消失*之前*抓出誤
  讀。永遠不要「讀完就清空」而沒有在同一個改動裡放進翻譯結果。
- **只刪你處理過的項目。** 永遠不要整檔清空——人類可能在 agent 工作到一半時
  又加了新的項目。
- **Git 就是檔案庫。** 這個檔案持續被 git 追蹤(不要 gitignore 它);它的
  commit 歷史就是「什麼東西進來過、每一項最後變成了什麼」的永久紀錄。

## 框架回饋:飛行記錄器

[`FRAMEWORK_FEEDBACK.md`](../FRAMEWORK_FEEDBACK.md) 是信箱的鏡像:信箱把人類
的輸入帶*進*專案;這個檔案把缺陷回報帶*出*專案,送回這個專案當初複製的那套
腳手架。當框架本身在迴圈中辜負了你——照著文件走還是迷了路、某條規則造成明
顯的 token 浪費、兩條正典規則互相矛盾、某個關卡或程序套不上而必須繞路、框
架承諾自主但人類卻不得不介入——就追加一筆短短的條目(格式和約 6 行的上限
寫在該檔案的開頭),然後繼續工作。

三條規則讓它幾乎零成本,而且全部繼承自上面已有的模式:

- **它是歷史類檔案。** 只增不改、迴圈中只寫不讀、永遠不在例行定位程序裡——
  「讀取紀律」完整適用。追加幾行幾乎不花錢;這個設計要避免的 token 成本是
  *重讀*這個檔案,所以別讀。
- **裡面的任何內容都不授權任何工作。** 它是飛行記錄器,不是第二個信箱,也不
  是待辦清單。記下來就繼續前進;一筆條目永遠不是在這個 repo 裡中途「修框
  架」的理由。
- **回收由人類觸發,發生在 phase 收尾時。** audit 的 Follow-Up 步驟會在這個
  檔案有新條目時提醒人類;agent 起草上游 issue 的文字,由人類送出。每次回
  收在檔尾追加一行回執——條目本身永遠不被修改。

## 兩層驗證關卡

兩者都在各專案自己的 [`docs/status.md`](../docs/status.md) 裡定義:

- **task gate** 又快又輕,每個 task-loop 迭代都跑——通常是
  lint + typecheck + 單元測試 + build,包成一個指令。它證明*這次改動*沒有破
  壞任何可觀察的行為。
- **phase gate** 昂貴,只在一個 phase 收尾時跑——整合測試/端到端測試、書面
  的人工走查、真實資料的執行;總之是能證明*整個 phase 的退場條件*的東西。它
  的結果會被記錄成 phase audit(`../docs/audits/`)裡的證據。

要有兩層關卡,是因為一層做不了兩件事:快到能每個任務都跑的關卡,淺到證明不了
整個 phase;而深到能證明整個 phase 的關卡,慢到沒辦法每個任務都跑——它會被跳
過,而一個會被跳過的關卡,保護不了任何東西。

## 什麼時候 agent 必須停下來等人類

迴圈工程不代表 agent 永遠不跟人類說話——它代表人類的輸入被保留給真正屬於他們
的決定。以下情況要停下來等:

- **Roadmap 用完了。** 沒有啟用中的 phase,`../ROADMAP.md` 的「Authorized
  Phases」下也沒有東西了。(單純的*任務佇列*清空不算這個——那只會回到
  phase loop。)
- **信箱裡的項目需要人類決定**——它提議了一個新 phase、一次基於危險程度的重
  排,或一個書面文件解決不了的方向改變。
- **要授權新的 phase 級工作。** Agent 可以在 `../ROADMAP.md` 的「Proposed —
  Not Yet Authorized」下*提議*一個 phase,附上建議的目標與退場條件,但要由
  人類把它移進已授權的佇列。
- **這個動作具破壞性、不可逆,或牽涉到 production/機密/金錢/存取控制**,無
  論任何地方寫了什麼。「要做什麼」的書面授權,不等於可以跳過這個框架自己的
  規則要求確認的那些判斷。
- **兩份正典文件互相矛盾**,而 phase loop 沒辦法用 charter 解開;或者這個任
  務需要一個真正的產品/商業判斷,而沒有任何正典文件能回答。
- **優先序或 phase 順序本身有歧義**——例如兩個 blocker 看起來一樣危險。基於
  真實安全判斷的重排是人類的決定;只因為第二項看起來比較有趣就重排,絕對不
  是 agent 該做的事。

除此之外的一切——執行第一優先項目、修一個擋著它的 bug、把已授權的 phase 拆
解成任務、更新現況文件反映事實、寫測試——都已經因為「被寫下來了」而被授權。
直接去做,不用問。

## 為什麼這套機制能隨專案成長而擴展

小專案可以靠聊天記憶和感覺活下去。大專案不行:context window 裝不下全部歷
史,人類沒辦法每個 session 都重新解釋一次意圖,「做任何事之前先問我」會變成
瓶頸,讓 agent 比人手動做還慢。因為方向、現況、優先序、歷史都活在特定形狀的特
定檔案裡,而不是活在對話裡,一個全新的 agent session(或完全不同的 agent 工
具)可以只靠讀取一組有邊界的檔案,就精確接續上一個 session 結束的地方——不需
要讀完整個專案的歷史。而且因為轉向是透過 `../INBOX.md` 而不是即時聊天發生的,人
類可以早上九點丟一則修正,中午再回來看那則回執 diff——迴圈不會因為人類不在場
而卡住,人類的輸入也不會被淹沒在 scrollback 裡。這就是這個 repo 真正的重點:
讓「agent 忘記脈絡」這件事永遠不會發生,因為脈絡從來就不是只存在它的腦子裡。

## 這個 repo 裡有什麼

框架自己的「輔助」/meta 檔案住在 `.loop-engine/`(這份文件自己所在的目
錄)底下;一個專案真正撰寫、持續成長的一小組檔案則留在 repo 根目錄,跟它
並列。

- [`../README.md`](../README.md) / [`../zh-TW/README.md`](../zh-TW/README.md)
  ——這個 repo 是什麼、怎麼把它套用到新專案裡(英文 / 繁體中文)。留在 repo
  根目錄,不放進 `.loop-engine/`——因為它是 GitHub 會自動渲染的那一份,也是
  一個專案會整份改寫成自己內容的那一份。
- [`INIT_CHECKLIST.md`](INIT_CHECKLIST.md) /
  [`zh-TW/INIT_CHECKLIST.md`](zh-TW/INIT_CHECKLIST.md) ——從這套腳手架啟動
  新專案時,填寫模板的順序。
- [`BOOTSTRAP.md`](BOOTSTRAP.md) / [`zh-TW/BOOTSTRAP.md`](zh-TW/BOOTSTRAP.md)
  ——清單的訪談版替代路線:agent 問出它從你貼上的想法推斷不出的東西、起草
  每一份正典檔案,並在任何迴圈開始前,等待一次明確的書面授權。
- [`../CLAUDE.md`](../CLAUDE.md) / [`../AGENTS.md`](../AGENTS.md) —— agent
  入口點。留在 repo 根目錄(各工具就是在那裡找它們)。保持兩者同步;不同工
  具讀不同檔案。
- [`../ROADMAP.md`](../ROADMAP.md) —— phase loop 據以規劃的、預先授權的
  phase 佇列。留在 repo 根目錄——由人類直接編輯。
- [`../PRIORITIES.md`](../PRIORITIES.md) —— task 級的有序優先佇列契約。同樣
  留在 repo 根目錄。
- [`../INBOX.md`](../INBOX.md) —— 人類中繼點信箱。留在 repo 根目錄。開箱即
  用(沒有 `TEMPLATE:` 標記);在有話要跟正在跑的迴圈說之前,保持它空著就
  好。
- [`FRAMEWORK_FEEDBACK.md`](../FRAMEWORK_FEEDBACK.md) ——框架本身缺陷的飛行
  記錄器,只增不改,phase 收尾時回收到上游 loop-engine。開箱即用;空著就是
  它的正常狀態。
- [`../CHANGELOG.md`](../CHANGELOG.md) —— 歷史。留在 repo 根目錄。
- [`../docs/`](../docs/README.md) —— 正典的方向文件與現況文件,加上
  `../docs/audits/` 存放 phase 完成的證據。這是專案*自己*的文件,從不被框架
  重整動到——留在 repo 根目錄。
- [`scripts/check-templates.sh`](../scripts/check-templates.sh) /
  [`.ps1`](../scripts/check-templates.ps1) ——找出殘留的 `TEMPLATE:` 標記,讓
  你知道實際上已經填了什麼。從 repo 根目錄以
  `.loop-engine/scripts/check-templates.sh` 執行。
- [`examples/linkcheck/`](../examples/linkcheck/) ——這個 repo 裡每一個模板的
  完整填寫實例,對象是一個小型的假想 CLI 工具。抽象版本不夠用時,搭配對應模
  板一起讀。

下面每一個模板檔案都包含 `TEMPLATE:` 註解,標出要填什麼、填完後要刪什麼。邊
填邊刪掉這些 `TEMPLATE:` 註解——一份號稱「正典來源」的文件裡還留著模板註解,
就代表它其實還沒有真的被填寫完成。從 repo 根目錄用
`.loop-engine/scripts/check-templates.sh` 一次找出所有殘留的標記,不要用肉
眼一個一個找。

（本檔案是 [`LOOP_ENGINEERING.md`](../LOOP_ENGINEERING.md) 的繁體中文版,兩
者應保持內容一致；若有出入，以英文版為準。）
