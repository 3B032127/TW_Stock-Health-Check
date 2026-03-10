import asyncio
from backend.services.finmind import FinMindClient
from datetime import datetime, timedelta

async def main():
    client = FinMindClient()
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    
    print("Testing 1101 (台泥)...")
    per_1101 = await client.fetch_per("1101", start_date, end_date)
    print(f"1101 last 3 days of data: {per_1101[-3:] if per_1101 else 'No data'}")
    
    print("\nTesting 1802 (台玻)...")
    per_1802 = await client.fetch_per("1802", start_date, end_date)
    print(f"1802 last 3 days of data: {per_1802[-3:] if per_1802 else 'No data'}")
    
    await client.close()

if __name__ == "__main__":
    asyncio.run(main())
