import httpx
import asyncio
from bs4 import BeautifulSoup

async def test_yahoo_scraping():
    url = "https://tw.stock.yahoo.com/rank/change-up?exchange=TAI"
    
    async with httpx.AsyncClient(
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout=30.0
    ) as client:
        print(f"Fetching: {url}")
        response = await client.get(url)
        print(f"Status: {response.status_code}\n")
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Try all three methods from the implementation
        print("=== Method 1: data-symbol attribute ===")
        symbols = soup.find_all(attrs={'data-symbol': True})
        print(f"Found {len(symbols)} elements with data-symbol")
        for i, symbol in enumerate(symbols[:5]):
            print(f"  {i+1}. {symbol.get('data-symbol')}")
        
        print("\n=== Method 2: CSS selector for quote links ===")
        rows = soup.select('li[class*="List"] a[href*="/quote/"]')
        print(f"Found {len(rows)} links matching selector")
        for i, row in enumerate(rows[:5]):
            href = row.get('href', '')
            code = href.split('/quote/')[-1].split('.')[0] if '/quote/' in href else ''
            print(f"  {i+1}. href={href}, code={code}")
       
        print("\n=== Method 3: All quote links ===")
        links = soup.find_all('a', href=True)
        quote_links = [l for l in links if '/quote/' in l.get('href', '')]
        print(f"Found {len(quote_links)} links with /quote/")
        for i, link in enumerate(quote_links[:10]):
            href = link.get('href', '')
            code = href.split('/quote/')[-1].split('.')[0] if '/quote/' in href else ''
            print(f"  {i+1}. href={href}, code={code}, text={link.get_text()[:20]}")
        
        # Save HTML for manual inspection
        with open('yahoo_gainers_page.html', 'w', encoding='utf-8') as f:
            f.write(response.text)
        print("\n✓ Saved HTML to yahoo_gainers_page.html for inspection")

asyncio.run(test_yahoo_scraping())
