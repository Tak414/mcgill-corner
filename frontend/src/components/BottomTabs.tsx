import type { BottomTabsProps } from './types';

export function BottomTabs({ active, onChange }: BottomTabsProps) {
  return (
    <nav className="bottom-tabs" aria-label="Main navigation">
      <button type="button" className={active === 'map' ? 'active' : ''} aria-current={active === 'map' ? 'page' : undefined} onClick={() => onChange('map')}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15m6-12v15" /></svg><span>Map</span>
      </button>
      <button type="button" className={active === 'leaderboard' ? 'active' : ''} aria-current={active === 'leaderboard' ? 'page' : undefined} onClick={() => onChange('leaderboard')}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21h8m-4-4v4m-6-17h12v5a6 6 0 0 1-12 0V4Z" /><path d="M6 6H3v2a5 5 0 0 0 4 5m11-7h3v2a5 5 0 0 1-4 5" /></svg><span>Leaderboard</span>
      </button>
    </nav>
  );
}
