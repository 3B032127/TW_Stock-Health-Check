import yfinance as yf

# Test ^TNX to see what Yahoo Finance actually returns
tnx = yf.Ticker("^TNX")
hist = tnx.history(period="5d")

print("^TNX Historical Data:")
print(hist[['Close']])
print(f"\nLatest Close: {hist['Close'].iloc[-1]}")
print(f"Previous Close: {hist['Close'].iloc[-2]}")
