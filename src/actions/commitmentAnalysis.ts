import { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { TokenMappingService } from '../services/tokenMapping';
import { MarketDataService } from '../services/marketData';
import { CommitmentAnalysis, FearGreedData, EnhancedCommitmentAnalysis, PriceBasedCommitmentAnalysis, PriceTargetAnalysis } from '../types';
import { formatCommitmentResponse, formatGeneralAnalysis, calculateVolatility, calculateMaxDrawdown, formatPriceBasedCommitmentResponse, calculateAverageAnnualReturn, calculateExpectedReturn, calculatePricePredictions } from '../utils/commitmentUtils';

export const CommitmentAnalysisAction: Action = {
  name: 'FUM_ANALYZE_COMMITMENT',
  similes: ['CHECK_COMMITMENT', 'VALIDATE_LOCK', 'ANALYZE_VAULT', 'RATE_COMMITMENT', 'BEHAVIORAL_ANALYSIS', 'MARKET_INSIGHTS'],
  description: 'Analyzes commitment vault parameters using real market data and Fear & Greed Index, or provides general behavioral insights and market analysis',
  
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    return true
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
      const amountMatch = text.match(/(\d+\.?\d*)\s*(ETH|BTC|USDC|SOL|AVAX|ADA|DOT|MATIC|LINK|UNI|LTC|BCH|XRP|DOGE|SHIB|TRX|ATOM|ETC|BNB|USDT)/i);
      const timeMatch = text.match(/(\d+)\s*(days?|months?|weeks?|years?)/i);
      
      const priceBasedPattern = text.match(/lock\s+(\d+\.?\d*)\s+(ETH|BTC|USDC|SOL|AVAX|ADA|DOT|MATIC|LINK|UNI|LTC|BCH|XRP|DOGE|SHIB|TRX|ATOM|ETC|BNB|USDT)\s+until\s+(?:either\s+)?(?:the\s+)?price\s+(?:goes\s+)?(?:up\s+)?to\s+\$?(\d+\.?\d*)\s+(?:or|and)\s+(?:price\s+)?(?:goes\s+)?(?:down\s+)?to\s+\$?(\d+\.?\d*)/i) ||
                               text.match(/lock\s+(\d+\.?\d*)\s+(ETH|BTC|USDC|SOL|AVAX|ADA|DOT|MATIC|LINK|UNI|LTC|BCH|XRP|DOGE|SHIB|TRX|ATOM|ETC|BNB|USDT)\s+until\s+(?:the\s+)?price\s+(?:reaches|hits)?\s*\$?(\d+\.?\d*)\s+or\s+\$?(\d+\.?\d*)/i) ||
                               text.match(/lock\s+(\d+\.?\d*)\s+(ETH|BTC|USDC|SOL|AVAX|ADA|DOT|MATIC|LINK|UNI|LTC|BCH|XRP|DOGE|SHIB|TRX|ATOM|ETC|BNB|USDT)\s+(?:until|till)\s+\$?(\d+\.?\d*)\s+or\s+\$?(\d+\.?\d*)/i);
      
      const tokenService = new TokenMappingService(runtime);
      const marketDataService = new MarketDataService(runtime);
      
      const marketData = await marketDataService.getMarketData();
      let fearGreedData: FearGreedData | null = null;
      
      if (marketData) {
        fearGreedData = {
          value: marketData.fearGreedIndex,
          classification: marketData.sentiment,
          timestamp: marketData.timestamp
        };
      }
      
      if (priceBasedPattern) {
        const amount = parseFloat(priceBasedPattern[1]);
        const tokenSymbol = priceBasedPattern[2].toUpperCase();
        const upTarget = parseFloat(priceBasedPattern[3]);
        const downTarget = parseFloat(priceBasedPattern[4]);
        
        const tokenData = await tokenService.getTokenData(tokenSymbol);
        
        if (!tokenData) {
          const suggestions = await tokenService.getSuggestedTokens(tokenSymbol);
          const commonTokens = tokenService.getCommonTokens();
          
          let errorMessage = `I couldn't find data for "${tokenSymbol}". `;
          
          if (suggestions.length > 0) {
            errorMessage += `Did you mean one of these?\n`;
            suggestions.slice(0, 5).forEach(suggestion => {
              errorMessage += `• ${suggestion.symbol.toUpperCase()} (${suggestion.name})\n`;
            });
          } else {
            errorMessage += `Here are some popular tokens you can use:\n`;
            Object.keys(commonTokens).slice(0, 10).forEach(symbol => {
              errorMessage += `• ${symbol.toUpperCase()}\n`;
            });
          }
          
          errorMessage += `\nPlease try again with a valid token symbol.`;
          
          await callback?.({
            text: errorMessage,
            thought: `Token ${tokenSymbol} not found in CoinGecko database`,
            actions: ['FUM_ANALYZE_COMMITMENT']
          });
          return false;
        }

        const historicalData = await tokenService.getHistoricalData(tokenSymbol, 365);
        
        const analysis = await analyzePriceBasedCommitment(
          tokenData,
          historicalData,
          amount,
          tokenSymbol,
          upTarget,
          downTarget,
          fearGreedData
        );
        
        await callback?.({
          text: formatPriceBasedCommitmentResponse(analysis, fearGreedData),
          thought: `Analyzed price-based commitment: ${amount} ${tokenSymbol} until price reaches $${upTarget} or $${downTarget} with real market data and Fear & Greed Index`,
          actions: ['FUM_ANALYZE_COMMITMENT'],
          metadata: {
            amount,
            token: tokenSymbol,
            upTarget,
            downTarget,
            analysis: analysis,
            fearGreedIndex: fearGreedData?.value || null,
            marketData: marketData
          }
        });
        
        return true;
      }
      
      if (amountMatch && timeMatch) {
        const amount = parseFloat(amountMatch[1]);
        const tokenSymbol = amountMatch[2].toUpperCase();
        const duration = parseInt(timeMatch[1]);
        const unit = timeMatch[2].toLowerCase();
        
        let durationInDays = duration;
        if (unit.includes('week')) durationInDays *= 7;
        if (unit.includes('month')) durationInDays *= 30;
        if (unit.includes('year')) durationInDays *= 365;
        
        const tokenData = await tokenService.getTokenData(tokenSymbol);
        
        if (!tokenData) {
          const suggestions = await tokenService.getSuggestedTokens(tokenSymbol);
          const commonTokens = tokenService.getCommonTokens();
          
          let errorMessage = `I couldn't find data for "${tokenSymbol}". `;
          
          if (suggestions.length > 0) {
            errorMessage += `Did you mean one of these?\n`;
            suggestions.slice(0, 5).forEach(suggestion => {
              errorMessage += `• ${suggestion.symbol.toUpperCase()} (${suggestion.name})\n`;
            });
          } else {
            errorMessage += `Here are some popular tokens you can use:\n`;
            Object.keys(commonTokens).slice(0, 10).forEach(symbol => {
              errorMessage += `• ${symbol.toUpperCase()}\n`;
            });
          }
          
          errorMessage += `\nPlease try again with a valid token symbol.`;
          
          await callback?.({
            text: errorMessage,
            thought: `Token ${tokenSymbol} not found in CoinGecko database`,
            actions: ['FUM_ANALYZE_COMMITMENT']
          });
          return false;
        }

        const historicalData = await tokenService.getHistoricalData(tokenSymbol, Math.max(365, durationInDays));
        
        const analysis = await analyzeCommitmentWithRealData(
          tokenData, 
          historicalData, 
          amount, 
          durationInDays,
          tokenSymbol,
          fearGreedData
        );
        
        await callback?.({
          text: formatCommitmentResponse(analysis, amount, tokenSymbol, duration, unit, tokenData, fearGreedData),
          thought: `Analyzed commitment: ${amount} ${tokenSymbol} for ${duration} ${unit} with real market data, Fear & Greed Index, and price predictions`,
          actions: ['FUM_ANALYZE_COMMITMENT'],
          metadata: {
            amount,
            token: tokenSymbol,
            durationInDays,
            score: analysis.score,
            recommendation: analysis.recommendation,
            riskLevel: analysis.riskLevel,
            fearGreedIndex: fearGreedData?.value || null,
            marketData: marketData,
            expectedReturn: analysis.expectedReturn,
            pricePredictions: analysis.pricePredictions
          }
        });
        
        return true;
      } else {
        await callback?.({
          text: formatGeneralAnalysis(text, fearGreedData, marketData),
          thought: `Provided general market analysis and behavioral insights for user query: "${text}"`,
          actions: ['FUM_ANALYZE_COMMITMENT'],
          metadata: {
            fearGreedIndex: fearGreedData?.value || null,
            marketData: marketData,
            analysisType: 'general'
          }
        });
        
        return true;
      }
      
    } catch (error) {
      console.error('Error in commitment analysis:', error);
      await callback?.({
        text: 'I encountered an error while analyzing your request. Please try again.',
        thought: `Error: ${error.message}`,
        actions: ['FUM_ANALYZE_COMMITMENT']
      });
      return false;
    }
  },
  
  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'I want to lock 10 ETH for 3 months' }
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Analyzing your commitment proposal with real market data and Fear & Greed Index...',
          actions: ['FUM_ANALYZE_COMMITMENT']
        }
      }
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'I\'m feeling FOMO about missing out on gains' }
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Providing behavioral analysis and market insights to help with FOMO concerns...',
          actions: ['FUM_ANALYZE_COMMITMENT']
        }
      }
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'What\'s the current market sentiment?' }
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Analyzing current market conditions and behavioral insights...',
          actions: ['FUM_ANALYZE_COMMITMENT']
        }
      }
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'I want to lock 3 ETH until either the price goes up to $3000 or goes down to $2000' }
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Analyzing your price-based commitment proposal...',
          actions: ['FUM_ANALYZE_COMMITMENT']
        }
      }
    ]
  ]
};

async function analyzeCommitmentWithRealData(
  tokenData: any,
  historicalData: number[][] | null,
  amount: number,
  durationInDays: number,
  tokenSymbol: string,
  fearGreedData: FearGreedData | null
): Promise<EnhancedCommitmentAnalysis> {
  const currentPrice = tokenData?.market_data?.current_price?.usd || tokenData?.current_price || 0;
  const totalValue = amount * currentPrice;
  const priceChange30d = tokenData?.market_data?.price_change_percentage_30d || tokenData?.price_change_percentage_30d || 0;
  const marketCap = tokenData?.market_data?.market_cap?.usd || tokenData?.market_cap || 0;
  const athChange = tokenData?.market_data?.ath_change_percentage?.usd || tokenData?.ath_change_percentage || 0;
  
  let score = 75;
  const factors: string[] = [];
  const behavioralInsights: string[] = [];
  const marketConditions: string[] = [];
  const suggestedOptimizations: string[] = [];
  const fearGreedInsights: string[] = [];

  if (durationInDays < 30) {
    score -= 15;
    factors.push('Short duration may not provide meaningful commitment benefits');
    behavioralInsights.push('Short locks often lead to premature exits during volatility');
  } else if (durationInDays > 365) {
    score -= 10;
    factors.push('Very long duration increases opportunity cost and reduces flexibility');
    behavioralInsights.push('Long-term commitments require strong conviction in the asset');
  } else if (durationInDays >= 90 && durationInDays <= 180) {
    score += 10;
    factors.push('Optimal duration for behavioral change and market cycle coverage');
    behavioralInsights.push('3-6 month commitments align with typical market cycles');
  }

  if (totalValue > 10000) {
    score -= 10;
    factors.push('Large commitment - ensure this represents less than 30% of portfolio');
    behavioralInsights.push('Large amounts increase emotional pressure during volatility');
  } else if (totalValue < 100) {
    score -= 5;
    factors.push('Small amount may not provide meaningful behavioral benefits');
    behavioralInsights.push('Small commitments may not create sufficient psychological barrier');
  }

  if (priceChange30d < -20) {
    score += 10;
    factors.push(`Recent 30-day decline of ${priceChange30d.toFixed(1)}% may present buying opportunity`);
    marketConditions.push('Asset trading significantly below recent highs');
  } else if (priceChange30d > 50) {
    score -= 10;
    factors.push(`Recent 30-day gains of ${priceChange30d.toFixed(1)}% may indicate overvaluation`);
    marketConditions.push('Asset trading significantly above recent averages');
  }

  if (fearGreedData) {
    const fearGreedValue = fearGreedData.value;    
    if (fearGreedValue <= 25) {
      score += 20;
      factors.push(`Extreme Fear & Greed Index (${fearGreedValue}) - historically excellent buying opportunity`);
      fearGreedInsights.push('Extreme fear periods historically mark major market bottoms');
      fearGreedInsights.push('73% of major crypto rallies begin during extreme fear periods');
      behavioralInsights.push('Fear periods are optimal for commitment strategies');
      behavioralInsights.push('Market fear often creates the best long-term opportunities');
      marketConditions.push('Fear & Greed Index suggests potential buying opportunity');
    }
    else if (fearGreedValue <= 45) {
      score += 10;
      factors.push(`Fear & Greed Index (${fearGreedValue}) - good buying opportunity`);
      fearGreedInsights.push('Fear periods often precede accumulation phases');
      fearGreedInsights.push('Patient investors typically outperform during fear periods');
      behavioralInsights.push('Fear periods reduce FOMO and emotional trading');
    }
    else if (fearGreedValue <= 55) {
      factors.push(`Neutral Fear & Greed Index (${fearGreedValue}) - balanced market conditions`);
      fearGreedInsights.push('Neutral sentiment suggests stable market conditions');
      fearGreedInsights.push('Good time for systematic commitment strategies');
    }
    else if (fearGreedValue <= 75) {
      score -= 10;
      factors.push(`Greed & Fear Index (${fearGreedValue}) - caution advised`);
      fearGreedInsights.push('Greed periods often precede market corrections');
      fearGreedInsights.push('Consider shorter commitment durations during greed');
      behavioralInsights.push('Greed periods increase FOMO and emotional trading risk');
      marketConditions.push('Greed & Greed Index suggests caution - consider waiting');
    }
    else {
      score -= 20;
      factors.push(`Extreme Greed & Fear Index (${fearGreedValue}) - high risk of correction`);
      fearGreedInsights.push('Extreme greed historically marks market tops');
      fearGreedInsights.push('87% of major corrections occur during extreme greed');
      behavioralInsights.push('Extreme greed periods often precede significant losses');
      marketConditions.push('Extreme greed suggests potential market top');
      suggestedOptimizations.push('Wait for market sentiment to improve before committing');
      suggestedOptimizations.push('Consider a shorter duration to test the waters');
    }
  } else {
    factors.push('Fear & Greed Index unavailable - using other market indicators');
  }

  if (historicalData && historicalData.length > 1) {
    const volatility = calculateVolatility(historicalData);
    const maxDrawdown = calculateMaxDrawdown(historicalData);
    
    if (volatility > 0.8) {
      score -= 20;
      factors.push(`High volatility (${(volatility * 100).toFixed(1)}%) increases risk of significant drawdowns`);
      marketConditions.push('High volatility environment - consider shorter duration or smaller amount');
    } else if (volatility < 0.4) {
      score += 5;
      factors.push(`Low volatility (${(volatility * 100).toFixed(1)}%) suggests stable price action`);
      marketConditions.push('Low volatility environment favorable for longer commitments');
    }

    if (maxDrawdown > 0.5) {
      score -= 10;
      factors.push(`Historical max drawdown of ${(maxDrawdown * 100).toFixed(1)}% indicates high risk`);
      marketConditions.push('Asset has experienced significant historical losses');
    }
  }

  if (marketCap > 10000000000) {
    factors.push('Large market cap suggests established, less volatile asset');
    score += 5;
  } else if (marketCap < 100000000) {
    factors.push('Small market cap indicates higher risk and volatility');
    score -= 10;
  }
  
  if (athChange < -50) {
    score += 5;
    factors.push(`Trading ${Math.abs(athChange).toFixed(1)}% below all-time high - potential value opportunity`);
  } else if (athChange > -10) {
    score -= 5;
    factors.push(`Trading close to all-time high - consider waiting for pullback`);
  }

  if (durationInDays >= 90) {
    behavioralInsights.push('90+ day commitments help break emotional trading patterns');
    behavioralInsights.push('Longer locks reduce FOMO and panic selling impulses');
  }

  if (score < 70) {
    suggestedOptimizations.push('Consider reducing the commitment amount');
    suggestedOptimizations.push('Shorten the lock duration to reduce risk');
  }
  
  if (priceChange30d > 30) {
    suggestedOptimizations.push('Consider waiting for a pullback before committing');
    suggestedOptimizations.push('Implement dollar-cost averaging instead of lump sum');
  }

  if (totalValue > 5000) {
    suggestedOptimizations.push('Add price-based unlock conditions for downside protection');
    suggestedOptimizations.push('Consider splitting the commitment into smaller amounts');
  }

  if (fearGreedData && fearGreedData.value > 75) {
    suggestedOptimizations.push('Consider waiting for fear sentiment to return');
    suggestedOptimizations.push('Implement smaller, incremental commitments');
  } else if (fearGreedData && fearGreedData.value < 25) {
    suggestedOptimizations.push('Excellent timing - consider increasing commitment amount');
    suggestedOptimizations.push('Extend duration to capture full recovery cycle');
  }

  let recommendation: CommitmentAnalysis['recommendation'] = 'NEUTRAL';
  if (score >= 85) recommendation = 'HIGHLY_RECOMMENDED';
  else if (score >= 70) recommendation = 'RECOMMENDED';
  else if (score >= 50) recommendation = 'CAUTION';
  else recommendation = 'NOT_RECOMMENDED';

  let riskLevel: CommitmentAnalysis['riskLevel'] = 'MODERATE';
  if (priceChange30d > 50 || (historicalData && calculateVolatility(historicalData) > 0.8) || (fearGreedData && fearGreedData.value > 75)) riskLevel = 'EXTREME';
  else if (priceChange30d > 20 || (historicalData && calculateVolatility(historicalData) > 0.6) || (fearGreedData && fearGreedData.value > 60)) riskLevel = 'HIGH';
  else if (priceChange30d < -10 && marketCap > 1000000000 && (fearGreedData && fearGreedData.value < 30)) riskLevel = 'LOW';

  const pricePredictions = await calculatePricePredictions(
    tokenData,
    historicalData,
    durationInDays,
    currentPrice,
    fearGreedData
  );

  const durationUnit = durationInDays >= 365 ? 'years' : 
                      durationInDays >= 30 ? 'months' : 'days';

  const expectedReturn = await calculateExpectedReturn(
    amount,
    currentPrice,
    pricePredictions,
    durationInDays,
    durationUnit
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    recommendation,
    factors,
    riskLevel,
    behavioralInsights,
    marketConditions,
    suggestedOptimizations,
    fearGreedInsights,
    expectedReturn,
    pricePredictions
  };
}

async function analyzePriceBasedCommitment(
  tokenData: any,
  historicalData: number[][] | null,
  amount: number,
  tokenSymbol: string,
  upTarget: number,
  downTarget: number,
  fearGreedData: FearGreedData | null
): Promise<PriceBasedCommitmentAnalysis> {
  const currentPrice = tokenData?.market_data?.current_price?.usd || tokenData?.current_price || 0;

  if (upTarget <= currentPrice) {
    throw new Error(`Up target (${upTarget}) must be higher than current price (${currentPrice})`);
  }
  if (downTarget >= currentPrice) {
    throw new Error(`Down target (${downTarget}) must be lower than current price (${currentPrice})`);
  }
  
  const upTargetAnalysis = await analyzePriceTarget(
    currentPrice,
    upTarget,
    'UP',
    historicalData,
    fearGreedData,
    tokenData
  );
  
  const downTargetAnalysis = await analyzePriceTarget(
    currentPrice,
    downTarget,
    'DOWN',
    historicalData,
    fearGreedData,
    tokenData
  );
  
  const upScenarioReturn = (upTarget - currentPrice) / currentPrice * 100;
  const downScenarioReturn = (downTarget - currentPrice) / currentPrice * 100;
  
  const weightedAverage = (upScenarioReturn * upTargetAnalysis.probability + 
                          downScenarioReturn * downTargetAnalysis.probability) / 100;
  
  const bestCase = Math.max(upScenarioReturn, downScenarioReturn);
  const worstCase = Math.min(upScenarioReturn, downScenarioReturn);
  
  let overallRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' = 'MODERATE';
  const upRisk = upTargetAnalysis.expectedDays > 365 ? 2 : upTargetAnalysis.expectedDays > 180 ? 1 : 0;
  const downRisk = downTargetAnalysis.expectedDays < 30 ? 2 : downTargetAnalysis.expectedDays < 90 ? 1 : 0;
  const volatilityRisk = historicalData && calculateVolatility(historicalData) > 0.8 ? 2 : 
                        historicalData && calculateVolatility(historicalData) > 0.6 ? 1 : 0;
  const fearGreedRisk = fearGreedData && fearGreedData.value > 75 ? 2 : 
                       fearGreedData && fearGreedData.value > 60 ? 1 : 0;
  
  const totalRisk = upRisk + downRisk + volatilityRisk + fearGreedRisk;
  if (totalRisk >= 6) overallRisk = 'EXTREME';
  else if (totalRisk >= 4) overallRisk = 'HIGH';
  else if (totalRisk <= 1) overallRisk = 'LOW';
  
  const insights: string[] = [];
  const recommendations: string[] = [];
  
  if (upTargetAnalysis.probability > 0.7) {
    insights.push(`High probability (${(upTargetAnalysis.probability * 100).toFixed(1)}%) of reaching up target in ${upTargetAnalysis.expectedDays} days`);
  } else if (upTargetAnalysis.probability < 0.3) {
    insights.push(`Low probability (${(upTargetAnalysis.probability * 100).toFixed(1)}%) of reaching up target - consider adjusting target`);
    recommendations.push('Consider lowering the up target for higher probability of success');
  }
  
  if (downTargetAnalysis.probability > 0.7) {
    insights.push(`High probability (${(downTargetAnalysis.probability * 100).toFixed(1)}%) of reaching down target in ${downTargetAnalysis.expectedDays} days`);
  } else if (downTargetAnalysis.probability < 0.3) {
    insights.push(`Low probability (${(downTargetAnalysis.probability * 100).toFixed(1)}%) of reaching down target - good downside protection`);
  }
  
  if (upTargetAnalysis.expectedDays > 365) {
    insights.push('Up target may take over a year to reach - consider shorter-term strategy');
    recommendations.push('Consider a shorter-term commitment or lower up target');
  }
  
  if (downTargetAnalysis.expectedDays < 30) {
    insights.push('Down target could be reached quickly - high risk of early exit');
    recommendations.push('Consider setting a lower down target for better protection');
  }
  
  if (fearGreedData) {
    if (fearGreedData.value <= 25) {
      insights.push('Extreme fear sentiment - excellent timing for price-based commitments');
      recommendations.push('Consider increasing the amount due to favorable market conditions');
    } else if (fearGreedData.value >= 75) {
      insights.push('Extreme greed sentiment - high risk of market correction');
      recommendations.push('Consider waiting for better market conditions or reducing amount');
    }
  }
  
  if (Math.abs(upScenarioReturn) > 100) {
    insights.push('Large potential gains but also high volatility risk');
    recommendations.push('Consider implementing stop-loss mechanisms');
  }
  
  if (Math.abs(downScenarioReturn) > 50) {
    insights.push('Significant downside risk - ensure this represents acceptable loss');
    recommendations.push('Consider reducing the commitment amount');
  }
  
  return {
    amount,
    tokenSymbol,
    currentPrice,
    upTarget,
    downTarget,
    upTargetAnalysis,
    downTargetAnalysis,
    overallRisk,
    expectedReturn: {
      upScenario: upScenarioReturn,
      downScenario: downScenarioReturn,
      weightedAverage,
      bestCase,
      worstCase
    },
    insights,
    recommendations,
    timeToReachTargets: {
      upTarget: upTargetAnalysis.expectedDays,
      downTarget: downTargetAnalysis.expectedDays,
      averageTime: (upTargetAnalysis.expectedDays + downTargetAnalysis.expectedDays) / 2
    }
  };
}

async function analyzePriceTarget(
  currentPrice: number,
  targetPrice: number,
  targetType: 'UP' | 'DOWN',
  historicalData: number[][] | null,
  fearGreedData: FearGreedData | null,
  tokenData: any
): Promise<PriceTargetAnalysis> {
  const priceChange = targetPrice - currentPrice;
  const priceChangePercentage = (priceChange / currentPrice) * 100;
  
  let expectedDays = 180;
  let confidence = 0.5;
  let probability = 0.5;
  const riskFactors: string[] = [];
  const marketConditions: string[] = [];
  
  if (historicalData && historicalData.length > 1) {
    const volatility = calculateVolatility(historicalData);
    const avgAnnualReturn = calculateAverageAnnualReturn(historicalData);
    const maxDrawdown = calculateMaxDrawdown(historicalData);
    
    if (targetType === 'UP') {
      if (avgAnnualReturn > 0) {
        expectedDays = Math.abs(priceChangePercentage / (avgAnnualReturn * 100)) * 365;
      } else {
        expectedDays = 365;
      }
    } else {
      const avgDailyMove = volatility / Math.sqrt(365);
      expectedDays = Math.abs(priceChangePercentage / (avgDailyMove * 100));
    }
    
    if (volatility > 0.8) {
      expectedDays *= 0.7;
      riskFactors.push(`High volatility (${(volatility * 100).toFixed(1)}%) increases price movement speed`);
    } else if (volatility < 0.4) {
      expectedDays *= 1.3;
      marketConditions.push(`Low volatility (${(volatility * 100).toFixed(1)}%) suggests stable price action`);
    }
    
    confidence = Math.max(0.1, Math.min(0.8, 0.4 + 
      (historicalData.length > 100 ? 0.2 : 0) +
      (volatility < 0.6 ? 0.1 : -0.1)
    ));
    
    if (targetType === 'UP') {
      if (avgAnnualReturn > 0.2) {
        probability = Math.min(0.8, 0.5 + (avgAnnualReturn - 0.2) * 2);
      } else if (avgAnnualReturn < -0.2) {
        probability = Math.max(0.2, 0.5 + (avgAnnualReturn + 0.2) * 2);
      }
    } else {
      if (maxDrawdown > 0.5) {
        probability = Math.min(0.8, 0.5 + (maxDrawdown - 0.5) * 2);
      } else {
        probability = Math.max(0.2, 0.5 - (0.5 - maxDrawdown) * 2);
      }
    }
    
  } else {
    const priceChange30d = tokenData?.market_data?.price_change_percentage_30d || tokenData?.price_change_percentage_30d || 0;
    
    if (targetType === 'UP') {
      if (priceChange30d > 20) {
        expectedDays = 90;
        probability = 0.6;
      } else if (priceChange30d < -20) {
        expectedDays = 180;
        probability = 0.4;
      } else {
        expectedDays = 120;
        probability = 0.5;
      }
    } else {
      if (priceChange30d < -20) {
        expectedDays = 30;
        probability = 0.7;
      } else if (priceChange30d > 20) {
        expectedDays = 90;
        probability = 0.3;
      } else {
        expectedDays = 60;
        probability = 0.5;
      }
    }
    
    confidence = 0.3;
    riskFactors.push('Limited historical data available for analysis');
  }
  
  if (fearGreedData) {
    if (targetType === 'UP') {
      if (fearGreedData.value <= 25) {
        expectedDays *= 0.8;
        probability = Math.min(0.9, probability + 0.2);
        marketConditions.push('Extreme fear sentiment favors upward price movement');
      } else if (fearGreedData.value >= 75) {
        expectedDays *= 1.5;
        probability = Math.max(0.1, probability - 0.2);
        riskFactors.push('Extreme greed sentiment may limit upside potential');
      }
    } else {
      if (fearGreedData.value >= 75) {
        expectedDays *= 0.7;
        probability = Math.min(0.9, probability + 0.2);
        riskFactors.push('Extreme greed sentiment increases downside risk');
      } else if (fearGreedData.value <= 25) {
        expectedDays *= 1.3;
        probability = Math.max(0.1, probability - 0.2);
        marketConditions.push('Extreme fear sentiment may limit further downside');
      }
    }
  }
  
  expectedDays = Math.max(7, Math.min(730, expectedDays));
  probability = Math.max(0.1, Math.min(0.9, probability));
  confidence = Math.max(0.1, Math.min(0.9, confidence));
  
  return {
    targetPrice,
    targetType,
    expectedDays: Math.round(expectedDays),
    confidence,
    probability,
    riskFactors,
    marketConditions
  };
}