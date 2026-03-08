import yfinance as yf
import json

def test_yfinance():
    ticker = yf.Ticker("2330.TW")
    print("info:", ticker.info.get('heldPercentInsiders'), ticker.info.get('heldPercentInstitutions'))
    print("major_holders:")
    try:
        print(ticker.major_holders)
    except Exception as e:
        print("major_holders error:", e)
        
    print("institutional_holders:")
    try:
        print(ticker.institutional_holders)
    except Exception as e:
        print("institutional_holders error:", e)

if __name__ == "__main__":
    test_yfinance()
