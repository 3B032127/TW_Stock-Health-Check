import requests
from bs4 import BeautifulSoup
import re

def scrape_suggested_logic():
    url = "https://tw.stock.yahoo.com/class"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        print(f"Fetching {url}...")
        response = requests.get(url, headers=headers)
        response.encoding = 'utf-8'
        soup = BeautifulSoup(response.text, 'html.parser')
        
        print("Searching for common table classes...")
        # Common Yahoo classes
        classes = [
            'table-body', 'table-row', 'list-item', 
            'Bgc($c-f-hover):h', 'D(f)', 'Jc(sb)',
            'Row', 'List(n)', 'Grid'
        ]
        
        found_something = False
        
        # Try to find rows that contain "半導體"
        # We know "半導體" is in an 'a' tag.
        sector_links = soup.find_all('a', string=re.compile("半導體"))
        
        for link in sector_links:
            print(f"\nFound '半導體' link: {link}")
            # Go up to row
            row = link.parent
            while row and row.name not in ['li', 'div', 'tr']:
                row = row.parent
                
            if row:
                print(f"Row tag: {row.name} Class: {row.get('class')}")
                print(f"Row content: {row.get_text(separator='|', strip=True)}")
                
                # Check for sibling numbers
                # In the previous inspection, it was just text.
                # Use regex to find number-like text in the row
                text = row.get_text(separator=' ', strip=True)
                numbers = re.findall(r'[-+]?\d*\.\d+|[-+]?\d+', text)
                print(f"Numbers found: {numbers}")
                
        # Also try to find a real table
        tables = soup.find_all('div', class_=re.compile("table"))
        print(f"\nFound {len(tables)} 'table' divs.")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    scrape_suggested_logic()
