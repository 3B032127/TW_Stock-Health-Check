import sys
sys.path.insert(0, 'F:/taiwan-stock-health-check')

import asyncio
from backend.services.yahoo_crawler import YahooStockCrawler

async def test_crawler():
    crawler = YahooStockCrawler()
    
    print("Testing gainers...")
    gainers = await crawler.get_top_gainers(limit=5)
    print(f"✓ Found {len(gainers)} gainers:")
    for i, stock in enumerate(gainers, 1):
        print(f"  {i}. {stock['id']} {stock['name']}: ${stock['price']} ({stock['changePercent']:+.2f}%)")
    
    print("\nTesting losers...")
    losers = await crawler.get_top_losers(limit=5)
    print(f"✓ Found {len(losers)} losers:")
    for i, stock in enumerate(losers, 1):
        print(f"  {i}. {stock['id']} {stock['name']}: ${stock['price']} ({stock['changePercent']:+.2f}%)")
    
    await crawler.close()

asyncio.run(test_crawler())
