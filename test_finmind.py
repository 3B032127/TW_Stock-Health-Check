import asyncio
from backend.services.finmind import FinMindClient

async def test_fetch():
    client = FinMindClient()
    try:
        data = await client.fetch_stock_info()
        print("Success:", type(data), len(data) if data else "No data")
        if data and isinstance(data, list):
            print(data[:3])
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        await client.close()

if __name__ == "__main__":
    asyncio.run(test_fetch())
