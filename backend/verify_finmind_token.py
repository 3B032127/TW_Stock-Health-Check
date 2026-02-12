import os
import sys
from dotenv import load_dotenv

# Load env vars from .env.local if present, or .env
load_dotenv('.env.local')

# Override with the specific token just in case checking the file failed
os.environ["FINMIND_API_TOKEN"] = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkYXRlIjoiMjAyNi0wMi0xMyAwNDowOTo1OCIsInVzZXJfaWQiOiJyd2VpOTIwODIxIiwiZW1haWwiOiJyd2VpOTIwODIxQGdtYWlsLmNvbSIsImlwIjoiMzYuMjMyLjE0Ny4zNiJ9.1zHajZ-zdy0JGJQG5SzlSrL3c89b6qT3pm_SLvnmw4w"

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

try:
    from backend.services.sector_service import sector_service
    
    print("\n3. Testing Heatmap Logic (Representative Stocks)...")
    try:
        data = sector_service.get_sector_heatmap()
        if data:
            print(f"Success! Fetched {len(data)} sectors.")
            for item in data[:3]:
                print(item)
        else:
            print("Failed: Returned empty list.")
    except Exception as e:
        print(f"Error calling get_sector_heatmap: {e}")
        import traceback
        traceback.print_exc()

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
