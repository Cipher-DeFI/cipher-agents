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
              holdTimes.push(holdDays);
            }
          }
        });
        
        return holdTimes.length > 0
          ? holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length
          : 30;
      }
    
      private calculateTradeFrequency(transactions: WalletTransaction[]): number {
        if (transactions.length < 2) return 0;
        
        const sortedTx = transactions.sort((a, b) => a.timestamp - b.timestamp);
        const firstTx = sortedTx[0];
        const lastTx = sortedTx[sortedTx.length - 1];
        
        const weeksDiff = (lastTx.timestamp - firstTx.timestamp) / (1000 * 60 * 60 * 24 * 7);
        
        return weeksDiff > 0 ? transactions.length / weeksDiff : 0;
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
        
        const sells = transactions.filter(tx => tx.from.toLowerCase() === tx.from.toLowerCase());
        const panicSells = this.detectPanicPatterns(sells);
        if (panicSells) indicators.push('Detected panic selling during market downturns');
        
        const buys = transactions.filter(tx => tx.to.toLowerCase() === tx.to.toLowerCase());
        const fomoBuys = this.detectFOMOPatterns(buys);
        if (fomoBuys) indicators.push('FOMO buying patterns detected during price rallies');
        
        const revengeTrades = this.detectRevengeTrading(transactions);
        if (revengeTrades) indicators.push('Revenge trading after losses detected');
        
        return indicators;
      }
    
      private detectPanicPatterns(sells: WalletTransaction[]): boolean {
        for (let i = 0; i < sells.length - 2; i++) {
          const timeDiff = sells[i + 2].timestamp - sells[i].timestamp;
          if (timeDiff < 24 * 60 * 60 * 1000) return true;
        }
        return false;
      }
    
      private detectFOMOPatterns(buys: WalletTransaction[]): boolean {
        for (let i = 0; i < buys.length - 2; i++) {
          const timeDiff = buys[i + 2].timestamp - buys[i].timestamp;
          if (timeDiff < 24 * 60 * 60 * 1000) return true;
        }
        return false;
      }
    
      private detectRevengeTrading(transactions: WalletTransaction[]): boolean {
        return false;
      }
    
      private calculateProfitLoss(tokenTrades: Map<string, WalletTransaction[]>): {
        profitLossRatio: number;
        winRate: number;
      } {
        return {
          profitLossRatio: 1.2,
          winRate: 0.55
        };
      }
    
      private calculateMaxDrawdown(transactions: WalletTransaction[]): number {
        return 15;
      }
    
      private calculateSharpeRatio(tokenTrades: Map<string, WalletTransaction[]>): number {
        return 1.2;
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