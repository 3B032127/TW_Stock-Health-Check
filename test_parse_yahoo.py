import re
import json

with open('yahoo_1101.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Try to find window.App.context
match = re.search(r'window\.App\.context\s*=\s*({.*?>);', html)
if not match:
    match = re.search(r'root.App.main\s*=\s*(.*?);\n', html)
    
if match:
    print("Found JSON state!")
    data = match.group(1)
    print("Length:", len(data))
    with open('yahoo_json.txt', 'w', encoding='utf-8') as f2:
        f2.write(data)
else:
    print("No JSON state found.")
    
    # Try just grabbing all tags with text
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')
    texts = soup.stripped_strings
    print("First 100 text nodes:")
    count = 0
    for t in texts:
        print(t)
        count += 1
        if count > 100: break
