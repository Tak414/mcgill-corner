// TEMPORARY: route targets until the real screens are written in step 5. Delete this file then.
import { useAuth } from '../auth';

function Placeholder({ title }: { title: string }) {
  const { user, logout } = useAuth();
  return (
    <main className="page-center">
      <div>
        <h1>{title}</h1>
        <p className="ui-muted">Signed in as {user?.name} ({user?.role})</p>
        <button className="ui-button secondary" onClick={() => void logout()}>Log out</button>
      </div>
    </main>
  );
}

export const MapPage = () => <Placeholder title="Map" />;
export const LeaderboardPage = () => <Placeholder title="Leaderboard" />;
export const HostEventsPage = () => <Placeholder title="Host events" />;
export const CreateEventPage = () => <Placeholder title="Create event" />;
