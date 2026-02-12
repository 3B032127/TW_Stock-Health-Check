import requests
import json

def test_api():
    base_url = "https://tw.stock.yahoo.com/_td-stock/api/resource/StockServices.getClassQuotesList;exchange=TAI"
    # Also try just getting listed sectors
    
    # Try 1: getClassQuotesList
    print("Testing getClassQuotesList...")
    extract_data(base_url)
    
    # Try 2: getClasses (might be the navigation list)
    # print("\nTesting getClasses...")
    # extract_data("https://tw.stock.yahoo.com/_td-stock/api/resource/StockServices.getClasses;exchange=TAI")

def extract_data(url):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    try:
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print("Success! Response is JSON.")
                # print(str(data)[:500])
                
                # Check for sector data
                # Usually in 'list' or similar
                if isinstance(data, list):
                    print(f"Got list of {len(data)} items.")
                    print(data[0])
                elif 'data' in data:
                    print(f"Got data field.")
                    print(str(data['data'])[:500])
                elif 'list' in data:
                     print(f"Got list field.")
                     print(str(data['list'])[:500])
                     
            except json.JSONDecodeError:
                print("Response is not JSON.")
                print(response.text[:200])
        else:
            print("Request failed.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_api()
