import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from '../../src/infrastructure/repositories/prisma-user-repository';
import { PrismaPollRepository } from '../../src/infrastructure/repositories/prisma-poll-repository';
import { PrismaVoteRepository } from '../../src/infrastructure/repositories/prisma-vote-repository';

const prisma = new PrismaClient();
const userRepo = new PrismaUserRepository(prisma);
const pollRepo = new PrismaPollRepository(prisma);
const voteRepo = new PrismaVoteRepository(prisma);

beforeAll(async () => {
  await prisma.vote.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

test('Prisma repos create and retrieve poll with options', async () => {
  const user = await userRepo.create({
    name: 'Repo Test User',
    email: 'repo@example.com',
    passwordHash: 'hash',
  });

  const poll = await pollRepo.create({
    question: 'Best language?',
    creatorId: user.id,
    options: ['JS', 'TS'],
  });

  const fetched = await pollRepo.findById(poll.id);
  expect(fetched?.options).toHaveLength(2);
});

test('Vote repo enforces one vote per user per poll', async () => {
  const user = await userRepo.findByEmail('repo@example.com');
  const poll = await prisma.poll.findFirst({
    where: { question: 'Best language?' },
  });
  const option = await prisma.pollOption.findFirst({
    where: { pollId: poll!.id },
  });

  await voteRepo.createUnique({
    userId: user!.id,
    pollId: poll!.id,
    pollOptionId: option!.id,
  });

  await expect(
    voteRepo.createUnique({
      userId: user!.id,
      pollId: poll!.id,
      pollOptionId: option!.id,
    }),
  ).rejects.toThrow();
});
