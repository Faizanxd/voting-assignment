import { z } from 'zod';

export const castVoteSchema = z.object({
  userId: z.string().cuid(),
  pollId: z.string().cuid(),
  pollOptionId: z.string().cuid(),
});
export type CastVoteDTO = z.infer<typeof castVoteSchema>;
