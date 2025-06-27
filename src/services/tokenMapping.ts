import { IAgentRuntime } from '@elizaos/core';

export interface TokenInfo {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  volume_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d: number;
  price_change_percentage_30d: number;
  price_change_percentage_1y: number;
  ath: number;
  ath_change_percentage: number;
  atl: number;
  atl_change_percentage: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  sparkline_in_7d: {
    price: number[];
  };
}

export class TokenMappingService {
  private coingeckoKey: string;
  private tokenCache: Map<string, string> = new Map();

  constructor(runtime: IAgentRuntime) {
    this.coingeckoKey = runtime.getSetting('COINGECKO_API_KEY') || '';
  }

  private getCoingeckoUrl(endpoint: string, isKeyRequired: boolean = true): string {
    const baseUrl = isKeyRequired ? `https://api.coingecko.com/api/v3?x_cg_demo_api_key=${this.coingeckoKey}` : 'https://api.coingecko.com/api/v3';
    return `${baseUrl}/${endpoint}`;
  }

  async getTokenId(symbol: string): Promise<string | null> {
    const normalizedSymbol = symbol.toLowerCase();
    
    if (this.tokenCache.has(normalizedSymbol)) {
      return this.tokenCache.get(normalizedSymbol)!;
    }

    const commonTokens = this.getCommonTokens();
    if (commonTokens[normalizedSymbol]) {
      this.tokenCache.set(normalizedSymbol, commonTokens[normalizedSymbol]);
      return commonTokens[normalizedSymbol];
    }

    try {
      const url = this.getCoingeckoUrl('coins/list', false);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch coins list: ${response.status}`);
      }
      
      const coins = await response.json() as Array<{id: string, symbol: string, name: string}>;
      
      const exactMatch = coins.find(coin => coin.symbol.toLowerCase() === normalizedSymbol);
      if (exactMatch) {
        this.tokenCache.set(normalizedSymbol, exactMatch.id);
        return exactMatch.id;
      }

      const nameMatch = coins.find(coin => 
        coin.name.toLowerCase() === normalizedSymbol ||
        coin.name.toLowerCase().replace(/\s+/g, '') === normalizedSymbol
      );
      if (nameMatch) {
        this.tokenCache.set(normalizedSymbol, nameMatch.id);
        return nameMatch.id;
      }

      const partialMatches = coins.filter(coin => 
        coin.symbol.toLowerCase().includes(normalizedSymbol) || 
        normalizedSymbol.includes(coin.symbol.toLowerCase()) ||
        coin.name.toLowerCase().includes(normalizedSymbol) ||
        normalizedSymbol.includes(coin.name.toLowerCase())
      );

      if (partialMatches.length > 0) {
        const bestMatch = partialMatches[0];
        this.tokenCache.set(normalizedSymbol, bestMatch.id);
        return bestMatch.id;
      }

      return null;
    } catch (error) {
      console.error('Error fetching token ID:', error);
      return null;
    }
  }

  async getTokenData(symbol: string): Promise<TokenInfo | null> {
    const tokenId = await this.getTokenId(symbol);
    
    if (!tokenId) {
      return null;
    }

    try {
      const url = this.getCoingeckoUrl(`coins/${tokenId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=true`, false);
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Failed to fetch token data:', response.status, response.statusText);
        throw new Error(`Failed to fetch token data: ${response.status}`);
      }
      
      const data = await response.json() as TokenInfo;
      return data;
    } catch (error) {
      console.error('Error fetching token data:', error);
      return null;
    }
  }

  async getTokenPrice(symbol: string): Promise<number | null> {
    const tokenId = await this.getTokenId(symbol);
    if (!tokenId) {
      return null;
    }

    try {
      const url = this.getCoingeckoUrl(`simple/price?ids=${tokenId}&vs_currencies=usd`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch token price: ${response.status}`);
      }
      
      const data = await response.json() as any;
      return data[tokenId]?.usd || null;
    } catch (error) {
      console.error('Error fetching token price:', error);
      return null;
    }
  }

  async getHistoricalData(symbol: string, days: number): Promise<number[][] | null> {
    const tokenId = await this.getTokenId(symbol);
    if (!tokenId) {
      return null;
    }

    try {
      const url = this.getCoingeckoUrl(`coins/${tokenId}/market_chart?vs_currency=usd&days=${days}`, false);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch historical data: ${response.status}`);
      }
      
      const data = await response.json() as { prices: number[][] };
      return data.prices;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return null;
    }
  }

  getCommonTokens(): Record<string, string> {
    return {
      'btc': 'bitcoin',
      'bitcoin': 'bitcoin',
      'eth': 'ethereum',
      'ethereum': 'ethereum',
      'usdt': 'tether',
      'tether': 'tether',
      'usdc': 'usd-coin',
      'usd-coin': 'usd-coin',
      'bnb': 'binancecoin',
      'binancecoin': 'binancecoin',
      
      'sol': 'solana',
      'solana': 'solana',
      'ada': 'cardano',
      'cardano': 'cardano',
      'avax': 'avalanche-2',
      'avalanche': 'avalanche-2',
      'dot': 'polkadot',
      'polkadot': 'polkadot',
      'atom': 'cosmos',
      'cosmos': 'cosmos',
      'etc': 'ethereum-classic',
      'ethereum-classic': 'ethereum-classic',
      
      'matic': 'matic-network',
      'polygon': 'matic-network',
      'link': 'chainlink',
      'chainlink': 'chainlink',
      'uni': 'uniswap',
      'uniswap': 'uniswap',
      
      'ltc': 'litecoin',
      'litecoin': 'litecoin',
      'bch': 'bitcoin-cash',
      'bitcoin-cash': 'bitcoin-cash',
      'xrp': 'ripple',
      'ripple': 'ripple',
      'doge': 'dogecoin',
      'dogecoin': 'dogecoin',
      'shib': 'shiba-inu',
      'shiba-inu': 'shiba-inu',
      'trx': 'tron',
      'tron': 'tron'
    };
  }

  async getSuggestedTokens(symbol: string): Promise<Array<{id: string, symbol: string, name: string}>> {
    const normalizedSymbol = symbol.toLowerCase();
    
    try {
      const url = this.getCoingeckoUrl('coins/list');
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch coins list: ${response.status}`);
      }
      
      const coins = await response.json() as Array<{id: string, symbol: string, name: string}>;
      
      const suggestions = coins.filter(coin => 
        coin.symbol.toLowerCase().includes(normalizedSymbol) || 
        coin.name.toLowerCase().includes(normalizedSymbol)
      ).slice(0, 10);
      
      return suggestions;
    } catch (error) {
      console.error('Error fetching suggested tokens:', error);
      return [];
    }
  }
}