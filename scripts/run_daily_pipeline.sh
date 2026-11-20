#!/usr/bin/env bash
#
# 台股每日盤後與週度再訓練排程（V3.1 多模態三引擎版本）
#   14:35  ./scripts/run_daily_pipeline.sh update    -> 更新日 K 線並驗證最新交易日資料就緒
#   14:40  ./scripts/run_daily_pipeline.sh predict   -> 計算估值 -> 增量更新多模態特徵 -> 三引擎推論
#   週六   ./scripts/run_daily_pipeline.sh retrain   -> 更新 300 日特徵寬表 -> 滾動再訓練 LightGBM 修正器
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
  "$PY" scripts/update_tw_daily_prices.py --days 1 --symbols 2330 || {
    echo "最新交易日資料尚未就緒，略過預測"; return 2; }
  "$PY" scripts/calc_stock_valuation.py
  "$PY" scripts/build_multimodal_features.py --days 60
  "$PY" scripts/run_tw_predictions.py --mode daily
}

retrain() {
  "$PY" scripts/calc_stock_valuation.py
  "$PY" scripts/build_multimodal_features.py --days 300
  "$PY" scripts/run_tw_predictions.py --mode train-lgbm
}

case "$MODE" in
  update)  update_prices ;;
  predict) predict ;;
  retrain) retrain ;;
  all)     update_prices && predict ;;
  *) echo "用法: $0 {update|predict|retrain|all}"; exit 1 ;;
esac
