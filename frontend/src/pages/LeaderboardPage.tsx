import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Leaderboard, nextGoal } from '../components';
import { messageFor } from '../api';
import { useAuth } from '../auth';
import { useLeaderboard } from '../hooks';
import { useAttendeeShell, type LeaderboardLocationState } from './attendeeContext';

/** The rank this device last showed the user, so a climb can also be animated on a normal visit (display only). */
const rankKey = (userId: number) => `unlock.lastRank.${userId}`;

function readRank(userId: number | undefined): number | null {
  if (userId === undefined) return null;
  try {
    const value = Number(localStorage.getItem(rankKey(userId)));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function LeaderboardPage() {
  const { user } = useAuth();
  const { celebrateRankUp } = useAttendeeShell();
  const location = useLocation();
  const navigate = useNavigate();
  const board = useLeaderboard();
  // Read once when the page opens: the rank before a climb the app brought us here to show,
  // or else the rank from the previous visit on this device.
  const [previousRank] = useState(() => (location.state as LeaderboardLocationState)?.rankUpFrom ?? readRank(user?.id));

  // Don't replay the climb on refresh or when coming back through history.
  useEffect(() => {
    if ((location.state as LeaderboardLocationState)?.rankUpFrom !== undefined) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const myRank = board.data?.me?.rank ?? null;
  useEffect(() => {
    if (user === null || myRank === null) return;
    try {
      localStorage.setItem(rankKey(user.id), String(myRank));
    } catch {
      // storage full or blocked: no rank-up animation next time, nothing else changes
    }
  }, [user, myRank]);

  if (!board.data) {
    return (
      <div className="page-status" role="status">
        <span className="ui-muted">{board.isError ? messageFor(board.error) : 'Loading the leaderboard…'}</span>
      </div>
    );
  }
  const { top, me } = board.data;
  return (
    <Leaderboard
      top={top}
      me={me}
      previousRank={previousRank}
      onRankUp={(places) => {
        if (me !== null) celebrateRankUp({ rank: me.rank, places, nextGoal: nextGoal(top, me) });
      }}
    />
  );
}
