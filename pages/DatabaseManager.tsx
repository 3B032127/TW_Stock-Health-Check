import React, { useState, useEffect } from 'react';
import { Icon } from '../App';
import { DbSummary, DbStockStats } from '../types';
import { API_BASE_URL } from '../services/api';

const DatabaseManager: React.FC<{ onNavigateToStock: (id: string) => void }> = ({ onNavigateToStock }) => {
  const [summary, setSummary] = useState<DbSummary | null>(null);
  const [stocks, setStocks] = useState<DbStockStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'ALL' | 'SYNCED' | 'PARTIAL'>('ALL');

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

  useEffect(() => {
    fetchDbData();
  }, []);

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

  const filteredStocks = stocks.filter(s => {
    const matchesSearch = s.id.includes(searchTerm) || s.name.includes(searchTerm);
    const matchesTab = 
      activeTab === 'ALL' ? true : 
      activeTab === 'SYNCED' ? s.lastSyncTime > 0 : 
      !s.lastSyncTime;
    return matchesSearch && matchesTab;
  });

  const renderFreshnessBadge = (lastUpdated: number) => {
    if (!lastUpdated) return <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400">部分快取</span>;
    const daysAgo = (Date.now() / 1000 - lastUpdated) / 86400;
    if (daysAgo < 1) return <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">今日更新</span>;
    if (daysAgo < 7) return <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">{Math.floor(daysAgo)} 天前</span>;
    return <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">過期</span>;
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in relative max-w-6xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-surfaceLight pb-6">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Icon name="database" className="text-amber-400" />
            圖形化資料庫管理
          </h1>
          <p className="text-textMuted mt-2">
            監控本地 SQLite 儲存狀態，管理追蹤中的股票歷史數據與快取。
          </p>
        </div>
        <button 
          onClick={fetchDbData}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface hover:bg-surfaceLight border border-surfaceLight text-white transition-colors text-sm"
        >
          <Icon name="refresh" className={isLoading ? "animate-spin" : ""} />
          重新整理
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "資料庫實體大小", value: `${summary?.fileSizeMb || 0} MB`, icon: "hard_drive", color: "text-amber-400" },
          { label: "已快取股票數", value: summary?.totalStocks || 0, icon: "inventory", color: "text-blue-400" },
          { label: "總儲存資料筆數", value: summary?.totalRecords?.toLocaleString() || 0, icon: "table_rows", color: "text-emerald-400" },
          { label: "財報歷史筆數", value: summary?.tableCounts?.financials?.toLocaleString() || 0, icon: "receipt_long", color: "text-purple-400" },
        ].map((stat, i) => (
          <div key={i} className="bg-surface border border-surfaceLight p-5 rounded-xl flex items-center gap-4">
            <div className={`size-12 rounded-lg bg-surfaceLight flex items-center justify-center ${stat.color}`}>
              <Icon name={stat.icon} className="text-[24px]" />
            </div>
            <div>
              <div className="text-xs text-textMuted font-bold mb-1">{stat.label}</div>
              <div className="text-2xl font-black text-white">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Database Table */}
      <div className="bg-surface border border-surfaceLight rounded-xl overflow-hidden mt-4 shadow-xl">
        <div className="p-4 border-b border-surfaceLight flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surfaceLight/30">
          <div className="flex items-center gap-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Icon name="table" />
              快取資料表目錄
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
                <th className="p-4 font-medium">財報/股利筆數</th>
                <th className="p-4 font-medium">股價/籌碼筆數</th>
                <th className="p-4 font-medium">資料庫狀態</th>
                <th className="p-4 font-medium text-right">操作管理</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surfaceLight/50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-textMuted">
                    <Icon name="sync" className="animate-spin text-2xl mb-2" />
                    <p>載入中...</p>
                  </td>
                </tr>
              ) : filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-textMuted">目前分頁中沒有相符的股票資料</td>
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
                      <div className="flex items-center gap-2">
                        {renderFreshnessBadge(stock.lastSyncTime)}
                        <span className="text-xs text-textMuted">
                          {stock.lastSyncTime ? new Date(stock.lastSyncTime * 1000).toLocaleDateString() : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
