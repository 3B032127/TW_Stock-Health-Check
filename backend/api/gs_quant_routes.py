import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import database, models
from ..services import cache_service, market
from ..services.gs_quant.backtest import run_backtest
from ..services.gs_quant.factor import get_factor_exposures

router = APIRouter(tags=["gs-quant"])


async def _ensure_market_history(db: Session, ticker: str) -> None:
    """Ensure sufficient daily prices (and chips if possible) exist in SQLite before gs-quant computation."""
    price_count = db.query(models.StockPriceDaily).filter_by(stock_id=ticker).count()
    if price_count < 60:
        try:
            await asyncio.wait_for(market.get_stock_price(db, ticker, days=365, force_sync=True), timeout=20.0)
        except Exception as e:
            print(f"Auto price sync failed for {ticker}: {e}")

    chips_count = db.query(models.ChipsDaily).filter_by(stock_id=ticker).count()
    if chips_count < 30:
        try:
            await asyncio.wait_for(market.get_chips_data(db, ticker, days=180, force_sync=True), timeout=15.0)
        except Exception as e:
            print(f"Auto chips sync failed for {ticker}: {e}")


def _run_factor_in_thread(ticker: str, date: Optional[str]) -> dict:
    db = database.SessionLocal()
    try:
        return get_factor_exposures(db, ticker=ticker, date=date, persist=True)
    finally:
        db.close()


def _run_backtest_in_thread(
    ticker: str,
    strategy: str,
    start_date: Optional[str],
    end_date: Optional[str],
    initial_capital: float,
) -> dict:
    db = database.SessionLocal()
    try:
        return run_backtest(
            db,
            ticker=ticker,
            strategy=strategy,
            start_date=start_date,
            end_date=end_date,
            initial_capital=initial_capital,
            persist=True,
        )
    finally:
        db.close()


@router.get("/stock/{ticker}/factor")
async def get_stock_gs_factor(
    ticker: str,
    date: Optional[str] = Query(default=None, description="截止基準日 YYYY-MM-DD"),
    force_refresh: bool = Query(default=False, description="強制重新計算並忽略快取"),
    db: Session = Depends(database.get_db),
):
    """計算並回傳個股在 Goldman Sachs gs-quant 引擎下的多因子曝險、風險指標與時間序列"""
    clean_date = date if isinstance(date, str) else None
    clean_force = force_refresh if isinstance(force_refresh, bool) else False

    cache_key_id = f"{ticker}_{clean_date or 'latest'}"
    if not clean_force:
        cached = cache_service.get_cached_response(db, "gs_factor", cache_key_id)
        if cached and cached.get("data", {}).get("exposures"):
            return cached

    await _ensure_market_history(db, ticker)

    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(_run_factor_in_thread, ticker, clean_date),
            timeout=15.0,
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"gs-quant factor calculation failed: {e}")

    response_payload = {
        "status": "success",
        "source": "gs-quant",
        "ticker": result["ticker"],
        "date": result["date"],
        "exposures": result["exposures"],
        "data": result,
    }
    cache_service.set_cached_response(db, "gs_factor", cache_key_id, response_payload)
    return response_payload


@router.get("/stock/{ticker}/backtest")
async def get_stock_gs_backtest(
    ticker: str,
    strategy: str = Query(
        default="multi_factor",
        description="策略類型: multi_factor | ma_cross | rsi_mean_reversion | macd_momentum",
    ),
    start_date: Optional[str] = Query(default=None, description="回測起始日 YYYY-MM-DD"),
    end_date: Optional[str] = Query(default=None, description="回測結束日 YYYY-MM-DD"),
    initial_capital: float = Query(default=1000000.0, gt=0, description="初始資金 (TWD)"),
    force_refresh: bool = Query(default=False, description="強制重新計算並忽略快取"),
    db: Session = Depends(database.get_db),
):
    """執行基於 gs_quant.timeseries 之個股歷史策略回測與績效歸因"""
    clean_strategy = strategy if isinstance(strategy, str) else "multi_factor"
    clean_start = start_date if isinstance(start_date, str) else None
    clean_end = end_date if isinstance(end_date, str) else None
    clean_capital = float(initial_capital) if isinstance(initial_capital, (int, float)) else 1000000.0
    clean_force = force_refresh if isinstance(force_refresh, bool) else False

    cache_key_id = f"{ticker}_{clean_strategy}_{clean_start or '1y'}_{clean_end or 'latest'}_{int(clean_capital)}"
    if not clean_force:
        cached = cache_service.get_cached_response(db, "gs_backtest", cache_key_id)
        if cached and cached.get("data", {}).get("equity_curve"):
            return cached

    await _ensure_market_history(db, ticker)

    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(
                _run_backtest_in_thread,
                ticker,
                clean_strategy,
                clean_start,
                clean_end,
                clean_capital,
            ),
            timeout=15.0,
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"gs-quant backtest calculation failed: {e}")

    response_payload = {
        "status": "success",
        "source": "gs-quant",
        "ticker": result["ticker"],
        "strategy": result["strategy"],
        "metrics": result["metrics"],
        "data": result,
    }
    cache_service.set_cached_response(db, "gs_backtest", cache_key_id, response_payload)
    return response_payload
