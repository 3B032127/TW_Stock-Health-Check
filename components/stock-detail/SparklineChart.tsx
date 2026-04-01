import React from 'react';
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts';

export const SparklineChart = ({ data, color }: { data: { time: string; value: number }[], color?: string }) => {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data.map(d => d.value));
  const max = Math.max(...data.map(d => d.value));
  const isUp = data[data.length - 1].value >= data[0].value;
  const strokeColor = color || (isUp ? '#ef4444' : '#10b981');

  return (
    <div className="w-24 h-10 ml-auto">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" stroke={strokeColor} strokeWidth={2} dot={false} isAnimationActive={false} />
          <YAxis domain={[min - (max - min) * 0.1, max + (max - min) * 0.1]} hide />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
