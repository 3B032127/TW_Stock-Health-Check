"""
測試檢查 isLimitUp 和 isLimitDown 欄位
"""
import asyncio
import sys
sys.path.append('backend')

from services.yahoo_crawler import YahooStockCrawler

async def test_limit_detection():
    crawler = YahooStockCrawler()
    
    print("Testing limit up/down detection...")
    print("\nFetching losers...")
    losers = await crawler.get_top_losers(5)
    
    for i, stock in enumerate(losers, 1):
        limit_status = ""
        if stock.get('isLimitDown'):
            limit_status = " 🟢 [跌停]"
        elif stock.get('isLimitUp'):
            limit_status = " 🔴 [漲停]"
        
        print(f"{i}. {stock['id']} {stock['name']}: "
              f"${stock['price']} ({stock['changePercent']:+.2f}%){limit_status}")
        print(f"   isLimitUp: {stock.get('isLimitUp', False)}, "
              f"isLimitDown: {stock.get('isLimitDown', False)}")
    
    print("\n" + "="*60)
    print("Fetching gainers...")
    gainers = await crawler.get_top_gainers(5)
    
    for i, stock in enumerate(gainers, 1):
        limit_status = ""
        if stock.get('isLimitUp'):
            limit_status = " 🔴 [漲停]"
        elif stock.get('isLimitDown'):
            limit_status = " 🟢 [跌停]"
        
        print(f"{i}. {stock['id']} {stock['name']}: "
              f"${stock['price']} ({stock['changePercent']:+.2f}%){limit_status}")
        print(f"   isLimitUp: {stock.get('isLimitUp', False)}, "
              f"isLimitDown: {stock.get('isLimitDown', False)}")
    
    await crawler.close()

asyncio.run(test_limit_detection())
