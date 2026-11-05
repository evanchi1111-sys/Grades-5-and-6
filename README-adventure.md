# 學習冒險島（Phase 2 成品）

## 放置方式
把 `home-adventure.html` 和 `adventure/` 資料夾複製到 GitHub 專案根目錄（與 `home.html`、`index.html` 同一層）。**不需要修改任何原始檔。**
開啟：`https://evanchi1111-sys.github.io/Grades-5-and-6/home-adventure.html`

## 新增六年級科目教材
1. 做好該科的學習島頁面（例如 `island-g6-chi.html`）。
2. 打開 `adventure/data.js`，找到 `g6` 的對應科目，把 `teach: null` 改成 `teach: 'island-g6-chi.html'`。
3. 儲存即可：建築自動從灰色「準備中」變成彩色，資訊卡的「進入教材」自動啟用。

## 檔案
- `data.js` 所有年級／科目／連結（唯一需要維護連結的地方）
- `scene.js` 場景、光線、海洋、雲、渲染
- `islands.js` 島嶼、橋、樹／花／石（InstancedMesh）
- `buildings.js` 四種建築模型
- `interaction.js` 懸停、點擊、相機飛行、標籤
- `ui.js` 資訊卡、按鈕、備援介面（不依賴 Three.js）
- `main.js` 啟動與錯誤處理
- `style.css` 樣式與響應式

## 注意
- 本入口不讀寫 localStorage，原本的刷題與學習島進度完全不受影響。
- Three.js 0.160.0 由 jsdelivr CDN 載入；失敗時自動顯示備援清單。
