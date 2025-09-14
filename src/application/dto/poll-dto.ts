import { z } from 'zod';

export const createPollSchema = z.object({
  question: z.string().min(1),
  creatorId: z.string().cuid(),
  options: z.array(z.string().min(1)).min(2),
});
export type CreatePollDTO = z.infer<typeof createPollSchema>;
