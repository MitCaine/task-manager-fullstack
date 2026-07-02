import type { EntityId } from '../domain/models';

export function toLegacyNumericId(id: EntityId, fieldName = 'id'): number {
  if (!/^\d+$/.test(id)) {
    throw new Error(`Cannot adapt non-numeric domain ${fieldName} "${id}" to the legacy numeric UI id.`);
  }

  return Number(id);
}
