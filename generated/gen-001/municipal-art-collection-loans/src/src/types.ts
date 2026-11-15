export type Medium =
  | 'Painting'
  | 'Work on paper'
  | 'Photograph'
  | 'Sculpture'
  | 'Textile'
  | 'Ceramic'
  | 'Mixed media';

export type Condition = 'Excellent' | 'Good' | 'Fair' | 'Needs Treatment';
export type Mounting = 'Wall-hung' | 'Free-standing';
export type LoanStatus = 'Available' | 'On loan' | 'Promised' | 'On hold';

export interface Commitment {
  venue: string;
  from: string;
  until: string;
  note: string;
}

export interface Loan {
  status: LoanStatus;
  commitment: Commitment | null;
}

export interface Work {
  accession: string;
  title: string;
  artist: string;
  artistNeighborhood: string;
  eastvaleArtist: boolean;
  year: number;
  acquired: number;
  medium: Medium;
  materials: string;
  dimsCm: { h: number; w: number; d: number | null };
  weightKg: number;
  lightClass: 1 | 2 | 3;
  mounting: Mounting;
  fragile: boolean;
  condition: Condition;
  conditionDate: string;
  location: string;
  loan: Loan;
  imageRights: string;
}

export type SpaceId = 'reading' | 'children' | 'atrium';

export interface ProposalItem {
  accession: string;
  space: SpaceId;
  wallId: string;
}

export interface LibraryState {
  shortlist: string[];
  proposal: ProposalItem[];
}

export type View = 'library' | 'collection';
