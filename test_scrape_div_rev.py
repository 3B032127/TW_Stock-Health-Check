import httpx
import asyncio
from bs4 import BeautifulSoup
import json

async def scrape_dividend_revenue(stock_id):
    async with httpx.AsyncClient(headers={'User-Agent': 'Mozilla/5.0'}) as client:
        # Dividend
        div_url = f"https://tw.stock.yahoo.com/quote/{stock_id}/dividend"
        div_res = await client.get(div_url)
        div_soup = BeautifulSoup(div_res.text, 'html.parser')
        
        # In Yahoo Finance TW, dividend data is usually in a list or table.
        # Let's find rows containing "股利所屬期間"
        # We can extract text chunks
        texts = list(div_soup.stripped_strings)
        
        dividends = []
        try:
            # simple heuristic parser for dividend
            for i, t in enumerate(texts):
                if t == "現金股利" and texts[i-4] == "股利所屬期間":
                    year = texts[i-3]
                    cash = texts[i+1]
                    stock = texts[i+5] if i+5 < len(texts) and texts[i+4] == "股票股利" else "0"
                    
                    # find exc-dividend date
                    exc_date = "-"
                    # search ahead for 除息日期
                    for j in range(i, min(i+40, len(texts))):
                        if texts[j] == "除息日期":
                            exc_date = texts[j+1]
                            break
                    
                    dividends.append({
                        "year": year,
                        "cash": float(cash) if cash != "-" else 0,
                        "stock": float(stock) if stock != "-" else 0,
                        "date": exc_date
                    })
        except Exception as e:
            print("Dividend parse error:", e)

        # Revenue Mix
        rev_url = f"https://tw.stock.yahoo.com/quote/{stock_id}/revenue"
        rev_res = await client.get(rev_url)
        rev_soup = BeautifulSoup(rev_res.text, 'html.parser')
        texts_rev = list(rev_soup.stripped_strings)
        
        revenue_mix = []
        try:
            # find "業務營收比重" or "產品發布"
            for i, t in enumerate(texts_rev):
                if "營收比重" in t:
                    # After this, it lists product name and percentage
                    pass
        except Exception as e:
            print("Revenue parse error:", e)
            
        print("Dividends:", json.dumps(dividends[:5], ensure_ascii=False, indent=2))
        
        # let's just dump the revenue texts to see
        print("--- Revenue Texts ---")
        found = False
        for t in texts_rev:
            if "營收比重" in t:
                found = True
            if found:
                print(t)

asyncio.run(scrape_dividend_revenue("1101"))
asyncio.run(scrape_dividend_revenue("2330"))
