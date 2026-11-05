# 串接外部 AI 的後端規格（尚未實作；預設不連網）

目前小幫手（`LocalTutor`）只根據教材資料回答，**不連網、不需要任何金鑰**。若之後要接 AI 服務，請依下面規則做，不要改動前端的安全檢查。

## 絕對規則
1. **API 金鑰只能放在後端**（環境變數／祕密管理）。前端的 JavaScript、`config.js`、HTML 都不可以出現金鑰、token。
2. 前端只會連到 `config.js` 的 `endpoint`（必須 https）。預設 `null`，完全不連網。
3. 後端要自己做：身分驗證或來源限制（CORS 白名單）、速率限制、輸入長度限制、記錄與費用上限。
4. 後端提示詞必須要求：只能根據請求中的 `context`（教材段落）回答；教材沒寫的就說不確定；使用國小五、六年級看得懂的繁體中文；**未作答時不可公布答案**；不可編造教材、課綱或標準答案。

## 請求（前端 POST JSON）
```json
{
  "kind": "hint | explain | simple | similar | concept | search",
  "text": "使用者輸入的問題（search 時）",
  "question": { "q": "題目", "opts": ["…"], "answer": 0, "explain": "…" },
  "answered": true,
  "level": 1,
  "context": [ { "source": "原教材「影子與方位」・影子在哪裡", "text": "…" } ]
}
```
- `question.answer`、`question.explain` **只有在 `answered` 為 true 時才會出現**。
- 不會送出暱稱、學習紀錄、裝置資訊。

## 回應（JSON）
```json
{
  "blocks": [ { "t": "text", "text": "…" }, { "t": "note", "text": "…" } ],
  "sources": [ "原教材「影子與方位」・影子在哪裡" ]
}
```
- `sources` 必須非空，否則前端會丟棄回應並改用教材小幫手。
- 只接受 `text`／`note` 區塊；未作答時如果回應含有正確答案文字，前端會丟棄。
- 逾時 12 秒或任何錯誤，前端自動改用教材小幫手。

## 檢查清單
- [ ] 全專案搜尋 `sk-`、`api_key`、`Bearer`、`token`，確認沒有任何金鑰
- [ ] `config.js` 的 `endpoint` 只有網址
- [ ] 後端有 CORS 白名單、速率限制、費用上限
