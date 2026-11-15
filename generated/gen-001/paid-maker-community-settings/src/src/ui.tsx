import { ReactNode, useId } from 'react';
import { initials } from './data';

const PATHS: Record<string, ReactNode> = {
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 8.5 4.5 9.5 6-.5.8-1.6 2.2-3.1 3.5M6.4 7.5C4.6 8.8 3.3 10.6 2.5 12c1 1.5 4.5 6 9.5 6 1.5 0 2.9-.4 4.1-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12c1-1.5 4.5-6 9.5-6s8.5 4.5 9.5 6c-1 1.5-4.5 6-9.5 6s-8.5-4.5-9.5-6z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  alert: (
    <>
      <path d="M12 3.5l9.5 16.5h-19z" />
      <path d="M12 10v4.5M12 17.5v.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5v.01" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M20.5 16l-5-5-8.5 8.5" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </>
  ),
  chat: <path d="M4 5.5h16v10H10l-4.5 3.5v-3.5H4z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  share: (
    <>
      <path d="M12 15V4M8 7.5L12 3.5l4 4" />
      <path d="M6 11v8.5h12V11" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5" />
      <path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.3c1.8.6 3 2.2 3.5 4.7" />
    </>
  ),
  home: <path d="M4 11l8-6.5 8 6.5V20h-5.5v-5h-5v5H4z" />,
  layers: (
    <>
      <path d="M12 4l9 4.5-9 4.5-9-4.5z" />
      <path d="M3 13l9 4.5 9-4.5" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 12.5V4h8.5l8.5 8.5-8.5 8.5z" />
      <circle cx="8" cy="8.5" r="1.4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5l7.5 3v5.5c0 4.5-3.2 7.6-7.5 9-4.3-1.4-7.5-4.5-7.5-9V6.5z" />
      <path d="M8.8 12.2l2.3 2.3 4.2-4.4" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 1.8-.9 1.5-2-.4-1.4.4-2.5 1.8-2.5H18a2.5 2.5 0 0 0 2.5-2.5c0-5.5-3.8-10-8.5-10z" />
      <circle cx="7.8" cy="11" r="1.1" />
      <circle cx="10.5" cy="7.3" r="1.1" />
      <circle cx="15" cy="7.8" r="1.1" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.5 13.5l2.5-8h12l2.5 8V19h-17z" />
      <path d="M3.5 13.5h5l1 2.5h5l1-2.5h5" />
    </>
  ),
  send: <path d="M20.5 3.5L3.5 10.5l6.5 3 3 6.5zM10 13.5l4.5-4.5" />,
  undo: (
    <>
      <path d="M8 8.5H15a5 5 0 0 1 0 10h-4" />
      <path d="M11 5L7.5 8.5 11 12" />
    </>
  ),
  pin: <path d="M14.5 3.5l6 6-3 1.5-3.5 3.5.5 4-2 2-4-4-4.5 4.5M9.5 14.5l-4-4 2-2 4 .5L15 5.5z" />,
};

export function Icon({ name, size = 16, className }: { name: keyof typeof PATHS | string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}

export function Avatar({ name, hue, size = 28 }: { name: string; hue: number; size?: number }) {
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: `hsl(${hue} 32% 86%)`,
        color: `hsl(${hue} 40% 28%)`,
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="toggleRow">
      <div className="toggleText">
        <label htmlFor={id} className="toggleLabel">
          {label}
        </label>
        {description && <div className="hint">{description}</div>}
        {children}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={`switch ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="knob" />
      </button>
    </div>
  );
}

export function Choice<T extends string>({
  name,
  value,
  current,
  onChange,
  title,
  description,
  icon,
  badge,
  wasValue,
}: {
  name: string;
  value: T;
  current: T;
  onChange: (v: T) => void;
  title: string;
  description?: ReactNode;
  icon?: string;
  badge?: string;
  wasValue?: T;
}) {
  const selected = value === current;
  return (
    <label className={`choice ${selected ? 'selected' : ''}`}>
      <input type="radio" name={name} value={value} checked={selected} onChange={() => onChange(value)} />
      <span className="radioDot" aria-hidden="true" />
      {icon && (
        <span className="choiceIcon">
          <Icon name={icon} size={18} />
        </span>
      )}
      <span className="choiceBody">
        <span className="choiceTitle">
          {title}
          {badge && <span className="miniBadge">{badge}</span>}
          {wasValue === value && !selected && <span className="wasTag">current</span>}
        </span>
        {description && <span className="hint">{description}</span>}
      </span>
    </label>
  );
}
