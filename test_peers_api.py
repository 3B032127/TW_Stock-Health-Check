import asyncio
import httpx
import json

async def test_api():
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            print("Fetching peer comparison for 2330...")
            resp = await client.get("http://localhost:8000/api/v1/stock/2330/peers")
            resp.raise_for_status()
            data = resp.json()
            
            peers = data.get("data", {}).get("peers", [])
            print(f"Total peers returned: {len(peers)}")
            for i, p in enumerate(peers):
                print(f"[{i}] {p['id']} - {p['name']} | MarketCap: {p['marketCap']} | P/E: {p['peRatio']}")
                
        except Exception as e:
            print(f"Test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_api())
