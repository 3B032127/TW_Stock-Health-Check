import httpx
from bs4 import BeautifulSoup
import asyncio

async def test_desc():
    url = "https://tw.stock.yahoo.com/quote/1101.TW/profile"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    async with httpx.AsyncClient(headers=headers) as client:
        response = await client.get(url)
        html = response.text
        
        print("HTML length:", len(html))
        
        import re
        # Find the title first to get Chinese name
        match_title = re.search(r'<title>(.*?)</title>', html)
        if match_title:
            print("Title:", match_title.group(1))

        # Look for 公司簡介
        match = re.search(r'公司簡介.*?<div[^>]*>(.*?)</div>', html, re.DOTALL)
        if match:
            print("Regex 1 matched:", match.group(1)[:100])
        else:
            # Maybe it's not a div?
            match2 = re.search(r'公司簡介.*?<p[^>]*>(.*?)</p>', html, re.DOTALL)
            if match2:
                print("Regex 2 matched:", match2.group(1)[:100])
            else:
                # Let's search for some known content
                soup = BeautifulSoup(html, 'html.parser')
                elements = soup.find_all(string=re.compile("公司簡介"))
                for el in elements:
                    print("Found '公司簡介' at:", el.parent.name, el.parent.attrs)
                    # Get next siblings or something
                    try:
                        print("Next text:", el.parent.find_next_sibling().text[:100])
                    except:
                        pass
                
                # Check TSMC just in case
                if "台泥" in html:
                    print("Found 台泥 in HTML")

asyncio.run(test_desc())
