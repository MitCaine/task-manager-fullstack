import type { StatusId } from '../../domain/models';

export function generateEntityId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function serializeDate(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function readString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  return String(value);
}

export function readRequiredString(row: Record<string, unknown>, key: string): string {
  const value = readString(row, key);
  if (value === null) throw new Error(`Missing required SQLite text column "${key}".`);
  return value;
}

export function readNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Expected numeric SQLite column "${key}".`);
  return parsed;
}

export function readStatusId(row: Record<string, unknown>, key = 'status_id'): StatusId {
  const value = readRequiredString(row, key);
  if (value === 'not_started' || value === 'in_progress' || value === 'completed') return value;
  throw new Error(`Unexpected SQLite status id "${value}".`);
}
