import httpx
import os
import asyncio
import time
from dotenv import load_dotenv

# Load env vars from .env.local if present, or .env
env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env.local")
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(dotenv_path=env_path)

FINMIND_API_URL = "https://api.finmindtrade.com/api/v4/data"

class TokenManager:
    def __init__(self):
        self._load_tokens()
        self.current_idx = 0

    def _load_tokens(self):
        env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env.local")
        if not os.path.exists(env_path):
            env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
        load_dotenv(dotenv_path=env_path, override=True)
        tokens = [
            os.getenv("FINMIND_TOKEN_1", os.getenv("FINMIND_TOKEN")),
            os.getenv("FINMIND_TOKEN_2")
        ]
        self.tokens = [{"key": t, "exhausted_until": 0, "name": f"Key_{i+1}"} for i, t in enumerate(tokens) if t]

    def get_token(self):
        if not self.tokens:
            self._load_tokens()
        if not self.tokens:
            return None

        now = time.time()
        for i in range(len(self.tokens)):
            idx = (self.current_idx + i) % len(self.tokens)
            if self.tokens[idx]["exhausted_until"] < now:
                self.current_idx = idx
                return self.tokens[idx]
        
        # If all exhausted, return the one that will reset soonest
        soonest_idx = min(range(len(self.tokens)), key=lambda i: self.tokens[i]["exhausted_until"])
        self.current_idx = soonest_idx
        return self.tokens[soonest_idx]

    def mark_exhausted(self, token_key, reset_after_seconds=3600):
        now = time.time()
        for t in self.tokens:
            if t["key"] == token_key:
                new_exhausted_until = now + reset_after_seconds
                # Only update if the new exhaustion time is further in the future
                if new_exhausted_until > t["exhausted_until"]:
                    t["exhausted_until"] = new_exhausted_until
                    print(f"[TokenManager] {t['name']} marked exhausted until {time.strftime('%H:%M:%S', time.localtime(t['exhausted_until']))}")
                break

    async def fetch_usages(self):
        usages = []
        for t in self.tokens:
            # Use a fresh client for each request to avoid cookie sharing across tokens
            async with httpx.AsyncClient(timeout=10.0) as client:
                try:
                    res = await client.get(
                        "https://api.web.finmindtrade.com/v2/user_info",
                        headers={"Authorization": f"Bearer {t['key']}"}
                    )
                    data = res.json()
                    user_count = data.get("user_count", 0)
                    limit = data.get("api_request_limit", 600)
                    usages.append(f"{t['name']}: {user_count}/{limit}")
                    
                    # Proactively mark exhausted if usage is >= limit - 20 (e.g., 580/600)
                    if limit > 0 and user_count >= limit - 20:
                        now = time.time()
                        # Bug fix: If the token just reset (exhausted_until was in the past), 
                        # don't immediately re-mark it. Wait at least 60s for server to reset counter.
                        # We use a grace period of 60 seconds after the supposed reset time.
                        if now > t["exhausted_until"] + 60:
                            t["exhausted_until"] = now + 3600
                            print(f"[TokenManager] Proactively marked {t['name']} as exhausted due to high usage ({user_count}/{limit})")
                except Exception as e:
                    usages.append(f"{t['name']}: Error")
                    print(f"[TokenManager] Error fetching usage for {t['name']}: {e}")
        return " | ".join(usages)

token_manager = TokenManager()

class FinMindClient:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)

    async def _fetch_with_retry(self, dataset: str, params: dict, max_retries: int = 5):
        retry_count = 0
        while retry_count < max_retries:
            token_info = token_manager.get_token()
            if token_info:
                now = time.time()
                if token_info["exhausted_until"] > now:
                    wait_time = int(token_info["exhausted_until"] - now)
                    print(f"All tokens exhausted. Waiting {wait_time}s for {token_info['name']} to reset.")
                    await asyncio.sleep(min(10, wait_time)) # Sleep in smaller increments
                    continue
                params["token"] = token_info["key"]
            
            try:
                response = await self.client.get(FINMIND_API_URL, params=params)
                
                if response.status_code == 402:
                    # Specific optimization: TaiwanStockInfo often hits IP limits differently.
                    # If it's a metadata request, we might not want to kill the token for an hour
                    if dataset == "TaiwanStockInfo":
                        print(f"FinMind Token cannot fetch stock list (402). Skipping metadata...")
                        return []
                        
                    if token_info:
                        print(f"FinMind Token {token_info['name']} quota exhausted (402). Switching...")
                        token_manager.mark_exhausted(token_info["key"], reset_after_seconds=3600)
                    retry_count += 1
                    await asyncio.sleep(2)
                    continue
                    
                if response.status_code == 429:
                    print(f"FinMind Token burst rate limit (429). Waiting 10s...")
                    # 429 is usually a short-term burst limit, don't kill the token for an hour
                    retry_count += 1
                    await asyncio.sleep(10)
                    continue
                    
                response.raise_for_status()
                data = response.json()
                if data["msg"] == "success":
                    return data["data"]
                return []
            except Exception as e:
                print(f"Error fetching {dataset} (Attempt {retry_count+1}): {e}")
                if retry_count >= max_retries - 1:
                    return []
                retry_count += 1
                await asyncio.sleep(2)
        return []


    async def fetch_data(self, dataset: str, stock_id: str, start_date: str, end_date: str):
        params = {
            "dataset": dataset,
            "data_id": stock_id,
            "start_date": start_date,
            "end_date": end_date
        }
        return await self._fetch_with_retry(dataset, params)

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
            "end_date": end_date
        }
        return await self._fetch_with_retry("TaiwanEconomicIndicators", params)

    async def fetch_stock_info(self, stock_id: str = ""):
        """
        獲取台股股票基本資料
        """
        params = {
            "dataset": "TaiwanStockInfo"
        }
        
        if stock_id:
            params["data_id"] = stock_id
            
        return await self._fetch_with_retry("TaiwanStockInfo", params)

    async def close(self):
        await self.client.aclose()
