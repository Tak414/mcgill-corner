import { useOutletContext } from 'react-router-dom';
import type { ToastItem } from '../components';

export type AttendeeShellContext = {
  showToast: (message: string, variant?: ToastItem['variant']) => void;
  /** Queue the UnlockCelebration for a zone. */
  celebrate: (zoneId: number) => void;
};

export function useAttendeeShell(): AttendeeShellContext {
  return useOutletContext<AttendeeShellContext>();
}
