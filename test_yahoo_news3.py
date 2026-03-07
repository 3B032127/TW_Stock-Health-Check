import httpx
from bs4 import BeautifulSoup
import asyncio

async def get_news(stock_id):
    url = f"https://tw.stock.yahoo.com/quote/{stock_id}.TW/news"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, follow_redirects=True)
        soup = BeautifulSoup(response.text, "html.parser")
        
        news_items = []
        for li in soup.select("li.js-stream-content"):
            a_tag = li.select_one("h3 a")
            if not a_tag:
                continue
            
            title = a_tag.get_text(strip=True)
            href = a_tag.get("href")
            if not href.startswith("http"):
                href = "https://tw.stock.yahoo.com" + href
                
            time_text = ""
            for span in li.select("span"):
                text = span.get_text(strip=True)
                if "前" in text or "202" in text or "/" in text or "週" in text:
                    if len(text) < 15:
                        time_text = text
                        break
            
            if title and href:
                news_items.append({"title": title, "url": href, "publishDate": time_text or "最新"})
                
        print(f"Found {len(news_items)} news items")
        for n in news_items[:5]:
            print(n)

asyncio.run(get_news("2330"))
