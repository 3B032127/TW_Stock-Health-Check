import httpx
import asyncio
import json

async def test_rankings_api():
    async with httpx.AsyncClient() as client:
        print("Testing gainers API...")
        resp = await client.get('http://localhost:8000/api/v1/market/rankings/gainers?limit=5')
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(json.dumps(data, indent=2, ensure_ascii=False))
        
        print("\n\nTesting losers API...")
        resp = await client.get('http://localhost:8000/api/v1/market/rankings/losers?limit=5')
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(json.dumps(data, indent=2, ensure_ascii=False))

asyncio.run(test_rankings_api())
