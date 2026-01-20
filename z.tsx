import React from 'react';

interface AnalyticsCardProps {
  title: string;
  profit?: string;
  wins: string;
  losses: string;
  winAmount: string;
  lossAmount: string;
  winRate: string;
  totalTrades?: string;
  isCenter: boolean;
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
  const winPercentage = parseFloat(winRate);
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

export default function pnlAnalytics() {
  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <AnalyticsCard
          title="Short Analysis"
          profit="-$319.08"
          wins="1"
          losses="3"
          winAmount="$260.29"
          lossAmount="$579.37"
          winRate="25%"
          isCenter={false}
        />
        
        <AnalyticsCard
          title="Profitability"
          totalTrades="14"
          wins="4"
          losses="10"
          winAmount="28.57%"
          lossAmount="71.43%"
          winRate="28.57%"
          isCenter={true}
        />
        
        <AnalyticsCard
          title="Long Analysis"
          profit="-$319.08"
          wins="3"
          losses="7"
          winAmount="$260.29"
          lossAmount="$579.37"
          winRate="30%"
          isCenter={false}
        />
      </div>
    </div>
  );
}