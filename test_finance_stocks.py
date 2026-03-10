import asyncio
from backend.services.finmind import FinMindClient
from backend.services.yahoo_crawler import YahooStockCrawler
from datetime import datetime, timedelta

async def test_stocks():
    stocks = ["5854", "6012", "6004", "2833", "2881"]
    
    finmind = FinMindClient()
    yahoo = YahooStockCrawler()
    
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=60)).strftime("%Y-%m-%d")
    
    with open("test_finance_stocks_output.txt", "w", encoding="utf-8") as f:
        f.write("--- Testing FinMind PER / PBR ---\n")
        for s in stocks:
            res = await finmind.fetch_per(s, start_date, end_date)
            f.write(f"{s}: Got {len(res) if res else 0} records from FinMind\n")
            if res and len(res) > 0:
                f.write(f"   Latest: Price={res[-1].get('close')}, PE={res[-1].get('PER')}\n")
                
        f.write("\n--- Testing Yahoo Finance --- (.TW and .TWO)\n")
        for s in stocks:
            try:
                # Test TW
                info_tw = None
                import yfinance as yf
                ticker_tw = yf.Ticker(f"{s}.TW")
                price_tw = ticker_tw.info.get("regularMarketPrice", 0)
                
                # Test TWO
                ticker_two = yf.Ticker(f"{s}.TWO")
                price_two = ticker_two.info.get("regularMarketPrice", 0)
                
                f.write(f"{s}: yfinance (TW) price: {price_tw}, yfinance (TWO) price: {price_two}\n")
                
            except Exception as e:
                f.write(f"{s}: ValueError: {e}\n")
                
    await finmind.close()
    await yahoo.close()

if __name__ == "__main__":
    asyncio.run(test_stocks())
