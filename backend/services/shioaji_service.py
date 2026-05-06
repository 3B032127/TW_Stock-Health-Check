import shioaji as sj
import os
import pandas as pd
from typing import Dict, List, Optional
import datetime

class ShioajiService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ShioajiService, cls).__new__(cls)
            cls._instance.api = sj.Shioaji()
            cls._instance.is_logged_in = False
        return cls._instance

    def login(self) -> bool:
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
            
            close_price = quote.close if quote.close > 0 else quote.previous_close
            change = close_price - quote.previous_close if close_price and quote.previous_close else 0
            change_percent = (change / quote.previous_close) * 100 if quote.previous_close else 0
            
            return {
                "stock_id": stock_id,
                "name": contract.name,
                "open": quote.open,
                "high": quote.high,
                "low": quote.low,
                "close": close_price,
                "volume": quote.volume,
                "amount": quote.amount,
                "yesterday_close": quote.previous_close,
                "change": round(change, 2),
                "change_percent": round(change_percent, 2)
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
                result.append({
                    "time": ts.strftime("%H:%M"),
                    "value": float(price),
                    "volume": int(resampled_volume.get(ts, 0))
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
