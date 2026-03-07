import httpx
import asyncio
from bs4 import BeautifulSoup

async def main():
    async with httpx.AsyncClient(headers={'User-Agent': 'Mozilla/5.0'}) as client:
        # profile
        res = await client.get("https://tw.stock.yahoo.com/quote/1101/profile")
        soup = BeautifulSoup(res.text, 'html.parser')
        texts = list(soup.stripped_strings)
        
        print("--- Profile Keywords ---")
        for i, t in enumerate(texts):
            if any(k in t for k in ["資本", "發行", "股", "市值"]):
                print(f"[{i}]: {t} -> {texts[i+1] if i+1<len(texts) else ''}")

        # dividend
        res2 = await client.get("https://tw.stock.yahoo.com/quote/1101/dividend")
        soup2 = BeautifulSoup(res2.text, 'html.parser')
        texts2 = list(soup2.stripped_strings)

        print("--- Dividend ---")
        for i, t in enumerate(texts2):
            if "2023" in t or "2024" in t:
                # print a window around it
                start = max(0, i - 2)
                end = min(len(texts2), i + 5)
                print(f"Around {t}: {texts2[start:end]}")
                
        # revenue
        res3 = await client.get("https://tw.stock.yahoo.com/quote/1101/revenue")
        soup3 = BeautifulSoup(res3.text, 'html.parser')
        texts3 = list(soup3.stripped_strings)
        
        print("--- Revenue ---")
        for i, t in enumerate(texts3):
            if "比重" in t or "佔比" in t or "產品" in t:
                start = max(0, i - 1)
                end = min(len(texts3), i + 10)
                print(f"Around {t}: {texts3[start:end]}")

asyncio.run(main())
