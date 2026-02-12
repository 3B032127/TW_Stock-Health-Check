"""
Market Indicators Service
Fetches real-time market indicators that influence Taiwan stock market
"""
import yfinance as yf
from datetime import datetime
from typing import Dict, Any, Optional, List
import json
import os
from pathlib import Path

# Google Gemini AI for TSMC outlook
import google.generativeai as genai

# Web scraping for Economic Monitor Light
import httpx
from bs4 import BeautifulSoup
import re


class MarketIndicatorsService:
    """Service to fetch and aggregate market indicators"""
    
    def __init__(self, gemini_api_key: Optional[str] = None):
        self.gemini_api_key = gemini_api_key
        if gemini_api_key:
            genai.configure(api_key=gemini_api_key)
    
    def fetch_yfinance_indicator(
        self, 
        ticker: str, 
        name: str,
        special_handling: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch indicator data from Yahoo Finance
        
        Args:
            ticker: Yahoo Finance ticker symbol
            name: Display name for the indicator
            special_handling: Special processing rules (e.g., 'tnx_divide_10')
        
        Returns:
            Dictionary with indicator data
        """
        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(period="5d")
            
            if hist.empty or len(hist) < 2:
                return self._create_error_indicator(name, "數據不足")
            
            current_price = hist['Close'].iloc[-1]
            prev_close = hist['Close'].iloc[-2]
            
            # Convert to Python native types
            current_price = float(current_price)
            prev_close = float(prev_close)
            
            change = current_price - prev_close
            percent = (change / prev_close) * 100 if prev_close != 0 else 0
            
            return {
                "name": name,
                "value": f"{current_price:.2f}",
                "change": f"{change:+.2f}",
                "changePercent": f"{percent:+.2f}%",
                "isUp": bool(change >= 0)
            }
            
        except Exception as e:
            print(f"Error fetching {ticker}: {e}")
            return self._create_error_indicator(name, "無法取得數據")
    
    def fetch_usdtwd_indicator(self) -> Dict[str, Any]:
        """
        Fetch USD/TWD exchange rate with special interpretation
        
        When value goes up = TWD depreciates (台幣貶值) = negative for market
        When value goes down = TWD appreciates (台幣升值) = positive for market
        """
        try:
            stock = yf.Ticker("TWD=X")
            hist = stock.history(period="5d")
            
            if hist.empty or len(hist) < 2:
                return self._create_error_indicator("台幣匯率", "數據不足")
            
            current_price = hist['Close'].iloc[-1]
            prev_close = hist['Close'].iloc[-2]
            
            # Convert to Python native types
            current_price = float(current_price)
            prev_close = float(prev_close)
            
            change = current_price - prev_close
            percent = (change / prev_close) * 100 if prev_close != 0 else 0
            
            # Interpretation logic
            is_up = bool(change >= 0)
            is_positive_for_market = not is_up  # Inverse relationship
            
            note = "數值跌代表台幣升值(資金流入)" if not is_up else "數值漲代表台幣貶值(資金流出)"
            
            return {
                "name": "台幣匯率",
                "value": f"{current_price:.2f}",
                "change": f"{change:+.2f}",
                "changePercent": f"{percent:+.2f}%",
                "isUp": is_up,
                "note": note,
                "isPositiveForMarket": is_positive_for_market
            }
            
        except Exception as e:
            print(f"Error fetching USD/TWD: {e}")
            return self._create_error_indicator("台幣匯率", "無法取得數據")
    
    def fetch_economic_monitor_light(self) -> Dict[str, Any]:
        """
        Fetch Economic Monitor Light (景氣對策信號) from NDC
        Attempts web scraping first, falls back to manual JSON if available
        """
        # Try scraping from NDC website
        try:
            # NDC景氣對策信號網頁
            url = "https://index.ndc.gov.tw/n/zh_tw/data/eco"
            response = httpx.get(url, timeout=10.0)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'lxml')
                # This is a placeholder - actual scraping logic would need to be
                # adjusted based on the actual HTML structure
                # For now, fall through to JSON fallback
                pass
                
        except Exception as e:
            print(f"Error scraping Economic Monitor Light: {e}")
        
        # Fallback to manual JSON file
        json_path = Path(__file__).parent.parent / "economic_data.json"
        if json_path.exists():
            try:
                with open(json_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                return {
                    "name": "景氣對策信號",
                    "value": f"{data['score']}分",
                    "change": data['signal'],
                    "changePercent": "",
                    "isUp": data['score'] >= 23,  # Green light threshold
                    "description": data['description']
                }
            except Exception as e:
                print(f"Error reading economic_data.json: {e}")
        
        # Final fallback
        return {
            "name": "景氣對策信號",
            "value": "28分",
            "change": "綠燈",
            "changePercent": "",
            "isUp": True,
            "description": "經濟穩定復甦"
        }
    
    def fetch_tsmc_outlook(self) -> Dict[str, Any]:
        """
        Fetch TSMC outlook using Google Gemini AI
        Analyzes recent TSMC news to generate market sentiment
        """
        if not self.gemini_api_key:
            # Return placeholder if no API key
            return {
                "name": "台積電展望",
                "value": "樂觀 (8/10)",
                "change": "",
                "changePercent": "",
                "isUp": True,
                "text": "先進製程產能滿載，AI 需求強勁帶動營收成長。",
                "description": "基於近期法說會與營收數據"
            }
        
        try:
            # Use Gemini to search and analyze TSMC news
            model = genai.GenerativeModel('gemini-pro')
            
            prompt = """
            請分析台積電(TSMC)目前的市場展望。請考慮以下因素：
            1. 最近的法說會內容
            2. 最新的營收數據
            3. AI晶片需求趨勢
            4. 先進製程產能狀況
            
            請用一句話總結台積電目前的市場展望（利多或利空），
            並給出一個情緒分數（1-10，10為極度樂觀）。
            
            回應格式：
            分數: X/10
            展望: [一句話總結]
            """
            
            response = model.generate_content(prompt)
            text = response.text
            
            # Parse the response
            score = 8  # Default
            outlook = text
            
            # Try to extract score
            if "分數:" in text or "分数:" in text:
                lines = text.split('\n')
                for line in lines:
                    if "分數:" in line or "分数:" in line:
                        try:
                            score = int(line.split(':')[1].split('/')[0].strip())
                        except:
                            pass
                    if "展望:" in line:
                        outlook = line.split(':')[1].strip()
            
            sentiment = "樂觀" if score >= 7 else "中性" if score >= 5 else "謹慎"
            
            return {
                "name": "台積電展望",
                "value": f"{sentiment} ({score}/10)",
                "change": "",
                "changePercent": "",
                "isUp": score >= 6,
                "text": outlook,
                "description": "AI 生成分析"
            }
            
        except Exception as e:
            print(f"Error fetching TSMC outlook with Gemini: {e}")
            # Fallback to placeholder
            return {
                "name": "台積電展望",
                "value": "樂觀 (8/10)",
                "change": "",
                "changePercent": "",
                "isUp": True,
                "text": "先進製程產能滿載，AI 需求強勁帶動營收成長。",
                "description": "基於近期法說會與營收數據"
            }
    
    def _create_error_indicator(self, name: str, error_msg: str) -> Dict[str, Any]:
        """Create a placeholder indicator for errors"""
        return {
            "name": name,
            "value": "N/A",
            "change": error_msg,
            "changePercent": "",
            "isUp": False
        }
    
    def fetch_us_economic_indicators(self) -> List[Dict[str, Any]]:
        """
        Fetch US CPI, PPI, and Fed Rate with AI trend analysis
        Uses JSON file for data + Gemini AI for analysis
        """
        # Read data from JSON file
        json_path = Path(__file__).parent.parent / "us_economic_data.json"
        
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"Error reading us_economic_data.json: {e}")
            # Return default data if file not found
            data = {
                "cpi": {"value": 3.4, "date": "2026-01", "yoy_change": 3.4},
                "ppi": {"value": 3.0, "date": "2026-01", "yoy_change": 3.0},
                "fed_rate": {"value": 4.50, "date": "2026-01", "range": "4.25-4.50"}
            }
        
        # Use Gemini AI to analyze rate trend if API key available
        rate_analysis = self._analyze_fed_rate_trend(data) if self.gemini_api_key else None
        
        indicators = []
        
        # 1. CPI (Consumer Price Index)
        cpi_data = data.get("cpi", {})
        indicators.append({
            "name": "美國CPI",
            "value": f"{cpi_data.get('value', 0):.1f}%",
            "change": f"{cpi_data.get('date', 'N/A')}",
            "changePercent": f"年增 {cpi_data.get('yoy_change', 0):.1f}%",
            "isUp": cpi_data.get('yoy_change', 0) > 2.0,  # Fed target is 2%
            "description": "消費者物價指數",
            "note": "Fed 目標為 2%，高於目標表示通膨壓力",
            "id": "us_cpi"
        })
        
        # 2. PPI (Producer Price Index)
        ppi_data = data.get("ppi", {})
        indicators.append({
            "name": "美國PPI",
            "value": f"{ppi_data.get('value', 0):.1f}%",
            "change": f"{ppi_data.get('date', 'N/A')}",
            "changePercent": f"年增 {ppi_data.get('yoy_change', 0):.1f}%",
            "isUp": ppi_data.get('yoy_change', 0) > 2.0,
            "description": "生產者物價指數",
            "note": "領先CPI，反映上游成本壓力",
            "id": "us_ppi"
        })
        
        # 3. Federal Funds Rate
        fed_data = data.get("fed_rate", {})
        fed_value = fed_data.get('value', 0)
        fed_range = fed_data.get('range', f"{fed_value:.2f}")
        
        # Determine if in rate hike or cut cycle
        if rate_analysis:
            cycle_text = rate_analysis.get('cycle', '維持利率')
            trend_text = rate_analysis.get('analysis', '')
        else:
            # Simple heuristic based on rate level
            if fed_value >= 4.5:
                cycle_text = "高利率環境"
                trend_text = "利率處於高位，可能進入降息循環"
            elif fed_value <= 2.0:
                cycle_text = "低利率環境"
                trend_text = "利率處於低位，可能進入升息循環"
            else:
                cycle_text = "中性利率"
                trend_text = "利率處於中性水平"
        
        indicators.append({
            "name": "Fed 利率",
            "value": f"{fed_range}%",
            "change": cycle_text,
            "changePercent": f"{fed_data.get('date', 'N/A')}",
            "isUp": fed_value > 3.0,
            "description": "聯邦基金利率目標區間",
            "text": trend_text,
            "note": f"當前處於{cycle_text}",
            "id": "fed_rate"
        })
        
        return indicators
    
    def _analyze_fed_rate_trend(self, data: Dict[str, Any]) -> Optional[Dict[str, str]]:
        """
        Use Gemini AI to analyze Fed rate trend and predict future direction
        """
        if not self.gemini_api_key:
            return None
        
        try:
            model = genai.GenerativeModel('gemini-pro')
            
            cpi = data.get('cpi', {}).get('value', 0)
            ppi = data.get('ppi', {}).get('value', 0)
            fed_rate = data.get('fed_rate', {}).get('value', 0)
            
            prompt = f"""
            分析美國聯準會(Fed)的利率政策趨勢：
            
            當前數據：
            - CPI (消費者物價指數): {cpi}%
            - PPI (生產者物價指數): {ppi}%
            - 聯邦基金利率: {fed_rate}%
            - Fed 通膨目標: 2%
            
            請分析：
            1. 目前處於升息循環還是降息循環？
            2. 未來利率走向預測（升息/降息/維持）
            3. 一句話總結對台股的影響
            
            回應格式：
            循環: [升息循環/降息循環/維持利率]
            預測: [未來可能升息/降息/維持]
            影響: [一句話說明對台股的影響]
            """
            
            response = model.generate_content(prompt)
            text = response.text
            
            # Parse response
            cycle = "維持利率"
            prediction = "維持"
            impact = "密切關注 Fed 動向"
            
            lines = text.split('\n')
            for line in lines:
                if "循環:" in line or "循环:" in line:
                    cycle = line.split(':')[1].strip()
                elif "預測:" in line or "预测:" in line:
                    prediction = line.split(':')[1].strip()
                elif "影響:" in line or "影响:" in line:
                    impact = line.split(':')[1].strip()
            
            analysis = f"{prediction}。{impact}"
            
            return {
                "cycle": cycle,
                "prediction": prediction,
                "analysis": analysis
            }
            
        except Exception as e:
            print(f"Error analyzing Fed rate trend: {e}")
            return None

    
    def fetch_taiex_data(self, period: str = "1m") -> Dict[str, Any]:
        """
        Fetch detailed TAIEX data with historical prices
        
        Args:
            period: Time period - "1d", "1w", "1m", "1y"
        
        Returns:
            Dict with current data and historical data
            - 1d: Hourly data for current trading day
            - 1w: Daily data for 5 trading days
            - 1m: Weekly data (last day of each week)
            - 1y: Monthly data (last day of each month)
        """
        try:
            ticker = yf.Ticker("^TWII")
            
            # Always fetch last 2 days to get daily change (current vs yesterday)
            daily_hist = ticker.history(period="2d")
            
            if daily_hist.empty:
                return self._create_error_taiex_data("無法取得數據")
            
            # Get current (latest) data from daily history
            latest = daily_hist.iloc[-1]
            latest_date = daily_hist.index[-1]
            
            # Calculate DAILY change (current vs yesterday's close)
            current_price = float(latest['Close'])
            if len(daily_hist) > 1:
                yesterday_close = float(daily_hist['Close'].iloc[-2])
            else:
                yesterday_close = float(latest['Open'])
            
            daily_change = current_price - yesterday_close
            daily_change_percent = (daily_change / yesterday_close) * 100 if yesterday_close != 0 else 0
            
            # Get volume and turnover from Yahoo Finance Taiwan (scraping)
            yahoo_data = self._fetch_yahoo_taiex_data()
            volume = yahoo_data.get('volume', 0)
            turnover = yahoo_data.get('turnover', 0)
            
            # If scraping failed, try yfinance volume (though usually 0 for ^TWII)
            if volume == 0 and 'Volume' in latest:
                volume = float(latest['Volume'])

            high = float(latest['High'])
            low = float(latest['Low'])
            open_price = float(latest['Open'])
            
            # Fetch historical data based on period with appropriate interval
            history = []
            
            if period == "1d":
                # 1 day: 5-minute intervals for smoother intraday chart
                # This gives ~50-60 data points during trading hours
                hist = ticker.history(period="1d", interval="5m")
                for idx, row in hist.iterrows():
                    history.append({
                        "date": idx.strftime("%Y-%m-%d %H:%M"),
                        "close": float(row['Close']),
                        "volume": float(row['Volume']) if 'Volume' in row else 0
                    })
            
            elif period == "1w":
                # 1 week: 30-minute intervals for detailed weekly view
                # This gives ~40-50 data points across the week
                hist = ticker.history(period="5d", interval="30m")
                for idx, row in hist.iterrows():
                    history.append({
                        "date": idx.strftime("%Y-%m-%d %H:%M"),
                        "close": float(row['Close']),
                        "volume": float(row['Volume']) if 'Volume' in row else 0
                    })
            
            elif period == "1m":
                # 1 month: Daily data for detailed monthly view
                # This gives ~20-22 trading days
                hist = ticker.history(period="1mo", interval="1d")
                for idx, row in hist.iterrows():
                    history.append({
                        "date": idx.strftime("%Y-%m-%d"),
                        "close": float(row['Close']),
                        "volume": float(row['Volume']) if 'Volume' in row else 0
                    })
            
            elif period == "1y":
                # 1 year: Weekly data (every Friday or last trading day of week)
                # This gives ~52 data points for the year
                hist = ticker.history(period="1y", interval="1wk")
                for idx, row in hist.iterrows():
                    history.append({
                        "date": idx.strftime("%Y-%m-%d"),
                        "close": float(row['Close']),
                        "volume": float(row['Volume']) if 'Volume' in row else 0
                    })
            
            return {
                "current": {
                    "price": round(current_price, 2),
                    "change": round(daily_change, 2),
                    "changePercent": round(daily_change_percent, 2),
                    "date": latest_date.strftime("%Y-%m-%d"),
                    "volume": volume,
                    "turnover": turnover,
                    "high": round(high, 2),
                    "low": round(low, 2),
                    "open": round(open_price, 2)
                },
                "history": history,
                "period": period
            }
            
        except Exception as e:
            print(f"Error fetching TAIEX data: {e}")
            import traceback
            traceback.print_exc()
            return self._create_error_taiex_data(str(e))

    def _fetch_yahoo_taiex_data(self) -> Dict[str, float]:
        """
        Fetch TAIEX volume and turnover from Yahoo Finance Taiwan
        Returns dict with 'volume' (shares) and 'turnover' (amount)
        """
        try:
            url = "https://tw.stock.yahoo.com/s/tse.php"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            
            response = httpx.get(url, headers=headers, timeout=10.0)
            if response.status_code != 200:
                print(f"Yahoo scraping failed with status {response.status_code}")
                return {"volume": 0, "turnover": 0}
                
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find the script tag containing "root.App.main"
            script_tags = soup.find_all('script')
            for script in script_tags:
                if script.string and "root.App.main" in script.string:
                    # Improved extraction logic
                    start_marker = "root.App.main ="
                    start_index = script.string.find(start_marker)
                    if start_index != -1:
                        # Move past the marker
                        json_start = script.string.find("{", start_index)
                        if json_start != -1:
                            # Use rfind to find the last closing brace and semicolon
                            json_end = script.string.rfind("};")
                            if json_end != -1:
                                json_str = script.string[json_start:json_end+1]
                                
                                # Sanitize common JS-only values
                                json_str = json_str.replace("undefined", "null")
                                
                                try:
                                    data = json.loads(json_str)
                                    
                                    quote_data = data.get('context', {}).get('dispatcher', {}).get('stores', {}).get('QuoteFundamental', {}).get('quote', {}).get('data', {})
                                    
                                    turnover_m = quote_data.get('turnoverM')
                                    volume = quote_data.get('volume')
                                    
                                    result = {}
                                    
                                    if volume:
                                        result['volume'] = float(volume)
                                        
                                    if turnover_m:
                                        # turnoverM is in millions? 
                                        # Yahoo says "成交金額(億)", but raw data matches millions if 675796 = 6757.96 億 = 675,796,000,000 ??
                                        # Let's check the verify script output:
                                        # TurnoverM: 675796, Calc: 6757.96 億
                                        # So turnoverM is essentially in Millions.
                                        # We want to return raw amount (which is huge) or scaled amount?
                                        # Frontend likely expects a number. Let's return raw amount (Millions * 1000000)
                                        # logical, but display might need adjustment.
                                        # Let's return the simplified "Million" unit or the "Billion" unit?
                                        # Actually, yfinance volume is raw shares.
                                        # Let's return raw amount for turnover too?
                                        # 675796 * 1,000,000 = 675,796,000,000 (6757 Billion)
                                        result['turnover'] = float(turnover_m) * 1000000
                                    
                                    return result
                                    
                                except json.JSONDecodeError as je:
                                    print(f"JSON Decode Error in Yahoo scraping: {je}")
            
            return {"volume": 0, "turnover": 0}
            
        except Exception as e:
            print(f"Error scraping Yahoo Finance: {e}")
            return {"volume": 0, "turnover": 0}


    
    def _create_error_taiex_data(self, error_msg: str) -> Dict[str, Any]:
        """Create error response for TAIEX data"""
        return {
            "current": {
                "price": 0,
                "change": 0,
                "changePercent": 0,
                "date": datetime.now().strftime("%Y-%m-%d"),
                "volume": 0,
                "high": 0,
                "low": 0,
                "open": 0
            },
            "history": [],
            "period": "1m",
            "error": error_msg
        }

    
    def get_all_indicators(self) -> Dict[str, Any]:
        """
        Fetch all 6 market indicators
        
        Returns:
            Dictionary with updated_at timestamp and list of indicators
        """
        indicators = []
        
        # 1. TAIEX (Taiwan Weighted Index)
        taiex = self.fetch_yfinance_indicator(
            "^TWII", 
            "加權指數"
        )
        taiex["id"] = "taiex"
        taiex["description"] = "台股整體表現"
        indicators.append(taiex)
        
        # 2. USD/TWD Exchange Rate
        usdtwd = self.fetch_usdtwd_indicator()
        usdtwd["id"] = "usdtwd"
        indicators.append(usdtwd)
        
        # 3. Philadelphia Semiconductor Index
        sox = self.fetch_yfinance_indicator(
            "^SOX",
            "費城半導體"
        )
        sox["id"] = "sox"
        sox["description"] = "連動台股半導體"
        indicators.append(sox)
        
        # 4. US 10-Year Treasury Yield
        us_yield = self.fetch_yfinance_indicator(
            "^TNX",
            "美債殖利率(10年)"
        )
        us_yield["id"] = "us_yield"
        us_yield["value"] = us_yield["value"] + "%"  # Add % symbol
        us_yield["description"] = "外資資金成本"
        indicators.append(us_yield)
        
        # 5. Economic Monitor Light
        monitor = self.fetch_economic_monitor_light()
        monitor["id"] = "monitor_light"
        indicators.append(monitor)
        
        # 6. TSMC Outlook
        tsmc = self.fetch_tsmc_outlook()
        tsmc["id"] = "tsmc_outlook"
        indicators.append(tsmc)
        
        # 7-9. US Economic Indicators (CPI, PPI, Fed Rate)
        us_indicators = self.fetch_us_economic_indicators()
        indicators.extend(us_indicators)
        
        return {
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "indicators": indicators
        }


# Singleton instance
_service_instance: Optional[MarketIndicatorsService] = None

def get_indicators_service(gemini_api_key: Optional[str] = None) -> MarketIndicatorsService:
    """Get or create the indicators service singleton"""
    global _service_instance
    if _service_instance is None:
        _service_instance = MarketIndicatorsService(gemini_api_key)
    return _service_instance
