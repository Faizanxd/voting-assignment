export interface Vote {
  id: string;
  userId: string;
  pollId: string;
  pollOptionId: string;
  createdAt: Date;
}
