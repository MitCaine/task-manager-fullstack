export function normalizeTaskStatus(statusID: number | null | undefined): number | null {
  return statusID === 1 ? null : statusID ?? null;
}

export function compactText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}
