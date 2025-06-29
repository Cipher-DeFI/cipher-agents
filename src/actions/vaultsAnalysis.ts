import { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { MarketDataService } from '../services/marketData';
import { MarketData, VaultData, VaultsAnalysisResult, VaultInsight } from '../types';

export const VaultsAnalysisAction: Action = {
  name: 'FUM_ANALYZE_VAULTS',
  similes: ['VAULT_PATTERN_ANALYSIS', 'COMMITMENT_BEHAVIOR_ANALYSIS', 'LOCKING_TREND_ANALYSIS', 'VAULT_SUCCESS_RATE', 'COMMUNITY_BEHAVIOR_INSIGHTS'],
  description: 'Analyzes the last 10 vault lock data to provide insights into community commitment patterns, success rates, and behavioral trends',
  
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const text = message.content?.text || '';
    const vaultAnalysisPatterns = [
      /analyze\s+(?:vaults?|commitments?|locking\s+patterns?)/i,
      /vault\s+(?:analysis|insights|trends?)/i,
      /commitment\s+(?:behavior|patterns?|success)/i,
      /community\s+(?:vaults?|commitments?)/i,
      /locking\s+(?:trends?|analysis)/i
    ];
    
    return vaultAnalysisPatterns.some(pattern => pattern.test(text));
  },
  
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ) => {
    try {
      const marketDataService = new MarketDataService(runtime);
      const marketData = await marketDataService.getMarketData();
      
      const vaultsData = await fetchVaultsData();
      const analysis = await analyzeVaultsData(vaultsData, marketData);
      
      const response = formatVaultsAnalysisResponse(analysis, marketData);
      
      await callback?.({
        text: response,
        thought: `Analyzed ${analysis.totalVaults} vaults with ${analysis.successRate.toFixed(1)}% success rate and ${analysis.totalValueLocked.toFixed(2)} total value locked`,
        actions: ['FUM_ANALYZE_VAULTS', 'FUM_ANALYZE_COMMITMENT'],
        metadata: {
          analysis,
          marketData,
          vaultsData
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error in vaults analysis:', error);
      await callback?.({
        text: 'I encountered an error while analyzing the vault data. Please try again later.',
        thought: `Vaults analysis failed: ${error}`,
        actions: ['FUM_ANALYZE_VAULTS']
      });
      return false;
    }
  }
};

async function fetchVaultsData(): Promise<VaultData[]> {
  try {
    const response = await fetch('https://fund-ur-memory-indexer-production.up.railway.app/vaults?limit=10');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch vaults data: ${response.status}`);
    }
    
    const data = await response.json() as { vaults: VaultData[] };
    return data.vaults || [];
  } catch (error) {
    console.error('Error fetching vaults data:', error);
    throw error;
  }
}

async function analyzeVaultsData(vaults: VaultData[], marketData: MarketData | null): Promise<VaultsAnalysisResult> {
  const totalVaults = vaults.length;
  const activeVaults = vaults.filter(v => v.status === 1).length;
  const completedVaults = vaults.filter(v => v.status === 2 && !v.emergencyWithdrawnAt).length;
  const emergencyWithdrawnVaults = vaults.filter(v => v.emergencyWithdrawnAt).length;
  
  const lockDurations = vaults.map(vault => {
    const createdAt = parseInt(vault.createdAt);
    const unlockTime = parseInt(vault.unlockTime);
    
    if (isNaN(createdAt) || isNaN(unlockTime)) {
      return 30;
    }
    
    const durationMs = unlockTime - createdAt;
    const durationDays = durationMs / (1000 * 60 * 60 * 24);
    
    if (durationDays >= 0.042 && durationDays <= 3650) {
      return durationDays;
    }
    
    return 30;
  });
  
  const averageLockDuration = lockDurations.length > 0 
    ? lockDurations.reduce((a, b) => a + b, 0) / lockDurations.length 
    : 30;
  
  const amounts = vaults.map(vault => parseFloat(vault.amount) / 1e18);
  const averageAmount = amounts.length > 0 
    ? amounts.reduce((a, b) => a + b, 0) / amounts.length 
    : 0;
  const totalValueLocked = amounts.reduce((a, b) => a + b, 0);
  
  const successRate = totalVaults > 0 
    ? ((completedVaults + activeVaults) / totalVaults) * 100 
    : 0;
  
  const tokenCounts = new Map<string, { count: number; totalValue: number }>();
  vaults.forEach(vault => {
    const tokenSymbol = getTokenSymbolFromVault(vault);
    const amount = parseFloat(vault.amount) / 1e18;
    
    if (tokenCounts.has(tokenSymbol)) {
      const existing = tokenCounts.get(tokenSymbol)!;
      existing.count += 1;
      existing.totalValue += amount;
    } else {
      tokenCounts.set(tokenSymbol, { count: 1, totalValue: amount });
    }
  });
  
  const topTokens = Array.from(tokenCounts.entries())
    .map(([token, data]) => ({
      token,
      count: data.count,
      totalValue: data.totalValue
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  const timeDistribution = {
    shortTerm: lockDurations.filter(d => d < 30).length,
    mediumTerm: lockDurations.filter(d => d >= 30 && d <= 90).length,
    longTerm: lockDurations.filter(d => d > 90).length
  };
  
  const commonPatterns = generateCommonPatterns(vaults, timeDistribution, topTokens);
  const riskInsights = generateRiskInsights(vaults, successRate, emergencyWithdrawnVaults);
  const behavioralInsights = generateBehavioralInsights(vaults, averageLockDuration, timeDistribution);
  const marketInsights = generateMarketInsights(vaults, marketData);
  
  const analysis: VaultsAnalysisResult = {
    totalVaults,
    activeVaults,
    completedVaults,
    emergencyWithdrawnVaults,
    averageLockDuration,
    averageAmount,
    totalValueLocked,
    successRate,
    commonPatterns,
    riskInsights,
    behavioralInsights,
    marketInsights,
    recommendations: [],
    topTokens,
    timeDistribution
  };
  
  analysis.recommendations = generateRecommendations(analysis, marketData);
  
  return analysis;
}

function generateCommonPatterns(vaults: VaultData[], timeDistribution: any, topTokens: any[]): string[] {
  const patterns: string[] = [];
  
  if (timeDistribution.shortTerm > timeDistribution.mediumTerm && timeDistribution.shortTerm > timeDistribution.longTerm) {
    patterns.push('Short-term commitments (under 30 days) are most popular among users');
  } else if (timeDistribution.mediumTerm > timeDistribution.shortTerm && timeDistribution.mediumTerm > timeDistribution.longTerm) {
    patterns.push('Medium-term commitments (30-90 days) are the preferred choice');
  } else if (timeDistribution.longTerm > timeDistribution.shortTerm && timeDistribution.longTerm > timeDistribution.mediumTerm) {
    patterns.push('Long-term commitments (over 90 days) are most common');
  }
  
  if (topTokens.length > 0) {
    const topToken = topTokens[0];
    const tokenName = topToken.token === 'ETH' ? 'ETH' : 
                     topToken.token === 'AVAX' ? 'AVAX' : 
                     topToken.token;
    patterns.push(`${tokenName} is the most locked asset with ${topToken.count} vaults`);
    
    const ethVaults = topTokens.find(t => t.token === 'ETH');
    const avaxVaults = topTokens.find(t => t.token === 'AVAX');
    
    if (ethVaults && avaxVaults) {
      const totalCrossChain = ethVaults.count + avaxVaults.count;
      const ethPercentage = Math.round((ethVaults.count / totalCrossChain) * 100);
      const avaxPercentage = Math.round((avaxVaults.count / totalCrossChain) * 100);
      patterns.push(`Cross-chain distribution: ${ethPercentage}% ETH, ${avaxPercentage}% AVAX`);
    } else if (ethVaults) {
      patterns.push('Users prefer Ethereum network for vault commitments');
    } else if (avaxVaults) {
      patterns.push('Users prefer Avalanche network for vault commitments');
    }
  }
  
  const amounts = vaults.map(v => parseFloat(v.amount) / 1e18);
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  if (avgAmount < 1) {
    patterns.push('Users prefer small amounts for testing commitment mechanisms');
  } else if (avgAmount > 10) {
    patterns.push('Users are confident with larger amounts in their commitments');
  }
  
  return patterns;
}

function generateRiskInsights(vaults: VaultData[], successRate: number, emergencyWithdrawnVaults: number): string[] {
  const insights: string[] = [];
  
  if (successRate > 80) {
    insights.push('High success rate indicates strong community commitment to behavioral improvement');
  } else if (successRate < 50) {
    insights.push('Low success rate suggests users may need better risk management strategies');
  }
  
  if (emergencyWithdrawnVaults > 0) {
    insights.push(`${emergencyWithdrawnVaults} emergency withdrawals detected - users value capital preservation over penalties`);
  }
  
  const activeVaults = vaults.filter(v => v.status === 1).length;
  if (activeVaults > 0) {
    insights.push(`${activeVaults} active vaults show ongoing commitment to behavioral improvement`);
  }
  
  return insights;
}

function generateBehavioralInsights(vaults: VaultData[], averageLockDuration: number, timeDistribution: any): string[] {
  const insights: string[] = [];
  
  if (averageLockDuration < 30) {
    insights.push('Short average lock duration suggests users prefer flexibility over long-term commitments');
  } else if (averageLockDuration > 90) {
    insights.push('Long average lock duration indicates strong long-term behavioral improvement goals');
  }
  
  if (timeDistribution.shortTerm > 0) {
    insights.push('Short-term vaults suggest users are testing the commitment mechanism');
  }
  
  if (timeDistribution.longTerm > 0) {
    insights.push('Long-term vaults indicate serious behavioral improvement intentions');
  }
  
  const hasMessages = vaults.filter(v => v.message && v.message.trim() !== '').length;
  if (hasMessages > 0) {
    insights.push('Users are actively documenting their commitment reasons and goals');
  }
  
  return insights;
}

function generateMarketInsights(vaults: VaultData[], marketData: MarketData | null): string[] {
  const insights: string[] = [];
  
  if (!marketData) {
    insights.push('Market data unavailable for correlation analysis');
    return insights;
  }
  
  const recentVaults = vaults.filter(v => {
    const createdAt = parseInt(v.createdAt);
    const now = Math.floor(Date.now() / 1000);
    return (now - createdAt) < (7 * 24 * 60 * 60);
  });
  
  if (recentVaults.length > 0) {
    if (marketData.fearGreedIndex < 30) {
      insights.push('Recent vaults created during fear periods - users seeking behavioral control in volatile markets');
    } else if (marketData.fearGreedIndex > 70) {
      insights.push('Recent vaults created during greed periods - users protecting gains through commitment mechanisms');
    }
  }
  
  return insights;
}

function generateRecommendations(analysis: VaultsAnalysisResult, marketData: MarketData | null): string[] {
  const recommendations: string[] = [];
  
  if (analysis.successRate < 70) {
    recommendations.push('Improve Success Rate: Consider implementing better onboarding and education about commitment benefits');
  }
  
  if (analysis.emergencyWithdrawnVaults > 0) {
    recommendations.push('Emergency Withdrawal Management: Review penalty structures to balance commitment with flexibility');
  }
  
  if (analysis.timeDistribution.shortTerm > analysis.timeDistribution.longTerm) {
    recommendations.push('Encourage Long-term Commitments: Provide incentives for longer lock periods');
  }
  
  if (analysis.averageAmount < 0.1) {
    recommendations.push('Increase Commitment Amounts: Users may benefit from larger commitments for better behavioral impact');
  }
  
  if (marketData && marketData.fearGreedIndex < 40) {
    recommendations.push('Fear Market Opportunity: Consider promoting vault creation during fear periods for better long-term outcomes');
  }
  
  recommendations.push('Community Education: Share success stories and behavioral improvement metrics');
  
  return recommendations;
}

function formatVaultsAnalysisResponse(analysis: VaultsAnalysisResult, marketData: MarketData | null): string {
  const successRateEmoji = analysis.successRate > 80 ? '🟢' : analysis.successRate > 60 ? '🟡' : '🔴';
  const sentimentEmoji = marketData?.fearGreedIndex ? 
    (marketData.fearGreedIndex > 60 ? '🐂' : marketData.fearGreedIndex < 40 ? '🐻' : '➡️') : '➡️';
  
  // Determine the primary token for display
  const primaryToken = analysis.topTokens.length > 0 ? analysis.topTokens[0].token : 'AVAX';
  
  // Check if we have mixed tokens
  const hasMultipleTokens = analysis.topTokens.length > 1;
  const tokenDisplay = hasMultipleTokens ? 'tokens' : primaryToken;
  
  let response = `# 🏦 **Community Vaults Analysis Report**
  
## 📊 **Overview Statistics**
**Total Vaults Analyzed:** ${analysis.totalVaults}
**Active Vaults:** ${analysis.activeVaults}
**Successfully Completed:** ${analysis.completedVaults}
**Emergency Withdrawals:** ${analysis.emergencyWithdrawnVaults}
**Success Rate:** ${successRateEmoji} ${analysis.successRate.toFixed(1)}%

## 💰 **Value Metrics**
**Total Value Locked:** ${analysis.totalValueLocked.toFixed(4)} ${tokenDisplay}
**Average Vault Amount:** ${analysis.averageAmount.toFixed(4)} ${hasMultipleTokens ? 'tokens' : primaryToken}
**Average Lock Duration:** ${analysis.averageLockDuration.toFixed(1)} days

## ⏰ **Time Distribution**
• **Short-term (< 30 days):** ${analysis.timeDistribution.shortTerm} vaults
• **Medium-term (30-90 days):** ${analysis.timeDistribution.mediumTerm} vaults
• **Long-term (> 90 days):** ${analysis.timeDistribution.longTerm} vaults

## 🔍 **Common Patterns**
${analysis.commonPatterns.map(pattern => `• ${pattern}`).join('\n')}

## ⚠️ **Risk Insights**
${analysis.riskInsights.map(insight => `• ${insight}`).join('\n')}

## 🧠 **Behavioral Insights**
${analysis.behavioralInsights.map(insight => `• ${insight}`).join('\n')}

## 📈 **Market Insights**
${analysis.marketInsights.map(insight => `• ${insight}`).join('\n')}

## 💡 **Recommendations**
${analysis.recommendations.map(rec => rec).join('\n\n')}

## 🎯 **Community Health Score**
Based on the analysis, the community shows ${analysis.successRate > 80 ? 'excellent' : analysis.successRate > 60 ? 'good' : 'room for improvement'} commitment to behavioral improvement through vault locking mechanisms.

*This analysis is based on the last 10 vault transactions. For more comprehensive insights, consider analyzing a larger dataset.*`;

  if (marketData) {
    response += `\n\n**Current Market Context:** ${sentimentEmoji} Fear & Greed Index: ${marketData.fearGreedIndex} (${marketData.fearGreedIndex > 60 ? 'Greed' : marketData.fearGreedIndex < 40 ? 'Fear' : 'Neutral'})`;
  }
  
  return response;
}

function getTokenSymbolFromVault(vault: VaultData): string {
  try {
    if (vault.insight && vault.insight.insight) {
      const insightData: VaultInsight = JSON.parse(vault.insight.insight);
      return insightData.tokenSymbol || 'AVAX';
    }
  } catch (error) {
    console.warn('Failed to parse vault insight:', error);
  }
  
  if (vault.token.toLowerCase() === '0x0000000000000000000000000000000000000000') {
    return 'AVAX';
  }
  
  return 'AVAX';
}
