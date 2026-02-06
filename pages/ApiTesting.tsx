import React, { useState } from 'react';
import { ApiTestingTab } from '../types';
import { Icon } from '../App';

const ApiTesting = () => {
    const [activeTab, setActiveTab] = useState<ApiTestingTab>(ApiTestingTab.MARKET_INDICATORS);

    return (
        <div className="flex w-full">
            {/* Left Sidebar Navigation - Flush to left edge */}
            <div className="w-64 flex-shrink-0 bg-surface/30 border-r border-surfaceLight">
                <div className="sticky top-6 p-4 space-y-2">
                    <h3 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-4 px-3">
                        API 測試項目
                    </h3>

                    <button
                        onClick={() => setActiveTab(ApiTestingTab.MARKET_INDICATORS)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === ApiTestingTab.MARKET_INDICATORS
                                ? 'bg-primary/10 text-primary border border-primary/30'
                                : 'text-textMuted hover:text-white hover:bg-surfaceLight border border-transparent'
                            }`}
                    >
                        <Icon name="monitoring" className="text-[20px]" />
                        <span>台股市場指標</span>
                    </button>

                    <button
                        onClick={() => setActiveTab(ApiTestingTab.STOCK_FINANCIALS)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === ApiTestingTab.STOCK_FINANCIALS
                                ? 'bg-primary/10 text-primary border border-primary/30'
                                : 'text-textMuted hover:text-white hover:bg-surfaceLight border border-transparent'
                            }`}
                    >
                        <Icon name="account_balance" className="text-[20px]" />
                        <span>個股財報資料</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area - Centered and fills remaining space */}
            <div className="flex-1 flex justify-center">
                <div className="w-full max-w-[1400px]">
                    {activeTab === ApiTestingTab.MARKET_INDICATORS && (
                        <div className="w-full">
                            <iframe
                                src="/test_indicators.html"
                                className="w-full border-0"
                                title="台股市場指標 API 測試"
                                style={{
                                    height: '2000px',
                                    display: 'block'
                                }}
                            />
                        </div>
                    )}

                    {activeTab === ApiTestingTab.STOCK_FINANCIALS && (
                        <div className="flex flex-col items-center justify-center min-h-[600px] bg-surfaceLight/30 rounded-lg border border-surfaceLight m-4">
                            <div className="text-6xl mb-4">🚧</div>
                            <h3 className="text-xl font-semibold text-white mb-2">開發中</h3>
                            <p className="text-textMuted text-sm">個股財報資料API測試功能即將推出</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ApiTesting;
