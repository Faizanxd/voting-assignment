// tests/unit/vote-service.unit.test.ts
import { jest } from '@jest/globals';
import { VoteService } from '../../src/application/services/vote-service'; // adjust path if needed

describe('VoteService (unit)', () => {
  let prismaMock: any;
  let voteRepo: any;
  let pollRepo: any;
  let userRepo: any;
  let eventBus: any;
  let svc: VoteService;

  const TEST_POLL = {
    id: 'poll-1',
    isPublished: true,
    creatorId: 'creator-1',
    options: [{ id: 'option-1' }],
  };
  const TEST_OPTION = { id: 'option-1', pollId: 'poll-1', text: 'Option A' };
  const TEST_USER = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
  };
  const createdVote = {
    id: 'vote-1',
    userId: TEST_USER.id,
    pollId: TEST_POLL.id,
    pollOptionId: TEST_OPTION.id,
    createdAt: new Date(),
  };

  beforeEach(() => {
    // helper returning a loosely-typed jest.fn so TypeScript won't infer narrow types
    const m = () => jest.fn() as any;

    prismaMock = {
      $transaction: m().mockImplementation(async (fn: any) => {
        const tx: any = {
          poll: {
            findUnique: m().mockResolvedValue(TEST_POLL),
          },
          vote: {
            create: m().mockResolvedValue(createdVote),
            groupBy: m().mockResolvedValue([
              { pollOptionId: TEST_OPTION.id, _count: { pollOptionId: 1 } },
            ]),
          },
        };
        return fn(tx);
      }),
    };

    voteRepo = {};
    pollRepo = {};
    userRepo = {};
    eventBus = { publish: m() };

    svc = new VoteService(prismaMock, voteRepo, pollRepo, eventBus);
  });

  test('casts vote successfully and publishes event', async () => {
    const res = await svc.castVote({
      userId: TEST_USER.id,
      pollId: TEST_POLL.id,
      pollOptionId: TEST_OPTION.id,
    });

    expect(res).toEqual(createdVote);
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const publishedArg = eventBus.publish.mock.calls[0][0];
    expect(publishedArg).toBeDefined();
    expect(publishedArg.pollId).toBe(TEST_POLL.id);
  });

  test('maps duplicate vote (unique constraint) to 409', async () => {
    const p2002 = new Error('Unique constraint failed') as any;
    p2002.code = 'P2002';

    // override prismaMock to simulate tx.vote.create throwing P2002
    const m = () => jest.fn() as any;
    prismaMock.$transaction = m().mockImplementation(async (fn: any) => {
      const tx: any = {
        poll: { findUnique: m().mockResolvedValue(TEST_POLL) },
        vote: { create: m().mockRejectedValue(p2002) },
      };
      return fn(tx);
    });

    svc = new VoteService(prismaMock, voteRepo, pollRepo, eventBus);

    await expect(
      svc.castVote({
        userId: TEST_USER.id,
        pollId: TEST_POLL.id,
        pollOptionId: TEST_OPTION.id,
      }),
    ).rejects.toMatchObject({ status: 409, message: expect.any(String) });

    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  test('rejects when poll is not published', async () => {
    const m = () => jest.fn() as any;
    prismaMock.$transaction = m().mockImplementation(async (fn: any) => {
      const tx: any = {
        poll: {
          findUnique: m().mockResolvedValue({
            ...TEST_POLL,
            isPublished: false,
          }),
        },
        vote: { create: m().mockResolvedValue(undefined) },
      };
      return fn(tx);
    });

    svc = new VoteService(prismaMock, voteRepo, pollRepo, eventBus);

    await expect(
      svc.castVote({
        userId: TEST_USER.id,
        pollId: TEST_POLL.id,
        pollOptionId: TEST_OPTION.id,
      }),
    ).rejects.toMatchObject({ status: 404, message: expect.any(String) });

    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  test('validates missing poll option', async () => {
    const m = () => jest.fn() as any;
    prismaMock.$transaction = m().mockImplementation(async (fn: any) => {
      const tx: any = {
        poll: {
          findUnique: m().mockResolvedValue({ ...TEST_POLL, options: [] }),
        },
        vote: { create: m().mockResolvedValue(undefined) },
      };
      return fn(tx);
    });

    svc = new VoteService(prismaMock, voteRepo, pollRepo, eventBus);

    await expect(
      svc.castVote({
        userId: TEST_USER.id,
        pollId: TEST_POLL.id,
        pollOptionId: 'nonexistent',
      }),
    ).rejects.toMatchObject({ status: 400 });

    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
