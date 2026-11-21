import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { isApiError } from './api';
import { AuthProvider } from './auth';
import { AuthPage } from './pages/AuthPage';
import { RequireLoggedOut, RequireRole } from './pages/guards';
import { CreateEventPage, HostEventsPage, LeaderboardPage, MapPage } from './pages/_placeholders';
import './pages/pages.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 4xx answers are final (the server decided); only retry network/5xx, briefly.
      retry: (count, error) => !(isApiError(error) && error.status >= 400 && error.status < 500) && count < 2,
    },
    mutations: { retry: false },
  },
});

// Dev only: not included in production builds.
const Gallery = import.meta.env.DEV
  ? lazy(() => import('./gallery/Gallery').then((m) => ({ default: m.Gallery })))
  : null;

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<RequireLoggedOut><AuthPage mode="login" /></RequireLoggedOut>} />
            <Route path="/register" element={<RequireLoggedOut><AuthPage mode="register" /></RequireLoggedOut>} />
            <Route path="/" element={<RequireRole role="attendee"><MapPage /></RequireRole>} />
            <Route path="/leaderboard" element={<RequireRole role="attendee"><LeaderboardPage /></RequireRole>} />
            <Route path="/host" element={<RequireRole role="host"><HostEventsPage /></RequireRole>} />
            <Route path="/host/new" element={<RequireRole role="host"><CreateEventPage /></RequireRole>} />
            {Gallery && <Route path="/gallery" element={<Suspense fallback={null}><Gallery /></Suspense>} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
