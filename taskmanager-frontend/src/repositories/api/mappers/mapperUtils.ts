export const MISSING_REST_TIMESTAMP = '';

export function toDomainId(id: number | string | null | undefined): string {
  if (id === null || id === undefined) return '';
  return String(id);
}

export function toApiId(id: string): number {
  const parsed = Number(id);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Expected numeric REST id, received "${id}".`);
  }
  return parsed;
}

export function optionalToApiId(id: string | null | undefined): number | null {
  if (id === null || id === undefined || id === '') return null;
  return toApiId(id);
}

export function createdAtOrMissing(createdAt?: string | null): string {
  return createdAt ?? MISSING_REST_TIMESTAMP;
}

export function updatedAtFromRest(createdAt?: string | null): string {
  return createdAt ?? MISSING_REST_TIMESTAMP;
}
