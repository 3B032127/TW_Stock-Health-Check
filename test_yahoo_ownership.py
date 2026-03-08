import asyncio
import httpx
from bs4 import BeautifulSoup

async def test():
    url = "https://tw.stock.yahoo.com/quote/2330.TW/profile"
    async with httpx.AsyncClient(headers={'User-Agent': 'Mozilla/5.0'}) as client:
        resp = await client.get(url)
        soup = BeautifulSoup(resp.text, 'html.parser')
        texts = list(soup.stripped_strings)
        for i, t in enumerate(texts):
            if "持股" in t or "外資" in t or "董監" in t or "投信" in t:
                # Print the context around this word
                print("Found:", texts[max(0, i-2):min(len(texts), i+3)])

if __name__ == "__main__":
    asyncio.run(test())
