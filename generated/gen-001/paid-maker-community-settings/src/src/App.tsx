import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HearthroomMark, OduyaMark, CircleMark } from './art';
import { BRAND, COMMUNITY, INVITEES, LAST_CHANGED, REGULARS, SPACE, SPACES, TODAY } from './data';
import { SettingsForm } from './Form';
import {
  diff,
  fillWelcome,
  INITIAL,
  Line,
  NOTIFY_LABEL,
  regularLines,
  sectionChanged,
  SECTIONS,
  Settings,
  testKnitterLines,
  welcomeConflicts,
} from './logic';
import { Preview } from './Preview';
import { Avatar, Icon } from './ui';

interface Toast {
  id: number;
  msg: string;
  action?: { label: string; run: () => void };
}

const NAV = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'members', label: 'Members', icon: 'users', count: '342' },
  { id: 'spaces', label: 'Spaces', icon: 'layers' },
  { id: 'tiers', label: 'Tiers & pricing', icon: 'tag' },
  { id: 'approvals', label: 'Approvals', icon: 'inbox' },
  { id: 'brand', label: 'Brand', icon: 'palette' },
  { id: 'settings', label: 'Community settings', icon: 'gear' },
];

function nowTime() {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function App() {
  const [saved, setSaved] = useState<Settings>(INITIAL);
  const [draft, setDraft] = useState<Settings>(INITIAL);
  const [lastChanged, setLastChanged] = useState(LAST_CHANGED);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [invitesSentAt, setInvitesSentAt] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'review' | 'send' | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [previewMode, setPreviewMode] = useState<'knitter' | 'regular'>('knitter');
  const formRef = useRef<HTMLDivElement>(null);

  const changes = useMemo(() => diff(saved, draft), [saved, draft]);
  const dirty = changes.length > 0;

  const update = useCallback((patch: Partial<Settings>) => setDraft((d) => ({ ...d, ...patch })), []);

  const showToast = useCallback((msg: string, action?: Toast['action']) => {
    setToast({ id: Date.now(), msg, action });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.action ? 7000 : 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty) setDialog('review');
      }
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [dirty]);

  const discard = () => {
    const before = draft;
    setDraft(saved);
    showToast(`Discarded ${changes.length} change${changes.length === 1 ? '' : 's'}.`, {
      label: 'Undo',
      run: () => setDraft(before),
    });
  };

  const save = () => {
    setSaved(draft);
    setLastChanged(TODAY);
    setSavedAt(nowTime());
    setDialog(null);
    showToast(invitesSentAt ? 'Settings saved. Test knitters will see the changes right away.' : 'Settings saved. You can send the invites whenever you’re ready.');
  };

  const sendInvites = () => {
    setInvitesSentAt(nowTime());
    setDialog(null);
    showToast(`Invites sent to ${INVITEES.length} test knitters from ${draft.sender === 'brand' ? BRAND.displayName : COMMUNITY.name}.`);
  };

  const navClick = (label: string) => {
    if (dirty) showToast(`Save or discard your changes to ${SPACE.name} before opening ${label}.`);
    else showToast(`${label} isn’t part of this demo. Only this space’s settings are.`);
  };

  const jump = (id: string) => {
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const status = invitesSentAt
    ? `Live · ${saved.visibility === 'hidden' ? 'hidden' : saved.visibility === 'locked' ? 'listed, locked' : 'visible to all'}`
    : 'Draft';

  return (
    <div className="app">
      {/* ---------- Admin sidebar ---------- */}
      <nav className="side" aria-label="Admin">
        <div className="sideBrand">
          <HearthroomMark />
          <span>Hearthroom</span>
        </div>
        <button type="button" className="communitySwitch" onClick={() => navClick('the community switcher')}>
          <CircleMark size={30} />
          <span>
            <strong>{COMMUNITY.name}</strong>
            <span className="hint">{COMMUNITY.memberCount} members</span>
          </span>
        </button>
        <ul className="navList">
          {NAV.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className={`navItem ${n.id === 'spaces' ? 'current' : ''}`}
                aria-current={n.id === 'spaces' ? 'page' : undefined}
                onClick={() => n.id !== 'spaces' && navClick(n.label)}
              >
                <Icon name={n.icon} size={16} />
                <span>{n.label}</span>
                {n.count && <span className="navCount">{n.count}</span>}
              </button>
              {n.id === 'spaces' && (
                <ul className="subNav">
                  {SPACES.map((sp) => (
                    <li key={sp.id}>
                      <button type="button" onClick={() => navClick(sp.name)}>
                        {sp.name}
                      </button>
                    </li>
                  ))}
                  <li>
                    <button type="button" className="current" aria-current="page">
                      <Icon name="lock" size={11} />
                      {SPACE.name}
                      <span className={`navDraft ${invitesSentAt ? 'live' : ''}`}>{invitesSentAt ? 'Live' : 'Draft'}</span>
                    </button>
                  </li>
                </ul>
              )}
            </li>
          ))}
        </ul>
        <div className="sideFoot">
          <Avatar name={COMMUNITY.owner} hue={280} size={28} />
          <span>
            <strong>{COMMUNITY.owner}</strong>
            <span className="hint">Owner</span>
          </span>
        </div>
      </nav>

      {/* ---------- Main ---------- */}
      <main className="main">
        <header className="pageHead">
          <div className="phLeft">
            <div className="crumbs">
              <span>Spaces</span>
              <Icon name="chevron" size={12} />
              <span>{SPACE.name}</span>
            </div>
            <div className="phTitleRow">
              <h1>{SPACE.name}</h1>
              <span className={`statusBadge ${invitesSentAt ? 'live' : ''}`}>{status}</span>
            </div>
            <div className="phMeta">
              <span>
                <Icon name="users" size={13} /> {INVITEES.length} invitees
              </span>
              <span>Test window {SPACE.window}</span>
              <span>
                {savedAt ? `Saved today at ${savedAt}` : `Settings last changed ${lastChanged}`}
              </span>
              {invitesSentAt && (
                <span className="sentMeta">
                  <Icon name="send" size={12} /> Invites sent at {invitesSentAt}
                </span>
              )}
            </div>
          </div>
          <div className="phActions">
            {dirty ? (
              <>
                <span className="unsaved" aria-live="polite">
                  <span className="udot" /> {changes.length} unsaved change{changes.length === 1 ? '' : 's'}
                </span>
                <button type="button" className="btn" onClick={discard}>
                  Discard
                </button>
                <button type="button" className="btn primary" onClick={() => setDialog('review')}>
                  Review &amp; save
                </button>
              </>
            ) : invitesSentAt ? (
              <span className="unsaved ok">
                <Icon name="check" size={14} /> All changes saved
              </span>
            ) : (
              <>
                {savedAt && (
                  <span className="unsaved ok">
                    <Icon name="check" size={14} /> Saved
                  </span>
                )}
                <button type="button" className="btn primary" onClick={() => setDialog('send')}>
                  <Icon name="send" size={14} /> Send {INVITEES.length} invites
                </button>
              </>
            )}
          </div>
        </header>

        <div className="workspace">
          <div className="formScroll" ref={formRef}>
            <div className="draftNote">
              <Icon name="info" size={14} />
              <span>
                {invitesSentAt
                  ? 'Invites are out. Changes you save here apply to the space immediately.'
                  : 'This space is still a draft. Nobody but you can see it until you send the invites.'}{' '}
                It started with your community defaults.
              </span>
            </div>
            <div className="secNav" role="navigation" aria-label="Jump to section">
              {SECTIONS.map((sec) => (
                <button key={sec.id} type="button" onClick={() => jump(sec.id)}>
                  {sec.label}
                  {sectionChanged(changes, sec.id) && <span className="secDot" aria-label="changed" />}
                </button>
              ))}
            </div>
            <SettingsForm draft={draft} saved={saved} changes={changes} update={update} />
          </div>
          <Preview s={draft} dirty={dirty} toast={showToast} mode={previewMode} setMode={setPreviewMode} />
        </div>
      </main>

      {dialog === 'review' && (
        <Dialog title="Review before saving" onClose={() => setDialog(null)}>
          <ReviewBody draft={draft} saved={saved} />
          <div className="dlgActions">
            <span className="hint">
              {invitesSentAt ? 'Applies to the live space straight away.' : 'Saving doesn’t send any invites.'}
            </span>
            <button type="button" className="btn" onClick={() => setDialog(null)}>
              Keep editing
            </button>
            <button type="button" className="btn primary" onClick={save} data-autofocus>
              Save {changes.length} change{changes.length === 1 ? '' : 's'}
            </button>
          </div>
        </Dialog>
      )}

      {dialog === 'send' && (
        <Dialog title={`Send invites to ${INVITEES.length} test knitters?`} onClose={() => setDialog(null)}>
          <SendBody s={saved} />
          <div className="dlgActions">
            <span className="hint">Emails go out immediately and can’t be recalled.</span>
            <button type="button" className="btn" onClick={() => setDialog(null)}>
              Not yet
            </button>
            <button type="button" className="btn primary" onClick={sendInvites} data-autofocus>
              <Icon name="send" size={14} /> Send {INVITEES.length} invites
            </button>
          </div>
        </Dialog>
      )}

      {toast && (
        <div className="toast" role="status" key={toast.id}>
          <span>{toast.msg}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action!.run();
                setToast(null);
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button type="button" className="toastX" aria-label="Dismiss" onClick={() => setToast(null)}>
            <Icon name="x" size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- dialogs ---------------- */

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    (ref.current?.querySelector('[data-autofocus]') as HTMLElement | null)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dlgTitle" ref={ref}>
        <div className="dlgHead">
          <h2 id="dlgTitle">{title}</h2>
          <button type="button" className="iconBtn" aria-label="Close" onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LineList({ lines }: { lines: Line[] }) {
  return (
    <ul className="lineList">
      {lines.map((l, i) => (
        <li key={i} className={`sl ${l.tone}`}>
          <Icon name={l.tone === 'ok' ? 'check' : l.tone === 'warn' ? 'alert' : 'info'} size={13} />
          <span>{l.text}</span>
        </li>
      ))}
    </ul>
  );
}

function warningsFor(s: Settings): string[] {
  const w: string[] = [];
  if (s.visibility === 'open') w.push('Every member can see and open this space, including the design photos.');
  if (s.visibility === 'locked') w.push('Regular members will see that the space exists, with a lock.');
  if (s.posting === 'all' && s.visibility === 'open') w.push('Any member can post here, not just test knitters.');
  if (!s.blockDownload || !s.blockShare) w.push('Photos of unreleased designs can still be saved or shared.');
  for (const c of welcomeConflicts(s.welcome, s, INVITEES))
    w.push(`The welcome message mentions ${c.space}, which ${c.people.length} test knitters can’t open.`);
  if (s.welcome.trim() === '') w.push('The welcome message is empty, so none will be sent.');
  return w;
}

function ReviewBody({ draft, saved }: { draft: Settings; saved: Settings }) {
  const changes = diff(saved, draft);
  const warnings = warningsFor(draft);
  const knitter = INVITEES[0];
  const guest = INVITEES[1];
  const regular = REGULARS[0];
  return (
    <div className="dlgBody">
      <table className="changeTable">
        <thead>
          <tr>
            <th scope="col">Setting</th>
            <th scope="col">Now</th>
            <th scope="col">After saving</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((c) => (
            <tr key={c.label}>
              <th scope="row">{c.label}</th>
              <td className="before">{c.before}</td>
              <td className="after">{c.after}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {warnings.length > 0 && (
        <div className="callout warn block">
          <Icon name="alert" size={15} />
          <div>
            <strong>Worth a second look</strong>
            <ul>
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="compare">
        <div>
          <div className="cmpHead">
            <Avatar name={knitter.name} hue={knitter.hue} size={22} /> {knitter.name}{' '}
            <span className="hint">test knitter, {knitter.tier} member</span>
          </div>
          <LineList lines={testKnitterLines(knitter, draft)} />
          <div className="cmpHead small">
            <Avatar name={guest.name} hue={guest.hue} size={18} /> {guest.name} <span className="hint">test knitter, guest</span>
          </div>
          <LineList lines={testKnitterLines(guest, draft).filter((l) => l.text.includes('open') || l.text.includes('Can also'))} />
        </div>
        <div>
          <div className="cmpHead">
            <Avatar name={regular.name} hue={regular.hue} size={22} /> {regular.name}{' '}
            <span className="hint">regular {regular.tier} member</span>
          </div>
          <LineList lines={regularLines(regular, draft)} />
        </div>
      </div>
    </div>
  );
}

function SendBody({ s }: { s: Settings }) {
  const warnings = warningsFor(s);
  const brand = s.sender === 'brand';
  return (
    <div className="dlgBody">
      <div className="sendFrom">
        {brand ? <OduyaMark size={38} /> : <CircleMark size={38} />}
        <div>
          <div>
            From <strong>{brand ? BRAND.displayName : COMMUNITY.name}</strong>
          </div>
          <div className="hint">
            To {INVITEES.slice(0, 3).map((p) => p.name).join(', ')} and {INVITEES.length - 3} others
          </div>
        </div>
      </div>
      <ul className="sendFacts">
        <li>Notifications: {s.notify === 'digest' ? `daily digest at ${s.digestTime}` : NOTIFY_LABEL[s.notify].toLowerCase()}</li>
        <li>
          Spoiler holds: {s.keywords.length ? s.keywords.map((k) => `“${k}”`).join(', ') : 'none'}
          {s.holdRavelryLinks ? ', plus ravelry.com links' : ''}
        </li>
        <li>
          Welcome: {s.welcome.trim() ? `“${fillWelcome(s.welcome.trim(), INVITEES[0].first)}”` : '(none)'}
          {/\{first name\}/i.test(s.welcome) && <span className="hint">As {INVITEES[0].first} will see it</span>}
        </li>
      </ul>
      {warnings.length > 0 && (
        <div className="callout warn block">
          <Icon name="alert" size={15} />
          <div>
            <strong>Before you send</strong>
            <ul>
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
