export const queryKeys = {
  zones: ['zones'] as const,
  events: ['events'] as const,
  me: ['me'] as const,
  event: (id: number) => ['event', id] as const,
  leaderboard: ['leaderboard'] as const,
  hostEvents: ['hostEvents'] as const,
};
