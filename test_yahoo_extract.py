import re
import json

with open("yahoo_profile.html", "r", encoding="utf-8") as f:
    text = f.read()

# Look for window.App.context or similar
match = re.search(r'window\.App\.context\s*=\s*({.*?});</script>', text)
if match:
    data = json.loads(match.group(1))
    # We can dump the keys or try to find "2330.TW"
    with open("yahoo_profile_data.json", "w", encoding="utf-8") as out:
        json.dump(data, out, ensure_ascii=False, indent=2)
    print("Found window.App.context and saved to yahoo_profile_data.json")
else:
    match2 = re.search(r'root\.App\.main\s*=\s*({.*?});', text)
    if match2:
        data = json.loads(match2.group(1))
        with open("yahoo_profile_data.json", "w", encoding="utf-8") as out:
            json.dump(data, out, ensure_ascii=False, indent=2)
        print("Found root.App.main and saved")
    else:
        print("No script data found.")
