import requests
import json

response = requests.get('http://localhost:8000/api/v1/market/indicators')
data = response.json()

print(json.dumps(data, indent=2, ensure_ascii=False))

# Print each indicator clearly
print("\n=== 指標詳情 ===")
for ind in data['data']['indicators']:
    print(f"\n{ind['name']}:")
    print(f"  ID: {ind['id']}")
    print(f"  數值: {ind['value']}")
    print(f"  變化: {ind['change']}")
    if ind.get('changePercent'):
        print(f"  變化%: {ind['changePercent']}")
    if ind.get('description'):
        print(f"  說明: {ind['description']}")
    if ind.get('note'):
        print(f"  備註: {ind['note']}")
    if ind.get('text'):
        print(f"  內容: {ind['text']}")
