import React, { useState } from 'react';
import { Icon } from '../App';

interface AIAnalysisCardProps {
    title?: string;
    type: 'chips' | 'health' | 'financial';
    onAnalyze?: () => Promise<string>;
    defaultExpanded?: boolean;
}

export const AIAnalysisCard: React.FC<AIAnalysisCardProps> = ({
    title = "AI 深度分析",
    type,
    onAnalyze,
    defaultExpanded = false
}) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);
    const hasAutoRun = React.useRef(false);

    React.useEffect(() => {
        if (defaultExpanded && !hasAutoRun.current) {
            hasAutoRun.current = true;
            handleAnalyze();
        }
    }, [defaultExpanded]);

    const handleAnalyze = async () => {
        setLoading(true);
        setExpanded(true);

        // Simulate API call delay
        try {
            if (onAnalyze) {
                const data = await onAnalyze();
                setResult(data);
            } else {
                // Mock data if no handler provided
                await new Promise(resolve => setTimeout(resolve, 1500));
                setResult(getMockAnalysis(type));
            }
        } catch (error) {
            console.error(error);
            setResult("分析過程發生錯誤，請稍後再試。");
        } finally {
            setLoading(false);
        }
    };

    const getMockAnalysis = (type: string) => {
        switch (type) {
            case 'chips':
                return `### 籌碼面分析摘要
根據最新的籌碼數據顯示，**外資**連續3日買超，顯示國際資金對該股後市持樂觀態度。雖然**投信**今日小幅調節，但**主力大戶**持股比例維持在 88.5% 的高檔，籌碼集中度高，有利於股價支撐。
        
*建議：持續關注外資動向，若買超持續，股價有機會挑戰前波高點。*`;
            case 'health':
                return `### 財務健檢分析
台積電 (2330) 目前綜合評分為 **87分**，在半導體產業中表現**優秀**。
* **獲利能力 (92分)**：毛利率與淨利率皆優於同業平均，顯示強大的護城河與定價能力。
* **償債能力 (85分)**：流動比率與速動比率健康，財務結構穩健。
* **風險提示**：評價水位 (45分) 相對較低，目前本益比稍高於歷史平均。`;
            case 'financial':
                return `### 財務數據洞察
最新一季營收顯示季增成長動能強勁。
* **營收趨勢**：本季營收創下歷史新高，主要受惠於先進製程需求暢旺。
* **成本控管**：儘管研發支出增加，但營業利益率仍維持在高檔，顯示規模經濟效益顯著。
* **現金流**：營業現金流充沛，足以支撐未來的資本支出與股利發放。`;
            default:
                return "暫無分析數據。";
        }
    };

    return (
        <div className={`
      rounded-xl border transition-all duration-300 overflow-hidden
      ${expanded ? 'bg-surface border-blue-500/50 shadow-lg shadow-blue-500/10' : 'bg-surface border-surfaceLight'}
    `}>
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`
            p-2 rounded-lg transition-colors
            ${expanded ? 'bg-blue-600 text-white' : 'bg-surfaceLight text-textMuted'}
          `}>
                        <Icon name="auto_awesome" />
                    </div>
                    <div>
                        <h3 className={`font-bold transition-colors ${expanded ? 'text-white' : 'text-textMuted'}`}>
                            {title}
                        </h3>
                        {!expanded && <p className="text-xs text-textMuted">Gemini Pro 驅動</p>}
                    </div>
                </div>

                <button
                    onClick={handleAnalyze}
                    disabled={loading || (expanded && !!result)}
                    className={`
            px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all
            ${loading
                            ? 'bg-surfaceLight text-textMuted cursor-wait'
                            : expanded && result
                                ? 'bg-surfaceLight/10 text-textMuted hover:bg-surfaceLight/20'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25'
                        }
          `}
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            <span>分析中...</span>
                        </>
                    ) : result ? (
                        <>
                            <Icon name="refresh" className="text-sm" />
                            <span>重新分析</span>
                        </>
                    ) : (
                        <>
                            <Icon name="analytics" className="text-sm" />
                            <span>開始分析</span>
                        </>
                    )}
                </button>
            </div>

            {/* Content */}
            <div className={`
        transition-[max-height,opacity] duration-500 ease-in-out
        ${expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
      `}>
                {expanded && (
                    <div className="p-4 pt-0 border-t border-surfaceLight/50 mx-4 mt-2 mb-4">
                        <div className="pt-4 text-justify leading-relaxed text-slate-300">
                            {result ? (
                                // Simple markdown-like rendering for demo
                                result.split('\n').map((line, i) => {
                                    if (line.startsWith('### ')) return <h4 key={i} className="text-lg font-bold text-white mb-2 mt-4 first:mt-0">{line.replace('### ', '')}</h4>;
                                    if (line.startsWith('* ')) return <li key={i} className="ml-4 mb-1 text-slate-300">{line.replace('* ', '')}</li>;
                                    if (line.startsWith('**')) return <strong key={i} className="text-white">{line.replace(/\*\*/g, '')}</strong>;
                                    return <p key={i} className="mb-2 last:mb-0" dangerouslySetInnerHTML={{
                                        __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                                    }}></p>;
                                })
                            ) : (
                                <div className="h-24 animate-pulse flex flex-col gap-3">
                                    <div className="h-4 bg-surfaceLight rounded w-3/4"></div>
                                    <div className="h-4 bg-surfaceLight rounded w-full"></div>
                                    <div className="h-4 bg-surfaceLight rounded w-5/6"></div>
                                </div>
                            )}
                        </div>

                        {result && (
                            <div className="mt-4 pt-4 border-t border-surfaceLight/30 flex justify-between items-center text-xs text-textMuted">
                                <span>分析結果由 Google Gemini 提供，僅供參考，非投資建議。</span>
                                <div className="flex gap-2">
                                    <button className="hover:text-white transition-colors" title="複製"><Icon name="content_copy" className="text-sm" /></button>
                                    <button className="hover:text-white transition-colors" title="喜歡"><Icon name="thumb_up" className="text-sm" /></button>
                                    <button className="hover:text-white transition-colors" title="不喜歡"><Icon name="thumb_down" className="text-sm" /></button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
