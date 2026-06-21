export function toggleNumberInList(list: number[], value: number): number[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function toggleStringInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function shuffle<T>(array: T[]): T[] {
  const cloned = [...array];
  for (let i = cloned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}
