import yfinance as yf

ticker = yf.Ticker("1101.TW")
info = ticker.info

print("--- Info ---")
shares = info.get('sharesOutstanding')
print("Shares Outstanding:", shares)
if shares:
    print("Capital (TWD):", shares * 10)

print("\n--- Dividends ---")
print(ticker.dividends.tail(10))

print("\n--- Financials (Revenue) ---")
print(ticker.financials)
