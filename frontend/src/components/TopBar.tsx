import { useEffect, useRef, useState } from 'react';
import type { TopBarProps } from './types';

export function TopBar({ name, role, points, unlockedCount, onLogout }: TopBarProps) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <header className="topbar">
      <div className="topbar-brand"><span className="topbar-logo">U</span><span>UNLOCK</span></div>
      <div className="topbar-stats"><span className="topbar-zones"><span className="status-dot" />{unlockedCount} {unlockedCount === 1 ? 'zone' : 'zones'} open</span><span className="topbar-points"><span aria-hidden="true">✦</span>{points.toLocaleString()} pts</span></div>
      <div className="topbar-account" ref={menuRef}>
        <button
          type="button"
          className="topbar-avatar"
          aria-label={`${name}, account menu`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {initials}
        </button>
        {open && (
          <div className="topbar-menu ui-card" role="menu" aria-label="Account">
            <div className="topbar-menu-who">
              <strong>{name}</strong>
              <span>{role === 'host' ? 'Host' : 'Attendee'} · {points.toLocaleString()} pts</span>
            </div>
            <button type="button" role="menuitem" className="topbar-menu-logout" onClick={() => { setOpen(false); onLogout(); }}>
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
