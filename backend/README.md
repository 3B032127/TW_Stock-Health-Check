# 台股財報健檢系統 - 後端開發文件 (Backend Development Documentation)

## 1. 專案概述
本後端系統專為「台股財報健檢系統」設計，旨在提供高效的財報數據查詢服務。採用 **FastAPI** 框架構建，並實作 **Cache-Aside** 模式以優化對外部 **FinMind API** 的請求，解決 Rate Limit 問題並提升回應速度。

## 2. 技術架構
- **語言**: Python 3.9+
- **框架**: FastAPI
- **資料庫**: SQLite (本地文件 `financial_data.db`)
- **ORM**: SQLAlchemy
- **HTTP 客戶端**: httpx (非同步)

## 3. 核心功能模組

### 3.1 資料庫設計 (`backend/models.py`)
系統包含三張核心資料表，主鍵皆為 `(stock_id, year, quarter)` 組合：
- **FinancialStatement**: 綜合損益表 (營收、淨利、EPS...)
- **BalanceSheet**: 資產負債表 (現金、資產、負債、權益...)
- **CashFlowStatement**: 現金流量表 (營業/投資/籌資現金流...)

### 3.2 外部 API 整合 (`backend/services/finmind.py`)
- 負責與 FinMind API 進行通訊。
- 內建 Rate Limit 處理機制 (遇到 429 錯誤自動重試)。
- 自動處理 Token 認證。

### 3.3 業務邏輯與快取 (`backend/services/finance.py`)
實作 "Local DB First" 策略：
1. **查詢**: 先檢查 SQLite 資料庫。
2. **命中 (Hit)**: 若存在則直接回傳。
3. **未命中 (Miss)**: 呼叫 FinMind API 獲取數據 -> 清洗並寫入 DB -> 回傳給前端。
4. **數據映射**: 將原始 API 數據轉換為系統定義的標準 Schema。

## 4. API 接口說明

所有 API 皆位於 `/api/v1/finance` 路徑下，支援 `GET` 方法。

### 4.1 綜合損益表
- **Endpoint**: `/api/v1/finance/income_statement`
- **參數**: `stock_id` (股票代碼), `year` (年份), `quarter` (季度 1-4)
- **回傳**: 當季營收、毛利、淨利、EPS 等數據。

### 4.2 資產負債表
- **Endpoint**: `/api/v1/finance/balance_sheet`
- **參數**: 同上
- **回傳**: 資產、負債、權益結構數據。

### 4.3 現金流量表
- **Endpoint**: `/api/v1/finance/cash_flow`
- **參數**: 同上
- **回傳**: 三大現金流及自由現金流數據。

### 4.4 籌碼分析 (Chips)
- **Endpoint**: `/api/v1/stock/chips`
- **參數**: `stock_id`, `days` (預設 30 天)
- **回傳**: 外資、投信、自營商買賣超歷史數據。

### 4.5 股價資訊 (Stock Price)
- **Endpoint**: `/api/v1/stock/price`
- **參數**: `stock_id`, `days` (預設 180 天)
- **回傳**: 日 K 線數據 (開高低收量)。

### 4.6 股利政策 (Dividend)
- **Endpoint**: `/api/v1/stock/dividend`
- **參數**: `stock_id`
- **回傳**: 歷年配股配息紀錄。

## 5. 安裝與執行

### 5.1 安裝依賴
```bash
cd backend
pip install -r requirements.txt
```

### 5.2 啟動伺服器
```bash
# 在專案根目錄執行 (確保能 import backend 模組)
uvicorn backend.main:app --reload
```
伺服器將在 `http://127.0.0.1:8000` 啟動。API 文件可訪問 `/docs` (Swagger UI)。

## 6. 注意事項
- **Token 配置**: `backend/services/finmind.py` 中已包含預設 Token，亦可透過 `.env` 檔案設定 `FINMIND_TOKEN`。
- **資料庫**: `financial_data.db` 會在第一次啟動時自動建立於根目錄。
