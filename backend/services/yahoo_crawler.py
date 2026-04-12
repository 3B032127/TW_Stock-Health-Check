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
            
            # 嘗試 yfinance 抓取英文資訊，若被阻擋則提供空字典
            info = {}
            try:
                # 建立 ticker（台股判斷：上市加 .TW，上櫃加 .TWO）
                # 優先嘗試 .TW，若查無資料則嘗試 .TWO
                ticker_symbol = f"{stock_id}.TW"
                ticker = yf.Ticker(ticker_symbol)
                info = ticker.info
                
                if not info or not (info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose')):
                     ticker_symbol = f"{stock_id}.TWO"
                     ticker = yf.Ticker(ticker_symbol)
                     info = ticker.info
            except Exception as yf_err:
                print(f"yfinance fetch warning in details for {stock_id}: {yf_err}")
            
            # 獲取當前價格和前一日收盤價
            current_price = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose', 0)
            previous_close = info.get('previousClose', current_price)
            
            # 如果沒有 currentPrice，嘗試從 history 獲取最新價格
            if not current_price or current_price == 0:
                try:
                    hist = ticker.history(period='2d')
                    if not hist.empty:
                        current_price = float(hist['Close'].iloc[-1])
                        if len(hist) > 1:
                            previous_close = float(hist['Close'].iloc[-2])
                        else:
                            previous_close = current_price
                except Exception as yf_hist_err:
                    print(f"yfinance history fetch warning for {stock_id}: {yf_hist_err}")
            
            # 計算漲跌
            change = current_price - previous_close
            change_percent = (change / previous_close * 100) if previous_close > 0 else 0
            
            # 從 Yahoo TW 股市頁面獲取中文公司名稱
            stock_name = await self._get_chinese_stock_name(stock_id)
            
            # 檢測漲停和跌停（台股一般為±10%，使用9.8%作為閾值）
            is_limit_up = change_percent >= 9.8
            is_limit_down = change_percent <= -9.8
            
            return {
                'id': stock_id,
                'name': stock_name or f'股票{stock_id}',
                'price': round(float(current_price), 2),
                'change': round(float(change), 2),
                'changePercent': round(float(change_percent), 2),
                'isLimitUp': is_limit_up,
                'isLimitDown': is_limit_down
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
            # 嘗試 .TW
            url = f"https://tw.stock.yahoo.com/quote/{stock_id}.TW"
            response = await self.client.get(url)
            
            # 若為 404 則嘗試 .TWO (上櫃)
            if response.status_code == 404:
                url = f"https://tw.stock.yahoo.com/quote/{stock_id}.TWO"
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
    
    async def get_company_profile(self, stock_id: str) -> Optional[Dict]:
        """
        使用 yfinance 獲取公司基本詳細資料
        包含董事長、總經理、產業類別、公司簡介等
        
        Args:
            stock_id: 股票代碼
            
        Returns:
            包含公司詳細資訊的字典，或 None
        """
        try:
            import yfinance as yf
            import re
            
            from .finmind import FinMindClient
            from datetime import datetime
            from dateutil.relativedelta import relativedelta
            
            # 嘗試 yfinance 抓取英文資訊，若被阻擋則提供空字典
            info = {}
            try:
                ticker_symbol = f"{stock_id}.TW"
                ticker = yf.Ticker(ticker_symbol)
                info = ticker.info
                # 處理可能是 list 或 dict 的情況
                if isinstance(info, list):
                    info = {}
                elif not info:
                    info = {}
            except Exception as yf_err:
                print(f"yfinance fetch warning for {stock_id}: {yf_err}")
            
            # 從 Yahoo TW 股市頁面獲取中文公司資訊 (補充 yfinance 英文資訊的不足)
            # 判斷網址後綴
            suffix = "TW"
            url = f"https://tw.stock.yahoo.com/quote/{stock_id}.{suffix}/profile"
            chinese_profile = {}
            
            try:
                from bs4 import BeautifulSoup
                response = await self.client.get(url)
                if response.status_code == 404:
                    suffix = "TWO"
                    url = f"https://tw.stock.yahoo.com/quote/{stock_id}.{suffix}/profile"
                    response = await self.client.get(url)
                
                if response.status_code == 200:
                    text = response.text
                    soup = BeautifulSoup(text, 'html.parser')
                    texts = list(soup.stripped_strings)
                    
                    labels = ["董事長", "總經理", "掛牌日期", "產業類別"]
                    for i, t in enumerate(texts):
                        if t in labels:
                            if i + 1 < len(texts):
                                chinese_profile[t] = texts[i+1]
                                
                    # 尋找公司簡介 (通常是一段較長的連續文字)
                    descriptions = [t for t in texts if len(t) > 30 and 'Yahoo' not in t and '服務條款' not in t and '建議您' not in t]
                    if descriptions:
                        chinese_profile['公司簡介'] = max(descriptions, key=len)
                        
            except Exception as e:
                print(f"Failed to fetch Chinese profile from Yahoo TW for {stock_id}: {e}")

            # 綜合資料，優先使用中文爬取的，若沒有則使用 yfinance 英文資訊
            officers = info.get('companyOfficers', [])
            ceo = next((o.get('name') for o in officers if 'CEO' in o.get('title', '') or 'President' in o.get('title', '')), '')
            chairman = next((o.get('name') for o in officers if 'Chairman' in o.get('title', '')), '')

            # 抓取真實中文名稱
            stock_name = await self._get_chinese_stock_name(stock_id)

            # 若 yfinance 中找不到，則提供預設值
            market_cap = info.get('marketCap', 0)
            
            # Calculate accurate capital if shares are available
            shares = info.get('sharesOutstanding', 0)
            calculated_capital = 'N/A'
            if shares and shares > 0:
                capital_val = shares * 10
                if capital_val >= 100000000:
                    calculated_capital = f"{capital_val / 100000000:,.2f} 億"
                else:
                    calculated_capital = f"{capital_val / 10000:,.0f} 萬"

            # 取得月營收
            finmind = FinMindClient()
            now = datetime.now()
            start_date = (now - relativedelta(months=14)).strftime("%Y-%m-%d")
            end_date = now.strftime("%Y-%m-%d")
            
            revenue_data = []
            try:
                # Assuming this executes inside an async function
                revenue_data = await finmind.fetch_month_revenue(stock_id, start_date, end_date)
            except Exception as e:
                print(f"Fetch revenue error: {e}")
            finally:
                await finmind.close()

            monthly_revenue = {'value': 'N/A', 'yoy': 0}
            if revenue_data:
                latest_revenue = revenue_data[-1]
                rev_value = latest_revenue.get('revenue', 0)
                if rev_value > 0:
                    monthly_revenue['value'] = f"{rev_value / 100000000:,.2f}"

                if len(revenue_data) > 1:
                    last_year_rev = next((r.get('revenue') for r in revenue_data if r.get('revenue_year') == latest_revenue.get('revenue_year', 0) - 1 and r.get('revenue_month') == latest_revenue.get('revenue_month')), None)
                    if last_year_rev and last_year_rev > 0:
                        monthly_revenue['yoy'] = round(((rev_value - last_year_rev) / last_year_rev) * 100, 2)
            
            # 取得 EPS 與三率 (轉換為百分比格式)
            eps = info.get('trailingEps', 'N/A')
            if eps != 'N/A':
                eps = f"{eps:.2f}"
                
            gross_margin = info.get('grossMargins', 0) * 100 if info.get('grossMargins') else 0
            operating_margin = info.get('operatingMargins', 0) * 100 if info.get('operatingMargins') else 0
            net_margin = info.get('profitMargins', 0) * 100 if info.get('profitMargins') else 0

            financial_highlights = {
                'monthlyRevenue': monthly_revenue,
                'eps': eps,
                'grossMargin': gross_margin,
                'operatingMargin': operating_margin,
                'netMargin': net_margin
            }

            # 處理公司簡介: 優先使用中文爬取結果，若無則翻譯英文，最後截斷至簡短
            raw_desc = chinese_profile.get('公司簡介')
            if not raw_desc:
                eng_desc = info.get('longBusinessSummary')
                if eng_desc:
                    try:
                        from deep_translator import GoogleTranslator
                        def translate_text(text):
                            return GoogleTranslator(source='auto', target='zh-TW').translate(text[:800])
                        # 非同步執行翻譯避免阻塞
                        raw_desc = await asyncio.to_thread(translate_text, eng_desc)
                    except Exception as e:
                        print(f"Translation failed for {stock_id}: {e}")
                        raw_desc = eng_desc
                else:
                    raw_desc = "暫無公司簡介。"

            # 確保簡介內容簡短 (例如最多 120 字)
            if raw_desc and len(raw_desc) > 120:
                trunc_desc = raw_desc[:120]
                # 嘗試在句段處截斷，保持語意通暢
                last_period = trunc_desc.rfind('。')
                if last_period > 60:
                    raw_desc = trunc_desc[:last_period+1]
                else:
                    raw_desc = trunc_desc + "..."

            profile = {
                'id': stock_id,
                'name': stock_name or info.get('longName', ''),
                'industry': chinese_profile.get('產業類別') or info.get('industry', 'N/A'),
                'sector': info.get('sector', 'N/A'),
                'description': raw_desc,                'chairman': chinese_profile.get('董事長') or chairman or 'N/A',
                'ceo': chinese_profile.get('總經理') or ceo or 'N/A',
                'foundedDate': 'N/A', # Usually not easily available without proper source
                'listingDate': chinese_profile.get('掛牌日期', 'N/A'),
                'capital': calculated_capital,
                'website': info.get('website', 'N/A'),
                'marketCap': market_cap,
                'fullTimeEmployees': info.get('fullTimeEmployees', 'N/A'),
                'financialHighlights': financial_highlights
            }
            
            return profile
            
        except Exception as e:
            print(f"獲取股票 {stock_id} 公司簡介失敗: {e}")
            return None

    async def get_dividend_history(self, stock_id: str) -> List[Dict]:
        """
        從 Yahoo 股市台灣版爬取歷史股利紀錄
        """
        try:
            url = f"https://tw.stock.yahoo.com/quote/{stock_id}/dividend"
            response = await self.client.get(url)
            response.raise_for_status()
            
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find list items that are typical rows
            rows = soup.find_all('li')
            dividends = []
            
            for row in rows:
                texts = list(row.stripped_strings)
                # Ensure the row has enough columns (year, cash, stock, yield, etc.)
                if len(texts) >= 4 and ("2023" in texts or "2024" in texts or "2025" in texts or "2022" in texts or "2021" in texts or "2020" in texts) and not "股利所屬期間" in texts:
                    try:
                        # Assuming structure could be:
                        # Standard length >= 6: [year, previous_year_if_compare, cash_dividend, compare, yield, days_to_fill, ex_dividend_date...]
                        # TSMC (length 4): [year, cash, stock_or_compare, yield]
                        
                        year = texts[0]
                        # Verify the first column is a parsing year
                        if not year.isdigit() or len(year) != 4:
                            continue
                            
                        # Column parsing based on structure length
                        if len(texts) == 4:
                            cash_str = texts[1]
                        else:
                            cash_str = texts[2]
                            
                        if '%' in cash_str: # Offset issue check
                            cash_str = "0"
                            
                        cash = float(cash_str) if cash_str not in ('-', 'N/A', '') else 0.0
                        
                        # Stock dividend is typically 0 for major stocks in Yahoo list or hidden under '+' button.
                        # We will set 0 by default unless we can parse it reliably. Yahoo's basic view doesn't easily expose stock div.
                        stock = 0.0
                        
                        # Find Ex-dividend date (looks like YYYY/MM/DD)
                        date_val = '-'
                        for t in texts:
                            if '/' in t and len(t) == 10:
                                date_val = t
                                break
                                
                        dividends.append({
                            'year': year,
                            'cash': cash,
                            'stock': stock,
                            'date': date_val
                        })
                    except Exception as e:
                        # Skip row on parsing failure
                        continue
            
            # Remove exact duplicates and sort descending
            unique_divs = {d['year']: d for d in dividends}
            sorted_divs = sorted(list(unique_divs.values()), key=lambda x: x['year'], reverse=True)
            return sorted_divs[:5] # Return top 5 recent years
                
        except Exception as e:
            print(f"Error extracting dividend history for {stock_id}: {e}")
            return []

    async def get_company_news(self, stock_id: str) -> list[dict]:
        """
        獲取個股最新相關新聞
        """
        if not self.client:
            await self.init()
            
        # 嘗試 .TW
        url = f"https://tw.stock.yahoo.com/quote/{stock_id}.TW/news"
        try:
            response = await self.client.get(url, follow_redirects=True)
            if response.status_code == 404:
                url = f"https://tw.stock.yahoo.com/quote/{stock_id}.TWO/news"
                response = await self.client.get(url, follow_redirects=True)
                
            if response.status_code != 200:
                print(f"Failed to fetch news for {stock_id}: status {response.status_code}")
                return []
                
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(response.text, "html.parser")
            
            news_items = []
            for li in soup.select("li.js-stream-content"):
                a_tag = li.select_one("h3 a")
                if not a_tag:
                    continue
                
                title = a_tag.get_text(strip=True)
                href = a_tag.get("href")
                if not href.startswith("http"):
                    href = "https://tw.stock.yahoo.com" + href
                    
                time_text = ""
                for span in li.select("span"):
                    text = span.get_text(strip=True)
                    if "前" in text or "202" in text or "/" in text or "週" in text:
                        if len(text) < 15:
                            time_text = text
                            break
                
                if title and href:
                    # using random hash for id just in case someone needs a key
                    import hashlib
                    news_id = hashlib.md5((title + href).encode()).hexdigest()[:8]
                    news_items.append({
                        "id": news_id,
                        "title": title, 
                        "url": href, 
                        "publishDate": time_text or "最新"
                    })
                    
            return news_items[:15] # limit to 15 items
            
        except Exception as e:
            print(f"Error fetching news for {stock_id}: {e}")
            return []

    async def fetch_news_content(self, url: str) -> str:
        """
        獲取並解析新聞網頁的純文字內文
        """
        if not self.client:
            await self.init()
            
        try:
            response = await self.client.get(url, follow_redirects=True)
            if response.status_code != 200:
                raise Exception(f"擷取失敗: HTTP {response.status_code}")
                
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(response.text, "html.parser")
            
            # 清除干擾標籤
            for script in soup(["script", "style", "nav", "footer", "header"]):
                script.decompose()
                
            # 優先嘗試尋找 <article> 或常見的內文容器 (如 Yahoo 的 caas-body)
            paragraphs = []
            article = soup.find('article')
            if article:
                paragraphs = article.find_all('p')
            
            if not paragraphs:
                content_div = soup.select_one('.caas-body, .article-content, #main-content, .news-content')
                if content_div:
                    paragraphs = content_div.find_all('p')
                else:
                    # 退避方案：直接抓所有 P 標籤
                    paragraphs = soup.find_all('p')
            
            # 整理與過濾空字串
            text_blocks = [p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True) and len(p.get_text(strip=True)) > 5]
            content = "\n\n".join(text_blocks)
            
            if not content:
                # 右側可能全是在 div 裡而非 p 裡的時候
                fallback_text = soup.body.get_text(separator='\n', strip=True) if soup.body else ""
                if len(fallback_text) > 100:
                    return fallback_text[:2000] + "...\n(內文過長或無法精準解析，請前往原網頁閱讀全文)"
                return "無法精準提取文章內容，請點擊下方「前往原網頁」閱讀全文。"
                
            return content
            
        except Exception as e:
            print(f"Error fetching news content from {url}: {e}")
            raise e

    async def close(self):
        """關閉 HTTP 客戶端"""
        await self.client.aclose()
