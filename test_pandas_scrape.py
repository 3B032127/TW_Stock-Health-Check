import pandas as pd
import httpx
import asyncio

async def main():
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    # Dividend
    url_div = "https://tw.stock.yahoo.com/quote/1101/dividend"
    res_div = httpx.get(url_div, headers=headers)
    try:
        dfs = pd.read_html(res_div.text)
        print("--- Dividend Tables ---")
        for i, df in enumerate(dfs):
            print(f"Table {i}:")
            print(df.head())
    except Exception as e:
        print("Pandas read_html failed for dividend:", e)
        
    # Revenue
    url_rev = "https://tw.stock.yahoo.com/quote/1101/revenue"
    res_rev = httpx.get(url_rev, headers=headers)
    try:
        dfs2 = pd.read_html(res_rev.text)
        print("--- Revenue Tables ---")
        for i, df in enumerate(dfs2):
            print(f"Table {i}:")
            print(df.head())
    except Exception as e:
        print("Pandas read_html failed for revenue:", e)

if __name__ == "__main__":
    asyncio.run(main())
