import random
from typing import List, Dict, Any

class SectorScraper:
    """
    Service to fetch sector performance data.
    Currently uses mock data due to scraping limitations on Yahoo Finance TW.
    """

    def get_sector_performance(self) -> List[Dict[str, Any]]:
        """
        Get sector performance data.
        Returns a list of dictionaries with name, value (volume), change (percent), and isUp.
        """
        # List of major Taiwan market sectors
        sectors = [
            "半導體", "金融保險", "航運業", "電腦週邊", "光電",
            "電子零組件", "建材營造", "鋼鐵", "塑膠", "紡織纖維",
            "電機機械", "電器電纜", "化學", "生技醫療", "橡膠",
            "汽車", "油電燃氣", "觀光", "貿易百貨", "通信網路"
        ]
        
        results = []
        
        for name in sectors:
            # Generate realistic mock data
            # Change between -5% and +5%
            change = round(random.uniform(-5, 5), 2)
            
            # Volume between 10M and 500M (weighted by sector popularity)
            base_volume = 10000000
            if name in ["半導體", "金融保險", "航運業"]:
                base_volume *= 10 # More volume for major sectors
                
            volume = int(base_volume * random.uniform(0.5, 5))
            
            results.append({
                "name": name,
                "value": volume, # Used for Treemap area size
                "change": change, # Used for color
                "isUp": change > 0
            })
            
        # Sort by value (volume) descending
        results.sort(key=lambda x: x["value"], reverse=True)
            
        return results

# Singleton instance
sector_scraper = SectorScraper()
