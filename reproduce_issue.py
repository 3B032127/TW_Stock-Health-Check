import yfinance as yf

def check_taiex_volume():
    print("Fetching ^TWII data from yfinance...")
    ticker = yf.Ticker("^TWII")
    history = ticker.history(period="5d")
    print(history)
    
    if not history.empty:
        latest = history.iloc[-1]
        print(f"\nLatest Data ({history.index[-1]}):")
        print(f"Volume: {latest.get('Volume', 'N/A')}")
    else:
        print("No data fetched.")

if __name__ == "__main__":
    check_taiex_volume()
