import requests
from bs4 import BeautifulSoup

def test_yahoo_scraping():
    url = "https://tw.stock.yahoo.com/s/tse.php"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Adjust selectors based on actual page structure
        # Looking for table cells that might contain "成交金額" and "成交張數"
        
        # Print part of the HTML to inspect structure if needed
        # print(soup.prettify()[:1000]) 
        
        # Based on common Yahoo structure, look for specific td elements
        tables = soup.find_all('table')
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                text = row.get_text(strip=True)
                if "成交金額" in text:
                    print(f"Found '成交金額' row: {text}")
                if "成交張數" in text:
                    print(f"Found '成交張數' row: {text}")

    except Exception as e:
        print(f"Error scraping Yahoo Finance: {e}")

if __name__ == "__main__":
    test_yahoo_scraping()
