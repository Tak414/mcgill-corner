import { Leaderboard } from '../components';
import { messageFor } from '../api';
import { useLeaderboard } from '../hooks';

export function LeaderboardPage() {
  const board = useLeaderboard();

  if (!board.data) {
    return (
      <div className="page-status" role="status">
        <span className="ui-muted">{board.isError ? messageFor(board.error) : 'Loading the leaderboard…'}</span>
      </div>
    );
  }
  return <Leaderboard top={board.data.top} me={board.data.me} />;
}
