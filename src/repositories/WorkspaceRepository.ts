import { LowdbWorkspaceRepository } from './lowdb/WorkspaceRepository.js';

export const WorkspaceRepository = new LowdbWorkspaceRepository();

export type { WorkspaceRepositoryContract } from '../types/WorkspaceRepository.types.js';
