import { TokenMappingService } from "./tokenMapping";

interface SupportedTokenInfo {
  coingeckoId: string;
  symbol: string;
  name: string;
  isSupported: boolean;
  network: string;
}

interface TokenValidationResult {
  isValid: boolean;
  tokenInfo?: SupportedTokenInfo;
  error?: string;
  suggestions?: string[];
}

export class SupportedTokenMappingService extends TokenMappingService {
  private supportedTokens: Record<string, SupportedTokenInfo> = {
    'avax': {
      coingeckoId: 'avalanche-2',
      symbol: 'AVAX',
      name: 'Avalanche',
      isSupported: true,
      network: 'Avalanche'
    },
    'eth': {
      coingeckoId: 'ethereum',
      symbol: 'ETH',
      name: 'Ethereum',
      isSupported: true,
      network: 'Ethereum'
    },
    'monad': {
      coingeckoId: 'monad',
      symbol: 'MONAD',
      name: 'Monad',
      isSupported: true,
      network: 'Monad'
    }
  };

  async validateToken(symbol: string): Promise<TokenValidationResult> {
    const normalizedSymbol = symbol.toLowerCase();
    const tokenInfo = this.supportedTokens[normalizedSymbol];
    
    if (!tokenInfo) {
      return {
        isValid: false,
        error: `Token ${symbol} is not supported by CipherVault`,
        suggestions: this.getSuggestions(symbol)
      };
    }

    if (!tokenInfo.isSupported) {
      return {
        isValid: false,
        error: `Token ${symbol} is not currently supported by CipherVault`,
        suggestions: Object.keys(this.supportedTokens)
          .filter(s => this.supportedTokens[s].isSupported)
          .slice(0, 5)
      };
    }
    
    return {
      isValid: true,
      tokenInfo
    };
  }

  getSuggestions(symbol: string): string[] {
    const supported = Object.keys(this.supportedTokens)
      .filter(s => this.supportedTokens[s].isSupported);
    
    const similar = supported.filter(s => 
      s.includes(symbol.toLowerCase()) || 
      symbol.toLowerCase().includes(s)
    );
    
    return similar.length > 0 ? similar : supported.slice(0, 5);
  }

  getSupportedTokens(): string[] {
    return Object.keys(this.supportedTokens)
      .filter(s => this.supportedTokens[s].isSupported);
  }

  getTokenInfo(symbol: string): SupportedTokenInfo | undefined {
    return this.supportedTokens[symbol.toLowerCase()];
  }
} 