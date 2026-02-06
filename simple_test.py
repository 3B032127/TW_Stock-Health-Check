"""
簡化版測試 - 直接顯示關鍵資訊
"""
import yfinance as yf
from datetime import datetime, timedelta

print("測試 yfinance 即時數據")
print("=" * 60)

# 測試各個指標
tickers = {
    "^TWII": "台灣加權指數",
    "^SOX": "費城半導體指數", 
    "^TNX": "美國10年期公債殖利率",
    "TWD=X": "美元/台幣匯率"
}

today = datetime.now().date()
yesterday = (datetime.now() - timedelta(days=1)).date()

for ticker, name in tickers.items():
    print(f"\n{name} ({ticker}):")
    print("-" * 60)
    
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period="5d")
        
        if hist.empty:
            print("  ❌ 無法抓取數據")
            continue
            
        latest_date = hist.index[-1].date()
        latest_price = hist['Close'].iloc[-1]
        
        print(f"  最新數據日期: {latest_date}")
        print(f"  最新價格: {latest_price:.2f}")
        
        # 檢查數據新鮮度
        if latest_date == today:
            print(f"  ✅ 數據是今天的 ({today})")
        elif latest_date == yesterday:
            print(f"  ⚠️ 數據是昨天的 ({yesterday}) - 可能市場未開盤")
        else:
            days_old = (today - latest_date).days
            print(f"  ❌ 數據已過時 {days_old} 天")
        
        # 顯示最近5天數據
        print(f"\n  最近5天收盤價:")
        for idx, row in hist.tail(5).iterrows():
            print(f"    {idx.date()}: {row['Close']:.2f}")
            
    except Exception as e:
        print(f"  ❌ 錯誤: {e}")

print("\n" + "=" * 60)
print(f"測試完成時間: {datetime.now()}")
