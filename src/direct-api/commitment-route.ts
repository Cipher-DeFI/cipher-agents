import type { IAgentRuntime, Route, Memory, UUID, Content } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

export const apiMessageRoute: Route = {
  path: '/api/message',
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
      const fumAction = actions.find(a => a.name === 'FUM_ANALYZE_COMMITMENT');
      
      if (!fumAction) {
        return res.status(500).json({
          success: false,
          error: 'FUM_ANALYZE_COMMITMENT action not found'
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
          actionName = (content as any).action || (content as any).actions?.[0] || 'FUM_ANALYZE_COMMITMENT';
          
          if (content.metadata) {
            responseData = content.metadata;
          }
          
          return [];
        }
      );

      res.json({
        success: true,
        data: {
          response: responseText,
          action: actionName,
          character: runtime.character.name,
          
          analysis: responseData?.analysis || null,
          amount: responseData?.amount || null,
          tokenSymbol: responseData?.token || null,
          duration: responseData?.durationInDays || responseData?.duration || null,
          unit: responseData?.unit || 'days',
          fearAndGreed: responseData?.fearGreedData || null
        }
      });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  }
};