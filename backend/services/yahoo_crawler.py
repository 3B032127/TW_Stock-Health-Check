import httpx
from bs4 import BeautifulSoup
import asyncio
from typing import List, Dict, Optional
from .finmind import FinMindClient
from datetime import datetime, timedelta


class YahooStockCrawler:
    """Yahoo 台股排行榜爬蟲服務"""
    
    GAINERS_URL = "https://tw.stock.yahoo.com/rank/change-up?exchange=TAI"
    LOSERS_URL = "https://tw.stock.yahoo.com/rank/change-down?exchange=TAI"
    
    def __init__(self):
        self.client = httpx.AsyncClient(
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout=60.0  # 增加超時時間以適應中文名稱抓取
        )
    
    async def scrape_ranking_page(self, url: str, limit: int = 10) -> List[str]:
        """
        爬取排行榜頁面，提取股票代碼
        
        Args:
            url: 排行榜頁面 URL
            limit: 要抓取的股票數量（預設10）
            
        Returns:
            股票代碼列表
        """
        try:
            response = await self.client.get(url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Yahoo 股市排行榜的股票代碼通常在特定的 HTML 結構中
            # 尋找包含股票代碼的元素
            stock_codes = []
            
            # 方法1: 尋找 data-symbol 屬性
            symbols = soup.find_all(attrs={'data-symbol': True})
            for symbol in symbols[:limit]:
                code = symbol.get('data-symbol', '').strip()
                if code and code not in stock_codes:
                    stock_codes.append(code)
            
            # 方法2: 如果方法1失敗，嘗試從表格中提取
            if not stock_codes:
                # 尋找包含股票資訊的表格行
                rows = soup.select('li[class*="List"] a[href*="/quote/"]')
                for row in rows[:limit]:
                    href = row.get('href', '')
                    # 從 URL 中提取股票代碼 (例如: /quote/2330.TW 或 https://tw.stock.yahoo.com/quote/2330.TW)
                    if '/quote/' in href:
                        # 處理絕對和相對 URL
                        code = href.split('/quote/')[-1].split('.')[0].strip()
                        # 只接受4位數字的股票代碼
                        if code and code.isdigit() and len(code) == 4 and code not in stock_codes:
                            stock_codes.append(code)
            
            # 方法3: 嘗試從其他可能的結構中提取
            if not stock_codes:
                # 尋找所有可能包含股票代碼的連結
                links = soup.find_all('a', href=True)
                for link in links:
                    href = link.get('href', '')
                    if '/quote/' in href and '.TW' in href:
                        code = href.split('/quote/')[-1].split('.')[0].strip()
                        if code and code.isdigit() and len(code) == 4 and code not in stock_codes:
                            stock_codes.append(code)
                            if len(stock_codes) >= limit:
                                break
            
            print(f"從 {url} 抓取到 {len(stock_codes)} 支股票代碼: {stock_codes[:5]}...")
            return stock_codes[:limit]
            
        except Exception as e:
            print(f"爬取排行榜頁面失敗: {e}")
            return []
    
    async def get_stock_details(self, stock_id: str) -> Optional[Dict]:
        """
        使用 yfinance 獲取股票價格資訊，並從 Yahoo TW 網頁獲取中文公司名稱
        
        Args:
            stock_id: 股票代碼
            
        Returns:
            包含股票資訊的字典，或 None
        """
        try:
            import yfinance as yf
            
            # 建立 ticker（台股需要加 .TW 後綴）
            ticker_symbol = f"{stock_id}.TW"
            ticker = yf.Ticker(ticker_symbol)
            
            # 獲取股票資訊
            info = ticker.info
            
            # 獲取當前價格和前一日收盤價
            current_price = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose', 0)
            previous_close = info.get('previousClose', current_price)
            
            # 如果沒有 currentPrice，嘗試從 history 獲取最新價格
            if not current_price or current_price == 0:
                hist = ticker.history(period='2d')
                if not hist.empty:
                    current_price = float(hist['Close'].iloc[-1])
                    if len(hist) > 1:
                        previous_close = float(hist['Close'].iloc[-2])
                    else:
                        previous_close = current_price
            
            # 計算漲跌
            change = current_price - previous_close
            change_percent = (change / previous_close * 100) if previous_close > 0 else 0
            
            # 從 Yahoo TW 股市頁面獲取中文公司名稱
            stock_name = await self._get_chinese_stock_name(stock_id)
            
            return {
                'id': stock_id,
                'name': stock_name or f'股票{stock_id}',
                'price': round(float(current_price), 2),
                'change': round(float(change), 2),
                'changePercent': round(float(change_percent), 2)
            }
            
        except Exception as e:
            print(f"獲取股票 {stock_id} 詳細資訊失敗: {e}")
            return None
    
    async def _get_chinese_stock_name(self, stock_id: str) -> Optional[str]:
        """
        從 Yahoo TW 股市個股頁面獲取中文公司名稱
        
        Args:
            stock_id: 股票代碼
            
        Returns:
            股票中文名稱
        """
        try:
            url = f"https://tw.stock.yahoo.com/quote/{stock_id}.TW"
            response = await self.client.get(url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 方法1: 從 og:title meta 標籤提取（例如: "台積電(2330.TW) 走勢圖 - Yahoo股市"）
            og_title = soup.find('meta', property='og:title')
            if og_title:
                content = og_title.get('content', '')
                # 提取括號前的公司名稱
                if '(' in content:
                    name = content.split('(')[0].strip()
                    if name and name != 'Yahoo股市':
                        return name
            
            # 方法2: 從 title 標籤提取
            title = soup.find('title')
            if title:
                content = title.get_text(strip=True)
                if '(' in content:
                    name = content.split('(')[0].strip()
                    if name and name != 'Yahoo股市':
                        return name
            
            return None
            
        except Exception as e:
            print(f"獲取股票 {stock_id} 中文名稱失敗: {e}")
            return None
    
    async def get_top_gainers(self, limit: int = 10) -> List[Dict]:
        """
        獲取上市漲幅排行前N名
        
        Args:
            limit: 要返回的股票數量（預設10）
            
        Returns:
            股票資訊列表
        """
        stock_codes = await self.scrape_ranking_page(self.GAINERS_URL, limit)
        
        if not stock_codes:
            print("未能抓取到漲幅排行榜股票代碼")
            return []
        
        # 並發獲取所有股票的詳細資訊
        tasks = [self.get_stock_details(code) for code in stock_codes]
        results = await asyncio.gather(*tasks)
        
        # 過濾掉 None 值
        stock_details = [r for r in results if r is not None]
        
        return stock_details
    
    async def get_top_losers(self, limit: int = 10) -> List[Dict]:
        """
        獲取上市跌幅排行前N名
        
        Args:
            limit: 要返回的股票數量（預設10）
            
        Returns:
            股票資訊列表
        """
        stock_codes = await self.scrape_ranking_page(self.LOSERS_URL, limit)
        
        if not stock_codes:
            print("未能抓取到跌幅排行榜股票代碼")
            return []
        
        # 並發獲取所有股票的詳細資訊
        tasks = [self.get_stock_details(code) for code in stock_codes]
        results = await asyncio.gather(*tasks)
        
        # 過濾掉 None 值
        stock_details = [r for r in results if r is not None]
        
        return stock_details
    
    async def close(self):
        """關閉 HTTP 客戶端"""
        await self.client.aclose()
