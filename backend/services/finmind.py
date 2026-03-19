import httpx
import os
import asyncio
from dotenv import load_dotenv

# Load env vars from .env.local if present, or .env
# Search in root directory (two levels up from this file)
env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env.local")
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(dotenv_path=env_path)

FINMIND_API_URL = "https://api.finmindtrade.com/api/v4/data"
FINMIND_TOKEN = os.getenv("FINMIND_TOKEN", "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkYXRlIjoiMjAyNi0wMi0wNCAwMDo0NjozNiIsInVzZXJfaWQiOiJyd2VpOTIwODIxIiwiZW1haWwiOiJyd2VpOTIwODIxQGdtYWlsLmNvbSIsImlwIjoiMzYuMjMyLjEzMS4xNDUifQ.lma1rhQCzfbLYPr0RFrvnQDvwUyocmpw9swbxFh6IbU")

class FinMindClient:
    def __init__(self):
        self.client = httpx.AsyncClient()
        self.token = FINMIND_TOKEN

    async def fetch_data(self, dataset: str, stock_id: str, start_date: str, end_date: str):
        params = {
            "dataset": dataset,
            "data_id": stock_id,
            "start_date": start_date,
            "end_date": end_date,
            "token": self.token
        }
        
        try:
            response = await self.client.get(FINMIND_API_URL, params=params)
            if response.status_code == 429:
                print(f"Rate limited by FinMind (429). Retrying in 5 seconds...")
                await asyncio.sleep(5)
                return await self.fetch_data(dataset, stock_id, start_date, end_date)
                
            response.raise_for_status()
            data = response.json()
            if data["msg"] == "success":
                return data["data"]
            return []
        except Exception as e:
            print(f"Error fetching {dataset}: {e}")
            return []

    async def fetch_financial_statement(self, stock_id: str, start_date: str, end_date: str):
        return await self.fetch_data("TaiwanStockFinancialStatements", stock_id, start_date, end_date)

    async def fetch_chips(self, stock_id: str, start_date: str, end_date: str):
        return await self.fetch_data("TaiwanStockInstitutionalInvestorsBuySell", stock_id, start_date, end_date)

    async def fetch_price(self, stock_id: str, start_date: str, end_date: str):
        return await self.fetch_data("TaiwanStockPrice", stock_id, start_date, end_date)
    
    async def fetch_dividend(self, stock_id: str, start_date: str, end_date: str):
        return await self.fetch_data("TaiwanStockDividend", stock_id, start_date, end_date)

    async def fetch_per(self, stock_id: str, start_date: str, end_date: str):
        return await self.fetch_data("TaiwanStockPER", stock_id, start_date, end_date)

    async def fetch_month_revenue(self, stock_id: str, start_date: str, end_date: str):
        return await self.fetch_data("TaiwanStockMonthRevenue", stock_id, start_date, end_date)

    async def fetch_economics(self, indicator: str, start_date: str, end_date: str):
        # GovernmentBondsYield is separate, but TaiwanEconomicIndicators covers GDP, CPI etc.
        # Check FinMind docs: TaiwanEconomicIndicators, data_id=indicator
        params = {
            "dataset": "TaiwanEconomicIndicators",
            "data_id": indicator,
            "start_date": start_date,
            "end_date": end_date,
            "token": self.token
        }
        try:
            response = await self.client.get(FINMIND_API_URL, params=params)
            response.raise_for_status()
            data = response.json()
            if data["msg"] == "success":
                return data["data"]
        except Exception as e:
            print(f"Error fetching economics {indicator}: {e}")
        return []

    async def fetch_stock_info(self, stock_id: str = ""):
        """
        獲取台股股票基本資料
        
        Args:
            stock_id: 股票代碼，如果為空則返回所有股票
            
        Returns:
            股票基本資料列表
        """
        params = {
            "dataset": "TaiwanStockInfo",
            "token": self.token
        }
        
        if stock_id:
            params["data_id"] = stock_id
        
        try:
            response = await self.client.get(FINMIND_API_URL, params=params)
            response.raise_for_status()
            data = response.json()
            if data["msg"] == "success":
                return data["data"]
        except Exception as e:
            print(f"Error fetching stock info for {stock_id}: {e}")
        return []

    async def close(self):
        await self.client.aclose()
