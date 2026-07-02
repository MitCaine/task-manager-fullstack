import type { Project as DomainProject, CreateProjectInput, UpdateProjectInput } from '../../../domain/models';
import type { Project as RestProject } from '../../../types/task';
import { toRequiredDomainId } from './mapperUtils';

export function mapProjectDtoToDomain(dto: RestProject): DomainProject {
  return {
    id: toRequiredDomainId(dto.projectID, 'projectID'),
    title: dto.title,
    description: dto.description,
    dueDate: dto.dueDate,
    createdAt: null,
    updatedAt: null,
  };
}

export function mapCreateProjectInputToDto(input: CreateProjectInput): Omit<RestProject, 'projectID'> {
  const dto: Omit<RestProject, 'projectID'> = {
    title: input.title,
  };

  if (input.description !== undefined) dto.description = input.description;
  if (input.dueDate !== undefined) dto.dueDate = input.dueDate;

  return dto;
}

export function mapUpdateProjectInputToDto(input: UpdateProjectInput): Omit<RestProject, 'projectID'> {
  return mapCreateProjectInputToDto(input);
}
