import requests
import json

base_url = "http://localhost:8000/api/v1/stock/{}/peers"
test_targets = {
    "2330": "半導體業",
    "2504": "營建業",
    "2881": "金融保險業"
}

required_fields = {
    "2330": ["operatingMargin", "revenueYoY", "epsYoY", "currentRatio", "institutionalOwnership", "grossMargin", "inventoryTurnoverDays", "rdExpenseRatio"],
    "2504": ["netMargin", "projectGrossMargin", "contractLiabilitiesYoY", "inventoryToAssetsRatio", "debtRatio"],
    "2881": ["roa", "roe", "netIncomeYoY", "capitalAdequacyRatio", "nplRatio"]
}

def check_peers():
    print("=== Start Radar Engine Verification ===")
    all_passed = True
    
    for stock_id, industry in test_targets.items():
        print(f"\n[Testing] Stock ID: {stock_id} ({industry})")
        res = requests.get(base_url.format(stock_id))
        if res.status_code != 200:
            print(f"❌ Failed to fetch API for {stock_id}")
            all_passed = False
            continue
            
        data = res.json().get('data', {})
        peers = data.get('peers', [])
        industry_avg = data.get('industryAverage', {})
        
        if not peers:
            print(f"❌ No peers found for {stock_id}")
            all_passed = False
            continue
            
        print(f"✅ Found {len(peers)} peers.")
        
        # Check Fields for an arbitrary peer
        sample_peer = peers[0]
        missing_fields = []
        for field in required_fields[stock_id]:
            if field not in sample_peer:
                missing_fields.append(field)
                
        if missing_fields:
            print(f"❌ Missing specific properties on peer object: {missing_fields}")
            all_passed = False
        else:
            print(f"✅ Peer object contains all expected radar translation properties.")
            
        # Check Average Fields
        missing_avg_fields = []
        for field in required_fields[stock_id]:
            if field not in industry_avg:
                missing_avg_fields.append(field)
                
        if missing_avg_fields:
            print(f"❌ Missing specific properties on industryAverage: {missing_avg_fields}")
            all_passed = False
        else:
            print(f"✅ industryAverage contains all expected radar translation properties.")
            
    print("\n===============================")
    if all_passed:
        print("🎯 All radar verification passed successfully.")
    else:
        print("💥 Verification failed. Check logs above.")

if __name__ == "__main__":
    check_peers()
