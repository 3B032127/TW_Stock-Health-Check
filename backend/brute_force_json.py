import json

def brute_force_json():
    try:
        with open("backend/yahoo_class.html", "r", encoding="utf-8") as f:
            html = f.read()
            
        print(f"File size: {len(html)} chars")
        
        # We are looking for an object that contains "半導體" AND "changePercent" (or similar)
        # Optimization: Find "半導體" first
        target = "半導體"
        indices = []
        start = 0
        while True:
            idx = html.find(target, start)
            if idx == -1:
                break
            indices.append(idx)
            start = idx + 1
            
        print(f"Found '{target}' at {len(indices)} locations: {indices}")
        
        # For each location, try to find the surrounding JSON object
        for idx in indices:
            # Look backwards for a '{' that begins the object
            # This is heuristic. We go back max N chars.
            search_limit = 5000 
            found_obj = False
            
            for i in range(idx, max(0, idx - search_limit), -1):
                if html[i] == '{':
                    # Try to parse from i
                    # We need to find the matching '}'
                    # This is hard without a parser.
                    # Let's try to grab a chunk and see if it looks like JSON structure
                    chunk = html[i:idx+200]
                    # print(f"Checking chunk at {i}: {chunk[:50]}...")
                    
                    # Assume valid JSON doesn't have unconnected braces inside strings too often
                    # Let's count braces forward from i
                    brace_count = 0
                    quote_char = None
                    escape = False
                    
                    json_end = -1
                    for j in range(i, len(html)):
                        char = html[j]
                        
                        if escape:
                            escape = False
                            continue
                            
                        if char == '\\':
                            escape = True
                            continue
                            
                        if quote_char:
                            if char == quote_char:
                                quote_char = None
                        else:
                            if char == '"' or char == "'":
                                quote_char = char
                            elif char == '{':
                                brace_count += 1
                            elif char == '}':
                                brace_count -= 1
                                if brace_count == 0:
                                    json_end = j + 1
                                    break
                    
                    if json_end != -1:
                        candidate = html[i:json_end]
                        try:
                            data = json.loads(candidate)
                            # Check if it contains our target
                            # We know it contains "半導體" string, but does it contain meaningful data?
                            print(f"\nSuccessfully parsed object at index {i} (len {len(candidate)})")
                            
                            # Inspect the object
                            if isinstance(data, dict):
                                keys = list(data.keys())
                                print(f"Keys: {keys}")
                                if "price" in str(data) or "change" in str(data) or "percent" in str(data).lower():
                                    print("Object seems to contain market data!")
                                    print(str(data)[:500])
                                    found_obj = True
                                    return # Stop if found a good one
                        except:
                            pass
                            
            if found_obj:
               break

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    brute_force_json()
