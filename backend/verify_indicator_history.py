import sys
import os

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), "."))

from services.indicators import MarketIndicatorsService

def verify_history():
    service = MarketIndicatorsService()
    
    print("Verifying Indicator History Fetching...")
    
    # Test cases
    indicators = ["usdtwd", "sox", "us_yield"]
    periods = ["1d", "1m", "1y"]
    
    for ind in indicators:
        print(f"\n--- Testing {ind} ---")
        for p in periods:
            print(f"Fetching {p} history...")
            result = service.fetch_indicator_history(ind, p)
            
            if "error" in result:
                print(f"Error: {result['error']}")
            else:
                history = result.get("history", [])
                print(f"Success! Got {len(history)} data points.")
                if history:
                    print(f"First point: {history[0]}")
                    print(f"Last point: {history[-1]}")
                else:
                    print("Warning: Empty history returned.")

if __name__ == "__main__":
    verify_history()
