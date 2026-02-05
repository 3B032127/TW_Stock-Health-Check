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

1.  **安裝依賴套件**
    ```bash
    npm install
    ```

2.  **啟動開發伺服器**
    ```bash
    npm run dev
    ```

3.  **建置生產版本**
    ```bash
    npm run build
    ```

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
