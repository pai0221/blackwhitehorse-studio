# Lucky Numbers — 網頁版（含 AI 對戰）

離線靜態網頁，只需開啟 `index.html` 即可遊玩（需連線載入 CDN 的 React 與 Tailwind）。

## 檔案結構
- `index.html`：入口頁，載入 React 與 `app.js`。
- `app.js`：主要遊戲邏輯（React 18 UMD）。

## 規則簡述
- 4x4 棋盤，牌值 1~20（各 4 張）。
- 行列必須嚴格遞增（左→右、上→下）。
- 回合：從牌庫抽一張或從 Pool 拿一張 → 放到自己棋盤（可覆蓋，舊牌丟進 Pool）；不能放則丟進 Pool。
- 先填滿 16 格者獲勝。

## 部署
- 直接雙擊 `index.html` 或放到任一靜態伺服器（GitHub Pages 也可以）。
