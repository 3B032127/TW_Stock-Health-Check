/**
 * Economic Monitor Light Data Parser
 * Parses government CSV data for economic monitor light signals
 */

export interface MonitorLightData {
    date: string;
    score: number;
    signal: string;
}

export const LIGHT_SIGNALS = {
    BLUE: { name: '藍燈', range: '9-16分', color: '#3b82f6', description: '景氣低迷' },
    YELLOW_BLUE: { name: '黃藍燈', range: '17-22分', color: '#06b6d4', description: '景氣轉向低迷' },
    GREEN: { name: '綠燈', range: '23-31分', color: '#10b981', description: '景氣穩定' },
    YELLOW_RED: { name: '黃紅燈', range: '32-37分', color: '#f97316', description: '景氣轉向熱絡' },
    RED: { name: '紅燈', range: '38-45分', color: '#ef4444', description: '景氣過熱' },
};

/**
 * Parse CSV line to extract monitor light data
 */
function parseCSVLine(line: string): MonitorLightData | null {
    const parts = line.split(',');
    if (parts.length < 9) return null;

    const dateStr = parts[0].replace(/"/g, '');
    const scoreStr = parts[7].replace(/"/g, '');
    const signalStr = parts[8].replace(/"/g, '').trim();

    // Skip header or invalid data
    if (dateStr === 'Date' || scoreStr === '-' || !scoreStr) return null;

    const score = parseFloat(scoreStr);
    if (isNaN(score)) return null;

    // Format date from YYYYMM to YYYY-MM
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const date = `${year}-${month}-01`;

    return {
        date,
        score,
        signal: signalStr || getSignalFromScore(score),
    };
}

/**
 * Get signal name from score
 */
function getSignalFromScore(score: number): string {
    if (score >= 38) return '紅';
    if (score >= 32) return '黃紅';
    if (score >= 23) return '綠';
    if (score >= 17) return '黃藍';
    return '藍';
}

/**
 * Get signal color from signal name
 */
export function getSignalColor(signal: string): string {
    switch (signal) {
        case '紅': return LIGHT_SIGNALS.RED.color;
        case '黃紅': return LIGHT_SIGNALS.YELLOW_RED.color;
        case '綠': return LIGHT_SIGNALS.GREEN.color;
        case '黃藍': return LIGHT_SIGNALS.YELLOW_BLUE.color;
        case '藍': return LIGHT_SIGNALS.BLUE.color;
        default: return LIGHT_SIGNALS.GREEN.color;
    }
}

/**
 * Get signal description from signal name
 */
export function getSignalDescription(signal: string): string {
    switch (signal) {
        case '紅': return LIGHT_SIGNALS.RED.description;
        case '黃紅': return LIGHT_SIGNALS.YELLOW_RED.description;
        case '綠': return LIGHT_SIGNALS.GREEN.description;
        case '黃藍': return LIGHT_SIGNALS.YELLOW_BLUE.description;
        case '藍': return LIGHT_SIGNALS.BLUE.description;
        default: return LIGHT_SIGNALS.GREEN.description;
    }
}

/**
 * Load and parse monitor light data from CSV
 */
export async function loadMonitorLightData(): Promise<MonitorLightData[]> {
    try {
        const response = await fetch('/file/景氣指標與燈號.csv');
        const text = await response.text();
        const lines = text.split('\n');

        const data: MonitorLightData[] = [];
        for (const line of lines) {
            const parsed = parseCSVLine(line);
            if (parsed) {
                data.push(parsed);
            }
        }

        return data.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
        console.error('Error loading monitor light data:', error);
        return [];
    }
}

/**
 * Get data for specific time period
 */
export function getMonitorDataForPeriod(
    allData: MonitorLightData[],
    period: '1y' | '5y' = '1y'
): MonitorLightData[] {
    if (allData.length === 0) return [];

    const latestDate = new Date(allData[allData.length - 1].date);
    const cutoffDate = new Date(latestDate);

    if (period === '1y') {
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
    } else {
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 5);
    }

    return allData.filter(d => new Date(d.date) >= cutoffDate);
}

/**
 * Get latest monitor light data
 */
export function getLatestMonitorData(allData: MonitorLightData[]): MonitorLightData | null {
    if (allData.length === 0) return null;
    return allData[allData.length - 1];
}
