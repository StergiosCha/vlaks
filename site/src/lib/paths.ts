import path from 'node:path';
import { fileURLToPath } from 'node:url';

// site/ lives inside the vlax-archive repo; the archive is the parent.
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SITE_ROOT = path.resolve(HERE, '..', '..');
export const REPO_ROOT = path.resolve(SITE_ROOT, '..');
export const ARCHIVE_DIR = path.join(REPO_ROOT, 'archive');
export const NORMALIZED_DIR = path.join(REPO_ROOT, 'normalized');
export const MEDIA_DIR = path.join(REPO_ROOT, 'raw', 'blogs', 'media');
export const TEXTS_DIR = path.join(REPO_ROOT, 'texts');

export const BASE = '/vlaks';
/** Prefix an absolute-from-site-root URL with the deploy base. */
export function url(p: string): string {
  if (!p.startsWith('/')) p = '/' + p;
  return BASE + p;
}
