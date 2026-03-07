from bs4 import BeautifulSoup
import re

with open('yahoo_1101.html', 'r', encoding='utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')
texts = list(soup.stripped_strings)

profile = {}
labels = ["董事長", "總經理", "實收資本額", "成立日期", "上市日期", "產業類別"]

for i, t in enumerate(texts):
    if t in labels:
        if i + 1 < len(texts):
            profile[t] = texts[i+1]

print("Profile dict:", profile)

descriptions = [t for t in texts if len(t) > 30 and 'Yahoo' not in t and '服務條款' not in t and '建議您' not in t]
if descriptions:
    desc = max(descriptions, key=len)
    print("Found description:")
    print(desc)
    profile['公司簡介'] = desc

