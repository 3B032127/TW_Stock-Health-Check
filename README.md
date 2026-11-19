# 台股財報健檢系統 (Taiwan Stock Health Check)

這是一個全方位的台股市場分析儀表板，具備即時報價、財報健檢以及 AI 智能分析功能。

## 🚀 功能特色

### 📊 市場概況 (Market Dashboard)
- 提供市場狀態總覽與關鍵績效指標。
- 支援股票代碼或名稱快速搜尋 (例如：2330)。

### 📈 個股深度分析 (Stock Detail Analysis)
提供多維度的個股深度數據：

- **公司簡介 (Company Profile)**：基本資料、產業類別以及歷年股利政策。
- **即時報價 (Real-time Quote)**：
    - 盤中走勢圖 (Area Chart)。
    - 五檔報價資訊。
    - 關鍵數據：開盤價、最高價、最低價、收盤價、成交量。
- **籌碼分析 (Chips Analysis)**：
    - 三大法人 (外資、投信、自營商) 買賣超趨勢。
    - 每日買賣超摘要卡片。
    - **[NEW] AI 智能分析**：使用 Google Gemini 自動解讀籌碼面數據。
- **財報健檢 (Financial Health Check)**：
    - 綜合健康評分 (0-100分)。
    - 與同業平均之績效比較。
    - 詳細指標：獲利能力、償債能力、成長動能、評價水位。
    - **[NEW] AI 智能診斷**：針對財務健康狀況提供 AI 評估報告。
- **財報數據 (Financial Data)**：
    - 互動式圖表：綜合損益表、資產負債表、現金流量表。
    - 詳細季度數據列表。
    - **[NEW] AI 趨勢解讀**：針對財務數據趨勢提供 AI 分析。

### 📉 經濟指標 (Economic Indicators)
- 追蹤影響市場的總體經濟指標。

### ⚡ 高盛量化分析 (Goldman Sachs gs-quant Engine)
- **因子分析 (GS Factor)**：計算 Momentum (動量)、Value (價值)、Quality (品質)、Low Volatility (低波動)、Market Beta (市場風險) 與 Smart Money (法人籌碼) 六大風格因子曝險與雷達圖。
- **策略回測 (GS Backtest)**：以 `gs_quant.timeseries` 引擎執行多因子、均線交叉、RSI 均值回歸與 MACD 動能策略回測，產出總報酬率、年化報酬率、夏普值 (Sharpe Ratio)、最大回撤 (Max Drawdown) 與資金淨值曲線圖。

### 🤖 雙模型融合股價預測與歷史回測 (Kronos × TimesFM 2.5 Ensemble)
- **核心雙模型融合架構**：
  - **主力金融基礎模型**：`NeoQuasar/Kronos-base` (512日 OHLCV 蒙地卡羅採樣 20 條路徑)。
  - **輔助宏觀時序模型**：`google/timesfm-2.5-200m-pytorch` (512日收盤價分位數頭)。
- **動態反比誤差權重 (Dynamic Inverse-MAPE)**：
  - 系統每日追蹤個股過去 30 次真實回測中兩大模型 MAPE 表現，動態調整權重比例（附 30%~70% 邊界保護）。
- **全視角驗證與預測圖表**：
  - 支援 **「明日預測 (T-1)」** 與 **「5日波段預測 (T-5)」** 自由切換。
  - 嚴格遵守 XTAI 台灣證交所交易日曆與 ±10% 法定漲跌停限制截斷。
  - 直觀呈現明日/5日多空紅綠訊號卡、80% 信賴區間扇形機率錐、動態多空變色基準線與今日收盤基準標籤。

### 🌐 全球跨國指數看盤艙與 ADR 監控 (Global Market Dashboard)
- **台美日 7 大核心指數**：加權指數、費城半導體、那斯達克、標普 500、道瓊、日經 225、東證 TOPIX。
- **盤中呼吸燈動態回饋**：開盤中末端閃爍呼吸光點，各國指數清楚標示計價幣別（TWD/USD/JPY）與真實 1D 分時 Sparkline。
- **跨國多維排行榜與台股 ADR 監控**：支援台股、美股焦點、日股焦點與全球半導體供應鏈排行，並即時監控台積電、日月光、聯電等美股 ADR 折溢價率。
- **全站多層智慧快取**：首頁盤後全面長效秒開，開盤期間自動背景更新，切換分頁無需重載。

### 🔄 全自動數據補齊與排程系統 (Data Sync & Pipeline)
- 終端機 TUI 動態監控看板，單頁定點刷新不洗版。
- 自動抓取全市場上市普通股歷史數據：財報 (40季)、股利 (10年)、股價 (5年免額度)、三大法人籌碼 (1年)。
- 雙金鑰自動切換與智慧冷卻倒數，並保留前台網頁即時使用額度。
- **每日盤後自動化更新管線 (`run_daily_pipeline.sh`)**：全自動串聯「最新收盤價抓取 ➔ 歷史到期回填 ➔ 雙模型批次推論」。

## 🔄 自動化資料庫同步系統 (Automated Data Sync System)

本專案內建強大的資料庫自動同步守護程式 (`sync_financials_daemon`) 與啟動腳本 (`sync_financials.sh`)，能夠全自動補齊台股全市場普通股的完整歷史資料，並具備智慧 API 額度控管與 TUI 終端機動態看板。

### 🌟 核心特色
1. **四維度歷史資料全量補齊**：
   - **季報財報 (40 季 / 10 年)**：綜合損益表、資產負債表、現金流量表。
   - **歷史股利 (10 年)**：歷年現金股利、股票股利與盈餘公積配息。
   - **歷史股價 (5 年日 K 線)**：**優先透過 yfinance 抓取約 1,250 筆日線（零消耗 FinMind API 額度且極速入庫）**。
   - **三大法人籌碼 (1 年日線)**：外資、投信、自營商買賣超張數。
2. **細粒度 Smart Skip (智慧斷點續傳)**：
   - 程式會實時比對資料庫實際筆數（財報 $\ge 8$ 季、股利 $\ge 3$ 年、股價 $\ge 250$ 天、籌碼 $\ge 60$ 天），已達標的維度自動秒略過，只抓取缺漏項目，節省時間與 API 額度。
3. **智慧雙金鑰管理與防禦冷卻**：
   - 自動調度 `FINMIND_TOKEN_1` 與 `FINMIND_TOKEN_2`，每小時總額度達 1,200 次。
   - 自動扣留緩衝額度（每組 50 次，共 100~150 次）專供前台網站即時查詢，後台同步絕不影響使用者瀏覽。
   - 當 API 額度吃緊時自動進入單頁定點倒數冷卻，重置後自動無縫恢復運作。
4. **終端機動態儀表板 (TUI Dashboard)**：
   - 採用備用螢幕緩衝區（Alternate Screen Buffer），固定單頁定點刷新，不滾動洗版。
   - 實時呈現雙金鑰使用量、冷卻倒數以及 4 大維度的獨立百分比進度條。

### 💻 執行指令與參數

在專案目錄下直接執行啟動腳本：

```bash
# 1. 全自動智慧補齊模式 (推薦：全維度掃描，缺什麼補什麼，自動冷卻)
./sync_financials.sh

# 2. 極速補齊全市場 5 年歷史股價 (yfinance 免額度優先，約 5~8 分鐘即可完成上千檔)
./sync_financials.sh --mode=price

# 3. 專注補齊全市場 10 年歷史股利政策
./sync_financials.sh --mode=dividend

# 4. 專注補齊全市場三大法人籌碼買賣超
./sync_financials.sh --mode=chips

# 5. 專注補齊全市場 10 年季報財報三表
./sync_financials.sh --mode=finance

# 6. 純文字日誌模式 (適合背景 nohup 輸出或重導向至 log 檔)
./sync_financials.sh --plain > sync.log 2>&1 &

# 7. 限制同步檔數 (例如僅同步市值前 20 檔進行測試)
./sync_financials.sh --limit=20
```

---

## 📈 每日盤後自動化更新與雙模型推論管線 (Daily Prediction Pipeline)

本系統支援「離線批次算力 ＋ 線上零延遲讀取」，每日收盤後（14:30 以後）可一鍵執行全自動更新管線：

### 🌟 管線執行流程
1. **日 K 線增量抓取** (`scripts/update_tw_daily_prices.py`)：使用 yfinance 批次並行拉取全市場上市櫃個股當日最新收盤行情，寫入 SQLite。
2. **交易日檢查與防禦**：自動判定今日是否為交易日、資料是否已如期入庫，若未滿足條件則安全終止，防止在未收盤時誤跑推論。
3. **實際價格回填 (Backfill)**：將今日真實收盤價回填到過去所有已到期的預測紀錄中，更新真實誤差。
4. **回測指標重算 (Recompute Backtest)**：滾動重算過去 30 次歷史預測之方向勝率 (Directional Accuracy)、MAPE 與信賴區間命中率。
5. **雙模型推論 (Kronos × TimesFM Ensemble)**：啟用 Apple Silicon MPS 加速，推論未來 5 個交易日之目標價格與區間。

### 💻 每日更新指令與排程設定

```bash
# 【一鍵執行】每日收盤後全自動管線（抓取今日日 K ➔ 到期回填 ➔ 重新推論）
./scripts/run_daily_pipeline.sh

# 【單獨更新】增量補齊最近 5 天日 K 線
./venv/bin/python scripts/update_tw_daily_prices.py --days 5

# 【單獨預測】為全市場所有股票執行最新預測推論
./venv/bin/python scripts/run_tw_predictions.py --mode daily

# 【測試單股】針對特定個股單獨執行預測 (例如台積電 2330、鴻海 2317)
./venv/bin/python scripts/run_tw_predictions.py --mode daily --symbols 2330,2317

# 【歷史回填】重新回填歷史 35 天之回測基準（用於初次部署建置資料）
./venv/bin/python scripts/run_tw_predictions.py --mode backfill --backtest-days 35
```

> [!TIP]
> **排程建議 (Crontab)**：
> 若在本地或常駐機器上運行，可設定每日週一至週五 14:40 自動執行：
> ```cron
> 40 14 * * 1-5 cd /path/to/TW_Stock-Health-Check && ./scripts/run_daily_pipeline.sh >> /tmp/pipeline.log 2>&1
> ```

> [!TIP]
> 守護程式支援安全的優雅退出（Graceful Shutdown），任何時候按下 `Ctrl + C` 均會安全寫入進度並離開，下次執行時自動接續中斷進度。

## 🛠️ 技術棧 (Tech Stack)
- **前端框架**：[React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **程式語言**：[TypeScript](https://www.typescriptlang.org/)
- **樣式處理**：[Tailwind CSS](https://tailwindcss.com/)
- **圖表套件**：[Recharts](https://recharts.org/)
- **圖示庫**：Material Symbols
- **AI 整合**：Google Gemini (目前為 Mock/Prototype 展示階段)

## 🏃‍♂️ 快速開始 (Getting Started)

### 前置需求 (Prerequisites)
- **Python 3.8+**：後端 API 服務
- **Node.js 16+**：前端開發環境
- **pip**：Python 套件管理工具
- **npm**：Node.js 套件管理工具

### 安裝步驟 (Installation)

#### 1. 安裝後端依賴
```bash
# 進入專案目錄
cd taiwan-stock-health-check

# 安裝 Python 依賴套件
pip install -r requirements.txt
```

#### 2. 安裝前端依賴
```bash
# 在專案根目錄執行
npm install
```

### 本地運行 (Local Development)

#### 啟動後端服務 (Backend)

**在第一個終端窗口執行：**
```bash
# Windows PowerShell
cd 'f:\taiwan-stock-health-check'
python -m uvicorn backend.main:app --reload --port 8000

# macOS/Linux
cd 'f:\taiwan-stock-health-check'
python3 -m uvicorn backend.main:app --reload --port 8000
```

**後端服務資訊：**
- 運行位址：`http://localhost:8000`
- API 文檔：`http://localhost:8000/docs` (Swagger UI)
- 支援熱重載（代碼修改後自動重啟）

**主要 API 端點：**
- `/api/v1/market/taiex?period={1d|1w|1m|1y}` - 台股加權指數數據
- `/api/v1/market/indicators` - 關鍵經濟指標
- `/api/v1/stocks/{stock_id}` - 個股詳細資訊

#### 啟動前端服務 (Frontend)

**在第二個終端窗口執行：**
```bash
cd 'f:\taiwan-stock-health-check'
npm run dev
```

**前端服務資訊：**
- 運行位址：`http://localhost:3000`
- 支援熱重載（Hot Module Replacement）
- 開發模式下會自動連接到 `http://localhost:8000` 的後端 API

#### 停止服務 (Stop Services)
在各自的終端窗口中按 **Ctrl + C** 即可停止服務。

### 建置生產版本 (Production Build)

#### 前端建置
```bash
npm run build
```

建置完成後，產出檔案位於 `dist/` 目錄。

#### 生產環境部署
```bash
# 預覽生產建置
npm run preview
```

### 驗證安裝 (Verify Installation)

**檢查後端是否正常運行：**
```bash
# Windows PowerShell
curl http://localhost:8000/api/v1/market/indicators

# macOS/Linux
curl http://localhost:8000/api/v1/market/indicators
```

**檢查前端是否正常運行：**
在瀏覽器訪問 `http://localhost:3000`，應該能看到台股健檢系統的儀表板。

### 常見問題 (Troubleshooting)

**後端啟動失敗：**
- 確認 Python 版本：`python --version` 或 `python3 --version`
- 確認已安裝所有依賴：`pip install -r requirements.txt`
- 檢查端口 8000 是否被占用

**前端啟動失敗：**
- 確認 Node.js 版本：`node --version`
- 刪除 `node_modules` 並重新安裝：`rm -rf node_modules && npm install`
- 檢查端口 3000 是否被占用

**API 連接失敗：**
- 確認後端服務已啟動並運行在 `http://localhost:8000`
- 檢查瀏覽器控制台是否有 CORS 錯誤
- 確認防火牆設定允許本地端口訪問

## 🤖 AI 功能設定 (AI Features Configuration)
目前的 AI 分析功能設定為使用模擬數據 (Mock Data) 進行展示。若要啟用真實的 Google Gemini API 呼叫：

1.  開啟 `services/geminiService.ts` (若先前選用任務已跳過，請自行建立)。
2.  在 `.env.local` 檔案中設定您的 API 金鑰：
    ```env
    VITE_GEMINI_API_KEY=your_api_key_here
    ```
3.  更新相關元件以使用真實的服務取代模擬回應。

---
*免責聲明：本系統數據僅供參考，投資具有風險，請謹慎評估。*
