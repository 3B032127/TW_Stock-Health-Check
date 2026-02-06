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
