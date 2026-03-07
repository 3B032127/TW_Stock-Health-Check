import React, { useState } from 'react';
import { ViewState } from './types';
import Dashboard from './pages/Dashboard';
import StockDetail from './pages/StockDetail';
import EconomicIndicators from './pages/EconomicIndicators';
import ApiTesting from './pages/ApiTesting';
import SearchBar from './components/SearchBar';

// --- Icons Component Helper ---
export const Icon = ({ name, className = "" }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className} select-none`}>{name}</span>
);

// --- Layout Components ---

const Header = ({
  currentView,
  onChangeView,
  onNavigateToStock
}: {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  onNavigateToStock: (stockId: string) => void;
}) => {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-surfaceLight bg-background/80 backdrop-blur-md px-4 py-3 lg:px-6">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => onChangeView(ViewState.DASHBOARD)}>
        <div className="flex size-8 items-center justify-center rounded bg-primary text-white">
          <Icon name="candlestick_chart" className="text-[20px]" />
        </div>
        <h2 className="hidden md:block text-lg font-bold leading-tight tracking-tight text-white">
          台股財報健檢系統
        </h2>
      </div>

      <div className="flex-1 max-w-md px-4 hidden sm:block">
        <SearchBar onNavigateToStock={onNavigateToStock} />
      </div>

      <nav className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-6">
          <button
            onClick={() => onChangeView(ViewState.DASHBOARD)}
            className={`text-sm font-medium transition-colors ${currentView === ViewState.DASHBOARD ? 'text-primary' : 'text-textMuted hover:text-white'}`}
          >
            市場概況
          </button>
          <button
            onClick={() => onChangeView(ViewState.ECONOMIC_INDICATORS)}
            className={`text-sm font-medium transition-colors ${currentView === ViewState.ECONOMIC_INDICATORS ? 'text-primary' : 'text-textMuted hover:text-white'}`}
          >
            經濟指標
          </button>
          <button
            onClick={() => onChangeView(ViewState.API_TESTING)}
            className={`text-sm font-medium transition-colors ${currentView === ViewState.API_TESTING ? 'text-primary' : 'text-textMuted hover:text-white'}`}
          >
            API測試
          </button>
          <button className="text-sm font-medium text-textMuted hover:text-white transition-colors">
            自選追蹤
          </button>
        </div>
        <button className="flex items-center justify-center size-9 rounded-full bg-surfaceLight hover:bg-surface transition-colors text-textMuted">
          <Icon name="person" className="text-[20px]" />
        </button>
      </nav>
    </header>
  );
};

const Footer = () => (
  <footer className="mt-12 border-t border-surfaceLight bg-background py-8 px-6 text-center text-xs text-textMuted">
    <p>Copyright © 2024 台股財報健檢系統. 資料來源：台灣證券交易所，報價延遲至少15分鐘。投資均有風險，數據僅供參考。</p>
  </footer>
);

// --- Main App ---

const App = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [selectedEconomicIndicatorId, setSelectedEconomicIndicatorId] = useState<string | undefined>(undefined);
  const [selectedStockId, setSelectedStockId] = useState<string>("2330"); // Default to TSMC

  // Function to navigate to stock detail
  const navigateToStock = (stockId: string) => {
    setSelectedStockId(stockId);
    setCurrentView(ViewState.STOCK_DETAIL);
    window.scrollTo(0, 0);
  };

  const navigateToIndicator = (id: string) => {
    setSelectedEconomicIndicatorId(id);
    setCurrentView(ViewState.ECONOMIC_INDICATORS);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-textMain font-sans">
      <Header currentView={currentView} onChangeView={setCurrentView} onNavigateToStock={navigateToStock} />

      <main className={`flex-1 w-full ${currentView === ViewState.API_TESTING
        ? ''
        : 'max-w-[1400px] mx-auto p-4 lg:p-6'
        }`}>
        {currentView === ViewState.DASHBOARD && (
          <Dashboard
            onNavigateToStock={navigateToStock}
            onNavigateToIndicator={navigateToIndicator}
          />
        )}
        {currentView === ViewState.STOCK_DETAIL && <StockDetail stockId={selectedStockId} onNavigateHome={() => setCurrentView(ViewState.DASHBOARD)} />}
        {currentView === ViewState.ECONOMIC_INDICATORS && (
          <EconomicIndicators
            initialIndicatorId={selectedEconomicIndicatorId}
            onNavigateHome={() => setCurrentView(ViewState.DASHBOARD)}
          />
        )}
        {currentView === ViewState.API_TESTING && <ApiTesting />}
      </main>

      <Footer />
    </div>
  );
};

export default App;
