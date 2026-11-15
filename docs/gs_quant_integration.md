# Goldman Sachs `gs-quant` 整合技術文件

本文件記錄 **TW Stock‑Health‑Check（台股財報健檢系統）** 整合 Goldman Sachs 開源量化金融工具庫 [`gs-quant`](https://github.com/goldmansachs/gs-quant) 之架構設計、安裝方式、API 規格、資料庫結構與驗證說明。

---

## 1. 架構總覽

本整合方案採用 **「本地高盛時序量化引擎 + 選擇性 Marquee API 擴充」** 混合架構：

| 層級 | 模組路徑 | 職責說明 |
|---|---|---|
| **量化引擎層** | `backend/services/gs_quant/factor.py` | 使用 `gs_quant.timeseries`（`returns`, `volatility`, `max_drawdown`, `beta`, `correlation`, `zscores`, `percentiles`, `moving_average`, `bollinger_bands`, `relative_strength_index`, `excess_returns`, `get_ratio_pure`）計算 6 大風格因子曝險與風險矩陣。 |
| **策略回測層** | `backend/services/gs_quant/backtest.py` | 實作 4 種量化交易策略之向量化回測，嚴格採用 T-1 收盤訊號於 T 日執行並計入台股手續費 (0.1425%) 與證交稅 (0.3%)。 |
| **API 路由層** | `backend/api/gs_quant_routes.py` | 提供非同步 FastAPI 端點，透過 `asyncio.to_thread` 執行重運算並搭配 `cache_service` 進行快取。 |
| **資料庫層** | `backend/models.py` | 新增 `gs_factor` (`GSFactorResult`) 與 `gs_backtest` (`GSBacktestResult`) 資料表。 |
| **夜間批次腳本** | `backend/scripts/compute_factors.py` | 可透過 CLI 或排程預先批次運算全市場已同步個股之因子曝險與回測績效。 |
| **前端介面層** | `hooks/useGSFactor.ts`、`hooks/useGSBacktest.ts`、`components/stock-detail/GSFactorTab.tsx`、`GSBacktestTab.tsx` | 於個股詳情頁新增「因子分析 (GS)」與「策略回測 (GS)」兩個分頁。 |

---

## 2. 安裝步驟

```bash
# 啟用虛擬環境
source venv/bin/activate

# 安裝相依套件（含 gs-quant 與 scipy）
pip install -r backend/requirements.txt

# 驗證匯入正常
python -c "import gs_quant; print(gs_quant.__version__)"
```

> 若具備 Goldman Sachs Marquee 機構帳號憑證，可於專案根目錄 `.env.local` 設定 `GS_CLIENT_ID` 與 `GS_CLIENT_SECRET`；若未設定，系統將自動以無需連網授權的 `gs_quant.timeseries` 本地量化計算引擎運行。

---

## 3. 新增資料庫結構

### 3.1 `gs_factor`（因子曝險表）
| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | `Integer` | 主鍵 |
| `ticker` | `String` | 股票代碼（如 `2330`） |
| `date` | `String` | 計算基準日（`YYYY-MM-DD`） |
| `factor_name` | `String` | 因子識別碼（`Momentum`, `Value`, `Quality`, `LowVolatility`, `MarketBeta`, `SmartMoney`） |
| `exposure` | `Float` | 標準化曝險 Z-Score（區間 `[-3.0, +3.0]`） |
| `percentile` | `Float` | 對應歷史/常態百分位（`0 ~ 100`） |

### 3.2 `gs_backtest`（策略回測指標表）
| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | `Integer` | 主鍵 |
| `portfolio_id` | `String` | 標的代码或投組識別碼 |
| `strategy` | `String` | 策略代碼（`multi_factor`, `ma_cross`, `rsi_mean_reversion`, `macd_momentum`） |
| `start_date` | `String` | 回測起始日 |
| `end_date` | `String` | 回測結束日 |
| `metric` | `String` | 績效指標名稱（`CumulativeReturn`, `Sharpe`, `MaxDrawdown`, `WinRate`, `Alpha` 等） |
| `value` | `Float` | 指標數值 |

---

## 4. API 端點規格

同時掛載於 `/api/v1/gs_quant`、`/api/gs_quant` 與 `/gs_quant` 前綴下：

### 4.1 取得個股因子曝險與風險分析
- **Method & Path**: `GET /gs_quant/stock/{ticker}/factor`
- **Query Params**:
  - `date` (可選): 指定基準日 `YYYY-MM-DD`
  - `force_refresh` (可選, default=`false`): 忽略快取強制重算
- **範例回應**:
  ```json
  {
    "status": "success",
    "source": "gs-quant",
    "ticker": "2330",
    "date": "2026-11-13",
    "exposures": {
      "Momentum": -0.472,
      "Value": -1.266,
      "Quality": 2.875,
      "LowVolatility": 0.262,
      "MarketBeta": -0.558,
      "SmartMoney": 0.891
    },
    "data": {
      "composite_score": 60,
      "quant_quadrant": "均衡配置・多空因子中性",
      "factors_detail": [...],
      "risk_metrics": {
        "annualized_volatility_20d": 35.88,
        "sharpe_ratio_60d": -0.38,
        "max_drawdown_252d": -22.1,
        "beta_60d": 0.72
      },
      "rolling_series": [...]
    }
  }
  ```

### 4.2 執行個股策略回測
- **Method & Path**: `GET /gs_quant/stock/{ticker}/backtest`
- **Query Params**:
  - `strategy`: `multi_factor` | `ma_cross` | `rsi_mean_reversion` | `macd_momentum`
  - `start_date`, `end_date`: `YYYY-MM-DD`（預設近一年）
  - `initial_capital`: 初始資金（預設 `1000000`）
  - `force_refresh`: 布林值
- **範例回應**:
  ```json
  {
    "status": "success",
    "source": "gs-quant",
    "ticker": "2330",
    "strategy": "rsi_mean_reversion",
    "metrics": {
      "cumulative_return": 24.74,
      "benchmark_return": 18.2,
      "excess_return": 6.54,
      "sharpe_ratio": 1.12,
      "max_drawdown": -11.96,
      "win_rate": 75.0,
      "total_trades": 7
    },
    "data": {
      "equity_curve": [...],
      "trade_log": [...]
    }
  }
  ```

---

## 5. 批次預計算與自動化測試

```bash
# 對特定個股預先計算並寫入 SQLite
./venv/bin/python -m backend.scripts.compute_factors --tickers 2330

# 執行單元與整合測試
./venv/bin/pytest backend/tests/test_gs_quant.py -v
```

---

## 6. 授權聲明 (License Compliance)

本專案整合之 [`goldmansachs/gs-quant`](https://github.com/goldmansachs/gs-quant) 依 **Apache License 2.0** 授權使用，於本地量化計算模組與相關衍生文件中保留完整版權與授權歸屬聲明。
