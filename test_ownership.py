import asyncio
import os
import sys

sys.path.append(os.getcwd())

from backend.services.finmind import FinMindClient
from datetime import datetime, timedelta

async def test():
    client = FinMindClient()
    
    end = datetime.now().strftime("%Y-%m-%d")
    start = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
    
    datasets = ["TaiwanStockShareholding", "TaiwanStockHoldingSharesPer"]
    
    with open('test_out3.txt', 'w', encoding='utf-8') as f:
        for dataset in datasets:
            f.write(f"Testing {dataset}...\n")
            try:
                data = await client.fetch_data(dataset, "2330", start, end)
                if data:
                    f.write(f"Result for {dataset}: {data[-1]}\n")
                else:
                    f.write(f"No data for {dataset}\n")
            except Exception as e:
                f.write(f"Failed {dataset}: {e}\n")
                
    await client.close()

if __name__ == "__main__":
    asyncio.run(test())
