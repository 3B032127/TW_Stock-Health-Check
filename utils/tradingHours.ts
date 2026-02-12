/**
 * 台股交易時段判斷工具
 * 開盤時間：週一～週五 09:00 ~ 13:30 (UTC+8)
 */

export function isTradingHours(): boolean {
    // 取得台灣時間 (UTC+8)
    const now = new Date();
    const taiwanTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));

    const day = taiwanTime.getDay(); // 0=Sun, 6=Sat
    const hours = taiwanTime.getHours();
    const minutes = taiwanTime.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    // 排除週末
    if (day === 0 || day === 6) return false;

    // 開盤時間：09:00 (540min) ~ 13:30 (810min)
    const marketOpen = 9 * 60;       // 540
    const marketClose = 13 * 60 + 30; // 810

    return timeInMinutes >= marketOpen && timeInMinutes <= marketClose;
}

/**
 * 取得股市資料自動更新頻率（毫秒）
 * 開盤中：10秒 / 收盤後：不自動更新
 */
export function getRefetchInterval(): number | false {
    return isTradingHours() ? 10_000 : false;
}

/**
 * 取得經濟指標自動更新頻率（毫秒）
 * 經濟指標/匯率通常 24/7 更新或有不同時段，設定為常駐更新。
 * 頻率：30秒
 */
export function getIndicatorRefetchInterval(): number | false {
    // 若需要完全 Test Mode (看燈號)，這裡保持常駐開啟即可
    return 30_000;
}

/**
 * 取得資料新鮮期（毫秒）
 * 開盤中：5秒 / 收盤後：30分鐘
 */
export function getStaleTime(): number {
    return isTradingHours() ? 5_000 : 30 * 60 * 1000;
}
