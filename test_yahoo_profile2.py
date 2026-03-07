import httpx
from bs4 import BeautifulSoup
import asyncio

async def fetch_html():
    url = "https://tw.stock.yahoo.com/quote/2330.TW/profile"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    async with httpx.AsyncClient(headers=headers, timeout=10.0) as client:
        response = await client.get(url)
        with open("yahoo_profile.html", "w", encoding="utf-8") as f:
            f.write(response.text)
        print("Saved to yahoo_profile.html")

if __name__ == "__main__":
    asyncio.run(fetch_html())
