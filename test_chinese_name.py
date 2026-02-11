"""
測試從Yahoo個股頁面獲取中文公司名稱
"""
import httpx
import asyncio
from bs4 import BeautifulSoup

async def test_get_chinese_name():
    stock_id = "2330"
    url = f"https://tw.stock.yahoo.com/quote/{stock_id}.TW"
    
    async with httpx.AsyncClient(
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'},
        timeout=30.0
    ) as client:
        response = await client.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 方法1: 查找 h1 標題
        h1 = soup.find('h1')
        if h1:
            print(f"H1: {h1.get_text(strip=True)}")
        
        # 方法2: 查找包含公司名稱的 meta 標籤
        og_title = soup.find('meta', property='og:title')
        if og_title:
            print(f"OG Title: {og_title.get('content')}")
        
        # 方法3: 查找 title 標籤
        title = soup.find('title')
        if title:
            print(f"Title: {title.get_text(strip=True)}")
        
        # 保存HTML以供檢查
        with open('yahoo_stock_page.html', 'w', encoding='utf-8') as f:
            f.write(response.text)
        print("\n已保存HTML到 yahoo_stock_page.html")

asyncio.run(test_get_chinese_name())
