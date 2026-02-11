import httpx
from bs4 import BeautifulSoup
import asyncio
from typing import List, Dict, Optional

async def test_yahoo_html_parsing():
    """測試Yahoo頁面HTML結構，找出中文名稱位置"""
    url = "https://tw.stock.yahoo.com/rank/change-up?exchange=TAI"
    
    async with httpx.AsyncClient(
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout=30.0
    ) as client:
        response = await client.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 查找包含股票資訊的行
        rows = soup.select('li[class*="List"]')
        print(f"找到 {len(rows)} 個 list items")
        
        for i, row in enumerate(rows[:3]):
            print(f"\n=== Row {i+1} ===")
            # 查找所有連結和文字
            links = row.find_all('a')
            for link in links:
                href = link.get('href', '')
                text = link.get_text(strip=True)
                print(f"Link: {text} -> {href}")
            
            # 查找所有 span 元素
            spans = row.find_all('span')
            for span in spans:
                print(f"Span: {span.get_text(strip=True)} (class: {span.get('class')})")

asyncio.run(test_yahoo_html_parsing())
