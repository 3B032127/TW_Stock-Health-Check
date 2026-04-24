import React, { useState } from 'react';
import { createPortal } from 'react-dom';

interface SyncIndicatorProps {
    isFetching: boolean;
    lastUpdated?: number;
    isStale?: boolean;
    onSyncRequest?: () => void;
}

/**
 * 背景數據同步指示器 — 智慧型膠囊設計 (Smart Pill)
 * 
 * 狀態：
 * - 顯示「數據更新中...」
 * - 顯示「發現新資料」並附帶更新按鈕
 * - 顯示「最後更新: time」
 */
const SyncIndicator: React.FC<SyncIndicatorProps> = ({ isFetching, lastUpdated, isStale, onSyncRequest }) => {
    const [isHovered, setIsHovered] = useState(false);

    // Hide if no data, not stale, and not fetching
    if (!lastUpdated && !isFetching && !isStale) return null;

    // Formatters
    const formatTimeShort = (timestamp?: number) => {
        if (!timestamp) return '--/-- --:--';
        const date = new Date(timestamp * 1000); // Expecting unix timestamp in seconds from backend sync.py
        if (date.getFullYear() < 2000) {
            // in case it's in ms
            date.setTime(timestamp);
        }
        const mm = (date.getMonth() + 1).toString().padStart(2, '0');
        const dd = date.getDate().toString().padStart(2, '0');
        const hh = date.getHours().toString().padStart(2, '0');
        const min = date.getMinutes().toString().padStart(2, '0');
        return `${mm}/${dd} ${hh}:${min}`;
    };

    const formatTimeFull = (timestamp?: number) => {
        if (!timestamp) return '';
        const date = new Date(timestamp * 1000);
        if (date.getFullYear() < 2000) {
            date.setTime(timestamp);
        }
        const yyyy = date.getFullYear();
        const mm = (date.getMonth() + 1).toString().padStart(2, '0');
        const dd = date.getDate().toString().padStart(2, '0');
        const hh = date.getHours().toString().padStart(2, '0');
        const min = date.getMinutes().toString().padStart(2, '0');
        const ss = date.getSeconds().toString().padStart(2, '0');
        return `${yyyy}/${mm}/${dd} ${hh}:${min}:${ss}`;
    };

    const displayTime = isHovered
        ? formatTimeFull(lastUpdated)
        : formatTimeShort(lastUpdated);

    // Determine colors based on state
    let dotColor = '#6b7280';
    let textColor = '#d1d5db';
    let borderColor = 'rgba(255, 255, 255, 0.08)';
    let cursor = 'default';
    
    if (isFetching) {
        dotColor = '#10b981';
        textColor = '#10b981';
        borderColor = 'rgba(16, 185, 129, 0.4)';
    } else if (isStale && lastUpdated) {
        dotColor = '#fbbf24'; // amber
        textColor = '#fbbf24';
        borderColor = 'rgba(251, 191, 36, 0.5)';
        cursor = 'pointer';
    } else if (isHovered) {
        dotColor = '#10b981';
    }

    return createPortal(
        <div
            className="sync-indicator"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => {
                if (isStale && onSyncRequest && !isFetching) {
                    onSyncRequest();
                }
            }}
            style={{
                position: 'fixed',
                top: '88px',
                right: '24px',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '20px',

                // Glassmorphism styling
                background: isHovered
                    ? 'rgba(20, 20, 23, 0.95)'
                    : 'rgba(20, 20, 23, 0.75)',
                border: borderColor,
                backdropFilter: 'blur(16px)',
                boxShadow: isHovered
                    ? '0 8px 32px rgba(0, 0, 0, 0.4)'
                    : '0 4px 16px rgba(0, 0, 0, 0.2)',

                // Typography
                color: textColor,
                fontSize: '12px',
                fontWeight: 500,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                letterSpacing: '0.02em',

                // Transitions
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: cursor,
                transform: 'translateZ(0)',
                width: 'fit-content',
                justifyContent: 'center',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
            }}
        >
            {/* Indicator Dot */}
            <span
                style={{
                    flexShrink: 0,
                    display: 'inline-block',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: dotColor,
                    boxShadow: isFetching || isStale ? `0 0 8px ${dotColor}80` : 'none',
                    animation: isFetching || isStale ? 'syncPulse 1.5s ease-in-out infinite' : 'none',
                    transition: 'all 0.3s ease',
                }}
            />

            {/* Content Container */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: 1,
                    transition: 'all 0.3s ease',
                }}
            >
                {isFetching ? (
                    <span style={{ fontWeight: 600 }}>數據更新中...</span>
                ) : (isStale && lastUpdated) ? (
                    <>
                        <span style={{ fontWeight: 600 }}>發現新資料</span>
                        <span style={{
                            marginLeft: '4px',
                            padding: '2px 8px',
                            background: 'rgba(251, 191, 36, 0.1)',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 600
                        }}>
                            立即更新
                        </span>
                    </>
                ) : (
                    <>
                        <span style={{ opacity: 0.7 }}>最後更新:</span>
                        <span style={{
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 600,
                            color: isHovered ? '#fff' : '#e5e7eb'
                        }}>
                            {displayTime}
                        </span>
                    </>
                )}
            </div>

            <style>{`
        @keyframes syncPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
        </div>,
        document.body
    );
};

export default SyncIndicator;
