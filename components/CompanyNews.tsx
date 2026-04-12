import React, { useState } from 'react';
import { useCompanyNews } from '../hooks/useCompanyNews';
import { Icon } from '../App';
import { api } from '../services/api';

interface CompanyNewsProps {
    stockId: string;
}

const CompanyNews: React.FC<CompanyNewsProps> = ({ stockId }) => {
    const { data: newsList, isLoading, error } = useCompanyNews(stockId);

    const [selectedNews, setSelectedNews] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFetchingContent, setIsFetchingContent] = useState(false);
    const [newsContent, setNewsContent] = useState<string | null>(null);
    const [modalError, setModalError] = useState<string | null>(null);

    const handleNewsClick = async (e: React.MouseEvent, news: any) => {
        e.preventDefault();
        setSelectedNews(news);
        // Allow render before starting transition
        setTimeout(() => setIsModalOpen(true), 10);
        setIsFetchingContent(true);
        setNewsContent(null);
        setModalError(null);

        try {
            const result = await api.getNewsContent(news.url);
            if (result.status === 'success') {
                setNewsContent(result.content);
            } else {
                setModalError(result.content || result.message || '無法取得文章內容');
            }
        } catch (err: any) {
            setModalError(err.message || '發生未知錯誤');
        } finally {
            setIsFetchingContent(false);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setSelectedNews(null);
            setNewsContent(null);
            setModalError(null);
        }, 300); // Wait for animation duration
    };

    return (
        <div className="w-full bg-surface rounded-xl p-6 border border-surfaceLight shadow-sm flex flex-col h-full">
            {/* 卡片標題區塊 */}
            <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
                <Icon name="newspaper" className="text-blue-400 text-xl" />
                最新相關新聞
            </h3>

            {/* 依據不同狀態渲染不同的畫面 */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {error ? (
                    // 狀態 2：發生錯誤 (Error)
                    <div className="flex flex-col items-center justify-center py-8 text-center text-rose-400">
                        <Icon name="error_outline" className="text-3xl mb-2 opacity-80" />
                        <p className="text-sm font-medium">無法取得新聞資料</p>
                        <p className="text-xs mt-1 text-textMuted">請稍後再試</p>
                    </div>
                ) : !newsList || newsList.length === 0 ? (
                    // 狀態 3：查無新聞資料 (Empty State)
                    <div className="flex items-center justify-center py-8">
                        <p className="text-textMuted text-sm">目前無相關新聞</p>
                    </div>
                ) : (
                    // 狀態 4：成功取得資料並渲染新聞列表
                    <ul className="space-y-4">
                        {newsList.map((news: any) => (
                            <li key={news.id} className="group pb-4 border-b border-surfaceLight last:border-b-0 last:pb-0">
                                <a
                                    href={news.url}
                                    onClick={(e) => handleNewsClick(e, news)}
                                    className="block transition-colors cursor-pointer"
                                >
                                    {/* 新聞標題，並加上 hover 效果 */}
                                    <h4 className="text-slate-200 font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-1.5">
                                        {news.title}
                                    </h4>
                                    {/* 發布日期 */}
                                    <span className="text-xs text-textMuted flex items-center gap-1.5">
                                        <Icon name="schedule" className="text-xs" />
                                        {news.publishDate}
                                    </span>
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {selectedNews && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
                    <div className={`absolute inset-0 transition-all duration-300 ease-out bg-black/70 ${isModalOpen ? 'opacity-100 backdrop-blur-sm' : 'opacity-0 backdrop-blur-none'}`} onClick={closeModal}></div>
                    <div className={`bg-surface rounded-xl flex flex-col w-full max-w-3xl max-h-[90vh] shadow-2xl border border-surfaceLight overflow-hidden relative transition-all duration-300 ease-out transform ${isModalOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'}`}>

                        {/* Header */}
                        <div className="p-5 border-b border-surfaceLight flex justify-between items-start sticky top-0 bg-surface z-10">
                            <div className="pr-8">
                                <h2 className="text-xl font-bold text-white leading-snug mb-2">{selectedNews.title}</h2>
                                <div className="flex items-center gap-4 text-xs text-textMuted">
                                    <span className="flex items-center gap-1"><Icon name="schedule" className="text-xs" /> {selectedNews.publishDate}</span>
                                </div>
                            </div>
                            <button
                                onClick={closeModal}
                                className="absolute right-4 top-5 text-textMuted hover:text-white transition-colors bg-surfaceLight/30 hover:bg-surfaceLight/80 p-1.5 rounded-full"
                            >
                                <Icon name="close" />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-[300px] relative">
                            {isFetchingContent ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/50">
                                    <div className="w-10 h-10 rounded-full border-4 border-surfaceLight border-t-primary animate-spin mb-4"></div>
                                    <p className="text-textMuted animate-pulse">正在擷取新聞內文中...</p>
                                </div>
                            ) : modalError ? (
                                <div className="flex flex-col items-center justify-center text-center text-rose-400 py-12">
                                    <Icon name="error_outline" className="text-5xl mb-4 opacity-80" />
                                    <p className="text-lg font-medium mb-2">無法載入內文</p>
                                    <p className="text-sm text-textMuted max-w-md">{modalError}</p>
                                </div>
                            ) : (
                                <div className="text-slate-300 leading-relaxed whitespace-pre-line text-base md:text-lg font-normal tracking-wide">
                                    {newsContent}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-surfaceLight flex justify-between items-center bg-surface/90 sticky bottom-0">
                            <a
                                href={selectedNews.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primaryLight text-sm flex items-center gap-1.5 transition-colors font-medium"
                            >
                                前往原網頁閱讀
                                <Icon name="open_in_new" className="text-[16px]" />
                            </a>
                            <button
                                onClick={closeModal}
                                className="px-6 py-2 bg-surfaceLight hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                關閉
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanyNews;
