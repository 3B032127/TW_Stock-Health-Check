import httpx
import asyncio
from bs4 import BeautifulSoup
import json

async def main():
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    # Dividend
    url_div = "https://tw.stock.yahoo.com/quote/1101/dividend"
    res_div = httpx.get(url_div, headers=headers)
    soup_div = BeautifulSoup(res_div.text, 'html.parser')
    
    print("--- Dividend Rows ---")
    rows = soup_div.find_all('li')
    for i, row in enumerate(rows):
        texts = list(row.stripped_strings)
        if len(texts) > 5 and ("2024" in texts or "2023" in texts) and not "股利所屬期間" in texts:
            print(f"Row {i}: {texts}")
        
    # Revenue
    url_rev = "https://tw.stock.yahoo.com/quote/1101/revenue"
    res_rev = httpx.get(url_rev, headers=headers)
    soup_rev = BeautifulSoup(res_rev.text, 'html.parser')
    
    print("\n--- Revenue Rows ---")
    rows2 = soup_rev.find_all('li')
    for i, row in enumerate(rows2):
        texts = list(row.stripped_strings)
        if len(texts) == 2 and "%" in texts[1]:
            print(f"Row {i}: {texts}")

if __name__ == "__main__":
    asyncio.run(main())
