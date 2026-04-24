import React, { useState, useEffect } from 'react';
import { Icon } from '../App';
import { StockTab, FinancialSubTab } from '../types';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import { useFinancials } from '../hooks/useFinancials';
import { CompanyProfile } from '../components/stock-detail/CompanyProfile';
import { RealTimeQuote } from '../components/stock-detail/RealTimeQuote';
import { ChipsAnalysis } from '../components/stock-detail/ChipsAnalysis';
import { HealthCheckTab } from '../components/stock-detail/HealthCheckTab';
import { FinancialChart } from '../components/stock-detail/FinancialChart';
import { FinancialTable } from '../components/stock-detail/FinancialTable';
import { AIAnalysisCard } from '../components/AIAnalysisCard';
import SyncIndicator from '../components/SyncIndicator';
import { useStockSync } from '../hooks/useStockSync';
import { useDividends } from '../hooks/useDividends';
import { useRevenueMix } from '../hooks/useRevenueMix';
import { useValuationMetrics } from '../hooks/useValuationMetrics';
import { useHealthCheck } from '../hooks/useHealthCheck';
import { useCompanyNews } from '../hooks/useCompanyNews';
import { useOwnershipData } from '../hooks/useOwnershipData';
import { usePeerComparison } from '../hooks/usePeerComparison';

const StockDetail: React.FC<{ stockId: string, onNavigateHome?: () => void, onNavigateToStock?: (id: string) => void }> = ({ stockId = "2330", onNavigateHome, onNavigateToStock }) => {
  const [activeTab, setActiveTab] = useState<StockTab>(StockTab.PROFILE); // Default set to PROFILE
  const [activeSubTab, setActiveSubTab] = useState<FinancialSubTab>(FinancialSubTab.INCOME);
  const { data: profile, isLoading: isProfileLoading } = useCompanyProfile(stockId);
  const { data: financialsData, isLoading: isFinancialsLoading } = useFinancials(stockId);
  const { syncStatus, isSyncing, triggerSync } = useStockSync(stockId);
  const { isLoading: isDividendsLoading } = useDividends(stockId);
  const { isLoading: isRevenueMixLoading } = useRevenueMix(stockId);
  const { isLoading: isValuationLoading } = useValuationMetrics(stockId);
  const { isLoading: isHealthCheckLoading } = useHealthCheck(stockId);
  const { isLoading: isNewsLoading } = useCompanyNews(stockId);
  const { isLoading: isOwnershipLoading } = useOwnershipData(stockId);
  const { isLoading: isPeerLoading } = usePeerComparison(stockId);

  // Consider the page ready only when all critical components are loaded
  // IMPORTANT: For new stocks, we wait for the background sync to finish as well
  const isPageReady = !isProfileLoading && !isFinancialsLoading && !isDividendsLoading && !isRevenueMixLoading && 
                      !isValuationLoading && !isHealthCheckLoading && !isNewsLoading && !isOwnershipLoading && 
                      !isPeerLoading && (profile || !isSyncing);

  // Auto-sync for new stocks (if profile is null and we are not already syncing)
  useEffect(() => {
    if (isPageReady && !profile && !isSyncing && syncStatus?.is_stale) {
      console.log("Auto-triggering sync for new stock...");
      triggerSync();
    }
  }, [isPageReady, profile, isSyncing, syncStatus, triggerSync]);

  // Reset tabs when stockId changes (e.g., from searching a new stock)
  useEffect(() => {
    setActiveTab(StockTab.PROFILE);
    setActiveSubTab(FinancialSubTab.INCOME);
  }, [stockId]);

  if (!isPageReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-pulse">
        <div className="relative size-20">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin"></div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <h3 className="text-xl font-bold text-white tracking-widest">資料同步中</h3>
          <p className="text-textMuted text-sm">正在從資料庫與 Yahoo 抓取最新數據...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in relative">
      <SyncIndicator 
        isFetching={isSyncing} 
        isStale={syncStatus?.is_stale} 
        lastUpdated={syncStatus?.last_updated || undefined} 
        onSyncRequest={triggerSync} 
      />
      
      {/* Breadcrumb */}
      <nav className="flex flex-wrap text-sm font-medium text-textMuted">
        <ol className="flex items-center gap-2">
          <li className="cursor-pointer hover:text-primary transition-colors flex items-center gap-1" onClick={onNavigateHome}>
            <Icon name="home" className="text-[16px]" />
            首頁
          </li>
          <li><Icon name="chevron_right" className="text-xs" /></li>
          <li className="cursor-pointer hover:text-primary transition-colors" onClick={onNavigateHome}>台股市場</li>
          <li><Icon name="chevron_right" className="text-xs" /></li>
          <li className="text-white font-bold">{profile ? `${profile.name} (${profile.id})` : `股票代碼 (${stockId})`}</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              {profile ? `${profile.name} (${profile.id})` : stockId}
            </h1>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
              {profile ? profile.industry : '載入中'}
            </span>
          </div>
          <p className="text-textMuted text-sm md:text-base max-w-2xl">
            {profile ? profile.description : '公司簡介資料載入中...'}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 h-10 px-4 rounded-lg border border-surfaceLight bg-surface text-sm font-medium hover:bg-surfaceLight transition-colors text-white">
            <Icon name="star" className="text-[20px]" />
            <span>加入觀察清單</span>
          </button>
          <button className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-medium shadow-lg shadow-primary/25 hover:bg-primaryHover transition-colors">
            <Icon name="download" className="text-[20px]" />
            <span>下載完整報告</span>
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="mb-2 border-b border-surfaceLight overflow-x-auto">
        <nav className="flex space-x-8 min-w-max">
          {[
            { id: StockTab.PROFILE, label: '公司簡介' },
            { id: StockTab.QUOTE, label: '即時報價' },
            { id: StockTab.CHIPS, label: '籌碼分析' },
            { id: StockTab.HEALTH_CHECK, label: '財報健檢' },
            { id: StockTab.FINANCIALS, label: '財報數據' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-textMuted hover:text-white hover:border-slate-500'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Switch */}
      {activeTab === StockTab.PROFILE && <CompanyProfile stockId={stockId} />}
      {activeTab === StockTab.QUOTE && <RealTimeQuote />}
      {activeTab === StockTab.CHIPS && <ChipsAnalysis stockId={stockId} />}
      {activeTab === StockTab.HEALTH_CHECK && <HealthCheckTab stockId={stockId} />}

      {activeTab === StockTab.FINANCIALS && (
        <div className="flex flex-col gap-6">
          {/* Sub Navigation */}
          <div className="flex justify-between items-center w-full">
            <div className="flex gap-2 p-1 bg-surfaceLight rounded-lg w-fit">
              {[
                { id: FinancialSubTab.INCOME, label: '綜合損益表' },
                { id: FinancialSubTab.BALANCE, label: '資產負債表' },
                { id: FinancialSubTab.CASH_FLOW, label: '現金流量表' }
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setActiveSubTab(sub.id)}
                  className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeSubTab === sub.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-textMuted hover:text-white'
                    }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>

          <FinancialChart 
            subTab={activeSubTab} 
            chartData={
              activeSubTab === FinancialSubTab.INCOME ? financialsData?.income?.chartData || [] : 
              activeSubTab === FinancialSubTab.BALANCE ? financialsData?.balance?.chartData || [] : 
              financialsData?.cashFlow?.chartData || []
            } 
          />

          {activeSubTab === FinancialSubTab.INCOME && financialsData?.income && <FinancialTable headers={financialsData.income.tableData.headers} rows={financialsData.income.tableData.rows} />}
          {activeSubTab === FinancialSubTab.BALANCE && financialsData?.balance && <FinancialTable headers={financialsData.balance.tableData.headers} rows={financialsData.balance.tableData.rows} />}
          {activeSubTab === FinancialSubTab.CASH_FLOW && financialsData?.cashFlow && <FinancialTable headers={financialsData.cashFlow.tableData.headers} rows={financialsData.cashFlow.tableData.rows} />}

          {/* AI Analysis */}
          <AIAnalysisCard type="financial" title="財務數據趨勢解讀" defaultExpanded={true} />
        </div>
      )}
    </div>
  );
};

export default StockDetail;