import type { IAgentRuntime, Route, Memory, UUID, Content } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

export const vaultsAnalysisRoute: Route = {
  path: '/api/vaults-analysis',
  type: 'POST',
  handler: async (req: any, res: any, runtime: IAgentRuntime) => {
    try {
      const { text } = req.body;

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
      const fumAction = actions.find(a => a.name === 'FUM_ANALYZE_VAULTS');
      
      if (!fumAction) {
        return res.status(500).json({
          success: false,
          error: 'FUM_ANALYZE_VAULTS action not found'
        });
      }

      let responseData: any = null;
      let responseText = '';
      let actionName = '';
      
      await fumAction.handler(
        runtime,
        tempMessage,
        state,
        {},
        async (content: Content) => {
          responseText = content.text || '';
          actionName = (content as any).action || (content as any).actions?.[0] || 'FUM_ANALYZE_VAULTS';
          
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
          response: responseText,
          action: actionName,
          character: runtime.character.name,
          
          totalVaults: analysis?.totalVaults || null,
          activeVaults: analysis?.activeVaults || null,
          completedVaults: analysis?.completedVaults || null,
          emergencyWithdrawnVaults: analysis?.emergencyWithdrawnVaults || null,
          successRate: analysis?.successRate || null,
          
          totalValueLocked: analysis?.totalValueLocked || null,
          averageAmount: analysis?.averageAmount || null,
          averageLockDuration: analysis?.averageLockDuration || null,
          
          timeDistribution: analysis?.timeDistribution || null,
          
          topTokens: analysis?.topTokens || null,
          
          commonPatterns: analysis?.commonPatterns || null,
          riskInsights: analysis?.riskInsights || null,
          behavioralInsights: analysis?.behavioralInsights || null,
          marketInsights: analysis?.marketInsights || null,
          recommendations: analysis?.recommendations || null,
          
          marketData: responseData?.marketData || null
        }
      });
    } catch (error) {
      console.error('Vaults analysis error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  }
}; 