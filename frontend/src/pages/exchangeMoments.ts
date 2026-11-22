import type { ExchangeResultProps } from '../components';

type Completed = Omit<Extract<ExchangeResultProps, { status: 'completed' }>, 'onClose' | 'bonusPoints'>;

/** One results card to show; eventId + partnerId identify the exchange. */
export type ResultMoment =
  | { id: number; eventId: number; partnerId: number; status: 'pending'; partnerName: string }
  | ({ id: number; eventId: number; partnerId: number; status: 'completed' } & Omit<Completed, 'status'>);

export type NewResultMoment = ResultMoment extends infer M ? (M extends ResultMoment ? Omit<M, 'id'> : never) : never;

/**
 * Add a results card to the queue. A completion replaces the "Waiting for …" card of the same
 * exchange (so the person who entered their code first sees "You met …" in its place);
 * a repeat of a card already queued is ignored.
 */
export function queueResult(queue: ResultMoment[], next: NewResultMoment, id: number): ResultMoment[] {
  const same = (m: ResultMoment) => m.eventId === next.eventId && m.partnerId === next.partnerId;
  const existing = queue.findIndex(same);
  const moment = { ...next, id } as ResultMoment;
  if (existing === -1) return [...queue, moment];
  if (queue[existing].status === 'completed') return queue;
  if (next.status === 'pending') return queue;
  return queue.map((m, i) => (i === existing ? moment : m));
}
