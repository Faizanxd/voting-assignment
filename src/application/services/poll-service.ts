import { PollRepository } from '../../domain/repositories/poll-repository';
import { createPollSchema, CreatePollDTO } from '../dto/poll-dto';

export class PollService {
  constructor(private readonly polls: PollRepository) {}

  async createPoll(dto: CreatePollDTO) {
    const data = createPollSchema.parse(dto);
    return this.polls.create({
      question: data.question,
      creatorId: data.creatorId,
      options: data.options,
    });
  }

  async getPoll(id: string) {
    return this.polls.findById(id);
  }

  async listByCreator(creatorId: string) {
    return this.polls.listByCreator(creatorId);
  }

  async publishPoll(id: string) {
    return this.polls.publish(id);
  }
  async listPublished() {
    return this.polls.listPublished();
  }
  async listAll() {
    return this.polls.listAll();
  }
  async deletePoll(id: string) {
    return this.polls.deletePoll(id);
  }
}
