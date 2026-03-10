import re

with open('f:\\taiwan-stock-health-check\\components\\DynamicPeerComparison.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. 新增 import UnifiedRadarChart
if "import { UnifiedRadarChart }" not in text:
    text = text.replace("import { Icon } from '../App';", "import { Icon } from '../App';\nimport { UnifiedRadarChart } from './UnifiedRadarChart';")

# 2. 拔除舊的 RadarChart imports (如果 Recharts 其他還有用到先留著)
# 我們直接利用正則把舊的 Radar Chart 元件拔除
pattern_radar_section = re.compile(r'\{\/\* Radar Chart Section \*\/\}.*?(?=<div className="overflow-x-auto">)', re.DOTALL)

replacement_radar_section = """{/* Unified Radar Chart Section */}
            {currentStock && industryAverage && (
                <UnifiedRadarChart 
                    mainStock={currentStock as any} 
                    industryAverage={industryAverage as any} 
                    industrySector={industrySector} 
                />
            )}
            
            """

text = pattern_radar_section.sub(replacement_radar_section, text)

# 3. 拔除 useMemo 產生的 radarData (不用了)
pattern_usememo_radar = re.compile(r'const radarData = useMemo\(\(\) => \{.*?(?=\s*// 動態推導欄位邏輯)', re.DOTALL)
text = pattern_usememo_radar.sub('\n    ', text)

with open('f:\\taiwan-stock-health-check\\components\\DynamicPeerComparison.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated DynamicPeerComparison.tsx with UnifiedRadarChart')
