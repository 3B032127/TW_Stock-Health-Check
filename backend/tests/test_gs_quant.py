import asyncio
import os
import sys
import time
from unittest.mock import patch

import httpx

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend import database, models
from backend.main import app
from backend.services.gs_quant.backtest import run_backtest
from backend.services.gs_quant.factor import get_factor_exposures


def test_gs_quant_import():
    import gs_quant
    from gs_quant.timeseries import (
        Window,
        bollinger_bands,
        max_drawdown,
        moving_average,
        percentiles,
        relative_strength_index,
        returns,
        volatility,
        zscores,
    )

    assert gs_quant.__version__
    assert callable(returns)
    assert callable(volatility)
    assert callable(max_drawdown)
    assert callable(zscores)
    assert callable(percentiles)
    assert callable(moving_average)
    assert callable(bollinger_bands)
    assert callable(relative_strength_index)
    assert Window(20, 0).w == 20


def test_factor_exposures_service_and_db():
    models.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    try:
        res = get_factor_exposures(db, ticker="2330", persist=True)
        assert res["ticker"] == "2330"
        assert res["engine"] == "gs-quant"
        assert set(res["exposures"].keys()) == {
            "Momentum",
            "Value",
            "Quality",
            "LowVolatility",
            "MarketBeta",
            "SmartMoney",
        }
        for val in res["exposures"].values():
            assert -3.0 <= val <= 3.0

        assert len(res["rolling_series"]) > 0
        assert 0 <= res["composite_score"] <= 100

        db_rows = (
            db.query(models.GSFactorResult)
            .filter_by(ticker="2330", date=res["date"])
            .all()
        )
        assert len(db_rows) == 6
    finally:
        db.close()


def test_backtest_service_and_db():
    models.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    try:
        for strat in ["multi_factor", "ma_cross", "rsi_mean_reversion", "macd_momentum"]:
            res = run_backtest(db, ticker="2330", strategy=strat, persist=True)
            assert res["ticker"] == "2330"
            assert res["strategy"] == strat
            assert len(res["equity_curve"]) > 20
            m = res["metrics"]
            assert m["max_drawdown"] <= 0
            assert m["final_equity"] > 0

        db_rows = db.query(models.GSBacktestResult).filter_by(portfolio_id="2330").all()
        assert len(db_rows) >= 13
    finally:
        db.close()


def test_mocked_factor_and_backtest_endpoints_latency():
    async def _run_requests():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            t0 = time.perf_counter()
            r1 = await client.get("/gs_quant/stock/2330/factor?force_refresh=true")
            dt1 = time.perf_counter() - t0
            assert r1.status_code == 200
            j1 = r1.json()
            assert j1["status"] == "success"
            assert j1["ticker"] == "2330"
            assert "Momentum" in j1["exposures"]
            assert len(j1["data"]["factors_detail"]) == 6
            assert dt1 < 5.0

            t1 = time.perf_counter()
            r2 = await client.get("/api/v1/gs_quant/stock/2330/backtest?strategy=rsi_mean_reversion&force_refresh=true")
            dt2 = time.perf_counter() - t1
            assert r2.status_code == 200
            j2 = r2.json()
            assert j2["status"] == "success"
            assert j2["strategy"] == "rsi_mean_reversion"
            assert "sharpe_ratio" in j2["metrics"]
            assert len(j2["data"]["equity_curve"]) > 10
            assert dt2 < 5.0

    # Mock offline yfinance call to verify latency and response under mocked network conditions
    with patch("yfinance.Ticker") as mock_yf:
        mock_yf.side_effect = RuntimeError("mocked offline yfinance")
        asyncio.run(_run_requests())
