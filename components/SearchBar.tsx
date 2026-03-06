import React, { useState, useRef, useEffect } from 'react';
import { useStockList } from '../hooks/useStockList';
import { Icon } from '../App';

interface SearchBarProps {
    onNavigateToStock: (stockId: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onNavigateToStock }) => {
    const { stocks, isLoading } = useStockList();
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Filter logic
    const filteredStocks = React.useMemo(() => {
        if (!query.trim()) return [];
        const lowerQuery = query.toLowerCase();
        return stocks.filter(stock =>
            stock.stock_id.includes(lowerQuery) ||
            stock.stock_name.toLowerCase().includes(lowerQuery)
        ).slice(0, 10); // Show max 10 results
    }, [query, stocks]);

    // Handle click outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isFocused || filteredStocks.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < filteredStocks.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < filteredStocks.length) {
                handleSelect(filteredStocks[selectedIndex].stock_id);
            } else if (filteredStocks.length > 0) {
                handleSelect(filteredStocks[0].stock_id);
            }
        }
    };

    const handleSelect = (stockId: string) => {
        setQuery('');
        setIsFocused(false);
        setSelectedIndex(-1);
        onNavigateToStock(stockId);
    };

    return (
        <div ref={wrapperRef} className="relative flex w-full items-center">
            <div className="flex w-full items-center rounded-lg bg-surfaceLight border border-transparent focus-within:border-primary/50 transition-colors h-10 px-3 z-10 relative">
                <Icon name="search" className="text-textMuted text-[20px]" />
                <input
                    type="text"
                    placeholder={isLoading ? "載入股票清單中..." : "搜尋股票代碼或名稱 (例如: 2330)"}
                    className="w-full bg-transparent border-none text-sm text-white placeholder-textMuted focus:ring-0 ml-2 outline-none h-full"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setSelectedIndex(-1);
                    }}
                    onFocus={() => setIsFocused(true)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                />
            </div>

            {/* Dropdown Menu */}
            {isFocused && query.trim() !== '' && (
                <div className="absolute top-12 left-0 w-full bg-surface border border-surfaceLight rounded-lg shadow-xl overflow-hidden z-50">
                    {filteredStocks.length > 0 ? (
                        <ul className="max-h-64 overflow-y-auto w-full py-1 m-0 list-none px-0">
                            {filteredStocks.map((stock, index) => (
                                <li
                                    key={stock.stock_id}
                                    className={`px-4 py-2 text-sm cursor-pointer flex justify-between items-center transition-colors
                                        ${index === selectedIndex ? 'bg-primary/20 text-white' : 'text-textMain hover:bg-surfaceLight/50'}
                                    `}
                                    onClick={() => handleSelect(stock.stock_id)}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                >
                                    <span className="font-bold text-primary">{stock.stock_id}</span>
                                    <span className="text-white ml-2 flex-1">{stock.stock_name}</span>
                                    <span className="text-xs text-textMuted">{stock.industry_category}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="px-4 py-3 text-sm text-textMuted text-center">
                            找不到相關股票
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchBar;
