import { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';

export const MarketDataProvider: Provider = {
  name: 'marketData',
  description: 'Provides real-time market data for commitment analysis',
  
  get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
    try {
      const coingeckoKey = runtime.getSetting('COINGECKO_API_KEY');
      const baseUrl = coingeckoKey 
        ? `https://api.coingecko.com/api/v3?x_cg_demo_api_key=${coingeckoKey}`
        : 'https://api.coingecko.com/api/v3';

      const fearGreedUrl = 'https://api.alternative.me/fng/';
      const fearGreedResponse = await fetch(fearGreedUrl);
      const fearGreedData = await fearGreedResponse.json() as any;

      const pricesUrl = `${baseUrl}/simple/price?ids=bitcoin,ethereum,solana,cardano,polkadot&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`;
      const pricesResponse = await fetch(pricesUrl);
      const pricesData = await pricesResponse.json() as any;

      const sentimentUrl = `${baseUrl}/global`;
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

      const marketData = {
        btc: pricesData.bitcoin?.usd || 65000,
        eth: pricesData.ethereum?.usd || 3500,
        sol: pricesData.solana?.usd || 120,
        ada: pricesData.cardano?.usd || 0.5,
        dot: pricesData.polkadot?.usd || 7,
        sentiment,
        volatility,
        fearGreedIndex,
        marketCapChange24h,
        btcChange24h: pricesData.bitcoin?.usd_24h_change || 0,
        ethChange24h: pricesData.ethereum?.usd_24h_change || 0,
        solChange24h: pricesData.solana?.usd_24h_change || 0,
        timestamp: Date.now()
      };
      
      return {
        text: `📊 **Real-Time Market Conditions**
        
**Prices:** BTC $${marketData.btc.toLocaleString()} (${marketData.btcChange24h > 0 ? '+' : ''}${marketData.btcChange24h.toFixed(2)}%), ETH $${marketData.eth.toLocaleString()} (${marketData.ethChange24h > 0 ? '+' : ''}${marketData.ethChange24h.toFixed(2)}%)
**Sentiment:** ${marketData.sentiment.charAt(0).toUpperCase() + marketData.sentiment.slice(1)} (Fear & Greed: ${marketData.fearGreedIndex})
**Volatility:** ${marketData.volatility.charAt(0).toUpperCase() + marketData.volatility.slice(1)} (24h Market Change: ${marketData.marketCapChange24h > 0 ? '+' : ''}${marketData.marketCapChange24h.toFixed(2)}%)`,
        values: {
          btcPrice: marketData.btc,
          ethPrice: marketData.eth,
          solPrice: marketData.sol,
          marketSentiment: marketData.sentiment,
          volatilityIndex: marketData.volatility,
          fearGreedIndex: marketData.fearGreedIndex,
          marketCapChange24h: marketData.marketCapChange24h
        },
        data: {
          rawMarketData: marketData
        }
      };
    } catch (error) {
      console.error('Error fetching market data:', error);
      
      const fallbackData = {
        btc: 65000,
        eth: 3500,
        sol: 120,
        sentiment: 'neutral',
        volatility: 'moderate',
        fearGreedIndex: 55,
        marketCapChange24h: 0,
        timestamp: Date.now()
      };
      
      return {
        text: `⚠️ **Market Data Unavailable**
        
Using fallback data due to API connectivity issues:
BTC $${fallbackData.btc.toLocaleString()}, ETH $${fallbackData.eth.toLocaleString()}, Sentiment: ${fallbackData.sentiment}`,
        values: {
          btcPrice: fallbackData.btc,
          ethPrice: fallbackData.eth,
          solPrice: fallbackData.sol,
          marketSentiment: fallbackData.sentiment,
          volatilityIndex: fallbackData.volatility,
          fearGreedIndex: fallbackData.fearGreedIndex,
          marketCapChange24h: fallbackData.marketCapChange24h
        },
        data: {
          rawMarketData: fallbackData,
          error: error.message
        }
      };
    }
  }
};