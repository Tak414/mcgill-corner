import { isApiError, type ApiErrorCode } from './client';

export const errorMessages: Record<ApiErrorCode, string> = {
  UNAUTHENTICATED: 'Please log in again.',
  FORBIDDEN_ROLE: "Your account type can't do this.",
  NOT_GOING: "Tap \"I'm going\" first.",
  NOT_FOUND: "We couldn't find that event.",
  INVALID_CODE: 'No one at this event has that code. Check the digits and try again.',
  OWN_CODE: "That's your own code — ask the other person for theirs.",
  ALREADY_EXCHANGED: 'You already met this person at this event.',
  CODE_WINDOW_CLOSED: 'Codes only work from 3 hours before the event until it ends.',
  EVENT_ENDED: 'This event has already ended.',
  CANNOT_CANCEL: "You already met someone here, so you can't cancel.",
  OUTSIDE_GRID: 'That spot is outside the map. Pick a place inside the grid.',
  VALIDATION_FAILED: 'Some fields need fixing.',
  NETWORK: "Can't reach the server. Check your connection and try again.",
  UNKNOWN: 'Something went wrong. Please try again.',
};

/** Friendly message for any thrown value. Never shows raw codes. */
export function messageFor(e: unknown): string {
  return isApiError(e) ? errorMessages[e.code] ?? errorMessages.UNKNOWN : errorMessages.UNKNOWN;
}
