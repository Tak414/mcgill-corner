import { useAuth } from '../auth';

/** Minimal host header: there is no host TopBar component, and nothing else offers logout. */
export function HostHeader({ name }: { name: string }) {
  const { logout } = useAuth();
  return (
    <header className="host-header">
      <span className="ui-muted">Signed in as <strong>{name}</strong> · host</span>
      <button className="ui-button secondary host-logout" type="button" onClick={() => void logout()}>
        Log out
      </button>
    </header>
  );
}
