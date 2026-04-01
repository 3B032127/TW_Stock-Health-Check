import React from 'react';
import { Icon } from '../../App';

interface HealthScoreGaugeProps {
  score: number;
  peerAvg: number;
}

export const HealthScoreGauge: React.FC<HealthScoreGaugeProps> = ({ score, peerAvg }) => {
  const getStatus = (s: number) => {
    if (s >= 80) return { label: '優秀', color: 'emerald', hex: '#10b981' };
    if (s >= 60) return { label: '良好', color: 'blue', hex: '#3b82f6' };
    return { label: '待加強', color: 'rose', hex: '#f43f5e' };
  };

  const status = getStatus(score);
  
  // Calculate stroke dasharray for the SVG circle
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col h-full rounded-xl bg-surface p-6 shadow-sm border border-surfaceLight relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon name="health_metrics" className="text-9xl" />
      </div>
      <h3 className="text-textMuted font-medium mb-4 z-10">綜合健康評分</h3>
      
      <div className="flex flex-1 flex-col items-center justify-center py-4 z-10">
        <div className="relative size-36 flex items-center justify-center mb-6">
          {/* Background Circle */}
          <svg className="absolute inset-0 size-full -rotate-90">
            <circle
              cx="72"
              cy="72"
              r={radius}
              className="stroke-surfaceLight fill-none"
              strokeWidth="12"
            />
            {/* Progress Circle */}
            <circle
              cx="72"
              cy="72"
              r={radius}
              className={`fill-none drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-1000 ease-out`}
              stroke={status.hex}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          
          <div className="text-center mt-2">
            <span className="text-5xl font-black text-white">{score}</span>
            <span className={`block text-sm font-bold mt-1 tracking-widest text-${status.color}-400`}>
              {status.label}
            </span>
          </div>
        </div>
      </div>
      
      <div className="space-y-2 mt-auto z-10">
        <div className="flex justify-between text-sm">
          <span className="text-textMuted font-medium">同業平均</span>
          <span className="font-bold text-white">{peerAvg}</span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-slate-500 rounded-full" style={{ width: `${peerAvg}%` }}></div>
        </div>
      </div>
    </div>
  );
};
