import React from 'react';

export const FinancialTable = ({ headers, rows }: { headers: string[], rows: any[] }) => (
  <div className="bg-surface border border-surfaceLight rounded-xl overflow-hidden">
    <div className="p-4 border-b border-surfaceLight flex justify-between items-center">
      <h3 className="text-white text-lg font-bold">詳細財務數據</h3>
      <span className="text-textMuted text-xs">單位: 百萬元 / EPS: 元</span>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-right whitespace-nowrap">
        <thead className="bg-surfaceLight text-textMuted">
          <tr>
            <th className="px-6 py-4 text-left font-medium sticky left-0 bg-surfaceLight z-10 border-r border-surfaceLight">項目</th>
            {headers.map((h, i) => (
              <th key={i} className="px-6 py-4 font-medium min-w-[100px]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surfaceLight">
          {rows.map((row, i) => (
            <tr key={i} className={`hover:bg-surfaceLight/30 transition-colors ${row.highlight ? 'bg-surfaceLight/10' : ''}`}>
              <td className={`px-6 py-4 text-left font-medium sticky left-0 z-10 border-r border-surfaceLight ${row.highlight ? 'text-primary' : row.item.includes('EPS') || row.item.includes('淨利') || row.item.includes('總計') || row.item.includes('合計') || row.item.includes('現金流量') ? 'text-white font-bold' : 'text-textMuted'} ${row.highlight ? 'bg-[#182336]' : 'bg-surface'}`}>
                {row.item}
              </td>
              {row.values.map((val: string, j: number) => (
                <td key={j} className={`px-6 py-4 ${row.highlight && j === 0 ? 'text-primary font-bold' : j === 0 ? 'text-white' : 'text-textMuted'}`}>
                  {val}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
