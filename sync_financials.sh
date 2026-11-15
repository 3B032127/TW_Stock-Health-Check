#!/usr/bin/env bash
#
# 台股上市公司全維度歷史數據 (財報/股利/5年股價/三大法人) 自動補齊與 API 額度監控系統
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 檢查虛擬環境
if [ -d "$SCRIPT_DIR/venv" ]; then
    PYTHON_BIN="$SCRIPT_DIR/venv/bin/python"
else
    PYTHON_BIN="python3"
fi

echo "=================================================="
echo "🚀 啟動台股上市公司歷史數據全自動補齊系統"
echo "專案路徑: $SCRIPT_DIR"
echo "同步目標: 季報財報(40季) / 歷史股利(10年) / 歷史股價(5年) / 三大法人籌碼"
echo "=================================================="

# 傳遞所有命令列參數給 daemon
PYTHONPATH="$SCRIPT_DIR" "$PYTHON_BIN" -m backend.scripts.sync_financials_daemon "$@"
