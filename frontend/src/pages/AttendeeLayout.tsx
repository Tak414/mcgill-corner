import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomTabs, ToastStack, TopBar, UnlockCelebration } from '../components';
import type { ToastItem } from '../components';
import { useAuth } from '../auth';
import { useExchangeFeed, useMe, useZones, type ExchangeSummary } from '../hooks';
import type { AttendeeShellContext } from './attendeeContext';

const TOAST_MS = 5_000;

/**
 * Shared frame for the attendee screens (/ and /leaderboard): TopBar, BottomTabs, toasts,
 * the unlock celebration and the app-wide exchange feed, so they keep working on every tab.
 */
export function AttendeeLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const me = useMe();
  const zones = useZones();

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextToastId = useRef(0);
  const toastTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismissToast = useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = toastTimers.current.get(id);
    if (timer) clearTimeout(timer);
    toastTimers.current.delete(id);
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastItem['variant'] = 'success') => {
      const id = `t${nextToastId.current++}`;
      setToasts((list) => [...list, { id, message, variant }]);
      toastTimers.current.set(id, setTimeout(() => dismissToast(id), TOAST_MS));
    },
    [dismissToast],
  );

  useEffect(() => {
    const timers = toastTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const [celebrations, setCelebrations] = useState<Array<{ id: number; zoneId: number }>>([]);
  const nextCelebrationId = useRef(0);
  const celebrate = useCallback((zoneId: number) => {
    const id = nextCelebrationId.current++;
    setCelebrations((q) => [...q, { id, zoneId }]);
  }, []);
  const finishCelebration = useCallback(() => setCelebrations((q) => q.slice(1)), []);

  const onExchange = useCallback(
    (ex: ExchangeSummary) => {
      showToast(`You met ${ex.partner.name}! +${ex.points_gained}`);
      if (ex.unlocked_now) celebrate(ex.zone_id);
    },
    [showToast, celebrate],
  );
  useExchangeFeed(user?.role === 'attendee' ? user.id : null, onExchange);

  const shell = useMemo<AttendeeShellContext>(() => ({ showToast, celebrate }), [showToast, celebrate]);

  const unlockedCount = me.data?.zone_progress.filter((z) => z.unlocked).length ?? 0;
  const activeTab = location.pathname === '/leaderboard' ? 'leaderboard' : 'map';
  const celebrating = celebrations[0];
  const bonus = celebrating === undefined ? 0 : (zones.data?.cells.find((c) => c.id === celebrating.zoneId)?.bonus_points ?? 0);

  return (
    <div className="attendee-shell">
      <TopBar name={me.data?.name ?? user?.name ?? ''} points={me.data?.points ?? user?.points ?? 0} unlockedCount={unlockedCount} />
      <main className={`attendee-main ${activeTab === 'map' ? 'map-main' : 'scroll-main'}`}>
        <Outlet context={shell} />
      </main>
      <BottomTabs active={activeTab} onChange={(tab) => navigate(tab === 'map' ? '/' : '/leaderboard')} />
      <button className="page-logout" type="button" onClick={() => void logout()} aria-label="Log out" title="Log out">
        ⎋
      </button>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {celebrating !== undefined && (
        <UnlockCelebration key={celebrating.id} zoneId={celebrating.zoneId} bonusPoints={bonus} onDone={finishCelebration} />
      )}
    </div>
  );
}
