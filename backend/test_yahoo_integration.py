import sys
import os
from pathlib import Path

# Add backend directory to path
sys.path.append(str(Path(__file__).parent))

from services.indicators import get_indicators_service

def test_integration():
    print("Testing MarketIndicatorsService with Yahoo scraping...")
    service = get_indicators_service()
    
    # Test fetch_taiex_data
    result = service.fetch_taiex_data(period="1d")
    
    current = result.get("current", {})
    volume = current.get("volume")
    turnover = current.get("turnover")
    
    print(f"\nResult for TAIEX:")
    print(f"Date: {current.get('date')}")
    print(f"Price: {current.get('price')}")
    print(f"Volume: {volume}")
    print(f"Turnover: {turnover}")
    
    if volume and volume > 0:
        print("\nSUCCESS: Volume fetched successfully!")
    else:
        print("\nFAILURE: Volume is 0 or missing.")

    if turnover and turnover > 0:
        print(f"SUCCESS: Turnover fetched successfully! ({turnover})")
    else:
        print("WARNING: Turnover is 0 or missing.")

if __name__ == "__main__":
    test_integration()
