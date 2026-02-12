import os
import asyncio
import httpx
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any
from dotenv import load_dotenv

# Ensure env vars are loaded
load_dotenv(".env.local")
load_dotenv(".env")

class SectorService:
    def __init__(self):
        self.api_token = os.getenv("FINMIND_API_TOKEN") or os.getenv("FINMIND_TOKEN")
        self.base_url = "https://api.finmindtrade.com/api/v4/data"
        
        # Representative Stocks (Top Market Cap / Volume Leaders across sectors)
        self.target_stocks = [
            "2330", "2317", "2454", "2303", "2308", "3711", "3034", "3037", "3008", "2382", # Tech/Semi
            "2881", "2882", "2891", "2886", "2884", "2892", "5880", "2880", "2885", "2883", # Finance
            "2603", "2609", "2615", "2618", "2610", # Shipping/Transport
            "1301", "1303", "1326", "6505", # Plastic/Chem
            "2002", "2014", "1605", # Steel/Wire
            "1101", # Cement
            "1216", # Food
            "2412", "3045", "4904", # Telecom
            "2207", "2201", "9910", # Auto/Shoe
            "2357", "3231", "4938", "2324", "2354" # Computer/Peripherals
        ]

    async def _fetch_stock_info(self, client):
        params = {
            "dataset": "TaiwanStockInfo",
            "token": self.api_token
        }
        try:
            resp = await client.get(self.base_url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("msg") == "success":
                    return pd.DataFrame(data["data"])
            return pd.DataFrame()
        except Exception:
            return pd.DataFrame()

    async def _fetch_price(self, client, stock_id, start_date):
        params = {
            "dataset": "TaiwanStockPrice",
            "data_id": stock_id,
            "start_date": start_date,
            "token": self.api_token
        }
        try:
            resp = await client.get(self.base_url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("msg") == "success":
                    return data["data"]
            return []
        except Exception:
            return []

    async def get_sector_heatmap_async(self):
        async with httpx.AsyncClient() as client:
            # 1. Get Stock Info (for mapping sectors)
            df_info = await self._fetch_stock_info(client)
            if df_info.empty:
                return []
                
            # Filter info for our target stocks
            df_info = df_info[df_info['stock_id'].isin(self.target_stocks)]
            
            # 2. Fetch Prices Concurrently
            # Fetch last 3 days to ensure we get the latest trading day
            start_date = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")
            
            tasks = [self._fetch_price(client, stock_id, start_date) for stock_id in self.target_stocks]
            results = await asyncio.gather(*tasks)
            
            # Flatten results
            all_prices = []
            for res in results:
                if res:
                    all_prices.extend(res)
            
            if not all_prices:
                return []
                
            df_price = pd.DataFrame(all_prices)
            
            # Get latest date
            latest_date = df_price['date'].max()
            df_latest = df_price[df_price['date'] == latest_date].copy()
            
            # 3. Merge
            merged = pd.merge(
                df_latest,
                df_info[['stock_id', 'industry_category', 'stock_name']],
                on='stock_id',
                how='inner'
            )
            
            # 4. Calculate Heatmap Data
            merged['close'] = merged['close'].astype(float)
            merged['open'] = merged['open'].astype(float)
            merged['Trading_money'] = merged['Trading_money'].astype(float)
            merged['spread'] = merged['spread'].astype(float)
            
            # Calculate daily percentage change
            # Use (close - open)/open if available, or (spread / (close-spread))
            # FinMind Price usually works well with spread.
            # spread is price change. prev_close = close - spread.
            # change% = spread / prev_close * 100
            merged['prev_close'] = merged['close'] - merged['spread']
            merged['pct_change'] = merged.apply(
                lambda row: (row['spread'] / row['prev_close'] * 100) if row['prev_close'] != 0 else 0,
                axis=1
            )
            
            sectors = []
            grouped = merged.groupby('industry_category')
            
            for name, group in grouped:
                total_volume = group['Trading_money'].sum()
                
                # We are sampling, so the Total Volume is smaller than reality.
                # But for heatmap relative size, it works.
                # Maybe scale it up? No, keep it real for the constituents.
                
                # Weighted Average Change
                if total_volume > 0:
                    weighted_change = (group['pct_change'] * group['Trading_money']).sum() / total_volume
                else:
                    weighted_change = group['pct_change'].mean()
                
                sectors.append({
                    "name": name,
                    "value": int(total_volume),
                    "change": float(round(weighted_change, 2)),
                    "count": int(len(group))
                })
            
            sectors.sort(key=lambda x: x['value'], reverse=True)
            return sectors

    def get_sector_heatmap(self) -> List[Dict[str, Any]]:
        # wrapper for sync call if needed, but main.py is async so we should call async method
        # However, verifying script calls this.
        return asyncio.run(self.get_sector_heatmap_async())

sector_service = SectorService()

