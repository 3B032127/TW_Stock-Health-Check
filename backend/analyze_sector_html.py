import requests
from bs4 import BeautifulSoup
import json

def analyze_sector_page():
    url = "https://tw.stock.yahoo.com/class"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.encoding = 'utf-8' # Ensure correct encoding for TW characters
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Yahoo Finance tables usually have specific classes. 
        # Let's try to find the main table rows for sectors.
        # Based on common Yahoo TW structures, we look for lists or table rows.
        
        # Try to find elements that look like sector rows
        # Often in 'li' or 'div' with specific class names containing 'List' or 'Row'
        
        # Let's print the first few distinct classes found to help identify structure
        print("Page Title:", soup.title.string if soup.title else "No Title")
        
        # Strategy: Look for specific sector names we know exist to find their container
        known_sectors = ["半導體", "金融保險", "航運業"]
        
        for sector in known_sectors:
            element = soup.find(string=sector)
            if element:
                parent = element.parent
                print(f"\nFound '{sector}' in tag: {parent.name}")
                print(f"Classes: {parent.get('class', [])}")
                
                # Traverse up to find the row container
                row = parent
                for _ in range(5): # Go up a few levels
                    row = row.parent
                    if row:
                        print(f"  Parent ({row.name}): classes={row.get('class', [])}")
                        # If this looks like a row, try to extract other data from it
                        text_content = row.get_text(strip=True, separator='|')
                        print(f"  Row Content: {text_content[:100]}...")
            else:
                print(f"Could not find sector: {sector}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze_sector_page()
