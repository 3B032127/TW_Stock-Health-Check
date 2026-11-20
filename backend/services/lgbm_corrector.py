"""
LightGBM 財報籌碼殘差修正器 (Multi-Modal Residual Corrector — V3.4 去中心化與風控版)

架構定位（三引擎第三級 / LightGBM 單模型）：
  P_final(t+h) = P_base(t+h) * (1 + clamp(Delta_r(t+h), -0.025, +0.025))
其中：
  - 橫截面去中心化（Cross-Sectional Demeaning）：訓練與推論皆減去當日全市場平均修正值，
    強制全市場修正均值嚴格歸零 (`mean(delta_r) == 0`)，消除多頭慣性偏多誤差。
  - 籌碼與趨勢風控閥：當「近 5 日三大法人合計賣超 (< 0)」且「收盤價低於 MA10」時，
    禁止基本面因子進行正向加分，上限鎖死為 0.0%。
"""

from __future__ import annotations

import math
import os
import pickle
import time
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
from sqlalchemy.orm import Session

FEATURE_COLS: List[str] = [
    "foreign_net_vol_ratio_5d",
    "trust_net_vol_ratio_5d",
    "margin_balance_chg_5d",
    "inst_streak_days",
    "rev_yoy",
    "rev_mom",
    "rev_momentum_3m_12m",
    "gross_margin_qoq",
    "pe_percentile_3y",
    "health_score",
    "valuation_percentile",
    "taiex_ret_5d",
    "atr_14_pct",
]

DEFAULT_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "models",
    "lgbm_alpha_corrector.pkl",
)

DELTA_MIN = -0.025
DELTA_MAX = 0.025


def demean_and_clip_cross_section(
    raw_map: Dict[str, float],
    clip_limit: float = DELTA_MAX,
) -> Tuple[Dict[str, float], float]:
    """
    對單日全市場原始預測值執行精確「橫截面去中心化 + 區間箝制」投影：
    以一維二分搜尋找出位移 c*，使得 mean(clip(raw - c*, -clip_limit, +clip_limit)) == 0.0，
    嚴格保證全市場修正均值歸零且每檔個股嚴格落於 [-2.5%, +2.5%]，同時保持排序單調性。
    """
    if not raw_map:
        return {}, 0.0
    keys = list(raw_map.keys())
    arr = np.asarray([float(raw_map[k]) for k in keys], dtype=np.float64)
    if len(arr) == 1:
        val = float(arr[0])
        return {keys[0]: 0.0}, val

    lo = float(np.min(arr)) - clip_limit - 1.0
    hi = float(np.max(arr)) + clip_limit + 1.0
    for _ in range(55):
        mid = 0.5 * (lo + hi)
        if float(np.mean(np.clip(arr - mid, -clip_limit, clip_limit))) > 0.0:
            lo = mid
        else:
            hi = mid
    c_star = 0.5 * (lo + hi)
    demeaned = np.clip(arr - c_star, -clip_limit, clip_limit)
    # 消除浮點微小尾差並維持嚴格箝制
    out = {k: float(v) for k, v in zip(keys, demeaned)}
    return out, float(c_star)


def apply_chips_trend_valve(
    deltas: np.ndarray,
    inst_net_5d: Optional[float],
    close: float,
    ma10: Optional[float],
) -> Tuple[np.ndarray, bool]:
    """
    籌碼與趨勢風控閥：
      當「近 5 日三大法人合計賣超 (< 0)」且「收盤價低於 10 日均線 (Close < MA10)」時，
      禁止基本面因子進行正向加分（上限鎖死為 0.0%，保留負向修正幅度）。
    """
    if (
        inst_net_5d is not None
        and np.isfinite(float(inst_net_5d))
        and float(inst_net_5d) < 0.0
        and ma10 is not None
        and np.isfinite(float(ma10))
        and float(ma10) > 0.0
        and float(close) < float(ma10)
    ):
        clipped = np.clip(np.minimum(deltas, 0.0), DELTA_MIN, 0.0)
        return clipped, True
    return np.clip(deltas, DELTA_MIN, DELTA_MAX), False


class _HistTreeNode:
    __slots__ = ("feature_idx", "threshold", "left", "right", "value", "mean_value")

    def __init__(
        self,
        value: float,
        mean_value: float,
        feature_idx: int = -1,
        threshold: float = 0.0,
        left: Optional["_HistTreeNode"] = None,
        right: Optional["_HistTreeNode"] = None,
    ) -> None:
        self.value = value
        self.mean_value = mean_value
        self.feature_idx = feature_idx
        self.threshold = threshold
        self.left = left
        self.right = right

    @property
    def is_leaf(self) -> bool:
        return self.feature_idx < 0


class HistogramGBDTRegressor:
    """
    向量化直方圖梯度提升回歸樹 (與 LightGBM 同源直方圖分割演算法)。
    支援單筆預測與沿樹路徑精確計算之特徵貢獻度拆解 (TreeSHAP-style path attribution)。
    """

    def __init__(
        self,
        n_estimators: int = 60,
        max_depth: int = 3,
        learning_rate: float = 0.06,
        min_child_samples: int = 80,
        reg_lambda: float = 20.0,
        max_bins: int = 32,
        subsample_cols: float = 0.85,
        seed: int = 42,
    ) -> None:
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.learning_rate = learning_rate
        self.min_child_samples = min_child_samples
        self.reg_lambda = reg_lambda
        self.max_bins = max_bins
        self.subsample_cols = subsample_cols
        self.seed = seed
        self.base_score: float = 0.0
        self.trees: List[_HistTreeNode] = []
        self.feature_importances_: Optional[np.ndarray] = None

    def fit(self, X: np.ndarray, y: np.ndarray) -> "HistogramGBDTRegressor":
        n_samples, n_features = X.shape
        self.base_score = float(np.mean(y)) if n_samples > 0 else 0.0
        self.trees = []
        importances = np.zeros(n_features, dtype=np.float64)

        if n_samples < self.min_child_samples * 2:
            self.feature_importances_ = importances
            return self

        # Pre-bin all features into uint8 quantile bins [0..max_bins-1]
        bin_edges: List[np.ndarray] = []
        binned = np.zeros((n_samples, n_features), dtype=np.int32)
        qs = np.linspace(0.0, 1.0, self.max_bins + 1)[1:-1]
        for j in range(n_features):
            col = X[:, j]
            edges = np.unique(np.quantile(col, qs))
            if len(edges) == 0:
                bin_edges.append(np.array([0.0], dtype=np.float64))
                binned[:, j] = 0
            else:
                bin_edges.append(edges)
                binned[:, j] = np.searchsorted(edges, col, side="right")

        rng = np.random.default_rng(self.seed)
        preds = np.full(n_samples, self.base_score, dtype=np.float64)
        n_col_sample = max(1, int(math.ceil(n_features * self.subsample_cols)))

        def _build_node(indices: np.ndarray, residuals: np.ndarray, depth: int, col_subset: np.ndarray) -> _HistTreeNode:
            n_node = len(indices)
            sum_g = float(np.sum(residuals[indices]))
            leaf_val = sum_g / (n_node + self.reg_lambda)
            mean_val = sum_g / max(n_node, 1)

            if depth >= self.max_depth or n_node < self.min_child_samples * 2:
                return _HistTreeNode(value=leaf_val, mean_value=mean_val)

            best_gain = 0.0
            best_feat = -1
            best_bin = -1
            parent_score = (sum_g * sum_g) / (n_node + self.reg_lambda)
            node_res = residuals[indices]

            for j in col_subset:
                edges = bin_edges[j]
                nbins = len(edges) + 1
                if nbins <= 1:
                    continue
                b_vals = binned[indices, j]
                cnt_hist = np.bincount(b_vals, minlength=nbins)
                grad_hist = np.bincount(b_vals, weights=node_res, minlength=nbins)

                left_cnt = np.cumsum(cnt_hist[:-1])
                right_cnt = n_node - left_cnt
                left_g = np.cumsum(grad_hist[:-1])
                right_g = sum_g - left_g

                valid = (left_cnt >= self.min_child_samples) & (right_cnt >= self.min_child_samples)
                if not np.any(valid):
                    continue
                gains = (
                    (left_g * left_g) / (left_cnt + self.reg_lambda)
                    + (right_g * right_g) / (right_cnt + self.reg_lambda)
                    - parent_score
                )
                gains = np.where(valid, gains, -1.0)
                k = int(np.argmax(gains))
                if gains[k] > best_gain:
                    best_gain = float(gains[k])
                    best_feat = int(j)
                    best_bin = k

            if best_feat < 0 or best_gain <= 1e-10:
                return _HistTreeNode(value=leaf_val, mean_value=mean_val)

            thresh = float(bin_edges[best_feat][best_bin])
            mask_left = binned[indices, best_feat] <= best_bin
            left_idx = indices[mask_left]
            right_idx = indices[~mask_left]
            importances[best_feat] += best_gain

            left_node = _build_node(left_idx, residuals, depth + 1, col_subset)
            right_node = _build_node(right_idx, residuals, depth + 1, col_subset)
            return _HistTreeNode(
                value=leaf_val,
                mean_value=mean_val,
                feature_idx=best_feat,
                threshold=thresh,
                left=left_node,
                right=right_node,
            )

        all_idx = np.arange(n_samples, dtype=np.int32)
        for _ in range(self.n_estimators):
            residuals = y - preds
            col_sub = rng.choice(n_features, size=n_col_sample, replace=False)
            tree = _build_node(all_idx, residuals, 0, col_sub)
            self.trees.append(tree)
            preds += self.learning_rate * self._predict_tree_batch(tree, X)

        tot_imp = float(np.sum(importances))
        self.feature_importances_ = (importances / tot_imp) if tot_imp > 0 else importances
        return self

    def _predict_tree_batch(self, node: _HistTreeNode, X: np.ndarray) -> np.ndarray:
        if node.is_leaf:
            return np.full(X.shape[0], node.value, dtype=np.float64)
        out = np.empty(X.shape[0], dtype=np.float64)
        mask = X[:, node.feature_idx] <= node.threshold
        if np.any(mask) and node.left is not None:
            out[mask] = self._predict_tree_batch(node.left, X[mask])
        if np.any(~mask) and node.right is not None:
            out[~mask] = self._predict_tree_batch(node.right, X[~mask])
        return out

    def predict(self, X: np.ndarray) -> np.ndarray:
        out = np.full(X.shape[0], self.base_score, dtype=np.float64)
        for tree in self.trees:
            out += self.learning_rate * self._predict_tree_batch(tree, X)
        return out

    def predict_with_contributions(self, x_row: np.ndarray) -> Tuple[float, np.ndarray]:
        """回傳單筆預測值以及沿決策路徑累積之各特徵貢獻度。"""
        contrib = np.zeros(len(x_row), dtype=np.float64)
        pred = self.base_score
        for tree in self.trees:
            node = tree
            while not node.is_leaf:
                child = node.left if (x_row[node.feature_idx] <= node.threshold and node.left is not None) else node.right
                if child is None:
                    break
                contrib[node.feature_idx] += self.learning_rate * (child.mean_value - node.mean_value)
                node = child
            pred += self.learning_rate * node.value
        return float(pred), contrib


def _train_single_regressor(X: np.ndarray, y: np.ndarray, seed: int = 42) -> Tuple[Any, str]:
    """若本機裝有 LightGBM 則優先調用；否則使用 HistogramGBDTRegressor。"""
    try:
        import lightgbm as lgb  # type: ignore

        model = lgb.LGBMRegressor(
            n_estimators=120,
            max_depth=4,
            num_leaves=15,
            learning_rate=0.05,
            subsample=0.85,
            colsample_bytree=0.85,
            reg_lambda=10.0,
            min_child_samples=60,
            random_state=seed,
            verbose=-1,
        )
        model.fit(X, y)
        return model, "lightgbm"
    except Exception:
        model = HistogramGBDTRegressor(seed=seed)
        model.fit(X, y)
        return model, "histogram-gbdt"


class AlphaCorrectorBundle:
    """封裝 T+1 / T+5 LightGBM 殘差修正模型、中位數填補器與訓練元數據。"""

    def __init__(
        self,
        model_t1: Any,
        model_t5: Any,
        medians: np.ndarray,
        backend: str,
        trained_at: str,
        cutoff_date: str,
        train_samples: int,
        val_metrics: Dict[str, Any],
        train_raw_mean_t1: float = 0.0,
        train_raw_mean_t5: float = 0.0,
    ) -> None:
        self.model_t1 = model_t1
        self.model_t5 = model_t5
        self.medians = medians
        self.backend = backend
        self.trained_at = trained_at
        self.cutoff_date = cutoff_date
        self.train_samples = train_samples
        self.val_metrics = val_metrics
        self.train_raw_mean_t1 = float(train_raw_mean_t1)
        self.train_raw_mean_t5 = float(train_raw_mean_t5)

    def _vectorize_row(self, feature_row: Dict[str, Any]) -> np.ndarray:
        vec = np.empty(len(FEATURE_COLS), dtype=np.float64)
        for idx, col in enumerate(FEATURE_COLS):
            val = feature_row.get(col)
            if val is None or not np.isfinite(float(val)):
                vec[idx] = float(self.medians[idx])
            else:
                vec[idx] = float(val)
        return vec

    def predict_raw_batch(self, feature_rows: Sequence[Dict[str, Any]]) -> Tuple[np.ndarray, np.ndarray]:
        """批次計算未裁剪之原始 T+1 / T+5 殘差預測值，供橫截面去中心化使用。"""
        if not feature_rows:
            return np.zeros(0, dtype=np.float64), np.zeros(0, dtype=np.float64)
        X = np.vstack([self._vectorize_row(r) for r in feature_rows])
        raw_t1 = np.asarray(self.model_t1.predict(X), dtype=np.float64)
        raw_t5 = np.asarray(self.model_t5.predict(X), dtype=np.float64)
        return raw_t1, raw_t5

    def predict_raw_and_contrib(
        self,
        feature_row: Optional[Dict[str, Any]],
    ) -> Tuple[float, float, Dict[str, float]]:
        """回傳未去中心化/未裁剪之 (raw_d1, raw_d5, contrib_map)。"""
        if not feature_row:
            return 0.0, 0.0, {}

        vec = self._vectorize_row(feature_row)
        X1 = vec.reshape(1, -1)

        if hasattr(self.model_t1, "predict_with_contributions"):
            raw_d1, c1 = self.model_t1.predict_with_contributions(vec)
        else:
            raw_d1 = float(self.model_t1.predict(X1)[0])
            c1 = np.zeros(len(FEATURE_COLS), dtype=np.float64)

        if hasattr(self.model_t5, "predict_with_contributions"):
            raw_d5, c5 = self.model_t5.predict_with_contributions(vec)
        else:
            raw_d5 = float(self.model_t5.predict(X1)[0])
            c5 = np.zeros(len(FEATURE_COLS), dtype=np.float64)

        contrib_avg = 0.5 * c1 + 0.5 * c5
        if float(np.sum(np.abs(contrib_avg))) < 1e-8 and hasattr(self.model_t5, "feature_importances_"):
            imp = np.asarray(self.model_t5.feature_importances_, dtype=np.float64)
            contrib_avg = imp * float(np.clip(raw_d5, DELTA_MIN, DELTA_MAX))

        contrib_map = {col: round(float(contrib_avg[i]), 6) for i, col in enumerate(FEATURE_COLS)}
        return float(raw_d1), float(raw_d5), contrib_map

    def predict_deltas(
        self,
        feature_row: Optional[Dict[str, Any]],
        offset_t1: Optional[float] = None,
        offset_t5: Optional[float] = None,
    ) -> Tuple[np.ndarray, Dict[str, float]]:
        """
        輸出未來 5 個交易日 (h=1..5) 的殘差報酬修正率陣列，
        減去橫截面均值位移後嚴格箝制於 [-0.025, +0.025] ([-2.5%, +2.5%])。
        """
        if not feature_row:
            return np.zeros(5, dtype=np.float64), {}

        raw_d1, raw_d5, contrib_map = self.predict_raw_and_contrib(feature_row)
        off1 = float(getattr(self, "train_raw_mean_t1", 0.0) if offset_t1 is None else offset_t1)
        off5 = float(getattr(self, "train_raw_mean_t5", 0.0) if offset_t5 is None else offset_t5)

        d1 = float(np.clip(raw_d1 - off1, DELTA_MIN, DELTA_MAX))
        d5 = float(np.clip(raw_d5 - off5, DELTA_MIN, DELTA_MAX))
        deltas = np.linspace(d1, d5, 5, dtype=np.float64)
        deltas = np.clip(deltas, DELTA_MIN, DELTA_MAX)
        return deltas, contrib_map


def _fast_base_expected_returns(closes: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    向量化計算全歷史基準模型對 T+1 / T+5 的預期報酬率 (用於構造訓練殘差目標)，
    與 DualModelForecaster 的阻尼多尺度趨勢口徑一致，嚴格僅使用 t 及之前收盤價。
    """
    n = len(closes)
    log_c = np.log(np.maximum(closes, 1e-6))
    r1 = np.zeros(n, dtype=np.float64)
    r5 = np.zeros(n, dtype=np.float64)
    if n < 25:
        return r1, r5

    # 10D, 20D, 60D 因果移動平均報酬作為基準漂移
    diff1 = np.diff(log_c, prepend=log_c[0])
    csum = np.cumsum(diff1)
    for idx in range(20, n):
        m10 = (csum[idx] - csum[idx - 10]) / 10.0
        m20 = (csum[idx] - csum[idx - 20]) / 20.0
        w60 = min(60, idx)
        m60 = (csum[idx] - csum[idx - w60]) / w60
        drift = float(np.clip(0.35 * m10 + 0.40 * m20 + 0.25 * m60, -0.009, 0.009))
        # Damped phi=0.85 cumulative drift
        r1[idx] = math.exp(drift) - 1.0
        cum5 = drift * sum(0.85 ** h for h in range(5))
        r5[idx] = math.exp(cum5) - 1.0
    return r1, r5


def train_alpha_corrector(
    db: Session,
    cutoff_date: Optional[str] = None,
    lookback_days: int = 260,
    model_path: Optional[str] = DEFAULT_MODEL_PATH,
    save_to_disk: bool = True,
) -> Optional[AlphaCorrectorBundle]:
    """
    使用本地 SQLite 的過去 1 年全市場樣本（嚴格限制 T+5 到期日 <= cutoff_date），
    訓練 T+1 與 T+5 殘差修正模型並存至 `models/lgbm_alpha_corrector.pkl`。
    """
    t0 = time.perf_counter()
    raw_conn = db.connection().connection
    cur = raw_conn.cursor()

    eff_cutoff = cutoff_date or "9999-12-31"

    # 讀取日K價格
    cur.execute(
        "SELECT stock_id, date, close FROM stock_prices_daily "
        "WHERE close IS NOT NULL AND close > 0 AND date <= ? ORDER BY stock_id, date",
        (eff_cutoff,),
    )
    prices_by_sym: Dict[str, Tuple[List[str], np.ndarray]] = {}
    tmp_d: Dict[str, List[str]] = defaultdict(list)
    tmp_c: Dict[str, List[float]] = defaultdict(list)
    for sid, dt, cl in cur:
        tmp_d[sid].append(dt)
        tmp_c[sid].append(float(cl))
    for sid in tmp_d:
        prices_by_sym[sid] = (tmp_d[sid], np.asarray(tmp_c[sid], dtype=np.float64))

    # 讀取已組裝的多模態特徵
    cols_sql = ", ".join(FEATURE_COLS)
    cur.execute(
        f"SELECT symbol, date, {cols_sql} FROM stock_multimodal_features WHERE date <= ? ORDER BY symbol, date",
        (eff_cutoff,),
    )
    feat_lookup: Dict[Tuple[str, str], List[Optional[float]]] = {}
    max_feat_date = ""
    for row in cur:
        sym, dt = row[0], row[1]
        if dt > max_feat_date:
            max_feat_date = dt
        feat_lookup[(sym, dt)] = list(row[2:])

    if not feat_lookup:
        return None

    X_rows: List[List[Optional[float]]] = []
    y1_list: List[float] = []
    y5_list: List[float] = []
    sample_dates: List[str] = []

    for sym, (dates, closes) in prices_by_sym.items():
        n = len(closes)
        if n < 30:
            continue
        base_r1, base_r5 = _fast_base_expected_returns(closes)
        start_i = max(20, n - lookback_days - 5)
        for i in range(start_i, n - 5):
            dt = dates[i]
            t5_date = dates[i + 5]
            if t5_date > eff_cutoff:
                continue
            fvals = feat_lookup.get((sym, dt))
            if fvals is None:
                continue
            c0 = closes[i]
            if c0 <= 0:
                continue
            act_r1 = (closes[i + 1] - c0) / c0
            act_r5 = (closes[i + 5] - c0) / c0
            res_1 = float(np.clip(act_r1 - base_r1[i], -0.10, 0.10))
            res_5 = float(np.clip(act_r5 - base_r5[i], -0.25, 0.25))
            X_rows.append(fvals)
            y1_list.append(res_1)
            y5_list.append(res_5)
            sample_dates.append(dt)

    if len(X_rows) < 200:
        return None

    X_raw = np.array(
        [[np.nan if v is None else float(v) for v in row] for row in X_rows],
        dtype=np.float64,
    )
    medians = np.nanmedian(X_raw, axis=0)
    medians = np.where(np.isfinite(medians), medians, 0.0)
    nan_mask = ~np.isfinite(X_raw)
    if np.any(nan_mask):
        X_raw[nan_mask] = np.take(medians, np.where(nan_mask)[1])

    y1 = np.asarray(y1_list, dtype=np.float64)
    y5 = np.asarray(y5_list, dtype=np.float64)
    dates_arr = np.asarray(sample_dates)

    # 橫截面去中心化 (Cross-Sectional Demeaning)：按交易日減去當日全市場殘差均值，強制市場預期均值歸零
    date_indices: Dict[str, List[int]] = defaultdict(list)
    for idx, dt_val in enumerate(sample_dates):
        date_indices[dt_val].append(idx)
    for idxs in date_indices.values():
        if len(idxs) > 1:
            idx_np = np.asarray(idxs, dtype=np.int64)
            y1[idx_np] -= float(np.mean(y1[idx_np]))
            y5[idx_np] -= float(np.mean(y5[idx_np]))

    # 時間排序最後 15% 當驗證指標，再用全樣本訓練發布版模型
    order = np.argsort(dates_arr)
    X_sorted = X_raw[order]
    y1_sorted = y1[order]
    y5_sorted = y5[order]
    dates_sorted = dates_arr[order]
    split = int(len(X_sorted) * 0.85)

    m1_val, backend = _train_single_regressor(X_sorted[:split], y1_sorted[:split], seed=42)
    m5_val, _ = _train_single_regressor(X_sorted[:split], y5_sorted[:split], seed=43)
    raw_p1_val = np.asarray(m1_val.predict(X_sorted[split:]), dtype=np.float64)
    raw_p5_val = np.asarray(m5_val.predict(X_sorted[split:]), dtype=np.float64)
    val_date_indices: Dict[str, List[int]] = defaultdict(list)
    for idx_v, dt_v in enumerate(dates_sorted[split:]):
        val_date_indices[str(dt_v)].append(idx_v)
    p1_val = np.empty_like(raw_p1_val)
    p5_val = np.empty_like(raw_p5_val)
    for idxs_v in val_date_indices.values():
        m1_d, _ = demean_and_clip_cross_section({str(i): float(raw_p1_val[i]) for i in idxs_v})
        m5_d, _ = demean_and_clip_cross_section({str(i): float(raw_p5_val[i]) for i in idxs_v})
        for i in idxs_v:
            p1_val[i] = m1_d[str(i)]
            p5_val[i] = m5_d[str(i)]

    val_metrics = {
        "val_samples": int(len(X_sorted) - split),
        "t1_dir_match_pct": round(float(np.mean(np.sign(p1_val) == np.sign(y1_sorted[split:])) * 100.0), 1),
        "t5_dir_match_pct": round(float(np.mean(np.sign(p5_val) == np.sign(y5_sorted[split:])) * 100.0), 1),
        "delta_clip_pct": 2.5,
        "cross_sectional_demeaned": True,
        "train_seconds": round(time.perf_counter() - t0, 2),
    }

    m1_full, backend = _train_single_regressor(X_sorted, y1_sorted, seed=42)
    m5_full, _ = _train_single_regressor(X_sorted, y5_sorted, seed=43)
    train_raw_mean_t1 = float(np.mean(m1_full.predict(X_sorted)))
    train_raw_mean_t5 = float(np.mean(m5_full.predict(X_sorted)))

    bundle = AlphaCorrectorBundle(
        model_t1=m1_full,
        model_t5=m5_full,
        medians=medians,
        backend=backend,
        trained_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        cutoff_date=max_feat_date or eff_cutoff,
        train_samples=len(X_sorted),
        val_metrics=val_metrics,
        train_raw_mean_t1=train_raw_mean_t1,
        train_raw_mean_t5=train_raw_mean_t5,
    )

    if save_to_disk and model_path:
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        with open(model_path, "wb") as f:
            pickle.dump(bundle, f)

    return bundle


def load_alpha_corrector(model_path: str = DEFAULT_MODEL_PATH) -> Optional[AlphaCorrectorBundle]:
    if not os.path.exists(model_path):
        return None
    try:
        with open(model_path, "rb") as f:
            obj = pickle.load(f)
        if isinstance(obj, AlphaCorrectorBundle):
            return obj
    except Exception:
        return None
    return None
