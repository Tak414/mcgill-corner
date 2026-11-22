import { useEffect, useState } from 'react';
import { Leaderboard } from '../components';
import { messageFor } from '../api';
import { useAuth } from '../auth';
import { useLeaderboard } from '../hooks';
import { feedback } from '../lib/feedback';

/** The rank this device last showed the user, so a climb can be animated next time (display only). */
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
  const board = useLeaderboard();
  // Read once when the page opens: the rank from the previous visit.
  const [previousRank] = useState(() => readRank(user?.id));

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
  return <Leaderboard top={board.data.top} me={board.data.me} previousRank={previousRank} onRankUp={() => feedback('rankup')} />;
}
