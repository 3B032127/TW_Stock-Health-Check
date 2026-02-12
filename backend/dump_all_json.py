import json

def dump_all_json():
    try:
        with open("backend/yahoo_class.html", "r", encoding="utf-8") as f:
            html = f.read()
            
        objects = []
        start = 0
        while True:
            idx = html.find('{', start)
            if idx == -1:
                break
            
            # Try to parse from here
            brace_count = 0
            in_string = False
            json_end = -1
            
            for j in range(idx, min(len(html), idx + 20000)):
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
                    candidate = html[idx:json_end]
                    # Optimization: Only load if it looks promising (e.g. has keys)
                    if ':' in candidate:
                        data = json.loads(candidate)
                        objects.append(data)
                        # Skip past this object
                        start = json_end
                        continue
                except:
                    pass
            
            start = idx + 1
            
        print(f"Found {len(objects)} JSON objects.")
        
        # Save to file
        with open("backend/all_json_objects.json", "w", encoding="utf-8") as f:
            json.dump(objects, f, ensure_ascii=False, indent=2)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    dump_all_json()
