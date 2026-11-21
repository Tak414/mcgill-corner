import type { TopBarProps } from './types';

export function TopBar({ name, points, unlockedCount }: TopBarProps) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');

  return (
    <header className="topbar">
      <div className="topbar-brand"><span className="topbar-logo">U</span><span>UNLOCK</span></div>
      <div className="topbar-stats"><span className="topbar-zones"><span className="status-dot" />{unlockedCount} zones open</span><span className="topbar-points"><span aria-hidden="true">✦</span>{points.toLocaleString()} pts</span></div>
      <div className="topbar-avatar" aria-label={`${name}, signed in`}>{initials}</div>
    </header>
  );
}
