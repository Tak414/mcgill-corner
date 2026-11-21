import { useState, type FormEvent } from 'react';
import type { AuthFormProps, Role } from './types';

export function AuthForm({ mode, isSubmitting, errorMessage, fieldErrors, onSubmit, onSwitchMode }: AuthFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('attendee');
  const registering = mode === 'register';

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ ...(registering ? { name, role } : {}), email, password });
  }

  return (
    <section className="auth-card ui-card" aria-labelledby="auth-title">
      <div className="auth-mark" aria-hidden="true"><span>U</span></div>
      <p className="ui-kicker">McGill community, closer</p>
      <h1 id="auth-title">{registering ? 'Find your people.' : 'Good to see you.'}</h1>
      <p className="auth-intro">{registering ? 'A little hello can open up the whole city.' : 'Pick up where your next connection begins.'}</p>
      <form className="auth-fields" onSubmit={submit}>
        {registering && <label><span className="ui-label">Your name</span><input className="ui-field" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required />{fieldErrors.name?.map((message) => <span className="ui-error" key={message}>{message}</span>)}</label>}
        <label><span className="ui-label">Email</span><input className="ui-field" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />{fieldErrors.email?.map((message) => <span className="ui-error" key={message}>{message}</span>)}</label>
        <label><span className="ui-label">Password</span><input className="ui-field" type="password" autoComplete={registering ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required />{fieldErrors.password?.map((message) => <span className="ui-error" key={message}>{message}</span>)}</label>
        {registering && <fieldset className="auth-role"><legend className="ui-label">I’m here as</legend><label className={`auth-role-option ${role === 'attendee' ? 'active' : ''}`}><input type="radio" name="role" value="attendee" checked={role === 'attendee'} onChange={() => setRole('attendee')} /><span><strong>Attendee</strong><small>Meet people at local events</small></span></label><label className={`auth-role-option ${role === 'host' ? 'active' : ''}`}><input type="radio" name="role" value="host" checked={role === 'host'} onChange={() => setRole('host')} /><span><strong>Host</strong><small>Bring your community together</small></span></label>{fieldErrors.role?.map((message) => <span className="ui-error" key={message}>{message}</span>)}</fieldset>}
        {errorMessage && <p className="auth-error" role="alert">{errorMessage}</p>}
        <button className="ui-button auth-submit" disabled={isSubmitting} type="submit">{isSubmitting ? <><span className="button-spinner" /> {registering ? 'Creating your account' : 'Signing you in'}</> : registering ? 'Create account' : 'Sign in'}<span aria-hidden="true">→</span></button>
      </form>
      <p className="auth-switch">{registering ? 'Already have an account?' : 'New around here?'} <button type="button" onClick={onSwitchMode}>{registering ? 'Sign in' : 'Create an account'}</button></p>
    </section>
  );
}
