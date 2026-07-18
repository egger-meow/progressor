# 為 loop-engine 貢獻

這份文件談的是改進**腳手架本身**——模板、`LOOP_ENGINEERING.md`、
`INIT_CHECKLIST.md`,以及 `scripts/` 裡的腳本。如果你是在自己的專案裡使用
loop-engine,想知道怎麼填寫*你自己的*模板,請改看
[`INIT_CHECKLIST.md`](INIT_CHECKLIST.md)——這份文件對那件事沒有任何指引。

## 什麼東西該放這裡,什麼該放在採用這套腳手架的專案裡

- 結構性的改動(新增/移除/重新命名一份正典文件、改變 `PRIORITIES.md` 規則要
  求的內容)屬於這裡,因為它們會改變每一個採用專案複製到的樣子。
- 內容性的改動(填寫一份 charter、寫真實的 priorities)永遠不屬於這裡——這個
  repo 自己的模板檔案應該永遠保持模板狀態。如果你發現自己在把真實的專案內容
  寫進這些檔案之一,代表你改錯份了。

## 提出結構性改動之前

迴圈工程的整個前提,是方向、現況、優先序、歷史各自只有一個正典的家(見
[`LOOP_ENGINEERING.md`](LOOP_ENGINEERING.md) 的「核心洞見」)。在新增一個檔
案或章節之前,先檢查:

1. 這個事實在四種類別裡已經有家了嗎?如果有,擴充那份文件,而不是新增一份。
2. 如果它真的是全新的,它屬於四種類別中的哪一種?它會不會改變那個類別的更新
   頻率?一份更新頻率跟自己類別不一樣的文件,通常代表它放錯地方了。
3. 一個採用這套腳手架的專案,真的會持續維護這份文件的正確性嗎,還是它會變成
   那種寫一次就開始腐爛的文件?`LOOP_ENGINEERING.md` 講得很明白:一份 agent
   會信任但其實已經過期的文件,比沒有文件更糟——不要加進日後很可能變成那樣
   的結構。

## 做一個改動

1. 更新 repo 根目錄和/或 `docs/` 底下的模板檔案。
2. 如果這個改動影響了填寫順序,或新增了一個必要步驟,更新
   [`INIT_CHECKLIST.md`](INIT_CHECKLIST.md) 使其一致。
3. 如果這個改動影響了填好範例的形狀,更新
   [`examples/linkcheck/`](examples/linkcheck/),讓它保持忠實、完整填寫的當
   前模板實例——一個跟模板脫節的範例,只會誤導人。
4. 如果這個改動影響了 `README.md`,把它同步到 `README.zh-TW.md`——兩者互為
   翻譯,必須傳達相同的內容。同樣地,如果改動影響了
   [`LOOP_ENGINEERING.md`](LOOP_ENGINEERING.md)、
   [`INIT_CHECKLIST.md`](INIT_CHECKLIST.md)、[`BOOTSTRAP.md`](BOOTSTRAP.md)、
   `CONTRIBUTING.md`,或
   [`examples/README.md`](examples/README.md)(這五份是唯一有繁體中文版本
   的檔案),同步更新它們各自的 `.zh-TW.md` 版本。
5. 針對 `examples/linkcheck/`(應回報乾淨——那個目錄依設計不該有未填的
   `TEMPLATE:` 標記)以及根目錄腳手架(應回報一切仍是模板狀態,因為根目錄腳
   手架本來就該保持未填寫)執行模板完整性檢查:
   ```bash
   ./scripts/check-templates.sh examples/linkcheck
   ```
6. 在 `CHANGELOG.md` 的 `[Unreleased]` 底下更新。

## 風格

- 讓 `TEMPLATE:` 引導註解保持可執行:說清楚要寫什麼,有用的話再給一個可以套
  用的模型/形狀——不要只寫「填這裡」。
- 文件之間優先用連結,而不是重複內容;同一個事實寫在兩個地方,遲早會跟自己吵
  架。
- 保持腳手架與技術棧無關。如果一個改動只對某個語言或框架有意義,它該放在某個
  專案自己填好的文件裡,不該放進這個 repo 的模板裡。

（本檔案是 [`CONTRIBUTING.md`](CONTRIBUTING.md) 的繁體中文版，兩者應保持內容
一致；若有出入，以英文版為準。）
