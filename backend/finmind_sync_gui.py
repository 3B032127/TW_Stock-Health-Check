import sys
import time
import datetime
import asyncio
from collections import deque
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QProgressBar, QPushButton, QTextEdit, QGroupBox
)
from PySide6.QtCore import QThread, Signal, Qt, QTimer
from sqlalchemy.orm import Session
import pandas as pd

# 匯入後端既有模組
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.database import SessionLocal
from backend.services.sync import execute_explicit_sync
from backend.services.finmind import FinMindClient

class FinMindWorker(QThread):
    progress_update = Signal(int, int) # current, total
    status_update = Signal(str)
    log_update = Signal(str)
    rate_limit_update = Signal(int) # requests used
    stock_detail_update = Signal(str) # stock_id
    countdown_update = Signal(int) # seconds remaining until reset
    usage_update = Signal(str)

    def __init__(self):
        super().__init__()
        self.is_running = False
        self.is_paused = False

    def wait_if_paused(self):
        while self.is_paused and self.is_running:
            time.sleep(0.5)

    def enforce_rate_limit(self):
        # We now rely on token_manager from finmind for actual switching and waiting.
        # This function just polls the state to update the UI.
        from backend.services.finmind import token_manager
        
        now = time.time()
        tokens_status = []
        all_exhausted = True
        min_wait = 999999
        
        for t in token_manager.tokens:
            if t["exhausted_until"] > now:
                wait_time = int(t["exhausted_until"] - now)
                m = wait_time // 60
                s = wait_time % 60
                tokens_status.append(f"{t['name']}: 倒數 {m:02d}:{s:02d}")
                min_wait = min(min_wait, wait_time)
            else:
                tokens_status.append(f"{t['name']}: 正常運行")
                all_exhausted = False
                
        # Update the rate limit label to show token status
        status_text = " | ".join(tokens_status)
        self.rate_limit_update.emit(0) # Not used same way anymore
        self.status_update.emit(status_text)
        
        if all_exhausted:
            self.countdown_update.emit(min_wait)
        else:
            self.countdown_update.emit(0)

    def run(self):
        self.is_running = True
        self.status_update.emit("初始化中...")
        
        try:
            asyncio.run(self.async_run())
        except Exception as e:
            self.log_update.emit(f"執行發生錯誤: {str(e)}")
        finally:
            self.is_running = False
            self.status_update.emit("已停止")

    async def usage_poller(self):
        from backend.services.finmind import token_manager
        while self.is_running:
            try:
                usage_str = await token_manager.fetch_usages()
                self.usage_update.emit(usage_str)
            except Exception as e:
                self.log_update.emit(f"獲取使用率錯誤: {e}")
            
            # Poll every 60 seconds
            for _ in range(60):
                if not self.is_running:
                    break
                await asyncio.sleep(1)

    async def async_run(self):
        from backend import models
        from backend.database import engine
        # 確保所有資料表都已建立
        models.Base.metadata.create_all(bind=engine)
        
        db: Session = SessionLocal()
        client = FinMindClient()
        
        poller_task = asyncio.create_task(self.usage_poller())
        
        try:
            self.log_update.emit("取得台股清單...")
            # 這裡我們只抓取「上市 (TSE)」和「上櫃 (OTC)」的普通股
            stock_info = await client.fetch_stock_info()
            
            stocks = []
            if stock_info:
                stocks = [s['stock_id'] for s in stock_info if len(s['stock_id']) == 4 and s['stock_id'].isdigit()]
            
            if not stocks:
                self.log_update.emit("無法從 API 取得清單，嘗試從資料庫現有資料回退...")
                from backend.models import SyncMetadata
                db_stocks = db.query(SyncMetadata.stock_id).distinct().all()
                stocks = [s[0] for s in db_stocks]
                
            if not stocks:
                self.log_update.emit("錯誤：無法取得任何待處理的股票代碼，終止執行。")
                return
            stocks = list(dict.fromkeys(stocks)) # 去重
            total_stocks = len(stocks)
            self.log_update.emit(f"共過濾出 {total_stocks} 檔上市櫃普通股")

            # 掃描資料庫進度
            from backend.models import SyncMetadata
            self.log_update.emit("掃描資料庫現有同步進度...")
            # 計算在 SyncMetadata 中已經有記錄的 stock_id 數量
            synced_stocks = db.query(SyncMetadata.stock_id).distinct().all()
            synced_ids = set([s[0] for s in synced_stocks])
            already_done = len(synced_ids)
            self.log_update.emit(f"資料庫掃描完成：目前資料庫已有 {already_done} 檔股票數據")
            
            # 初始化進度計數器
            # 我們將進度定義為：(資料庫中已有的 + 本次程式執行新增加的)
            completed_count = already_done
            self.progress_update.emit(completed_count, total_stocks)
            
            for idx, stock_id in enumerate(stocks):
                if not self.is_running:
                    break
                
                # 如果該股票已經同步過，直接跳過，不重複發送請求
                if stock_id in synced_ids:
                    # 雖然跳過，但我們仍然可以更新日誌顯示正在跳過
                    # self.log_update.emit(f"跳過已同步股票: {stock_id}")
                    continue
                    
                self.wait_if_paused()
                self.enforce_rate_limit()
                
                # 同步前再次更新 UI 顯示目前處理的標的
                self.status_update.emit("執行中")
                self.log_update.emit(f"正在同步: {stock_id}")
                self.stock_detail_update.emit(str(stock_id))

                try:
                    # 執行現有的同步邏輯
                    await execute_explicit_sync(db, stock_id)
                    
                    # 只有同步成功後，我們才增加進度條的數值
                    completed_count += 1
                    self.progress_update.emit(completed_count, total_stocks)
                except Exception as stock_err:
                    self.log_update.emit(f"同步 {stock_id} 時發生錯誤: {str(stock_err)}")
                    await asyncio.sleep(1)
                
                await asyncio.sleep(0.5)

        except Exception as e:
            self.log_update.emit(f"抓取過程中發生異常: {str(e)}")
        finally:
            poller_task.cancel()
            await client.close()
            db.close()

    def stop(self):
        self.is_running = False
        self.is_paused = False

    def pause(self):
        self.is_paused = True
        self.status_update.emit("已暫停")

    def resume(self):
        self.is_paused = False
        self.status_update.emit("執行中")


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("台灣股市資料自動抓取與同步系統")
        self.resize(800, 600)

        self.worker = FinMindWorker()
        self.worker.progress_update.connect(self.update_progress)
        self.worker.status_update.connect(self.update_status)
        self.worker.log_update.connect(self.append_log)
        self.worker.stock_detail_update.connect(self.update_stock_detail)
        self.worker.countdown_update.connect(self.update_countdown)
        self.worker.usage_update.connect(self.update_usage)

        self.init_ui()

    def init_ui(self):
        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        layout = QVBoxLayout(main_widget)

        status_group = QGroupBox("API 狀態與金鑰資訊")
        status_layout = QHBoxLayout(status_group)
        self.lbl_status = QLabel("目前狀態: 尚未開始")
        self.lbl_usage = QLabel("額度使用率: 尚未取得")
        
        # Style the status to make the countdowns pop
        self.lbl_status.setStyleSheet("font-weight: bold;")
        
        status_layout.addWidget(self.lbl_status)
        status_layout.addWidget(self.lbl_usage)
        layout.addWidget(status_group)

        # 2. 總體進度區
        progress_group = QGroupBox("總體進度")
        progress_layout = QVBoxLayout(progress_group)
        self.lbl_progress_text = QLabel("進度: 0 / 0")
        self.progress_bar = QProgressBar()
        self.progress_bar.setValue(0)
        progress_layout.addWidget(self.lbl_progress_text)
        progress_layout.addWidget(self.progress_bar)
        layout.addWidget(progress_group)

        # 3. 當前執行細節
        detail_group = QGroupBox("當前執行細節")
        detail_layout = QVBoxLayout(detail_group)
        self.lbl_current_stock = QLabel("目前處理: 無")
        detail_layout.addWidget(self.lbl_current_stock)
        layout.addWidget(detail_group)

        # 4. 日誌輸出區
        log_group = QGroupBox("系統日誌")
        log_layout = QVBoxLayout(log_group)
        self.text_log = QTextEdit()
        self.text_log.setReadOnly(True)
        log_layout.addWidget(self.text_log)
        layout.addWidget(log_group)

        # 5. 控制按鈕區
        btn_layout = QHBoxLayout()
        self.btn_start = QPushButton("開始同步全台股 (增量)")
        self.btn_pause = QPushButton("暫停")
        self.btn_pause.setEnabled(False)
        self.btn_stop = QPushButton("停止")
        self.btn_stop.setEnabled(False)
        
        self.btn_start.clicked.connect(self.start_sync)
        self.btn_pause.clicked.connect(self.toggle_pause)
        self.btn_stop.clicked.connect(self.stop_sync)
        
        btn_layout.addWidget(self.btn_start)
        btn_layout.addWidget(self.btn_pause)
        btn_layout.addWidget(self.btn_stop)
        layout.addLayout(btn_layout)

        self.timer = QTimer(self)
        self.timer.timeout.connect(self.update_timer)
        self.timer.start(1000)

    def update_timer(self):
        if self.worker.is_running:
            self.worker.enforce_rate_limit()

    def start_sync(self):
        self.btn_start.setEnabled(False)
        self.btn_pause.setEnabled(True)
        self.btn_stop.setEnabled(True)
        self.text_log.clear()
        self.worker.start()

    def toggle_pause(self):
        if self.worker.is_paused:
            self.worker.resume()
            self.btn_pause.setText("暫停")
        else:
            self.worker.pause()
            self.btn_pause.setText("恢復")

    def stop_sync(self):
        self.worker.stop()
        self.btn_start.setEnabled(True)
        self.btn_pause.setEnabled(False)
        self.btn_stop.setEnabled(False)
        self.btn_pause.setText("暫停")

    def update_progress(self, current, total):
        self.progress_bar.setMaximum(total)
        self.progress_bar.setValue(current)
        self.lbl_progress_text.setText(f"進度: {current} / {total}")

    def update_status(self, status):
        self.lbl_status.setText(f"目前狀態: {status}")

    def update_stock_detail(self, stock_id):
        self.lbl_current_stock.setText(f"目前處理: {stock_id} (正在同步所有財報、股價與籌碼...)")

    def update_countdown(self, seconds):
        # We now display individual countdowns in update_status.
        # But if we need to show a global paused state, we can append to status or log.
        pass

    def update_usage(self, usage_str):
        self.lbl_usage.setText(f"額度使用率: {usage_str}")

    def append_log(self, msg):
        time_str = datetime.datetime.now().strftime("%H:%M:%S")
        self.text_log.append(f"[{time_str}] {msg}")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
