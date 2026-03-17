import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
import asyncio
from backend.services.finmind import FinMindClient

async def dev_test():
    client = FinMindClient()
    data = await client.fetch_stock_info()
    if data:
        print("Keys of first stock info:", data[0].keys())
        print("First stock info:", data[0])
    await client.close()

if __name__ == "__main__":
    asyncio.run(dev_test())
