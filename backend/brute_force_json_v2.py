import json

def brute_force_json_v2():
    try:
        with open("backend/yahoo_class.html", "r", encoding="utf-8") as f:
            html = f.read()
            
        print(f"File size: {len(html)} chars")
        
        # Look for objects containing "regularMarketChangePercent"
        target_key = "regularMarketChangePercent"
        target_sector = "半導體"
        
        # We scan for '{'
        # Heuristic: Find target_key, then look backwards for '{'
        
        indices = []
        start = 0
        while True:
            idx = html.find(target_key, start)
            if idx == -1:
                break
            indices.append(idx)
            start = idx + 1
            
        print(f"Found '{target_key}' at {len(indices)} locations.")
        
        if not indices:
            print("Did not find target key.")
            # Try alternative key
            target_key = "percentChange"
            print(f"Trying '{target_key}'...")
            start = 0
            while True:
                idx = html.find(target_key, start)
                if idx == -1:
                    break
                indices.append(idx)
                start = idx + 1
            print(f"Found '{target_key}' at {len(indices)} locations.")

        if not indices:
             return

        # For each location, find the enclosing object
        for idx in indices:
            # Look backwards for '{'
            found_obj = False
            for i in range(idx, max(0, idx - 5000), -1):
                if html[i] == '{':
                    # Parse forward
                    brace_count = 0
                    in_string = False
                    json_end = -1
                    
                    for j in range(i, min(len(html), i + 10000)):
                        char = html[j]
                        if char == '"' and (j==0 or html[j-1] != '\\'):
                            in_string = not in_string
                        
                        if not in_string:
                            if char == '{':
                                brace_count += 1
                            elif char == '}':
                                brace_count -= 1
                                if brace_count == 0:
                                    json_end = j + 1
                                    break
                    
                    if json_end != -1:
                        try:
                            candidate = html[i:json_end]
                            data = json.loads(candidate)
                            # Check if it's the one we want
                            current_str = str(data)
                            if target_sector in current_str:
                                print(f"\nFound Valid Object at {i}!")
                                print(json.dumps(data, ensure_ascii=False, indent=2)[:1000])
                                found_obj = True
                                return 
                        except:
                            pass
            if found_obj:
                break

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    brute_force_json_v2()
