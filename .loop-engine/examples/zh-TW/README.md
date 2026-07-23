# Examples(範例)

[`linkcheck/`](../linkcheck/) 是 loop-engine 腳手架的一份完整填寫實例,對象是一
個小型的假想 CLI 工具。根目錄腳手架裡的每一則 `TEMPLATE:` 註解都已經換成真實
內容——沒有殘留的佔位符(從 repo 根目錄執行
`.loop-engine/scripts/check-templates.sh .loop-engine/examples/linkcheck` 回
報乾淨)。

這個範例本身只提供英文版,沒有繁體中文翻譯——它示範的是「填好之後長什麼樣
子」,不是要逐字翻譯的說明文件;複製它的**形狀**,不是它的語言。

它存在的目的,是回答「填好的版本實際上長什麼樣子」這個問題——光看模板很難想
像。搭配 [`../../INIT_CHECKLIST.md`](../../INIT_CHECKLIST.md)(或其繁體中文版
[`../../zh-TW/INIT_CHECKLIST.md`](../../zh-TW/INIT_CHECKLIST.md))一起讀:
`linkcheck/` 裡的每一個檔案,都對應那份清單裡的一個步驟。

linkcheck 本身不是一個真實、能運作的工具——它是一個合理的小型 CLI(掃描一棵
文件樹找壞掉的 markdown 連結,附帶一個選擇性開啟的自動修復模式),專門為了有
足夠有趣的護欄、一個真實的 blocker 定義,以及一個值得寫 audit 的完成 phase 而
發明出來,不需要用專屬或不相關的真實程式碼庫當範例。

有兩個檔案的狀態特別值得注意:`linkcheck/INBOX.md` 是空的——那*就是*它填好之
後的狀態(信箱本來就該平時是空的)——而 `linkcheck/ROADMAP.md` 三個區塊同時
都有內容(一個啟用中的 phase、一個已授權的下一個 phase,以及未授權的提案),
這正是一個進行到一半的專案該有的樣子。

不要把 `linkcheck/` 的*內容*複製進你的專案——複製它的*形狀*。你的 charter、
domain model、priorities 應該反映你真實的專案,不是一個文件連結檢查器的。

（本檔案是 [`README.md`](README.md) 的繁體中文版，兩者應保持內容一致；若有出
入，以英文版為準。）
