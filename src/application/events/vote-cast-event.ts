export class VoteCastEvent {
  constructor(
    public readonly pollId: string,
    public readonly results: Array<{ optionId: string; count: number }>,
  ) {}
}
