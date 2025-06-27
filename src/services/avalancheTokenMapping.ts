import { TokenMappingService } from "./tokenMapping";

interface AvalancheTokenInfo {
    coingeckoId: string;
    contractAddress: string;
    symbol: string;
    name: string;
    chainlinkPriceFeed: string | null;
    isSupported: boolean;
  }
  
  interface AvalancheValidationResult {
    isValid: boolean;
    tokenInfo?: AvalancheTokenInfo;
    contractExists?: boolean;
    chainlinkPriceFeed?: string | null;
    error?: string;
    suggestions?: string[];
  }

export class AvalancheTokenMappingService extends TokenMappingService {
    private avalancheTokens: Record<string, AvalancheTokenInfo> = {
      'avax': {
        coingeckoId: 'avalanche-2',
        contractAddress: '0x0000000000000000000000000000000000000000',
        symbol: 'AVAX',
        name: 'Avalanche',
        chainlinkPriceFeed: '0x0A77230d17318075983913bC2145DB16C7366156',
        isSupported: true
      },
      'wavax': {
        coingeckoId: 'wrapped-avax',
        contractAddress: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
        symbol: 'WAVAX',
        name: 'Wrapped AVAX',
        chainlinkPriceFeed: '0x0A77230d17318075983913bC2145DB16C7366156',
        isSupported: true
      },
      'usdc.e': {
        coingeckoId: 'avalanche-bridged-usdc-avalanche',
        contractAddress: '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664',
        symbol: 'USDC.e',
        name: 'Avalanche Bridged USDC',
        chainlinkPriceFeed: '0xF096872672F44d6EBA71458D74fe67F9a77a23B6',
        isSupported: true
      },
      'usdt.e': {
        coingeckoId: 'tether-avalanche-bridged-usdt-e',
        contractAddress: '0xc7198437980c041c805a1edcba50c1ce5db95118',
        symbol: 'USDT.e',
        name: 'Tether Avalanche Bridged',
        chainlinkPriceFeed: '0xEBE676ee90Fe1112671f19b6B7459bC678B67e8a',
        isSupported: true
      },
      'joe': {
        coingeckoId: 'joe',
        contractAddress: '0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd',
        symbol: 'JOE',
        name: 'JoeToken',
        chainlinkPriceFeed: null,
        isSupported: false
      },
      'png': {
        coingeckoId: 'pangolin',
        contractAddress: '0x60781c2586d68229fde47564546784ab3faca982',
        symbol: 'PNG',
        name: 'Pangolin',
        chainlinkPriceFeed: null,
        isSupported: false
      }
    };
  
    async validateAvalancheToken(symbol: string): Promise<AvalancheValidationResult> {
      const normalizedSymbol = symbol.toLowerCase();
      const tokenInfo = this.avalancheTokens[normalizedSymbol];
      
      if (!tokenInfo) {
        return {
          isValid: false,
          error: `Token ${symbol} not found on Avalanche C-Chain`,
          suggestions: this.getAvalancheSuggestions(symbol)
        };
      }
  
      if (!tokenInfo.isSupported) {
        return {
          isValid: false,
          error: `Token ${symbol} not supported by FUMVault (no reliable price feed)`,
          suggestions: Object.keys(this.avalancheTokens)
            .filter(s => this.avalancheTokens[s].isSupported)
            .slice(0, 5)
        };
      }
  
      const contractExists = await this.verifyContract(tokenInfo.contractAddress);
      
      return {
        isValid: true,
        tokenInfo,
        contractExists,
        chainlinkPriceFeed: tokenInfo.chainlinkPriceFeed
      };
    }
  
    private async verifyContract(address: string): Promise<boolean> {
      if (address === '0x0000000000000000000000000000000000000000') {
        return true;
      }
      
      try {
        const response = await fetch(
          `https://api.snowtrace.io/api?module=contract&action=getabi&address=${address}`
        );
        const data = await response.json() as { status: string };
        return data.status === '1';
      } catch (error) {
        console.warn('Could not verify contract:', error);
        return true;
      }
    }
  
    getAvalancheSuggestions(symbol: string): string[] {
      const supported = Object.keys(this.avalancheTokens)
        .filter(s => this.avalancheTokens[s].isSupported);
      
      const similar = supported.filter(s => 
        s.includes(symbol.toLowerCase()) || 
        symbol.toLowerCase().includes(s)
      );
      
      return similar.length > 0 ? similar : supported.slice(0, 5);
    }
  }