import asyncio
from backend.services.yahoo_crawler import YahooStockCrawler

async def main():
    crawler = YahooStockCrawler()
    try:
        profile = await crawler.get_company_profile("1101")
        import json
        print(json.dumps(profile, indent=2, ensure_ascii=False))
    finally:
        await crawler.close()

asyncio.run(main())
