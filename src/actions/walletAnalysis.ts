import { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { MarketDataService } from '../services/marketData';
import { MarketData, WalletAnalysisResult } from '../types';
import { BlockchainDataService } from '../services/blockchainData';
import { TradingAnalyzer } from '../services/tradingAnalyzer';

export const WalletAnalysisAction: Action = {
  name: 'FUM_ANALYZE_WALLET',
  similes: ['ANALYZE_TRADING_HISTORY', 'WALLET_RISK_ASSESSMENT', 'TRADING_PATTERN_ANALYSIS', 'PORTFOLIO_RISK_SCORE', 'BEHAVIORAL_TRADING_ANALYSIS'],
  description: 'Analyzes user wallet trading history to provide comprehensive risk assessment, market analysis, and personalized recommendations',
  
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const text = message.content?.text || '';
    const walletAnalysisPatterns = [
      /analyze\s+(?:my\s+)?(?:wallet|trading\s+history|portfolio)/i,
      /risk\s+(?:assessment|analysis|score)/i,
      /trading\s+(?:pattern|behavior|history)/i,
      /portfolio\s+(?:analysis|review)/i,
      /wallet\s+(?:analysis|review)/i
    ];
    
    return walletAnalysisPatterns.some(pattern => pattern.test(text));
  },
  
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ) => {
    try {
      const text = message.content?.text || '';
      
      const walletAddressMatch = text.match(/0x[a-fA-F0-9]{40}/);
      const walletAddress = walletAddressMatch ? walletAddressMatch[0] : null;
      
      const marketDataService = new MarketDataService(runtime);
      const marketData = await marketDataService.getMarketData();
      
      const analysis = await analyzeWalletTradingHistory(walletAddress, marketData, runtime);
      
      const response = formatWalletAnalysisResponse(analysis, marketData);
      
      await callback?.({
        text: response,
        thought: `Analyzed wallet trading history for ${walletAddress || 'user'} with comprehensive risk assessment and market analysis`,
        actions: ['FUM_ANALYZE_WALLET', 'FUM_ANALYZE_COMMITMENT'],
        metadata: {
          walletAddress,
          analysis,
          marketData
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error in wallet analysis:', error);
      await callback?.({
        text: 'I encountered an error while analyzing your wallet. Please try again or provide more specific information about your trading history.',
        thought: `Wallet analysis failed: ${error}`,
        actions: ['FUM_ANALYZE_WALLET']
      });
      return false;
    }
  }
};

async function analyzeWalletTradingHistory(
    walletAddress: string | null,
    marketData: MarketData | null,
    runtime: IAgentRuntime
  ): Promise<WalletAnalysisResult> {  
    try {
      const blockchainService = new BlockchainDataService(runtime);
      const analyzer = new TradingAnalyzer();
      
      const [transactions, tokenBalances] = await Promise.all([
        blockchainService.getAllChainsTransactions(walletAddress || '0x0000000000000000000000000000000000000000'),
        blockchainService.getAllChainsTokenBalances(walletAddress || '0x0000000000000000000000000000000000000000')
      ]);
      
      const tradingMetrics = analyzer.analyzeTradingHistory(transactions, tokenBalances);
      
      const riskScore = calculateRiskScore(tradingMetrics);
      
      const confidencePercentage = calculateConfidencePercentage(tradingMetrics);
      
      const riskProfile = determineRiskProfile(riskScore);
      
      const marketAnalysis = analyzeMarketConditions(marketData);
      
      const userTradingFactors = {
        averageHoldTime: tradingMetrics.averageHoldTime,
        tradeFrequency: tradingMetrics.tradeFrequency,
        volatilityTolerance: tradingMetrics.volatilityTolerance,
        diversificationScore: tradingMetrics.diversificationScore,
        emotionalTradingIndicators: tradingMetrics.emotionalTradingIndicators,
        ethActivity: tradingMetrics.ethActivity,
        avaxActivity: tradingMetrics.avaxActivity
      };
      
      const riskTolerance = determineRiskTolerance(tradingMetrics, riskScore);
      
      const personalizedRecommendations = generatePersonalizedRecommendations(
        tradingMetrics,
        riskScore,
        riskProfile,
        marketAnalysis,
        userTradingFactors
      );
      
      return {
        riskScore,
        confidencePercentage,
        riskProfile,
        marketAnalysis,
        userTradingFactors,
        riskTolerance,
        personalizedRecommendations
      };
    } catch (error) {
      console.error('Error fetching real wallet data:', error);
      throw error;
    }
  }

function calculateRiskScore(data: any): number {
  let score = 0;
  score += Math.min(data.tradeFrequency * 5, 30);
  score += Math.max(0, (30 - data.averageHoldTime) * 2);
  score += data.volatilityTolerance * 0.3;
  score += Math.max(0, (50 - data.diversificationScore) * 0.5);
  score += data.emotionalTradingIndicators.length * 10;
  if (data.profitLossRatio < 1) score += 20;
  score += data.maxDrawdown * 0.5;
  return Math.min(Math.max(score, 0), 100);
}

function calculateConfidencePercentage(data: any): number {
  let confidence = 70;
  if (data.totalTrades > 100) confidence += 15;
  else if (data.totalTrades > 50) confidence += 10;
  else confidence -= 10;
  if (data.averageHoldTime > 30) confidence += 10;
  if (data.diversificationScore > 70) confidence += 5;
  confidence -= data.emotionalTradingIndicators.length * 5;
  
  return Math.min(Math.max(confidence, 50), 95);
}

function determineRiskProfile(riskScore: number): 'LOW_RISK' | 'MODERATE_RISK' | 'HIGH_RISK' | 'EXTREME_RISK' {
  if (riskScore < 25) return 'LOW_RISK';
  if (riskScore < 50) return 'MODERATE_RISK';
  if (riskScore < 75) return 'HIGH_RISK';
  return 'EXTREME_RISK';
}

function analyzeMarketConditions(marketData: MarketData | null) {
  if (!marketData) {
    return {
      sentiment: 'NEUTRAL' as const,
      trendDirection: 'SIDEWAYS' as const,
      aiRecommendation: 'Market data unavailable. Consider waiting for clearer market signals before making significant trading decisions.'
    };
  }
  
  let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  let trendDirection: 'UPWARD' | 'DOWNWARD' | 'SIDEWAYS';
  
  if (marketData.fearGreedIndex >= 60) {
    sentiment = 'BULLISH';
    trendDirection = marketData.marketCapChange24h > 0 ? 'UPWARD' : 'SIDEWAYS';
  } else if (marketData.fearGreedIndex <= 40) {
    sentiment = 'BEARISH';
    trendDirection = marketData.marketCapChange24h < 0 ? 'DOWNWARD' : 'SIDEWAYS';
  } else {
    sentiment = 'NEUTRAL';
    trendDirection = Math.abs(marketData.marketCapChange24h) < 2 ? 'SIDEWAYS' : 
                    marketData.marketCapChange24h > 0 ? 'UPWARD' : 'DOWNWARD';
  }
  
  let aiRecommendation = '';
  
  if (sentiment === 'BULLISH') {
    aiRecommendation = 'Market sentiment is bullish with positive momentum. Consider gradual position building while maintaining risk management protocols.';
  } else if (sentiment === 'BEARISH') {
    aiRecommendation = 'Market sentiment is bearish. Focus on capital preservation and consider defensive strategies. Look for oversold conditions for potential opportunities.';
  } else {
    aiRecommendation = 'Market sentiment is neutral. This is a good time to review and rebalance your portfolio based on your risk tolerance and investment goals.';
  }
  
  return {
    sentiment,
    trendDirection,
    aiRecommendation
  };
}

function determineRiskTolerance(data: any, riskScore: number): 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'EXTREME' {
  let toleranceScore = 0;
  
  toleranceScore += data.tradeFrequency * 10;
  
  toleranceScore += data.volatilityTolerance * 0.5;
  
  toleranceScore += Math.max(0, (30 - data.averageHoldTime) * 2);
  
  toleranceScore += riskScore * 0.3;
  
  if (toleranceScore < 30) return 'CONSERVATIVE';
  if (toleranceScore < 60) return 'MODERATE';
  if (toleranceScore < 90) return 'AGGRESSIVE';
  return 'EXTREME';
}

function generatePersonalizedRecommendations(
  data: any, 
  riskScore: number, 
  riskProfile: string, 
  marketAnalysis: any, 
  userTradingFactors: any
): string[] {
  const recommendations: string[] = [];
  
  if (riskScore > 70) {
    recommendations.push('Your trading patterns indicate high risk. Consider implementing strict stop-losses and reducing position sizes.');
  } else if (riskScore > 50) {
    recommendations.push('Consider diversifying your portfolio and implementing basic risk management strategies.');
  } else {
    recommendations.push('Your current risk profile is well-managed. Continue with your current strategies.');
  }
  
  if (data.tradeFrequency > 5) {
    recommendations.push('High-frequency trading may lead to increased transaction costs and emotional decisions. Consider longer holding periods.');
  }
  
  if (data.averageHoldTime < 14) {
    recommendations.push('Short holding periods often indicate emotional trading. Consider implementing a minimum 30-day holding rule.');
  }
  
  if (data.diversificationScore < 50) {
    recommendations.push('Your portfolio appears concentrated. Consider spreading investments across different assets and sectors.');
  }
  
  if (marketAnalysis.sentiment === 'BEARISH') {
    recommendations.push('Consider defensive positions, dollar-cost averaging, and focus on capital preservation.');
  } else if (marketAnalysis.sentiment === 'BULLISH') {
    recommendations.push('While markets are bullish, maintain discipline and avoid FOMO-driven decisions.');
  }
  
  if (data.emotionalTradingIndicators.length > 0) {
    recommendations.push('Consider using commitment vaults to lock positions and prevent emotional decisions during market volatility.');
  }
  
  recommendations.push('Consider implementing a systematic investment plan with regular rebalancing to reduce emotional decision-making.');
  
  return recommendations;
}

function formatWalletAnalysisResponse(analysis: WalletAnalysisResult, marketData: MarketData | null): string {
  const riskProfileEmoji = {
    'LOW_RISK': '🟢',
    'MODERATE_RISK': '🟡', 
    'HIGH_RISK': '🟠',
    'EXTREME_RISK': '🔴'
  };
  
  const sentimentEmoji = {
    'BULLISH': '🐂',
    'BEARISH': '🐻',
    'NEUTRAL': '➡️'
  };
  
  const trendEmoji = {
    'UPWARD': '📈',
    'DOWNWARD': '📉',
    'SIDEWAYS': '➡️'
  };
  
  const toleranceEmoji = {
    'CONSERVATIVE': '🛡️',
    'MODERATE': '⚖️',
    'AGGRESSIVE': '🚀',
    'EXTREME': '💥'
  };
  
  let response = `# 📊 **Wallet Trading Analysis Report**
  
## 🎯 **Risk Assessment**
**Risk Score:** ${analysis.riskScore.toFixed(1)}/100
**Confidence Level:** ${analysis.confidencePercentage.toFixed(1)}%
**Risk Profile:** ${riskProfileEmoji[analysis.riskProfile]} ${analysis.riskProfile.replace('_', ' ')}
**Risk Tolerance:** ${toleranceEmoji[analysis.riskTolerance]} ${analysis.riskTolerance}

## 📈 **Current Market Analysis**
**Sentiment:** ${sentimentEmoji[analysis.marketAnalysis.sentiment]} ${analysis.marketAnalysis.sentiment}
**Trend Direction:** ${trendEmoji[analysis.marketAnalysis.trendDirection]} ${analysis.marketAnalysis.trendDirection}
**AI Recommendation:** ${analysis.marketAnalysis.aiRecommendation}

## 🔍 **Your Trading Factors**
• **Average Hold Time:** ${analysis.userTradingFactors.averageHoldTime.toFixed(1)} days${analysis.userTradingFactors.averageHoldTime < 1 ? ' (Very short-term trading)' : analysis.userTradingFactors.averageHoldTime < 7 ? ' (Short-term trading)' : analysis.userTradingFactors.averageHoldTime < 30 ? ' (Medium-term trading)' : ' (Long-term trading)'}
• **Trade Frequency:** ${analysis.userTradingFactors.tradeFrequency.toFixed(1)} trades/week${analysis.userTradingFactors.tradeFrequency > 50 ? ' (Very high frequency)' : analysis.userTradingFactors.tradeFrequency > 20 ? ' (High frequency)' : analysis.userTradingFactors.tradeFrequency > 5 ? ' (Moderate frequency)' : ' (Low frequency)'}
• **Volatility Tolerance:** ${analysis.userTradingFactors.volatilityTolerance.toFixed(1)}/100
• **Diversification Score:** ${analysis.userTradingFactors.diversificationScore.toFixed(1)}/100`;

  if (analysis.userTradingFactors.ethActivity !== undefined) {
    response += `
• **ETH Chain Activity:** ${analysis.userTradingFactors.ethActivity.toFixed(1)}%
• **AVAX Chain Activity:** ${analysis.userTradingFactors.avaxActivity?.toFixed(1) || 'N/A'}%`;
  }

  response += `

**Emotional Trading Indicators:**
${analysis.userTradingFactors.emotionalTradingIndicators.map(indicator => `• ${indicator}`).join('\n')}

## 💡 **Personalized Recommendations**
${analysis.personalizedRecommendations.map(rec => rec).join('\n\n')}

## 🎯 **Next Steps**
Based on your analysis, I recommend:
1. **Review your risk management strategy** - Consider implementing the recommendations above
2. **Set up commitment vaults** - Lock positions to prevent emotional trading
3. **Monitor your progress** - Track improvements in your trading patterns
4. **Regular rebalancing** - Maintain your target risk profile

*This analysis is based on behavioral patterns and market conditions. Always do your own research and consider consulting with a financial advisor.*`;

  if (marketData) {
    const tempRuntime = {
      getSetting: (key: string) => process.env[key] || ''
    } as any;
    const marketDataService = new MarketDataService(tempRuntime);
    response += `\n\n${marketDataService.getMarketContextText(marketData)}`;
  }
  
  return response;
}