import re

with open('f:\\taiwan-stock-health-check\\pages\\StockDetail.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. 替換 <PeerComparison stockId={stockId} /> 為 <PeerComparisonSection stockId={stockId} />
text = text.replace('<PeerComparison stockId={stockId} />', '<PeerComparisonSection stockId={stockId} />')

# 2. 替換舊的 `const PeerComparison` 宣告與本體為 `PeerComparisonSection`
# 尋找從 `const PeerComparison = ({ stockId }:` 開始直到 OwnershipSummary 前面的 }
pattern = re.compile(r'const PeerComparison = \(\{ stockId \}: \{ stockId: string \}\) => \{.*?(?=\nconst OwnershipSummary)', re.DOTALL)

replacement = """const PeerComparisonSection = ({ stockId }: { stockId: string }) => {
  const { data, isLoading, error } = usePeerComparison(stockId);

  if (isLoading) {
    return (
      <div className="bg-surface border border-surfaceLight rounded-xl p-6 flex items-center justify-center animate-pulse min-h-[200px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-textMuted text-sm">載入同業資料中...</p>
        </div>
      </div>
    );
  }

  if (error || !data || !data.peers || data.peers.length === 0) {
    return (
      <div className="bg-surface border border-surfaceLight rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px]">
        <Icon name="compare_arrows" className="text-4xl text-surfaceLight mb-2" />
        <span className="text-textMuted text-sm">暫無同業比較資料</span>
      </div>
    );
  }

  return (
    <DynamicPeerComparison 
      stockId={stockId} 
      industrySector={data.industry} 
      peers={data.peers} 
      industryAverage={data.industryAverage} 
    />
  );
};
"""

text = pattern.sub(replacement, text)

with open('f:\\taiwan-stock-health-check\\pages\\StockDetail.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Replacement done.")
