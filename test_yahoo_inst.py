import asyncio
import httpx
from bs4 import BeautifulSoup

async def test():
    for ext in ["institutional-investors", "shareholder"]:
        url = f"https://tw.stock.yahoo.com/quote/2330.TW/{ext}"
        print(f"Testing {url}...")
        async with httpx.AsyncClient(headers={'User-Agent': 'Mozilla/5.0'}) as client:
            resp = await client.get(url)
            soup = BeautifulSoup(resp.text, 'html.parser')
            texts = list(soup.stripped_strings)
            for i, t in enumerate(texts):
                if "%" in t or "比" in t or "外資" in t or "投信" in t:
                    print("Found:", texts[max(0, i-2):min(len(texts), i+3)])

if __name__ == "__main__":
    asyncio.run(test())
