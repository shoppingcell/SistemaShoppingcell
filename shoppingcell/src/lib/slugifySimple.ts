import { slugify } from './slugify';

export function slugifySimple(input: string): string {
  return slugify(input);
}
