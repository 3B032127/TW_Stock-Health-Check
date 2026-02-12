import requests

def check_raw_html():
    url = "https://tw.stock.yahoo.com/class"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.encoding = 'utf-8'
        text = response.text
        
        keywords = ["漲跌幅", "成交值", "上市類股", "半導體", "傳產"]
        
        print(f"Total Content Length: {len(text)}")
        
        for kw in keywords:
            if kw in text:
                print(f"Found '{kw}' at index {text.find(kw)}")
                # Print context around the keyword
                start = max(0, text.find(kw) - 100)
                end = min(len(text), text.find(kw) + 200)
                print(f"Context: {text[start:end]}")
                print("-" * 50)
            else:
                print(f"Did NOT find '{kw}'")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_raw_html()
