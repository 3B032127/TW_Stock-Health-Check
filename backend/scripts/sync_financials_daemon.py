#!/usr/bin/env python3
"""
台股上市公司歷史數據全自動補齊與 FinMind API 額度監控系統 (Daemon & TUI)
- 支援四維度歷史資料同步：
  1. 季報財報 (10年/40季：損益表、資產負債表、現金流量表) - FinMind
  2. 歷史股利 (10年：現金股利、股票股利) - FinMind
  3. 歷史股價 (5年日K線：開高低收量) - 優先 yfinance（零消耗 API 額度，極速入庫）
  4. 三大法人 (1~2年日線：外資、投信、自營商買賣超) - FinMind
- 細粒度 Smart Skip 智慧跳過：已完善的維度秒跳過，絕不浪費 API 額度
- 智慧雙金鑰額度切換與冷卻倒數 (保留額度供前台網站即時使用)
- 終端機動態四維度進度儀表板 (TUI Dashboard)
"""

import warnings
warnings.filterwarnings("ignore")

import os
import sys
import time
import math
import signal
import asyncio
import argparse
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import httpx
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine
from backend import models
from backend.services.finance import (
    get_income_statement_history,
    get_balance_sheet_history,
    get_cash_flow_history,
    parse_taiwan_year
)
from backend.services.finmind import token_manager, FinMindClient

# ANSI Color codes for clean TUI
C_RESET = "\033[0m"
C_BOLD = "\033[1m"
C_DIM = "\033[2m"
C_GREEN = "\033[92m"
C_YELLOW = "\033[93m"
C_BLUE = "\033[94m"
C_CYAN = "\033[96m"
C_RED = "\033[91m"
C_MAGENTA = "\033[95m"
C_WHITE = "\033[97m"
C_CLEAR_SCREEN = "\033[2J"
C_HOME = "\033[H"
C_ERASE_LINE = "\033[K"
C_ALT_SCREEN_ON = "\033[?1049h"
C_ALT_SCREEN_OFF = "\033[?1049l"
C_CURSOR_HIDE = "\033[?25l"
C_CURSOR_SHOW = "\033[?25h"


class SyncDashboard:
    """Manages the multi-dimensional terminal TUI dashboard state and rendering."""
    def __init__(self, plain_mode: bool = False, sync_mode: str = "all"):
        self.plain_mode = plain_mode
        self.sync_mode = sync_mode
        self.status = "INITIALIZING"
        self.start_time = time.time()
        
        # Token metrics
        self.api_used = 0
        self.api_limit = 1200
        self.api_remaining = 1200
        self.api_status_str = "查詢中..."
        
        # Overall progress
        self.total_stocks = 0
        self.completed_stocks = 0
        self.skipped_stocks = 0
        self.failed_stocks = 0
        
        # 4-Dimensional Metrics
        self.fin_ready = 0
        self.div_ready = 0
        self.price_ready = 0
        self.chips_ready = 0
        
        # Current stock info
        self.current_stock_id = ""
        self.current_stock_name = ""
        self.current_stock_industry = ""
        self.current_market_cap_rank = 0
        self.current_market_cap = 0.0
        self.current_step = ""
        
        # Cooldown metrics
        self.is_cooldown = False
        self.cooldown_remaining_sec = 0
        self.cooldown_total_sec = 0
        self.cooldown_resume_time_str = ""
        
        # Log buffer (keeps last 8 entries)
        self.logs: List[str] = []
        
        # Terminal dimensions
        self.term_width = 80
        self._update_term_size()

    def _update_term_size(self):
        try:
            cols, _ = os.get_terminal_size()
            self.term_width = max(75, min(105, cols))
        except:
            self.term_width = 85

    def add_log(self, msg: str):
        ts = datetime.now().strftime("%H:%M:%S")
        entry = f"[{ts}] {msg}"
        self.logs.append(entry)
        if len(self.logs) > 8:
            self.logs.pop(0)
        if self.plain_mode:
            print(entry, flush=True)

    def format_progress_bar(self, current: int, total: int, width: int = 20) -> str:
        if total <= 0:
            return "[" + "░" * width + "]   0.0%"
        ratio = min(1.0, max(0.0, current / total))
        filled = int(round(ratio * width))
        empty = width - filled
        pct = ratio * 100
        return f"[{'█' * filled}{'░' * empty}] {pct:5.1f}%"

    def render(self):
        if self.plain_mode:
            return

        self._update_term_size()
        w = self.term_width
        inner_w = w - 4

        elapsed_sec = int(time.time() - self.start_time)
        hrs = elapsed_sec // 3600
        mins = (elapsed_sec % 3600) // 60
        secs = elapsed_sec % 60
        uptime = f"{hrs:02d}:{mins:02d}:{secs:02d}"
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Status badge
        if self.is_cooldown:
            m = self.cooldown_remaining_sec // 60
            s = self.cooldown_remaining_sec % 60
            status_badge = f"{C_YELLOW}{C_BOLD}[🟡 冷卻休眠中 ({m:02d}:{s:02d})]{C_RESET}"
        elif self.status == "RUNNING":
            status_badge = f"{C_GREEN}{C_BOLD}[🟢 歷史同步中 (模式: {self.sync_mode})]{C_RESET}"
        elif self.status == "CHECKING":
            status_badge = f"{C_CYAN}{C_BOLD}[🔵 檢查額度中]{C_RESET}"
        elif self.status == "COMPLETED":
            status_badge = f"{C_MAGENTA}{C_BOLD}[✅ 全數完成]{C_RESET}"
        else:
            status_badge = f"{C_WHITE}{C_BOLD}[{self.status}]{C_RESET}"

        buf = []
        buf.append(C_HOME)
        buf.append(f"{C_CYAN}╔{'═' * (w - 2)}╗{C_RESET}{C_ERASE_LINE}")
        title = "📊 台股歷史資料全自動補齊與 FinMind API 額度監控系統"
        padding = (inner_w - len(title.encode('gbk', 'ignore'))) // 2
        buf.append(f"{C_CYAN}║{C_RESET} {' ' * max(0, padding)}{C_BOLD}{C_WHITE}{title}{C_RESET}{' ' * max(0, w - 3 - padding - len(title.encode('gbk', 'ignore')))}{C_CYAN}║{C_RESET}{C_ERASE_LINE}")
        buf.append(f"{C_CYAN}╚{'═' * (w - 2)}╝{C_RESET}{C_ERASE_LINE}")

        # Meta line
        buf.append(f" 狀態: {status_badge}  |  運行時間: {C_BOLD}{uptime}{C_RESET}  |  時間: {C_DIM}{now_str}{C_RESET}{C_ERASE_LINE}")
        buf.append(f"{C_DIM}{'─' * w}{C_RESET}{C_ERASE_LINE}")

        # API Quota Section
        quota_bar = self.format_progress_bar(self.api_used, self.api_limit, width=18)
        buf.append(f"{C_BOLD}[FinMind API 額度監控]{C_RESET} {C_DIM}(保留 {token_manager.reserved_for_web * len(token_manager.tokens)} 次供前台網頁即時使用){C_RESET}{C_ERASE_LINE}")
        buf.append(f" • Token狀態: {C_CYAN}{self.api_status_str}{C_RESET}{C_ERASE_LINE}")
        buf.append(f" • 額度使用: {quota_bar} ({self.api_used}/{self.api_limit} 次, 剩餘 {C_BOLD}{self.api_remaining}{C_RESET} 次){C_ERASE_LINE}")

        # Cooldown box if active
        if self.is_cooldown:
            cd_bar = self.format_progress_bar(
                self.cooldown_total_sec - self.cooldown_remaining_sec,
                self.cooldown_total_sec,
                width=20
            )
            buf.append(f"\n{C_YELLOW}{C_BOLD}[冷卻倒數計時]{C_RESET}{C_ERASE_LINE}")
            m = self.cooldown_remaining_sec // 60
            s = self.cooldown_remaining_sec % 60
            buf.append(f" • 剩餘冷卻時間: {C_YELLOW}{C_BOLD}{m:02d} 分 {s:02d} 秒{C_RESET} (預計於 {self.cooldown_resume_time_str} 重置恢復){C_ERASE_LINE}")
            buf.append(f" • 倒數進度: {cd_bar} | 保持背景開啟，重置後將自動接續...{C_ERASE_LINE}")

        # Multi-Dimensional Progress Section
        buf.append(f"\n{C_BOLD}[全市場資料庫完善度] {C_DIM}(目標共 {self.total_stocks} 檔上市普通股){C_RESET}{C_ERASE_LINE}")
        tot = max(1, self.total_stocks)
        p_fin = self.format_progress_bar(self.fin_ready, tot, width=18)
        p_div = self.format_progress_bar(self.div_ready, tot, width=18)
        p_pri = self.format_progress_bar(self.price_ready, tot, width=18)
        p_chi = self.format_progress_bar(self.chips_ready, tot, width=18)
        p_all = self.format_progress_bar(self.completed_stocks, tot, width=18)

        buf.append(f" • 總體股票進度: {p_all} ({self.completed_stocks} / {self.total_stocks} 檔){C_ERASE_LINE}")
        buf.append(f"   ├─ 季報財報: {p_fin} ({self.fin_ready}/{self.total_stocks} 檔已具備 8+ 季){C_ERASE_LINE}")
        buf.append(f"   ├─ 歷史股利: {p_div} ({self.div_ready}/{self.total_stocks} 檔已具備 3+ 年){C_ERASE_LINE}")
        buf.append(f"   ├─ 歷史股價: {p_pri} ({self.price_ready}/{self.total_stocks} 檔已具備 250+ 天，{C_GREEN}yfinance免額度{C_RESET}){C_ERASE_LINE}")
        buf.append(f"   └─ 三大法人: {p_chi} ({self.chips_ready}/{self.total_stocks} 檔已具備 60+ 天){C_ERASE_LINE}")

        # Current Target Section
        buf.append(f"\n{C_BOLD}[當前處理標的]{C_RESET}{C_ERASE_LINE}")
        if self.current_stock_id:
            cap_info = f"{self.current_market_cap:,.0f} 億" if self.current_market_cap > 0 else "N/A"
            buf.append(
                f" • 標的: {C_BOLD}{C_GREEN}[{self.current_stock_id}] {self.current_stock_name}{C_RESET} | "
                f"產業: {self.current_stock_industry} | 市值: {cap_info} (排名 #{self.current_market_cap_rank}){C_ERASE_LINE}"
            )
            buf.append(f" • 當前步驟: {self.current_step}{C_ERASE_LINE}")
        else:
            buf.append(f" • 標的: {C_DIM}(等待中){C_RESET}{C_ERASE_LINE}")

        # Logs Section
        buf.append(f"\n{C_BOLD}[即時執行日誌 (最新 {len(self.logs)} 筆)]{C_RESET}{C_ERASE_LINE}")
        buf.append(f"{C_DIM}┌{'─' * (w - 2)}┐{C_RESET}{C_ERASE_LINE}")
        if not self.logs:
            buf.append(f"{C_DIM}│  尚無日誌記錄...{' ' * max(0, w - 20)}│{C_RESET}{C_ERASE_LINE}")
        else:
            for l in self.logs[-6:]:
                clean_l = l[:w - 4]
                pad = max(0, w - 4 - len(clean_l.encode('gbk', 'ignore')))
                buf.append(f"{C_DIM}│{C_RESET} {clean_l}{' ' * pad} {C_DIM}│{C_RESET}{C_ERASE_LINE}")
        buf.append(f"{C_DIM}└{'─' * (w - 2)}┘{C_RESET}{C_ERASE_LINE}")

        # Footer
        buf.append(f"{C_DIM}提示: 按 Ctrl+C 可隨時中止運作 (進度即時寫入 SQLite 資料庫){C_RESET}{C_ERASE_LINE}")

        # Render all in one write without scrolling
        sys.stdout.write("\n".join(buf) + "\n")
        sys.stdout.flush()


class FinancialSyncDaemon:
    def __init__(
        self,
        cooldown_threshold: int = 550,
        stock_interval: float = 0.5,
        limit: Optional[int] = None,
        force: bool = False,
        plain: bool = False,
        mode: str = "all"
    ):
        self.cooldown_threshold = cooldown_threshold
        self.stock_interval = stock_interval
        self.limit = limit
        self.force = force
        self.mode = mode.lower()
        self.is_running = True
        self.dashboard = SyncDashboard(plain_mode=plain, sync_mode=self.mode)
        
        # Register signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._handle_signal)
        signal.signal(signal.SIGTERM, self._handle_signal)

    def _handle_signal(self, signum, frame):
        self.is_running = False
        if not self.dashboard.plain_mode:
            sys.stdout.write(f"{C_CURSOR_SHOW}{C_ALT_SCREEN_OFF}")
        sys.stdout.write(f"\n{C_YELLOW}收到中斷訊號，正在安全退出並儲存進度...{C_RESET}\n")
        sys.stdout.flush()

    def get_twse_operating_stocks(self, db: Session) -> List[Dict[str, Any]]:
        """
        Query all TWSE operating companies, excluding ETFs, ETNs, indices, etc.
        Sorted by market capitalization descending.
        """
        query = """
            SELECT s.stock_id, s.name, s.industry, COALESCE(m.market_cap, 0) as market_cap
            FROM stocks s
            LEFT JOIN market_cap_cache m ON s.stock_id = m.stock_id
            WHERE s.market_type = 'twse'
              AND s.industry NOT IN ('ETF', 'ETN', 'Index', '大盤', '存託憑證', '受益證券')
              AND length(s.stock_id) = 4 
              AND s.stock_id GLOB '[0-9][0-9][0-9][0-9]'
            ORDER BY COALESCE(m.market_cap, 0) DESC
        """
        result = db.execute(text(query)).fetchall()
        stocks = []
        for rank, row in enumerate(result, 1):
            stocks.append({
                "stock_id": row[0],
                "name": row[1],
                "industry": row[2] or "其他",
                "market_cap": float(row[3] or 0),
                "rank": rank
            })
        return stocks

    def init_database_metrics(self, db: Session):
        """Pre-calculate current completion numbers across all 4 dimensions."""
        try:
            q_fin = """
                SELECT COUNT(DISTINCT stock_id) FROM (
                    SELECT stock_id, COUNT(*) as c FROM financial_reports GROUP BY stock_id HAVING c >= 8
                ) WHERE stock_id IN (
                    SELECT stock_id FROM stocks WHERE market_type = 'twse' AND length(stock_id) = 4 AND stock_id GLOB '[0-9][0-9][0-9][0-9]'
                )
            """
            self.dashboard.fin_ready = db.execute(text(q_fin)).scalar() or 0

            q_div = """
                SELECT COUNT(DISTINCT stock_id) FROM (
                    SELECT stock_id, COUNT(*) as c FROM dividends GROUP BY stock_id HAVING c >= 3
                ) WHERE stock_id IN (
                    SELECT stock_id FROM stocks WHERE market_type = 'twse' AND length(stock_id) = 4 AND stock_id GLOB '[0-9][0-9][0-9][0-9]'
                )
            """
            self.dashboard.div_ready = db.execute(text(q_div)).scalar() or 0

            q_pri = """
                SELECT COUNT(DISTINCT stock_id) FROM (
                    SELECT stock_id, COUNT(*) as c FROM stock_prices_daily GROUP BY stock_id HAVING c >= 250
                ) WHERE stock_id IN (
                    SELECT stock_id FROM stocks WHERE market_type = 'twse' AND length(stock_id) = 4 AND stock_id GLOB '[0-9][0-9][0-9][0-9]'
                )
            """
            self.dashboard.price_ready = db.execute(text(q_pri)).scalar() or 0

            q_chi = """
                SELECT COUNT(DISTINCT stock_id) FROM (
                    SELECT stock_id, COUNT(*) as c FROM chips_daily GROUP BY stock_id HAVING c >= 60
                ) WHERE stock_id IN (
                    SELECT stock_id FROM stocks WHERE market_type = 'twse' AND length(stock_id) = 4 AND stock_id GLOB '[0-9][0-9][0-9][0-9]'
                )
            """
            self.dashboard.chips_ready = db.execute(text(q_chi)).scalar() or 0
        except Exception as e:
            self.dashboard.add_log(f"統計資料庫現況失敗: {e}")

    async def update_api_quota(self) -> Dict[str, Any]:
        """Fetch current FinMind token usage directly."""
        try:
            usage_str = await token_manager.fetch_usages()
            self.dashboard.api_status_str = usage_str
            
            total_used = 0
            total_limit = 0
            for t in token_manager.tokens:
                total_used += t["user_count"]
                total_limit += t["limit"]

            self.dashboard.api_used = total_used
            self.dashboard.api_limit = total_limit
            self.dashboard.api_remaining = max(0, total_limit - total_used)
            
            active_available = [
                t for t in token_manager.tokens 
                if (t["limit"] - t["user_count"]) > token_manager.reserved_for_web
            ]
            has_capacity = len(active_available) > 0
            
            return {
                "used": total_used,
                "limit": total_limit,
                "remaining": self.dashboard.api_remaining,
                "has_capacity": has_capacity
            }
        except Exception as e:
            self.dashboard.add_log(f"更新 API 額度失敗: {e}")
            return {"used": self.dashboard.api_used, "limit": 1200, "remaining": 100, "has_capacity": True}

    def need_finance(self, db: Session, stock_id: str) -> bool:
        if self.mode not in ("all", "finance"): return False
        if self.force: return True
        count = db.query(models.FinancialStatement).filter_by(stock_id=stock_id).count()
        return count < 8

    def need_dividend(self, db: Session, stock_id: str) -> bool:
        if self.mode not in ("all", "dividend"): return False
        if self.force: return True
        count = db.query(models.Dividend).filter_by(stock_id=stock_id).count()
        return count < 3

    def need_price(self, db: Session, stock_id: str) -> bool:
        if self.mode not in ("all", "price"): return False
        if self.force: return True
        count = db.query(models.StockPriceDaily).filter_by(stock_id=stock_id).count()
        return count < 250

    def need_chips(self, db: Session, stock_id: str) -> bool:
        if self.mode not in ("all", "chips"): return False
        if self.force: return True
        count = db.query(models.ChipsDaily).filter_by(stock_id=stock_id).count()
        return count < 60

    async def sync_stock_finance(self, db: Session, stock_id: str) -> bool:
        """Sync Income Statement, Balance Sheet, Cash Flow (10 years)."""
        self.dashboard.current_step = "[1/4] 抓取季報財報三表 (10年)..."
        self.dashboard.render()
        _, inc = await get_income_statement_history(db, stock_id, limit=40, force_sync=True, for_background_sync=True)
        _, bal = await get_balance_sheet_history(db, stock_id, limit=40, force_sync=True, for_background_sync=True)
        _, cf = await get_cash_flow_history(db, stock_id, limit=40, force_sync=True, for_background_sync=True)
        
        now_ts = int(time.time())
        meta = db.query(models.SyncMetadata).filter_by(stock_id=stock_id, data_type="finance").first()
        if not meta:
            meta = models.SyncMetadata(stock_id=stock_id, data_type="finance")
            db.add(meta)
        meta.last_updated = now_ts
        meta.last_data_date = datetime.now().strftime("%Y-%m")
        db.commit()
        return len(inc) > 0 or len(bal) > 0

    async def sync_stock_dividend(self, db: Session, stock_id: str) -> int:
        """Sync 10 years of historical dividend policy via FinMind."""
        self.dashboard.current_step = "[2/4] 抓取歷史股利政策 (10年)..."
        self.dashboard.render()
        client = FinMindClient(for_background_sync=True)
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=365 * 10)).strftime("%Y-%m-%d")
        
        try:
            data_list = await client.fetch_dividend(stock_id, start_date, end_date)
        finally:
            await client.close()
            
        added = 0
        if data_list:
            for d in data_list:
                y_val = d.get('year') or (d.get('date', '')[:4] if d.get('date') else None)
                if not y_val: continue
                try:
                    year_int = parse_taiwan_year(str(y_val))
                except Exception:
                    continue
                date_val = d.get('date') or f"{year_int}-01-01"
                existing = db.query(models.Dividend).filter_by(stock_id=stock_id, date=date_val, year=year_int).first()
                if not existing:
                    cash = float(d.get('CashEarningsDistribution', 0) or 0) + float(d.get('CashStatutorySurplus', 0) or 0)
                    stock = float(d.get('StockEarningsDistribution', 0) or 0) + float(d.get('StockStatutorySurplus', 0) or 0)
                    item = models.Dividend(
                        stock_id=stock_id, date=date_val, year=year_int, cash=cash, stock=stock, total=cash + stock
                    )
                    db.add(item)
                    added += 1
            db.commit()

        # Update metadata
        meta = db.query(models.SyncMetadata).filter_by(stock_id=stock_id, data_type="dividends").first()
        if not meta:
            meta = models.SyncMetadata(stock_id=stock_id, data_type="dividends")
            db.add(meta)
        meta.last_updated = int(time.time())
        db.commit()
        return added

    async def sync_stock_price_yfinance(self, db: Session, stock_id: str) -> int:
        """
        Sync 5 years of daily OHLCV prices.
        Priority: yfinance (FREE, NO FinMind token consumption, ultra-fast!).
        Fallback: FinMind fetch_price.
        """
        self.dashboard.current_step = "[3/4] 抓取5年歷史股價 (yfinance 免額度優先)..."
        self.dashboard.render()

        added = 0
        # 1. 優先使用 yfinance 抓取 5 年日 K 線 (約 1250 筆)
        try:
            import yfinance as yf
            for suffix in [".TW", ".TWO"]:
                ticker_sym = f"{stock_id}{suffix}"
                df = await asyncio.to_thread(lambda: yf.Ticker(ticker_sym).history(period="5y"))
                if df is not None and not df.empty:
                    for idx, row in df.iterrows():
                        date_str = idx.strftime("%Y-%m-%d")
                        existing = db.query(models.StockPriceDaily).filter_by(stock_id=stock_id, date=date_str).first()
                        if not existing:
                            item = models.StockPriceDaily(
                                stock_id=stock_id,
                                date=date_str,
                                open=float(row['Open']),
                                high=float(row['High']),
                                low=float(row['Low']),
                                close=float(row['Close']),
                                volume=int(row['Volume'])
                            )
                            db.add(item)
                            added += 1
                    db.commit()
                    break
        except Exception as yf_err:
            pass

        # 2. 若 yfinance 無法取得且 FinMind 額度充足，回退 FinMind 補齊
        if added == 0:
            active_tokens = [
                t for t in token_manager.tokens 
                if (t["limit"] - t["user_count"]) > token_manager.reserved_for_web and t["exhausted_until"] <= time.time()
            ]
            if active_tokens:
                client = FinMindClient(for_background_sync=True)
                end_date = datetime.now().strftime("%Y-%m-%d")
                start_date = (datetime.now() - timedelta(days=365 * 5)).strftime("%Y-%m-%d")
                try:
                    data_list = await client.fetch_price(stock_id, start_date, end_date)
                    if data_list:
                        for d in data_list:
                            existing = db.query(models.StockPriceDaily).filter_by(stock_id=stock_id, date=d['date']).first()
                            if not existing:
                                item = models.StockPriceDaily(
                                    stock_id=stock_id,
                                    date=d['date'],
                                    open=d['open'],
                                    high=d['max'],
                                    low=d['min'],
                                    close=d['close'],
                                    volume=d['Trading_Volume']
                                )
                                db.add(item)
                                added += 1
                        db.commit()
                finally:
                    await client.close()

        # Update metadata
        meta = db.query(models.SyncMetadata).filter_by(stock_id=stock_id, data_type="price").first()
        if not meta:
            meta = models.SyncMetadata(stock_id=stock_id, data_type="price")
            db.add(meta)
        meta.last_updated = int(time.time())
        meta.last_data_date = datetime.now().strftime("%Y-%m-%d")
        db.commit()
        return added

    async def sync_stock_chips(self, db: Session, stock_id: str) -> int:
        """Sync 1~2 years of Institutional Investor Buy/Sell records via FinMind."""
        self.dashboard.current_step = "[4/4] 抓取三大法人籌碼買賣超 (1年)..."
        self.dashboard.render()

        client = FinMindClient(for_background_sync=True)
        end_date = datetime.now().strftime("%Y-%m-%d")
        # 抓取 365 天法人籌碼
        start_date = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
        try:
            data_list = await client.fetch_chips(stock_id, start_date, end_date)
        finally:
            await client.close()

        added = 0
        if data_list:
            grouped_by_date = {}
            for d in data_list:
                dt = d['date']
                if dt not in grouped_by_date:
                    grouped_by_date[dt] = {'foreign': 0, 'trust': 0, 'dealer': 0}
                net = d.get('buy', 0) - d.get('sell', 0)
                name = d.get('name', '')
                if name == 'Foreign_Investor': grouped_by_date[dt]['foreign'] += net
                elif name == 'Investment_Trust': grouped_by_date[dt]['trust'] += net
                elif name in ['Dealer_Self', 'Dealer_Hedging', 'Dealer']: grouped_by_date[dt]['dealer'] += net

            for dt, v in grouped_by_date.items():
                existing = db.query(models.ChipsDaily).filter_by(stock_id=stock_id, date=dt).first()
                if not existing:
                    item = models.ChipsDaily(
                        stock_id=stock_id, date=dt, foreign_net=v['foreign'], trust_net=v['trust'], dealer_net=v['dealer']
                    )
                    db.add(item)
                    added += 1
            db.commit()

        # Update metadata
        meta = db.query(models.SyncMetadata).filter_by(stock_id=stock_id, data_type="chips").first()
        if not meta:
            meta = models.SyncMetadata(stock_id=stock_id, data_type="chips")
            db.add(meta)
        meta.last_updated = int(time.time())
        db.commit()
        return added

    async def run_cooldown(self):
        """Enter cooldown sleep mode until FinMind resets at the top of the hour."""
        self.dashboard.is_cooldown = True
        self.dashboard.status = "COOLDOWN"
        
        now = datetime.now()
        next_hour = (now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1))
        target_resume_time = next_hour + timedelta(seconds=45)
        
        wait_seconds = int((target_resume_time - now).total_seconds())
        if wait_seconds < 60:
            wait_seconds += 3600
            target_resume_time += timedelta(hours=1)
            
        self.dashboard.cooldown_total_sec = wait_seconds
        self.dashboard.cooldown_remaining_sec = wait_seconds
        self.dashboard.cooldown_resume_time_str = target_resume_time.strftime("%H:%M:%S")
        
        self.dashboard.add_log(f"FinMind API 額度吃緊 ({self.dashboard.api_used}/{self.dashboard.api_limit})，進入冷卻模式")
        self.dashboard.add_log(f"預計於 {self.dashboard.cooldown_resume_time_str} 重置並自動恢復 (倒數 {wait_seconds // 60} 分鐘)")
        
        poll_interval = 0
        while self.is_running and self.dashboard.cooldown_remaining_sec > 0:
            self.dashboard.render()
            await asyncio.sleep(1)
            self.dashboard.cooldown_remaining_sec -= 1
            poll_interval += 1
            
            if poll_interval >= 60:
                poll_interval = 0
                q = await self.update_api_quota()
                if q.get("has_capacity", False):
                    self.dashboard.add_log(f"偵測到 API 已提早獲得可用額度，恢復同步！")
                    break

        await self.update_api_quota()
        self.dashboard.is_cooldown = False
        self.dashboard.status = "RUNNING"
        self.dashboard.add_log("冷卻結束，自動恢復歷史數據同步！")

    async def run(self):
        """Main loop for the daemon."""
        if not self.dashboard.plain_mode:
            sys.stdout.write(f"{C_ALT_SCREEN_ON}{C_CLEAR_SCREEN}{C_HOME}{C_CURSOR_HIDE}")
            sys.stdout.flush()
        
        db = SessionLocal()
        try:
            self.dashboard.status = "CHECKING"
            self.dashboard.add_log("正在分析目前資料庫完善現況...")
            self.dashboard.render()
            
            stocks = self.get_twse_operating_stocks(db)
            if self.limit:
                stocks = stocks[:self.limit]
                
            self.dashboard.total_stocks = len(stocks)
            self.init_database_metrics(db)
            self.dashboard.add_log(f"載入 {len(stocks)} 檔上市普通股 (依市值排序)")
            self.dashboard.add_log(f"現況: 財報已完成 {self.dashboard.fin_ready} 檔 | 股價 {self.dashboard.price_ready} 檔 | 籌碼 {self.dashboard.chips_ready} 檔")
            
            await self.update_api_quota()
            self.dashboard.render()
            
            self.dashboard.status = "RUNNING"
            for stock in stocks:
                if not self.is_running:
                    break
                    
                stock_id = stock["stock_id"]
                name = stock["name"]
                self.dashboard.current_stock_id = stock_id
                self.dashboard.current_stock_name = name
                self.dashboard.current_stock_industry = stock["industry"]
                self.dashboard.current_market_cap = stock["market_cap"]
                self.dashboard.current_market_cap_rank = stock["rank"]
                
                # 判斷這檔股票是否需要執行任何同步
                need_f = self.need_finance(db, stock_id)
                need_d = self.need_dividend(db, stock_id)
                need_p = self.need_price(db, stock_id)
                need_c = self.need_chips(db, stock_id)

                if not (need_f or need_d or need_p or need_c):
                    self.dashboard.completed_stocks += 1
                    self.dashboard.skipped_stocks += 1
                    self.dashboard.current_step = "各維度數據已完善，直接略過"
                    self.dashboard.render()
                    await asyncio.sleep(0.01)
                    continue

                # 若需要消耗 FinMind API（財報、股利、籌碼），檢查額度
                if need_f or need_d or need_c:
                    active_tokens = [
                        t for t in token_manager.tokens 
                        if (t["limit"] - t["user_count"]) > token_manager.reserved_for_web and t["exhausted_until"] <= time.time()
                    ]
                    if not active_tokens:
                        # 如果需要股價，先藉由 yfinance 抓取（免額度）
                        if need_p:
                            p_cnt = await self.sync_stock_price_yfinance(db, stock_id)
                            if p_cnt > 0:
                                self.dashboard.price_ready += 1
                                self.dashboard.add_log(f"[{stock_id} {name}] yfinance 成功補齊 5 年股價 ({p_cnt} 筆K線)")
                            need_p = False

                        self.dashboard.add_log(f"FinMind 額度達保留門檻，進入冷卻模式")
                        await self.run_cooldown()
                        if not self.is_running:
                            break

                synced_actions = []

                # 1. 季報財報
                if need_f:
                    try:
                        ok = await self.sync_stock_finance(db, stock_id)
                        if ok:
                            self.dashboard.fin_ready += 1
                            synced_actions.append("財報10年")
                    except Exception as e:
                        self.dashboard.add_log(f"[{stock_id}] 財報同步失敗: {e}")

                # 2. 歷史股利
                if need_d:
                    try:
                        d_cnt = await self.sync_stock_dividend(db, stock_id)
                        if d_cnt > 0 or not self.need_dividend(db, stock_id):
                            self.dashboard.div_ready += 1
                            synced_actions.append(f"股利{d_cnt}筆")
                    except Exception as e:
                        self.dashboard.add_log(f"[{stock_id}] 股利同步失敗: {e}")

                # 3. 歷史股價 (yfinance 免額度優先)
                if need_p:
                    try:
                        p_cnt = await self.sync_stock_price_yfinance(db, stock_id)
                        if p_cnt > 0 or not self.need_price(db, stock_id):
                            self.dashboard.price_ready += 1
                            synced_actions.append(f"股價{p_cnt}筆")
                    except Exception as e:
                        self.dashboard.add_log(f"[{stock_id}] 股價同步失敗: {e}")

                # 4. 三大法人籌碼
                if need_c:
                    try:
                        c_cnt = await self.sync_stock_chips(db, stock_id)
                        if c_cnt > 0 or not self.need_chips(db, stock_id):
                            self.dashboard.chips_ready += 1
                            synced_actions.append(f"籌碼{c_cnt}筆")
                    except Exception as e:
                        self.dashboard.add_log(f"[{stock_id}] 籌碼同步失敗: {e}")

                self.dashboard.completed_stocks += 1
                if synced_actions:
                    self.dashboard.add_log(f"[{stock_id} {name}] 完善成功: {', '.join(synced_actions)}")
                
                # 每處理 3 檔更新一次 API 額度狀態
                if self.dashboard.completed_stocks % 3 == 0:
                    await self.update_api_quota()

                self.dashboard.render()
                
                if self.stock_interval > 0:
                    await asyncio.sleep(self.stock_interval)

            self.dashboard.status = "COMPLETED"
            self.dashboard.current_step = "全部股票處理完畢！"
            self.dashboard.add_log("🎉 全體 TWSE 上市公司歷史數據補齊作業完成！")
            self.dashboard.render()

        finally:
            db.close()
            if not self.dashboard.plain_mode:
                sys.stdout.write(f"{C_CURSOR_SHOW}{C_ALT_SCREEN_OFF}")
            else:
                sys.stdout.write(C_CURSOR_SHOW)
            sys.stdout.flush()


def main():
    parser = argparse.ArgumentParser(description="台股上市公司歷史數據全自動補齊 Daemon")
    parser.add_argument("--mode", type=str, default="all", choices=["all", "price", "dividend", "chips", "finance"],
                        help="同步模式: all(預設補齊全部缺漏), price(僅5年股價), dividend(僅股利), chips(僅籌碼), finance(僅財報)")
    parser.add_argument("--limit", type=int, default=None, help="限制同步檔數 (測試用)")
    parser.add_argument("--threshold", type=int, default=550, help="觸發冷卻的 API 上限 (預設 550/600)")
    parser.add_argument("--interval", type=float, default=0.3, help="每檔抓取間隔秒數 (預設 0.3s)")
    parser.add_argument("--force", action="store_true", help="強制重新抓取已存在的股票")
    parser.add_argument("--plain", action="store_true", help="純文字日誌模式 (適合背景日誌輸出)")
    args = parser.parse_args()

    daemon = FinancialSyncDaemon(
        cooldown_threshold=args.threshold,
        stock_interval=args.interval,
        limit=args.limit,
        force=args.force,
        plain=args.plain,
        mode=args.mode
    )
    
    asyncio.run(daemon.run())

if __name__ == "__main__":
    main()
