import { beforeEach, describe, expect, it } from 'vitest';
import { clearOwnExchanges, consumeOwnExchange, rememberOwnExchange } from './recentOwnExchanges';

describe('recentOwnExchanges', () => {
  beforeEach(() => clearOwnExchanges());

  it('skips a feed item our own request just completed, once', () => {
    rememberOwnExchange(12, 7, 1_000);
    expect(consumeOwnExchange(12, 7, 2_000)).toBe(true);
    expect(consumeOwnExchange(12, 7, 2_000)).toBe(false);
  });

  it('does not match a different event or partner', () => {
    rememberOwnExchange(12, 7, 1_000);
    expect(consumeOwnExchange(13, 7, 2_000)).toBe(false);
    expect(consumeOwnExchange(12, 8, 2_000)).toBe(false);
  });

  it('expires after 60 s', () => {
    rememberOwnExchange(12, 7, 0);
    expect(consumeOwnExchange(12, 7, 60_001)).toBe(false);
  });
});
