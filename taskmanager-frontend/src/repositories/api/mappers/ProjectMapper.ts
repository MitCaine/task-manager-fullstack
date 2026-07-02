import type { Project as DomainProject, CreateProjectInput, UpdateProjectInput } from '../../../domain/models';
import type { Project as RestProject } from '../../../types/task';
import { toRequiredDomainId } from './mapperUtils';

export function mapProjectDtoToDomain(dto: RestProject): DomainProject {
  return {
    id: toRequiredDomainId(dto.projectID, 'projectID'),
    title: dto.title,
    description: dto.description ?? null,
    dueDate: dto.dueDate ?? null,
    createdAt: null,
    updatedAt: null,
  };
}

export function mapCreateProjectInputToDto(input: CreateProjectInput): Omit<RestProject, 'projectID'> {
  return {
    title: input.title,
    description: input.description ?? null,
    dueDate: input.dueDate ?? null,
  };
}

export function mapUpdateProjectInputToDto(input: UpdateProjectInput): Omit<RestProject, 'projectID'> {
  return mapCreateProjectInputToDto(input);
}
