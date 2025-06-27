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

export function formatGeneralAnalysis(text: string, fearGreedData: FearGreedData | null, marketData: any): string {
    return `Please provide a commitment proposal for analysis.`;
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
