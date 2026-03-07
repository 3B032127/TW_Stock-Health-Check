import httpx
import asyncio

async def dl():
    url = 'https://tw.stock.yahoo.com/quote/1101.TW/profile'
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    async with httpx.AsyncClient(headers=headers) as client:
        r = await client.get(url)
        with open('yahoo_1101.html', 'w', encoding='utf-8') as f:
            f.write(r.text)

asyncio.run(dl())
