# Larch 算命卡片接線

每城放一張 miniGame 卡，選該城算法與算命仙稱呼即可。先算魏續的劇情請接在本卡之前，由作者在主專案撰寫。這裡不建立或修改線上卡片。

把 [card.html](card.html) 全文貼入 `miniGameHtml`。預設 iframe 網址是 `https://yazelin.github.io/larch-xu-fortune/`，需作者之後建立 GitHub repo 並開啟 Pages 才能在線上載入。

## 卡片設定

```json
{
  "type": "miniGame",
  "title": "一席問命",
  "text": "客人，請坐。",
  "miniGameHtml": "貼入 card.html 全文",
  "miniGameFrame": {"showTitle": false, "showButton": false},
  "miniGameSkippable": true,
  "miniGamePresentation": "fullscreen",
  "miniGameReadVars": [
    "fortune_cezi_count", "fortune_cezi_last",
    "fortune_bird_count", "fortune_bird_last",
    "fortune_tarot_count", "fortune_tarot_last",
    "fortune_zodiac_count", "fortune_zodiac_last",
    "fortune_face_count", "fortune_face_last",
    "fortune_day_count", "fortune_day_last",
    "fortune_wheel_count", "fortune_wheel_last"
  ],
  "miniGameWriteVars": [
    "fortune_cezi_count", "fortune_cezi_last",
    "fortune_bird_count", "fortune_bird_last",
    "fortune_tarot_count", "fortune_tarot_last",
    "fortune_zodiac_count", "fortune_zodiac_last",
    "fortune_face_count", "fortune_face_last",
    "fortune_day_count", "fortune_day_last",
    "fortune_wheel_count", "fortune_wheel_last"
  ]
}
```

讀寫白名單都要完整；漏寫的變數可能被平台靜默忽略。每城共用十四個變數，所以同種算法跨城累積；若未來要分城計次，須另改變數前綴與卡片。

## 要建的專案變數

| 算法 | 次數，number，預設 `0` | 最近結果，string，預設 `""` |
|---|---|---|
| 測字 | `fortune_cezi_count` | `fortune_cezi_last` |
| 鳥卦 | `fortune_bird_count` | `fortune_bird_last` |
| 塔羅 | `fortune_tarot_count` | `fortune_tarot_last` |
| 星座 | `fortune_zodiac_count` | `fortune_zodiac_last` |
| 相面 | `fortune_face_count` | `fortune_face_last` |
| 日者 | `fortune_day_count` | `fortune_day_last` |
| 式盤 | `fortune_wheel_count` | `fortune_wheel_last` |

不用建立紫微變數，也不用建立完整 JSON 存檔變數。卡片收到 `larch:init.variables` 後把十四個值組成 `fortune:state`。解語第一次顯示就加次數；只抽了一張塔羅、未翻滿三張，不計次。再問一回並完成則再加一次。

## 可配置欄位

卡片接受 `larch:init.values` 中的三個欄位，沒有發布插件 manifest：

| 欄位 | 預設 | 說明 |
|---|---|---|
| `method` | `cezi` | `cezi`、`bird`、`tarot`、`zodiac`、`face`、`day`、`wheel`。 |
| `teller` | 街角算命仙 | 算命仙稱呼，以純文字呈現。 |
| `pagesUrl` | 預定 Pages 網址 | 完整 HTTPS 網址；本機測試亦接受 localhost 的 HTTP。 |

若只使用直接貼 HTML 的 miniGame 卡，沒有插件欄位編輯器，請直接改 `card.html` 的預設值，再整份貼入各城卡片。不要以為自訂 JSON 欄位會自動出現在 `values`。若日後包成插件，僅需三個欄位；不超過三十欄，也不要取名 `prompt`。

## 完成與路由

遊戲 → 卡片採 `fortune:ready`／`fortune:save`／`fortune:exit`；卡片 → 遊戲採 `fortune:state`。

完成時遊戲送：

```json
{"type":"fortune:exit","complete":true,"result":{"method":"bird","id":"bird-01"}}
```

卡片核對這是當次剛保存的結果，等待二百四十毫秒後送：

```json
{"type":"larch:complete","result":"exit","payload":{"complete":true,"result":{"method":"bird","id":"bird-01"}}}
```

還沒拿到解語便按「回攤前」，送 `complete: false, result: null`，不增加次數。取得解語後回攤前，仍以該次結果完成。當次卡片只接受其配置算法的存檔；其他六門不會被寫入。重複訊息不重複加次數或完成。

故事可讀 `fortune_<method>_count` 判斷是否玩過，或讀 `fortune_<method>_last` 回扣某一張／某一段。若要做首次解語分支，請另用主專案自己的劇情旗標，避免把玩家遊戲計次當成魏續的劇情進度。

## 本機接線驗收

在 repo 根目錄啟動 `python3 -m http.server 8000`，開 `http://localhost:8000/tests/embed_host.html?method=bird`。頁面模擬 Larch 宿主，裡面載入真實 `card.html`，再由卡片載入遊戲；初始測字次數為三，其他為零。玩完會在頁面上列出 `larch:set` 與 `larch:complete`，可確認原有計次有保留。

`node --test` 另用真實卡片腳本做訊息模擬；`node tools/browser_check.cjs` 才是瀏覽器雙層 iframe 驗收。本次瀏覽器啟動受系統權限阻擋，尚未取得這項實測結果。
