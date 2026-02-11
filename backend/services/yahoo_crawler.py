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
            timeout=30.0
        )
        self.finmind_client = FinMindClient()
    
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
                    # 從 URL 中提取股票代碼 (例如: /quote/2330.TW)
                    if '/quote/' in href:
                        code = href.split('/quote/')[-1].split('.')[0].strip()
                        if code and code.isdigit() and code not in stock_codes:
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
        使用 FinMind API 獲取股票詳細資訊
        
        Args:
            stock_id: 股票代碼
            
        Returns:
            包含股票資訊的字典，或 None
        """
        try:
            # 獲取最近2天的股價資料（確保能取得最新資料）
            end_date = datetime.now().strftime('%Y-%m-%d')
            start_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
            
            # 從 FinMind 獲取股價資料
            price_data = await self.finmind_client.fetch_price(stock_id, start_date, end_date)
            
            if not price_data or len(price_data) == 0:
                print(f"無法獲取股票 {stock_id} 的價格資料")
                return None
            
            # 取得最新的兩筆資料來計算漲跌
            latest = price_data[-1]
            previous = price_data[-2] if len(price_data) > 1 else latest
            
            # 計算漲跌幅
            current_price = float(latest.get('close', 0))
            previous_price = float(previous.get('close', current_price))
            
            change = current_price - previous_price
            change_percent = (change / previous_price * 100) if previous_price > 0 else 0
            
            # 獲取股票名稱（從 FinMind 的股票資訊 API）
            # 注意：FinMind 的價格資料中沒有股票名稱，我們需要另外獲取
            stock_name = await self._get_stock_name(stock_id)
            
            return {
                'id': stock_id,
                'name': stock_name or f'股票{stock_id}',
                'price': round(current_price, 2),
                'change': round(change, 2),
                'changePercent': round(change_percent, 2)
            }
            
        except Exception as e:
            print(f"獲取股票 {stock_id} 詳細資訊失敗: {e}")
            return None
    
    async def _get_stock_name(self, stock_id: str) -> Optional[str]:
        """
        從 FinMind API 獲取股票中文名稱
        
        Args:
            stock_id: 股票代碼
            
        Returns:
            股票中文名稱
        """
        try:
            # 使用 FinMind 的 TaiwanStockInfo API 獲取股票基本資料
            stock_info = await self.finmind_client.fetch_stock_info(stock_id)
            
            if stock_info and len(stock_info) > 0:
                # FinMind 返回的資料中，stock_name 欄位包含股票名稱
                stock_name = stock_info[0].get('stock_name', '')
                if stock_name:
                    return stock_name
            
            return None
            
        except Exception as e:
            print(f"獲取股票 {stock_id} 名稱失敗: {e}")
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
        await self.finmind_client.close()
