import requests

def test_api():
    print("Testing 2881 peers API...")
    try:
        res = requests.get("http://127.0.0.1:8000/api/v1/stock/2881/peers", timeout=30)
        data = res.json()
        peers = data.get("data", {}).get("peers", [])
        
        print(f"Total peers returned: {len(peers)}")
        for i, p in enumerate(peers):
            print(f"[{i+1}] {p['id']} - {p['name']} | Price: {p['price']}")
            
    except Exception as e:
        print(f"Error calling API: {e}")

if __name__ == "__main__":
    test_api()
