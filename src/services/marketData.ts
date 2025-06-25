import { IAgentRuntime } from '@elizaos/core';
import { MarketData, FearGreedData } from '../types';

export class MarketDataService {
  private coingeckoKey: string;

  constructor(runtime: IAgentRuntime) {
    this.coingeckoKey = runtime.getSetting('COINGECKO_API_KEY') || '';
  }

  private getCoingeckoUrl(endpoint: string): string {
    const baseUrl = this.coingeckoKey 
      ? `https://api.coingecko.com/api/v3?x_cg_demo_api_key=${this.coingeckoKey}`
      : 'https://api.coingecko.com/api/v3';
    return `${baseUrl}/${endpoint}`;
  }

  async getMarketData(): Promise<MarketData | null> {
    try {
      const fearGreedUrl = 'https://api.alternative.me/fng/';
      const fearGreedResponse = await fetch(fearGreedUrl);
      const fearGreedData = await fearGreedResponse.json() as any;

      const pricesUrl = this.getCoingeckoUrl('simple/price?ids=bitcoin,ethereum,solana,cardano,polkadot&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true');
      const pricesResponse = await fetch(pricesUrl);
      const pricesData = await pricesResponse.json() as any;

      const sentimentUrl = this.getCoingeckoUrl('global');
      const sentimentResponse = await fetch(sentimentUrl);
      const sentimentData = await sentimentResponse.json() as any;

      const fearGreedIndex = parseInt(fearGreedData.data[0].value);
      const marketCapChange24h = sentimentData.data?.market_cap_change_percentage_24h_usd || 0;
      
      let sentiment = 'neutral';
      if (fearGreedIndex >= 75) sentiment = 'extreme greed';
      else if (fearGreedIndex >= 60) sentiment = 'greed';
      else if (fearGreedIndex >= 40) sentiment = 'neutral';
      else if (fearGreedIndex >= 25) sentiment = 'fear';
      else sentiment = 'extreme fear';

      let volatility = 'low';
      const absChange = Math.abs(marketCapChange24h);
      if (absChange > 10) volatility = 'extreme';
      else if (absChange > 5) volatility = 'high';
      else if (absChange > 2) volatility = 'moderate';
      else volatility = 'low';

      return {
        btc: pricesData.bitcoin?.usd || 65000,
        eth: pricesData.ethereum?.usd || 3500,
        sol: pricesData.solana?.usd || 120,
        sentiment,
        volatility,
        fearGreedIndex,
        marketCapChange24h,
        btcChange24h: pricesData.bitcoin?.usd_24h_change || 0,
        ethChange24h: pricesData.ethereum?.usd_24h_change || 0,
        solChange24h: pricesData.solana?.usd_24h_change || 0,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching market data:', error);
      return null;
    }
  }

  async getFearGreedData(): Promise<FearGreedData | null> {
    try {
      const response = await fetch('https://api.alternative.me/fng/');
      if (!response.ok) {
        throw new Error(`Failed to fetch Fear & Greed Index: ${response.status}`);
      }
      
      const data = await response.json() as any;
      const fearGreedData = data.data[0];
      
      return {
        value: parseInt(fearGreedData.value),
        classification: fearGreedData.value_classification,
        timestamp: parseInt(fearGreedData.timestamp)
      };
    } catch (error) {
      console.error('Error fetching Fear & Greed Index:', error);
      return null;
    }
  }

  getMarketContextText(marketData: MarketData): string {
    return `📊 **Real-Time Market Conditions**

**Prices:** BTC $${marketData.btc.toLocaleString()} (${marketData.btcChange24h > 0 ? '+' : ''}${marketData.btcChange24h.toFixed(2)}%), ETH $${marketData.eth.toLocaleString()} (${marketData.ethChange24h > 0 ? '+' : ''}${marketData.ethChange24h.toFixed(2)}%)
**Sentiment:** ${marketData.sentiment.charAt(0).toUpperCase() + marketData.sentiment.slice(1)} (Fear & Greed: ${marketData.fearGreedIndex})
**Volatility:** ${marketData.volatility.charAt(0).toUpperCase() + marketData.volatility.slice(1)} (24h Market Change: ${marketData.marketCapChange24h > 0 ? '+' : ''}${marketData.marketCapChange24h.toFixed(2)}%)`;
  }

  getBehavioralContext(marketData: MarketData): string {
    let context = '';
    
    if (marketData.sentiment === 'extreme fear') {
      context += '• Extreme fear often marks market bottoms - good time for commitment strategies\n';
    } else if (marketData.sentiment === 'extreme greed') {
      context += '• Extreme greed suggests potential market top - consider waiting\n';
    }
    
    if (marketData.volatility === 'extreme') {
      context += '• High volatility - focus on risk management and shorter commitments\n';
    } else if (marketData.volatility === 'low') {
      context += '• Low volatility - good environment for longer-term commitments\n';
    }
    
    return context;
  }
} 