import { useOutletContext } from 'react-router-dom';
import type { ToastItem } from '../components';
import type { NewResultMoment } from './exchangeMoments';

export type AttendeeShellContext = {
  showToast: (message: string, variant?: ToastItem['variant']) => void;
  /**
   * Show an exchange results card ("Waiting for …" or "You met …"). Cards are queued; a zone
   * unlock celebration follows its card once the card is closed.
   */
  showResult: (moment: NewResultMoment) => void;
};

export function useAttendeeShell(): AttendeeShellContext {
  return useOutletContext<AttendeeShellContext>();
}
