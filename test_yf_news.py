import yfinance as yf
import json

ticker = yf.Ticker("2330.TW")
news = ticker.news
print(json.dumps(news, indent=2, ensure_ascii=False))
