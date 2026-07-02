import type { Project as DomainProject, CreateProjectInput, UpdateProjectInput } from '../../../domain/models';
import type { Project as RestProject } from '../../../types/task';
import { MISSING_REST_TIMESTAMP, toDomainId } from './mapperUtils';

export function mapProjectDtoToDomain(dto: RestProject): DomainProject {
  return {
    id: toDomainId(dto.projectID),
    title: dto.title,
    description: dto.description ?? null,
    dueDate: dto.dueDate ?? null,
    createdAt: MISSING_REST_TIMESTAMP,
    updatedAt: MISSING_REST_TIMESTAMP,
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
