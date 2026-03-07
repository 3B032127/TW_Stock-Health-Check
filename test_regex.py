import re

# Simulate the label extraction from HTML
def test_extract():
    # snippet from yahoo HTML
    html = """
    <div class="Py(8px) Px(12px) Bxz(bb) D(f) Ai(c) Jc(sb) Jc(fs)--minq W(100%) W(50%)--minq">
        <span class="C(#232a31) Fz(16px)--mb14 Mstart(12px)">董事長</span>
        <span class="Fz(16px) C(#232a31) Fw(b)">辜公怡</span>
    </div>
    """
    labels = ["董事長", "總經理", "實收資本額", "成立日期", "上市日期", "產業類別"]
    chinese_profile = {}
    
    for label in labels:
        # Instead of just the next span, we need to match the structure better.
        # The label is in one span, and the value is in the next span with Fw(b) or similar.
        # `<span[^>]*>董事長</span>\s*<span[^>]*>(.*?)</span>`
        pattern = r'<span[^>]*>' + label + r'</span>\s*<a[^>]*>(.*?)</a>|<span[^>]*>' + label + r'</span>\s*<span[^>]*>(.*?)</span>'
        match = re.search(pattern, html)
        if match:
            # group 1 is a tag, group 2 is span tag
            val = match.group(1) if match.group(1) else match.group(2)
            if val:
                val = re.sub(r'<[^>]+>', '', val).strip()
                chinese_profile[label] = val
                
    print(chinese_profile)

test_extract()
