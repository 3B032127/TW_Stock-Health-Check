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
        self.reserved_for_web = 30  # 保留給網站使用者互動的最低請求次數

    def _load_tokens(self):
        env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env.local")
        if not os.path.exists(env_path):
            env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
        load_dotenv(dotenv_path=env_path, override=True)
        tokens = [
            os.getenv("FINMIND_TOKEN_1", os.getenv("FINMIND_TOKEN")),
            os.getenv("FINMIND_TOKEN_2")
        ]
        self.tokens = [
            {
                "key": t,
                "exhausted_until": 0,
                "name": f"Key_{i+1}",
                "user_count": 0,
                "limit": 600,
                "last_checked": 0
            }
            for i, t in enumerate(tokens) if t
        ]

    def get_token(self, for_background_sync: bool = False):
        """
        智慧取得可用 Token：
        - 網站日常前台查詢 (for_background_sync=False)：絕不等待，永遠即時放行（優先使用未冷卻且額度較多者，若都在冷卻中依然直接帶入 key 嘗試調用）
        - 後台批量抓取 (for_background_sync=True)：嚴格控管額度，每組 Token 扣留 reserved_for_web 次數給前台，額度吃緊時由後台程式自身負責休眠
        """
        if not self.tokens:
            self._load_tokens()
        if not self.tokens:
            return None

        now = time.time()
        
        # 1. 前台網站互動（搜尋、查看個股、走勢圖等）
        if not for_background_sync:
            # 優先找未處於冷卻狀態的 Token
            active_tokens = [t for t in self.tokens if t["exhausted_until"] <= now]
            if active_tokens:
                return min(active_tokens, key=lambda x: x["user_count"])
            # 若所有 Token 都被後台標記冷卻，前台網站直接強制借用冷卻剩餘時間最短者，絕不阻止前台發起請求
            return min(self.tokens, key=lambda x: x["exhausted_until"])

        # 2. 後台背景抓取程式
        available_tokens = []
        for t in self.tokens:
            if t["exhausted_until"] <= now:
                remaining = t["limit"] - t["user_count"]
                if remaining > self.reserved_for_web:
                    available_tokens.append(t)

        if available_tokens:
            return min(available_tokens, key=lambda x: x["user_count"])

        # 後台已無額度，回傳最早重置的 Token
        return min(self.tokens, key=lambda x: x["exhausted_until"])

    def mark_exhausted(self, token_key, reset_after_seconds=3600):
        now = time.time()
        for t in self.tokens:
            if t["key"] == token_key:
                new_exhausted_until = now + reset_after_seconds
                if new_exhausted_until > t["exhausted_until"]:
                    t["exhausted_until"] = new_exhausted_until
                    print(f"[TokenManager] {t['name']} marked exhausted until {time.strftime('%H:%M:%S', time.localtime(t['exhausted_until']))}")
                break

    async def fetch_usages(self):
        usages = []
        now = time.time()
        for t in self.tokens:
            async with httpx.AsyncClient(timeout=10.0) as client:
                try:
                    res = await client.get(
                        "https://api.web.finmindtrade.com/v2/user_info",
                        headers={"Authorization": f"Bearer {t['key']}"}
                    )
                    data = res.json()
                    user_count = data.get("user_count", 0)
                    limit = data.get("api_request_limit", 600)
                    t["user_count"] = user_count
                    t["limit"] = limit
                    t["last_checked"] = now
                    usages.append(f"{t['name']}: {user_count}/{limit}")
                    
                    # 額度若歸零或低於門檻，自動清除冷卻標記
                    if user_count < limit - 50:
                        if t["exhausted_until"] > now:
                            t["exhausted_until"] = 0
                except Exception as e:
                    usages.append(f"{t['name']}: Error")
                    print(f"[TokenManager] Error fetching usage for {t['name']}: {e}")
        return " | ".join(usages)

token_manager = TokenManager()

class FinMindClient:
    def __init__(self, for_background_sync: bool = False):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.for_background_sync = for_background_sync

    async def _fetch_with_retry(self, dataset: str, params: dict, max_retries: int = 5):
        retry_count = 0
        effective_retries = 2 if not self.for_background_sync else max_retries
        while retry_count < effective_retries:
            token_info = token_manager.get_token(for_background_sync=self.for_background_sync)
            if token_info:
                now = time.time()
                # 關鍵差異：只有「後台背景同步 (for_background_sync=True)」才會在此處等待冷卻
                # 前台主網頁發起的查詢永遠不進入 sleep 等待，直接發送請求！
                if self.for_background_sync and token_info["exhausted_until"] > now:
                    wait_time = int(token_info["exhausted_until"] - now)
                    print(f"All tokens exhausted for background sync. Waiting {wait_time}s for {token_info['name']} to reset.")
                    await asyncio.sleep(min(10, wait_time))
                    continue
                params["token"] = token_info["key"]
                token_info["user_count"] += 1
            
            try:
                response = await self.client.get(FINMIND_API_URL, params=params)
                
                if response.status_code == 402:
                    if token_info:
                        token_manager.mark_exhausted(token_info["key"], reset_after_seconds=3600)
                    # 前台即時請求若遇 402，不重複阻塞重試，直接返回空列表讓後端觸發本地資料庫兜底
                    if dataset == "TaiwanStockInfo" or not self.for_background_sync:
                        return []
                    retry_count += 1
                    await asyncio.sleep(1)
                    continue
                    
                if response.status_code == 429:
                    print(f"FinMind Token burst rate limit (429). Waiting 5s...")
                    retry_count += 1
                    await asyncio.sleep(5)
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
                await asyncio.sleep(1)
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
