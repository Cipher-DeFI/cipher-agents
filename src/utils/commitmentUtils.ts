import { FearGreedData, PricePrediction, EnhancedCommitmentAnalysis, PriceBasedCommitmentAnalysis, ExpectedReturn, CombinedCommitmentAnalysis } from "../types";

export function formatTimeUnit(days: number): string {
  if (days < 1/24) {
    const minutes = Math.round(days * 24 * 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else if (days < 1) {
    const hours = Math.round(days * 24);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else if (days < 7) {
    const dayCount = Math.round(days);
    return `${dayCount} day${dayCount !== 1 ? 's' : ''}`;
  } else if (days < 30) {
    const weeks = Math.round(days / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''}`;
  } else if (days < 365) {
    const months = Math.round(days / 30);
    return `${months} month${months !== 1 ? 's' : ''}`;
  } else {
    const years = Math.round(days / 365);
    return `${years} year${years !== 1 ? 's' : ''}`;
  }
}

export function calculateVolatility(prices: number[][]): number {
  if (prices.length < 2) return 0;

  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    const return_ = (prices[i][1] - prices[i - 1][1]) / prices[i - 1][1];
    returns.push(return_);
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(365);

  return volatility;
}

export function calculateMaxDrawdown(prices: number[][]): number {
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

export function formatCommitmentResponse(
  analysis: EnhancedCommitmentAnalysis,
  amount: number,
  tokenSymbol: string,
  duration: number,
  unit: string,
  tokenData: any,
  fearGreedData: FearGreedData | null,
  validationResult?: any
): string {
  const { score, recommendation, riskLevel, behavioralInsights, marketConditions, suggestedOptimizations, fearGreedInsights, expectedReturn, pricePredictions } = analysis;

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

  let tokenInfo = '';
  if (validationResult?.tokenInfo) {
    tokenInfo = `**Token Information:**
  • Network: ${validationResult.tokenInfo.network}
  • Token: ${validationResult.tokenInfo.name} (${validationResult.tokenInfo.symbol})
  • Status: ✅ Supported by CipherVault`;
  }

  const formatPricePredictions = (predictions: PricePrediction[]): string => {
    return predictions.map(p => {
      let dateStr;
      const now = new Date();
      const timeDiff = p.targetDate.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
      
      if (daysDiff < 1) {
        if (hoursDiff < 1) {
          const minutesDiff = timeDiff / (1000 * 60);
          dateStr = `${Math.round(minutesDiff)} minutes`;
        } else {
          dateStr = `${Math.round(hoursDiff)} hours`;
        }
      } else if (daysDiff < 7) {
        dateStr = `${Math.round(daysDiff)} days`;
      } else {
        dateStr = p.targetDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: p.targetDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
      }
      
      const confidenceEmoji = p.confidence >= 0.7 ? '🟢' : p.confidence >= 0.5 ? '🟡' : '🔴';
      return `• ${dateStr}: $${formatCurrency(p.predictedPrice)} (${p.priceChangePercentage > 0 ? '+' : ''}${formatPercentage(p.priceChangePercentage)}%) ${confidenceEmoji}`;
    }).join('\n');
  };

  return `${emoji} **Commitment Analysis**
  
  **Proposal:** Lock ${amount} ${tokenSymbol} for ${duration} ${unit}
  **Current Price:** $${formatCurrency(currentPrice)} (${priceChange24h > 0 ? '+' : ''}${formatPercentage(priceChange24h)}% 24h)
  **Total Value:** $${formatCurrency(totalValue)}
  **Commitment Score:** ${score}/100
  
  ${fearGreedDisplay}
  
  ${tokenInfo}
  
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

export function formatGeneralAnalysis(text: string, fearGreedData: FearGreedData | null, marketData: any): string {
  let fearGreedDisplay = '';
  if (fearGreedData) {
    const fearGreedEmoji = fearGreedData.value <= 25 ? '😱' :
      fearGreedData.value <= 45 ? '😨' :
        fearGreedData.value <= 55 ? '😐' :
          fearGreedData.value <= 75 ? '😏' : '🤪';

    fearGreedDisplay = `**Current Fear & Greed Index:** ${fearGreedData.value} (${fearGreedData.classification}) ${fearGreedEmoji}`;
  }

  return `🏔️ **Commitment Analysis**

  ${fearGreedDisplay}

  **Supported Tokens:**
  • **AVAX** - Native Avalanche token
  • **ETH** - Native Ethereum token
  • **MONAD** - Native Monad token

  **Example Commitments:**
  • "I want to lock 10 AVAX for 3 months"
  • "Lock 2 ETH for 2 hours"
  • "Commit 5 MONAD for 30 minutes"
  • "Lock 3 ETH until price reaches $5000 or $3000"
  • "Commit 1 AVAX for 5 days"

  **Duration Options:**
  • **Minutes:** For immediate impulse control (30 minutes, 1 hour)
  • **Hours:** For short-term discipline (2 hours, 6 hours, 12 hours)
  • **Days:** For daily trading discipline (1 day, 3 days, 5 days)
  • **Weeks/Months:** For behavioral change (1 week, 1 month, 3 months)
  • **Years:** For long-term holding (6 months, 1 year)

  **Network Benefits:**
  • **Avalanche:** Fast finality and low transaction costs
  • **Ethereum:** Largest DeFi ecosystem and network effects
  • **Monad:** High-performance blockchain with parallel execution
  • All networks offer reliable price data and security

  Please provide a specific commitment proposal for detailed analysis.`;
}

export function calculateAverageAnnualReturn(historicalData: number[][]): number {
  if (historicalData.length < 2) return 0.1;

  const firstPrice = historicalData[0][1];
  const lastPrice = historicalData[historicalData.length - 1][1];
  const daysElapsed = (historicalData[historicalData.length - 1][0] - historicalData[0][0]) / (1000 * 60 * 60 * 24);

  if (daysElapsed <= 0) return 0.1;

  const totalReturn = (lastPrice - firstPrice) / firstPrice;
  const annualReturn = totalReturn * (365 / daysElapsed);

  return Math.max(-0.5, Math.min(2.0, annualReturn));
}

export function formatPriceBasedCommitmentResponse(
  analysis: PriceBasedCommitmentAnalysis,
  fearGreedData: FearGreedData | null,
  validationResult?: any
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

  let fearGreedDisplay = '';
  if (fearGreedData) {
    const fearGreedEmoji = fearGreedData.value <= 25 ? '😱' :
      fearGreedData.value <= 45 ? '😨' :
        fearGreedData.value <= 55 ? '😐' :
          fearGreedData.value <= 75 ? '😏' : '🤪';

    fearGreedDisplay = `**Fear & Greed Index:** ${fearGreedData.value} (${fearGreedData.classification}) ${fearGreedEmoji}`;
  }

  let tokenInfo = '';
  if (validationResult?.tokenInfo) {
    tokenInfo = `**Token Information:**
  • Network: ${validationResult.tokenInfo.network}
  • Token: ${validationResult.tokenInfo.name} (${validationResult.tokenInfo.symbol})
  • Status: ✅ Supported by CipherVault`;
  }

  const riskEmoji = overallRisk === 'EXTREME' ? '🔥' : overallRisk === 'HIGH' ? '⚠️' : overallRisk === 'LOW' ? '🟢' : '🟡';

  return `🎯 **Price-Based Commitment Analysis**

  **Proposal:** Lock ${amount} ${tokenSymbol} until price reaches $${formatCurrency(upTarget)} or $${formatCurrency(downTarget)}
  **Current Price:** $${formatCurrency(currentPrice)}
  **Total Value:** $${formatCurrency(amount * currentPrice)}
  **Overall Risk:** ${overallRisk} ${riskEmoji}

  ${fearGreedDisplay}

  ${tokenInfo}

  **📈 Up Target Analysis ($${formatCurrency(upTarget)}):**
  • Probability: ${formatPercentage(upTargetAnalysis.probability * 100)}%
  • Expected Time: ${formatTimeUnit(upTargetAnalysis.expectedDays)}
  • Confidence: ${formatPercentage(upTargetAnalysis.confidence * 100)}%
  • Risk Factors: ${upTargetAnalysis.riskFactors.length > 0 ? upTargetAnalysis.riskFactors.join(', ') : 'None'}
  • Market Conditions: ${upTargetAnalysis.marketConditions.length > 0 ? upTargetAnalysis.marketConditions.join(', ') : 'Neutral'}

  **📉 Down Target Analysis ($${formatCurrency(downTarget)}):**
  • Probability: ${formatPercentage(downTargetAnalysis.probability * 100)}%
  • Expected Time: ${formatTimeUnit(downTargetAnalysis.expectedDays)}
  • Confidence: ${formatPercentage(downTargetAnalysis.confidence * 100)}%
  • Risk Factors: ${downTargetAnalysis.riskFactors.length > 0 ? downTargetAnalysis.riskFactors.join(', ') : 'None'}
  • Market Conditions: ${downTargetAnalysis.marketConditions.length > 0 ? downTargetAnalysis.marketConditions.join(', ') : 'Neutral'}

  **💰 Expected Returns:**
  • Up Scenario: ${expectedReturn.upScenario > 0 ? '+' : ''}${formatPercentage(expectedReturn.upScenario)}%
  • Down Scenario: ${expectedReturn.downScenario > 0 ? '+' : ''}${formatPercentage(expectedReturn.downScenario)}%
  • Weighted Average: ${expectedReturn.weightedAverage > 0 ? '+' : ''}${formatPercentage(expectedReturn.weightedAverage)}%
  • Best Case: ${expectedReturn.bestCase > 0 ? '+' : ''}${formatPercentage(expectedReturn.bestCase)}%
  • Worst Case: ${expectedReturn.worstCase > 0 ? '+' : ''}${formatPercentage(expectedReturn.worstCase)}%

  **⏱️ Time to Reach Targets:**
  • Up Target: ${formatTimeUnit(timeToReachTargets.upTarget)}
  • Down Target: ${formatTimeUnit(timeToReachTargets.downTarget)}
  • Average Time: ${formatTimeUnit(timeToReachTargets.averageTime)}

  **💡 Key Insights:**
  ${insights.map((insight: string, index: number) => `${index + 1}. ${insight}`).join('\n')}

  **🎯 Recommendations:**
  ${recommendations.map((rec: string, index: number) => `${index + 1}. ${rec}`).join('\n')}

  Would you like me to help you optimize this price-based commitment or proceed with the vault creation?`;
}

export async function calculatePricePredictions(
  tokenData: any,
  historicalData: number[][] | null,
  durationInDays: number,
  currentPrice: number,
  fearGreedData: FearGreedData | null
): Promise<PricePrediction[]> {
  const predictions: PricePrediction[] = [];

  let timePoints = [];
  
  if (durationInDays < 1) {
    timePoints = [
      { days: 1/24, label: '1 hour' },
      { days: 1/12, label: '2 hours' },
      { days: 1/6, label: '4 hours' },
      { days: 1/3, label: '8 hours' },
      { days: 1/2, label: '12 hours' },
      { days: 1, label: '1 day' }
    ].filter(tp => tp.days <= durationInDays);
    
    if (timePoints.length === 0) {
      timePoints.push({ 
        days: durationInDays, 
        label: durationInDays < 1/24 ? `${Math.round(durationInDays * 24 * 60)} minutes` :
               durationInDays < 1 ? `${Math.round(durationInDays * 24)} hours` : '1 day'
      });
    }
  } else if (durationInDays < 7) {
    timePoints = [
      { days: 1, label: '1 day' },
      { days: 3, label: '3 days' },
      { days: 7, label: '1 week' }
    ].filter(tp => tp.days <= durationInDays);
    
    if (timePoints.length === 0) {
      timePoints.push({ 
        days: durationInDays, 
        label: `${Math.round(durationInDays)} days`
      });
    }
  } else {
    timePoints = [
      { days: 7, label: '1 week' },
      { days: 30, label: '1 month' },
      { days: 90, label: '3 months' },
      { days: 180, label: '6 months' },
      { days: 365, label: '1 year' }
    ].filter(tp => tp.days <= durationInDays);
    
    if (timePoints.length === 0) {
      timePoints.push({ 
        days: durationInDays, 
        label: `${Math.round(durationInDays / 30)} months`
      });
    }
  }

  if (durationInDays > 365) {
    timePoints.push({ days: durationInDays, label: `${Math.round(durationInDays / 30)} months` });
  }

  if (timePoints.length === 0) {
    timePoints.push({ 
      days: durationInDays, 
      label: durationInDays < 1/24 ? `${Math.round(durationInDays * 24 * 60)} minutes` :
             durationInDays < 1 ? `${Math.round(durationInDays * 24)} hours` :
             durationInDays < 7 ? `${Math.round(durationInDays)} days` :
             `${Math.round(durationInDays / 30)} months`
    });
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
      const expectedReturn = avgAnnualReturn * (timePoint.days / 365);

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

      const basePrediction = currentPrice * (1 + expectedReturn * sentimentMultiplier);
      predictedPrice = basePrediction;

      let durationConfidence = 0.4;
      if (timePoint.days < 1) {
        durationConfidence = 0.6;
      } else if (timePoint.days < 7) {
        durationConfidence = 0.5;
      } else if (timePoint.days < 30) {
        durationConfidence = 0.4;
      }

      confidence = Math.max(0.1, Math.min(0.8, durationConfidence +
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

      predictedPrice = currentPrice * (1 + (timePoint.days / 365) * 0.15 * trendMultiplier);
      
      if (timePoint.days < 1) {
        confidence = 0.3;
      } else if (timePoint.days < 7) {
        confidence = 0.25;
      } else {
        confidence = 0.25;
      }
      
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

export async function calculateExpectedReturn(
  amount: number,
  currentPrice: number,
  pricePredictions: PricePrediction[],
  durationInDays: number,
  durationUnit: string
): Promise<ExpectedReturn> {
  const initialInvestment = amount * currentPrice;

  if (pricePredictions.length === 0) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + durationInDays);
    
    const fallbackPrediction: PricePrediction = {
      targetDate,
      predictedPrice: currentPrice,
      confidence: 0.3,
      priceChange: 0,
      priceChangePercentage: 0,
      factors: ['Fallback prediction due to insufficient data']
    };
    
    pricePredictions = [fallbackPrediction];
  }

  let tolerance = 7;
  if (durationInDays < 1) {
    tolerance = 0.1;
  } else if (durationInDays < 7) {
    tolerance = 1;
  } else if (durationInDays < 30) {
    tolerance = 3;
  }

  const endPrediction = pricePredictions.find(p => {
    const daysDiff = Math.abs((p.targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return Math.abs(daysDiff - durationInDays) < tolerance;
  }) || pricePredictions[pricePredictions.length - 1];

  if (!endPrediction) {
    throw new Error('No valid price prediction found for the specified duration');
  }

  const predictedValue = amount * endPrediction.predictedPrice;
  const expectedReturn = predictedValue - initialInvestment;
  const expectedReturnPercentage = (expectedReturn / initialInvestment) * 100;

  let confidenceRange = (1 - endPrediction.confidence) * 1.5;
  if (durationInDays < 1) {
    confidenceRange *= 0.5;
  } else if (durationInDays < 7) {
    confidenceRange *= 0.8;
  }

  let bestCaseScenario = predictedValue * (1 + confidenceRange);
  let worstCaseScenario = predictedValue * (1 - confidenceRange);

  let maxLossPercentage = 0.4;
  if (durationInDays < 1) {
    maxLossPercentage = 0.1;
  } else if (durationInDays < 7) {
    maxLossPercentage = 0.2;
  } else if (durationInDays < 30) {
    maxLossPercentage = 0.3;
  }

  const minValue = initialInvestment * (1 - maxLossPercentage);
  worstCaseScenario = Math.max(worstCaseScenario, minValue);

  let maxGainMultiplier = 2.0;
  if (durationInDays < 1) {
    maxGainMultiplier = 0.1;
  } else if (durationInDays < 7) {
    maxGainMultiplier = 0.5;
  } else if (durationInDays < 30) {
    maxGainMultiplier = 1.0;
  }

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

export function formatCombinedCommitmentResponse(
  analysis: CombinedCommitmentAnalysis,
  fearGreedData: FearGreedData | null,
  validationResult?: any
): string {
  const { 
    amount, 
    tokenSymbol, 
    currentPrice, 
    durationInDays, 
    durationUnit,
    upTarget, 
    downTarget, 
    upTargetAnalysis, 
    downTargetAnalysis, 
    timeBasedAnalysis,
    overallRisk, 
    expectedReturn, 
    insights, 
    recommendations,
    timeToReachTargets,
    probabilityAnalysis
  } = analysis;

  const formatCurrency = (num: number): string => {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return num.toLocaleString ? num.toLocaleString() : num.toString();
  };

  const formatPercentage = (num: number): string => {
    if (typeof num !== 'number' || isNaN(num)) return '0.00';
    return num.toFixed ? num.toFixed(2) : num.toString();
  };

  const formatTimeUnit = (days: number): string => {
    if (days < 1/24) {
      const minutes = Math.round(days * 24 * 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (days < 1) {
      const hours = Math.round(days * 24);
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (days < 7) {
      const dayCount = Math.round(days);
      return `${dayCount} day${dayCount !== 1 ? 's' : ''}`;
    } else if (days < 30) {
      const weeks = Math.round(days / 7);
      return `${weeks} week${weeks !== 1 ? 's' : ''}`;
    } else if (days < 365) {
      const months = Math.round(days / 30);
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else {
      const years = Math.round(days / 365);
      return `${years} year${years !== 1 ? 's' : ''}`;
    }
  };

  let fearGreedDisplay = '';
  if (fearGreedData) {
    const fearGreedEmoji = fearGreedData.value <= 25 ? '😱' :
      fearGreedData.value <= 45 ? '😨' :
        fearGreedData.value <= 55 ? '😐' :
          fearGreedData.value <= 75 ? '😏' : '🤪';

    fearGreedDisplay = `**Fear & Greed Index:** ${fearGreedData.value} (${fearGreedData.classification}) ${fearGreedEmoji}`;
  }

  let tokenInfo = '';
  if (validationResult?.tokenInfo) {
    tokenInfo = `**Token Information:**
  • Network: ${validationResult.tokenInfo.network}
  • Token: ${validationResult.tokenInfo.name} (${validationResult.tokenInfo.symbol})
  • Status: ✅ Supported by CipherVault`;
  }

  const upTargetReturn = (upTarget - currentPrice) / currentPrice * 100;
  const downTargetReturn = (downTarget - currentPrice) / currentPrice * 100;
  const timeBasedReturn = expectedReturn.timeBasedScenario;

  const riskEmoji = overallRisk === 'EXTREME' ? '🔥' : 
                   overallRisk === 'HIGH' ? '⚠️' : 
                   overallRisk === 'LOW' ? '🟢' : '🟡';

  const mostLikelyExitEmoji = probabilityAnalysis.mostLikelyExit === 'TIME' ? '⏰' :
                              probabilityAnalysis.mostLikelyExit === 'PRICE_UP' ? '📈' : '📉';

  return `🎯 **Combined Commitment Analysis**
  
  **Proposal:** Lock ${amount} ${tokenSymbol} until either:
  • Time expires: ${formatTimeUnit(durationInDays)} (${durationInDays} ${durationUnit})
  • Price goes up to: $${formatCurrency(upTarget)} (+${formatPercentage(upTargetReturn)}%)
  • Price goes down to: $${formatCurrency(downTarget)} (${formatPercentage(downTargetReturn)}%)
  
  **Current Price:** $${formatCurrency(currentPrice)}
  **Total Value:** $${formatCurrency(amount * currentPrice)}
  **Overall Risk:** ${overallRisk} ${riskEmoji}
  
  ${fearGreedDisplay}
  
  ${tokenInfo}
  
  **📊 Exit Probability Analysis:**
  • Time-based exit: ${formatPercentage(probabilityAnalysis.timeBasedExit * 100)}% ⏰
  • Price up exit: ${formatPercentage(probabilityAnalysis.priceUpExit * 100)}% 📈
  • Price down exit: ${formatPercentage(probabilityAnalysis.priceDownExit * 100)}% 📉
  • Most likely exit: ${probabilityAnalysis.mostLikelyExit.replace('_', ' ')} ${mostLikelyExitEmoji}
  
  **📈 Expected Return Scenarios:**
  • **Time-based scenario:** ${timeBasedReturn > 0 ? '+' : ''}${formatPercentage(timeBasedReturn)}% (${formatTimeUnit(durationInDays)})
  • **Price up scenario:** +${formatPercentage(upTargetReturn)}% (${formatTimeUnit(timeToReachTargets.upTarget)})
  • **Price down scenario:** ${formatPercentage(downTargetReturn)}% (${formatTimeUnit(timeToReachTargets.downTarget)})
  • **Weighted average:** ${expectedReturn.weightedAverage > 0 ? '+' : ''}${formatPercentage(expectedReturn.weightedAverage)}%
  • **Best case:** +${formatPercentage(expectedReturn.bestCase)}%
  • **Worst case:** ${formatPercentage(expectedReturn.worstCase)}%
  
  **⏱️ Time Analysis:**
  • Time-based duration: ${formatTimeUnit(durationInDays)}
  • Expected time to up target: ${formatTimeUnit(timeToReachTargets.upTarget)} (${formatPercentage(upTargetAnalysis.probability * 100)}% probability)
  • Expected time to down target: ${formatTimeUnit(timeToReachTargets.downTarget)} (${formatPercentage(downTargetAnalysis.probability * 100)}% probability)
  • Average expected time: ${formatTimeUnit(timeToReachTargets.averageTime)}
  
  **🎯 Target Analysis:**
  **Up Target ($${formatCurrency(upTarget)}):**
  • Confidence: ${formatPercentage(upTargetAnalysis.confidence * 100)}%
  • Risk factors: ${upTargetAnalysis.riskFactors.length > 0 ? upTargetAnalysis.riskFactors.join(', ') : 'None'}
  • Market conditions: ${upTargetAnalysis.marketConditions.length > 0 ? upTargetAnalysis.marketConditions.join(', ') : 'Favorable'}
  
  **Down Target ($${formatCurrency(downTarget)}):**
  • Confidence: ${formatPercentage(downTargetAnalysis.confidence * 100)}%
  • Risk factors: ${downTargetAnalysis.riskFactors.length > 0 ? downTargetAnalysis.riskFactors.join(', ') : 'None'}
  • Market conditions: ${downTargetAnalysis.marketConditions.length > 0 ? downTargetAnalysis.marketConditions.join(', ') : 'Favorable'}
  
  **📋 Insights:**
  ${insights.map((insight: string, index: number) => `${index + 1}. ${insight}`).join('\n')}
  
  **💡 Recommendations:**
  ${recommendations.map((rec: string, index: number) => `${index + 1}. ${rec}`).join('\n')}
  
  **🔍 Behavioral Analysis:**
  ${timeBasedAnalysis.behavioralInsights.map((insight: string) => `• ${insight}`).join('\n')}
  
  **📊 Market Conditions:**
  ${timeBasedAnalysis.marketConditions.map((condition: string) => `• ${condition}`).join('\n')}
  
  **🎭 Fear & Greed Insights:**
  ${timeBasedAnalysis.fearGreedInsights.length > 0 ? timeBasedAnalysis.fearGreedInsights.map((insight: string, index: number) => `${index + 1}. ${insight}`).join('\n') : '• Market sentiment data unavailable'}
  
  This combined strategy provides maximum flexibility with both time and price-based exit conditions. The analysis shows which exit scenario is most likely and provides comprehensive risk assessment for your commitment strategy.`;
}