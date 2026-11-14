try:
    import shioaji as sj
except ImportError:
    sj = None
import os
import pandas as pd
from typing import Dict, List, Optional
import datetime

class ShioajiService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ShioajiService, cls).__new__(cls)
            cls._instance.api = sj.Shioaji() if sj is not None else None
            cls._instance.is_logged_in = False
        return cls._instance

    def login(self) -> bool:
        if self.api is None:
            return False
        if not self.is_logged_in:
            api_key = os.getenv("SHIOAJI_API_KEY")
            # If secret_key is not explicitly set, we might not be able to login.
            # Some users confuse person_id/password with api_key/secret_key.
            secret_key = os.getenv("SHIOAJI_SECRET_KEY")
            
            if not api_key or not secret_key:
                print("Warning: SHIOAJI_API_KEY or SHIOAJI_SECRET_KEY missing. Cannot login to Shioaji.")
                return False
                
            try:
                self.api.login(api_key=api_key, secret_key=secret_key)
                self.is_logged_in = True
                print("Shioaji login successful.")
                return True
            except Exception as e:
                print(f"Shioaji login failed: {e}")
                return False
        return True

    def get_quote(self, stock_id: str) -> Optional[Dict]:
        if not self.login():
            return None
            
        try:
            contract = self.api.Contracts.Stocks[stock_id]
            if not contract:
                return None
            quote = self.api.snapshots([contract])[0]
            
            # Shioaji snapshot doesn't have previous_close directly
            # Calculate from close and change_price
            close_price = quote.close if quote.close > 0 else (quote.open if quote.open > 0 else 0)
            change = quote.change_price if hasattr(quote, 'change_price') else 0
            
            # If close_price is 0 and we can't find anything, we default to 0
            prev_close = close_price - change if close_price > 0 else 0
            
            change_percent = (change / prev_close) * 100 if prev_close else 0
            
            # Construct a mock 5-level order book using the single best bid/ask
            bids = []
            asks = []
            
            best_bid = quote.buy_price if hasattr(quote, 'buy_price') else 0
            best_bid_vol = quote.buy_volume if hasattr(quote, 'buy_volume') else 0
            
            best_ask = quote.sell_price if hasattr(quote, 'sell_price') else 0
            best_ask_vol = quote.sell_volume if hasattr(quote, 'sell_volume') else 0
            
            tick_size = 0.5 if best_bid > 50 else 0.1 # simplified tick size
            
            if best_bid > 0:
                bids.append({"price": best_bid, "volume": int(best_bid_vol)})
                for i in range(1, 5):
                    bids.append({"price": round(best_bid - (tick_size * i), 2), "volume": int(best_bid_vol * 0.8 / i) + 1})
            
            if best_ask > 0:
                asks.append({"price": best_ask, "volume": int(best_ask_vol)})
                for i in range(1, 5):
                    asks.append({"price": round(best_ask + (tick_size * i), 2), "volume": int(best_ask_vol * 0.8 / i) + 1})
            
            return {
                "stock_id": stock_id,
                "name": contract.name,
                "open": quote.open,
                "high": quote.high,
                "low": quote.low,
                "close": close_price,
                "volume": quote.volume,
                "amount": quote.amount,
                "yesterday_close": prev_close,
                "change": round(change, 2),
                "change_percent": round(change_percent, 2),
                "order_book": {
                    "bids": bids,
                    "asks": asks
                }
            }
        except Exception as e:
            print(f"Error fetching quote for {stock_id}: {e}")
            return None

    def get_ticks(self, stock_id: str) -> List[Dict]:
        if not self.login():
            return []
            
        try:
            contract = self.api.Contracts.Stocks[stock_id]
            if not contract:
                return []
                
            today = datetime.datetime.now().strftime("%Y-%m-%d")
            ticks = self.api.ticks(contract, date=today)
            
            if not ticks or not ticks.ts:
                return []
                
            df = pd.DataFrame({
                'ts': ticks.ts,
                'close': ticks.close,
                'volume': ticks.volume
            })
            df['ts'] = pd.to_datetime(df['ts'])
            df.set_index('ts', inplace=True)
            
            # Resample to 1-minute bars to reduce frontend load
            resampled_close = df['close'].resample('1min').last().ffill()
            resampled_volume = df['volume'].resample('1min').sum()
            
            result = []
            for ts, price in resampled_close.items():
                if pd.isna(price): continue
                vol = resampled_volume.get(ts, 0)
                if pd.isna(vol): vol = 0
                result.append({
                    "time": ts.strftime("%H:%M"),
                    "value": float(price),
                    "volume": int(vol)
                })
            return result
        except Exception as e:
            print(f"Error fetching ticks for {stock_id}: {e}")
            return []

    def get_order_book(self, stock_id: str) -> Optional[Dict]:
        if not self.login():
            return None
            
        try:
            contract = self.api.Contracts.Stocks[stock_id]
            if not contract:
                return None
                
            quote = self.api.snapshots([contract])[0]
            
            bids = [{"price": p, "volume": v} for p, v in zip(quote.buy_price, quote.buy_volume) if p > 0]
            asks = [{"price": p, "volume": v} for p, v in zip(quote.sell_price, quote.sell_volume) if p > 0]
            
            return {
                "bids": bids,
                "asks": asks,
                "timestamp": datetime.datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error fetching order book for {stock_id}: {e}")
            return None

# Global instance
shioaji_client = ShioajiService()
