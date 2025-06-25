import { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { TokenMappingService } from '../services/tokenMapping';
import { MarketDataService } from '../services/marketData';
import { CommitmentAnalysis, FearGreedData, EnhancedCommitmentAnalysis, PricePrediction, ExpectedReturn, PriceBasedCommitmentAnalysis, PriceTargetAnalysis } from '../types';

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
  const durationValue = durationInDays >= 365 ? Math.round(durationInDays / 365) :
                       durationInDays >= 30 ? Math.round(durationInDays / 30) : durationInDays;

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

function calculateVolatility(prices: number[][]): number {
  if (prices.length < 2) return 0;
  
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    const return_ = (prices[i][1] - prices[i-1][1]) / prices[i-1][1];
    returns.push(return_);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(365);
  
  return volatility;
}

function calculateMaxDrawdown(prices: number[][]): number {
  if (prices.length < 2) return 0;
  
  let maxDrawdown = 0;
  let peak = prices[0][1];
  
  for (const price of prices) {
    if (price[1] > peak) {
      peak = price[1];
    }
    const drawdown = (peak - price[1]) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown;
}

function formatCommitmentResponse(
  analysis: EnhancedCommitmentAnalysis, 
  amount: number, 
  tokenSymbol: string, 
  duration: number, 
  unit: string,
  tokenData: any,
  fearGreedData: FearGreedData | null
): string {
  console.log('Formatting commitment response parameters:', {
    analysis: analysis,
    amount: amount,
    tokenSymbol: tokenSymbol,
    duration: duration,
    unit: unit,
    tokenData: tokenData,
    fearGreedData: fearGreedData
  });
  
  const { score, recommendation, factors, riskLevel, behavioralInsights, marketConditions, suggestedOptimizations, fearGreedInsights, expectedReturn, pricePredictions } = analysis;
  
  let emoji = '✅';
  let action = 'This is a solid commitment';
  if (recommendation === 'NOT_RECOMMENDED') {
    emoji = '❌';
    action = 'I strongly advise against this commitment';
  } else if (recommendation === 'CAUTION') {
    emoji = '⚠️';
    action = 'I recommend reconsidering this commitment';
  } else if (recommendation === 'HIGHLY_RECOMMENDED') {
    emoji = '🌟';
    action = 'This is an excellent commitment strategy';
  }
  
  const currentPrice = tokenData?.market_data?.current_price?.usd || tokenData?.current_price || 0;
  const totalValue = amount * currentPrice;
  const priceChange24h = tokenData?.market_data?.price_change_percentage_24h || tokenData?.price_change_percentage_24h || 0;
  const priceChange7d = tokenData?.market_data?.price_change_percentage_7d || tokenData?.price_change_percentage_7d || 0;
  const priceChange30d = tokenData?.market_data?.price_change_percentage_30d || tokenData?.price_change_percentage_30d || 0;
  const marketCap = tokenData?.market_data?.market_cap?.usd || tokenData?.market_cap || 0;
  const volume24h = tokenData?.market_data?.total_volume?.usd || tokenData?.volume_24h || 0;
  

  const formatPercentage = (num: number): string => {
    if (typeof num !== 'number' || isNaN(num)) return '0.00';
    return num.toFixed ? num.toFixed(2) : num.toString();
  };
  
  const formatCurrency = (num: number): string => {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return num.toLocaleString ? num.toLocaleString() : num.toString();
  };
  
  let fearGreedDisplay = '';
  if (fearGreedData) {
    const fearGreedEmoji = fearGreedData.value <= 25 ? '😱' : 
                          fearGreedData.value <= 45 ? '😨' : 
                          fearGreedData.value <= 55 ? '😐' : 
                          fearGreedData.value <= 75 ? '😏' : '🤪';
    
    fearGreedDisplay = `**Fear & Greed Index:** ${fearGreedData.value} (${fearGreedData.classification}) ${fearGreedEmoji}`;
  }
  
  const formatPricePredictions = (predictions: PricePrediction[]): string => {
    return predictions.map(p => {
      const dateStr = p.targetDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: p.targetDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      });
      const confidenceEmoji = p.confidence >= 0.7 ? '🟢' : p.confidence >= 0.5 ? '🟡' : '🔴';
      return `• ${dateStr}: $${formatCurrency(p.predictedPrice)} (${p.priceChangePercentage > 0 ? '+' : ''}${formatPercentage(p.priceChangePercentage)}%) ${confidenceEmoji}`;
    }).join('\n');
  };
  
  return `${emoji} **Real-Time Commitment Analysis**

**Proposal:** Lock ${amount} ${tokenSymbol} for ${duration} ${unit}
**Current Price:** $${formatCurrency(currentPrice)} (${priceChange24h > 0 ? '+' : ''}${formatPercentage(priceChange24h)}% 24h)
**Total Value:** $${formatCurrency(totalValue)}
**Commitment Score:** ${score}/100

${fearGreedDisplay}

**Market Context:**
• 7-day change: ${priceChange7d > 0 ? '+' : ''}${formatPercentage(priceChange7d)}%
• 30-day change: ${priceChange30d > 0 ? '+' : ''}${formatPercentage(priceChange30d)}%
• Market Cap: $${formatCurrency(marketCap / 1000000)}M
• 24h Volume: $${formatCurrency(volume24h / 1000000)}M

**📈 Expected Return Analysis:**
• **Initial Investment:** $${formatCurrency(expectedReturn.initialInvestment)}
• **Predicted Value:** $${formatCurrency(expectedReturn.predictedValue)}
• **Expected Return:** $${formatCurrency(expectedReturn.expectedReturn)} (${expectedReturn.expectedReturnPercentage > 0 ? '+' : ''}${formatPercentage(expectedReturn.expectedReturnPercentage)}%)
• **Best Case:** $${formatCurrency(expectedReturn.bestCaseScenario)} (${((expectedReturn.bestCaseScenario - expectedReturn.initialInvestment) / expectedReturn.initialInvestment * 100) > 0 ? '+' : ''}${formatPercentage((expectedReturn.bestCaseScenario - expectedReturn.initialInvestment) / expectedReturn.initialInvestment * 100)}%)
• **Worst Case:** $${formatCurrency(expectedReturn.worstCaseScenario)} (${((expectedReturn.worstCaseScenario - expectedReturn.initialInvestment) / expectedReturn.initialInvestment * 100) > 0 ? '+' : ''}${formatPercentage((expectedReturn.worstCaseScenario - expectedReturn.initialInvestment) / expectedReturn.initialInvestment * 100)}%)
• **Confidence:** ${formatPercentage(expectedReturn.confidence * 100)}%

**📊 Price Predictions:**
${formatPricePredictions(pricePredictions)}

**Analysis:**
${factors.map(f => `• ${f}`).join('\n')}

**Risk Level:** ${riskLevel} ${riskLevel === 'EXTREME' ? '🔥' : riskLevel === 'HIGH' ? '⚠️' : riskLevel === 'LOW' ? '🟢' : '🟡'}

**Behavioral Insights:**
${behavioralInsights.map(insight => `• ${insight}`).join('\n')}

**Market Conditions:**
${marketConditions.map(condition => `• ${condition}`).join('\n')}

**Fear & Greed Insights:**
${fearGreedInsights.length > 0 ? fearGreedInsights.map((insight, index) => `${index + 1}. ${insight}`).join('\n') : '• Market sentiment data unavailable'}

**Recommendation:** ${action}

**Suggested Optimizations:**
${suggestedOptimizations.map((opt, index) => `${index + 1}. ${opt}`).join('\n')}

Would you like me to help you optimize this commitment or proceed with the vault creation?`;
}

function formatGeneralAnalysis(text: string, fearGreedData: FearGreedData | null, marketData: any): string {
  return `Please provide a commitment proposal for analysis.`;
}

async function calculatePricePredictions(
  tokenData: any,
  historicalData: number[][] | null,
  durationInDays: number,
  currentPrice: number,
  fearGreedData: FearGreedData | null
): Promise<PricePrediction[]> {
  const predictions: PricePrediction[] = [];
  
  const timePoints = [
    { days: 7, label: '1 week' },
    { days: 30, label: '1 month' },
    { days: 90, label: '3 months' },
    { days: 180, label: '6 months' },
    { days: 365, label: '1 year' }
  ].filter(tp => tp.days <= durationInDays);
  
  if (durationInDays > 365) {
    timePoints.push({ days: durationInDays, label: `${Math.round(durationInDays / 30)} months` });
  }
  
  for (const timePoint of timePoints) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + timePoint.days);
    
    let predictedPrice = currentPrice;
    let confidence = 0.5;
    const factors: string[] = [];
    
    if (historicalData && historicalData.length > 1) {
      const volatility = calculateVolatility(historicalData);
      const avgAnnualReturn = calculateAverageAnnualReturn(historicalData);
      const maxDrawdown = calculateMaxDrawdown(historicalData);
      
      const expectedReturn = avgAnnualReturn * (timePoint.days / 365);
      const volatilityAdjustment = volatility * Math.sqrt(timePoint.days / 365);
      
      let sentimentMultiplier = 1.0;
      if (fearGreedData) {
        if (fearGreedData.value <= 25) {
          sentimentMultiplier = 1.2;
          factors.push('Extreme fear sentiment suggests strong recovery potential');
        } else if (fearGreedData.value <= 45) {
          sentimentMultiplier = 1.1;
          factors.push('Fear sentiment indicates potential recovery');
        } else if (fearGreedData.value >= 75) {
          sentimentMultiplier = 0.6;
          factors.push('Extreme greed suggests potential market correction');
        } else if (fearGreedData.value >= 60) {
          sentimentMultiplier = 0.8;
          factors.push('Greed sentiment suggests potential pullback');
        }
      }
      
      // More conservative base prediction
      const basePrediction = currentPrice * (1 + expectedReturn * sentimentMultiplier);
      
      // Add realistic volatility-based uncertainty
      const volatilityRange = currentPrice * volatilityAdjustment * 0.5; // Reduce volatility impact
      predictedPrice = basePrediction;
      
      confidence = Math.max(0.1, Math.min(0.8, 0.4 + 
        (timePoint.days < 30 ? 0.2 : 0) +
        (volatility < 0.5 ? 0.1 : -0.1) +
        (historicalData.length > 100 ? 0.1 : -0.1) +
        (fearGreedData ? 0.1 : 0)
      ));
      
      factors.push(`Historical volatility: ${(volatility * 100).toFixed(1)}%`);
      factors.push(`Average annual return: ${(avgAnnualReturn * 100).toFixed(1)}%`);
      factors.push(`Expected return for ${timePoint.label}: ${(expectedReturn * 100).toFixed(1)}%`);
      
    } else {
      const marketCap = tokenData?.market_data?.market_cap?.usd || tokenData?.market_cap || 0;
      const priceChange30d = tokenData?.market_data?.price_change_percentage_30d || tokenData?.price_change_percentage_30d || 0;
      
      let trendMultiplier = 1.0;
      if (priceChange30d > 20) {
        trendMultiplier = 0.7;
        factors.push('Recent strong gains suggest potential pullback');
      } else if (priceChange30d < -20) {
        trendMultiplier = 1.1;
        factors.push('Recent losses suggest potential recovery');
      }
      
      if (marketCap > 10000000000) {
        trendMultiplier *= 0.9;
        factors.push('Large market cap suggests slower growth');
      } else if (marketCap < 100000000) {
        trendMultiplier *= 1.2;
        factors.push('Small market cap suggests higher growth potential');
      }
      
      // More conservative prediction without historical data
      predictedPrice = currentPrice * (1 + (timePoint.days / 365) * 0.15 * trendMultiplier);
      confidence = 0.25;
      factors.push('Limited historical data available for prediction');
    }
    
    const priceChange = predictedPrice - currentPrice;
    const priceChangePercentage = (priceChange / currentPrice) * 100;
    
    predictions.push({
      targetDate,
      predictedPrice,
      confidence,
      priceChange,
      priceChangePercentage,
      factors
    });
  }
  
  return predictions;
}

async function calculateExpectedReturn(
  amount: number,
  currentPrice: number,
  pricePredictions: PricePrediction[],
  durationInDays: number,
  durationUnit: string
): Promise<ExpectedReturn> {
  const initialInvestment = amount * currentPrice;
  
  const endPrediction = pricePredictions.find(p => {
    const daysDiff = Math.abs((p.targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return Math.abs(daysDiff - durationInDays) < 7;
  }) || pricePredictions[pricePredictions.length - 1];
  
  const predictedValue = amount * endPrediction.predictedPrice;
  const expectedReturn = predictedValue - initialInvestment;
  const expectedReturnPercentage = (expectedReturn / initialInvestment) * 100;
  
  const confidenceRange = (1 - endPrediction.confidence) * 1.5;
  
  let bestCaseScenario = predictedValue * (1 + confidenceRange);
  let worstCaseScenario = predictedValue * (1 - confidenceRange);
  
  const maxLossPercentage = 0.4;
  const minValue = initialInvestment * (1 - maxLossPercentage);
  worstCaseScenario = Math.max(worstCaseScenario, minValue);
  
  const maxGainMultiplier = 2.0;
  const maxBestCase = initialInvestment + (expectedReturn * maxGainMultiplier);
  bestCaseScenario = Math.min(bestCaseScenario, maxBestCase);
  
  return {
    duration: durationInDays,
    durationUnit,
    initialInvestment,
    predictedValue,
    expectedReturn,
    expectedReturnPercentage,
    bestCaseScenario,
    worstCaseScenario,
    confidence: endPrediction.confidence,
    pricePredictions
  };
}

function calculateAverageAnnualReturn(historicalData: number[][]): number {
  if (historicalData.length < 2) return 0.1;
  
  const firstPrice = historicalData[0][1];
  const lastPrice = historicalData[historicalData.length - 1][1];
  const daysElapsed = (historicalData[historicalData.length - 1][0] - historicalData[0][0]) / (1000 * 60 * 60 * 24);
  
  if (daysElapsed <= 0) return 0.1;
  
  const totalReturn = (lastPrice - firstPrice) / firstPrice;
  const annualReturn = totalReturn * (365 / daysElapsed);
  
  return Math.max(-0.5, Math.min(2.0, annualReturn));
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
  const priceChange30d = tokenData?.market_data?.price_change_percentage_30d || tokenData?.price_change_percentage_30d || 0;
  const marketCap = tokenData?.market_data?.market_cap?.usd || tokenData?.market_cap || 0;
  const volume24h = tokenData?.market_data?.total_volume?.usd || tokenData?.volume_24h || 0;
  
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
  
  // Generate insights
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
    const marketCap = tokenData?.market_data?.market_cap?.usd || tokenData?.market_cap || 0;
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

function formatPriceBasedCommitmentResponse(
  analysis: PriceBasedCommitmentAnalysis,
  fearGreedData: FearGreedData | null
): string {
  const {
    amount,
    tokenSymbol,
    currentPrice,
    upTarget,
    downTarget,
    upTargetAnalysis,
    downTargetAnalysis,
    overallRisk,
    expectedReturn,
    insights,
    recommendations,
    timeToReachTargets
  } = analysis;
  
  const formatCurrency = (num: number): string => {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return num.toLocaleString ? num.toLocaleString() : num.toString();
  };
  
  const formatPercentage = (num: number): string => {
    if (typeof num !== 'number' || isNaN(num)) return '0.00';
    return num.toFixed ? num.toFixed(2) : num.toString();
  };
  
  let emoji = '🎯';
  let riskEmoji = '🟡';
  if (overallRisk === 'EXTREME') riskEmoji = '🔴';
  else if (overallRisk === 'HIGH') riskEmoji = '🟠';
  else if (overallRisk === 'LOW') riskEmoji = '🟢';
  
  let fearGreedDisplay = '';
  if (fearGreedData) {
    const fearGreedEmoji = fearGreedData.value <= 25 ? '😱' : 
                          fearGreedData.value <= 45 ? '😨' : 
                          fearGreedData.value <= 55 ? '😐' : 
                          fearGreedData.value <= 75 ? '😏' : '🤪';
    
    fearGreedDisplay = `**Fear & Greed Index:** ${fearGreedData.value} (${fearGreedData.classification}) ${fearGreedEmoji}`;
  }
  
  return `${emoji} **Price-Based Commitment Analysis**

**Proposal:** Lock ${amount} ${tokenSymbol} until price reaches ${formatCurrency(upTarget)} or ${formatCurrency(downTarget)}
**Current Price:** ${formatCurrency(currentPrice)}
**Total Value:** ${formatCurrency(amount * currentPrice)}

${fearGreedDisplay}

**📈 Up Target Analysis:**
• **Target Price:** ${formatCurrency(upTarget)} (${expectedReturn.upScenario > 0 ? '+' : ''}${formatPercentage(expectedReturn.upScenario)}%)
• **Expected Time:** ${upTargetAnalysis.expectedDays} days
• **Probability:** ${formatPercentage(upTargetAnalysis.probability * 100)}%
• **Confidence:** ${formatPercentage(upTargetAnalysis.confidence * 100)}%
• **Risk Factors:** ${upTargetAnalysis.riskFactors.length > 0 ? upTargetAnalysis.riskFactors.join(', ') : 'None identified'}
• **Market Conditions:** ${upTargetAnalysis.marketConditions.length > 0 ? upTargetAnalysis.marketConditions.join(', ') : 'Neutral'}

**📉 Down Target Analysis:**
• **Target Price:** ${formatCurrency(downTarget)} (${expectedReturn.downScenario > 0 ? '+' : ''}${formatPercentage(expectedReturn.downScenario)}%)
• **Expected Time:** ${downTargetAnalysis.expectedDays} days
• **Probability:** ${formatPercentage(downTargetAnalysis.probability * 100)}%
• **Confidence:** ${formatPercentage(downTargetAnalysis.confidence * 100)}%
• **Risk Factors:** ${downTargetAnalysis.riskFactors.length > 0 ? downTargetAnalysis.riskFactors.join(', ') : 'None identified'}
• **Market Conditions:** ${downTargetAnalysis.marketConditions.length > 0 ? downTargetAnalysis.marketConditions.join(', ') : 'Neutral'}

**⏱️ Time Analysis:**
• **Time to Up Target:** ${timeToReachTargets.upTarget} days
• **Time to Down Target:** ${timeToReachTargets.downTarget} days
• **Average Expected Duration:** ${timeToReachTargets.averageTime} days

**💰 Expected Returns:**
• **Up Scenario:** ${expectedReturn.upScenario > 0 ? '+' : ''}${formatPercentage(expectedReturn.upScenario)}%
• **Down Scenario:** ${expectedReturn.downScenario > 0 ? '+' : ''}${formatPercentage(expectedReturn.downScenario)}%
• **Weighted Average:** ${expectedReturn.weightedAverage > 0 ? '+' : ''}${formatPercentage(expectedReturn.weightedAverage)}%
• **Best Case:** ${expectedReturn.bestCase > 0 ? '+' : ''}${formatPercentage(expectedReturn.bestCase)}%
• **Worst Case:** ${expectedReturn.worstCase > 0 ? '+' : ''}${formatPercentage(expectedReturn.worstCase)}%

**Risk Level:** ${overallRisk} ${riskEmoji}

**🔍 Key Insights:**
${insights.map((insight, index) => `${index + 1}. ${insight}`).join('\n')}

**💡 Recommendations:**
${recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

**Summary:**
This price-based commitment strategy has a ${formatPercentage(upTargetAnalysis.probability * 100)}% chance of reaching the up target in ${upTargetAnalysis.expectedDays} days and a ${formatPercentage(downTargetAnalysis.probability * 100)}% chance of reaching the down target in ${downTargetAnalysis.expectedDays} days. The overall risk level is ${overallRisk.toLowerCase()}, with a weighted average expected return of ${expectedReturn.weightedAverage > 0 ? '+' : ''}${formatPercentage(expectedReturn.weightedAverage)}%.

Would you like me to help you optimize these targets or proceed with the vault creation?`;
}