import type { Tag as DomainTag, CreateTagInput, UpdateTagInput } from '../../../domain/models';
import type { Tag as RestTag } from '../../../types/task';
import { toRequiredDomainId } from './mapperUtils';

export function mapTagDtoToDomain(dto: RestTag): DomainTag {
  return {
    id: toRequiredDomainId(dto.tagID, 'tagID'),
    title: dto.title,
    color: dto.color ?? null,
    createdAt: null,
    updatedAt: null,
  };
}

export function mapCreateTagInputToDto(input: CreateTagInput): Omit<RestTag, 'tagID'> {
  return {
    title: input.title,
    color: input.color ?? null,
  };
}

export function mapUpdateTagInputToDto(input: UpdateTagInput): Pick<RestTag, 'title' | 'color'> {
  const dto: Pick<RestTag, 'title' | 'color'> = {
    title: input.title,
  };

  if (input.color !== undefined) dto.color = input.color;

  return dto;
}
