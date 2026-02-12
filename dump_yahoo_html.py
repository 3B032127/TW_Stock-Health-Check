import requests
from bs4 import BeautifulSoup

def dump_yahoo_html():
    url = "https://tw.stock.yahoo.com/s/tse.php"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        with open("yahoo_debug.html", "w", encoding="utf-8") as f:
            f.write(response.text)
            
        print("Done dumping HTML.")

    except Exception as e:
        print(f"Error scraping Yahoo Finance: {e}")

if __name__ == "__main__":
    dump_yahoo_html()
