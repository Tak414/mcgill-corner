import type { components } from '../api/schema';

/** Where each role lands after login, and where a wrong-role visit is sent. */
export function homeFor(role: components['schemas']['Role']): string {
  return role === 'host' ? '/host' : '/';
}
