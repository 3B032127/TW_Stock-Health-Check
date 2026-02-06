"""
測試 yfinance 是否真的在抓取即時數據
"""
import yfinance as yf
from datetime import datetime
import pytz

print("=" * 80)
print("測試 yfinance 即時數據抓取")
print("=" * 80)
print(f"測試時間: {datetime.now()}")
print()

# 測試台灣加權指數
print("1. 測試 ^TWII (台灣加權指數)")
print("-" * 80)
twii = yf.Ticker("^TWII")
hist = twii.history(period="5d")
print(f"抓取到的數據筆數: {len(hist)}")
print(f"最新日期: {hist.index[-1]}")
print(f"最新收盤價: {hist['Close'].iloc[-1]:.2f}")
print(f"前一日收盤價: {hist['Close'].iloc[-2]:.2f}")
print(f"變化: {hist['Close'].iloc[-1] - hist['Close'].iloc[-2]:.2f}")
print("\n完整歷史數據:")
print(hist[['Close', 'Volume']])
print()

# 測試費城半導體指數
print("2. 測試 ^SOX (費城半導體指數)")
print("-" * 80)
sox = yf.Ticker("^SOX")
hist_sox = sox.history(period="5d")
print(f"抓取到的數據筆數: {len(hist_sox)}")
print(f"最新日期: {hist_sox.index[-1]}")
print(f"最新收盤價: {hist_sox['Close'].iloc[-1]:.2f}")
print(f"前一日收盤價: {hist_sox['Close'].iloc[-2]:.2f}")
print(f"變化: {hist_sox['Close'].iloc[-1] - hist_sox['Close'].iloc[-2]:.2f}")
print("\n完整歷史數據:")
print(hist_sox[['Close', 'Volume']])
print()

# 測試美債殖利率
print("3. 測試 ^TNX (美國10年期公債殖利率)")
print("-" * 80)
tnx = yf.Ticker("^TNX")
hist_tnx = tnx.history(period="5d")
print(f"抓取到的數據筆數: {len(hist_tnx)}")
print(f"最新日期: {hist_tnx.index[-1]}")
print(f"最新收盤價: {hist_tnx['Close'].iloc[-1]:.2f}%")
print(f"前一日收盤價: {hist_tnx['Close'].iloc[-2]:.2f}%")
print(f"變化: {hist_tnx['Close'].iloc[-1] - hist_tnx['Close'].iloc[-2]:.2f}")
print("\n完整歷史數據:")
print(hist_tnx[['Close']])
print()

# 測試台幣匯率
print("4. 測試 TWD=X (美元/台幣匯率)")
print("-" * 80)
twd = yf.Ticker("TWD=X")
hist_twd = twd.history(period="5d")
print(f"抓取到的數據筆數: {len(hist_twd)}")
if len(hist_twd) > 0:
    print(f"最新日期: {hist_twd.index[-1]}")
    print(f"最新收盤價: {hist_twd['Close'].iloc[-1]:.2f}")
    if len(hist_twd) > 1:
        print(f"前一日收盤價: {hist_twd['Close'].iloc[-2]:.2f}")
        print(f"變化: {hist_twd['Close'].iloc[-1] - hist_twd['Close'].iloc[-2]:.2f}")
    print("\n完整歷史數據:")
    print(hist_twd[['Close']])
else:
    print("⚠️ 無法抓取 TWD=X 數據")
print()

# 檢查數據是否為今天的
print("=" * 80)
print("數據時效性檢查")
print("=" * 80)
taiwan_tz = pytz.timezone('Asia/Taipei')
now_taiwan = datetime.now(taiwan_tz)
print(f"台灣當前時間: {now_taiwan.strftime('%Y-%m-%d %H:%M:%S %Z')}")

for ticker_name, hist_data in [("^TWII", hist), ("^SOX", hist_sox), ("^TNX", hist_tnx)]:
    if len(hist_data) > 0:
        latest_date = hist_data.index[-1]
        # Convert to timezone-aware datetime for comparison
        if latest_date.tzinfo is None:
            latest_date = pytz.UTC.localize(latest_date)
        
        latest_date_taiwan = latest_date.astimezone(taiwan_tz)
        time_diff = now_taiwan - latest_date_taiwan
        
        print(f"\n{ticker_name}:")
        print(f"  最新數據日期: {latest_date_taiwan.strftime('%Y-%m-%d %H:%M:%S %Z')}")
        print(f"  距離現在: {time_diff.days} 天 {time_diff.seconds // 3600} 小時")
        
        if time_diff.days == 0:
            print(f"  ✅ 數據是今天的")
        elif time_diff.days == 1:
            print(f"  ⚠️ 數據是昨天的（可能市場尚未開盤）")
        else:
            print(f"  ❌ 數據已過時 {time_diff.days} 天")

print("\n" + "=" * 80)
print("結論:")
print("=" * 80)
print("如果看到 '數據是今天的' 或 '數據是昨天的'，表示 yfinance 正常運作")
print("如果所有數據都顯示過時多天，則可能是 yfinance 或 Yahoo Finance API 有問題")
