// Generates the mock Civic Holdings Register collection (1,412 works).
// Deterministic: the same seed always produces the same src/data/works.json.
// Run with: npm run generate-data
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, '../src/data/works.json');

// ---------- seeded randomness ----------
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261113);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (a, b) => a + rand() * (b - a);
const int = (a, b) => Math.floor(between(a, b + 1));
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const round1 = (n) => Math.round(n * 10) / 10;
const weighted = (entries) => {
  const total = entries.reduce((s, e) => s + e[1], 0);
  let r = rand() * total;
  for (const [value, w] of entries) {
    r -= w;
    if (r < 0) return value;
  }
  return entries[entries.length - 1][0];
};
const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
function isoBetween(startISO, endISO) {
  const a = Date.parse(startISO + 'T00:00:00Z');
  const b = Date.parse(endISO + 'T00:00:00Z');
  const d = new Date(a + rand() * (b - a));
  return d.toISOString().slice(0, 10);
}
const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);

// ---------- vocabulary ----------
const MEDIUM_COUNTS = [
  ['Painting', 498],
  ['Work on paper', 311],
  ['Photograph', 207],
  ['Sculpture', 164],
  ['Textile', 96],
  ['Ceramic', 81],
  ['Mixed media', 55],
];

const MATERIALS = {
  Painting: [
    ['Oil on canvas', 52, 2],
    ['Acrylic on canvas', 22, 3],
    ['Oil on board', 10, 2],
    ['Tempera on panel', 6, 2],
    ['Acrylic on board', 6, 3],
    ['Oil on linen', 4, 2],
  ],
  'Work on paper': [
    ['Watercolor on paper', 30, 1],
    ['Gouache on paper', 22, 1],
    ['Ink on paper', 14, 1],
    ['Graphite on paper', 12, 1],
    ['Screenprint on paper', 12, 1],
    ['Etching on paper', 10, 1],
  ],
  Photograph: [
    ['Gelatin silver print', 45, 1],
    ['Chromogenic print', 30, 1],
    ['Platinum print', 10, 1],
    ['Inkjet print on fine art paper', 15, 1],
  ],
  Sculpture: [
    ['Bronze', 26, 3],
    ['Welded steel', 22, 3],
    ['Carved limestone', 14, 3],
    ['Carved oak', 10, 3],
    ['Cast resin with pigment', 8, 3],
    ['Patinated copper', 8, 3],
    ['Cast glass and steel', 4, 3],
    ['Cast iron', 8, 3],
  ],
  Textile: [
    ['Wool tapestry', 40, 1],
    ['Woven cotton and linen', 25, 1],
    ['Silk and wool embroidery', 15, 1],
    ['Dyed cotton appliqué', 20, 1],
  ],
  Ceramic: [
    ['Glazed stoneware', 40, 3],
    ['Porcelain with celadon glaze', 20, 3],
    ['Earthenware with slip decoration', 20, 3],
    ['Raku-fired stoneware', 10, 3],
    ['Salt-glazed stoneware', 10, 3],
  ],
  'Mixed media': [
    ['Acrylic, collage and wood', 25, 2],
    ['Found objects and enamel on panel', 20, 2],
    ['Steel, paint and rope', 15, 3],
    ['Glass and copper wire', 10, 3],
    ['Paper, wax and pigment on panel', 15, 2],
    ['Ceramic tiles and oil on board', 15, 2],
  ],
};

const EASTVALE_ARTISTS = [
  'Delphine Moreau',
  'Kofi Asante',
  'Ruth Lindqvist',
  'Samuel Adeyemi',
  'Priya Raman',
  'Hana Watanabe',
  'Connor Dougherty',
  'Lucia Ferraro',
  'Ibrahim Haddad',
  'Elena Marchetti',
  'Owen Pryce',
  'Nadia Solberg',
  'Teodor Kowal',
];

const OTHER_NEIGHBORHOODS = [
  'Harrow Point',
  'Millbrook',
  'Northgate',
  'Quarry Hill',
  'Old Harbor',
  'Ferris Park',
  'Westfield',
  'Saltmarsh',
  'Greenhollow',
  'Lower Cannery',
  'Brightwater',
  'Cedar Flats',
];

const FIRST = [
  'Adaeze', 'Miriam', 'Tomas', 'Lena', 'Rafael', 'Yusuf', 'Clara', 'Dev', 'Ingrid', 'Marcus', 'Nkem', 'Sofia',
  'Hiroshi', 'Beatriz', 'Callum', 'Esther', 'Farid', 'Greta', 'Hugo', 'Imani', 'Jun', 'Katarina', 'Lorenzo',
  'Maren', 'Nikhil', 'Odile', 'Pavel', 'Rosa', 'Silas', 'Tamsin', 'Ugo', 'Vera', 'Wendell', 'Xiomara', 'Yara',
  'Anders', 'Bianca', 'Cyrus', 'Dara', 'Emeka', 'Felix', 'Gwen', 'Hollis', 'Iris', 'Jonah', 'Keiko', 'Leopold',
  'Mei', 'Nadir', 'Oriana', 'Peter', 'Renata', 'Stellan', 'Talia', 'Umberto', 'Vivian', 'Walter', 'Ayo', 'Bram',
  'Celeste', 'Dominic', 'Ezra', 'Fenna', 'Gideon', 'Henrik', 'Ines', 'Joaquin', 'Kaveh', 'Lucinda', 'Mateo',
  'Noor', 'Otto', 'Paloma', 'Rhys', 'Soren', 'Thea', 'Valentin', 'Wren', 'Yosef', 'Zara', 'Augustin', 'Bea',
];
const LAST = [
  'Halvorsen', 'Brandt', 'Okafor', 'Lindqvist', 'Mendoza', 'Kovacs', 'Abara', 'Fairweather', 'Oyelaran',
  'Castellano', 'Nakamura', 'Dubois', 'Petrov', 'Whitcombe', 'Salazar', 'Greenleaf', 'Iyer', 'Varga',
  'Rosenthal', 'Kim', 'Lowry', 'Osei', 'Pemberton', 'Quintero', 'Reinholt', 'Sato', 'Takahashi', 'Underhill',
  'Vance', 'Wojcik', 'Yildiz', 'Zielinski', 'Amato', 'Brooke', 'Calder', 'Donnelly', 'Ekwueme', 'Falk', 'Gallo',
  'Hartigan', 'Ibsen', 'Jurgens', 'Kessler', 'Lambert', 'Moss', 'Nielsen', 'Ortega', 'Park', 'Quarles', 'Rahimi',
  'Stroud', 'Thorne', 'Ueda', 'Vidal', 'Waite', 'Yamamoto', 'Zhou', 'Adair', 'Bellweather', 'Cahill', 'Dunmore',
];

const LOCATIONS = [
  ['City Hall, 2nd floor corridor', 14],
  ["City Hall, Mayor's Office", 6],
  ['Fire Station 4, day room', 8],
  ['Fire Station 2, training room', 5],
  ['Ridgeline Storage, vault 1', 22],
  ['Ridgeline Storage, vault 2', 18],
  ['Central Library, lower level', 7],
  ['Harbor Community Center, hall', 6],
  ['Water Works Office, lobby', 4],
  ['Parks Depot, store room', 5],
];

const LOAN_VENUES = [
  'Coastline Art Museum',
  'Northgate Cultural Center',
  'Regional Museum of Design',
  'University Gallery, Eastbrook',
  'Ferris Park Gallery',
  'Lakeshore Arts Council',
];

const RIGHTS = [
  ['City-owned; reproduction permitted with credit', 60],
  ['Artist estate; permission required for reproduction', 25],
  ['Rights unclear; check before publishing images', 15],
];

const NOUNS = [
  'Harbor', 'Quarry', 'Orchard', 'Rail Yard', 'Ferry Slip', 'Greenhouse', 'Footbridge', 'Salt Marsh', 'Stairwell',
  'Cannery', 'Lighthouse', 'Windmill', 'Foundry', 'Dune Grass', 'Meadow', 'Hillside', 'Market Stall', 'Rooftops',
  'Tram Line', 'Ice House', 'Granary', 'Boatyard', 'Parish Hall', 'Grain Silo', 'Cloth Mill', 'Tidal Flat',
  'Pier Shed', 'Water Tower', 'Bell Tower', 'Orchard Gate',
];
const TIMES = ['Dusk', 'Dawn', 'Noon', 'Low Tide', 'Midnight', 'First Frost', 'Early Spring', 'Late Rain', 'High Water'];
const ADJ = ['Grey', 'Ochre', 'Cobalt', 'Silver', 'Quiet', 'Long', 'Upper', 'Lower', 'Blue', 'Rust', 'Pale', 'Amber', 'Slate'];
const MONTHS = ['March', 'June', 'October', 'January', 'August'];
const FORMS = ['Standing Form', 'Seated Figure', 'Column', 'Arc', 'Pair', 'Torso', 'Lantern', 'Threshold', 'Bridge Piece', 'Open Hand'];

function makeTitle(medium) {
  if (rand() < 0.07) return `Untitled (${pick(ADJ)} ${pick(NOUNS)})`;
  if (medium === 'Sculpture') {
    return rand() < 0.5 ? `${pick(FORMS)} No. ${int(1, 9)}` : `${pick(FORMS)}, ${pick(NOUNS)}`;
  }
  if (medium === 'Ceramic') {
    return rand() < 0.5
      ? `${pick(['Vessel', 'Bowl', 'Jar', 'Tile Panel', 'Plate', 'Ewer'])} No. ${int(1, 12)}`
      : `${pick(ADJ)} Glaze ${pick(['Bowl', 'Jar', 'Vase', 'Plate'])}`;
  }
  if (medium === 'Textile') {
    return rand() < 0.5 ? `Hanging ${pick(NOUNS)}` : `Weaving No. ${int(1, 20)}`;
  }
  if (medium === 'Photograph') {
    return `${pick(NOUNS)} No. ${int(1, 40)}`;
  }
  const t = rand();
  if (t < 0.25) return pick(NOUNS);
  if (t < 0.45) return `${pick(NOUNS)} at ${pick(TIMES)}`;
  if (t < 0.6) return `${pick(ADJ)} ${pick(NOUNS)}`;
  if (t < 0.75) return `${pick(NOUNS)} No. ${int(2, 9)}`;
  if (t < 0.85) return `Study for ${pick(NOUNS)}`;
  return `${pick(NOUNS)} in ${pick(MONTHS)}`;
}

// ---------- artists ----------
const usedNames = new Set(EASTVALE_ARTISTS);
const otherArtists = [];
while (otherArtists.length < 130) {
  const name = `${pick(FIRST)} ${pick(LAST)}`;
  if (usedNames.has(name)) continue;
  usedNames.add(name);
  otherArtists.push({ name, neighborhood: pick(OTHER_NEIGHBORHOODS) });
}

// ---------- dimensions, weight, mounting ----------
function describeFor(medium, material) {
  const fragile = /glass|ceramic|porcelain|stoneware|earthenware|raku/i.test(material);
  let h, w, d = null, mounting = 'Wall-hung', weight;
  switch (medium) {
    case 'Painting': {
      h = int(30, 190);
      w = clamp(Math.round(h * between(0.6, 1.7)), 25, 240);
      weight = Math.max(0.8, ((h * w) / 10000) * between(4, 10));
      break;
    }
    case 'Work on paper': {
      h = int(20, 110);
      w = clamp(Math.round(h * between(0.6, 1.5)), 15, 100);
      weight = Math.max(0.1, ((h * w) / 10000) * between(0.2, 0.8));
      break;
    }
    case 'Photograph': {
      h = int(18, 120);
      w = clamp(Math.round(h * between(0.7, 1.5)), 15, 150);
      weight = Math.max(0.1, ((h * w) / 10000) * between(0.2, 0.9));
      break;
    }
    case 'Textile': {
      h = int(60, 300);
      w = clamp(Math.round(h * between(0.5, 1.4)), 40, 260);
      weight = Math.max(0.5, ((h * w) / 10000) * between(0.8, 2.5));
      break;
    }
    case 'Sculpture': {
      if (rand() < 0.12) {
        // wall relief
        h = int(40, 150);
        w = clamp(Math.round(h * between(0.6, 1.4)), 30, 160);
        d = int(4, 20);
        mounting = 'Wall-hung';
      } else {
        h = int(35, 260);
        w = clamp(Math.round(h * between(0.2, 0.9)), 20, 180);
        d = clamp(Math.round(w * between(0.4, 1.1)), 15, 140);
        mounting = 'Free-standing';
      }
      weight = Math.max(3, ((h * w * d) / 1e6) * 2600 * between(0.03, 0.15));
      break;
    }
    case 'Ceramic': {
      if (rand() < 0.7) {
        h = int(10, 65);
        w = clamp(Math.round(h * between(0.5, 1)), 8, 50);
        d = w;
        mounting = 'Free-standing';
        weight = Math.max(0.3, ((h * w * d) / 1e6) * 1800 * between(0.3, 0.6));
      } else {
        h = int(20, 60);
        w = int(20, 60);
        d = int(3, 8);
        mounting = 'Wall-hung';
        weight = Math.max(0.3, ((h * w) / 10000) * between(1.5, 3.5));
      }
      break;
    }
    case 'Mixed media': {
      h = int(40, 220);
      w = clamp(Math.round(h * between(0.6, 1.5)), 30, 220);
      if (rand() < 0.6) {
        d = int(3, 12);
        mounting = 'Wall-hung';
      } else {
        d = int(30, 90);
        mounting = 'Free-standing';
      }
      weight = Math.max(1, ((h * w) / 10000) * between(1.5, 5));
      break;
    }
  }
  return { h, w, d, weight: round1(weight), mounting, fragile };
}

// ---------- build records ----------
const records = [];
const usedAccessions = new Set();
const accessionKey = (year, seq) => `${year}.${seq}`;

function nextAccession(year) {
  for (;;) {
    const seq = int(1, 190);
    const key = accessionKey(year, seq);
    if (!usedAccessions.has(key)) {
      usedAccessions.add(key);
      return `HB.${year}.${String(seq).padStart(3, '0')}`;
    }
  }
}

function acquisitionYear() {
  // Weighted toward recent decades so the collection grows over time.
  const years = [];
  for (let y = 1958; y <= 2026; y++) years.push([y, 1 + (y - 1958) / 9]);
  return weighted(years);
}

function baseRecord({ medium, material, lightClass, acquired, accession, title, artist, neighborhood, eastvaleArtist, year }) {
  const dims = describeFor(medium, material);
  const created = year ?? int(Math.max(1880, acquired - 45), acquired);
  return {
    accession,
    title,
    artist,
    artistNeighborhood: neighborhood,
    eastvaleArtist,
    year: created,
    acquired,
    medium,
    materials: material,
    dimsCm: { h: dims.h, w: dims.w, d: dims.d },
    weightKg: dims.weight,
    lightClass,
    mounting: dims.mounting,
    fragile: dims.fragile,
    condition: null,
    conditionDate: null,
    location: null,
    loan: { status: 'Available', commitment: null },
    imageRights: null,
  };
}

function assignCondition(rec) {
  const cond = weighted([
    ['Excellent', 20],
    ['Good', 46],
    ['Fair', 26],
    ['Needs Treatment', 8],
  ]);
  rec.condition = cond;
  if (cond === 'Needs Treatment') {
    rec.conditionDate = isoBetween('2024-02-01', '2026-10-30');
  } else if (rand() < 0.12) {
    rec.conditionDate = isoBetween('2016-01-01', '2022-12-31');
  } else {
    rec.conditionDate = isoBetween('2023-01-01', '2026-10-30');
  }
}

// Curated works named in the brief, plus one scenario-relevant conflict.
const curated = [
  {
    medium: 'Painting',
    material: 'Oil on canvas',
    lightClass: 2,
    accession: 'HB.1994.017',
    acquired: 1994,
    year: 1994,
    title: 'Tidewater at Dusk',
    artist: 'Delphine Moreau',
    neighborhood: 'Eastvale',
    eastvaleArtist: true,
    dimsCm: { h: 122, w: 183, d: null },
    weightKg: 14.5,
    mounting: 'Wall-hung',
    fragile: false,
    condition: 'Good',
    conditionDate: '2025-09-12',
    location: "City Hall, Mayor's Office",
    loan: { status: 'Available', commitment: null },
    imageRights: 'City-owned; reproduction permitted with credit',
  },
  {
    medium: 'Painting',
    material: 'Acrylic on canvas',
    lightClass: 3,
    accession: 'HB.2011.088',
    acquired: 2011,
    year: 2011,
    title: 'Market Day',
    artist: 'Kofi Asante',
    neighborhood: 'Eastvale',
    eastvaleArtist: true,
    dimsCm: { h: 90, w: 120, d: null },
    weightKg: 7.2,
    mounting: 'Wall-hung',
    fragile: false,
    condition: 'Excellent',
    conditionDate: '2026-04-08',
    location: 'Fire Station 4, day room',
    loan: { status: 'Available', commitment: null },
    imageRights: 'Artist estate; permission required for reproduction',
  },
  {
    medium: 'Painting',
    material: 'Oil on board',
    lightClass: 2,
    accession: 'HB.2019.042',
    acquired: 2019,
    year: 2015,
    title: 'Harbor Light No. 3',
    artist: 'Ruth Lindqvist',
    neighborhood: 'Eastvale',
    eastvaleArtist: true,
    dimsCm: { h: 100, w: 140, d: null },
    weightKg: 9.8,
    mounting: 'Wall-hung',
    fragile: false,
    condition: 'Excellent',
    conditionDate: '2026-02-17',
    location: 'City Hall, 2nd floor corridor',
    loan: {
      status: 'Promised',
      commitment: {
        venue: 'Ferris Park Gallery',
        from: '2026-10-15',
        until: '2027-02-28',
        note: 'Loan agreement signed 30 Sep 2026; crate pick-up 8 Dec 2026',
      },
    },
    imageRights: 'Artist estate; permission required for reproduction',
  },
];

// Build the medium slots, removing the curated paintings from the random pool.
const slots = [];
for (const [medium, count] of MEDIUM_COUNTS) for (let i = 0; i < count; i++) slots.push(medium);
for (const c of curated) slots.splice(slots.indexOf(c.medium), 1);
shuffle(slots);

for (const c of curated) {
  const rec = {
    accession: c.accession,
    title: c.title,
    artist: c.artist,
    artistNeighborhood: c.neighborhood,
    eastvaleArtist: c.eastvaleArtist,
    year: c.year,
    acquired: c.acquired,
    medium: c.medium,
    materials: c.material,
    dimsCm: c.dimsCm,
    weightKg: c.weightKg,
    lightClass: c.lightClass,
    mounting: c.mounting,
    fragile: c.fragile,
    condition: c.condition,
    conditionDate: c.conditionDate,
    location: c.location,
    loan: c.loan,
    imageRights: c.imageRights,
  };
  usedAccessions.add(accessionKey(c.acquired, Number(c.accession.split('.')[2])));
  records.push(rec);
}

const randomMediums = slots; // 1,409 entries
const eastvaleCandidatesIdx = [];
for (let i = 0; i < randomMediums.length; i++) eastvaleCandidatesIdx.push(i);
shuffle(eastvaleCandidatesIdx);
const eastvaleIdx = new Set(eastvaleCandidatesIdx.slice(0, 60)); // 60 + 3 curated = 63
const loanPool = shuffle(eastvaleCandidatesIdx.slice());

const holdIdx = new Set(loanPool.slice(0, 14));
const promisedIdx = new Set(loanPool.slice(14, 30)); // 16 + Harbor Light = 17
const onLoanIdx = new Set(loanPool.slice(30, 68)); // 38

const eastvaleWeights = EASTVALE_ARTISTS.map((n) => [n, between(1, 6)]);

randomMediums.forEach((medium, i) => {
  const acquired = acquisitionYear();
  const created = int(Math.max(1880, acquired - 45), acquired);
  // Keep materials plausible for the period the work was made in.
  const eraOk = ([m]) => {
    if (m === 'Inkjet print on fine art paper') return created >= 2000;
    if (m.startsWith('Acrylic')) return created >= 1958;
    if (m === 'Chromogenic print') return created >= 1950;
    return true;
  };
  const [material, lightClass] = weighted(
    MATERIALS[medium].filter(eraOk).map(([m, w, l]) => [[m, l], w]),
  );
  const accession = nextAccession(acquired);
  const eastvale = eastvaleIdx.has(i);
  let artist, neighborhood;
  if (eastvale) {
    artist = weighted(eastvaleWeights);
    neighborhood = 'Eastvale';
  } else {
    const a = pick(otherArtists);
    artist = a.name;
    neighborhood = a.neighborhood;
  }
  const rec = baseRecord({
    medium,
    material,
    lightClass,
    acquired,
    accession,
    title: makeTitle(medium),
    artist,
    neighborhood,
    eastvaleArtist: eastvale,
    year: created,
  });
  assignCondition(rec);
  rec.location = weighted(LOCATIONS);
  rec.imageRights = weighted(RIGHTS);
  rec.loan = { status: 'Available', commitment: null };

  if (holdIdx.has(i)) {
    rec.location = 'Ridgeline Storage, vault 2';
    rec.loan = {
      status: 'On hold',
      commitment: {
        venue: 'Civic Center renovation',
        from: '2026-08-03',
        until: '2027-06-30',
        note: 'Held out of circulation for the Civic Center renovation; return after June 2027',
      },
    };
  } else if (promisedIdx.has(i)) {
    const from = isoBetween('2026-11-20', '2027-03-15');
    const until = addDays(from, int(60, 150));
    const venue = pick(LOAN_VENUES);
    rec.location = `Promised to ${venue}`;
    rec.loan = {
      status: 'Promised',
      commitment: { venue, from, until, note: 'Loan agreement in place; awaiting pick-up' },
    };
  } else if (onLoanIdx.has(i)) {
    const returnsEarly = rand() < 0.4;
    const until = returnsEarly ? isoBetween('2026-11-20', '2026-12-10') : isoBetween('2026-12-22', '2027-09-30');
    const from = isoBetween('2025-03-01', '2026-09-30');
    const venue = pick(LOAN_VENUES);
    rec.location = venue;
    rec.loan = {
      status: 'On loan',
      commitment: { venue, from, until, note: 'Out on loan; return crated and condition-checked' },
    };
  }
  records.push(rec);
});

records.sort((a, b) => a.accession.localeCompare(b.accession));

// Sanity checks so a silent drift in the generator is caught immediately.
const count = (fn) => records.filter(fn).length;
const summary = {
  total: records.length,
  byMedium: Object.fromEntries(MEDIUM_COUNTS.map(([m]) => [m, count((r) => r.medium === m)])),
  eastvaleArtist: count((r) => r.eastvaleArtist),
  onHold: count((r) => r.loan.status === 'On hold'),
  onLoan: count((r) => r.loan.status === 'On loan'),
  promised: count((r) => r.loan.status === 'Promised'),
};
console.log(JSON.stringify(summary, null, 2));
if (records.length !== 1412 || summary.eastvaleArtist !== 63 || summary.onHold !== 14) {
  throw new Error('Generated counts do not match the brief');
}
if (new Set(records.map((r) => r.accession)).size !== records.length) {
  throw new Error('Duplicate accession numbers');
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(records) + '\n');
console.log(`Wrote ${records.length} works to ${outPath}`);
