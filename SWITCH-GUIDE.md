# 學習冒險島：上線、切換與回復指南（Phase 4）

## 檔案清單（只有「新增」，沒有任何原始檔被改動）
| 檔案 | 說明 |
|---|---|
| `home-adventure.html` | 新的 3D 首頁 |
| `adventure/`（8 個檔案） | 新首頁的程式與樣式 |
| `home-classic.html` | **原始 `home.html` 的備份**（與原檔 SHA-256 完全相同：`2d5c0c5e…ceec1c`） |

`home.html`、`index.html`、`overview.html`、各學習島、`pdf/`、`img/` 都不需要動。

## 階段 A：先上線、不切換（零風險）
1. 把上面三項新增到 GitHub 專案根目錄（網頁版：Add file → Upload files；或 git add / commit / push）。
2. 等 GitHub Pages 更新（通常 1～3 分鐘），開啟：
   `https://evanchi1111-sys.github.io/Grades-5-and-6/home-adventure.html`
3. 用手機、iPad、電腦各看一次，確認：島嶼顯示、點建築開卡片、刷題連結、PDF 能開、「傳統首頁」能回到舊首頁。
4. 如果畫面是舊的，請強制重新整理（電腦 Ctrl+Shift+R；iPad 關閉分頁重開）。

此階段學生仍使用原首頁，網站完全沒變。

## 階段 B：正式切換首頁
前提：階段 A 全部確認無誤，且 `home-classic.html` 已在線上。
做法：把 `home.html` 的內容換成 `home-adventure.html` 的內容（檔名保持 `home.html`）。
- 網頁版：開啟 `home.html` → 編輯 → 全選貼上 `home-adventure.html` 的內容 → Commit。
- 或 git：
  ```bash
  cp home-adventure.html home.html
  git add home.html
  git commit -m "切換首頁為 3D 學習冒險島（舊首頁備份在 home-classic.html）"
  git push
  ```
切換後的連動（已測試，不用另外處理）：
- 各學習島的「回選科目」連到 `home.html#g5`／`#g6`，會進入新首頁並直接聚焦該年級的島。
- 新首頁的「傳統首頁」按鈕連到 `home-classic.html`。
- 原有網址 `home.html` 不變，已存的書籤與分享連結照常可用。
- localStorage 不受影響（新首頁完全不讀寫）。

## 回復原始首頁（任何時候都可以）
方法 1（最快）：把 `home-classic.html` 的內容貼回 `home.html`，Commit。
```bash
cp home-classic.html home.html
git add home.html
git commit -m "回復傳統首頁"
git push
```
方法 2：在 GitHub 的 `home.html` 歷史紀錄中，找到切換前的版本，Revert 該次 commit。
回復後再強制重新整理即可。新增的 `home-adventure.html`、`adventure/` 留著不影響任何功能。

## 新增六年級科目教材
見 `README-adventure.md`：做好學習島頁面後，把 `adventure/data.js` 該科的 `teach: null` 改成頁面網址。

## 已知限制
- 3D 場景需要從 CDN（jsdelivr）載入 Three.js 0.160.0。無法連線時會自動顯示備援清單。若學校網路擋 jsdelivr，請告訴我，可改成把 Three.js 放在專案內。
- 六年級自然島的圖片 `img/nat6/` 在原專案中不存在（既有問題，與新首頁無關）。
- 尚未在真機與 Safari 驗證；建議階段 A 時先測。
