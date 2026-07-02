export function toRequiredDomainId(id: number | string | null | undefined, fieldName: string): string {
  if (id === null || id === undefined) {
    throw new Error(`Missing required REST id field "${fieldName}".`);
  }
  return String(id);
}

export function toOptionalDomainId(id: number | string | null | undefined): string | null {
  if (id === null || id === undefined) return null;
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
  if (id === null || id === undefined) return null;
  return toApiId(id);
}

export function createdAtFromRest(createdAt?: string | null): string | null {
  return createdAt ?? null;
}

export function updatedAtFromRest(updatedAt?: string | null): string | null {
  return updatedAt ?? null;
}
