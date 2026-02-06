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
}

export const INDICATOR_CATEGORIES = {
    TAIWAN: '台灣市場指標',
    SEMICONDUCTOR: '半導體相關',
    US_MARKET: '美國市場指標',
    US_ECONOMIC: '美國經濟數據',
};

export const INDICATOR_DETAILS: Record<string, IndicatorDetail> = {
    usdtwd: {
        id: 'usdtwd',
        name: '台幣匯率',
        nameEn: 'USD/TWD Exchange Rate',
        code: 'TWD=X',
        icon: 'currency_exchange',
        category: INDICATOR_CATEGORIES.TAIWAN,
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
    },

    monitor_light: {
        id: 'monitor_light',
        name: '景氣對策信號',
        nameEn: 'Economic Monitor Light',
        code: 'NDC',
        icon: 'traffic',
        category: INDICATOR_CATEGORIES.TAIWAN,
        description: '國發會發布的景氣綜合判斷指標，以燈號顏色反映經濟景氣狀況。',
        introduction: `景氣對策信號由國家發展委員會每月發布，綜合9項經濟指標編製而成，以<span class="font-bold text-white">五種燈號</span>反映當前景氣狀況。

<div class="my-4 space-y-2">
  <div class="flex items-center gap-3 p-2 rounded" style="background-color: rgba(239, 68, 68, 0.1);">
    <div class="w-4 h-4 rounded-full" style="background-color: #ef4444;"></div>
    <span class="font-bold text-white">紅燈 (38-45分)</span>
    <span class="text-textMuted">景氣過熱</span>
  </div>
  <div class="flex items-center gap-3 p-2 rounded" style="background-color: rgba(249, 115, 22, 0.1);">
    <div class="w-4 h-4 rounded-full" style="background-color: #f97316;"></div>
    <span class="font-bold text-white">黃紅燈 (32-37分)</span>
    <span class="text-textMuted">景氣轉向熱絡</span>
  </div>
  <div class="flex items-center gap-3 p-2 rounded" style="background-color: rgba(16, 185, 129, 0.1);">
    <div class="w-4 h-4 rounded-full" style="background-color: #10b981;"></div>
    <span class="font-bold text-white">綠燈 (23-31分)</span>
    <span class="text-textMuted">景氣穩定</span>
  </div>
  <div class="flex items-center gap-3 p-2 rounded" style="background-color: rgba(6, 182, 212, 0.1);">
    <div class="w-4 h-4 rounded-full" style="background-color: #06b6d4;"></div>
    <span class="font-bold text-white">黃藍燈 (17-22分)</span>
    <span class="text-textMuted">景氣轉向低迷</span>
  </div>
  <div class="flex items-center gap-3 p-2 rounded" style="background-color: rgba(59, 130, 246, 0.1);">
    <div class="w-4 h-4 rounded-full" style="background-color: #3b82f6;"></div>
    <span class="font-bold text-white">藍燈 (9-16分)</span>
    <span class="text-textMuted">景氣低迷</span>
  </div>
</div>

綜合判斷分數由貨幣總計數M1B、股價指數、工業生產指數等9項指標加權計算而得，是觀察台灣總體經濟的重要先行指標。`,
        analysis: {
            title: '景氣燈號的投資意義',
            content: '景氣對策信號是觀察台灣總體經濟的重要先行指標，對股市中長期走勢具有參考價值。',
            positive: '綠燈或黃紅燈：經濟穩定成長或加溫，有利於股市表現，可積極布局。',
            negative: '黃藍燈或藍燈：經濟降溫或衰退，股市可能面臨壓力，宜謹慎保守。',
        },
        chartColor: '#10b981',
        chartGradient: 'colorMonitor',
    },

    sox: {
        id: 'sox',
        name: '費城半導體指數',
        nameEn: 'Philadelphia Semiconductor Index',
        code: '^SOX',
        icon: 'memory',
        category: INDICATOR_CATEGORIES.SEMICONDUCTOR,
        description: '追蹤美國主要半導體公司的股價指數，為全球半導體產業景氣的領先指標。',
        introduction: `費城半導體指數（SOX）由費城證券交易所編製，追蹤30家主要半導體設計、製造、設備與材料公司的股價表現，包括英特爾、輝達、台積電ADR等。

由於台灣是全球半導體製造重鎮，<span class="font-bold text-white">SOX指數與台股高度連動</span>，特別是對台積電、聯發科等權值股影響顯著。該指數常被視為科技股與台股的領先指標。`,
        analysis: {
            title: '半導體指數對台股的影響',
            content: 'SOX指數反映全球半導體產業景氣，直接影響台灣半導體供應鏈的訂單與獲利預期。',
            positive: 'SOX上漲：全球半導體需求強勁，有利台灣晶圓代工、IC設計、封測等產業鏈。',
            negative: 'SOX下跌：產業進入庫存調整或需求放緩，台股科技類股可能面臨修正壓力。',
        },
        chartColor: '#8b5cf6',
        chartGradient: 'colorSox',
    },

    tsmc_outlook: {
        id: 'tsmc_outlook',
        name: '台積電展望',
        nameEn: 'TSMC Outlook',
        code: 'TSMC',
        icon: 'psychology',
        category: INDICATOR_CATEGORIES.SEMICONDUCTOR,
        description: 'AI分析台積電近期營運展望與市場情緒，作為台股科技類股的風向指標。',
        introduction: `台積電（TSMC）作為全球最大晶圓代工廠，其營運展望對台股具有指標性意義。本指標透過<span class="font-bold text-white">AI分析</span>台積電法說會、營收數據、產能利用率等資訊，綜合評估市場情緒。

台積電市值佔台股權重超過30%，其股價走勢往往主導大盤方向。此外，台積電的訂單能見度也反映全球科技產業的景氣狀況。`,
        analysis: {
            title: '台積電展望的市場意義',
            content: '台積電展望不僅影響個股，更是台股整體走勢與外資投資台灣的重要參考。',
            positive: '展望樂觀：先進製程需求強勁，帶動台股科技類股與大盤上漲，外資加碼。',
            negative: '展望保守：產業進入淡季或客戶砍單，可能拖累台股表現，資金轉向觀望。',
        },
        chartColor: '#f97316',
        chartGradient: 'colorTsmc',
    },

    us_yield: {
        id: 'us_yield',
        name: '美債殖利率(10年)',
        nameEn: 'US 10-Year Treasury Yield',
        code: '^TNX',
        icon: 'candlestick_chart',
        category: INDICATOR_CATEGORIES.US_MARKET,
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
    },

    fed_rate: {
        id: 'fed_rate',
        name: 'Fed 利率',
        nameEn: 'Federal Funds Rate',
        code: 'FEDFUNDS',
        icon: 'account_balance',
        category: INDICATOR_CATEGORIES.US_MARKET,
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
    },

    us_ppi: {
        id: 'us_ppi',
        name: '美國PPI',
        nameEn: 'US Producer Price Index',
        code: 'PPI',
        icon: 'factory',
        category: INDICATOR_CATEGORIES.US_ECONOMIC,
        description: '生產者物價指數，反映上游成本壓力，領先CPI的通膨先行指標。',
        introduction: `美國生產者物價指數（PPI）衡量生產者（製造商、批發商）出售商品的價格變化，反映<span class="font-bold text-white">上游成本壓力</span>。

PPI通常領先CPI 1-2個月，因為生產者的成本上漲最終會轉嫁給消費者。因此，PPI是觀察未來通膨趨勢的重要先行指標，對預判Fed政策方向具有參考價值。`,
        analysis: {
            title: 'PPI的領先意義',
            content: 'PPI作為通膨的領先指標，其變化趨勢有助於提前判斷Fed政策轉向的可能性。',
            positive: 'PPI回落：上游成本壓力緩解，未來CPI可能降溫，減輕Fed緊縮壓力。',
            negative: 'PPI攀升：原物料與能源成本上漲，可能推升未來CPI，Fed政策趨緊。',
        },
        chartColor: '#06b6d4',
        chartGradient: 'colorPpi',
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
