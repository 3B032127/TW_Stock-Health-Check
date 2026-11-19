#!/usr/bin/env bash
#
# 台股每日盤後排程（先更新 K 線，確認最新交易日後才推論）
#   14:35  ./scripts/run_daily_pipeline.sh update    -> 更新日 K 線並驗證最新日期
#   14:40  ./scripts/run_daily_pipeline.sh predict   -> 再次確認資料就緒後執行 run_tw_predictions.py --mode daily
#   手動補跑: ./scripts/run_daily_pipeline.sh all
#
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR" || exit 1
PY="$SCRIPT_DIR/venv/bin/python"
MODE="${1:-all}"

update_prices() {
  "$PY" scripts/update_tw_daily_prices.py --days 10
}

predict() {
  # --days 0 僅做資料就緒驗證，不重抓
  "$PY" scripts/update_tw_daily_prices.py --days 1 --symbols 2330 || {
    echo "最新交易日資料尚未就緒，略過預測"; return 2; }
  "$PY" scripts/run_tw_predictions.py --mode daily
}

case "$MODE" in
  update)  update_prices ;;
  predict) predict ;;
  all)     update_prices && predict ;;
  *) echo "用法: $0 {update|predict|all}"; exit 1 ;;
esac
