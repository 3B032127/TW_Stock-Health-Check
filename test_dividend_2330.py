import httpx
import asyncio
from bs4 import BeautifulSoup

async def fetch_dividends():
    url = "https://tw.stock.yahoo.com/quote/2330/dividend"
    async with httpx.AsyncClient(headers={'User-Agent': 'Mozilla/5.0'}) as client:
        response = await client.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        rows = soup.find_all('li')
        for row in rows:
            texts = list(row.stripped_strings)
            if any(str(y) in texts for y in range(2020, 2026)) and "股利所屬期間" not in texts:
                print(texts)

if __name__ == "__main__":
    asyncio.run(fetch_dividends())
