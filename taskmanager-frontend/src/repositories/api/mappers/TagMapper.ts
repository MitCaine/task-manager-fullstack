import type { Tag as DomainTag, CreateTagInput, UpdateTagInput } from '../../../domain/models';
import type { Tag as RestTag } from '../../../types/task';
import { createdAtOrMissing, MISSING_REST_TIMESTAMP, toDomainId } from './mapperUtils';

export function mapTagDtoToDomain(dto: RestTag): DomainTag {
  return {
    id: toDomainId(dto.tagID),
    title: dto.title,
    color: dto.color ?? null,
    createdAt: MISSING_REST_TIMESTAMP,
    updatedAt: MISSING_REST_TIMESTAMP,
  };
}

export function mapCreateTagInputToDto(input: CreateTagInput): Omit<RestTag, 'tagID'> {
  return {
    title: input.title,
    color: input.color ?? null,
  };
}

export function mapUpdateTagInputToDto(input: UpdateTagInput): Pick<RestTag, 'title' | 'color'> {
  return {
    title: input.title,
    color: input.color ?? null,
  };
}
