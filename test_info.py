import asyncio
from backend.services.finmind import FinMindClient

async def check():
    c = FinMindClient()
    info = await c.fetch_stock_info()
    
    for stock in info:
        if stock.get('stock_id') in ['2881', '5854', '6012', '2833', '2330']:
            print(stock)
            
    await c.close()

if __name__ == "__main__":
    asyncio.run(check())
