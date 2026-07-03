import type { StatusId } from '../../../domain/models';

export function mapStatusIdDtoToDomain(statusID: number | null | undefined): StatusId {
  if (statusID === 2) return 'completed';
  if (statusID === 3) return 'in_progress';
  return 'not_started';
}

export function mapStatusIdDomainToDto(statusId: StatusId | null | undefined): number | null {
  if (statusId === 'completed') return 2;
  if (statusId === 'in_progress') return 3;
  return null;
}
