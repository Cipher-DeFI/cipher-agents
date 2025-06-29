import type { Plugin, IAgentRuntime } from '@elizaos/core';
import { CommitmentAnalysisAction } from './actions/commitmentAnalysis';
import { WalletAnalysisAction } from './actions/walletAnalysis';
import { VaultsAnalysisAction } from './actions/vaultsAnalysis';
import { MarketDataProvider } from './providers/marketData';
import { apiMessageRoute } from './direct-api/commitment-route';
import { walletAnalysisRoute } from './direct-api/wallet-route';
import { vaultsAnalysisRoute } from './direct-api/vaults-route';

export const cipherPlugin: Plugin = {
  name: 'cipher',
  description: 'Cipher Protocol Plugin for DeFi behavioral analysis with real market data',
  
  actions: [
    CommitmentAnalysisAction,
    WalletAnalysisAction,
    VaultsAnalysisAction,
  ],
  
  providers: [
    MarketDataProvider,
  ],

  routes: [
    apiMessageRoute,
    walletAnalysisRoute,
    vaultsAnalysisRoute,
  ],

    
  init: async (config: Record<string, string>, runtime: IAgentRuntime) => {
    console.log('✨ F.U.M Plugin initialized');
    
    const requiredKeys = ['COINGECKO_API_KEY'];
    for (const key of requiredKeys) {
      if (!runtime.getSetting(key)) {
        console.warn(`⚠️  Missing ${key} - some features may be limited`);
      }
    }
  }
};

export default fumPlugin;