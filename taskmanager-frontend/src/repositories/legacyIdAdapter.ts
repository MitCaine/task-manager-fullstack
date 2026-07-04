import type { EntityId } from '../domain/models';

const domainToLegacyId = new Map<EntityId, number>();
const legacyToDomainId = new Map<number, EntityId>();
let nextSyntheticLegacyId = -1;

export function toLegacyNumericId(id: EntityId, fieldName = 'id'): number {
  if (/^\d+$/.test(id)) {
    const legacyId = Number(id);
    domainToLegacyId.set(id, legacyId);
    legacyToDomainId.set(legacyId, id);
    return legacyId;
  }

  const existing = domainToLegacyId.get(id);
  if (existing !== undefined) return existing;

  const legacyId = nextSyntheticLegacyId;
  nextSyntheticLegacyId -= 1;
  domainToLegacyId.set(id, legacyId);
  legacyToDomainId.set(legacyId, id);
  return legacyId;
}

export function toDomainEntityId(legacyId: number | string): EntityId {
  const numericLegacyId = typeof legacyId === 'number'
    ? legacyId
    : /^-?\d+$/.test(legacyId)
      ? Number(legacyId)
      : null;

  if (numericLegacyId !== null) {
    return legacyToDomainId.get(numericLegacyId) ?? String(legacyId);
  }

  return String(legacyId);
}

export function resetLegacyIdMappingsForTests(): void {
  domainToLegacyId.clear();
  legacyToDomainId.clear();
  nextSyntheticLegacyId = -1;
}
