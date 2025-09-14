export interface Poll {
  id: string;
  question: string;
  isPublished: boolean;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PollOption {
  id: string;
  text: string;
  pollId: string;
}

export interface PollWithOptions extends Poll {
  options: PollOption[];
}

export interface PollSummary {
  id: string;
  question: string;
  isPublished: boolean;
}
