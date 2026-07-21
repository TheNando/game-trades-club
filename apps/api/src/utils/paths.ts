import { isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../../../../', import.meta.url));

/** Resolves a path relative to the project root unless it is already absolute. */
export function resolveProjectPath(path: string): string {
  return isAbsolute(path) ? path : join(projectRoot, path);
}

/** Returns the configured absolute path for application data. */
export function getDataPath(): string {
  return resolveProjectPath(process.env.DATA_PATH ?? './data');
}
