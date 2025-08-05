// Type utility functions to fix TypeScript errors

export function ensureString(value: string | undefined | null, defaultValue: string = ''): string {
  return value || defaultValue;
}

export function ensureArray<T>(value: T[] | null | undefined, defaultValue: T[] = []): T[] {
  return value || defaultValue;
}

export function ensureNumber(value: number | undefined | null, defaultValue: number = 0): number {
  return value ?? defaultValue;
}