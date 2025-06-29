import {
  logger,
  type IAgentRuntime,
  type Project,
  type ProjectAgent,
} from '@elizaos/core';
import { fumPlugin } from './plugin';
import { fumAdvisor } from './characters/fum_advisor';

const initCharacter = ({ runtime }: { runtime: IAgentRuntime }) => {
  logger.info('Initializing character');
  logger.info('Name: ', fumAdvisor.name);
};

export const projectAgent: ProjectAgent = {
  character: fumAdvisor,
  init: async (runtime: IAgentRuntime) => await initCharacter({ runtime }),
  plugins: [fumPlugin],
};
const project: Project = {
  agents: [projectAgent],
};

export default project;
