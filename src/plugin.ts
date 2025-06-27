import type { Plugin, IAgentRuntime } from '@elizaos/core';
import { CommitmentAnalysisAction } from './actions/commitmentAnalysis';
import { MarketDataProvider } from './providers/marketData';
import { apiMessageRoute } from './api-routes';

export const fumPlugin: Plugin = {
  name: 'fum',
  description: 'F.U.M - Fund Ur Memory Plugin for DeFi behavioral analysis with real market data',
  
  actions: [
    CommitmentAnalysisAction,
  ],
  
  providers: [
    MarketDataProvider,
  ],

  routes: [
    apiMessageRoute,
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