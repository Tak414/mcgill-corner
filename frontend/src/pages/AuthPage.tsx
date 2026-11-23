import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthForm, DemoPanel } from '../components';
import type { FieldErrors } from '../components';
import { DEMO_MODE, isApiError, messageFor } from '../api';
import { resetDemo } from '../api/demo/demoServer';
import { useAuth } from '../auth';
import { homeFor } from '../lib/home';

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [wasReset, setWasReset] = useState(false);

  async function handleSubmit(values: { name?: string; email: string; password: string; role?: 'host' | 'attendee' }, as: 'login' | 'register' = mode) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setFieldErrors({});
    try {
      const user =
        as === 'login'
          ? await login(values.email, values.password)
          : await register({ name: values.name ?? '', email: values.email, password: values.password, role: values.role ?? 'attendee' });
      navigate(homeFor(user.role), { replace: true });
    } catch (e) {
      if (isApiError(e) && e.code === 'UNAUTHENTICATED' && as === 'login') {
        // On /login a 401 means wrong credentials, not an expired session.
        setErrorMessage("That email and password don't match.");
      } else {
        setErrorMessage(messageFor(e));
        if (isApiError(e) && e.code === 'VALIDATION_FAILED') setFieldErrors(e.fields);
      }
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-center auth-page">
      {DEMO_MODE && mode === 'login' && (
        <DemoPanel
          isSubmitting={isSubmitting}
          wasReset={wasReset}
          onExplore={(as) => handleSubmit(as === 'host' ? { email: 'host1@unlock.test', password: 'host12345' } : { email: 'attendee1@unlock.test', password: 'unlock123' }, 'login')}
          onReset={() => {
            resetDemo();
            setWasReset(true);
          }}
        />
      )}
      <AuthForm
        key={mode}
        mode={mode}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        fieldErrors={fieldErrors}
        onSubmit={handleSubmit}
        onSwitchMode={() => navigate(mode === 'login' ? '/register' : '/login')}
      />
    </main>
  );
}
