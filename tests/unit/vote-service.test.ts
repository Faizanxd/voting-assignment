import { VoteService } from '../../src/application/services/vote-service';
import { VoteRepository } from '../../src/domain/repositories/vote-repository';
import { PollRepository } from '../../src/domain/repositories/poll-repository';
import { VoteCastEvent } from '../../src/application/events/vote-cast-event';

test('castVote publishes event when successful', async () => {
  // Use the same CUIDs in both the mock and the test call
  const userId = 'cmfjhkzld0000v2zwcror6gn0';
  const pollId = 'cmfjhkzld0001v2zwqteg372x';
  const pollOptionId = 'cmfjhkzld0002v2zwgsdci2vv';

  const mockVotes: jest.Mocked<VoteRepository> = {
    createUnique: jest.fn().mockResolvedValue({} as any),
    countByPoll: jest
      .fn()
      .mockResolvedValue([{ optionId: pollOptionId, count: 1 }]),
    findByUserAndPoll: jest.fn().mockResolvedValue(null),
  };

  const mockPolls: jest.Mocked<PollRepository> = {
    create: jest.fn(),
    findById: jest.fn().mockResolvedValue({
      id: pollId,
      question: 'Q?',
      isPublished: true,
      creatorId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      options: [{ id: pollOptionId, text: 'A', pollId }],
    }),
    listByCreator: jest.fn(),
    publish: jest.fn(),
  };

  const events: VoteCastEvent[] = [];
  const eventBus = { publish: (e: VoteCastEvent) => events.push(e) };

  const service = new VoteService(mockVotes, mockPolls, eventBus);

  await service.castVote({
    userId,
    pollId,
    pollOptionId,
  });

  expect(events).toHaveLength(1);
  expect(events[0].pollId).toBe(pollId);
});
