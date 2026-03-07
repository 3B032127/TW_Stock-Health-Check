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
        # Find all stream items
        for li in soup.select("li.js-stream-content"):
            a_tag = li.select_one("h3 a")
            if not a_tag:
                continue
            
            title = a_tag.get_text(strip=True)
            href = a_tag.get("href")
            if not href.startswith("http"):
                href = "https://tw.stock.yahoo.com" + href
                
            # Find time
            time_span = li.select_one("div.C\(#959595\) span:nth-of-type(2), span.C\(#959595\).Fz\(12px\)")
            # Alternative finding: look for any span containing '分鐘前', '小時前', '月' etc
            time_text = ""
            for span in li.select("span"):
                text = span.get_text(strip=True)
                if "前" in text or "20" in text or "/" in text or "週" in text:
                    if len(text) < 15 and span.name == "span":
                        time_text = text
                        break
            
            if title and href:
                news_items.append({"title": title, "url": href, "publishDate": time_text})
                
        print(f"Found {len(news_items)} news items")
        for n in news_items[:5]:
            print(n)

asyncio.run(get_news("2330"))
