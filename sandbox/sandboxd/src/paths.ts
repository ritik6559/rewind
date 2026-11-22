import { isAbsolute, relative, resolve, sep } from "node:path";

export function resolveInWorkspace(root: string, requested: string): string {
  const absolute = resolve(root, requested);
  const fromRoot = relative(root, absolute);
  if (
    fromRoot === ".." ||
    fromRoot.startsWith(`..${sep}`) ||
    isAbsolute(fromRoot)
  ) {
    throw new Error(`Path "${requested}" is outside the workspace.`);
  }
  return absolute;
}
