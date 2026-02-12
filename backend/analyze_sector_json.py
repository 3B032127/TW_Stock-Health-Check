import requests
from bs4 import BeautifulSoup
import json
import re

def analyze_sector_json():
    url = "https://tw.stock.yahoo.com/class"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.encoding = 'utf-8'
        soup = BeautifulSoup(response.text, 'html.parser')
        
        print("Searching for embedded JSON...")
        
        # Look for script tags
        scripts = soup.find_all('script')
        found_data = False
        
        for script in scripts:
            if script.string:
                # Check for common patterns like "root.App.main" or "context"
                if "root.App.main" in script.string or "context" in script.string:
                    # Try to extract the JSON object
                    # Usually it's like: root.App.main = {...};
                    match = re.search(r'root\.App\.main\s*=\s*({.*?});', script.string)
                    if match:
                        json_str = match.group(1)
                        try:
                            data = json.loads(json_str)
                            print("Found 'root.App.main' JSON data!")
                            
                            # Navigate through the JSON structure to find sector data
                            # This structure varies, so we'll print keys to explore
                            context = data.get('context', {})
                            dispatcher = context.get('dispatcher', {})
                            stores = dispatcher.get('stores', {})
                            
                            print("Stores keys:", list(stores.keys()))
                            
                            # Often data is in 'MarketStore' or similar
                            # Let's search recursively for 'Semiconductor' or '半導體' in the values
                            search_key = "半導體"
                            
                            def find_value(obj, key_to_find, path=""):
                                if isinstance(obj, dict):
                                    for k, v in obj.items():
                                        if isinstance(v, (dict, list)):
                                            find_value(v, key_to_find, path + f".{k}")
                                        elif str(v) == key_to_find:
                                            print(f"Found '{key_to_find}' at path: {path}.{k}")
                                            # Print the parent object to see context
                                            print(f"Parent Data: {obj}")
                                elif isinstance(obj, list):
                                    for i, item in enumerate(obj):
                                        find_value(item, key_to_find, path + f"[{i}]")

                            print(f"Searching for '{search_key}' in stores...")
                            find_value(stores, search_key)
                            
                            found_data = True
                            break
                        except json.JSONDecodeError as e:
                            print(f"JSON Decode Error: {e}")
                            
        if not found_data:
            print("Could not find embedded 'root.App.main' JSON.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze_sector_json()
