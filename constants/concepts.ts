export interface KeyIndicator {
    label: string;
    value: string;
    icon: string;
    color: string;
}

export interface ValueChainSection {
    title: string;
    items: string[];
}

export interface ValueChain {
    upstream: ValueChainSection;
    midstream: ValueChainSection;
    downstream: ValueChainSection;
}

export interface StockDetailSnapshot {
    name: string;
    change: number;
    marketCap: string;
    price?: number;
}

export interface Concept {
    id: string;
    category: string;
    name: string;
    description: string;
    icon: string;
    hasNewActivity: boolean;
    verifiedDate: string;
    stocks: string[];
    // IC Design detailed properties
    cagr?: string;
    marketSize?: string;
    keyIndicators?: KeyIndicator[];
    valueChain?: ValueChain;
    stockSnapshots?: Record<string, StockDetailSnapshot>;
}


export const CATEGORIES = [
    "記憶體",
    "先進封測",
    "IC 設計",
    "半導體製造",
    "AI 伺服器",
    "散熱冷卻",
    "網通衛星",
    "基板材料",
    "被動元件",
    "電子零組件",
    "光學顯示",
    "傳產工業",
    "綠能環保",
    "醫療器材",
    "消費終端",
    "智慧機器人",
    "軟體資安",
    "金融航運"
];

export interface ConceptColor {
    border: string;
    text: string;
    badge: string;
    glow: string;
    bg: string;
}

export const CONCEPT_COLORS: Record<string, ConceptColor> = {
    "記憶體": {
        border: "border-blue-500/20 hover:border-blue-500/50",
        text: "text-blue-400",
        badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        glow: "hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]",
        bg: "bg-blue-500/10"
    },
    "先進封測": {
        border: "border-fuchsia-500/20 hover:border-fuchsia-500/50",
        text: "text-fuchsia-400",
        badge: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
        glow: "hover:shadow-[0_0_15px_rgba(217,70,239,0.15)]",
        bg: "bg-fuchsia-500/10"
    },
    "IC 設計": {
        border: "border-amber-500/20 hover:border-amber-500/50",
        text: "text-amber-400",
        badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        glow: "hover:shadow-[0_0_15px_rgba(245,158,11,0.15)]",
        bg: "bg-amber-500/10"
    },
    "半導體製造": {
        border: "border-sky-500/20 hover:border-sky-500/50",
        text: "text-sky-400",
        badge: "bg-sky-500/10 text-sky-400 border-sky-500/20",
        glow: "hover:shadow-[0_0_15px_rgba(14,165,233,0.15)]",
        bg: "bg-sky-500/10"
    },
    "AI 伺服器": {
        border: "border-cyan-500/20 hover:border-cyan-500/50",
        text: "text-cyan-400",
        badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
        glow: "hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]",
        bg: "bg-cyan-500/10"
    },
    "散熱冷卻": {
        border: "border-teal-500/20 hover:border-teal-500/50",
        text: "text-teal-400",
        badge: "bg-teal-500/10 text-teal-400 border-teal-500/20",
        glow: "hover:shadow-[0_0_15px_rgba(20,184,166,0.15)]",
        bg: "bg-teal-500/10"
    },
    "網通衛星": {
        border: "border-indigo-500/20 hover:border-indigo-500/50",
        text: "text-indigo-400",
        badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
        glow: "hover:shadow-[0_0_15px_rgba(99,102,241,0.15)]",
        bg: "bg-indigo-500/10"
    },
    "基板材料": {
        border: "border-purple-400/20 hover:border-purple-400/50",
        text: "text-purple-350",
        badge: "bg-purple-500/10 text-purple-300 border-purple-500/20",
        glow: "hover:shadow-[0_0_15px_rgba(168,85,247,0.15)]",
        bg: "bg-purple-500/10"
    },
    "被動元件": {
        border: "border-slate-400/20 hover:border-slate-400/50",
        text: "text-slate-350",
        badge: "bg-slate-500/10 text-slate-300 border-slate-500/20",
        glow: "hover:shadow-[0_0_15px_rgba(148,163,184,0.15)]",
        bg: "bg-slate-500/10"
    },
    "電子零組件": {
        border: "border-emerald-500/20 hover:border-emerald-500/50",
        text: "text-emerald-400",
        badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        glow: "hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]",
        bg: "bg-emerald-500/10"
    },
    "光學顯示": {
        border: "border-rose-500/20 hover:border-rose-500/50",
        text: "text-rose-400",
        badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        glow: "hover:shadow-[0_0_15px_rgba(244,63,94,0.15)]",
        bg: "bg-rose-500/10"
    },
    "傳產工業": {
        border: "border-yellow-600/20 hover:border-yellow-600/50",
        text: "text-yellow-500",
        badge: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        glow: "hover:shadow-[0_0_15px_rgba(234,179,8,0.15)]",
        bg: "bg-yellow-500/10"
    },
    "綠能環保": {
        border: "border-green-500/20 hover:border-green-500/50",
        text: "text-green-400",
        badge: "bg-green-500/10 text-green-400 border-green-500/20",
        glow: "hover:shadow-[0_0_15px_rgba(34,197,94,0.15)]",
        bg: "bg-green-500/10"
    },
    "醫療器材": {
        border: "border-teal-400/20 hover:border-teal-400/50",
        text: "text-teal-300",
        badge: "bg-teal-400/10 text-teal-300 border-teal-400/20",
        glow: "hover:shadow-[0_0_15px_rgba(45,212,191,0.15)]",
        bg: "bg-teal-400/10"
    },
    "消費終端": {
        border: "border-blue-400/20 hover:border-blue-400/50",
        text: "text-blue-300",
        badge: "bg-blue-400/10 text-blue-300 border-blue-400/20",
        glow: "hover:shadow-[0_0_15px_rgba(96,165,250,0.15)]",
        bg: "bg-blue-400/10"
    },
    "智慧機器人": {
        border: "border-cyan-600/20 hover:border-cyan-600/50",
        text: "text-cyan-500",
        badge: "bg-cyan-600/10 text-cyan-500 border-cyan-600/20",
        glow: "hover:shadow-[0_0_15px_rgba(8,145,178,0.15)]",
        bg: "bg-cyan-600/10"
    },
    "軟體資安": {
        border: "border-violet-500/20 hover:border-violet-500/50",
        text: "text-violet-400",
        badge: "bg-violet-500/10 text-violet-400 border-violet-500/20",
        glow: "hover:shadow-[0_0_15px_rgba(139,92,246,0.15)]",
        bg: "bg-violet-500/10"
    },
    "金融航運": {
        border: "border-amber-400/20 hover:border-amber-400/50",
        text: "text-amber-300",
        badge: "bg-amber-400/10 text-amber-300 border-amber-400/20",
        glow: "hover:shadow-[0_0_15px_rgba(251,191,36,0.15)]",
        bg: "bg-amber-400/10"
    }
};

export const CONCEPTS: Concept[] = [
    // Image 1
    {
        id: "nor_flash",
        category: "記憶體",
        name: "NOR Flash 與利己記憶體",
        description: "聚焦 NOR Flash 與利己型 DRAM。受惠三大原廠轉產 HBM 導致的產能擠壓紅利與結構性缺貨漲價...",
        icon: "memory",
        hasNewActivity: false,
        verifiedDate: "2026-04-23",
        stocks: ["2337", "2344", "3006", "2408", "8299", "2308"]
    },
    {
        id: "ic_channel",
        category: "電子零組件",
        name: "IC 通路",
        description: "負責半導體元件的代理、分銷與技術支援，是連結原廠與終端製造商的關鍵橋樑。通路商在供應...",
        icon: "local_shipping",
        hasNewActivity: true,
        verifiedDate: "2026-05-11",
        stocks: ["3036", "3702", "3010", "2459", "3028", "8091", "8112"]
    },
    {
        id: "epc_engineering",
        category: "傳產工業",
        name: "EPC 工程服務",
        description: "聚焦於高科技廠房的建設與升級，包含無塵室、機電系統、廢水回收、化學品供應及土建工程等...",
        icon: "engineering",
        hasNewActivity: true,
        verifiedDate: "2026-05-09",
        stocks: ["2404", "6196", "2426", "3402", "3596", "6139"]
    },
    {
        id: "ai_server_assembly",
        category: "AI 伺服器",
        name: "整機組裝",
        description: "負責將運算模組、散熱系統、電源與機殼整合為完整的 AI 伺服器機櫃（Rack）。隨 NVIDIA...",
        icon: "dns",
        hasNewActivity: true,
        verifiedDate: "2026-04-23",
        stocks: ["2317", "2382", "3231", "2356", "2324", "2301", "3706", "6669"]
    },
    {
        id: "ai_server_chassis",
        category: "AI 伺服器",
        name: "機殼與滑軌",
        description: "AI 伺服器因功耗激增需搭載更重的液冷系統與高 U 數設計，帶動機殼結構升級及高承重精密滑軌的...",
        icon: "dns",
        hasNewActivity: true,
        verifiedDate: "2026-04-20",
        stocks: ["2059", "3693", "3013", "8210", "2345"]
    },
    {
        id: "cooling_air",
        category: "散熱冷卻",
        name: "氣冷與核心組件",
        description: "3D VC、高轉速風扇與熱導管，Edge AI 與中低功率伺服器的核心氣冷元件供應鏈。",
        icon: "air",
        hasNewActivity: true,
        verifiedDate: "2026-04-24",
        stocks: ["3017", "2421", "3324", "3078", "2483"]
    },
    {
        id: "cooling_liquid",
        category: "散熱冷卻",
        name: "液冷散熱系統",
        description: "Cold Plate、CDU 與浸沒式冷卻，針對 1000W+ Blackwell/Rubin 世代的高密度液冷基礎設施。",
        icon: "air",
        hasNewActivity: true,
        verifiedDate: "2026-04-24",
        stocks: ["3324", "3017", "2421", "2308", "8938"]
    },
    {
        id: "ai_server_bbu",
        category: "AI 伺服器",
        name: "BBU 電池備援系統",
        description: "應用於 AI 伺服器與資料中心的關鍵電力備援模組，於突發斷電時提供即時電力支撐，確保系統穩定...",
        icon: "battery_charging_full",
        hasNewActivity: true,
        verifiedDate: "2026-05-20",
        stocks: ["3037", "3211", "6121", "3321", "2308", "1513"]
    },
    {
        id: "traditional_electric",
        category: "傳產工業",
        name: "電器電纜與重電",
        description: "涵蓋從原材料、設備製造到系統整合的完整電力產業鏈，受惠於全球電網升級、再生能源轉型與數...",
        icon: "bolt",
        hasNewActivity: true,
        verifiedDate: "2026-05-22",
        stocks: ["1513", "1504", "1514", "1519", "1605", "1608", "1609"]
    },

    // Image 2
    {
        id: "quartz_crystals",
        category: "被動元件",
        name: "石英頻率控制元件",
        description: "石英晶體振盪器、TCXO/VCXO/OCXO 振盪器與 SAW/BAW 濾波器，受惠 AI 伺服器時鐘升級、車...",
        icon: "waves",
        hasNewActivity: true,
        verifiedDate: "2026-04-22",
        stocks: ["3042", "2484", "8182", "3221", "4984"]
    },
    {
        id: "connectors_general",
        category: "電子零組件",
        name: "連接器 (工業 / 消費)",
        description: "工業設備客製線束、標準 I/O 連接器與低訊號干擾連接器，應用涵蓋工業自動化、醫療設備、消...",
        icon: "power",
        hasNewActivity: true,
        verifiedDate: "2026-05-13",
        stocks: ["2392", "3023", "3209", "3501", "3665", "6205"]
    },
    {
        id: "ai_interconnect",
        category: "電子零組件",
        name: "AI 互連元件",
        description: "CPU Socket、PCIe 5.0/6.0、DDR5 高速連接器與 AI Server 高速線纜組件，AI 算力基礎設施的關...",
        icon: "bolt",
        hasNewActivity: true,
        verifiedDate: "2026-05-13",
        stocks: ["3665", "3023", "3533", "2392", "5215", "6197"]
    },
    {
        id: "automotive_connectors",
        category: "電子零組件",
        name: "車用連接器",
        description: "電動車高壓/大電流連接器、FAKRA/HSD 訊號線束與 EV 充電接頭，三電系統與智慧座艙的核心互連...",
        icon: "directions_car",
        hasNewActivity: true,
        verifiedDate: "2026-05-14",
        stocks: ["3665", "3023", "2392", "3501", "6205"]
    },
    {
        id: "fpcb_soft",
        category: "電子零組件",
        name: "軟板",
        description: "具備高撓曲性與輕薄特性的印刷電路板，是 AI 智慧型手機、摺疊機、車用電子及穿戴裝置中不可或...",
        icon: "description",
        hasNewActivity: true,
        verifiedDate: "2026-04-21",
        stocks: ["4958", "6269", "2313", "8039", "2368"]
    },
    {
        id: "pcb_hard",
        category: "電子零組件",
        name: "PCB 硬板製造",
        description: "印刷電路板（PCB）是電子系統的物理骨架，台灣為全球最大PCB生產基地之一（市占約34%），...",
        icon: "grid_view",
        hasNewActivity: true,
        verifiedDate: "2026-05-14",
        stocks: ["2368", "3037", "2313", "3044", "2383", "4958", "8046"]
    },
    {
        id: "optical_lens",
        category: "光學顯示",
        name: "光學鏡頭與相機模組",
        description: "涵蓋精密光學鏡頭製造、影像感測器封裝與相機模組整合，是智慧手機、車用 ADAS、AR/VR 與...",
        icon: "camera_roll",
        hasNewActivity: true,
        verifiedDate: "2026-05-15",
        stocks: ["3008", "3406", "3019", "3504", "4976"]
    },
    {
        id: "display_panels",
        category: "光學顯示",
        name: "面板產業",
        description: "面板產業正從傳統 LCD 轉型至 OLED 與 Micro LED，台廠積極跨入車用顯示與扇出型面板級封...",
        icon: "desktop_windows",
        hasNewActivity: true,
        verifiedDate: "2026-05-08",
        stocks: ["2409", "3481", "6176", "3049", "2489"]
    },
    {
        id: "power_supply",
        category: "電子零組件",
        name: "電源供應器",
        description: "電子設備的核心動力來源，負責將交流電 (AC) 轉換為設備所需的直流電 (DC)。隨著 AI 伺服器瓦數...",
        icon: "battery_charging_full",
        hasNewActivity: true,
        verifiedDate: "2026-05-13",
        stocks: ["2308", "2301", "3078", "3231", "2420", "6203"]
    },

    // Image 3
    {
        id: "optical_transceivers",
        category: "網通衛星",
        name: "高速光收發模組",
        description: "聚焦 AI 資料中心與大型雲端服務商 (CSP) 對 800G 與 1.6T 高速插拔式光收發模組的剛性升級...",
        icon: "wifi",
        hasNewActivity: true,
        verifiedDate: "2026-05-21",
        stocks: ["3081", "4979", "3450", "4908", "3163", "4977"]
    },
    {
        id: "silicon_photonics_cpo",
        category: "網通衛星",
        name: "矽光子與 CPO",
        description: "半導體異質整合的尖端技術，將光通訊元件與邏輯晶片共同封裝 (Co-Packaged Optics)，以解決...",
        icon: "wifi",
        hasNewActivity: true,
        verifiedDate: "2026-05-20",
        stocks: ["2330", "3450", "4979", "3081", "6451", "3363"]
    },
    {
        id: "leo_satellites",
        category: "網通衛星",
        name: "低軌衛星通訊系統",
        description: "低軌衛星 (LEO) 以低延遲、高頻寬與全球覆蓋為核心特性，透過大量衛星組網提供通訊、數據傳...",
        icon: "satellite_alt",
        hasNewActivity: true,
        verifiedDate: "2026-05-21",
        stocks: ["2314", "6285", "3491", "2313", "3380", "2345"]
    },
    {
        id: "switches_wifi",
        category: "網通衛星",
        name: "高速交換器與無線網路",
        description: "聚焦於 AI 資料中心 800G/1.6T 高速交換器、WiFi 7 無線通訊設備、5G/6G 寬頻接取設備及低軌衛...",
        icon: "hub",
        hasNewActivity: true,
        verifiedDate: "2026-04-24",
        stocks: ["2345", "6285", "5388", "3380", "3596"]
    },
    {
        id: "cxl_memory",
        category: "記憶體",
        name: "CXL 記憶體池化",
        description: "旨在解決 AI 運算中「記憶體牆 (Memory Wall)」瓶頸的次世代開放互連協定。基於 PCIe 6.0 介面...",
        icon: "memory",
        hasNewActivity: true,
        verifiedDate: "2026-04-24",
        stocks: ["2337", "2344", "3006", "8299", "6239"]
    },
    {
        id: "glass_substrate",
        category: "基板材料",
        name: "玻璃基板",
        description: "繼 CoWoS 之後先進封裝關鍵戰場，旨在解決 AI 晶片高功耗下的散熱與傳輸瓶頸，預計 2026 年進...",
        icon: "layers",
        hasNewActivity: true,
        verifiedDate: "2026-05-21",
        stocks: ["2409", "3481", "3037", "3189", "8046"]
    },
    {
        id: "capacitors",
        category: "被動元件",
        name: "電容器",
        description: "電容器是電子系統中儲能、濾波與去耦的關鍵被動元件，MLCC (積層陶瓷電容) 因 AI 伺服器與電...",
        icon: "layers",
        hasNewActivity: true,
        verifiedDate: "2026-05-09",
        stocks: ["2327", "2492", "3026", "2375", "6127"]
    },
    {
        id: "inductors",
        category: "被動元件",
        name: "功率電感",
        description: "電感器是電源管理與 EMI 抑制的核心被動元件，廣泛應用於 AI 伺服器電源、電動車動力系統與工控...",
        icon: "layers",
        hasNewActivity: true,
        verifiedDate: "2026-05-10",
        stocks: ["2456", "3068", "2327", "3257", "6284"]
    },
    {
        id: "resistors",
        category: "被動元件",
        name: "電阻與被動保護元件",
        description: "晶片電阻、精密薄膜電阻與過電流保護元件，受惠電動車與 AI 伺服器對高精度電阻的結構性升級需...",
        icon: "layers",
        hasNewActivity: true,
        verifiedDate: "2026-05-06",
        stocks: ["2327", "2456", "2428", "6155", "3026"]
    },

    // Image 4
    {
        id: "ic_carrier",
        category: "基板材料",
        name: "IC 載板",
        description: "IC 載板是晶片與 PCB 主板之間的關鍵訊號橋接層，決定 AI 晶片的訊號完整性與散熱表現。涵蓋...",
        icon: "layers",
        hasNewActivity: true,
        verifiedDate: "2026-04-20",
        stocks: ["3037", "3189", "8046"]
    },
    {
        id: "leadframe_chemicals",
        category: "基板材料",
        name: "導線架與化學品",
        description: "提供成熟晶片封裝所需的導電結構與化學材料，包含導線架 (Leadframe) 與封裝化學品 (底膠、...",
        icon: "layers",
        hasNewActivity: true,
        verifiedDate: "2026-04-20",
        stocks: ["2351", "5285", "6548", "1717", "1727"]
    },
    {
        id: "pkg_equipment",
        category: "先進封測",
        name: "先進封裝製程機台",
        description: "提供先進封裝製程所需機台，涵蓋濕製程 (清洗、蝕刻)、乾製程 (雷射、PVD)、鍵合點膠...",
        icon: "inventory_2",
        hasNewActivity: true,
        verifiedDate: "2026-04-24",
        stocks: ["6187", "3583", "3131", "2404", "6667"]
    },
    {
        id: "pkg_measurement",
        category: "先進封測",
        name: "先進封裝量測自動化",
        description: "提供先進封裝製程所需的光學量測、AOI 缺陷檢測與廠內自動化搬運系統 (AMHS)，是提升良率...",
        icon: "bolt",
        hasNewActivity: true,
        verifiedDate: "2026-04-24",
        stocks: ["3450", "2360", "3030", "5443", "6223"]
    },
    {
        id: "cowos_supply",
        category: "先進封測",
        name: "AI 先進封裝 (CoWoS)",
        description: "以台積電 CoWoS 為核心的 AI 先進封裝供應鏈，涵蓋圓級先進封裝代工、OSAT 夥伴、高階 ABF ...",
        icon: "inventory_2",
        hasNewActivity: true,
        verifiedDate: "2026-04-25",
        stocks: ["2330", "3711", "3037", "3189", "8046", "3583", "3131"]
    },
    {
        id: "osat_services",
        category: "先進封測",
        name: "封測代工服務 (OSAT)",
        description: "涵蓋主流 OSAT 代工、特殊封裝製程 (凸塊、WLP、COF) 及記憶體封裝服務。追蹤整體半導...",
        icon: "inventory_2",
        hasNewActivity: true,
        verifiedDate: "2026-04-25",
        stocks: ["3711", "2449", "3264", "8150", "6239", "3037"]
    },
    {
        id: "ic_testing",
        category: "先進封測",
        name: "IC 測試服務",
        description: "涵蓋 AI/HPC 晶片全製程測試服務與消耗性測試介面耗材。從晶圓級測試 (CP)、成品測試 (FT) 到...",
        icon: "inventory_2",
        hasNewActivity: true,
        verifiedDate: "2026-04-25",
        stocks: ["2449", "3264", "6223", "2065", "6272"]
    },
    {
        id: "hbm_memory",
        category: "記憶體",
        name: "HBM 高頻寬記憶體",
        description: "HBM 是 AI 伺服器的核心元件，透過 3D 堆疊技術大幅提升記憶體頻寬。隨著 HBM4 世代在 2026 ...",
        icon: "memory",
        hasNewActivity: true,
        verifiedDate: "2026-04-23",
        stocks: ["2330", "3711", "3037", "2408", "6239"]
    },
    {
        id: "memory_modules",
        category: "記憶體",
        name: "記憶體模組",
        description: "採購 DRAM 與 NAND Flash 晶片，進行封裝組裝、測試，並以自有品牌銷售記憶體條、SSD (固...",
        icon: "memory",
        hasNewActivity: true,
        verifiedDate: "2026-04-23",
        stocks: ["3260", "3264", "8299", "3006", "2337"]
    },

    // Image 5
    {
        id: "asic_ip",
        category: "IC 設計",
        name: "客製 ASIC 與矽智財",
        description: "隨著全球雲端服務供應商 (CSP) 積極推動「去輝達化」與晶片自研，矽智財 (IP Core) 授權與客製 ASIC 設計服務成為 AI 算力落地的核心基礎設施。此題材聚焦於高價值 IP 授權（記憶體、介面、CPU 核心）與 3nm/2nm 先進製程 ASIC 設計統包服務，是半導體價值鏈最上游、技術壁壘最高的環節。",
        icon: "memory",
        hasNewActivity: false,
        verifiedDate: "2026-04-29",
        stocks: ["8227", "6695", "6533", "6462", "6643", "3529", "3443", "3035", "6423", "3661"],
        cagr: "30%+",
        marketSize: "18.5",
        keyIndicators: [
            { label: "技術節點", value: "3nm 量產 / 2nm 送樣", icon: "trending_up", color: "text-blue-400" },
            { label: "IP 營收模式", value: "License Fee + Royalty", icon: "auto_graph", color: "text-emerald-400" },
            { label: "核心客戶", value: "北美 CSP 與 AI 系統廠", icon: "groups", color: "text-amber-400" },
            { label: "產業地位", value: "半導體價值鏈最頂端", icon: "workspace_premium", color: "text-purple-400" }
        ],
        valueChain: {
            upstream: {
                title: "UPSTREAM — 矽智財授權",
                items: ["記憶體與安全 IP", "介面與 CPU IP"]
            },
            midstream: {
                title: "MIDSTREAM — 客製 ASIC 設計服務",
                items: ["客製 ASIC 設計服務", "AI ASIC 設計與封裝整合"]
            },
            downstream: {
                title: "DOWNSTREAM — ASIC 採購方",
                items: ["AI 資料中心與 CSP 採購方"]
            }
        },
        stockSnapshots: {
            "8227": { name: "巨有科技", change: 9.93, marketCap: "89.8億" },
            "6695": { name: "芯鼎", change: 9.90, marketCap: "54.6億" },
            "6533": { name: "晶心科", change: 4.35, marketCap: "122億" },
            "6462": { name: "神盾", change: 2.85, marketCap: "132億" },
            "6643": { name: "M31", change: 2.21, marketCap: "251億" },
            "3529": { name: "力旺", change: 1.97, marketCap: "2707億" },
            "3443": { name: "創意", change: 1.48, marketCap: "6888億" },
            "3035": { name: "智原", change: 1.44, marketCap: "550億" },
            "6423": { name: "億而得-創", change: 1.11, marketCap: "31.0億" },
            "3661": { name: "世芯-KY", change: -0.20, marketCap: "4018億" }
        }
    },
    {
        id: "hpc_network_ic",
        category: "IC 設計",
        name: "HPC 與網通 IC",
        description: "聚焦於 AI 資料中心、高效能運算 (HPC) 與 5G/WiFi 網通核心晶片的產品型 Fabless IC 設計公司。涵蓋旗艦 SoC、乙太網路/WiFi/5G 網通晶片、高速傳輸介面 IC（USB4/Thunderbolt/DP）與儲存控制器，是驅動數位基礎設施與消費終端算力升級的核心標的。",
        icon: "memory",
        hasNewActivity: false,
        verifiedDate: "2026-04-29",
        stocks: ["2454", "5274", "5269", "8299", "6756", "6684", "4968", "6526", "7796", "8054", "6104", "4966", "2379", "6568"],
        cagr: "20%+",
        marketSize: "150.5",
        keyIndicators: [
            { label: "技術核心", value: "先進製程 SoC / 高速 SerDes", icon: "trending_up", color: "text-blue-400" },
            { label: "主流規格", value: "WiFi 7 / PCIe Gen 6 / USB4", icon: "auto_graph", color: "text-emerald-400" },
            { label: "商機節點", value: "2025-2026 規格爆發", icon: "event_note", color: "text-amber-400" },
            { label: "產業門檻", value: "高度研發密集 / 專利壁壘", icon: "workspace_premium", color: "text-purple-400" }
        ],
        valueChain: {
            upstream: {
                title: "UPSTREAM — 高效能運算 SoC",
                items: ["高效能運算 SoC"]
            },
            midstream: {
                title: "MIDSTREAM — 網通與高速傳輸 IC",
                items: ["網通、WiFi 與 5G IC", "高速傳輸介面 IC", "儲存控制器 IC"]
            },
            downstream: {
                title: "DOWNSTREAM — 伺服器基礎設施 IC",
                items: ["伺服器管理與基礎設施 IC"]
            }
        },
        stockSnapshots: {
            "2454": { name: "聯發科", change: 8.73, marketCap: "6.2兆" },
            "5274": { name: "信驊", change: 8.15, marketCap: "6721億" },
            "5269": { name: "祥碩", change: 4.96, marketCap: "1107億" },
            "8299": { name: "群聯", change: 4.07, marketCap: "5293億" },
            "6756": { name: "威鋒電子", change: 3.45, marketCap: "73.4億" },
            "6684": { name: "安格", change: 3.13, marketCap: "21.3億" },
            "4968": { name: "立積", change: 3.02, marketCap: "110億" },
            "6526": { name: "達發", change: 2.98, marketCap: "1214億" },
            "7796": { name: "擷發科", change: 1.98, marketCap: "23.4億" },
            "8054": { name: "安國", change: 1.83, marketCap: "118億" },
            "6104": { name: "創惟", change: 1.48, marketCap: "93.9億" },
            "4966": { name: "譜瑞-KY", change: 0.76, marketCap: "628億" },
            "2379": { name: "瑞昱", change: 0.52, marketCap: "2980億" },
            "6568": { name: "宏觀", change: 0.00, marketCap: "66.9億" }
        }
    },
    {
        id: "analog_pmic",
        category: "IC 設計",
        name: "類比與功率管理 IC",
        description: "聚焦於電子系統中負責電力管理、訊號感測與嵌入式控制的核心類比與功率晶片設計公司。涵蓋微控制器 (MCU)、感測訊號鏈 IC 與電源管理 IC (PMIC)，應用橫跨 AI 伺服器電源、工業自動化與消費電子，是電子系統的基礎能源管理層。",
        icon: "memory",
        hasNewActivity: false,
        verifiedDate: "2026-04-29",
        stocks: ["4919", "6138", "6799", "2436", "6202", "3014", "8081", "5299", "3227", "7707", "6415", "6679", "3288", "6719", "5347", "5425"],
        cagr: "7.5%",
        marketSize: "105.8",
        keyIndicators: [
            { label: "市場地位", value: "電子系統基礎支柱", icon: "workspace_premium", color: "text-purple-400" },
            { label: "技術核心", value: "類比設計 / BCD 製程", icon: "auto_graph", color: "text-amber-400" },
            { label: "成長動能", value: "AI 伺服器 + 消費電子復甦", icon: "trending_up", color: "text-emerald-400" },
            { label: "景氣屬性", value: "循環敏感 / 長期穩健", icon: "show_chart", color: "text-blue-400" }
        ],
        valueChain: {
            upstream: {
                title: "UPSTREAM — MCU 與訊號感測 IC",
                items: ["微控制器 (MCU) 與嵌入式控制", "訊號鏈與感測 IC"]
            },
            midstream: {
                title: "MIDSTREAM — 電源管理 IC",
                items: ["高階電源管理 IC (PMIC)", "通用與消費性 PMIC"]
            },
            downstream: {
                title: "DOWNSTREAM — 特殊製程代工",
                items: ["特殊製程晶圓代工"]
            }
        },
        stockSnapshots: {
            "4919": { name: "新唐", change: 9.92, marketCap: "837億" },
            "6138": { name: "茂達", change: 5.46, marketCap: "241億" },
            "6799": { name: "來頡", change: 4.15, marketCap: "43.9億" },
            "2436": { name: "偉詮電", change: 3.74, marketCap: "155億" },
            "6202": { name: "盛群", change: 3.23, marketCap: "140億" },
            "3014": { name: "聯陽", change: 2.07, marketCap: "246億" },
            "8081": { name: "致新", change: 2.01, marketCap: "241億" },
            "5299": { name: "杰力", change: 1.90, marketCap: "54.5億" },
            "3227": { name: "原相", change: 1.75, marketCap: "351億" },
            "7707": { name: "益芯科", change: 1.54, marketCap: "74.7億" },
            "6415": { name: "矽力*-KY", change: 0.90, marketCap: "2186億" },
            "6679": { name: "鈺太", change: 0.15, marketCap: "184億" },
            "3288": { name: "點晶", change: 0.00, marketCap: "2.4億" },
            "6719": { name: "力智", change: -0.64, marketCap: "245億" },
            "5347": { name: "世界", change: -0.92, marketCap: "3025億" },
            "5425": { name: "台半", change: -3.65, marketCap: "229億" }
        }
    },
    {
        id: "ddic_drivers",
        category: "IC 設計",
        name: "顯示驅動 IC",
        description: "顯示驅動 IC (DDIC) 負責控制顯示面板上的像素電壓，是螢幕顯示影像的核心組件。隨著 OLED 滲透率提升、折疊機放量及車用電子需求增加，DDIC 產業正從價格戰轉向高技術價值的 OLED 與車用 TDDI 發展。",
        icon: "memory",
        hasNewActivity: true,
        verifiedDate: "2026-05-11",
        stocks: ["3141", "6770", "HIMX", "3527", "8150", "2458", "3545", "3034", "3592", "5347", "2303", "8016", "4961", "6147"],
        cagr: "5-8% (2025-2030)",
        marketSize: "約 120 億美元 (2025-2026E)",
        keyIndicators: [
            { label: "市場規模", value: "約 120 億美元 (2025-2026E)", icon: "analytics", color: "text-blue-400" },
            { label: "CAGR", value: "5-8% (2025-2030)", icon: "auto_graph", color: "text-emerald-400" },
            { label: "技術主流", value: "OLED TDDI / 車用大屏", icon: "trending_up", color: "text-purple-400" },
            { label: "成長動能", value: "OLED 化 + 車用多屏化", icon: "speed", color: "text-amber-400" }
        ],
        valueChain: {
            upstream: {
                title: "製造與封裝支援",
                items: ["晶圓代工合作", "金凸塊與後段封測"]
            },
            midstream: {
                title: "驅動 IC 設計",
                items: ["高階 OLED 驅動", "車用與觸控整合", "利基與工控驅動"]
            },
            downstream: {
                title: "面板模組與終端應用",
                items: ["面板廠", "終端應用設備"]
            }
        },
        stockSnapshots: {
            "3141": { name: "晶宏", change: 8.56, marketCap: "58.4億" },
            "6770": { name: "力積電", change: 7.95, marketCap: "2708億" },
            "HIMX": { name: "Himax Technologies", change: 5.73, marketCap: "34.7億" },
            "3527": { name: "聚積", change: 5.51, marketCap: "27.2億" },
            "8150": { name: "南茂", change: 4.22, marketCap: "557億" },
            "2458": { name: "義隆", change: 2.21, marketCap: "492億" },
            "3545": { name: "敦泰", change: 0.65, marketCap: "136億" },
            "3034": { name: "聯詠", change: 0.21, marketCap: "2954億" },
            "3592": { name: "瑞鼎", change: -0.19, marketCap: "201億" },
            "5347": { name: "世界", change: -0.92, marketCap: "3025億" },
            "2303": { name: "聯電", change: -1.72, marketCap: "1.4兆" },
            "8016": { name: "矽創", change: -1.85, marketCap: "351億" },
            "4961": { name: "天鈺", change: -1.96, marketCap: "213億" },
            "6147": { name: "頎邦", change: -3.15, marketCap: "1605億" }
        }
    },
    {
        id: "silicon_wafers",
        category: "半導體製造",
        name: "矽晶圓",
        description: "位於半導體製造最上游，生產晶圓代工與記憶體 IDM 使用之矽晶圓基板，涵蓋拋光矽晶圓、磊...",
        icon: "domain",
        hasNewActivity: false,
        verifiedDate: "2026-05-11",
        stocks: ["6488", "3532", "5483", "3707"]
    },
    {
        id: "foundries",
        category: "半導體製造",
        name: "晶圓代工",
        description: "依據 IC 設計藍圖進行晶圓製造，涵蓋先進邏輯製程與特殊/功率製程，是將設計價值轉化為實體晶片...",
        icon: "domain",
        hasNewActivity: true,
        verifiedDate: "2026-05-11",
        stocks: ["2330", "2303", "5347", "6770", "2338"]
    },
    {
        id: "foundry_equipment",
        category: "半導體製造",
        name: "晶圓廠設備",
        description: "提供晶圓製造前段製程所需的設備、量測儀器與設備關鍵零組件，涵蓋黃光、蝕刻、薄膜等製程設...",
        icon: "domain",
        hasNewActivity: true,
        verifiedDate: "2026-05-11",
        stocks: ["2404", "6196", "3402", "3583", "3131", "6187"]
    },
    {
        id: "foundry_materials",
        category: "半導體製造",
        name: "前段製程材料",
        description: "提供晶圓製造前段製程所需的高純度化學品與功能性材料，涵蓋微影光阻與感光材料、特殊電子氣...",
        icon: "domain",
        hasNewActivity: false,
        verifiedDate: "2026-05-11",
        stocks: ["1717", "4770", "1727", "4755", "1773"]
    },
    {
        id: "fiberglass_fabrics",
        category: "基板材料",
        name: "玻纖布",
        description: "從玻璃原料到終端 AI 伺服器應用的完整產業鏈解析。",
        icon: "layers",
        hasNewActivity: false,
        verifiedDate: "2026-05-11",
        stocks: ["1802", "2383", "3037", "8046", "3189"]
    },

    // Image 6
    {
        id: "water_environmental",
        category: "綠能環保",
        name: "水資源工程與環保",
        description: "受政府前瞻計畫投入逾 1,600 億元驅動，涵蓋海水淡化統包、再生水廠興建、半導體超純水系統、...",
        icon: "air",
        hasNewActivity: true,
        verifiedDate: "2026-05-09",
        stocks: ["8473", "8936", "9933", "6803", "8422"]
    },
    {
        id: "ivd_diagnostics",
        category: "醫療器材",
        name: "體外診斷 (IVD)",
        description: "台灣 IVD 廠商以血糖監測系統 (BGMS) ODM 出口全球為核心競爭力，從整機設計到電化學試片...",
        icon: "biotech",
        hasNewActivity: true,
        verifiedDate: "2026-05-17",
        stocks: ["1760", "4107", "4164", "6415"]
    },
    {
        id: "medical_consumables",
        category: "醫療器材",
        name: "醫療耗材與植入物",
        description: "手術引流耗材、透析耗材與骨科植入物，台灣廠商在一次性耗材 ODM 出口、血液透析供應鏈與骨...",
        icon: "thermostat",
        hasNewActivity: true,
        verifiedDate: "2026-05-17",
        stocks: ["4107", "1760", "4164", "6415"]
    },
    {
        id: "medical_electronics",
        category: "醫療器材",
        name: "醫療電子與數位健康",
        description: "醫療電腦、手術顯示系統、眼科暨內視鏡光學診斷設備與 AI 醫療影像辨識，台灣廠商在醫療級嵌入...",
        icon: "desktop_windows",
        hasNewActivity: true,
        verifiedDate: "2026-05-17",
        stocks: ["2395", "6415", "1760", "4107"]
    },
    {
        id: "microled_supply",
        category: "消費終端",
        name: "MicroLED 顯示供應鏈",
        description: "涵蓋 MicroLED 從 GaN 磊晶晶片、巨量轉移設備到顯示模組整合的完整供應鏈，並延伸至 AI 資料中...",
        icon: "layers",
        hasNewActivity: true,
        verifiedDate: "2026-05-18",
        stocks: ["2409", "3481", "6176", "2330", "3711"]
    },
    {
        id: "agentic_ai_cpu",
        category: "半導體製造",
        name: "Agentic AI CPU 需求爆發",
        description: "Agentic AI 工作負載需要大量 CPU 處理工具呼叫、任務排程與多代理協調，推動伺服器...",
        icon: "memory",
        hasNewActivity: false,
        verifiedDate: "2026-05-19",
        stocks: ["2330", "2317", "2382", "3231", "6669"]
    },

    // Image 7
    {
        id: "edge_ai_aiot",
        category: "智慧機器人",
        name: "Edge AI / AIoT 邊緣智慧",
        description: "AI 推論從雲端下沉至終端裝置，涵蓋邊緣 AI 晶片、工業電腦、IoT 閘道器及智慧相機等硬體鏈，...",
        icon: "memory",
        hasNewActivity: true,
        verifiedDate: "2026-05-20",
        stocks: ["2395", "3704", "6414", "2357", "2317", "2308"]
    },
    {
        id: "ar_vr_xr_optics",
        category: "消費終端",
        name: "AR/VR/XR 光學供應鏈",
        description: "涵蓋 AR/VR/XR 裝置所需的 Pancake 折疊鏡頭、光波導元件 (DOE/LOE)、MetaLens 超穎透鏡...",
        icon: "visibility",
        hasNewActivity: true,
        verifiedDate: "2026-05-17",
        stocks: ["3008", "3406", "3481", "2409", "6176"]
    },
    {
        id: "security_protection",
        category: "軟體資安",
        name: "資安防護",
        description: "AI 驅動的網路攻擊激增、政府零信任政策強制推行與企業資安事件數創新高，三重催化劑共同推動...",
        icon: "shield",
        hasNewActivity: true,
        verifiedDate: "2026-05-15",
        stocks: ["2471", "4953", "6214", "6183"]
    },
    {
        id: "banking_finance",
        category: "金融航運",
        name: "銀行金融",
        description: "涵蓋金控、銀行、壽險、證券及租賃等多元領域，是支撐實體經濟與個人財富管理的國家核心基石...",
        icon: "payments",
        hasNewActivity: true,
        verifiedDate: "2026-04-01",
        stocks: ["2881", "2882", "2891", "2886", "2883", "2884", "2885"]
    },
    {
        id: "petrochemical_plastics",
        category: "傳產工業",
        name: "石化及塑膠",
        description: "以輕油裂解為起點，串聯通用塑膠、合成橡膠、特化品至下游纖維與製品 the complete petrochemical chain...",
        icon: "domain",
        hasNewActivity: true,
        verifiedDate: "2026-04-02",
        stocks: ["1301", "1303", "1326", "1304", "1308"]
    },
    {
        id: "bulk_shipping",
        category: "金融航運",
        name: "散裝航運",
        description: "負責運輸鐵礦砂、煤炭、穀物等散裝大宗物資，受惠於全球造船產能受限與環保法規導致的結構性...",
        icon: "directions_boat",
        hasNewActivity: true,
        verifiedDate: "2026-05-06",
        stocks: ["2606", "2612", "2637", "2605", "2641"]
    },
    {
        id: "container_shipping",
        category: "金融航運",
        name: "貨櫃航運",
        description: "全球物資運輸的大動脈，負責電子產品、零組件及零售物資，受惠於聯盟重組與地緣政治帶動的運...",
        icon: "directions_boat",
        hasNewActivity: true,
        verifiedDate: "2026-05-06",
        stocks: ["2603", "2609", "2615"]
    },
    {
        id: "defense_industry",
        category: "傳產工業",
        name: "軍工產業",
        description: "以國防自主與強化不對稱戰力為核心，涵蓋作戰平台、支援系統與戰術通訊。是實現國家安全與供...",
        icon: "shield",
        hasNewActivity: true,
        verifiedDate: "2026-05-16",
        stocks: ["2634", "8222", "5284", "4541", "2645"]
    },
    {
        id: "electronic_waste_recycle",
        category: "綠能環保",
        name: "電子廢料與製程回收",
        description: "涵蓋電子產業製程廢液回收、半導體電解金屬提取、事業廢棄物處理及貴金屬循環精煉，是淨零...",
        icon: "bolt",
        hasNewActivity: true,
        verifiedDate: "2026-05-16",
        stocks: ["8341", "8435", "9955", "1723"]
    },

    // Image 8
    {
        id: "physical_ai_robots",
        category: "智慧機器人",
        name: "實體 AI 機器人",
        description: "2025 年被視為「機器人元年」，隨著 NVIDIA 推動「實體 AI (Physical AI)」概念與特斯拉...",
        icon: "smartphone",
        hasNewActivity: true,
        verifiedDate: "2026-05-21",
        stocks: ["2357", "2317", "2308", "1590", "2395", "2049"]
    },
    {
        id: "pc_laptop_tablet",
        category: "消費終端",
        name: "PC、筆電與平板",
        description: "涵蓋全球筆記型電腦、桌上型電腦及平板電腦的設計、代工與品牌銷售。台灣廠商在全球 PC 代工...",
        icon: "smartphone",
        hasNewActivity: true,
        verifiedDate: "2026-04-22",
        stocks: ["2353", "2357", "2377", "2324", "2382", "3231", "2356"]
    },
    {
        id: "cloud_services",
        category: "軟體資安",
        name: "雲端服務與代管",
        description: "涵蓋公有雲平台 (AWS/Azure/GCP) 代理、雲端搬遷、MSP 託管服務與雲端算力代管。隨企業數位...",
        icon: "cloud",
        hasNewActivity: true,
        verifiedDate: "2026-05-07",
        stocks: ["2471", "6214", "4953", "6183"]
    },
    {
        id: "enterprise_saas",
        category: "軟體資安",
        name: "企業軟體 SaaS",
        description: "聚焦於具備自主研發能力、提供訂閱制 (SaaS) 或軟體授權的企業級應用。涵蓋零售 MarTech、企...",
        icon: "wysiwyg",
        hasNewActivity: true,
        verifiedDate: "2026-05-07",
        stocks: ["2471", "6183", "4953", "6214"]
    },
    {
        id: "system_integration",
        category: "軟體資安",
        name: "系統整合與委外",
        description: "提供企業 IT 架構規劃、軟硬體整合專案與技術人力委外服務 (ITO)。受惠於半導體大廠擴產帶動...",
        icon: "memory",
        hasNewActivity: true,
        verifiedDate: "2026-05-03",
        stocks: ["2471", "6214", "6183", "4953"]
    },
    {
        id: "e_commerce_retail",
        category: "消費終端",
        name: "電商零售平台",
        description: "聚焦台灣電商零售平台、垂直社群電商與 OMO 虛實整合零售，涵蓋從數位支付基礎設施到電商平...",
        icon: "shopping_cart",
        hasNewActivity: false,
        verifiedDate: "2026-05-12",
        stocks: ["8454", "8044", "3085", "5202"]
    },
    {
        id: "smartphone_supply",
        category: "消費終端",
        name: "智慧型手機供應鏈",
        description: "聚焦 Apple iPhone 供應鏈、Android 旗艦代工與摺疊機技術，涵蓋精密光學、手機板材、金屬...",
        icon: "smartphone",
        hasNewActivity: false,
        verifiedDate: "2026-05-03",
        stocks: ["2317", "3008", "2474", "4958", "6269", "2313"]
    },
    {
        id: "industrial_automation",
        category: "智慧機器人",
        name: "工業自動化 / 智慧製造",
        description: "涵蓋 PLC/伺服控制、IPC 工業電腦、AMR/AGV 移動機器人與智慧工廠整合，為「實體 AI 機器人」...",
        icon: "domain",
        hasNewActivity: true,
        verifiedDate: "2026-05-04",
        stocks: ["2395", "1590", "2308", "2049", "2357"]
    },
    {
        id: "cnc_machine_tools",
        category: "傳產工業",
        name: "CNC 工具機",
        description: "涵蓋 CNC 車床、加工中心、龍門機與五軸複合機，台灣廠商在中高階機型具全球競爭力，受惠於 EV...",
        icon: "linear_scale",
        hasNewActivity: false,
        verifiedDate: "2026-05-04",
        stocks: ["2049", "1590", "8374", "1583"]
    },

    // Image 9
    {
        id: "precision_mechanisms",
        category: "電子零組件",
        name: "精密機構件",
        description: "涵蓋智慧型手機、筆記型電腦、AI 伺服器及電動車等終端裝置的高精度金屬機殼與機構組件，涉及...",
        icon: "inventory_2",
        hasNewActivity: false,
        verifiedDate: "2026-04-22",
        stocks: ["2474", "2382", "3231", "2317", "2059"]
    },
    {
        id: "optical_sensing",
        category: "光學顯示",
        name: "光感測與元件",
        description: "涵蓋影像感測 (CIS)、環境光與接近感測 (ALS/PS)、飛行時間 (ToF) 以及紅外線感測等技...",
        icon: "camera_roll",
        hasNewActivity: false,
        verifiedDate: "2026-05-21",
        stocks: ["3008", "3406", "2330", "3711", "6176"]
    },
    {
        id: "smt_ems_assembly",
        category: "AI 伺服器",
        name: "SMT/EMS 電子代工",
        description: "台灣 SMT/EMS 廠商專精於精密 PCB 打件、記憶體模組組裝至 AI 伺服器系統整合，受惠於地緣政治...",
        icon: "domain",
        hasNewActivity: false,
        verifiedDate: "2026-04-22",
        stocks: ["2317", "2382", "3231", "2356", "2324", "2301"]
    },
    {
        id: "third_gen_semiconductors",
        category: "半導體製造",
        name: "第三代半導體",
        description: "2026 年化合物半導體全面跨向 8/12 吋量產。SiC 聚焦電動車 800V 與 AI 高壓直流架構，GaN 則...",
        icon: "bolt",
        hasNewActivity: true,
        verifiedDate: "2026-05-08",
        stocks: ["3707", "2330", "3016", "2344", "3532"]
    },
    {
        id: "solar_power",
        category: "綠能環保",
        name: "太陽能產業",
        description: "太陽能產業正經歷從內需轉向出口的重大轉折。受惠於美國對東南亞產品課徵高額關稅帶來的轉單...",
        icon: "wb_sunny",
        hasNewActivity: true,
        verifiedDate: "2026-05-15",
        stocks: ["6443", "6477", "3576", "2406", "3686"]
    },
    {
        id: "battery_materials",
        category: "綠能環保",
        name: "電池關鍵材料",
        description: "涵蓋電池最核心的正極、負極、電解液與隔離膜材料。正極決定能量密度與成本，負極影響充放電...",
        icon: "layers",
        hasNewActivity: true,
        verifiedDate: "2026-04-20",
        stocks: ["4721", "4739", "8038", "1723"]
    },
    {
        id: "battery_cells_modules",
        category: "綠能環保",
        name: "電芯製造與電池模組",
        description: "聚焦於電芯製造與電池模組封裝。台廠在中游模組具備全球頂尖競爭力，從消費性、電動車到儲能...",
        icon: "battery_full",
        hasNewActivity: true,
        verifiedDate: "2026-04-21",
        stocks: ["6121", "3211", "6283", "3037"]
    },
    {
        id: "energy_storage_ess",
        category: "綠能環保",
        name: "儲能系統整合",
        description: "專注於電網級與工商業儲能系統 (ESS) 整合與建置。隨著再生能源滲透率提升與 AI 資料中心對電...",
        icon: "hexagon",
        hasNewActivity: true,
        verifiedDate: "2026-04-21",
        stocks: ["1513", "1504", "1514", "1519", "2308", "6283"]
    },
    {
        id: "offshore_wind",
        category: "綠能環保",
        name: "離岸風電",
        description: "台灣能源轉型核心政策。2026 年進入區塊開發 3-3 期新階段，全面取消「強制國產化」要求，改...",
        icon: "air",
        hasNewActivity: true,
        verifiedDate: "2026-04-21",
        stocks: ["3708", "9958", "1513", "1519", "1605"]
    }
];
