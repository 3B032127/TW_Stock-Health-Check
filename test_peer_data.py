import httpx
import asyncio
import json

async def test_peers(stock_id):
    url = f"http://localhost:8000/api/v1/stock/{stock_id}/peers"
    print(f"Testing {url}...")
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                print(f"FAILED: Status code {resp.status_code}")
                print(resp.text)
                return
            
            result = resp.json()
            if result["status"] != "success":
                print(f"FAILED: API returned error: {result.get('message')}")
                return
            
            data = result["data"]
            peers = data["peers"]
            industry = data["industry"]
            avg = data["industryAverage"]
            
            print(f"Industry: {industry}")
            print(f"Total peers returned: {len(peers)}")
            
            if not peers:
                print("FAILED: No peers returned")
                return
            
            # 1. Check target first
            first_peer = peers[0]
            if first_peer["id"] != stock_id:
                print(f"FAILED: First peer is {first_peer['id']}, expected {stock_id}")
            else:
                print(f"SUCCESS: Target stock {stock_id} is first.")
            
            # 2. Check sorting of others by marketCap
            others = peers[1:]
            if others:
                mc_list = [p.get("marketCap", 0) for p in others]
                is_sorted = mc_list == sorted(mc_list, reverse=True)
                if is_sorted:
                    print(f"SUCCESS: Peers sorted by marketCap descending: {mc_list}")
                else:
                    print(f"FAILED: Peers NOT sorted by marketCap: {mc_list}")
            
            # 3. Check fields
            required_fields = ["id", "name", "price", "marketCap", "peRatio", "pbRatio", "dividendYield", "psRatio"]
            missing_fields = [f for f in required_fields if f not in first_peer]
            if missing_fields:
                print(f"FAILED: Missing fields in peer data: {missing_fields}")
            else:
                print("SUCCESS: All required fields present.")
            
            # 4. Check industry average
            missing_avg_fields = [f for f in required_fields if f not in avg and f != "id" and f != "name"]
            if missing_avg_fields:
                print(f"FAILED: Missing fields in industry average: {missing_avg_fields}")
            else:
                print("SUCCESS: Industry average contains required metric fields.")

    except Exception as e:
        print(f"ERROR: {str(e)}")

async def main():
    # Test for different industries
    await test_peers("2330") # Semiconductor
    print("-" * 20)
    await test_peers("2881") # Finance
    print("-" * 20)
    await test_peers("2504") # Construction

if __name__ == "__main__":
    asyncio.run(main())
