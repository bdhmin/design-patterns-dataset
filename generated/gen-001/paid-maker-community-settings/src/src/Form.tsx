import { KeyboardEvent, ReactNode, useRef, useState } from 'react';
import { CircleMark, OduyaMark } from './art';
import { BRAND, COMMUNITY, GUEST_COUNT, INVITEES, MEMBER_INVITEE_COUNT, SPACE } from './data';
import {
  Change,
  checkHold,
  COMMUNITY_WELCOME,
  DIGEST_TIMES,
  NotifyMode,
  sectionChanged,
  SectionId,
  Settings,
  welcomeConflicts,
} from './logic';
import { Avatar, Choice, Icon, Toggle } from './ui';

interface Props {
  draft: Settings;
  saved: Settings;
  changes: Change[];
  update: (patch: Partial<Settings>) => void;
}

function Section({
  id,
  title,
  lede,
  changed,
  children,
}: {
  id: SectionId;
  title: string;
  lede?: ReactNode;
  changed: boolean;
  children: ReactNode;
}) {
  return (
    <section className="card" id={`sec-${id}`} aria-labelledby={`h-${id}`}>
      <header className="cardHead">
        <h2 id={`h-${id}`}>{title}</h2>
        {changed && <span className="changedTag">Changed</span>}
      </header>
      {lede && <p className="lede">{lede}</p>}
      {children}
    </section>
  );
}

export function SettingsForm({ draft, saved, changes, update }: Props) {
  const [showRoster, setShowRoster] = useState(false);
  const [kwInput, setKwInput] = useState('');
  const [kwError, setKwError] = useState('');
  const [testText, setTestText] = useState('');
  const welcomeRef = useRef<HTMLTextAreaElement>(null);

  const addKeyword = (raw: string) => {
    const k = raw.trim().replace(/^["“']|["”']$/g, '').trim();
    if (!k) return;
    if (draft.keywords.some((w) => w.toLowerCase() === k.toLowerCase())) {
      setKwError(`“${k}” is already on the list.`);
      return;
    }
    if (k.length > 40) {
      setKwError('Keep each word or phrase under 40 characters.');
      return;
    }
    update({ keywords: [...draft.keywords, k] });
    setKwInput('');
    setKwError('');
  };

  const onKwKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addKeyword(kwInput);
    } else if (e.key === 'Backspace' && !kwInput && draft.keywords.length) {
      update({ keywords: draft.keywords.slice(0, -1) });
    }
  };

  const insertFirstName = () => {
    const el = welcomeRef.current;
    const token = '{first name}';
    if (!el) return update({ welcome: draft.welcome + token });
    const start = el.selectionStart ?? draft.welcome.length;
    const end = el.selectionEnd ?? draft.welcome.length;
    const next = draft.welcome.slice(0, start) + token + draft.welcome.slice(end);
    update({ welcome: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const conflicts = welcomeConflicts(draft.welcome, draft, INVITEES);
  const welcomeIsDefault = draft.welcome.trim() === COMMUNITY_WELCOME;
  const test = checkHold(testText, draft);
  const holdsOn = draft.keywords.length > 0 || draft.holdRavelryLinks;

  return (
    <div className="formCol">
      {/* ---------------- Access ---------------- */}
      <Section
        id="access"
        title="Who can see it"
        changed={sectionChanged(changes, 'access')}
        lede="Decide whether members outside the invite list can find this space."
      >
        <div className="choices" role="radiogroup" aria-label="Who can see it">
          <Choice
            name="visibility"
            value="open"
            current={draft.visibility}
            wasValue={saved.visibility}
            onChange={(v) => update({ visibility: v })}
            icon="eye"
            title="Visible to all members"
            description="Shows in everyone’s space list. Any member can open it and read along."
          />
          <Choice
            name="visibility"
            value="locked"
            current={draft.visibility}
            wasValue={saved.visibility}
            onChange={(v) => update({ visibility: v })}
            icon="lock"
            title="Listed, but locked"
            description="Members see the name with a lock and can ask to join. They’ll know it exists."
          />
          <Choice
            name="visibility"
            value="hidden"
            current={draft.visibility}
            wasValue={saved.visibility}
            onChange={(v) => update({ visibility: v })}
            icon="eyeOff"
            title="Hidden from everyone but invitees"
            description="Not listed, not in search, and test knitters’ posts here stay off their profiles. A forwarded link shows “Page not found”."
          />
        </div>

        <div className="subBlock">
          <div className="rosterHead">
            <div>
              <div className="subTitle">Invited test knitters</div>
              <div className="hint">
                {INVITEES.length} invited · {MEMBER_INVITEE_COUNT} are members, {GUEST_COUNT} are guests who don’t
                subscribe
              </div>
            </div>
            <div className="avatarStack" aria-hidden="true">
              {INVITEES.slice(0, 6).map((p) => (
                <Avatar key={p.id} name={p.name} hue={p.hue} size={26} />
              ))}
              <span className="avatar more">+{INVITEES.length - 6}</span>
            </div>
            <button
              type="button"
              className="btn ghost small"
              aria-expanded={showRoster}
              aria-controls="roster"
              onClick={() => setShowRoster((s) => !s)}
            >
              {showRoster ? 'Hide list' : 'Show list'}
              <Icon name={showRoster ? 'chevronDown' : 'chevron'} size={14} />
            </button>
          </div>
          {showRoster && (
            <ul className="roster" id="roster">
              {INVITEES.map((p) => (
                <li key={p.id}>
                  <Avatar name={p.name} hue={p.hue} size={24} />
                  <span className="rName">{p.name}</span>
                  <span className="rPlace">{p.place}</span>
                  <span className={`pill ${p.kind === 'guest' ? 'guest' : ''}`}>
                    {p.kind === 'guest' ? 'Guest' : p.tier}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="subBlock">
          <div className="subTitle">What an invite lets them reach</div>
          <div className="hint" style={{ marginBottom: 10 }}>
            Members keep the spaces their tier already includes. This mostly matters for the {GUEST_COUNT} guests.
          </div>
          <div className="choices" role="radiogroup" aria-label="What an invite lets them reach">
            <Choice
              name="reach"
              value="space"
              current={draft.reach}
              wasValue={saved.reach}
              onChange={(v) => update({ reach: v })}
              title="Only this space’s threads"
              description="Guests can open this space and nothing else. The invite adds no other access for members."
            />
            <Choice
              name="reach"
              value="basics"
              current={draft.reach}
              wasValue={saved.reach}
              onChange={(v) => update({ reach: v })}
              title="This space, plus Announcements and General Chat"
              description="The usual invite access. Guests can read and post in both, free."
            />
          </div>
        </div>
      </Section>

      {/* ---------------- Posting ---------------- */}
      <Section
        id="posting"
        title="Posting"
        changed={sectionChanged(changes, 'posting')}
        lede="Who can start threads and reply in this space."
      >
        <div className="choices" role="radiogroup" aria-label="Who can post">
          <Choice
            name="posting"
            value="all"
            current={draft.posting}
            wasValue={saved.posting}
            onChange={(v) => update({ posting: v })}
            title="All members"
            description="Anyone who can open the space can post."
          />
          <Choice
            name="posting"
            value="invitees"
            current={draft.posting}
            wasValue={saved.posting}
            onChange={(v) => update({ posting: v })}
            title="Invited test knitters only"
            description="Only the 18 people on the invite list, plus you."
          />
          <Choice
            name="posting"
            value="owner"
            current={draft.posting}
            wasValue={saved.posting}
            onChange={(v) => update({ posting: v })}
            title="Only you"
            description="Others can read and react, like Announcements."
          />
        </div>
      </Section>

      {/* ---------------- Photos ---------------- */}
      <Section
        id="photos"
        title="Photo protection"
        changed={sectionChanged(changes, 'photos')}
        lede="For photos of unreleased designs posted in this space."
      >
        <div className="toggles">
          <Toggle
            checked={draft.blockDownload}
            onChange={(v) => update({ blockDownload: v })}
            label="Block saving photos"
            description="Removes the download button and turns off right-click “Save image”."
          />
          <Toggle
            checked={draft.blockShare}
            onChange={(v) => update({ blockShare: v })}
            label="Block sharing photos"
            description="Removes “Copy link” and “Share”. Photo links only open for invitees."
          />
          <Toggle
            checked={draft.watermark}
            onChange={(v) => update({ watermark: v })}
            label="Add the viewer’s name across photos"
            description="A faint watermark with each knitter’s own name, so a screenshot shows who took it."
          />
        </div>
        <p className="note">
          <Icon name="info" size={14} />
          No website can stop screenshots. The name watermark is the best way to discourage them.
        </p>
      </Section>

      {/* ---------------- Notifications ---------------- */}
      <Section
        id="notify"
        title="Notifications for test knitters"
        changed={sectionChanged(changes, 'notify')}
        lede="How invitees hear about new posts in this space. Their settings for other spaces stay as they are."
      >
        <div className="segmented" role="radiogroup" aria-label="Notification frequency">
          {(
            [
              ['instant', 'Instant alerts'],
              ['digest', 'Daily digest'],
              ['weekly', 'Weekly digest'],
              ['off', 'Off'],
            ] as [NotifyMode, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={draft.notify === v}
              className={draft.notify === v ? 'active' : ''}
              onClick={() => update({ notify: v })}
            >
              {label}
              {saved.notify === v && draft.notify !== v && <span className="wasDot" title="Current setting" />}
            </button>
          ))}
        </div>
        {draft.notify === 'digest' && (
          <div className="inlineField">
            <label htmlFor="digestTime">Send the digest at</label>
            <select
              id="digestTime"
              value={draft.digestTime}
              onChange={(e) => update({ digestTime: e.target.value })}
            >
              {DIGEST_TIMES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <span className="hint">in each knitter’s own time zone. Skipped on days with no new posts.</span>
          </div>
        )}
        {draft.notify === 'weekly' && (
          <p className="hint" style={{ marginTop: 10 }}>
            Sent Monday mornings. Four or five digests over the test window.
          </p>
        )}
        <div className="toggles" style={{ marginTop: 12 }}>
          <Toggle
            checked={draft.memberCanChange}
            onChange={(v) => update({ memberCanChange: v })}
            label="Let test knitters change this for themselves"
            description="They can pick something different in their own notification settings."
          />
        </div>
      </Section>

      {/* ---------------- Invite email ---------------- */}
      <Section
        id="invite"
        title="Invite email"
        changed={sectionChanged(changes, 'invite')}
        lede="The name and logo invitees see at the top of their invite and in their inbox."
      >
        <div className="choices two" role="radiogroup" aria-label="Invite emails come from">
          <label className={`brandChoice ${draft.sender === 'community' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="sender"
              checked={draft.sender === 'community'}
              onChange={() => update({ sender: 'community' })}
            />
            <span className="radioDot" aria-hidden="true" />
            <span className="brandSample">
              <CircleMark size={34} />
              <span>
                <span className="choiceTitle">
                  {COMMUNITY.name}
                  {saved.sender === 'community' && draft.sender !== 'community' && (
                    <span className="wasTag">current</span>
                  )}
                </span>
                <span className="hint">Community name and default mark</span>
              </span>
            </span>
          </label>
          <label className={`brandChoice ${draft.sender === 'brand' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="sender"
              checked={draft.sender === 'brand'}
              onChange={() => update({ sender: 'brand' })}
            />
            <span className="radioDot" aria-hidden="true" />
            <span className="brandSample">
              <OduyaMark size={34} />
              <span>
                <span className="choiceTitle">{BRAND.displayName}</span>
                <span className="hint">Your brand · {BRAND.logoFile}</span>
              </span>
            </span>
          </label>
        </div>
        <p className="hint" style={{ marginTop: 10 }}>
          Uses the display name and logo saved in Brand. Applies to invites for {SPACE.name} only.
        </p>
      </Section>

      {/* ---------------- Welcome ---------------- */}
      <Section
        id="welcome"
        title="Welcome message"
        changed={sectionChanged(changes, 'welcome')}
        lede="Sent from you automatically when a test knitter accepts their invite."
      >
        <div className="welcomeMeta">
          <span className={`pill ${welcomeIsDefault ? '' : 'accent'}`}>
            {welcomeIsDefault ? 'Using the community message' : 'Custom for this space'}
          </span>
          <span className="spacer" />
          <button type="button" className="btn ghost small" onClick={insertFirstName}>
            <Icon name="plus" size={13} /> Insert first name
          </button>
          <button
            type="button"
            className="btn ghost small"
            disabled={welcomeIsDefault}
            onClick={() => update({ welcome: COMMUNITY_WELCOME })}
          >
            <Icon name="undo" size={13} /> Use community message
          </button>
        </div>
        <label htmlFor="welcome" className="srOnly">
          Welcome message
        </label>
        <textarea
          id="welcome"
          ref={welcomeRef}
          rows={4}
          maxLength={600}
          value={draft.welcome}
          onChange={(e) => update({ welcome: e.target.value })}
        />
        <div className="fieldFoot">
          <span className="hint">{'{first name}'} is replaced with each knitter’s first name.</span>
          <span className="hint">{draft.welcome.length}/600</span>
        </div>
        {draft.welcome.trim().length === 0 && (
          <div className="callout warn">
            <Icon name="alert" size={15} />
            <span>An empty message won’t be sent. Test knitters will get no welcome.</span>
          </div>
        )}
        {conflicts.map((c) => (
          <div className="callout warn" key={c.space}>
            <Icon name="alert" size={15} />
            <span>
              This mentions <strong>{c.space}</strong>, which {c.people.length} of your test knitters can’t open (
              {c.people.map((p) => p.first).join(', ')}).
            </span>
          </div>
        ))}
      </Section>

      {/* ---------------- Holds ---------------- */}
      <Section
        id="holds"
        title="Spoiler holds"
        changed={sectionChanged(changes, 'holds')}
        lede="Posts and replies containing these words go to you for approval before anyone else sees them."
      >
        <div className="chipInput" onClick={(e) => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}>
          {draft.keywords.map((k) => (
            <span className="chip" key={k}>
              {k}
              <button
                type="button"
                aria-label={`Remove ${k}`}
                onClick={() => update({ keywords: draft.keywords.filter((w) => w !== k) })}
              >
                <Icon name="x" size={12} />
              </button>
            </span>
          ))}
          <input
            aria-label="Add a word or phrase to hold"
            value={kwInput}
            placeholder={draft.keywords.length ? 'Add another…' : 'Type a word or phrase, then press Enter'}
            onChange={(e) => {
              setKwInput(e.target.value);
              setKwError('');
            }}
            onKeyDown={onKwKey}
            onBlur={() => kwInput.trim() && addKeyword(kwInput)}
          />
        </div>
        <div className="fieldFoot">
          <span className={`hint ${kwError ? 'errorText' : ''}`} role={kwError ? 'alert' : undefined}>
            {kwError || 'Capital letters don’t matter, and word endings count: “leak” also catches “leaked”.'}
          </span>
        </div>
        <div className="toggles" style={{ marginTop: 6 }}>
          <Toggle
            checked={draft.holdRavelryLinks}
            onChange={(v) => update({ holdRavelryLinks: v })}
            label="Also hold any link to ravelry.com"
            description="Catches pasted links even when nobody types the word “Ravelry”."
          />
        </div>
        <div className="routeRow">
          <Icon name="inbox" size={15} />
          <span>
            Held posts go to <strong>your Approvals queue</strong>, and you get an alert for each one. The writer sees
            “Waiting for Maren’s approval”.
          </span>
        </div>

        <div className="tester">
          <label htmlFor="tester" className="subTitle">
            Try a sample post
          </label>
          <input
            id="tester"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="e.g. Anyone have the pattern PDF for Fenwick yet?"
          />
          {testText.trim() && (
            <div className={`testResult ${test.held ? 'held' : 'clear'}`} aria-live="polite">
              <Icon name={test.held ? 'shield' : 'check'} size={15} />
              {test.held ? (
                <span>Held for your approval: matches {test.reasons.join(', ')}</span>
              ) : holdsOn ? (
                <span>Would post straight away. No held words found.</span>
              ) : (
                <span>Would post straight away. No holds are switched on yet.</span>
              )}
            </div>
          )}
        </div>
      </Section>
      <div className="formEnd">
        Settings apply to {SPACE.name} only. The rest of {COMMUNITY.name} is unchanged.
      </div>
    </div>
  );
}
