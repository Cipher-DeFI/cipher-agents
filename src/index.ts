import {
  logger,
  type IAgentRuntime,
  type Project,
  type ProjectAgent,
} from '@elizaos/core';
import { cipherPlugin } from './plugin';
import { cipherAdvisor } from './characters/cipher_advisor_legacy';

const initCharacter = ({ runtime }: { runtime: IAgentRuntime }) => {
  logger.info('Initializing character');
  logger.info('Name: ', cipherAdvisor.name);
};

export const projectAgent: ProjectAgent = {
  character: cipherAdvisor,
  init: async (runtime: IAgentRuntime) => await initCharacter({ runtime }),
  plugins: [cipherPlugin],
};
const project: Project = {
  agents: [projectAgent],
};

export default project;
