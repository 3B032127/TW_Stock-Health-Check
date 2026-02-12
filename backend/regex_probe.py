import re

def regex_probe():
    try:
        with open("backend/yahoo_class.html", "r", encoding="utf-8") as f:
            html = f.read()
            
        print(f"File size: {len(html)}")
        
        # Search for "半導體"
        matches = re.finditer(r"半導體", html)
        
        for m in matches:
            start = m.start()
            end = min(len(html), start + 500)
            context = html[start:end]
            
            print(f"\n--- Match at {start} ---")
            print(context)
            
            # Check for numbers nearby
            # Look for patterns like "change":1.23 or similar
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    regex_probe()
