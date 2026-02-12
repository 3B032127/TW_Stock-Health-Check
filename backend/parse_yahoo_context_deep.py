import json

def parse_context_deep():
    try:
        with open("backend/yahoo_class.html", "r", encoding="utf-8") as f:
            html = f.read()
            
        start_marker = "window.YAHOO.context = "
        start_idx = html.find(start_marker)
        
        if start_idx == -1:
            return
            
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
            return
            
        json_str = html[json_start:json_end]
        data = json.loads(json_str)
        
        print("Top-level keys:", list(data.keys()))
        
        # Search for "半導體" deep in the object
        def find_path(obj, target, path=""):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    if isinstance(v, (dict, list)):
                        find_path(v, target, f"{path}.{k}")
                    elif str(v) == target:
                        print(f"Found '{target}' at {path}.{k}")
                        # Print generic parent structure
                        print(f"Parent keys: {list(obj.keys())}")
                        if "changePercent" in obj or "price" in obj or "regularMarketChangePercent" in obj:
                             print("Parent has market data!")
                             print(obj)
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    find_path(item, target, f"{path}[{i}]")
                    
        print("\nSearching for '半導體'...")
        find_path(data, "半導體", "root")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    parse_context_deep()
