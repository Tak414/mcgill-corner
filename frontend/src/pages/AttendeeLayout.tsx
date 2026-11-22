import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomTabs, ExchangeResult, ToastStack, TopBar, UnlockCelebration } from '../components';
import type { ToastItem } from '../components';
import { useAuth } from '../auth';
import { useExchangeFeed, useFetchMeNow, useMe, useZones, type ExchangeSummary } from '../hooks';
import { zoneShortName } from '../components';
import { feedback, primeFeedback } from '../lib/feedback';
import type { AttendeeShellContext } from './attendeeContext';
import { queueResult, type NewResultMoment, type ResultMoment } from './exchangeMoments';

const TOAST_MS = 5_000;

/**
 * Shared frame for the attendee screens (/ and /leaderboard): TopBar, BottomTabs, toasts,
 * exchange results cards, the unlock celebration and the app-wide exchange feed, so they keep
 * working on every tab. Results cards and celebrations share one order: a card first, then
 * (after "Lovely, thanks") its zone's celebration, which stays until "Keep exploring".
 */
export function AttendeeLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const me = useMe();
  const zones = useZones();
  const fetchMeNow = useFetchMeNow();

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

  // Browsers only allow sound after a tap: unlock audio on any tap or key press.
  useEffect(() => {
    window.addEventListener('pointerdown', primeFeedback, { passive: true });
    window.addEventListener('keydown', primeFeedback);
    return () => {
      window.removeEventListener('pointerdown', primeFeedback);
      window.removeEventListener('keydown', primeFeedback);
    };
  }, []);

  // ---- results cards, then celebrations ----
  const nextMomentId = useRef(0);
  const [results, setResults] = useState<ResultMoment[]>([]);
  const [celebrations, setCelebrations] = useState<Array<{ id: number; zoneId: number }>>([]);
  // A zone that just opened keeps its fog until the player has seen the card and the celebration;
  // then the map flies there and clears it (reveal).
  const [heldZoneIds, setHeldZoneIds] = useState<number[]>([]);
  const [reveal, setReveal] = useState<{ zoneId: number; key: number } | null>(null);
  const holdFog = useCallback((zoneId: number) => setHeldZoneIds((ids) => (ids.includes(zoneId) ? ids : [...ids, zoneId])), []);

  const showResult = useCallback(
    (moment: NewResultMoment) => {
      if (moment.status === 'completed' && moment.zone.unlocked_now) holdFog(moment.zone.zone_id);
      const id = nextMomentId.current++;
      setResults((queue) => queueResult(queue, moment, id));
    },
    [holdFog],
  );

  const closeResult = useCallback(() => {
    const first = results[0];
    if (first?.status === 'completed' && first.zone.unlocked_now) {
      const id = nextMomentId.current++;
      setCelebrations((q) => [...q, { id, zoneId: first.zone.zone_id }]);
    }
    setResults((queue) => queue.slice(1));
  }, [results]);
  const finishCelebration = useCallback(() => {
    const done = celebrations[0];
    setCelebrations((q) => q.slice(1));
    if (done === undefined) return;
    setReveal({ zoneId: done.zoneId, key: nextMomentId.current++ });
    if (location.pathname !== '/') navigate('/');
  }, [celebrations, location.pathname, navigate]);

  const onRevealStart = useCallback(() => feedback('reveal'), []);
  const onRevealEnd = useCallback(
    (zoneId: number) => {
      setHeldZoneIds((ids) => ids.filter((id) => id !== zoneId));
      setReveal((current) => (current?.zoneId === zoneId ? null : current));
      feedback('open');
      const open = (me.data?.zone_progress.filter((z) => z.unlocked).length ?? 0) || 1;
      showToast(`${zoneShortName(zoneId)} is open · ${open} ${open === 1 ? 'zone' : 'zones'} explored. Where next?`);
    },
    [me.data, showToast],
  );
  // Safety net: never leave a zone's fog held if the map could not play the reveal.
  useEffect(() => {
    if (reveal === null) return;
    const zoneId = reveal.zoneId;
    const timer = setTimeout(() => {
      setHeldZoneIds((ids) => ids.filter((id) => id !== zoneId));
      setReveal((current) => (current?.zoneId === zoneId ? null : current));
    }, 12_000);
    return () => clearTimeout(timer);
  }, [reveal]);

  // The partner completed an exchange we started: same "You met …" card as theirs.
  const onExchange = useCallback(
    (ex: ExchangeSummary) => {
      if (ex.unlocked_now) holdFog(ex.zone_id);
      fetchMeNow().then(
        (fresh) => {
          const progress = fresh.zone_progress.find((z) => z.zone_id === ex.zone_id);
          showResult({
            eventId: ex.event.id,
            partnerId: ex.partner.id,
            status: 'completed',
            partnerName: ex.partner.name,
            pointsGained: ex.points_gained,
            zone: {
              zone_id: ex.zone_id,
              exchange_count: progress?.exchange_count ?? 1,
              required_count: progress?.required_count ?? 1,
              unlocked: progress?.unlocked ?? ex.unlocked_now,
              unlocked_now: ex.unlocked_now,
            },
            totalPoints: fresh.points,
          });
        },
        // Couldn't load the details: still say it happened.
        () => showToast(`You met ${ex.partner.name}! +${ex.points_gained}`),
      );
    },
    [fetchMeNow, holdFog, showResult, showToast],
  );
  useExchangeFeed(user?.role === 'attendee' ? user.id : null, onExchange);

  const result = results[0];
  // A celebration only shows once no results card is waiting, so nothing ends up hidden behind it.
  const celebrating = result === undefined ? celebrations[0] : undefined;

  // Sound + vibration once per card / celebration as it appears.
  const resultKey = result ? `${result.id}:${result.status}` : null;
  useEffect(() => {
    if (!resultKey) return;
    feedback(resultKey.endsWith('completed') ? 'meet' : 'pending');
  }, [resultKey]);
  const celebrationId = celebrating?.id ?? null;
  useEffect(() => {
    if (celebrationId !== null) feedback('unlock');
  }, [celebrationId]);

  async function handleLogout() {
    await logout(); // POST /logout, clear token + query cache
    navigate('/login', { replace: true });
  }

  const shell = useMemo<AttendeeShellContext>(
    () => ({ showToast, showResult, heldZoneIds, reveal, onRevealStart, onRevealEnd }),
    [showToast, showResult, heldZoneIds, reveal, onRevealStart, onRevealEnd],
  );

  const unlockedCount = me.data?.zone_progress.filter((z) => z.unlocked).length ?? 0;
  const activeTab = location.pathname === '/leaderboard' ? 'leaderboard' : 'map';
  const bonusFor = (zoneId: number) => zones.data?.cells.find((c) => c.id === zoneId)?.bonus_points ?? 0;

  return (
    <div className="attendee-shell">
      <TopBar
        name={me.data?.name ?? user?.name ?? ''}
        role={user?.role ?? 'attendee'}
        points={me.data?.points ?? user?.points ?? 0}
        unlockedCount={unlockedCount}
        onLogout={handleLogout}
      />
      <main className={`attendee-main ${activeTab === 'map' ? 'map-main' : 'scroll-main'}`}>
        <Outlet context={shell} />
      </main>
      <BottomTabs active={activeTab} onChange={(tab) => navigate(tab === 'map' ? '/' : '/leaderboard')} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {result !== undefined &&
        (result.status === 'pending' ? (
          <ExchangeResult key={result.id} status="pending" partnerName={result.partnerName} onClose={closeResult} />
        ) : (
          <ExchangeResult
            key={result.id}
            status="completed"
            partnerName={result.partnerName}
            pointsGained={result.pointsGained}
            bonusPoints={result.zone.unlocked_now ? Math.min(bonusFor(result.zone.zone_id), result.pointsGained) : 0}
            zone={result.zone}
            totalPoints={result.totalPoints}
            onClose={closeResult}
          />
        ))}
      {celebrating !== undefined && (
        <UnlockCelebration key={celebrating.id} zoneId={celebrating.zoneId} bonusPoints={bonusFor(celebrating.zoneId)} onDone={finishCelebration} />
      )}
    </div>
  );
}
