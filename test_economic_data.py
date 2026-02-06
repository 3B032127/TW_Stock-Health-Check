"""
測試如何獲取 CPI、PPI 和 Fed 利率數據
"""
import yfinance as yf
import requests
from datetime import datetime

print("=" * 80)
print("測試經濟指標數據來源")
print("=" * 80)

# 1. 測試 FRED (Federal Reserve Economic Data) API
# 注意：FRED API 需要 API key，但我們可以先測試看看
print("\n1. 測試 FRED 相關的 ETF/指數")
print("-" * 80)

# 嘗試一些可能包含經濟數據的 ticker
test_tickers = {
    "^IRX": "13 Week Treasury Bill (短期利率參考)",
    "^FVX": "5-Year Treasury Yield",
    "^TYX": "30-Year Treasury Yield",
    "DX-Y.NYB": "US Dollar Index",
}

for ticker, desc in test_tickers.items():
    try:
        print(f"\n測試 {ticker} - {desc}")
        stock = yf.Ticker(ticker)
        hist = stock.history(period="5d")
        if not hist.empty:
            latest = hist['Close'].iloc[-1]
            print(f"  ✅ 成功: 最新值 = {latest:.2f}")
        else:
            print(f"  ❌ 無數據")
    except Exception as e:
        print(f"  ❌ 錯誤: {e}")

# 2. 測試 FRED API (如果有 API key)
print("\n\n2. FRED API 測試")
print("-" * 80)
print("FRED API 需要註冊 API key: https://fred.stlouisfed.org/docs/api/api_key.html")
print("主要經濟指標 Series ID:")
print("  - CPI (消費者物價指數): CPIAUCSL")
print("  - PPI (生產者物價指數): PPIACO")
print("  - Federal Funds Rate (聯邦基金利率): DFF")
print("  - CPI Year-over-Year: CPIAUCSL (需計算)")

# 3. 測試通膨相關 ETF
print("\n\n3. 測試通膨相關 ETF/指數")
print("-" * 80)

inflation_tickers = {
    "TIP": "iShares TIPS Bond ETF (抗通膨債券)",
    "VTIP": "Vanguard Short-Term Inflation-Protected Securities",
}

for ticker, desc in inflation_tickers.items():
    try:
        print(f"\n{ticker} - {desc}")
        stock = yf.Ticker(ticker)
        hist = stock.history(period="1mo")
        if not hist.empty:
            latest = hist['Close'].iloc[-1]
            month_ago = hist['Close'].iloc[0]
            change = ((latest - month_ago) / month_ago) * 100
            print(f"  最新價格: ${latest:.2f}")
            print(f"  月變化: {change:+.2f}%")
    except Exception as e:
        print(f"  錯誤: {e}")

# 4. 建議的解決方案
print("\n\n" + "=" * 80)
print("建議的數據獲取方案")
print("=" * 80)
print("""
方案 1: 使用 FRED API (最準確)
  - 優點: 官方數據、最準確、包含歷史數據
  - 缺點: 需要註冊 API key
  - 實作: 使用 requests 調用 FRED API
  
方案 2: 使用 yfinance 的利率指標
  - 優點: 不需要額外 API key
  - 缺點: 只有國債殖利率，沒有直接的 CPI/PPI
  - 實作: 使用 ^IRX (3個月國債) 作為短期利率參考
  
方案 3: 手動更新 + AI 分析
  - 優點: 可以加入 AI 分析和預測
  - 缺點: 需要定期手動更新數據
  - 實作: JSON 文件 + Gemini AI 分析趨勢

建議: 結合方案 1 和 3
  - CPI/PPI: 使用 FRED API 或手動更新
  - Fed Rate: 使用 ^IRX 或手動更新
  - 趨勢分析: 使用 Gemini AI 分析升息/降息循環
""")

print("\n測試完成時間:", datetime.now())
