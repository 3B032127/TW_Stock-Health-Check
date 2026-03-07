import httpx
from bs4 import BeautifulSoup
import asyncio
import json

async def scrape_profile(stock_id):
    url = f"https://tw.stock.yahoo.com/quote/{stock_id}.TW/profile"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    async with httpx.AsyncClient(headers=headers, timeout=10.0) as client:
        response = await client.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # In Yahoo Finance TW, basic info is usually in a div containing terms like "董事長", "總經理" etc.
        # Let's just find and print all text for a quick inspection, or try to select specific spans
        # Usually it's in a grid or list.
        
        profile_data = {}
        
        # Try to find elements that might contain the labels
        labels_to_find = ["董事長", "總經理", "實收資本額", "成立日期", "上市日期", "營利事業統一編號", "產業類別", "英文名稱"]
        
        # Method 1: Iterating over all divs/spans
        for label in labels_to_find:
            element = soup.find(text=lambda x: x and label in x)
            if element:
                # Find the next sibling or parent's next sibling that contains the value
                parent = element.parent
                # Usually it's <div class="W(50%)"><span class="...">董事長</span><span class="...">劉德音</span></div>
                if parent:
                    # Look at siblings of parent or siblings inside the same container
                    parent_container = parent.parent
                    if parent_container:
                        texts = [t.strip() for t in parent_container.strings if t.strip()]
                        if len(texts) >= 2:
                            # It's likely the first is label, second is value
                            idx = texts.index(label) if label in texts else -1
                            if idx != -1 and idx + 1 < len(texts):
                                profile_data[label] = texts[idx+1]

        # Company description is usually under "公司簡介"
        desc_label = soup.find(text=lambda x: x and "公司簡介" in x)
        if desc_label:
            parent_container = desc_label.parent.parent
            if parent_container:
                # The text might be in the next container
                # Let's just try to find the next few sibling tags and get their text
                next_div = parent_container.find_next_sibling('div')
                if next_div:
                    profile_data["公司簡介"] = next_div.get_text(strip=True)

        print(json.dumps(profile_data, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(scrape_profile("2330"))
