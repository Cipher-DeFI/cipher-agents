export interface TokenData {
    id: string;
    symbol: string;
    name: string;
    current_price: number;
    market_cap: number;
    volume_24h: number;
    price_change_24h: number;
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    price_change_percentage_1y: number;
    ath: number;
    ath_change_percentage: number;
    atl: number;
    atl_change_percentage: number;
    circulating_supply: number;
    total_supply: number;
    max_supply: number;
    sparkline_in_7d: {
      price: number[];
    };
  }
  
  export interface MarketSentiment {
    fearGreedIndex: number;
    sentiment: string;
    volatility: string;
    marketCapChange24h: number;
    btcDominance: number;
    totalMarketCap: number;
  }
  
  export interface CommitmentAnalysis {
    score: number;
    recommendation: 'HIGHLY_RECOMMENDED' | 'RECOMMENDED' | 'NEUTRAL' | 'CAUTION' | 'NOT_RECOMMENDED';
    factors: string[];
    riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
    behavioralInsights: string[];
    marketConditions: string[];
    suggestedOptimizations: string[];
    fearGreedInsights: string[];
  }


export interface MarketData {
  btc: number;
  eth: number;
  sol: number;
  sentiment: string;
  volatility: string;
  fearGreedIndex: number;
  marketCapChange24h: number;
  btcChange24h: number;
  ethChange24h: number;
  solChange24h: number;
  timestamp: number;
}

export interface FearGreedData {
  value: number;
  classification: string;
  timestamp: number;
}

export interface PricePrediction {
  targetDate: Date;
  predictedPrice: number;
  confidence: number;
  priceChange: number;
  priceChangePercentage: number;
  factors: string[];
}

export interface ExpectedReturn {
  duration: number;
  durationUnit: string;
  initialInvestment: number;
  predictedValue: number;
  expectedReturn: number;
  expectedReturnPercentage: number;
  bestCaseScenario: number;
  worstCaseScenario: number;
  confidence: number;
  pricePredictions: PricePrediction[];
}

export interface EnhancedCommitmentAnalysis extends CommitmentAnalysis {
  expectedReturn: ExpectedReturn;
  pricePredictions: PricePrediction[];
}

export interface PriceTargetAnalysis {
  targetPrice: number;
  targetType: 'UP' | 'DOWN';
  expectedDays: number;
  confidence: number;
  probability: number;
  riskFactors: string[];
  marketConditions: string[];
}

export interface PriceBasedCommitmentAnalysis {
  amount: number;
  tokenSymbol: string;
  currentPrice: number;
  upTarget: number;
  downTarget: number;
  upTargetAnalysis: PriceTargetAnalysis;
  downTargetAnalysis: PriceTargetAnalysis;
  overallRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  expectedReturn: {
    upScenario: number;
    downScenario: number;
    weightedAverage: number;
    bestCase: number;
    worstCase: number;
  };
  insights: string[];
  recommendations: string[];
  timeToReachTargets: {
    upTarget: number;
    downTarget: number;
    averageTime: number;
  };
}

export interface WalletAnalysisResult {
  riskScore: number;
  confidencePercentage: number;
  riskProfile: 'LOW_RISK' | 'MODERATE_RISK' | 'HIGH_RISK' | 'EXTREME_RISK';
  marketAnalysis: {
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    trendDirection: 'UPWARD' | 'DOWNWARD' | 'SIDEWAYS';
    aiRecommendation: string;
  };
  userTradingFactors: {
    averageHoldTime: number;
    tradeFrequency: number;
    volatilityTolerance: number;
    diversificationScore: number;
    emotionalTradingIndicators: string[];
    ethActivity?: number;
    avaxActivity?: number;
  };
  riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'EXTREME';
  personalizedRecommendations: string[];
}

export interface WalletTransaction {
  hash: string;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  gasPrice: string;
  gasUsed: string;
  isError: boolean;
  methodId?: string;
  functionName?: string;
  chain: 'ETH' | 'AVAX';
}

export interface TokenBalance {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  tokenDecimals: number;
  balance: string;
  value?: number;
  chain: 'ETH' | 'AVAX';
}

export interface TradingMetrics {
  totalTrades: number;
  averageHoldTime: number;
  tradeFrequency: number;
  volatilityTolerance: number;
  diversificationScore: number;
  emotionalTradingIndicators: string[];
  profitLossRatio: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  averageTradeSize: number;
  largestTrade: number;
  smallestTrade: number;
  ethActivity: number;
  avaxActivity: number;
}

export interface VaultInsight {
  tokenSymbol: 'ETH' | 'AVAX';
  [key: string]: any;
}

export interface VaultData {
  id: string;
  owner: string;
  token: string;
  amount: string;
  unlockTime: string;
  targetPrice: string;
  priceUp: string;
  priceDown: string;
  conditionType: number;
  status: number;
  createdAt: string;
  updatedAt: string;
  title: string;
  message: string;
  autoWithdraw: boolean;
  creationTxHash: string;
  creationBlockNumber: string;
  unlockedAt: string | null;
  unlockedTxHash: string | null;
  withdrawnAt: string | null;
  withdrawnTxHash: string | null;
  emergencyWithdrawnAt: string | null;
  emergencyPenalty: string | null;
  emergencyTxHash: string | null;
  insight: {
    insight: string;
  } | null;
}

export interface VaultsAnalysisResult {
  totalVaults: number;
  activeVaults: number;
  completedVaults: number;
  emergencyWithdrawnVaults: number;
  averageLockDuration: number;
  averageAmount: number;
  totalValueLocked: number;
  successRate: number;
  commonPatterns: string[];
  riskInsights: string[];
  behavioralInsights: string[];
  marketInsights: string[];
  recommendations: string[];
  topTokens: Array<{ token: string; count: number; totalValue: number }>;
  timeDistribution: {
    shortTerm: number;
    mediumTerm: number;
    longTerm: number;
  };
}