import React from 'react';

interface AnalyticsCardProps {
  title: string;
  profit?: number;
  wins: number;
  losses: number;
  winAmount: number;
  lossAmount: number;
  winRate: number;
  totalTrades?: number;
  isCenter: boolean;
}

interface PnlAnalyticsProps {
  shortData: {
    profit: number;
    wins: number;
    losses: number;
    winAmount: number;
    lossAmount: number;
    winRate: number;
  };
  profitabilityData: {
    totalTrades: number;
    wins: number;
    losses: number;
    winRate: number;
  };
  longData: {
    profit: number;
    wins: number;
    losses: number;
    winAmount: number;
    lossAmount: number;
    winRate: number;
  };
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ 
  title, 
  profit, 
  wins, 
  losses, 
  winAmount, 
  lossAmount, 
  winRate, 
  totalTrades, 
  isCenter 
}) => {
  const winPercentage = parseFloat(winRate.toString());
  const lossPercentage = 100 - winPercentage;
  
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 shadow-2xl">
      <h2 className="text-white text-xl font-bold mb-8">{title}</h2>
      
      <div className="flex justify-center mb-8">
        <div className="relative w-48 h-24">
          <svg viewBox="0 0 200 100" className="w-full h-full">
            {/* Background arc */}
            <path
              d="M 20 90 A 80 80 0 0 1 180 90"
              fill="none"
              stroke="#1e293b"
              strokeWidth="20"
              strokeLinecap="round"
            />
            
            {/* Loss arc (red) */}
            <path
              d="M 20 90 A 80 80 0 0 1 180 90"
              fill="none"
              stroke="#ef4444"
              strokeWidth="20"
              strokeLinecap="round"
              strokeDasharray={`${lossPercentage * 2.51} 251`}
            />
            
            {/* Win arc (green) */}
            <path
              d="M 20 90 A 80 80 0 0 1 180 90"
              fill="none"
              stroke="#10b981"
              strokeWidth="20"
              strokeLinecap="round"
              strokeDasharray={`${winPercentage * 2.51} 251`}
              strokeDashoffset={-lossPercentage * 2.51}
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center mt-4">
            {isCenter ? (
              <>
                <div className="text-gray-400 text-sm">Total Trades</div>
                <div className="text-white text-3xl font-bold">{totalTrades}</div>
              </>
            ) : (
              <>
                <div className="text-gray-400 text-sm">Profit</div>
                <div className="text-white text-3xl font-bold">{profit}</div>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-sm">
        <div className="text-left">
          <div className="text-gray-400 mb-1">Wins {wins ? `(${wins})` : ''}</div>
          <div className="text-white font-semibold">{isCenter ? `${winPercentage.toFixed(2)}%` : winAmount}</div>
        </div>
        
        <div className="text-center">
          <div className="text-gray-400 mb-1">Win Rate</div>
          <div className="text-white font-semibold">{winRate}</div>
        </div>
        
        <div className="text-right">
          <div className="text-gray-400 mb-1">Losses {losses ? `(${losses})` : ''}</div>
          <div className="text-white font-semibold">{isCenter ? `${lossPercentage.toFixed(2)}%` : lossAmount}</div>
        </div>
      </div>
    </div>
  );
};

export default function ProfitabilityAnalytics({ shortData, profitabilityData, longData }: PnlAnalyticsProps) {
  return (
    <div className=" bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <AnalyticsCard
          title="Short Analysis"
          profit={shortData.profit}
          wins={shortData.wins}
          losses={shortData.losses}
          winAmount={shortData.winAmount}
          lossAmount={shortData.lossAmount}
          winRate={shortData.winRate}
          isCenter={false}
        />
        
        <AnalyticsCard
          title="Profitability"
          totalTrades={profitabilityData.totalTrades}
          wins={profitabilityData.wins}
          losses={profitabilityData.losses}
          winAmount={profitabilityData.winRate}
          lossAmount={profitabilityData.winRate}
          winRate={profitabilityData.winRate}
          isCenter={true}
        />
        
        <AnalyticsCard
          title="Long Analysis"
          profit={longData.profit}
          wins={longData.wins}
          losses={longData.losses}
          winAmount={longData.winAmount}
          lossAmount={longData.lossAmount}
          winRate={longData.winRate}
          isCenter={false}
        />
      </div>
    </div>
  );
}