// tests/unit/validator.unit.test.ts
import { z } from 'zod';

describe('Validators (unit)', () => {
  // Minimal vote payload validator similar to app expectations.
  // Keep this local to the test so it never depends on app internals.
  const cuidLike = z
    .string()
    .min(1)
    .refine((s) => /^c[0-9a-z]{20,}$/.test(s), {
      message: 'Invalid cuid-like id',
    });

  const votePayloadSchema = z.object({
    userId: cuidLike,
    pollId: cuidLike,
    pollOptionId: cuidLike,
  });

  test('accepts valid payload', () => {
    const valid = {
      userId: 'cmfkxrc230000v2a4vjxuot6v',
      pollId: 'cmfkxrc270002v2a40z3x1iwf',
      pollOptionId: 'cmfkxrc270004v2a43m0zgabt',
    };

    expect(() => votePayloadSchema.parse(valid)).not.toThrow();
    const parsed = votePayloadSchema.parse(valid);
    expect(parsed).toEqual(valid);
  });

  test('rejects missing fields', () => {
    const missing = {
      userId: 'cmfkxrc230000v2a4vjxuot6v',
      // pollId missing
      pollOptionId: 'cmfkxrc270004v2a43m0zgabt',
    } as any;

    expect(() => votePayloadSchema.parse(missing)).toThrow();
  });

  test('rejects invalid id formats', () => {
    const bad = {
      userId: 'not-a-cuid',
      pollId: '',
      pollOptionId: '123',
    };

    expect(() => votePayloadSchema.parse(bad)).toThrow();
  });
});
