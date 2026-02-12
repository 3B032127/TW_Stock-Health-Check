import re

def regex_probe_header():
    try:
        with open("backend/yahoo_class.html", "r", encoding="utf-8") as f:
            html = f.read()
            
        print(f"File size: {len(html)}")
        
        target = "漲跌幅"
        matches = re.finditer(target, html)
        
        for m in matches:
            start = max(0, m.start() - 100)
            end = min(len(html), m.end() + 200)
            context = html[start:end]
            
            print(f"\n--- Context around '{target}' at {m.start()} ---")
            print(context)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    regex_probe_header()
