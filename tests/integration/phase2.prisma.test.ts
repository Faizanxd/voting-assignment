import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Reset DB before tests
  await prisma.vote.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Phase 2 — Prisma schema & constraints', () => {
  let userId: string;
  let pollId: string;
  let optionId: string;

  test('should create a user, poll, and options (one-to-many)', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hash',
        polls: {
          create: {
            question: 'Favorite fruit?',
            isPublished: true,
            options: {
              create: [{ text: 'Apple' }, { text: 'Banana' }],
            },
          },
        },
      },
      include: { polls: { include: { options: true } } },
    });

    expect(user.polls).toHaveLength(1);
    expect(user.polls[0].options).toHaveLength(2);

    userId = user.id;
    pollId = user.polls[0].id;
    optionId = user.polls[0].options[0].id;
  });

  test('should allow many-to-many via Vote', async () => {
    const vote = await prisma.vote.create({
      data: {
        userId,
        pollId,
        pollOptionId: optionId,
      },
    });

    expect(vote.userId).toBe(userId);
    expect(vote.pollOptionId).toBe(optionId);
  });

  test('should enforce one vote per user per poll', async () => {
    await expect(
      prisma.vote.create({
        data: {
          userId,
          pollId,
          pollOptionId: optionId,
        },
      }),
    ).rejects.toThrow(/Unique constraint failed/);
  });

  test('should enforce unique option text per poll', async () => {
    await expect(
      prisma.pollOption.create({
        data: {
          text: 'Apple', // duplicate text in same poll
          pollId,
        },
      }),
    ).rejects.toThrow(/Unique constraint failed/);
  });

  test('should allow same option text in different polls', async () => {
    const otherPoll = await prisma.poll.create({
      data: {
        question: 'Favorite color?',
        creatorId: userId,
        isPublished: true,
        options: {
          create: [{ text: 'Apple' }], // allowed here
        },
      },
      include: { options: true },
    });

    expect(otherPoll.options[0].text).toBe('Apple');
  });
});
