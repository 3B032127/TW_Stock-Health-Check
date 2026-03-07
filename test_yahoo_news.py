import httpx
from bs4 import BeautifulSoup
import json
import asyncio

async def get_news(stock_id):
    url = f"https://tw.stock.yahoo.com/quote/{stock_id}.TW/news"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, follow_redirects=True)
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Yahoo finance news are usually in a list
        news_items = []
        for a_tag in soup.select("a.story-title, h3 a, a[data-test-locator='mega-item-title']"):
            title = a_tag.get_text(strip=True)
            href = a_tag.get("href")
            if not href.startswith("http"):
                href = "https://tw.stock.yahoo.com" + href
            if title and href and title not in [n["title"] for n in news_items]:
                news_items.append({"title": title, "url": href})
                
        # Time usually in a span inside the same container
        print(f"Found {len(news_items)} news items")
        for n in news_items[:5]:
            print(n)

asyncio.run(get_news("2330"))
