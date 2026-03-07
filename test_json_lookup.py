import json
import re

with open('yahoo_json.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# text is something like {"context":{...}}
try:
    data = json.loads(text)
    
    # We want to search the JSON for the strings "公司簡介" or "董事長"
    def find_keys(obj, target, path=""):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if isinstance(v, str) and target in v:
                    print(f"Found {target} at {path}.{k}: {v[:100]}")
                find_keys(v, target, path + "." + k)
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                find_keys(item, target, f"{path}[{i}]")

    print("\n--- Searching for 董事長 ---")
    find_keys(data, "辜公怡")
    
    print("\n--- Searching for 簡介 ---")
    find_keys(data, "生產及銷售")

except Exception as e:
    print("JSON parse error:", e)
    
    # If it's not valid JSON (because the regex captured too much or too little), let's just use regex on the raw text
    print("\nFallback to string search")
    idx = text.find("辜公怡")
    if idx != -1:
        print("Found around:", text[idx-100:idx+100])
