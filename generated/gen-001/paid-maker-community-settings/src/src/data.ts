export type Tier = 'Supporter' | 'Maker' | 'Studio';

export interface Person {
  id: string;
  name: string;
  first: string;
  kind: 'member' | 'guest';
  tier?: Tier;
  place: string;
  hue: number;
}

export interface Space {
  id: string;
  name: string;
  tiers: Tier[];
  /** Spaces an invite grants to guests when invite reach is "community basics" */
  guestBasics?: boolean;
}

export const COMMUNITY = {
  name: 'Oduya Knits Circle',
  owner: 'Maren Oduya',
  ownerFirst: 'Maren',
  memberCount: 342,
  tiers: [
    { name: 'Supporter' as Tier, price: 4, count: 211 },
    { name: 'Maker' as Tier, price: 9, count: 113 },
    { name: 'Studio' as Tier, price: 20, count: 18 },
  ],
  subdomain: 'oduyaknits.hearthroom.app',
};

export const BRAND = {
  displayName: 'Oduya Knits',
  logoFile: 'oduya-mark.png',
};

export const SPACE = {
  name: "Winter '26 Test Knit",
  slug: 'winter-26-test-knit',
  window: 'Nov 16 – Dec 14',
  windowLong: 'November 16 to December 14',
};

export const LAST_CHANGED = 'Sep 3, 2026';
export const TODAY = 'Nov 13, 2026';

export const SPACES: Space[] = [
  { id: 'announcements', name: 'Announcements', tiers: ['Supporter', 'Maker', 'Studio'], guestBasics: true },
  { id: 'general', name: 'General Chat', tiers: ['Supporter', 'Maker', 'Studio'], guestBasics: true },
  { id: 'wip', name: 'WIP Photos', tiers: ['Supporter', 'Maker', 'Studio'] },
  { id: 'help', name: 'Pattern Help', tiers: ['Maker', 'Studio'] },
  { id: 'swap', name: 'Swap & Sell', tiers: ['Maker', 'Studio'] },
  { id: 'studio', name: 'Studio Lounge', tiers: ['Studio'] },
];

const p = (
  id: string,
  name: string,
  kind: 'member' | 'guest',
  tier: Tier | undefined,
  place: string,
  hue: number,
): Person => ({ id, name, first: name.split(' ')[0], kind, tier, place, hue });

export const INVITEES: Person[] = [
  p('saoirse', 'Saoirse Byrne', 'member', 'Maker', 'Galway', 150),
  p('tomasz', 'Tomasz Wilk', 'guest', undefined, 'Kraków', 210),
  p('imani', 'Imani Reyes', 'member', 'Studio', 'Oakland', 20),
  p('hana', 'Hana Kobayashi', 'member', 'Studio', 'Sapporo', 330),
  p('lucia', 'Lucía Ferrer', 'member', 'Maker', 'Valencia', 40),
  p('aoife', 'Aoife Duggan', 'member', 'Supporter', 'Cork', 100),
  p('bettina', 'Bettina Krause', 'guest', undefined, 'Leipzig', 260),
  p('ngozi', 'Ngozi Adeyemi', 'member', 'Studio', 'Leeds', 0),
  p('ruth', 'Ruth Lindqvist', 'member', 'Maker', 'Uppsala', 190),
  p('priyanka', 'Priyanka Rao', 'member', 'Studio', 'Pune', 290),
  p('elodie', 'Elodie Marchand', 'guest', undefined, 'Lyon', 60),
  p('kateryna', 'Kateryna Bondar', 'member', 'Maker', 'Lviv', 230),
  p('wren', 'Wren Castellano', 'member', 'Studio', 'Portland, Maine', 120),
  p('ffion', 'Ffion Pryce', 'member', 'Supporter', 'Aberystwyth', 350),
  p('meiling', 'Mei-Ling Tsao', 'member', 'Studio', 'Taipei', 170),
  p('josefa', 'Josefa Arancibia', 'guest', undefined, 'Valparaíso', 10),
  p('dorothy', 'Dorothy Okafor', 'member', 'Maker', 'Toronto', 275),
  p('signe', 'Signe Halvorsen', 'guest', undefined, 'Bergen', 200),
];

export const REGULARS: Person[] = [
  p('liesel', 'Liesel Brandt', 'member', 'Supporter', 'Hamburg', 45),
  p('camille', 'Camille Laurent', 'member', 'Maker', 'Montréal', 310),
  p('owen', 'Owen Marsh', 'member', 'Studio', 'Bristol', 85),
];

export const GUEST_COUNT = INVITEES.filter((i) => i.kind === 'guest').length;
export const MEMBER_INVITEE_COUNT = INVITEES.length - GUEST_COUNT;

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Mock content inside the test-knit space, used by the preview. */
export const THREADS = [
  {
    id: 't1',
    author: 'Maren Oduya',
    authorHue: 280,
    when: 'Pinned',
    title: 'Fenwick Pullover: sample photos and sizing notes',
    body: 'Here are the finished samples in sizes 2 and 5. Yoke depth is the measurement I most want your notes on. Please knit from the Nov 16 file, not the preview sheet.',
    photos: [
      { yarn: '#6b4e3d', ground: '#e9dfcf', label: 'Fenwick, front' },
      { yarn: '#3c5a73', ground: '#dfe4e6', label: 'Fenwick, yoke detail' },
    ],
    replies: 4,
  },
  {
    id: 't2',
    author: 'Imani Reyes',
    authorHue: 20,
    when: '2h',
    title: 'Hollin Cowl gauge: 19 sts / 4 in after blocking',
    body: 'Brooklyn Tweed Shelter in Hayloft on 4.5 mm. Slightly looser than the pattern says before blocking.',
    photos: [{ yarn: '#b98a3e', ground: '#efe6d4', label: 'Hollin swatch' }],
    replies: 7,
  },
];

export const DAY_ACTIVITY = [
  { who: 'Imani Reyes', what: 'posted Hollin Cowl gauge: 19 sts / 4 in', time: '7:42 AM' },
  { who: 'Hana Kobayashi', what: 'replied to Fenwick Pullover sizing notes', time: '8:05 AM' },
  { who: 'Ruth Lindqvist', what: 'replied to Fenwick Pullover sizing notes', time: '9:18 AM' },
  { who: 'Maren Oduya', what: 'posted Larchmere Cardigan: chart errata, row 34', time: '10:31 AM' },
  { who: 'Lucía Ferrer', what: 'replied to Larchmere Cardigan: chart errata', time: '11:02 AM' },
  { who: 'Wren Castellano', what: 'posted Birchfell Mittens: thumb gusset question', time: '12:47 PM' },
];
