import json

def parse_root_app():
    try:
        with open("backend/yahoo_class.html", "r", encoding="utf-8") as f:
            html = f.read()
            
        start_marker = "root.App.main = "
        start_idx = html.find(start_marker)
        
        if start_idx == -1:
            print("Could not find root.App.main")
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
            print("Could not parse JSON object boundaries.")
            return
            
        json_str = html[json_start:json_end]
        
        try:
            data = json.loads(json_str)
            print("Successfully parsed root.App.main!")
            print("Top-level keys:", list(data.keys()))
            
            # Deep search for "半導體"
            def find_path(obj, target, path=""):
                if isinstance(obj, dict):
                    for k, v in obj.items():
                        if isinstance(v, (dict, list)):
                            find_path(v, target, f"{path}.{k}")
                        elif str(v) == target:
                            print(f"\nFound '{target}' at {path}.{k}")
                            # Inspect the parent to see if it has change/volume data
                            print(f"Parent keys: {list(obj.keys())}")
                            
                            # Print relevant data if available
                            to_print = {}
                            for relevant in ["price", "regularMarketPrice", "regularMarketChange", "regularMarketChangePercent", "volume", "turnover", "totalTurnover", "quote"]:
                                if relevant in obj:
                                    to_print[relevant] = obj[relevant]
                            if to_print:
                                print(f"  Data: {to_print}")
                                
                            # Also check if siblings have it (e.g. if this is just name, maybe sibling has value)
                            
                elif isinstance(obj, list):
                    for i, item in enumerate(obj):
                        find_path(item, target, f"{path}[{i}]")

            print("\nSearching for '半導體'...")
            find_path(data, "半導體", "root")
            
        except json.JSONDecodeError as e:
            print(f"JSON Decode Error: {e}")
            print(f"Snippet start: {json_str[:100]}")
            print(f"Snippet end: {json_str[-100:]}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    parse_root_app()
