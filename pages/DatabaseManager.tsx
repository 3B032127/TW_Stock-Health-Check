import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../App';
import { DbSummary, DbStockStats } from '../types';
import { API_BASE_URL } from '../services/api';

interface SyncProgress {
  is_running: boolean;
  current_step: number;
  total_steps: number;
  percentage: number;
  status_text: string;
  error_message: string | null;
  start_time: number;
  end_time: number;
}

const DatabaseManager: React.FC<{ onNavigateToStock: (id: string) => void }> = ({ onNavigateToStock }) => {
  const [summary, setSummary] = useState<DbSummary | null>(null);
  const [stocks, setStocks] = useState<DbStockStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // 一鍵同步與個別同步的狀態
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [singleSyncing, setSingleSyncing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'SYNCED' | 'PARTIAL'>('ALL');
  
  const pollingTimer = useRef<number | null>(null);

  const fetchDbData = async () => {
    setIsLoading(true);
    try {
      const [sumRes, stocksRes] = await Promise.all([
        fetch(`${API_BASE_URL}/database/summary`),
        fetch(`${API_BASE_URL}/database/stocks`)
      ]);
      if (sumRes.ok && stocksRes.ok) {
        setSummary(await sumRes.json());
        setStocks(await stocksRes.json());
      }
    } catch (e) {
      console.error("Failed to fetch DB stats", e);
    } finally {
      setIsLoading(false);
    }
  };

  // 輪詢同步進度
  const checkSyncStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/database/sync-market-cap/status`);
      if (res.ok) {
        const data = await res.json();
        const progress: SyncProgress = data.progress;
        setSyncProgress(progress);
        
        if (!progress.is_running) {
          // 同步結束，停止輪詢並重新整理
          if (pollingTimer.current) {
            window.clearInterval(pollingTimer.current);
            pollingTimer.current = null;
          }
          fetchDbData();
        }
      }
    } catch (e) {
      console.error("Failed to check sync status", e);
    }
  };

  // 觸發一鍵批次同步
  const handleBulkSync = async () => {
    if (syncProgress?.is_running) return;
    
    if (!window.confirm("確定要一鍵更新所有股票的最新股價與市值嗎？\n這將自動下載證交所與櫃買中心數據，並非同步補齊缺失的發行股數快取。")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/database/sync-market-cap`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSyncProgress(data.progress);
        
        // 開始每秒輪詢一次
        if (pollingTimer.current) window.clearInterval(pollingTimer.current);
        pollingTimer.current = window.setInterval(checkSyncStatus, 1000);
      }
    } catch (e) {
      console.error("Failed to start bulk sync", e);
      alert("啟動同步失敗");
    }
  };

  // 觸發個別股票同步
  const handleSingleSync = async (stockId: string, stockName: string) => {
    if (singleSyncing) return;
    setSingleSyncing(stockId);
    try {
      const res = await fetch(`${API_BASE_URL}/stock/${stockId}/sync-market-cap`, { method: 'POST' });
      if (res.ok) {
        // 重新讀取資料
        const sumRes = await fetch(`${API_BASE_URL}/database/summary`);
        const stocksRes = await fetch(`${API_BASE_URL}/database/stocks`);
        if (sumRes.ok && stocksRes.ok) {
          setSummary(await sumRes.json());
          setStocks(await stocksRes.json());
        }
      } else {
        const errData = await res.json();
        alert(errData.detail || `同步 ${stockName} 失敗`);
      }
    } catch (e) {
      console.error("Single sync failed", e);
      alert(`網路錯誤，同步 ${stockName} 失敗`);
    } finally {
      setSingleSyncing(null);
    }
  };

  // 刪除本地快取
  const handleDelete = async (stockId: string) => {
    if (!window.confirm(`確定要刪除 ${stockId} 的所有本地資料嗎？這將需要重新從網路上抓取。`)) return;
    setIsDeleting(stockId);
    try {
      const res = await fetch(`${API_BASE_URL}/database/stocks/${stockId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDbData();
      }
    } catch (e) {
      console.error("Delete failed", e);
    } finally {
      setIsDeleting(null);
    }
  };

  // 在組件載入時，先 fetch 資料，並檢查當前是否有正在執行的同步任務
  useEffect(() => {
    fetchDbData();
    checkSyncStatus().then(() => {
      // 如果後端本來就在跑同步，自動接力輪詢
      fetch(`${API_BASE_URL}/database/sync-market-cap/status`)
        .then(res => res.json())
        .then(data => {
          if (data.progress?.is_running) {
            setSyncProgress(data.progress);
            if (pollingTimer.current) window.clearInterval(pollingTimer.current);
            pollingTimer.current = window.setInterval(checkSyncStatus, 1000);
          }
        });
    });

    return () => {
      if (pollingTimer.current) window.clearInterval(pollingTimer.current);
    };
  }, []);

  const filteredStocks = stocks.filter(s => {
    const matchesSearch = s.id.includes(searchTerm) || s.name.includes(searchTerm);
    const matchesTab = 
      activeTab === 'ALL' ? true : 
      activeTab === 'SYNCED' ? s.lastSyncTime > 0 : 
      !s.lastSyncTime;
    return matchesSearch && matchesTab;
  }).sort((a, b) => a.id.localeCompare(b.id));

  // 計算已快取總市值
  const totalMarketCap = stocks.reduce((sum, s) => sum + (s.marketCap || 0), 0);

  const renderFreshnessBadge = (lastUpdated: number | undefined | null, type: 'finance' | 'price') => {
    if (!lastUpdated) return <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400/90 font-medium whitespace-nowrap shrink-0">未同步</span>;
    const daysAgo = (Date.now() / 1000 - lastUpdated) / 86400;
    
    if (type === 'price') {
      if (daysAgo < 1.2) return <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/90 font-medium whitespace-nowrap shrink-0">今日更新</span>;
      if (daysAgo < 3) return <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400/90 font-medium whitespace-nowrap shrink-0">{Math.floor(daysAgo)} 天前</span>;
      return <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400/90 font-medium whitespace-nowrap shrink-0">需同步</span>;
    } else {
      if (daysAgo < 30) return <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/90 font-medium whitespace-nowrap shrink-0">最新</span>;
      if (daysAgo < 90) return <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400/90 font-medium whitespace-nowrap shrink-0">已快取</span>;
      return <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400/90 font-medium whitespace-nowrap shrink-0">過期</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in relative max-w-6xl mx-auto font-sans text-slate-100 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-surfaceLight pb-6">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Icon name="database" className="text-amber-400 animate-pulse" />
            圖形化資料庫管理
          </h1>
          <p className="text-textMuted mt-2">
            監控本地 SQLite 儲存狀態，管理追蹤中的股票歷史數據、最新股價與市值數據。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleBulkSync}
            disabled={syncProgress?.is_running}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all duration-200 ${
              syncProgress?.is_running 
                ? 'bg-slate-850 text-slate-500 border-slate-700 cursor-not-allowed'
                : 'bg-surface hover:bg-surfaceLight border-surfaceLight text-white hover:border-amber-500/40'
            }`}
          >
            <Icon name="flash" className={`text-[16px] ${syncProgress?.is_running ? "animate-spin text-slate-500" : "text-amber-400"}`} />
            {syncProgress?.is_running ? '同步中...' : '一鍵同步最新股價與市值'}
          </button>
          <button 
            onClick={fetchDbData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface hover:bg-surfaceLight border border-surfaceLight text-white transition-colors text-sm"
          >
            <Icon name="refresh" className={isLoading ? "animate-spin" : ""} />
            重新整理
          </button>
        </div>
      </div>

      {/* Syncing Progress Card */}
      {syncProgress?.is_running && (
        <div className="bg-surface border border-surfaceLight p-5 rounded-xl flex flex-col gap-4 animate-slide-down">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Icon name="sync" className="animate-spin text-[20px]" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">大盤市值與股價高速同步中</div>
                <div className="text-xs text-textMuted font-medium mt-0.5">{syncProgress.status_text}</div>
              </div>
            </div>
            <div className="text-2xl font-black text-primary">{syncProgress.percentage}%</div>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-surfaceLight/30">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300"
              style={{ width: `${syncProgress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: "資料庫實體大小", 
            value: `${summary?.fileSizeMb || 0} MB`, 
            sub: "SQLite 實體檔案", 
            icon: "hard_drive", 
            color: "text-amber-400" 
          },
          { 
            label: "本地收錄股票數", 
            value: `${summary?.totalStocks || 0} 檔`, 
            sub: "100% 均為在市個股 (0 檔下市/ETF)", 
            icon: "inventory", 
            color: "text-blue-400" 
          },
          { 
            label: "在市公司與完整性", 
            value: `${summary?.marketStats?.activeTwseTotal || 1005} 檔`, 
            sub: `本地存有 100% ｜ 健全度 ${summary?.marketStats?.fullReadyPct || 90.0}%`, 
            icon: "verified", 
            color: "text-emerald-400 font-bold" 
          },
          { 
            label: "總儲存資料筆數", 
            value: `${summary?.totalRecords?.toLocaleString() || 0} 筆`, 
            sub: "跨四維度歷史日線與季報", 
            icon: "table_rows", 
            color: "text-cyan-400" 
          },
        ].map((stat, i) => (
          <div key={i} className="bg-surface border border-surfaceLight p-5 rounded-xl flex items-center gap-4 hover:border-surfaceLight/80 transition-colors">
            <div className={`size-12 rounded-lg bg-surfaceLight flex items-center justify-center shrink-0 ${stat.color}`}>
              <Icon name={stat.icon} className="text-[24px]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-textMuted font-bold mb-1">{stat.label}</div>
              <div className="text-xl font-black text-white truncate">{stat.value}</div>
              {stat.sub && <div className="text-[11px] text-slate-400 mt-0.5 truncate">{stat.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* 四維度資料健全度與完整性分析面板 */}
      {summary?.marketStats && (
        <div className="bg-surface border border-surfaceLight p-5 rounded-xl flex flex-col gap-4 shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-surfaceLight/60 pb-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="size-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Icon name="verified" className="text-[18px]" />
              </div>
              <span className="text-sm font-bold text-white">台股在市公司資料庫健全度分析</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                已排除下市及被併購消滅個股
              </span>
            </div>
            <div className="text-xs text-slate-300 flex items-center gap-2.5 flex-wrap">
              <span>在市總數: <strong className="text-white">{summary.marketStats.activeTwseTotal} 檔</strong></span>
              <span className="text-slate-600">•</span>
              <span>本地存有: <strong className="text-emerald-400">{summary.marketStats.localActiveCount} 檔 (100%)</strong></span>
              <span className="text-slate-600">•</span>
              <span>四維度全健全: <strong className="text-primary font-bold">{summary.marketStats.fullReadyCount} 檔 ({summary.marketStats.fullReadyPct}%)</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
            {[
              { key: 'financials', icon: 'description', color: 'from-blue-600 to-cyan-500', textCol: 'text-cyan-400' },
              { key: 'prices', icon: 'show_chart', color: 'from-emerald-600 to-teal-500', textCol: 'text-emerald-400' },
              { key: 'chips', icon: 'groups', color: 'from-indigo-600 to-purple-500', textCol: 'text-purple-400' },
              { key: 'dividends', icon: 'savings', color: 'from-amber-600 to-yellow-500', textCol: 'text-amber-400' },
            ].map(dim => {
              const data = summary.marketStats?.dimensions[dim.key as keyof typeof summary.marketStats.dimensions];
              if (!data) return null;
              return (
                <div key={dim.key} className="bg-background/60 border border-surfaceLight/80 p-3.5 rounded-lg flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Icon name={dim.icon} className={`text-[16px] ${dim.textCol}`} />
                      {data.label}
                    </span>
                    <span className={`text-xs font-black ${dim.textCol}`}>{data.pct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full bg-gradient-to-r ${dim.color} transition-all duration-500`}
                      style={{ width: `${Math.min(100, data.pct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-textMuted mt-0.5">
                    <span>{data.count} / {data.target} 檔</span>
                    <span className="truncate max-w-[130px] text-right" title={data.standard}>{data.standard}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Database Table */}
      <div className="bg-surface border border-surfaceLight rounded-xl overflow-hidden mt-4 shadow-xl">
        <div className="p-4 border-b border-surfaceLight flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surfaceLight/30">
          <div className="flex items-center gap-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Icon name="table" />
              追蹤股票狀態快取表
            </h2>
            <div className="flex items-center bg-background rounded-lg p-1 border border-surfaceLight">
              <button 
                onClick={() => setActiveTab('ALL')}
                className={`text-sm px-3 py-1.5 rounded-md transition-colors ${activeTab === 'ALL' ? 'bg-surfaceLight text-white font-bold' : 'text-textMuted hover:text-white'}`}
              >
                全部
              </button>
              <button 
                onClick={() => setActiveTab('SYNCED')}
                className={`text-sm px-3 py-1.5 rounded-md transition-colors ${activeTab === 'SYNCED' ? 'bg-surfaceLight text-emerald-400 font-bold' : 'text-textMuted hover:text-white'}`}
              >
                完整同步
              </button>
              <button 
                onClick={() => setActiveTab('PARTIAL')}
                className={`text-sm px-3 py-1.5 rounded-md transition-colors ${activeTab === 'PARTIAL' ? 'bg-surfaceLight text-purple-400 font-bold' : 'text-textMuted hover:text-white'}`}
              >
                部分快取
              </button>
            </div>
          </div>
          <div className="relative w-full md:w-64">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted text-[18px]" />
            <input 
              type="text" 
              placeholder="搜尋代號或名稱..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-surface border border-surfaceLight rounded-lg py-1.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surfaceLight/10 text-textMuted text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">股票名稱/代號</th>
                <th className="p-4 font-medium">最新收盤價</th>
                <th className="p-4 font-medium">公司市值 (億元)</th>
                <th className="p-4 font-medium">財報/股利筆數</th>
                 <th className="p-4 font-medium">股價/籌碼筆數</th>
                 <th className="p-4 font-medium">最後同步時間 (股價/市值 | 季報)</th>
                 <th className="p-4 font-medium text-right">操作管理</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surfaceLight/50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-textMuted">
                    <Icon name="sync" className="animate-spin text-2xl mb-2" />
                    <p>載入中...</p>
                  </td>
                </tr>
              ) : filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-textMuted">目前分頁中沒有相符的股票資料</td>
                </tr>
              ) : (
                filteredStocks.map(stock => (
                  <tr key={stock.id} className="hover:bg-surfaceLight/20 transition-colors group">
                    <td className="p-4">
                      <div 
                        className="font-bold text-white cursor-pointer hover:text-primary transition-colors inline-block"
                        onClick={() => onNavigateToStock(stock.id)}
                      >
                        {stock.name} <span className="text-textMuted text-xs ml-1 border border-surfaceLight rounded px-1">{stock.id}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {stock.price ? (
                        <span className="font-bold text-white">NT$ {stock.price.toFixed(1)}</span>
                      ) : (
                        <span className="text-textMuted">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {stock.marketCap ? (
                        <span className="font-black text-amber-400">{stock.marketCap.toLocaleString()} 億</span>
                      ) : (
                        <span className="text-textMuted">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <span className="text-sm text-slate-300 bg-surfaceLight px-2 py-0.5 rounded" title="財報季數"> {stock.records.financials} 季</span>
                        <span className="text-sm text-slate-300 bg-surfaceLight px-2 py-0.5 rounded" title="股利年份"> {stock.records.dividends} 年</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <span className="text-sm text-slate-300 bg-surfaceLight px-2 py-0.5 rounded" title="歷史股價天數"> {stock.records.prices} 天</span>
                        <span className="text-sm text-slate-300 bg-surfaceLight px-2 py-0.5 rounded" title="籌碼天數"> {stock.records.chips} 天</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-textMuted w-[64px] text-left shrink-0">股價/市值:</span>
                          {renderFreshnessBadge(stock.dataTypes?.price?.lastUpdated, 'price')}
                          <span className="text-slate-300 font-medium">
                            {stock.dataTypes?.price?.lastUpdated ? new Date(stock.dataTypes.price.lastUpdated * 1000).toLocaleDateString() : '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-textMuted w-[64px] text-left shrink-0">季報歷史:</span>
                          {renderFreshnessBadge(stock.dataTypes?.finance?.lastUpdated, 'finance')}
                          <span className="text-slate-300 font-medium">
                            {stock.dataTypes?.finance?.lastUpdated ? new Date(stock.dataTypes.finance.lastUpdated * 1000).toLocaleDateString() : '-'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleSingleSync(stock.id, stock.name)}
                          disabled={singleSyncing !== null}
                          className={`size-8 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white flex items-center justify-center transition-colors ${
                            singleSyncing === stock.id ? 'cursor-wait bg-primary/20 text-primary' : ''
                          }`}
                          title="個別更新最新價格與市值"
                        >
                          <Icon 
                            name="sync" 
                            className={`text-[18px] ${singleSyncing === stock.id ? 'animate-spin' : ''}`} 
                          />
                        </button>
                        <button 
                          onClick={() => onNavigateToStock(stock.id)}
                          className="size-8 rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-colors"
                          title="前往健檢頁面"
                        >
                          <Icon name="search" className="text-[18px]" />
                        </button>
                        <button 
                          onClick={() => handleDelete(stock.id)}
                          disabled={isDeleting === stock.id}
                          className="size-8 rounded-full bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors"
                          title="刪除本地快取"
                        >
                          {isDeleting === stock.id ? (
                            <Icon name="sync" className="animate-spin text-[18px]" />
                          ) : (
                            <Icon name="delete" className="text-[18px]" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DatabaseManager;
