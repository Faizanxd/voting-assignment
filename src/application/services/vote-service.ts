import { VoteRepository } from '../../domain/repositories/vote-repository';
import { PollRepository } from '../../domain/repositories/poll-repository';
import { castVoteSchema, CastVoteDTO } from '../dto/vote-dto';
import { VoteCastEvent } from '../events/vote-cast-event';

export class VoteService {
  constructor(
    private readonly votes: VoteRepository,
    private readonly polls: PollRepository,
    private readonly eventBus: { publish: (event: VoteCastEvent) => void },
  ) {}

  async castVote(dto: CastVoteDTO) {
    const data = castVoteSchema.parse(dto);

    const poll = await this.polls.findById(data.pollId);
    if (!poll) throw new Error('Poll not found');
    if (!poll.isPublished) throw new Error('Poll not published');

    const option = poll.options.find((o) => o.id === data.pollOptionId);
    if (!option) throw new Error('Option not in poll');

    const existing = await this.votes.findByUserAndPoll(
      data.userId,
      data.pollId,
    );
    if (existing) throw new Error('User already voted');

    await this.votes.createUnique({
      userId: data.userId,
      pollId: data.pollId,
      pollOptionId: data.pollOptionId,
    });

    const results = await this.votes.countByPoll(data.pollId);
    this.eventBus.publish(new VoteCastEvent(data.pollId, results));
  }
}
