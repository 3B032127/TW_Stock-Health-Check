import httpx
from bs4 import BeautifulSoup
import asyncio

async def test_desc():
    url = "https://tw.stock.yahoo.com/quote/1101.TW/profile"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        html = response.text
        
        soup = BeautifulSoup(html, 'html.parser')
        
        # 尋找公司簡介
        # In Yahoo Finance TW, the company description is usually under a section.
        # Let's try to find text block after "公司簡介"
        
        print("HTML length:", len(html))
        
        import re
        match = re.search(r'公司簡介.*?<div[^>]*>(.*?)</div>', html, re.DOTALL)
        if match:
            print("Regex 1 matched:", match.group(1)[:100])
            
        # Or let's look for specific div
        # Usually it's in a div with some classes. Let's dump all text that might match.
        texts = soup.find_all(string=re.compile("台灣水泥股份有限公司"))
        print("Found texts with '台灣水泥':", [t.parent for t in texts])

asyncio.run(test_desc())
