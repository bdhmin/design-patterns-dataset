import worksJson from './works.json';
import type { Work } from '../types';

export const WORKS: Work[] = worksJson as unknown as Work[];

export const WORKS_BY_ACCESSION = new Map<string, Work>(WORKS.map((w) => [w.accession, w]));

export const MEDIUMS = [
  'Painting',
  'Work on paper',
  'Photograph',
  'Sculpture',
  'Textile',
  'Ceramic',
  'Mixed media',
] as const;

export const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Needs Treatment'] as const;

export const LOCATIONS = Array.from(new Set(WORKS.map((w) => w.location))).sort();

export const EASTVALE_ARTIST_COUNT = WORKS.filter((w) => w.eastvaleArtist).length;
