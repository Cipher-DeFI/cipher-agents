import { FearGreedData, PricePrediction, EnhancedCommitmentAnalysis, PriceBasedCommitmentAnalysis, ExpectedReturn } from "../types";

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

  let avalancheInfo = '';
  if (validationResult?.tokenInfo) {
    const chainlinkStatus = validationResult.tokenInfo.chainlinkPriceFeed ? '✅ Chainlink Price Feed' : '❌ No Price Feed';
    const contractStatus = validationResult.contractExists ? '✅ Contract Verified' : '⚠️ Contract Unverified';
    
    avalancheInfo = `**Avalanche Network Info:**
  • ${chainlinkStatus}
  • ${contractStatus}
  • Contract: ${validationResult.tokenInfo.contractAddress}
  • Token: ${validationResult.tokenInfo.name} (${validationResult.tokenInfo.symbol})`;
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

  return `${emoji} **Avalanche Commitment Analysis**
  
  **Proposal:** Lock ${amount} ${tokenSymbol} for ${duration} ${unit}
  **Current Price:** $${formatCurrency(currentPrice)} (${priceChange24h > 0 ? '+' : ''}${formatPercentage(priceChange24h)}% 24h)
  **Total Value:** $${formatCurrency(totalValue)}
  **Commitment Score:** ${score}/100
  
  ${fearGreedDisplay}
  
  ${avalancheInfo}
  
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
  
  Would you like me to help you optimize this Avalanche commitment or proceed with the vault creation?`;
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

  return `🏔️ **Avalanche Commitment Analysis**

  ${fearGreedDisplay}

  **Supported Avalanche Tokens:**
  • **AVAX** - Native Avalanche token (Chainlink price feed available)
  • **WAVAX** - Wrapped AVAX for DeFi (Chainlink price feed available)
  • **USDC.E** - Avalanche Bridged USDC (Chainlink price feed available)
  • **USDT.E** - Tether Avalanche Bridged (Chainlink price feed available)
  • **JOE** - JoeToken (limited price feed support)
  • **PNG** - Pangolin (limited price feed support)

  **Example Commitments:**
  • "I want to lock 10 AVAX for 3 months"
  • "Lock 5 WAVAX until price reaches $50 or $30"
  • "Commit 1000 USDC.E for 6 months"

  **Avalanche Network Benefits:**
  • Fast finality and low transaction costs
  • Chainlink price feeds for reliable price monitoring
  • Verified smart contracts for security
  • Active DeFi ecosystem for yield opportunities

  Please provide a specific Avalanche commitment proposal for detailed analysis.`;
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

  let avalancheInfo = '';
  if (validationResult?.tokenInfo) {
    const chainlinkStatus = validationResult.tokenInfo.chainlinkPriceFeed ? '✅ Chainlink Price Feed' : '❌ No Price Feed';
    const contractStatus = validationResult.contractExists ? '✅ Contract Verified' : '⚠️ Contract Unverified';
    
    avalancheInfo = `**Avalanche Network Info:**
  • ${chainlinkStatus}
  • ${contractStatus}
  • Contract: ${validationResult.tokenInfo.contractAddress}
  • Token: ${validationResult.tokenInfo.name} (${validationResult.tokenInfo.symbol})`;
  }

  const riskEmoji = overallRisk === 'EXTREME' ? '🔥' : overallRisk === 'HIGH' ? '⚠️' : overallRisk === 'LOW' ? '🟢' : '🟡';

  return `🎯 **Avalanche Price-Based Commitment Analysis**

  **Proposal:** Lock ${amount} ${tokenSymbol} until price reaches $${formatCurrency(upTarget)} or $${formatCurrency(downTarget)}
  **Current Price:** $${formatCurrency(currentPrice)}
  **Total Value:** $${formatCurrency(amount * currentPrice)}
  **Overall Risk:** ${overallRisk} ${riskEmoji}

  ${fearGreedDisplay}

  ${avalancheInfo}

  **📈 Up Target Analysis ($${formatCurrency(upTarget)}):**
  • Probability: ${formatPercentage(upTargetAnalysis.probability * 100)}%
  • Expected Time: ${upTargetAnalysis.expectedDays} days
  • Confidence: ${formatPercentage(upTargetAnalysis.confidence * 100)}%
  • Risk Factors: ${upTargetAnalysis.riskFactors.length > 0 ? upTargetAnalysis.riskFactors.join(', ') : 'None'}
  • Market Conditions: ${upTargetAnalysis.marketConditions.length > 0 ? upTargetAnalysis.marketConditions.join(', ') : 'Neutral'}

  **📉 Down Target Analysis ($${formatCurrency(downTarget)}):**
  • Probability: ${formatPercentage(downTargetAnalysis.probability * 100)}%
  • Expected Time: ${downTargetAnalysis.expectedDays} days
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
  • Up Target: ${timeToReachTargets.upTarget} days
  • Down Target: ${timeToReachTargets.downTarget} days
  • Average Time: ${timeToReachTargets.averageTime} days

  **💡 Key Insights:**
  ${insights.map(insight => `• ${insight}`).join('\n')}

  **🎯 Recommendations:**
  ${recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

  Would you like me to help you optimize this Avalanche price-based commitment or proceed with the vault creation?`;
}

export async function calculatePricePredictions(
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

export async function calculateExpectedReturn(
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