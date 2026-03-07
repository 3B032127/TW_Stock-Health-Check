import asyncio
from backend.services.yahoo_crawler import YahooStockCrawler
import json

async def test():
    crawler = YahooStockCrawler()
    res = await crawler.get_dividend_history("2330")
    print(json.dumps(res, indent=2))
    await crawler.close()

if __name__ == "__main__":
    asyncio.run(test())
