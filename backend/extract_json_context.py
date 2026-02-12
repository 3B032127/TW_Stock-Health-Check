def extract_context():
    try:
        with open("backend/yahoo_class.html", "r", encoding="utf-8") as f:
            text = f.read()
            
        kw = "漲跌幅"
        idx = text.find(kw)
        if idx != -1:
            start = max(0, idx - 500)
            end = min(len(text), idx + 500)
            print(f"--- Context around {kw} ---")
            print(text[start:end])
        else:
            print(f"Could not find '{kw}' in local file.")
            
        # Also look for where the data might start, e.g. "Semiconductor" data
        kw2 = "半導體"
        # Find matches that are NOT the navigation link.
        # Navigation link was: class="... C($c-link-text)..."
        # We want the data one.
        
        # Actually, let's just look for the start of the JSON.
        # Common patterns: root.App.main = 
        # window.__PRELOADED_STATE__ = 
        
        patterns = ["root.App.main", "window.YAHOO.context", "__PRELOADED_STATE__"]
        for p in patterns:
            if p in text:
                print(f"\nFound pattern: {p}")
                pidx = text.find(p)
                print(text[pidx:pidx+200])

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract_context()
