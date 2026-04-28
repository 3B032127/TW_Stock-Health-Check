import time
from sqlalchemy.orm import Session
from .. import models
import requests

# 產業細分關鍵字地圖 (Sub-industry Keyword Map)
SUB_INDUSTRY_KEYWORDS = {
    # 半導體業
    "晶圓代工": ["台積電", "聯電", "世界", "力積電"],
    "IC 設計": ["聯發科", "聯詠", "瑞昱", "奇景", "譜瑞", "群聯", "祥碩", "世芯", "創意", "信驊", "立積", "敦泰", "天河", "義隆", "威盛"],
    "IC 封測": ["日月光", "京元電", "力成", "南茂", "矽格", "超豐", "頎邦", "欣銓"],
    "半導體設備": ["弘塑", "家登", "漢唐", "帆宣", "聖暉", "均豪", "萬潤", "辛耘"],
    
    # 電子零組件
    "PCB": ["欣興", "南電", "景碩", "臻鼎", "健鼎", "金像電", "華通", "台郡", "瀚宇博"],
    "被動元件": ["國巨", "華新科", "華新", "奇力新", "禾伸堂", "大毅"],
    "散熱": ["雙鴻", "超眾", "奇鋐", "泰碩", "建準", "健策", "尼得科超眾"],
    "連接器": ["嘉澤", "貿聯", "信邦", "健和興", "詮欣", "凡甲"],
    "電源供應器": ["台達電", "康舒", "全漢", "飛宏", "群電"],
    
    # 航運業
    "貨櫃航運": ["長榮", "陽明", "萬海"],
    "散裝航運": ["裕民", "慧洋", "新興", "中航", "台航", "正德"],
    "航空運輸": ["華航", "長榮航", "星宇", "虎航"],
    
    # 生技醫療
    "新藥研發": ["藥華藥", "北極星", "合一", "中裕", "浩鼎", "基亞", "智擎", "台康生"],
    "醫材": ["泰博", "精華", "晶碩", "五鼎", "雃博", "喬山", "岱宇"],
    "藥品通路/連鎖": ["大樹", "杏一", "諾貝兒", "佑全"],
    "醫美保養": ["麗豐", "大江", "佐登", "科妍", "愛閃耀"],
    
    # 觀光餐旅
    "餐飲連鎖": ["王品", "瓦城", "漢來美食", "八方雲集", "安心", "揚秦"],
    "飯店住宿": ["晶華", "雲品", "老爺知", "寒舍", "夏都", "國賓"],
    
    # 貿易百貨
    "電子商務": ["富邦媒", "網家", "東森", "創業家"],
    "便利商店": ["統一超", "全家"],
    "實體百貨": ["遠百", "三商", "特力"],
    
    # 其他重要細分
    "IPC": ["研華", "樺漢", "飛捷", "艾訊", "凌華", "廣積"],
    "伺服器": ["廣達", "緯穎", "緯創", "英業達", "鴻海"],
    "塑膠原料": ["台塑", "南亞", "台化", "台塑化"],
    "鋼鐵碳鋼": ["中鋼", "中鋼構", "中鴻", "美亞"],
    "鋼鐵不鏽鋼": ["大成鋼", "唐榮", "彰源", "允強"],
    "綠能環保": ["中興電", "亞力", "士電", "華城", "森崴能源", "雲豹能源"]
}

def categorize_stock(stock_id: str, name: str, industry: str) -> str:
    """根據名稱、代碼與大類進行細分產業歸類"""
    # 1. 優先匹配關鍵字
    for sub, keywords in SUB_INDUSTRY_KEYWORDS.items():
        for kw in keywords:
            if kw in name:
                return sub
                
    # 2. 根據代碼段落或大類進行初步細分 (Fallback)
    if industry == "金融業" or industry == "金融保險業":
        if "金控" in name: return "金控"
        if "銀行" in name: return "銀行"
        if "證券" in name: return "證券"
        if "保險" in name or "人壽" in name: return "保險"
        return "金融其他"
        
    if industry == "建材營造" or industry == "營建業":
        return "營建"
        
    return industry # 若無法細分，暫時回傳大類

async def sync_stocks_info(db: Session):
    """從 FinMind 同步並分類所有股票"""
    try:
        url = "https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInfo"
        response = requests.get(url)
        data = response.json().get("data", [])
        
        now = int(time.time())
        count = 0
        processed_ids = set()
        
        for item in data:
            sid = item["stock_id"]
            if sid in processed_ids:
                continue
            processed_ids.add(sid)
            
            name = item["stock_name"]
            industry = item["industry_category"]
            m_type = item["type"]
            
            sub_ind = categorize_stock(sid, name, industry)
            
            stock = db.query(models.Stock).filter_by(stock_id=sid).first()
            if not stock:
                stock = models.Stock(stock_id=sid)
                db.add(stock)
            
            stock.name = name
            stock.industry = industry
            stock.sub_industry = sub_ind
            stock.market_type = m_type
            stock.last_updated = now
            count += 1
            
            # 每 500 筆 commit 一次，避免 Session 過大
            if count % 500 == 0:
                db.commit()
            
        db.commit()
        return count
    except Exception as e:
        print(f"Sync stocks error: {e}")
        db.rollback()
        return 0
