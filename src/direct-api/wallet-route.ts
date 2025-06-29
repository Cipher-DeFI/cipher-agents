import type { IAgentRuntime, Route, Memory, UUID, Content } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

export const walletAnalysisRoute: Route = {
  path: '/api/wallet-analysis',
  type: 'POST',
  handler: async (req: any, res: any, runtime: IAgentRuntime) => {
    try {
      const { text, walletAddress } = req.body;

      if (!text) {
        return res.status(400).json({
          success: false,
          error: 'Text is required'
        });
      }

      const tempMessage: Memory = {
        id: uuidv4() as UUID,
        entityId: uuidv4() as UUID,
        agentId: runtime.agentId,
        content: { text },
        roomId: uuidv4() as UUID,
        createdAt: Date.now(),
      };

      const state = await runtime.composeState(tempMessage, [
        'TIME',
        'CHARACTER',
        'ANXIETY',
        'KNOWLEDGE',
        'ACTIONS',
        'PROVIDERS',
        'EVALUATORS',
        'CAPABILITIES'
      ]);

      const actions = runtime.actions || [];
      const cipherAction = actions.find(a => a.name === 'CIPHER_ANALYZE_WALLET');
      
      if (!cipherAction) {
        return res.status(500).json({
          success: false,
          error: 'CIPHER_ANALYZE_WALLET action not found'
        });
      }

      let responseData: any = null;
      let responseText = '';
      let actionName = '';
      
      await cipherAction.handler(
        runtime,
        tempMessage,
        state,
        {},
        async (content: Content) => {
          responseText = content.text || '';
          actionName = (content as any).action || (content as any).actions?.[0] || 'CIPHER_ANALYZE_WALLET';
          
          if (content.metadata) {
            responseData = content.metadata;
          }
          
          return [];
        }
      );

      const analysis = responseData?.analysis || null;
      
      res.json({
        success: true,
        data: {
          action: actionName,
          character: runtime.character.name,
          riskScore: analysis?.riskScore || null,
          confidencePercentage: analysis?.confidencePercentage || null,
          riskProfile: analysis?.riskProfile || null,
          marketAnalysis: analysis?.marketAnalysis || null,
          userTradingFactors: analysis?.userTradingFactors || null,
          riskTolerance: analysis?.riskTolerance || null,
          personalizedRecommendations: analysis?.personalizedRecommendations || null,
          walletAddress: responseData?.walletAddress || walletAddress || null,
          marketData: responseData?.marketData || null
        }
      });
    } catch (error) {
      console.error('Wallet analysis error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  }
};
