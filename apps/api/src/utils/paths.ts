import { isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../../../../', import.meta.url));

export function resolveProjectPath(path: string): string {
  return isAbsolute(path) ? path : join(projectRoot, path);
}

export function getDataPath(): string {
  return resolveProjectPath(process.env.DATA_PATH ?? './data');
}
