/**
 * Economic Indicators Detail Configuration
 * Contains comprehensive information for each indicator including
 * descriptions, analysis, and historical data generation
 */

export interface IndicatorDetail {
    id: string;
    name: string;
    nameEn: string;
    code: string;
    icon: string;
    category: string;
    description: string;
    introduction: string;
    analysis: {
        title: string;
        content: string;
        positive: string;
        negative: string;
    };
    chartColor: string;
    chartGradient: string;
    unit: string;
}

export const INDICATOR_CATEGORIES = {
    FX_JAPAN: '匯率與日本總經',
    GLOBAL_RISK: '市場波動與利率',
    US_ECONOMIC: '美國核心經濟數據',
};

export const INDICATOR_DETAILS: Record<string, IndicatorDetail> = {
    usdtwd: {
        id: 'usdtwd',
        name: '台幣匯率',
        nameEn: 'USD/TWD Exchange Rate',
        code: 'TWD=X',
        icon: 'currency_exchange',
        category: INDICATOR_CATEGORIES.FX_JAPAN,
        description: '美元兌新台幣匯率，反映台幣強弱與資金流向。影響出口競爭力與外資投資意願。',
        introduction: `美元兌新台幣匯率（USD/TWD）是衡量台幣相對美元強弱的重要指標。當匯率數值上升時，代表<span class="font-bold text-white">台幣貶值</span>，反之則代表台幣升值。

台幣匯率受到多重因素影響，包括台美利差、貿易順差規模、外資投資動向、以及央行政策等。由於台灣是出口導向經濟體，匯率變動對企業獲利與股市表現有顯著影響。`,
        analysis: {
            title: '匯率與股市關聯',
            content: '台幣匯率對台股的影響呈現雙面性。適度貶值有利於出口產業，但過度波動會影響外資信心。',
            positive: '台幣適度貶值：有利於電子、傳產等出口產業獲利，提升國際競爭力。',
            negative: '台幣急貶或急升：可能引發外資撤離或進口成本上升，衝擊內需產業與整體股市。',
        },
        chartColor: '#3b82f6',
        chartGradient: 'colorUsdTwd',
        unit: '',
    },

    usdjpy: {
        id: 'usdjpy',
        name: '日圓匯率 (USD/JPY)',
        nameEn: 'USD/JPY Exchange Rate',
        code: 'JPY=X',
        icon: 'currency_yen',
        category: INDICATOR_CATEGORIES.FX_JAPAN,
        description: '美元兌日圓匯率，衡量日圓套利交易 (Carry Trade) 與亞洲避險資金動向。',
        introduction: `美元兌日圓匯率（USD/JPY）反映日本與歐美之間的利差與避險資金流向。數值下跌代表<span class="font-bold text-white">日圓升值</span>，可能引發日圓套利交易平倉。`,
        analysis: {
            title: '日圓與全球風險資產連動',
            content: '日圓作為全球低利融資貨幣，其急升或急貶往往影響亞股與科技股資金部位。',
            positive: '匯率溫和穩定：套利交易資金平穩，有利亞洲與科技股風險偏好。',
            negative: '日圓急速升值：可能觸發套利平倉賣壓，造成跨市場波動放大。',
        },
        chartColor: '#06b6d4',
        chartGradient: 'colorUsdJpy',
        unit: '',
    },

    jp_rate: {
        id: 'jp_rate',
        name: '日本央行利率 / 日債10Y',
        nameEn: 'BOJ Policy Rate & JGB 10Y',
        code: 'BOJ / JGB10Y',
        icon: 'account_balance',
        category: INDICATOR_CATEGORIES.FX_JAPAN,
        description: '日本銀行基準利率與 10 年期日本公債殖利率，全球流動性與日圓強弱的核心錨點。',
        introduction: `日本長期採取超寬鬆貨幣政策，日本央行升息與日債 10 年期殖利率攀升代表<span class="font-bold text-white">全球廉價日圓流動性收斂</span>。`,
        analysis: {
            title: '日債殖利率與資金流向',
            content: '當日本基準利率與日債殖利率上升，會縮小美日利差，帶動部分日本機構資金回流國內。',
            positive: '利率變化符合市場預期：市場消化貨幣正常化步調，資金衝擊有限。',
            negative: '央行鷹派超預期：日債殖利率急彈可能壓抑高估值風險資產。',
        },
        chartColor: '#f59e0b',
        chartGradient: 'colorJpRate',
        unit: '%',
    },

    vix: {
        id: 'vix',
        name: 'VIX 恐慌指數',
        nameEn: 'CBOE Volatility Index',
        code: '^VIX',
        icon: 'bolt',
        category: INDICATOR_CATEGORIES.GLOBAL_RISK,
        description: '衡量標普 500 指數選擇權未來 30 天的隱含波動率，反映全球市場風險偏好。',
        introduction: `VIX 指數由芝加哥期權交易所 (CBOE) 編製，俗稱「恐慌指數」。低於 15 為<span class="font-bold text-white">低波動環境</span>，15-25 為正常區間，高於 25 代表避險情緒明顯升溫。`,
        analysis: {
            title: 'VIX 區間判讀',
            content: 'VIX 通常與美股大盤呈負相關，常作為風險控管與市場情緒極值觀察指標。',
            positive: 'VIX 回落至 15-20 以下：風險情緒穩定，資金願意承擔風險投資股市。',
            negative: 'VIX 飆升突破 25：市場波動劇烈、避險買盤湧入，需控管部位槓桿。',
        },
        chartColor: '#ef4444',
        chartGradient: 'colorVix',
        unit: '',
    },

    us_yield: {
        id: 'us_yield',
        name: '美債殖利率(10年)',
        nameEn: 'US 10-Year Treasury Yield',
        code: '^TNX',
        icon: 'candlestick_chart',
        category: INDICATOR_CATEGORIES.GLOBAL_RISK,
        description: '全球資產定價之錨，反映市場對未來經濟與通膨的預期。聯準會貨幣政策的重要觀察指標。',
        introduction: `美國10年期公債殖利率（US 10-Year Treasury Yield）被廣泛視為全球金融市場的<span class="font-bold text-white">「無風險利率」(Risk-free Rate)</span>。它是投資者在評估其他資產（如股票、公司債、房地產）時的重要參考基準。

當殖利率上升時，代表市場對未來的通膨預期升高或聯準會（Fed）可能採取緊縮貨幣政策；反之，殖利率下降通常暗示經濟放緩或資金湧入避險資產。`,
        analysis: {
            title: '估值模型影響 (DCF)',
            content: '10年期公債殖利率常作為股票折現模型中的分母。當殖利率上升，未來現金流的折現價值下降，這對高本益比的成長股（如科技股）衝擊最大。',
            positive: '殖利率下行：有利於股市估值修復，特別是科技類股。資金成本降低，企業融資環境改善。',
            negative: '殖利率飆升：資金成本變貴，企業獲利承壓，資金可能流出股市轉向債市。',
        },
        chartColor: '#3b82f6',
        chartGradient: 'colorYield',
        unit: '%',
    },

    fed_rate: {
        id: 'fed_rate',
        name: 'Fed 利率',
        nameEn: 'Federal Funds Rate',
        code: 'FEDFUNDS',
        icon: 'account_balance',
        category: INDICATOR_CATEGORIES.US_ECONOMIC,
        description: '聯邦基金利率目標區間，美國貨幣政策的核心工具，影響全球資金流向。',
        introduction: `聯邦基金利率（Federal Funds Rate）是美國聯準會（Fed）最重要的貨幣政策工具，透過調整銀行間隔夜拆款利率來影響整體經濟。

Fed利率的變動會<span class="font-bold text-white">直接影響全球資金成本</span>，進而影響股市、債市、匯市等各類資產價格。升息通常用於抑制通膨，降息則用於刺激經濟成長。`,
        analysis: {
            title: 'Fed利率週期與股市',
            content: 'Fed的利率政策週期對全球股市具有決定性影響，台股作為淺碟市場更容易受到外資流向的衝擊。',
            positive: '降息週期：資金成本降低，有利於風險資產，外資可能加碼新興市場包括台股。',
            negative: '升息週期：資金回流美國，新興市場面臨資金外流壓力，台股可能承壓。',
        },
        chartColor: '#ef4444',
        chartGradient: 'colorFed',
        unit: '%',
    },

    us_cpi: {
        id: 'us_cpi',
        name: '美國CPI',
        nameEn: 'US Consumer Price Index',
        code: 'CPI',
        icon: 'shopping_cart',
        category: INDICATOR_CATEGORIES.US_ECONOMIC,
        description: '消費者物價指數，衡量通膨水平的關鍵指標，影響Fed貨幣政策決策。',
        introduction: `美國消費者物價指數（CPI）衡量一籃子消費商品與服務的價格變化，是觀察<span class="font-bold text-white">通膨壓力</span>的最重要指標之一。

Fed設定的通膨目標為2%，當CPI持續高於此目標時，Fed可能採取升息等緊縮政策；反之，若CPI過低甚至出現通縮，Fed可能轉向寬鬆政策。CPI數據公布常引發市場劇烈波動。`,
        analysis: {
            title: 'CPI與Fed政策路徑',
            content: 'CPI數據直接影響Fed的利率決策，進而影響全球資金流向與風險偏好。',
            positive: 'CPI降溫：通膨壓力緩解，Fed可能暫停升息或轉向降息，有利股市反彈。',
            negative: 'CPI超預期：通膨失控風險上升，Fed可能加速升息，股市面臨估值壓力。',
        },
        chartColor: '#eab308',
        chartGradient: 'colorCpi',
        unit: '%',
    },

    us_nfp: {
        id: 'us_nfp',
        name: '美國非農就業 & 失業率',
        nameEn: 'US Non-Farm Payrolls & Unemployment',
        code: 'NFP',
        icon: 'work',
        category: INDICATOR_CATEGORIES.US_ECONOMIC,
        description: '美國非農業部門每月新增就業人口與失業率，聯準會評估勞動市場冷熱的關鍵指標。',
        introduction: `美國非農就業報告每月第一個週五由勞工統計局發布，涵蓋新增就業人數與失業率。這是 <span class="font-bold text-white">Fed 利率決策與經濟軟/硬著陸</span> 最直接的風向球。`,
        analysis: {
            title: '非農與利率預期',
            content: '市場會在「經濟韌性」與「聯準會降息空間」之間評估非農數據強弱。',
            positive: '就業溫和成長且失業率穩定：經濟具韌性且不致阻礙降息步調。',
            negative: '就業急凍或過熱超預期：前者引發衰退擔憂，後者延後降息預期。',
        },
        chartColor: '#10b981',
        chartGradient: 'colorNfp',
        unit: '萬',
    },
};

/**
 * Generate mock historical data based on current value and trend
 */
export const generateHistoricalData = (
    currentValue: number,
    isUp: boolean,
    period: string = '1y'
): { date: string; value: number }[] => {
    const dataPoints = period === '1y' ? 12 : period === '5y' ? 60 : 24;
    const data: { date: string; value: number }[] = [];

    const trend = isUp ? 1 : -1;
    const volatility = currentValue * 0.02; // 2% volatility

    for (let i = dataPoints; i >= 0; i--) {
        const date = new Date();
        if (period === '1y') {
            date.setMonth(date.getMonth() - i);
        } else if (period === '5y') {
            date.setMonth(date.getMonth() - i);
        } else {
            date.setMonth(date.getMonth() - i);
        }

        // Calculate value with trend and random volatility
        const trendValue = (dataPoints - i) * (currentValue * 0.001) * trend;
        const randomValue = (Math.random() - 0.5) * volatility;
        const value = currentValue - trendValue + randomValue;

        data.push({
            date: date.toISOString().split('T')[0],
            value: Math.max(0, value),
        });
    }

    return data;
};
