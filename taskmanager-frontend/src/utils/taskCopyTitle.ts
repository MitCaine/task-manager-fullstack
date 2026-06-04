export type ParsedCopyTitle = {
  baseTitle: string;
  copyNumber: number;
};

export function parseCopyTitle(title: string): ParsedCopyTitle | null {
  const match = title.match(/^(.*)\s\(copy(?:\s+(\d+))?\)$/);
  if (!match) return null;
  const copyNumber = match[2] ? Number(match[2]) : 1;
  if (!Number.isInteger(copyNumber) || copyNumber < 1) return null;
  return { baseTitle: match[1], copyNumber };
}

export function nextCopyTitle(title: string, existingTitles: string[]): string {
  const parsedTitle = parseCopyTitle(title);
  const baseTitle = parsedTitle?.baseTitle ?? title;
  const usedCopyNumbers = new Set<number>();

  for (const existingTitle of existingTitles) {
    const parsedExisting = parseCopyTitle(existingTitle);
    if (parsedExisting?.baseTitle === baseTitle) {
      usedCopyNumbers.add(parsedExisting.copyNumber);
    }
  }

  let copyNumber = 1;
  while (usedCopyNumbers.has(copyNumber)) copyNumber += 1;
  return `${baseTitle} (copy${copyNumber === 1 ? '' : ` ${copyNumber}`})`;
}
