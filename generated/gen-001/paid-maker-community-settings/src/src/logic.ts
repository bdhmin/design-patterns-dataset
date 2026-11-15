import { BRAND, COMMUNITY, GUEST_COUNT, Person, SPACE, SPACES, Space } from './data';

export type Visibility = 'open' | 'locked' | 'hidden';
export type Posting = 'all' | 'invitees' | 'owner';
export type Reach = 'basics' | 'space';
export type NotifyMode = 'instant' | 'digest' | 'weekly' | 'off';
export type Sender = 'community' | 'brand';

export interface Settings {
  visibility: Visibility;
  posting: Posting;
  reach: Reach;
  blockDownload: boolean;
  blockShare: boolean;
  watermark: boolean;
  notify: NotifyMode;
  digestTime: string;
  memberCanChange: boolean;
  sender: Sender;
  welcome: string;
  keywords: string[];
  holdRavelryLinks: boolean;
}

export const COMMUNITY_WELCOME = 'Welcome to the Circle! Say hi in General Chat.';

/** What the draft space inherited from the community defaults. */
export const INITIAL: Settings = {
  visibility: 'open',
  posting: 'all',
  reach: 'basics',
  blockDownload: false,
  blockShare: false,
  watermark: false,
  notify: 'instant',
  digestTime: '8:00 AM',
  memberCanChange: true,
  sender: 'community',
  welcome: COMMUNITY_WELCOME,
  keywords: [],
  holdRavelryLinks: false,
};

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  open: 'Visible to all members',
  locked: 'Listed, but locked',
  hidden: 'Hidden from everyone but invitees',
};
export const POSTING_LABEL: Record<Posting, string> = {
  all: 'All members',
  invitees: 'Invited test knitters only',
  owner: 'Only you',
};
export const REACH_LABEL: Record<Reach, string> = {
  basics: 'This space, plus Announcements and General Chat',
  space: "Only this space's threads",
};
export const NOTIFY_LABEL: Record<NotifyMode, string> = {
  instant: 'Instant alerts',
  digest: 'Daily digest',
  weekly: 'Weekly digest',
  off: 'No notifications',
};
export const SENDER_LABEL: Record<Sender, string> = {
  community: COMMUNITY.name,
  brand: `${BRAND.displayName} + logo`,
};

export const DIGEST_TIMES = ['7:00 AM', '8:00 AM', '12:00 PM', '6:00 PM'];

export type SectionId = 'access' | 'posting' | 'photos' | 'notify' | 'invite' | 'welcome' | 'holds';

export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'access', label: 'Who can see it' },
  { id: 'posting', label: 'Posting' },
  { id: 'photos', label: 'Photo protection' },
  { id: 'notify', label: 'Notifications' },
  { id: 'invite', label: 'Invite email' },
  { id: 'welcome', label: 'Welcome message' },
  { id: 'holds', label: 'Spoiler holds' },
];

export interface Change {
  section: SectionId;
  label: string;
  before: string;
  after: string;
}

const onOff = (b: boolean) => (b ? 'On' : 'Off');
const quoteList = (k: string[]) => (k.length ? k.map((w) => `“${w}”`).join(', ') : 'None');

export function diff(a: Settings, b: Settings): Change[] {
  const out: Change[] = [];
  const add = (section: SectionId, label: string, before: string, after: string) => {
    if (before !== after) out.push({ section, label, before, after });
  };
  add('access', 'Who can see it', VISIBILITY_LABEL[a.visibility], VISIBILITY_LABEL[b.visibility]);
  add('access', 'What invitees can reach', REACH_LABEL[a.reach], REACH_LABEL[b.reach]);
  add('posting', 'Who can post', POSTING_LABEL[a.posting], POSTING_LABEL[b.posting]);
  add('photos', 'Block saving photos', onOff(a.blockDownload), onOff(b.blockDownload));
  add('photos', 'Block sharing photos', onOff(a.blockShare), onOff(b.blockShare));
  add('photos', 'Name watermark on photos', onOff(a.watermark), onOff(b.watermark));
  const n = (s: Settings) =>
    s.notify === 'digest' ? `Daily digest at ${s.digestTime}` : NOTIFY_LABEL[s.notify];
  add('notify', 'Test knitter notifications', n(a), n(b));
  add('notify', 'Knitters can change their own', a.memberCanChange ? 'Yes' : 'No', b.memberCanChange ? 'Yes' : 'No');
  add('invite', 'Invite emails come from', SENDER_LABEL[a.sender], SENDER_LABEL[b.sender]);
  add('welcome', 'Welcome message', `“${a.welcome.trim()}”`, `“${b.welcome.trim()}”`);
  add('holds', 'Words held for approval', quoteList(a.keywords), quoteList(b.keywords));
  add('holds', 'Hold any ravelry.com link', onOff(a.holdRavelryLinks), onOff(b.holdRavelryLinks));
  return out;
}

export function sectionChanged(changes: Change[], id: SectionId) {
  return changes.some((c) => c.section === id);
}

/* ---------- keyword matching ---------- */

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface HoldResult {
  held: boolean;
  reasons: string[];
}

/** Whole-word start, any ending: "leak" matches leak, leaks, leaked. Case doesn't matter. */
export function checkHold(text: string, s: Pick<Settings, 'keywords' | 'holdRavelryLinks'>): HoldResult {
  const reasons: string[] = [];
  for (const k of s.keywords) {
    const pattern = k
      .trim()
      .split(/\s+/)
      .map(escapeRe)
      .join('\\s+');
    if (!pattern) continue;
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${pattern}`, 'iu');
    if (re.test(text)) reasons.push(`“${k}”`);
  }
  if (s.holdRavelryLinks && /(ravelry\.com|ravel\.ry)/i.test(text)) reasons.push('a ravelry.com link');
  return { held: reasons.length > 0, reasons };
}

/* ---------- access ---------- */

export function spacesFor(person: Person, isInvitee: boolean, s: Settings): Space[] {
  if (person.kind === 'guest') {
    if (!isInvitee) return [];
    return s.reach === 'basics' ? SPACES.filter((sp) => sp.guestBasics) : [];
  }
  return SPACES.filter((sp) => person.tier && sp.tiers.includes(person.tier));
}

export function personLabel(p: Person) {
  return p.kind === 'guest' ? 'Guest (not a member)' : `${p.tier} member`;
}

/** Space names mentioned in the welcome text that this person cannot open. */
export function unreachableMentions(text: string, person: Person, s: Settings): string[] {
  const reachable = new Set(spacesFor(person, true, s).map((sp) => sp.name.toLowerCase()));
  return SPACES.filter(
    (sp) => text.toLowerCase().includes(sp.name.toLowerCase()) && !reachable.has(sp.name.toLowerCase()),
  ).map((sp) => sp.name);
}

/** Guests who couldn't open a space named in the welcome message. */
export function welcomeConflicts(text: string, s: Settings, invitees: Person[]) {
  const result: { space: string; people: Person[] }[] = [];
  for (const sp of SPACES) {
    if (!text.toLowerCase().includes(sp.name.toLowerCase())) continue;
    const blocked = invitees.filter((p) => !spacesFor(p, true, s).some((x) => x.id === sp.id));
    if (blocked.length) result.push({ space: sp.name, people: blocked });
  }
  return result;
}

export function fillWelcome(text: string, first: string) {
  return text.replace(/\{first name\}/gi, first);
}

/* ---------- experience summaries ---------- */

export type Tone = 'ok' | 'warn' | 'info';
export interface Line {
  tone: Tone;
  text: string;
}

export function testKnitterLines(p: Person, s: Settings): Line[] {
  const lines: Line[] = [];
  lines.push({
    tone: 'info',
    text:
      s.sender === 'brand'
        ? `Gets an invite email from ${BRAND.displayName}, with your logo`
        : `Gets an invite email from “${COMMUNITY.name}”`,
  });
  if (p.kind === 'guest') {
    lines.push(
      s.reach === 'space'
        ? { tone: 'ok', text: `Can open ${SPACE.name} and nothing else in the community` }
        : { tone: 'warn', text: 'Can also open Announcements and General Chat, without paying' },
    );
  } else {
    lines.push({
      tone: 'info',
      text: `Keeps their ${p.tier} spaces; the invite adds ${s.reach === 'space' ? 'only this space' : 'this space'}`,
    });
  }
  lines.push(
    s.posting === 'owner'
      ? { tone: 'warn', text: 'Can read and react, but can’t post or reply' }
      : { tone: 'ok', text: 'Can start threads and reply in this space' },
  );
  if (s.blockDownload && s.blockShare) lines.push({ tone: 'ok', text: 'Can view design photos but not save or share them' });
  else if (s.blockDownload) lines.push({ tone: 'warn', text: 'Can’t save design photos, but can share links to them' });
  else if (s.blockShare) lines.push({ tone: 'warn', text: 'Can’t share design photos, but can download them' });
  else lines.push({ tone: 'warn', text: 'Can download and share photos of unreleased designs' });
  const notifyText: Record<NotifyMode, Line> = {
    instant: { tone: 'info', text: 'Gets an alert for every new post and reply' },
    digest: { tone: 'info', text: `Gets one digest email a day at ${s.digestTime}, their time` },
    weekly: { tone: 'info', text: 'Gets one digest email a week, on Mondays' },
    off: { tone: 'info', text: 'Gets no notifications; sees new posts only when visiting' },
  };
  lines.push(notifyText[s.notify]);
  const blocked = unreachableMentions(s.welcome, p, s);
  if (blocked.length)
    lines.push({ tone: 'warn', text: `Welcome message points to ${blocked.join(' and ')}, which they can’t open` });
  if (s.keywords.length || s.holdRavelryLinks)
    lines.push({ tone: 'ok', text: 'Posts with spoiler words wait for your approval before anyone sees them' });
  else lines.push({ tone: 'info', text: 'Every post appears straight away; nothing is held' });
  return lines;
}

export function regularLines(p: Person, s: Settings): Line[] {
  const lines: Line[] = [];
  if (s.visibility === 'open') {
    lines.push({ tone: 'warn', text: `Sees ${SPACE.name} in their space list and can open it` });
    lines.push(
      s.posting === 'all'
        ? { tone: 'warn', text: 'Can post and reply there, and see the design photos' }
        : { tone: 'warn', text: 'Can read every thread and see the design photos' },
    );
    lines.push({ tone: 'warn', text: 'Finds it in search' });
  } else if (s.visibility === 'locked') {
    lines.push({ tone: 'warn', text: 'Sees the space name with a lock, so knows it exists' });
    lines.push({ tone: 'warn', text: `Can tap “Ask to join”, which sends you a request` });
    lines.push({ tone: 'warn', text: 'Finds the name in search' });
  } else {
    lines.push({ tone: 'ok', text: 'Doesn’t see the space anywhere in the community' });
    lines.push({ tone: 'ok', text: 'Search returns nothing for it' });
    lines.push({ tone: 'ok', text: 'A forwarded link shows “Page not found”' });
  }
  lines.push(
    s.visibility === 'hidden'
      ? { tone: 'ok', text: 'Test knitters’ posts there don’t show on their profiles' }
      : { tone: 'warn', text: 'Sees test knitters’ activity there on their profiles' },
  );
  if (p.tier === 'Studio' && s.visibility === 'hidden')
    lines.push({ tone: 'info', text: 'Paying for Studio doesn’t unlock it; only an invite does' });
  return lines;
}

export const GUESTS = GUEST_COUNT;
