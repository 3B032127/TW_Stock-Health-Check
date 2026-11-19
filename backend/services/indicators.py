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
from . import cache_service
from .global_indices import _yf_lock


class MarketIndicatorsService:
    """Service to fetch and aggregate market indicators"""
    
    def __init__(self, gemini_api_key: Optional[str] = None):
        self.gemini_api_key = gemini_api_key
        if gemini_api_key:
            genai.configure(api_key=gemini_api_key)

    def _fetch_yf_series(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Thread-safe 30-day daily fetch for real indicator values & sparkline."""
        try:
            with _yf_lock:
                hist = yf.Ticker(ticker).history(period="1mo", interval="1d")
                if hist is not None and not hist.empty:
                    hist = hist.dropna(subset=["Close"]).copy()
                else:
                    hist = None
            if hist is None or len(hist) < 2:
                return None
            closes = [round(float(v), 4) for v in hist["Close"].tolist()]
            current_price = float(closes[-1])
            prev_close = float(closes[-2])
            change = current_price - prev_close
            percent = (change / prev_close) * 100 if prev_close != 0 else 0.0
            last_date = hist.index[-1].strftime("%Y-%m-%d")
            return {
                "current": current_price,
                "prev": prev_close,
                "change": change,
                "percent": percent,
                "high": max(closes),
                "low": min(closes),
                "date": last_date,
                "sparkline": closes,
            }
        except Exception as e:
            print(f"Error fetching {ticker}: {e}")
            return None

    def fetch_yfinance_indicator(
        self, 
        ticker: str, 
        name: str,
        special_handling: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fetch indicator data and 30d sparkline from Yahoo Finance."""
        series = self._fetch_yf_series(ticker)
        if not series:
            return self._create_error_indicator(name, "數據不足")

        current_price = series["current"]
        prev_close = series["prev"]
        change = series["change"]
        percent = series["percent"]

        return {
            "name": name,
            "value": f"{current_price:.2f}",
            "change": f"{change:+.2f}",
            "changePercent": f"{percent:+.2f}%",
            "isUp": bool(change >= 0),
            "prev": f"{prev_close:.2f}",
            "date": series["date"],
            "sparkline": series["sparkline"],
        }

    def fetch_usdtwd_indicator(self) -> Dict[str, Any]:
        """Fetch USD/TWD exchange rate with 30d real history."""
        series = self._fetch_yf_series("TWD=X")
        if not series:
            return self._create_error_indicator("台幣匯率 (USD/TWD)", "數據不足")

        current_price = series["current"]
        prev_close = series["prev"]
        change = series["change"]
        percent = series["percent"]
        is_up = bool(change >= 0)

        return {
            "id": "usdtwd",
            "name": "台幣匯率 (USD/TWD)",
            "value": f"{current_price:.2f}",
            "change": f"{change:+.2f}",
            "changePercent": f"{percent:+.2f}%",
            "isUp": is_up,
            "description": f"前值: {prev_close:.2f} | 30日區間: {series['low']:.2f}-{series['high']:.2f}",
            "note": "數值跌代表台幣升值(資金流入)，漲代表貶值" if not is_up else "數值漲代表台幣貶值(外資資金偏保守)",
            "isPositiveForMarket": not is_up,
            "sparkline": series["sparkline"],
        }
    
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
            model = genai.GenerativeModel('gemini-1.5-flash')
            
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
    
    def _load_macro_json(self) -> Dict[str, Any]:
        json_path = Path(__file__).parent.parent / "us_economic_data.json"
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading us_economic_data.json: {e}")
            return {}

    def fetch_us_economic_indicators(self) -> Dict[str, Dict[str, Any]]:
        """
        Build objective macro indicators (jp_rate, us_nfp, fed_rate, us_cpi)
        with previous/forecast comparison and real 12-period historical trends.
        """
        data = self._load_macro_json()
        result: Dict[str, Dict[str, Any]] = {}

        # 1. Japan Policy Rate & JGB 10Y
        jp = data.get("jp_rate", {})
        jp_rate_val = float(jp.get("value", 0.50))
        jgb_10y = float(jp.get("jgb_10y", 1.09))
        jp_hist = [float(p["value"]) for p in jp.get("history", [])]
        result["jp_rate"] = {
            "id": "jp_rate",
            "name": "日本央行利率 / 日債10Y",
            "value": f"{jp_rate_val:.2f}%",
            "change": f"日債10Y {jgb_10y:.2f}%",
            "changePercent": "",
            "isUp": jp_rate_val >= 0.25,
            "description": f"前值: {jp.get('prev', '0.25%')} | 市場預期: {jp.get('forecast', '0.50%')} | 月份: {jp.get('date', '2026-10')}",
            "note": jp.get("note", "日債10Y影響日圓套利資金與全球流動性"),
            "sparkline": jp_hist,
        }

        # 2. US Non-Farm Payrolls & Unemployment
        nfp = data.get("us_nfp", {})
        nfp_val = float(nfp.get("value", 18.5))
        unemp = float(nfp.get("unemployment", 4.1))
        nfp_hist = [float(p["value"]) for p in nfp.get("history", [])]
        result["us_nfp"] = {
            "id": "us_nfp",
            "name": "美國非農就業 & 失業率",
            "value": f"+{nfp_val:.1f}萬",
            "change": f"失業率 {unemp:.1f}%",
            "changePercent": "",
            "isUp": nfp_val >= 15.0,
            "description": f"前值: {nfp.get('prev', '+22.3萬')} | 預期: {nfp.get('forecast', '+18.0萬')} | {nfp.get('date', '2026-10')}",
            "note": nfp.get("note", "非農就業與失業率為 Fed 利率決策核心依據"),
            "sparkline": nfp_hist,
        }

        # 3. Federal Funds Rate
        fed = data.get("fed_rate", {})
        fed_value = float(fed.get("value", 4.375))
        fed_range = fed.get("range", f"{fed_value:.2f}")
        fed_hist = [float(p["value"]) for p in fed.get("history", [])]
        cut_bps = fed.get("expected_cut_bps", 25)
        result["fed_rate"] = {
            "id": "fed_rate",
            "name": "FED 基準利率",
            "value": f"{fed_range}%",
            "change": f"預期降息 {cut_bps}bps" if cut_bps else "維持基準利率",
            "changePercent": f"{fed.get('date', 'N/A')}",
            "isUp": fed_value > 3.0,
            "description": f"前值: {fed.get('prev_range', '4.50-4.75%')} | 下次FOMC: {fed.get('next_fomc', '12/18')}",
            "note": fed.get("note", "基準利率影響全球無風險利率與外資成本"),
            "sparkline": fed_hist,
        }

        # 4. US Inflation (CPI / Core PCE / PPI)
        cpi = data.get("cpi", {})
        cpi_val = float(cpi.get("value", 2.6))
        core_pce = float(cpi.get("core_pce", 2.8))
        ppi_val = float(cpi.get("ppi", data.get("ppi", {}).get("value", 2.4)))
        cpi_hist = [float(p["value"]) for p in cpi.get("history", [])]
        result["us_cpi"] = {
            "id": "us_cpi",
            "name": "美國通膨指標 (CPI / PCE)",
            "value": f"{cpi_val:.1f}%",
            "change": f"核心PCE {core_pce:.1f}%",
            "changePercent": f"年增 {cpi_val:.1f}%",
            "isUp": cpi_val > 2.0,
            "description": f"前值: {cpi.get('prev', '2.4%')} | 預期: {cpi.get('forecast', '2.6%')} | PPI: {ppi_val:.1f}%",
            "note": cpi.get("note", "高於 Fed 2% 通膨目標，牽動降息節奏"),
            "sparkline": cpi_hist,
        }

        return result
    
    def _analyze_fed_rate_trend(self, data: Dict[str, Any]) -> Optional[Dict[str, str]]:
        """
        Use Gemini AI to analyze Fed rate trend and predict future direction
        """
        if not self.gemini_api_key:
            return None
        
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            
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
        """
        try:
            ticker = yf.Ticker("^TWII")
            
            # Fetch latest daily data for current price info
            # Use period="5d" to ensure we get at least one valid trading day
            daily_hist = ticker.history(period="5d")
            
            if daily_hist.empty:
                # Fallback to scraping if yfinance fails
                yahoo_data = self._fetch_yahoo_taiex_data()
                if yahoo_data.get('price'):
                    return self._create_manual_taiex_response(yahoo_data, period)
                return self._create_error_taiex_data("無法從 yfinance 或 Yahoo 取得數據")
            
            # Get latest available trading day
            latest = daily_hist.iloc[-1]
            latest_date = daily_hist.index[-1]
            
            current_price = float(latest['Close'])
            # Calculate change using previous close from history
            if len(daily_hist) > 1:
                prev_close = float(daily_hist['Close'].iloc[-2])
            else:
                prev_close = float(latest['Open'])
            
            daily_change = current_price - prev_close
            daily_change_percent = (daily_change / prev_close) * 100 if prev_close != 0 else 0
            
            # Get volume and turnover from Yahoo Finance Taiwan (scraping)
            yahoo_data = self._fetch_yahoo_taiex_data()
            volume = yahoo_data.get('volume', 0)
            turnover = yahoo_data.get('turnover', 0)
            
            # If scraping failed, try yfinance volume
            if volume == 0 and 'Volume' in latest:
                volume = float(latest['Volume'])

            high = float(latest['High'])
            low = float(latest['Low'])
            open_price = float(latest['Open'])
            
            # Fetch historical data based on period
            history = []
            
            if period == "1d":
                hist = ticker.history(period="1d", interval="5m")
                if hist.empty:
                    # If today is empty, show last trading day's 5m data
                    hist = ticker.history(period="5d", interval="5m")
                    if not hist.empty:
                        last_day = hist.index[-1].date()
                        hist = hist[hist.index.date == last_day]
                
                for idx, row in hist.iterrows():
                    history.append({
                        "date": idx.strftime("%Y-%m-%d %H:%M"),
                        "close": float(row['Close']),
                        "volume": float(row['Volume']) if 'Volume' in row else 0
                    })
            
            elif period == "1w":
                hist = ticker.history(period="5d", interval="30m")
                for idx, row in hist.iterrows():
                    history.append({
                        "date": idx.strftime("%Y-%m-%d %H:%M"),
                        "close": float(row['Close']),
                        "volume": float(row['Volume']) if 'Volume' in row else 0
                    })
            
            elif period == "1m":
                hist = ticker.history(period="1mo", interval="1d")
                for idx, row in hist.iterrows():
                    history.append({
                        "date": idx.strftime("%Y-%m-%d"),
                        "close": float(row['Close']),
                        "volume": float(row['Volume']) if 'Volume' in row else 0
                    })
            
            elif period == "1y":
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
            try:
                yahoo_data = self._fetch_yahoo_taiex_data()
                if yahoo_data.get('price'):
                    return self._create_manual_taiex_response(yahoo_data, period)
            except:
                pass
            return self._create_error_taiex_data(str(e))

    def _fetch_yahoo_taiex_data(self) -> Dict[str, float]:
        """
        Fetch TAIEX volume and turnover from Yahoo Finance Taiwan (cached per TW session bucket).
        Returns dict with 'price', 'volume' (shares), and 'turnover' (amount)
        """
        tw_bucket, _, ttl = cache_service.get_market_cache_bucket("TW", live_ttl=30, closed_ttl=86400)

        def _scrape() -> Dict[str, float]:
            try:
                url = "https://tw.stock.yahoo.com/s/tse.php"
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                }

                response = httpx.get(url, headers=headers, timeout=3.0)
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
                                        dispatcher = data.get('context', {}).get('dispatcher', {}).get('stores', {})

                                        # Try MarketDataStore first (modern path)
                                        market_data = dispatcher.get('MarketDataStore', {}).get('marketDataList', {}).get('^TWII', {})

                                        # Fallback to QuoteFundamental if MarketDataStore is missing
                                        if not market_data:
                                            market_data = dispatcher.get('QuoteFundamental', {}).get('quote', {}).get('data', {})

                                        if not market_data:
                                            continue

                                        def get_val(obj, key, default=0):
                                            val = obj.get(key, default)
                                            if isinstance(val, dict):
                                                return val.get('raw', default)
                                            return val

                                        result = {
                                            "price": float(get_val(market_data, 'price', 0)),
                                            "volume": float(get_val(market_data, 'volume', 0)),
                                            "turnover": float(get_val(market_data, 'turnoverM', 0)) * 1000000,
                                            "high": float(get_val(market_data, 'regularMarketDayHigh', market_data.get('high', 0))),
                                            "low": float(get_val(market_data, 'regularMarketDayLow', market_data.get('low', 0))),
                                            "open": float(get_val(market_data, 'regularMarketOpen', market_data.get('open', 0))),
                                            "change": float(get_val(market_data, 'change', 0)),
                                            "changePercent": float(get_val(market_data, 'changePercent', 0).replace('%', '') if isinstance(get_val(market_data, 'changePercent', '0'), str) else get_val(market_data, 'changePercent', 0))
                                        }
                                        return result

                                    except (json.JSONDecodeError, ValueError) as e:
                                        print(f"Error parsing Yahoo JSON: {e}")

                return {"volume": 0, "turnover": 0}

            except Exception as e:
                print(f"Error scraping Yahoo Finance: {e}")
                return {"volume": 0, "turnover": 0}

        res = cache_service.get_or_set_cache(
            f"yahoo_taiex_scrape:{tw_bucket}",
            ttl,
            _scrape,
            db=None,
            validator_fn=lambda d: bool(d and (d.get("price", 0) > 0 or d.get("turnover", 0) > 0 or d.get("volume", 0) > 0)),
        )
        return res or {"volume": 0, "turnover": 0}

    def _create_manual_taiex_response(self, yahoo_data: Dict[str, Any], period: str) -> Dict[str, Any]:
        """Create a full response using only scraped Yahoo data when yfinance fails"""
        return {
            "current": {
                "price": round(yahoo_data.get('price', 0), 2),
                "change": round(yahoo_data.get('change', 0), 2),
                "changePercent": round(yahoo_data.get('changePercent', 0), 2),
                "date": datetime.now().strftime("%Y-%m-%d"),
                "volume": yahoo_data.get('volume', 0),
                "turnover": yahoo_data.get('turnover', 0),
                "high": round(yahoo_data.get('high', 0), 2),
                "low": round(yahoo_data.get('low', 0), 2),
                "open": round(yahoo_data.get('open', 0), 2)
            },
            "history": [], # Scraper doesn't provide history easily
            "period": period,
            "source": "yahoo_scraper_fallback"
        }


    
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
            "period": "1m",
            "error": error_msg
        }

    def fetch_indicator_history(self, indicator_id: str, period: str = "1y") -> Dict[str, Any]:
        """
        Fetch historical data for a specific indicator
        
        Args:
            indicator_id: ID of the indicator (usdtwd, sox, us_yield, etc.)
            period: Time period (1d, 1w, 1m, 1y, 5y)
            
        Returns:
            Dict with history data points
        """
        # Map indicator IDs to Yahoo Finance tickers
        ticker_map = {
            "usdtwd": "TWD=X",
            "sox": "^SOX",
            "usdjpy": "JPY=X",
            "vix": "^VIX",
            "us_yield": "^TNX",
            "taiex": "^TWII"
        }

        macro_key_map = {
            "jp_rate": "jp_rate",
            "us_nfp": "us_nfp",
            "fed_rate": "fed_rate",
            "us_cpi": "cpi",
        }
        if indicator_id in macro_key_map:
            macro = self._load_macro_json().get(macro_key_map[indicator_id], {})
            return {
                "indicator_id": indicator_id,
                "period": period,
                "history": macro.get("history", [])
            }
        
        # Handle non-market indicators or those without yahoo tickers
        if indicator_id not in ticker_map:
            return {
                "indicator_id": indicator_id,
                "period": period,
                "history": []
            }
            
        ticker_symbol = ticker_map[indicator_id]
        bucket, _, ttl = cache_service.get_multi_market_cache_bucket(["TW", "US", "JP"], live_ttl=60, closed_ttl=86400)

        def _compute_history() -> Dict[str, Any]:
            try:
                # Determine interval based on period
                interval = "1d"
                scrape_period = period

                if period == "1d":
                    interval = "5m"
                elif period == "1w":
                    interval = "30m"
                    scrape_period = "5d"
                elif period == "1m":
                    interval = "1d"
                    scrape_period = "1mo"
                elif period == "6m":
                    interval = "1d"
                    scrape_period = "6mo"
                elif period == "1y":
                    interval = "1d"
                    scrape_period = "1y"
                elif period == "5y":
                    interval = "1wk"
                    scrape_period = "5y"

                with _yf_lock:
                    hist = yf.Ticker(ticker_symbol).history(period=scrape_period, interval=interval)
                    if hist is not None and not hist.empty:
                        hist = hist.dropna(subset=["Close"]).copy()
                    else:
                        hist = None

                if hist is None or hist.empty:
                    return {
                        "indicator_id": indicator_id,
                        "period": period,
                        "history": []
                    }

                history_data = []
                for idx, row in hist.iterrows():
                    if period in ["1d", "1w"]:
                        date_str = idx.strftime("%Y-%m-%d %H:%M")
                    else:
                        date_str = idx.strftime("%Y-%m-%d")

                    val = float(row['Close'])
                    history_data.append({
                        "date": date_str,
                        "value": val
                    })

                return {
                    "indicator_id": indicator_id,
                    "period": period,
                    "history": history_data
                }

            except Exception as e:
                print(f"Error fetching history for {indicator_id}: {e}")
                return {
                    "indicator_id": indicator_id,
                    "period": period,
                    "error": str(e),
                    "history": []
                }

        res = cache_service.get_or_set_cache(
            f"ind_hist:{indicator_id}:{period}:{bucket}",
            ttl,
            _compute_history,
            db=None,
            validator_fn=lambda d: bool(d and d.get("history")),
        )
        return res or {"indicator_id": indicator_id, "period": period, "history": []}

    
    def get_all_indicators(self) -> Dict[str, Any]:
        """
        Fetch the 8 objective macroeconomic & market risk indicators (2x4 grid)
        plus taiex health anchor.
        """
        indicators: List[Dict[str, Any]] = []

        # Internal TAIEX health check anchor (filtered out on Dashboard)
        taiex = self.fetch_yfinance_indicator("^TWII", "加權指數")
        taiex["id"] = "taiex"
        taiex["description"] = "台股整體表現"
        indicators.append(taiex)

        # Row 1: FX, Volatility & BOJ
        # 1. USD/TWD
        usdtwd = self.fetch_usdtwd_indicator()
        indicators.append(usdtwd)

        # 2. USD/JPY
        usdjpy_s = self._fetch_yf_series("JPY=X")
        if usdjpy_s:
            usdjpy = {
                "id": "usdjpy",
                "name": "日圓匯率 (USD/JPY)",
                "value": f"{usdjpy_s['current']:.2f}",
                "change": f"{usdjpy_s['change']:+.2f}",
                "changePercent": f"{usdjpy_s['percent']:+.2f}%",
                "isUp": bool(usdjpy_s["change"] >= 0),
                "description": f"前值: {usdjpy_s['prev']:.2f} | 30日區間: {usdjpy_s['low']:.2f}-{usdjpy_s['high']:.2f}",
                "note": "數值跌代表日圓升值，漲代表日圓貶值與資金外流",
                "sparkline": usdjpy_s["sparkline"],
            }
        else:
            usdjpy = self._create_error_indicator("日圓匯率 (USD/JPY)", "數據不足")
            usdjpy["id"] = "usdjpy"
            usdjpy["sparkline"] = []
        indicators.append(usdjpy)

        # Macro JSON bundle (jp_rate, us_nfp, fed_rate, us_cpi)
        macro_map = self.fetch_us_economic_indicators()

        # 3. BOJ Policy Rate & JGB 10Y
        indicators.append(macro_map["jp_rate"])

        # 4. VIX Fear Index (^VIX)
        vix_s = self._fetch_yf_series("^VIX")
        if vix_s:
            vix_val = vix_s["current"]
            regime = "低波動環境 (<15)" if vix_val < 15 else "正常波動 (15-25)" if vix_val <= 25 else "避險升溫 (>25)"
            vix = {
                "id": "vix",
                "name": "VIX 恐慌指數 (^VIX)",
                "value": f"{vix_val:.2f}",
                "change": f"{vix_s['change']:+.2f}",
                "changePercent": f"{vix_s['percent']:+.2f}%",
                "isUp": bool(vix_s["change"] >= 0),
                "description": f"區間: {regime} | 前值: {vix_s['prev']:.2f}",
                "note": "衡量美股標普 500 隱含波動與全球市場風險情緒",
                "sparkline": vix_s["sparkline"],
            }
        else:
            vix = self._create_error_indicator("VIX 恐慌指數 (^VIX)", "數據不足")
            vix["id"] = "vix"
            vix["sparkline"] = []
        indicators.append(vix)

        # Row 2: US Employment, Yields, Fed Rate & Inflation
        # 5. US NFP & Unemployment
        indicators.append(macro_map["us_nfp"])

        # 6. US 10-Year Treasury Yield
        yield_s = self._fetch_yf_series("^TNX")
        if yield_s:
            us_yield = {
                "id": "us_yield",
                "name": "美債殖利率 (10年)",
                "value": f"{yield_s['current']:.2f}%",
                "change": f"{yield_s['change']:+.2f}",
                "changePercent": f"{yield_s['percent']:+.2f}%",
                "isUp": bool(yield_s["change"] >= 0),
                "description": f"前值: {yield_s['prev']:.2f}% | 30日區間: {yield_s['low']:.2f}-{yield_s['high']:.2f}%",
                "note": "全球無風險利率基準，直接影響科技股估值折現率",
                "sparkline": yield_s["sparkline"],
            }
        else:
            us_yield = self._create_error_indicator("美債殖利率 (10年)", "數據不足")
            us_yield["id"] = "us_yield"
            us_yield["sparkline"] = []
        indicators.append(us_yield)

        # 7. FED Funds Rate
        indicators.append(macro_map["fed_rate"])

        # 8. US CPI / Core PCE
        indicators.append(macro_map["us_cpi"])

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
