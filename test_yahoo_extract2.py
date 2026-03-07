import re
import json

with open("yahoo_profile.html", "r", encoding="utf-8") as f:
    text = f.read()

# The HTML usually has something like: <div class="Py(8px) Px(12px) Bxz(bb) D(f) Ai(c) Jc(sb) Jc(fs)--minq W(100%) W(50%)--minq"><span class="C(#232a31) Fz(16px)--mb16 Fz(14px) Fw(b)">董事長</span><span class="C(#232a31) Fz(16px)--mb16 Fz(14px)">劉德音</span></div>
# Let's extract span text pairs.

data = {}
labels = ["董事長", "總經理", "實收資本額", "成立日期", "上市日期", "產業類別", "英文名稱"]

for label in labels:
    # Look for span containing label, followed by another span containing the value
    pattern = r'>' + label + r'</s[^>]+>.*?<span[^>]*>(.*?)</span>'
    match = re.search(pattern, text)
    if match:
        # Strip internal tags if any
        val = re.sub(r'<[^>]+>', '', match.group(1)).strip()
        data[label] = val

# For company description: <span class="C(#232a31) Fz(16px)--mb16 Fz(14px)">公司簡介</span>...
# The text is usually in a div right after
match = re.search(r'公司簡介.*?<div[^>]*>(.*?)</div>', text, re.DOTALL)
if match:
    val = re.sub(r'<[^>]+>', '', match.group(1)).strip()
    data["公司簡介"] = val

print(json.dumps(data, indent=2, ensure_ascii=False))
