import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { CircleMark, OduyaMark, Swatch } from './art';
import { BRAND, COMMUNITY, DAY_ACTIVITY, INVITEES, Person, REGULARS, SPACE, THREADS } from './data';
import {
  checkHold,
  fillWelcome,
  Line,
  personLabel,
  regularLines,
  Settings,
  spacesFor,
  testKnitterLines,
  unreachableMentions,
} from './logic';
import { Avatar, Icon } from './ui';

type Mode = 'knitter' | 'regular';
type KView = 'invite' | 'space' | 'notify';
type RView = 'community' | 'search' | 'profile';

interface Props {
  s: Settings;
  dirty: boolean;
  toast: (msg: string) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
}

export function Preview({ s, dirty, toast, mode, setMode }: Props) {
  const [knitterId, setKnitterId] = useState('saoirse');
  const [regularId, setRegularId] = useState('liesel');
  const [kView, setKView] = useState<KView>('space');
  const [rView, setRView] = useState<RView>('community');
  const knitter = INVITEES.find((p) => p.id === knitterId)!;
  const regular = REGULARS.find((p) => p.id === regularId)!;

  const lines = mode === 'knitter' ? testKnitterLines(knitter, s) : regularLines(regular, s);
  const person = mode === 'knitter' ? knitter : regular;

  return (
    <aside className="previewCol" aria-label="Preview">
      <div className="previewHead">
        <div>
          <h2>Preview</h2>
          <p className="hint">{dirty ? 'Includes your unsaved changes' : 'Matches your saved settings'}</p>
        </div>
      </div>

      <div className="personaTabs" role="tablist" aria-label="Preview as">
        <button
          role="tab"
          aria-selected={mode === 'knitter'}
          className={mode === 'knitter' ? 'active' : ''}
          onClick={() => setMode('knitter')}
        >
          <span className="ptLabel">A test knitter</span>
          <span className="ptSub">Invited to this space</span>
        </button>
        <button
          role="tab"
          aria-selected={mode === 'regular'}
          className={mode === 'regular' ? 'active' : ''}
          onClick={() => setMode('regular')}
        >
          <span className="ptLabel">A regular member</span>
          <span className="ptSub">Not invited</span>
        </button>
      </div>

      <div className="personaPick">
        <Avatar name={person.name} hue={person.hue} size={34} />
        <div className="ppText">
          <label htmlFor="personSel" className="srOnly">
            Choose who to preview as
          </label>
          <select
            id="personSel"
            value={mode === 'knitter' ? knitterId : regularId}
            onChange={(e) => (mode === 'knitter' ? setKnitterId(e.target.value) : setRegularId(e.target.value))}
          >
            {(mode === 'knitter' ? INVITEES : REGULARS).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {personLabel(p)}
              </option>
            ))}
          </select>
          <span className="hint">{person.place}</span>
        </div>
      </div>

      <div className="summary">
        <div className="summaryTitle">What {person.first} would experience</div>
        <ul>
          {lines.map((l, i) => (
            <SummaryLine key={i} line={l} />
          ))}
        </ul>
      </div>

      {mode === 'knitter' ? (
        <>
          <ViewTabs
            value={kView}
            onChange={setKView}
            items={[
              ['space', 'In the space'],
              ['invite', 'Invite email'],
              ['notify', 'Notifications'],
            ]}
          />
          {kView === 'invite' && <InviteEmail s={s} p={knitter} toast={toast} />}
          {kView === 'space' && <KnitterSpace s={s} p={knitter} toast={toast} />}
          {kView === 'notify' && <Notifications s={s} p={knitter} />}
        </>
      ) : (
        <>
          <ViewTabs
            value={rView}
            onChange={setRView}
            items={[
              ['community', 'Their space list'],
              ['search', 'Search & links'],
              ['profile', 'A test knitter’s profile'],
            ]}
          />
          {rView === 'community' && <RegularCommunity s={s} p={regular} toast={toast} />}
          {rView === 'search' && <RegularSearch s={s} p={regular} />}
          {rView === 'profile' && <RegularProfile s={s} viewer={regular} />}
        </>
      )}
    </aside>
  );
}

function SummaryLine({ line }: { line: Line }) {
  const icon = line.tone === 'ok' ? 'check' : line.tone === 'warn' ? 'alert' : 'info';
  return (
    <li className={`sl ${line.tone}`}>
      <Icon name={icon} size={14} />
      <span>{line.text}</span>
    </li>
  );
}

function ViewTabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: [T, string][];
}) {
  return (
    <div className="viewTabs" role="tablist">
      {items.map(([v, label]) => (
        <button key={v} role="tab" aria-selected={value === v} className={value === v ? 'active' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- mini app shell ---------------- */

function MiniApp({
  sidebar,
  children,
  viewer,
}: {
  sidebar: ReactNode;
  children: ReactNode;
  viewer: Person;
}) {
  return (
    <div className="mini" aria-label={`${viewer.name}'s view`}>
      <div className="miniTop">
        <span className="miniDots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="miniUrl">{COMMUNITY.subdomain}</span>
        <span className="miniUser">
          <Avatar name={viewer.name} hue={viewer.hue} size={18} />
          {viewer.first}
        </span>
      </div>
      <div className="miniBody">
        <nav className="miniSide">
          <div className="miniCommunity">{COMMUNITY.name}</div>
          {sidebar}
        </nav>
        <div className="miniMain">{children}</div>
      </div>
    </div>
  );
}

function SideItem({
  label,
  active,
  icon,
  badge,
  onClick,
}: {
  label: string;
  active?: boolean;
  icon?: string;
  badge?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="hash">{icon ? <Icon name={icon} size={11} /> : '#'}</span>
      <span className="siLabel">{label}</span>
      {badge && <span className="siBadge">{badge}</span>}
    </>
  );
  return onClick ? (
    <button type="button" className={`si ${active ? 'active' : ''}`} onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className={`si ${active ? 'active' : ''}`}>{content}</div>
  );
}

/* ---------------- photo tile ---------------- */

function PhotoTile({
  photo,
  s,
  viewer,
  toast,
}: {
  photo: { yarn: string; ground: string; label: string };
  s: Settings;
  viewer: Person;
  toast: (m: string) => void;
}) {
  return (
    <figure
      className="photo"
      onContextMenu={(e) => {
        if (s.blockDownload) {
          e.preventDefault();
          toast('Right-click “Save image” is turned off in this space.');
        }
      }}
      onDragStart={(e) => s.blockDownload && e.preventDefault()}
    >
      <Swatch {...photo} />
      {s.watermark && (
        <div className="watermark" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i}>
              {viewer.name} · {BRAND.displayName} test knit
            </span>
          ))}
        </div>
      )}
      <span className="photoActions">
        {s.blockDownload && s.blockShare ? (
          <span className="pa off" title="Saving and sharing are off">
            <Icon name="lock" size={10} /> Can’t save or share
          </span>
        ) : (
          <>
            {s.blockDownload ? (
              <span className="pa off" title="Saving is off">
                <Icon name="lock" size={10} /> No saving
              </span>
            ) : (
              <button
                type="button"
                className="pa"
                onClick={() => toast(`This photo would download to ${viewer.first}’s device.`)}
                aria-label="Download photo"
                title="Download"
              >
                <Icon name="download" size={12} />
              </button>
            )}
            {s.blockShare ? (
              <span className="pa off" title="Sharing is off">
                <Icon name="lock" size={10} /> No sharing
              </span>
            ) : (
              <button
                type="button"
                className="pa"
                onClick={() => toast(`${viewer.first} could copy a public link to this photo and send it anywhere.`)}
                aria-label="Share photo"
                title="Share"
              >
                <Icon name="share" size={12} />
              </button>
            )}
          </>
        )}
      </span>
      <figcaption>{photo.label}</figcaption>
    </figure>
  );
}

function Threads({ s, viewer, toast }: { s: Settings; viewer: Person; toast: (m: string) => void }) {
  return (
    <>
      {THREADS.map((t) => (
        <article className="thread" key={t.id}>
          <div className="tHead">
            <Avatar name={t.author} hue={t.authorHue} size={20} />
            <strong>{t.author}</strong>
            <span className="tWhen">
              {t.when === 'Pinned' ? (
                <>
                  <Icon name="pin" size={10} /> Pinned
                </>
              ) : (
                t.when
              )}
            </span>
          </div>
          <div className="tTitle">{t.title}</div>
          <p className="tBody">{t.body}</p>
          <div className={`photos n${t.photos.length}`}>
            {t.photos.map((ph) => (
              <PhotoTile key={ph.label} photo={ph} s={s} viewer={viewer} toast={toast} />
            ))}
          </div>
          <div className="tFoot">{t.replies} replies</div>
        </article>
      ))}
    </>
  );
}

/* ---------------- test knitter views ---------------- */

function highlightMentions(text: string, blocked: string[], first: string): ReactNode {
  if (!blocked.length) return text;
  const re = new RegExp(`(${blocked.map((b) => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return text.split(re).map((part, i) =>
    blocked.some((b) => b.toLowerCase() === part.toLowerCase()) ? (
      <mark key={i} title={`${first} can’t open ${part}`}>
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

interface LocalPost {
  id: number;
  text: string;
  held: boolean;
  reasons: string[];
}

function KnitterSpace({ s, p, toast }: { s: Settings; p: Person; toast: (m: string) => void }) {
  const [text, setText] = useState('');
  const [posts, setPosts] = useState<LocalPost[]>([]);
  useEffect(() => setPosts([]), [p.id]);
  const spaces = spacesFor(p, true, s);
  const welcome = fillWelcome(s.welcome.trim(), p.first);
  const blocked = unreachableMentions(s.welcome, p, s);
  const canPost = s.posting !== 'owner';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const r = checkHold(text, s);
    setPosts((ps) => [...ps, { id: Date.now(), text: text.trim(), held: r.held, reasons: r.reasons }]);
    setText('');
  };

  return (
    <MiniApp
      viewer={p}
      sidebar={
        <>
          {spaces.length === 0 && <div className="siNote">No other spaces</div>}
          {spaces.map((sp) => (
            <SideItem key={sp.id} label={sp.name} />
          ))}
          <div className="siGroup">Invited</div>
          <SideItem label={SPACE.name} active icon="lock" />
        </>
      }
    >
      <div className="spaceHead">
        <div className="shTitle">{SPACE.name}</div>
        <div className="shMeta">
          Invite only · 18 knitters · Test window {SPACE.window}
        </div>
      </div>

      {welcome && (
        <div className="welcomeCard">
          <div className="wcHead">
            <Avatar name={COMMUNITY.owner} hue={280} size={20} />
            <strong>{COMMUNITY.owner}</strong>
            <span className="tWhen">Welcome message</span>
          </div>
          <p>{highlightMentions(welcome, blocked, p.first)}</p>
          {blocked.length > 0 && (
            <div className="wcWarn">
              <Icon name="alert" size={11} /> {p.first} can’t open {blocked.join(' or ')}; the link would show “Page not
              found”.
            </div>
          )}
        </div>
      )}

      <Threads s={s} viewer={p} toast={toast} />

      {posts.map((post) => (
        <article className={`thread mine ${post.held ? 'heldPost' : ''}`} key={post.id}>
          <div className="tHead">
            <Avatar name={p.name} hue={p.hue} size={20} />
            <strong>{p.name}</strong>
            <span className="tWhen">just now</span>
          </div>
          <p className="tBody">{post.text}</p>
          {post.held ? (
            <div className="heldNote">
              <Icon name="shield" size={12} />
              <span>
                Waiting for {COMMUNITY.ownerFirst}’s approval. Only {p.first} can see this until then.{' '}
                <span className="dim">(Matched {post.reasons.join(', ')}; only you see why.)</span>
              </span>
            </div>
          ) : (
            <div className="postedNote">
              <Icon name="check" size={12} /> <span>Posted. Everyone in the space can see it.</span>
            </div>
          )}
        </article>
      ))}

      {canPost ? (
        <form className="composer" onSubmit={submit}>
          <label htmlFor="composer" className="srOnly">
            Write a post as {p.first}
          </label>
          <input
            id="composer"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Try a post as ${p.first}…`}
          />
          <button type="submit" className="btn primary small" disabled={!text.trim()}>
            Post
          </button>
        </form>
      ) : (
        <div className="composer disabled">
          <Icon name="lock" size={12} /> Only {COMMUNITY.ownerFirst} can post here. {p.first} can read and react.
        </div>
      )}
    </MiniApp>
  );
}

function InviteEmail({ s, p, toast }: { s: Settings; p: Person; toast: (m: string) => void }) {
  const brand = s.sender === 'brand';
  const fromName = brand ? BRAND.displayName : COMMUNITY.name;
  return (
    <div className="email">
      <div className="emailMeta">
        <div className="emRow">
          <span className="emKey">From</span>
          <span>
            <strong>{fromName}</strong> &lt;invites@hearthroom.app&gt;
          </span>
        </div>
        <div className="emRow">
          <span className="emKey">To</span>
          <span>{p.name}</span>
        </div>
        <div className="emRow">
          <span className="emKey">Subject</span>
          <span>
            {COMMUNITY.ownerFirst} invited you to test-knit the winter collection
          </span>
        </div>
      </div>
      <div className="emailBody">
        <div className="emBrand">
          {brand ? <OduyaMark size={44} /> : <CircleMark size={44} />}
          <div className="emBrandName">{fromName}</div>
        </div>
        <h3>You’re invited to {SPACE.name}</h3>
        <p>Hi {p.first},</p>
        <p>
          {COMMUNITY.owner} has invited you to test-knit the winter collection before it’s released. The test runs{' '}
          {SPACE.windowLong}.
        </p>
        {p.kind === 'guest' && (
          <p className="emSmall">
            You don’t need a subscription.{' '}
            {s.reach === 'space'
              ? 'Your invite opens this test-knit space only.'
              : 'Your invite also opens Announcements and General Chat.'}
          </p>
        )}
        <button type="button" className="emBtn" onClick={() => toast(`${p.first} would land in ${SPACE.name} after accepting.`)}>
          Accept invite
        </button>
        <p className="emSmall">Please keep the designs and photos private until release.</p>
        <div className="emFoot">Sent with Hearthroom on behalf of {fromName}</div>
      </div>
    </div>
  );
}

function Notifications({ s, p }: { s: Settings; p: Person }) {
  const foot = s.memberCanChange
    ? `${p.first} can change this in their notification settings.`
    : `${p.first} can’t change this; it’s set by you.`;
  if (s.notify === 'off') {
    return (
      <div className="notifyBox">
        <div className="emptyState">
          <Icon name="bell" size={20} />
          <div>No alerts or emails for this space.</div>
          <div className="hint">{p.first} sees new posts only by visiting.</div>
        </div>
        <div className="notifyFoot">{foot}</div>
      </div>
    );
  }
  if (s.notify === 'instant') {
    return (
      <div className="notifyBox">
        <div className="nbTitle">
          <Icon name="bell" size={13} /> {p.first}’s alerts on a typical test day
        </div>
        <ul className="alerts">
          {DAY_ACTIVITY.filter((a) => a.who !== p.name).map((a, i) => (
            <li key={i}>
              <span className="alDot" />
              <span>
                <strong>{a.who}</strong> {a.what}
              </span>
              <span className="alTime">{a.time}</span>
            </li>
          ))}
        </ul>
        <div className="moreLine">…and an alert for every reply after that. Busy days can mean 20 or more.</div>
        <div className="notifyFoot">{foot}</div>
      </div>
    );
  }
  const weekly = s.notify === 'weekly';
  return (
    <div className="notifyBox">
      <div className="digest">
        <div className="dgMeta">
          <Icon name="mail" size={13} />
          <span>
            <strong>{COMMUNITY.name}</strong> · {weekly ? 'Mon, Nov 23 · 8:00 AM' : `Tue, Nov 17 · ${s.digestTime}`}
          </span>
        </div>
        <div className="dgSubject">
          {weekly ? 'Your week' : 'Your day'} in {SPACE.name}
        </div>
        <div className="dgStats">
          {weekly ? '14 new threads · 96 replies' : '3 new threads · 18 replies'}
        </div>
        <ul>
          <li>Larchmere Cardigan: chart errata, row 34 · {COMMUNITY.owner}</li>
          <li>Birchfell Mittens: thumb gusset question · Wren Castellano</li>
          <li>Hollin Cowl gauge: 19 sts / 4 in · Imani Reyes</li>
        </ul>
        <div className="dgNote">One email {weekly ? 'a week' : 'a day'}. No other alerts from this space.</div>
      </div>
      <div className="notifyFoot">{foot}</div>
    </div>
  );
}

/* ---------------- regular member views ---------------- */

function RegularCommunity({ s, p, toast }: { s: Settings; p: Person; toast: (m: string) => void }) {
  const spaces = spacesFor(p, false, s);
  const [opened, setOpened] = useState(false);
  useEffect(() => setOpened(false), [s.visibility, p.id]);
  const visible = s.visibility !== 'hidden';

  return (
    <MiniApp
      viewer={p}
      sidebar={
        <>
          {spaces.map((sp) => (
            <SideItem key={sp.id} label={sp.name} active={!opened && sp.id === 'general'} />
          ))}
          {visible && (
            <SideItem
              label={SPACE.name}
              icon={s.visibility === 'locked' ? 'lock' : undefined}
              badge="New"
              active={opened}
              onClick={() => setOpened(true)}
            />
          )}
        </>
      }
    >
      {opened && s.visibility === 'open' ? (
        <>
          <div className="spaceHead">
            <div className="shTitle">{SPACE.name}</div>
            <div className="shMeta">Open to all members · {p.first} is browsing as a {p.tier} member</div>
          </div>
          <Threads s={s} viewer={p} toast={toast} />
          {s.posting === 'all' ? (
            <div className="composer fake">
              <span>Write a post…</span>
              <span className="warnTag">{p.first} can post here</span>
            </div>
          ) : (
            <div className="composer disabled">
              <Icon name="lock" size={12} /> {p.first} can read, but posting is limited.
            </div>
          )}
        </>
      ) : opened && s.visibility === 'locked' ? (
        <div className="lockedPage">
          <Icon name="lock" size={22} />
          <div className="lpTitle">{SPACE.name}</div>
          <div className="hint">This space is invite only.</div>
          <button type="button" className="btn small" onClick={() => toast(`You’d get a join request from ${p.first}.`)}>
            Ask to join
          </button>
        </div>
      ) : (
        <>
          <div className="spaceHead">
            <div className="shTitle">General Chat</div>
            <div className="shMeta">What {p.first} sees on arrival</div>
          </div>
          {visible && (
            <button type="button" className="newSpaceBanner" onClick={() => setOpened(true)}>
              <Icon name="layers" size={13} />
              <span>
                New space: <strong>{SPACE.name}</strong>
                {s.visibility === 'locked' ? ' (invite only)' : ''}
              </span>
              <Icon name="chevron" size={12} />
            </button>
          )}
          <article className="thread">
            <div className="tHead">
              <Avatar name="Gráinne Walsh" hue={100} size={20} />
              <strong>Gráinne Walsh</strong>
              <span className="tWhen">25m</span>
            </div>
            <p className="tBody">Has anyone tried the Fernbrook socks in a DK weight? Thinking of sizing down.</p>
            <div className="tFoot">6 replies</div>
          </article>
          <article className="thread">
            <div className="tHead">
              <Avatar name="Rosa Delgado" hue={330} size={20} />
              <strong>Rosa Delgado</strong>
              <span className="tWhen">1h</span>
            </div>
            <p className="tBody">Finally blocked my Tidewater shawl. Photos in WIP Photos!</p>
            <div className="tFoot">11 replies</div>
          </article>
          {!visible && (
            <div className="okNote">
              <Icon name="eyeOff" size={12} /> {SPACE.name} isn’t in {p.first}’s list. Nothing hints that it exists.
            </div>
          )}
        </>
      )}
    </MiniApp>
  );
}

function RegularSearch({ s, p }: { s: Settings; p: Person }) {
  const [q, setQ] = useState('test knit');
  const visible = s.visibility !== 'hidden';
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const out: { kind: string; title: string; sub: string }[] = [];
    const words = term.split(/\s+/);
    const match = (t: string) => words.every((w) => t.toLowerCase().includes(w));
    for (const sp of spacesFor(p, false, s)) if (match(sp.name)) out.push({ kind: 'Space', title: sp.name, sub: 'Space' });
    if (visible && match(SPACE.name + ' winter test knit'))
      out.push({
        kind: 'Space',
        title: SPACE.name,
        sub: s.visibility === 'locked' ? 'Space · Invite only' : 'Space · 18 members',
      });
    if (s.visibility === 'open')
      for (const t of THREADS) if (match(t.title + ' ' + t.body)) out.push({ kind: 'Thread', title: t.title, sub: `Thread in ${SPACE.name}` });
    return out;
  }, [q, s, p, visible]);

  const linkResult =
    s.visibility === 'hidden' ? (
      <div className="linkPage nf">
        <div className="lpCode">404</div>
        <div className="lpTitle">Page not found</div>
        <div className="hint">The link may be broken, or the page may have been removed.</div>
      </div>
    ) : s.visibility === 'locked' ? (
      <div className="linkPage">
        <Icon name="lock" size={18} />
        <div className="lpTitle">{SPACE.name} is invite only</div>
        <div className="hint">Ask {COMMUNITY.owner} for an invite.</div>
      </div>
    ) : (
      <div className="linkPage open">
        <Icon name="alert" size={18} />
        <div className="lpTitle">Opens the space</div>
        <div className="hint">
          {p.first} lands in {SPACE.name} and can see every thread and photo.
        </div>
      </div>
    );

  return (
    <div className="searchBox">
      <div className="sbBlock">
        <label htmlFor="rsearch" className="subTitle">
          {p.first} searches the community
        </label>
        <div className="searchInput">
          <Icon name="search" size={14} />
          <input id="rsearch" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <ul className="results">
          {q.trim() && results.length === 0 && <li className="noRes">No results for “{q.trim()}”</li>}
          {results.map((r, i) => (
            <li key={i} className={r.title === SPACE.name || r.sub.includes(SPACE.name) ? 'leak' : ''}>
              <Icon name={r.kind === 'Space' ? 'layers' : 'chat'} size={13} />
              <span>
                <strong>{r.title}</strong>
                <span className="hint">{r.sub}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="sbBlock">
        <div className="subTitle">A test knitter forwards {p.first} the link</div>
        <div className="urlBar">
          <Icon name="link" size={12} />
          {COMMUNITY.subdomain}/s/{SPACE.slug}
        </div>
        {linkResult}
      </div>
    </div>
  );
}

function RegularProfile({ s, viewer }: { s: Settings; viewer: Person }) {
  const [whoId, setWhoId] = useState('saoirse');
  const memberInvitees = INVITEES.filter((i) => i.kind === 'member');
  const who = memberInvitees.find((i) => i.id === whoId)!;
  const showTest = s.visibility !== 'hidden';
  return (
    <div className="profile">
      <div className="pfHead">
        <Avatar name={who.name} hue={who.hue} size={40} />
        <div>
          <label htmlFor="pfSel" className="srOnly">
            Test knitter profile
          </label>
          <select id="pfSel" value={whoId} onChange={(e) => setWhoId(e.target.value)}>
            {memberInvitees.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <div className="hint">
            {who.tier} member · {who.place} · as {viewer.first} sees it
          </div>
        </div>
      </div>
      <div className="subTitle" style={{ marginTop: 14 }}>
        Recent activity
      </div>
      <ul className="activity">
        {showTest && (
          <li className="leak">
            <Icon name="chat" size={13} />
            <span>
              Replied in <strong>{SPACE.name}</strong>: “Yoke depth on the size 2 came out a centimetre short for me…”
            </span>
            <span className="alTime">3h</span>
          </li>
        )}
        <li>
          <Icon name="image" size={13} />
          <span>
            Posted in <strong>WIP Photos</strong>: “Larch socks, heel turned at last”
          </span>
          <span className="alTime">Yesterday</span>
        </li>
        <li>
          <Icon name="chat" size={13} />
          <span>
            Replied in <strong>General Chat</strong>: “Ballyhoura Mill’s seconds sale starts Friday”
          </span>
          <span className="alTime">2 days</span>
        </li>
      </ul>
      {!showTest && (
        <div className="okNote">
          <Icon name="eyeOff" size={12} /> Activity in {SPACE.name} is left out, so {viewer.first} sees nothing unusual.
        </div>
      )}
    </div>
  );
}
