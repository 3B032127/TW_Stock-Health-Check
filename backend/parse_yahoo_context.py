import json
import re

def parse_context():
    try:
        with open("backend/yahoo_class.html", "r", encoding="utf-8") as f:
            html = f.read()
            
        # Extract window.YAHOO.context
        start_marker = "window.YAHOO.context = "
        start_idx = html.find(start_marker)
        
        if start_idx == -1:
            print("Could not find window.YAHOO.context")
            return
            
        # Find connection end
        # It usually ends with "};" or just "}" inside a script tag
        # Let's naive approach: count braces
        
        json_start = start_idx + len(start_marker)
        brace_count = 0
        json_end = -1
        
        for i in range(json_start, len(html)):
            char = html[i]
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    json_end = i + 1
                    break
        
        if json_end == -1:
            print("Could not parse JSON object boundaries.")
            return
            
        json_str = html[json_start:json_end]
        
        try:
            data = json.loads(json_str)
            print("Successfully parsed window.YAHOO.context!")
            
            # Explore structure
            # Looking for "MarketStore" or similar
            dispatcher = data.get("dispatcher", {})
            stores = dispatcher.get("stores", {})
            
            print("Stores:", list(stores.keys()))
            
            # Check specific stores for sector data
            # "ClassQuotesStore" or "MarketStore" are likely candidates
            
            def search_val(obj, key, path=""):
                if isinstance(obj, dict):
                    if key in obj.values():
                        print(f"Found value '{key}' at {path}")
                        print(obj)
                    for k, v in obj.items():
                        search_val(v, key, path + f".{k}")
                elif isinstance(obj, list):
                    for i, item in enumerate(obj):
                        search_val(item, key, path + f"[{i}]")
                        
            # search_val(stores, "半導體") 
            # This might be too verbose. Let's look for known likely stores.
            
            likely_keys = ["ClassQuotesStore", "MarketStore", "SectorStore", "QuoteStore"]
            for k in likely_keys:
                if k in stores:
                    print(f"\n--- Content of {k} ---")
                    store_data = stores[k]
                    # Print first item if it's a list or dict of items
                    print(str(store_data)[:500])
                    
                    # Try to find list of sectors
                    # Often in 'data' or 'list'
                    if 'data' in store_data:
                        print("Found 'data' in store.")
                        print(str(store_data['data'])[:500])

        except json.JSONDecodeError as e:
            print(f"JSON Decode Error: {e}")
            print(f"Snippet: {json_str[:100]}...{json_str[-100:]}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    parse_context()
