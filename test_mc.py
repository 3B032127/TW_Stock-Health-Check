import asyncio
import yfinance as yf
import time

async def get_market_cap(sid):
    try:
        ticker = yf.Ticker(f"{sid}.TW")
        info = await asyncio.to_thread(lambda: ticker.info)
        price = info.get('previousClose') or info.get('regularMarketPreviousClose')
        shares = info.get('sharesOutstanding')
        if price and shares:
            return (price * shares)
        return info.get('marketCap', 0)
    except:
        return 0

async def main():
    # Simulate an industry with 80 stocks
    sids = [str(2300 + i) for i in range(80)]
    start = time.time()
    tasks = [get_market_cap(sid) for sid in sids]
    results = await asyncio.gather(*tasks)
    print(f"Fetched {len(results)} market caps in {time.time() - start:.2f} seconds")
    valid = [r for r in results if r > 0]
    print(f"Valid results: {len(valid)}")

if __name__ == "__main__":
    asyncio.run(main())
