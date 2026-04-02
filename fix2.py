import sys

with open('backend/services/finance.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = lines[:550] # Line 550 is the closing bracket of calculate_health_check return

append_text = """
async def generate_pros_cons_with_gemini(stock_id: str, data: dict):
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        return _generate_rule_based_pros_cons(data)
    
    try:
        genai.configure(api_key=gemini_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        roe = data['dupont']['roe']
        moat = data['moatScore']
        pe = data['pePercentile']
        cash = data['cashConversion']
        quadrant = data.get('decisionQuadrant', 'Fairly Valued')
        peg = data.get('peg', 0)
        
        prompt = f'''
        請根據以下台股股票的最新真實財務健檢數據，生成 3 點「優勢 (pros)」與 3 點「風險與弱勢 (cons)」，並在最上方提供一段總結 (aiSummary)。
        返回格式必須為純 JSON (無 Markdown)，包含 "aiSummary" (string), "pros" (list of strings) 與 "cons" (list of strings)。
        
        【重要結論邏輯】
        1. 結論先行：aiSummary 請提供約 30 字的快速判斷，例如「目前基本面極強，但估值位於歷史高位，建議分批佈局」。
        2. 避免邏輯矛盾：如果「決策象限」為 {quadrant}，或者 P/E 分位數為 {pe}% (偏高代表昂貴)，請在 Cons 中點出估值風險，並且 Pros 絕對不可以說「估值具備吸引力」。

        資料：
        - 決策象限：{quadrant} (Quality Undervalued=優質低估, Growth Premium=成長溢價, Value Trap=價值陷阱, Fairly Valued=合理評價)
        - 杜邦分析 ROE: {roe}%
        - P/E 處於近五年分位數: {pe}% (越低代表越便宜)
        - PEG 估值: {peg}
        - 獲利穩定護城河分數: {moat} 分 (滿分100)
        - 現金轉向率: {cash}%
        - 毛利率現況: {data['profitability']['items'][0]['value']}
        - 自由現金流: {data['growth']['items'][2]['value']}
        '''
        response = await asyncio.to_thread(model.generate_content, prompt)
        text = response.text
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1]
            
        result = json.loads(text.strip())
        fallback = _generate_rule_based_pros_cons(data)
        return {
            "aiSummary": result.get("aiSummary", fallback.get("aiSummary", "基本面表現平穩，請參閱詳細指標。")),
            "pros": result.get("pros", [])[:3] or fallback["pros"],
            "cons": result.get("cons", [])[:3] or fallback["cons"]
        }
    except Exception as e:
        print(f"Gemini Pros/Cons error: {e}")
        return _generate_rule_based_pros_cons(data)

def _generate_rule_based_pros_cons(data: dict):
    pros = []
    cons = []
    
    roe = data.get('dupont', {}).get('roe', 0)
    if roe > 15:
        pros.append(f"具備高水平的股東權益報酬率 (ROE {roe}%)")
    elif roe < 5:
        cons.append(f"股東權益報酬率偏低 (ROE {roe}%)")
        
    pe_percentile = data.get('pePercentile', 50)
    if pe_percentile < 30:
        pros.append("估值具備一定吸引力，處於歷史低位區間")
    elif pe_percentile > 80:
        cons.append("目前市場估值偏高，具備追高風險")
        
    cash = data.get('cashConversion', 0)
    if cash > 100:
        pros.append("獲利轉現金效率極高 (現金轉向率>100%)")
    elif cash < 50:
        cons.append("營業現金流入能力偏弱")
        
    moat = data.get('moatScore', 0)
    if moat >= 80:
        pros.append("具備強大穩定性與配息護城河")
    elif moat <= 40:
        cons.append("長期獲利穩定性與配息能力不足")

    if not pros: pros.append("各項核心指標表現平穩，符合產業均值")
    if not cons: cons.append("財務結構穩健，暫無顯著異常風險訊號")
    
    quadrant = data.get('decisionQuadrant', 'Fairly Valued')
    summary = "基本面表現平穩，請參閱詳細指標。"
    if quadrant == "Quality Undervalued": summary = "體質優良且估值偏低，具備中長線投資價值。"
    elif quadrant == "Growth Premium": summary = "增長強勁但估值偏高，建議關注成長動能是否延續。"
    elif quadrant == "Value Trap": summary = "估值雖低但體質孱弱，請留意是否為價值陷阱。"
    
    return {"aiSummary": summary, "pros": pros[:3], "cons": cons[:3]}
"""

with open('backend/services/finance.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
    f.write(append_text)
