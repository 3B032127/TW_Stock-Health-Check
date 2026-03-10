import asyncio
from backend.main import read_stock_peers

async def main():
    print("Testing read_stock_peers for 2330...")
    result = await read_stock_peers("2330")
    print(result)

if __name__ == "__main__":
    asyncio.run(main())
