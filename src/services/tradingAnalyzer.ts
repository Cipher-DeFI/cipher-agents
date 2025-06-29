import { ethers } from 'ethers';
import { WalletTransaction, TokenBalance, TradingMetrics } from '../types';

export class TradingAnalyzer {
    analyzeTradingHistory(
      transactions: WalletTransaction[],
      tokenBalances: TokenBalance[]
    ): TradingMetrics {
      const tokenTrades = this.groupTransactionsByToken(transactions);
      
      const totalTrades = this.calculateTotalTrades(tokenTrades);
      const averageHoldTime = this.calculateAverageHoldTime(tokenTrades);
      const tradeFrequency = this.calculateTradeFrequency(transactions);
      const volatilityTolerance = this.calculateVolatilityTolerance(tokenTrades, transactions);
      const diversificationScore = this.calculateDiversificationScore(tokenBalances, tokenTrades);
      const emotionalTradingIndicators = this.detectEmotionalTrading(transactions);
      const { profitLossRatio, winRate } = this.calculateProfitLoss(tokenTrades);
      const maxDrawdown = this.calculateMaxDrawdown(transactions);
      const sharpeRatio = this.calculateSharpeRatio(tokenTrades);
      const { averageTradeSize, largestTrade, smallestTrade } = this.calculateTradeSizes(transactions);
      const { ethActivity, avaxActivity } = this.calculateChainActivity(transactions);
      
      return {
        totalTrades,
        averageHoldTime,
        tradeFrequency,
        volatilityTolerance,
        diversificationScore,
        emotionalTradingIndicators,
        profitLossRatio,
        maxDrawdown,
        sharpeRatio,
        winRate,
        averageTradeSize,
        largestTrade,
        smallestTrade,
        ethActivity,
        avaxActivity
      };
    }
  
    private calculateChainActivity(transactions: WalletTransaction[]): {
      ethActivity: number;
      avaxActivity: number;
    } {
      const ethTxCount = transactions.filter(tx => tx.chain === 'ETH').length;
      const avaxTxCount = transactions.filter(tx => tx.chain === 'AVAX').length;
      const totalTx = transactions.length;
      
      return {
        ethActivity: totalTx > 0 ? (ethTxCount / totalTx) * 100 : 0,
        avaxActivity: totalTx > 0 ? (avaxTxCount / totalTx) * 100 : 0
      };
    }
  
    private groupTransactionsByToken(transactions: WalletTransaction[]): Map<string, WalletTransaction[]> {
      const tokenTrades = new Map<string, WalletTransaction[]>();
      
      transactions.forEach(tx => {
        const key = `${tx.chain}_${tx.tokenAddress || 'NATIVE'}`;
        if (!tokenTrades.has(key)) {
          tokenTrades.set(key, []);
        }
        tokenTrades.get(key)!.push(tx);
      });
      
      return tokenTrades;
    }
  
    private calculateVolatilityTolerance(
      tokenTrades: Map<string, WalletTransaction[]>,
      transactions: WalletTransaction[]
    ): number {
      const volatileTokensETH = ['SHIB', 'DOGE', 'PEPE', 'FLOKI', 'MEME'];
      const volatileTokensAVAX = ['JOE', 'TIME', 'SPELL', 'MIM'];
      
      let volatileTrades = 0;
      let totalTrades = 0;
      
      tokenTrades.forEach((trades, tokenKey) => {
        totalTrades += trades.length;
        const [chain, tokenAddress] = tokenKey.split('_');
        
        if (chain === 'ETH' && volatileTokensETH.some(vt => tokenKey.includes(vt))) {
          volatileTrades += trades.length;
        } else if (chain === 'AVAX' && volatileTokensAVAX.some(vt => tokenKey.includes(vt))) {
          volatileTrades += trades.length;
        }
      });
      
      return totalTrades > 0 ? (volatileTrades / totalTrades) * 100 : 50;
    }

    private calculateTotalTrades(tokenTrades: Map<string, WalletTransaction[]>): number {
        let total = 0;
        tokenTrades.forEach(trades => {
          total += Math.floor(trades.length / 2);
        });
        return total;
      }
    
      private calculateAverageHoldTime(tokenTrades: Map<string, WalletTransaction[]>): number {
        const holdTimes: number[] = [];
        
        tokenTrades.forEach(trades => {
          const sortedTrades = trades.sort((a, b) => a.timestamp - b.timestamp);
          
          for (let i = 0; i < sortedTrades.length - 1; i += 2) {
            const buyTime = sortedTrades[i].timestamp;
            const sellTime = sortedTrades[i + 1]?.timestamp;
            
            if (sellTime) {
              const holdDays = (sellTime - buyTime) / (1000 * 60 * 60 * 24);
              if (holdDays >= 0.042 && holdDays <= 3650) {
                holdTimes.push(holdDays);
              }
            }
          }
        });
        
        if (holdTimes.length === 0) {
          return 30;
        }
        
        const average = holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length;
        
        return Math.max(1, Math.min(730, average));
      }
    
      private calculateTradeFrequency(transactions: WalletTransaction[]): number {
        if (transactions.length < 2) return 0;
        
        const sortedTx = transactions.sort((a, b) => a.timestamp - b.timestamp);
        const firstTx = sortedTx[0];
        const lastTx = sortedTx[sortedTx.length - 1];
        
        const timeDiffMs = lastTx.timestamp - firstTx.timestamp;
        const weeksDiff = timeDiffMs / (1000 * 60 * 60 * 24 * 7);
        
        if (weeksDiff < 0.142857) {
          const daysDiff = timeDiffMs / (1000 * 60 * 60 * 24);
          const tradesPerDay = daysDiff > 0 ? transactions.length / daysDiff : 0;
          return Math.min(tradesPerDay * 7, 100);
        }
        
        const tradesPerWeek = weeksDiff > 0 ? transactions.length / weeksDiff : 0;
        
        return Math.min(tradesPerWeek, 100);
      }
    
      private calculateDiversificationScore(
        tokenBalances: TokenBalance[],
        tokenTrades: Map<string, WalletTransaction[]>
      ): number {
        const uniqueTokensETH = new Set<string>();
        const uniqueTokensAVAX = new Set<string>();
        
        tokenBalances.forEach(tb => {
          if (tb.chain === 'ETH') uniqueTokensETH.add(tb.tokenAddress);
          else if (tb.chain === 'AVAX') uniqueTokensAVAX.add(tb.tokenAddress);
        });
        
        tokenTrades.forEach((trades, tokenKey) => {
          const [chain, tokenAddress] = tokenKey.split('_');
          if (chain === 'ETH') uniqueTokensETH.add(tokenAddress);
          else if (chain === 'AVAX') uniqueTokensAVAX.add(tokenAddress);
        });
        
        const totalUniqueTokens = uniqueTokensETH.size + uniqueTokensAVAX.size;
        const chainDiversity = (uniqueTokensETH.size > 0 && uniqueTokensAVAX.size > 0) ? 20 : 0;
        
        let score = chainDiversity;
        if (totalUniqueTokens >= 10) score += 70;
        else if (totalUniqueTokens >= 7) score += 50;
        else if (totalUniqueTokens >= 5) score += 30;
        else if (totalUniqueTokens >= 3) score += 20;
        else score += 10;
        
        return Math.min(score, 100);
      }
    
      private detectEmotionalTrading(transactions: WalletTransaction[]): string[] {
        const indicators: string[] = [];
        
        if (transactions.length === 0) {
          return indicators;
        }
        
        const recentTransactions = transactions
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 10);
        
        if (recentTransactions.length >= 3) {
          for (let i = 0; i < recentTransactions.length - 2; i++) {
            const timeDiff1 = recentTransactions[i].timestamp - recentTransactions[i + 1].timestamp;
            const timeDiff2 = recentTransactions[i + 1].timestamp - recentTransactions[i + 2].timestamp;
            
            if (timeDiff1 < 60 * 60 * 1000 && timeDiff2 < 60 * 60 * 1000) {
              indicators.push('Detected rapid successive transactions indicating potential emotional trading');
              break;
            }
          }
        }
        
        if (transactions.length >= 5) {
          const sortedTx = transactions.sort((a, b) => a.timestamp - b.timestamp);
          const timeSpan = sortedTx[sortedTx.length - 1].timestamp - sortedTx[0].timestamp;
          const daysSpan = timeSpan / (1000 * 60 * 60 * 24);
          
          if (daysSpan > 0 && transactions.length / daysSpan > 10) {
            indicators.push('High transaction frequency detected - consider implementing trading limits');
          }
        }
        
        return indicators;
      }
    
      private calculateProfitLoss(tokenTrades: Map<string, WalletTransaction[]>): {
        profitLossRatio: number;
        winRate: number;
      } {
        // For now, return reasonable defaults since we don't have price data
        // In a real implementation, you would need historical price data to calculate actual P&L
        return {
          profitLossRatio: 1.0, // Neutral
          winRate: 0.5 // 50% win rate as default
        };
      }
    
      private calculateMaxDrawdown(transactions: WalletTransaction[]): number {
        // Calculate max drawdown based on transaction frequency and timing
        if (transactions.length < 3) return 0;
        
        const sortedTx = transactions.sort((a, b) => a.timestamp - b.timestamp);
        let maxDrawdown = 0;
        
        // Simple heuristic: if there are many transactions in a short period, assume higher drawdown
        const timeSpan = sortedTx[sortedTx.length - 1].timestamp - sortedTx[0].timestamp;
        const daysSpan = timeSpan / (1000 * 60 * 60 * 24);
        
        if (daysSpan > 0) {
          const txPerDay = transactions.length / daysSpan;
          maxDrawdown = Math.min(txPerDay * 2, 50); // Cap at 50%
        }
        
        return maxDrawdown;
      }
    
      private calculateSharpeRatio(tokenTrades: Map<string, WalletTransaction[]>): number {
        // Calculate a simplified Sharpe ratio based on trading patterns
        if (tokenTrades.size === 0) return 0;
        
        let totalTrades = 0;
        tokenTrades.forEach(trades => {
          totalTrades += trades.length;
        });
        
        // Higher number of trades with good diversification suggests better risk-adjusted returns
        const diversificationBonus = Math.min(tokenTrades.size * 0.1, 0.5);
        const tradeFrequencyBonus = Math.min(totalTrades * 0.01, 0.3);
        
        return Math.min(1.0 + diversificationBonus + tradeFrequencyBonus, 2.0);
      }
    
      private calculateTradeSizes(transactions: WalletTransaction[]): {
        averageTradeSize: number;
        largestTrade: number;
        smallestTrade: number;
      } {
        const tradeSizes = transactions.map(tx => {
          if (tx.value === '0' || !tx.value) return 0;
          
          if (tx.tokenDecimals) {
            return parseFloat(ethers.formatUnits(tx.value, tx.tokenDecimals));
          } else {
            return parseFloat(ethers.formatEther(tx.value));
          }
        }).filter(size => size > 0);
        
        if (tradeSizes.length === 0) {
          return { averageTradeSize: 0, largestTrade: 0, smallestTrade: 0 };
        }
        
        return {
          averageTradeSize: tradeSizes.reduce((a, b) => a + b, 0) / tradeSizes.length,
          largestTrade: Math.max(...tradeSizes),
          smallestTrade: Math.min(...tradeSizes)
        };
      }
}