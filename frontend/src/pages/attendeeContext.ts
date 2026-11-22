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
  /** Zones just unlocked whose fog stays until their reveal plays. */
  heldZoneIds: number[];
  /** The zone the map should fly to and clear now (after "Keep exploring"). */
  reveal: { zoneId: number; key: number } | null;
  onRevealStart: (zoneId: number) => void;
  onRevealEnd: (zoneId: number) => void;
  /** Show the rank-up celebration (after the leaderboard row has slid up). */
  celebrateRankUp: (rankUp: RankUp) => void;
};

export type RankUp = { rank: number; places: number; nextGoal: { name: string; points: number } | null };

/** Router state for /leaderboard when the app takes the player there to show a climb. */
export type LeaderboardLocationState = { rankUpFrom?: number } | null;

export function useAttendeeShell(): AttendeeShellContext {
  return useOutletContext<AttendeeShellContext>();
}
